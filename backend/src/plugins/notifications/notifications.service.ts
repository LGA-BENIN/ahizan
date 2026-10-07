import { Injectable, Logger } from '@nestjs/common';
import { TransactionalConnection, RequestContext, User } from '@vendure/core';
import { Subject, Observable } from 'rxjs';
import { finalize } from 'rxjs/operators';
import { Like, In } from 'typeorm';
import { NotificationLog } from './entities/notification-log.entity';
import { PushSubscription } from './entities/push-subscription.entity';

export interface NotificationPayload {
    userId: string;
    eventType: string;
    title: string;
    body: string;
    actionUrl?: string;
    iconUrl?: string;
    data?: any;
    channels?: ('IN_APP' | 'PUSH' | 'EMAIL' | 'SMS')[];
    targetRole?: 'CUSTOMER' | 'VENDOR' | 'ADMIN';
    channelId?: number;
}

/**
 * Central notification service — all notification dispatch goes through here.
 * Handles: in-app SSE, Web Push, and logs all notifications to DB.
 */
@Injectable()
export class NotificationsService {
    private readonly logger = new Logger('NotificationsService');

    /**
     * SSE subjects keyed by userId.
     * Supports multiple open tabs per user by mapping to a Set of Subjects.
     */
    private sseSubjects = new Map<string, Set<Subject<any>>>();

    constructor(
        private readonly connection: TransactionalConnection,
    ) { }

    // ─────────────────────────────────────────────
    // SSE (Server-Sent Events) Real-time System
    // ─────────────────────────────────────────────

    /**
     * Register an SSE stream for a user. Supports multi-tab subscriptions.
     */
    registerSseClient(userId: string): Observable<any> {
        if (!this.sseSubjects.has(userId)) {
            this.sseSubjects.set(userId, new Set());
        }
        const subjects = this.sseSubjects.get(userId)!;
        const subject = new Subject<any>();
        subjects.add(subject);

        return subject.asObservable().pipe(
            finalize(() => {
                subjects.delete(subject);
                if (subjects.size === 0) {
                    this.sseSubjects.delete(userId);
                }
            })
        );
    }

    /**
     * Push a real-time SSE event to all connected tabs of a specific user.
     */
    sendSseToUser(userId: string, event: any) {
        const subjects = this.sseSubjects.get(userId);
        if (subjects) {
            for (const subject of subjects) {
                subject.next({ data: event });
            }
        }
    }

    // ─────────────────────────────────────────────
    // Core Notification Dispatch
    // ─────────────────────────────────────────────

    /**
     * Send a notification through all enabled channels.
     * This is the SINGLE entry point for all notifications.
     */
    async notify(ctx: RequestContext, payload: NotificationPayload): Promise<void> {
        const channels = payload.channels || ['IN_APP'];

        // 1. Always log to DB for history
        try {
            await this.logNotification(ctx, payload, channels.join(','));
        } catch (e: any) {
            this.logger.error(`Failed to log notification: ${e?.message || e}`);
        }

        // 2. Send real-time via SSE
        if (channels.includes('IN_APP')) {
            this.sendSseToUser(payload.userId, {
                type: payload.eventType,
                title: payload.title,
                body: payload.body,
                actionUrl: payload.actionUrl,
                iconUrl: payload.iconUrl,
                targetRole: payload.targetRole,
                data: payload.data,
                channels: channels,
                timestamp: new Date().toISOString(),
            });
        }

        // 3. Send Web Push asynchronously without blocking
        if (channels.includes('PUSH')) {
            this.sendWebPush(ctx, payload).catch(e =>
                this.logger.error(`Web push failed for user ${payload.userId}: ${e.message}`)
            );
        }
    }

