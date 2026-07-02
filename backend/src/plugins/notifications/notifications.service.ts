import { Injectable, Logger } from '@nestjs/common';
import { TransactionalConnection, RequestContext, User } from '@vendure/core';
import { Subject, Observable } from 'rxjs';
import { finalize } from 'rxjs/operators';
import { Like } from 'typeorm';
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
    ): Promise<{ items: NotificationLog[]; unreadCount: number }> {
        const repo = this.connection.getRepository(ctx, NotificationLog);

        const [items] = await repo.findAndCount({
            where: { userId, channel: Like('%IN_APP%') },
            order: { createdAt: 'DESC' },
            take,
            skip,
        });

        const unreadCount = await repo.count({
            where: { userId, isRead: false, channel: Like('%IN_APP%') },
        });

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

    // ─────────────────────────────────────────────
    // Web Push
    // ─────────────────────────────────────────────

    async savePushSubscription(
        ctx: RequestContext,
        userId: string,
        subscription: { endpoint: string; p256dh: string; auth: string; userAgent?: string },
    ): Promise<PushSubscription> {
        const repo = this.connection.getRepository(ctx, PushSubscription);

        // Check if already exists (update) 
        let existing = await repo.findOne({ where: { endpoint: subscription.endpoint } });
        if (existing) {
            existing.userId = userId;
            existing.p256dh = subscription.p256dh;
            existing.auth = subscription.auth;
            existing.isActive = true;
            return repo.save(existing);
        }

        const entity = new PushSubscription();
        entity.userId = userId;
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

        const subscriptions = await this.connection.getRepository(ctx, PushSubscription).find({
            where: { userId: payload.userId, isActive: true },
        });

        const pushPayload = JSON.stringify({
            title: payload.title,
            body: payload.body,
            icon: payload.iconUrl || '/icon.png',
            url: payload.actionUrl || '/',
            data: payload.data,
        });

        await Promise.allSettled(
            subscriptions.map(async (sub) => {
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
                    this.logger.error(`Web push to endpoint failed: ${(e as any)?.message}`);
                    // Mark as inactive if subscription is gone (410 status)
                    if ((e as any).statusCode === 410) {
                        await this.connection.getRepository(ctx, PushSubscription).update(
                            { id: sub.id },
                            { isActive: false },
                        );
                    }
                }
            })
        );
    }

    // ─────────────────────────────────────────────
    // Statistics (for admin dashboard)
    // ─────────────────────────────────────────────

    async getStats(ctx: RequestContext): Promise<{
        total: number;
        unread: number;
        sent24h: number;
        failed: number;
    }> {
        const repo = this.connection.getRepository(ctx, NotificationLog);
        const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);

        const [total, unread, sent24h, failed] = await Promise.all([
            repo.count(),
            repo.count({ where: { isRead: false } }),
            repo.createQueryBuilder('n')
                .where('n.createdAt > :yesterday', { yesterday })
                .getCount(),
            repo.count({ where: { sendSuccess: false } }),
        ]);

        return { total, unread, sent24h, failed };
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