    /**
     * Notify SuperAdmin administrators (In-App & Push).
     * Rule: In-app SSE is sent live to connected tabs, DB log is always written for history,
     * and Web Push is dispatched to all registered superadmin devices.
     */
    async notifySuperAdmins(
        ctx: RequestContext,
        payload: Omit<NotificationPayload, 'userId' | 'targetRole'>
    ): Promise<void> {
        try {
            const adminUserIds = new Set<string>();

            // 1. Query users with superadmin/admin roles
            try {
                const superAdminUsers: { id: string }[] = await this.connection.rawConnection.query(`
                    SELECT DISTINCT u.id 
                    FROM "user" u
                    LEFT JOIN user_roles_role urr ON urr."userId" = u.id
                    LEFT JOIN role r ON r.id = urr."roleId"
                    WHERE r.code = '__super_admin_role__' 
                       OR r.code = 'superadmin' 
                       OR r.code = '__administrator_role__'
                       OR r.code = 'administrator'
                       OR u.identifier = 'superadmin'
                `);
                for (const u of superAdminUsers) {
                    if (u?.id) adminUserIds.add(u.id.toString());
                }
            } catch (err: any) {
                this.logger.warn(`Could not query admin roles: ${err?.message || err}`);
            }

            // 2. Query all active push subscriptions for the admin portal
            try {
                const adminPushSubs: { userId: string }[] = await this.connection.rawConnection.query(`
                    SELECT DISTINCT "userId" 
                    FROM push_subscription 
                    WHERE LOWER(portal) IN ('admin', 'dashboard') AND "isActive" = true AND "userId" IS NOT NULL
                `);
                for (const s of adminPushSubs) {
                    if (s?.userId) adminUserIds.add(s.userId.toString());
                }
            } catch (_) {}

            // Fallback: if no admin IDs found, at least notify active user if in admin context
            if (adminUserIds.size === 0 && ctx.activeUserId) {
                adminUserIds.add(ctx.activeUserId.toString());
            }

            for (const userId of adminUserIds) {
                await this.notify(ctx, {
                    ...payload,
                    userId,
                    targetRole: 'ADMIN',
                    channels: payload.channels || ['IN_APP', 'PUSH'],
                });
            }
        } catch (err: any) {
            this.logger.error(`Failed to notify superadmins: ${err?.message || err}`);
        }
    }

    // ─────────────────────────────────────────────
    // DB Operations
    // ─────────────────────────────────────────────

    private async logNotification(
        ctx: RequestContext,
        payload: NotificationPayload,
        channel: string,
    ): Promise<NotificationLog> {
        const log = new NotificationLog();
        log.userId = payload.userId;
        log.eventType = payload.eventType;
        log.title = payload.title;
        log.body = payload.body;
        log.actionUrl = payload.actionUrl ?? null as any;
        log.iconUrl = payload.iconUrl ?? null as any;
        log.channel = channel;
        log.targetRole = payload.targetRole ?? null as any;
        log.channelId = payload.channelId ?? null as any;
        log.data = payload.data;
        log.isRead = false;
        log.sendSuccess = true;

        return this.connection.getRepository(ctx, NotificationLog).save(log);
    }

    async getNotificationsForUser(
        ctx: RequestContext,
        userId: string,
        take = 20,
        skip = 0,
        portal?: string,
    ): Promise<{ items: NotificationLog[]; unreadCount: number }> {
        const qb = this.connection.getRepository(ctx, NotificationLog)
            .createQueryBuilder('log')
            .where('log.userId = :userId', { userId })
            .andWhere('log.channel LIKE :channel', { channel: '%IN_APP%' });

        if (portal === 'seller') {
            qb.andWhere('(log.targetRole = :vRole OR (log.targetRole IS NULL AND log.actionUrl LIKE :dashboardPattern))', {
                vRole: 'VENDOR',
                dashboardPattern: '/dashboard%',
            });
        } else if (portal === 'shop' || portal === 'storefront') {
            qb.andWhere('(log.targetRole = :cRole OR (log.targetRole IS NULL AND (log.actionUrl IS NULL OR log.actionUrl NOT LIKE :dashboardPattern)))', {
                cRole: 'CUSTOMER',
                dashboardPattern: '/dashboard%',
            });
        }

        const countQb = qb.clone().andWhere('log.isRead = :isRead', { isRead: false });

        const items = await qb
            .orderBy('log.createdAt', 'DESC')
            .take(take)
            .skip(skip)
            .getMany();

        const unreadCount = await countQb.getCount();

        return { items, unreadCount };
    }

    async markAllAsRead(ctx: RequestContext, userId: string): Promise<void> {
        await this.connection.getRepository(ctx, NotificationLog).update(
            { userId, isRead: false },
            { isRead: true },
        );
    }

    async markAsRead(ctx: RequestContext, notificationId: string): Promise<void> {
        await this.connection.getRepository(ctx, NotificationLog).update(
            { id: notificationId },
            { isRead: true },
        );
    }

    async deleteNotification(ctx: RequestContext, notificationId: string): Promise<void> {
        await this.connection.getRepository(ctx, NotificationLog).delete({ id: notificationId });
    }

    // ─────────────────────────────────────────────
    // Web Push
    // ─────────────────────────────────────────────

    async savePushSubscription(
        ctx: RequestContext,
        userId: string,
        subscription: { endpoint: string; p256dh: string; auth: string; userAgent?: string; portal?: string },
    ): Promise<PushSubscription> {
        const repo = this.connection.getRepository(ctx, PushSubscription);

        let portal = (subscription.portal || '').toLowerCase().trim();
        if (!portal) {
            const origin = ((ctx.req?.headers?.origin as string) || '').toLowerCase();
            const referer = ((ctx.req?.headers?.referer as string) || '').toLowerCase();
            if (
                origin.includes('seller') || 
                origin.includes(':3002') || 
                referer.includes('seller') || 
                referer.includes(':3002')
            ) {
                portal = 'seller';
            } else if (
                origin.includes('administrator') || 
                origin.includes('admin') || 
                referer.includes('administrator') ||
                referer.includes('admin')
            ) {
                portal = 'admin';
            } else {
                portal = 'storefront';
            }
        }

        // Check if already exists (update endpoint registration)
        let existing = await repo.findOne({ where: { endpoint: subscription.endpoint } });
        if (existing) {
            existing.userId = userId;
            existing.p256dh = subscription.p256dh;
            existing.auth = subscription.auth;
            existing.portal = portal;
            if (subscription.userAgent) existing.userAgent = subscription.userAgent;
            existing.isActive = true;
            return repo.save(existing);
        }

        const entity = new PushSubscription();
        entity.userId = userId;
        entity.portal = portal;
        entity.endpoint = subscription.endpoint;
        entity.p256dh = subscription.p256dh;
        entity.auth = subscription.auth;
        entity.userAgent = subscription.userAgent ?? null as any;
        entity.isActive = true;
        return repo.save(entity);
    }

    async removePushSubscription(ctx: RequestContext, endpoint: string): Promise<void> {
        await this.connection.getRepository(ctx, PushSubscription).update(
            { endpoint },
            { isActive: false },
        );
    }

    private async sendWebPush(ctx: RequestContext, payload: NotificationPayload): Promise<void> {
        let webpush: any;
        try {
            webpush = require('web-push');
        } catch {
            this.logger.warn('web-push module not installed — skipping push notifications');
            return;
        }

        const vapidPublicKey = process.env.VAPID_PUBLIC_KEY;
        const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
        const vapidEmail = process.env.VAPID_EMAIL || 'mailto:admin@ahizan.com';

        if (!vapidPublicKey || !vapidPrivateKey) {
            this.logger.warn('VAPID keys not configured — skipping push notifications');
            return;
        }

        webpush.setVapidDetails(vapidEmail, vapidPublicKey, vapidPrivateKey);

        // Find active subscriptions for this user
        let subscriptions = await this.connection.getRepository(ctx, PushSubscription).find({
            where: { userId: payload.userId, isActive: true },
        });

        // Target the appropriate subscriptions based on role/portal
        if (payload.targetRole === 'VENDOR') {
            subscriptions = subscriptions.filter((s: any) => {
                const p = (s.portal || '').toLowerCase();
                return p === 'seller' || p === 'vendor' || !p;
            });
        } else if (payload.targetRole === 'CUSTOMER') {
            subscriptions = subscriptions.filter((s: any) => {
                const p = (s.portal || '').toLowerCase();
                return p === 'storefront' || p === 'shop' || p === 'customer' || !p;
            });
        } else if (payload.targetRole === 'ADMIN') {
            subscriptions = subscriptions.filter((s: any) => {
                const p = (s.portal || '').toLowerCase();
                return p === 'admin' || p === 'dashboard' || p === 'superadmin' || !p;
            });
        }

        // Deduplicate subscriptions by endpoint
        const uniqueSubsMap = new Map<string, any>();
        for (const sub of subscriptions) {
            if (sub.endpoint && !uniqueSubsMap.has(sub.endpoint)) {
                uniqueSubsMap.set(sub.endpoint, sub);
            }
        }
        subscriptions = Array.from(uniqueSubsMap.values());

        if (!subscriptions || subscriptions.length === 0) {
            return;
        }

        // Resolve absolute URL for the destination portal
        const sellerBase = process.env.SELLER_URL || (process.env.CORS_ORIGINS?.includes('seller.ahizan.com') ? 'https://seller.ahizan.com' : 'http://localhost:3002');
        const adminBase = process.env.ADMIN_URL || (process.env.CORS_ORIGINS?.includes('administrator.ahizan.com') ? 'https://administrator.ahizan.com' : 'http://localhost:3000');
        const storefrontBase = process.env.STOREFRONT_URL || (process.env.CORS_ORIGINS?.includes('https://ahizan.com') ? 'https://ahizan.com' : 'http://localhost:3001');

        let targetUrl = payload.actionUrl || '/';
        if (targetUrl.startsWith('/')) {
            if (payload.targetRole === 'VENDOR') {
                targetUrl = `${sellerBase}${targetUrl}`;
            } else if (payload.targetRole === 'ADMIN') {
                const adminPath = targetUrl.startsWith('/admin') ? targetUrl : `/admin${targetUrl}`;
                targetUrl = `${adminBase}${adminPath}`;
            } else if (payload.targetRole === 'CUSTOMER') {
                targetUrl = `${storefrontBase}${targetUrl}`;
            }
        }

        const pushPayload = JSON.stringify({
            title: payload.title,
            body: payload.body,
            icon: payload.iconUrl || (payload.targetRole === 'VENDOR' ? '/icons/seller-icon-192x192-white.png' : '/icons/icon-192x192-white.png'),
            url: targetUrl,
            data: payload.data,
        });

        const results = await Promise.allSettled(
            subscriptions.map(async (sub: any) => {
                try {
                    await webpush.sendNotification(
                        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
                        pushPayload,
                    );
                    await this.connection.getRepository(ctx, PushSubscription).update(
                        { id: sub.id },
                        { lastUsedAt: new Date() },
                    );
                } catch (e: unknown) {
                    const status = (e as any)?.statusCode;
                    this.logger.error(`Web push to endpoint failed (status: ${status}): ${(e as any)?.message}`);
                    // Mark as inactive ONLY if subscription was expired or unsubscribed by push service (404/410)
                    if (status === 410 || status === 404) {
                        await this.connection.getRepository(ctx, PushSubscription).update(
                            { id: sub.id },
                            { isActive: false },
                        );
                    }
                }
            })
        );

        const succeeded = results.filter((r: any) => r.status === 'fulfilled').length;
        this.logger.log(`Web push dispatched for ${payload.targetRole || 'USER'} ${payload.userId}: ${succeeded}/${subscriptions.length} devices reached`);
    }

    // ─────────────────────────────────────────────
    // Statistics (for admin dashboard)
    // ─────────────────────────────────────────────

    async markNotificationsAsRead(ctx: RequestContext, ids?: string[]): Promise<boolean> {
        const repo = this.connection.getRepository(ctx, NotificationLog);
        if (ids && ids.length > 0) {
            await repo.update(ids, { isRead: true });
        } else if (ctx.activeUserId) {
            await repo.update({ userId: ctx.activeUserId.toString(), isRead: false }, { isRead: true });
        } else {
            await repo.update({ isRead: false }, { isRead: true });
        }
        return true;
    }

    async getStats(ctx: RequestContext): Promise<{
        total: number;
        unread: number;
        sent24h: number;
        failed: number;
    }> {
        const repo = this.connection.getRepository(ctx, NotificationLog);
        const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const { Not } = require('typeorm');

        const baseWhere: any = { eventType: Not('BUYER_EVENT') };
        if (ctx.activeUserId) {
            baseWhere.userId = ctx.activeUserId.toString();
        }

        const [total, unread] = await Promise.all([
            repo.count({ where: baseWhere }),
            repo.count({ where: { ...baseWhere, isRead: false } }),
        ]);

        return { total, unread, sent24h: total, failed: 0 };
    }

    // ─────────────────────────────────────────────
    // User Search (for admin manual notification)
    // ─────────────────────────────────────────────

    /**
     * Search users by email (identifier) for the admin notification composer.
     */
    async searchUsers(
        ctx: RequestContext,
        emailQuery?: string,
        take = 20,
        skip = 0,
    ): Promise<{ items: { id: string; identifier: string }[]; totalItems: number }> {
        const repo = this.connection.getRepository(ctx, User);
        const where = emailQuery
            ? { identifier: Like(`%${emailQuery}%`) }
            : {};

        const [users, totalItems] = await repo.findAndCount({
            where,
            select: ['id', 'identifier'],
            order: { identifier: 'ASC' },
            take,
            skip,
        });

        return {
            items: users.map(u => ({ id: String(u.id), identifier: u.identifier })),
            totalItems,
        };
    }
}
