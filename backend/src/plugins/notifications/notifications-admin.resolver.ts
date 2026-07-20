import gql from 'graphql-tag';
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { Allow, Permission, Ctx, RequestContext, TransactionalConnection, User } from '@vendure/core';
import { BrevoSmsService } from './brevo-sms.service';
import { BrevoSettings } from './entities/brevo-settings.entity';

// ─── GraphQL Schema Extension ────────────────────────────────────────────────

export const notificationsAdminApiExtensions = gql`
    type BrevoSettings {
        id: ID!
        brevoApiKey: String
        defaultPhonePrefix: String!
        emailMethod: String
        smtpHost: String
        smtpPort: Int
        smtpUser: String
        smtpPassword: String
        fromEmail: String
        fromName: String
        channelsConfig: JSON
    }

    input UpdateBrevoSettingsInput {
        brevoApiKey: String
        defaultPhonePrefix: String
        emailMethod: String
        smtpHost: String
        smtpPort: Int
        smtpUser: String
        smtpPassword: String
        fromEmail: String
        fromName: String
        channelsConfig: JSON
    }

    type NotificationStats {
        total: Int!
        unread: Int!
        sent24h: Int!
        failed: Int!
    }

    type AdminNotificationLog {
        id: ID!
        createdAt: DateTime!
        userId: String
        eventType: String!
        title: String
        body: String
        channel: String
        isRead: Boolean!
        sendSuccess: Boolean!
        sendError: String
    }

    type AdminNotificationLogList {
        items: [AdminNotificationLog!]!
        totalItems: Int!
    }

    input NotificationLogListOptions {
        skip: Int
        take: Int
    }

    type AdminUserItem {
        id: ID!
        identifier: String!
    }

    type AdminUserList {
        items: [AdminUserItem!]!
        totalItems: Int!
    }

    type BroadcastResult {
        sent: Int!
        failed: Int!
    }

    extend type Query {
        brevoSettings: BrevoSettings
        notificationStats: NotificationStats!
        notificationLogs(options: NotificationLogListOptions): AdminNotificationLogList!
        searchUsers(emailQuery: String, take: Int, skip: Int): AdminUserList!
        vapidPublicKey: String!
    }

    type PushSubscriptionResult {
        success: Boolean!
    }

    extend type Mutation {
        updateBrevoSettings(input: UpdateBrevoSettingsInput!): BrevoSettings!
        sendNotificationToUser(
            userId: ID!
            title: String!
            body: String!
            channel: String!
            actionUrl: String
        ): Boolean!
        sendBroadcastNotification(
            userIds: [ID!]!
            title: String!
            body: String!
            channel: String!
            actionUrl: String
        ): BroadcastResult!
        subscribeToPush(endpoint: String!, p256dh: String!, auth: String!, userAgent: String): PushSubscriptionResult!
        unsubscribeFromPush(endpoint: String!): PushSubscriptionResult!
        testSmtpConnection(email: String!): Boolean!
        testSmtpConnectionDirect(
            email: String!
            emailMethod: String!
            smtpHost: String
            smtpPort: Int
            smtpUser: String
            smtpPassword: String
            brevoApiKey: String
            fromEmail: String
            fromName: String
        ): Boolean!
    }
`;

// ─── Admin API Resolver ───────────────────────────────────────────────────────

import { NotificationsService, NotificationPayload } from './notifications.service';
import { NotificationLog } from './entities/notification-log.entity';

@Resolver()
export class NotificationsAdminResolver {
    constructor(
        private readonly smsService: BrevoSmsService,
        private readonly notificationsService: NotificationsService,
        private readonly connection: TransactionalConnection,
    ) { }

    @Query()
    @Allow(Permission.Public)
    async brevoSettings(@Ctx() ctx: RequestContext): Promise<BrevoSettings | null> {
        return this.smsService.getSettings();
    }

    @Query()
    @Allow(Permission.Authenticated)
    async notificationStats(@Ctx() ctx: RequestContext) {
        return this.notificationsService.getStats(ctx);
    }

    @Query()
    @Allow(Permission.Authenticated)
    async notificationLogs(
        @Ctx() ctx: RequestContext,
        @Args('options') options?: { skip?: number; take?: number },
    ): Promise<{ items: NotificationLog[]; totalItems: number }> {
        const repo = this.connection.getRepository(ctx, NotificationLog);
        const skip = options?.skip ?? 0;
        const take = options?.take ?? 25;
        const [items, totalItems] = await repo.findAndCount({
            order: { createdAt: 'DESC' },
            skip,
            take,
        });
        return { items, totalItems };
    }

    @Query()
    @Allow(Permission.Authenticated)
    async searchUsers(
        @Ctx() ctx: RequestContext,
        @Args('emailQuery') emailQuery?: string,
        @Args('take') take?: number,
        @Args('skip') skip?: number,
    ): Promise<{ items: { id: string; identifier: string }[]; totalItems: number }> {
        return this.notificationsService.searchUsers(ctx, emailQuery, take ?? 20, skip ?? 0);
    }

    @Mutation()
    @Allow(Permission.Public)
    async updateBrevoSettings(
        @Ctx() ctx: RequestContext,
        @Args('input') input: Partial<BrevoSettings>,
    ): Promise<BrevoSettings> {
        return this.smsService.saveSettings(input);
    }

    @Mutation()
    @Allow(Permission.Authenticated)
    async sendNotificationToUser(
        @Ctx() ctx: RequestContext,
        @Args('userId') userId: string,
        @Args('title') title: string,
        @Args('body') body: string,
        @Args('channel') channel: string,
        @Args('actionUrl') actionUrl?: string,
    ): Promise<boolean> {
        const channels = this.parseChannels(channel);
        const payload: NotificationPayload = {
            userId,
            eventType: 'ADMIN_MANUAL',
            title,
            body,
            channels,
            actionUrl,
        };
        await this.notificationsService.notify(ctx, payload);
        return true;
    }

    @Mutation()
    @Allow(Permission.Authenticated)
    async sendBroadcastNotification(
        @Ctx() ctx: RequestContext,
        @Args('userIds') userIds: string[],
        @Args('title') title: string,
        @Args('body') body: string,
        @Args('channel') channel: string,
        @Args('actionUrl') actionUrl?: string,
    ): Promise<{ sent: number; failed: number }> {
        const channels = this.parseChannels(channel);
        let sent = 0;
        let failed = 0;

        const batchSize = 50;
        for (let i = 0; i < userIds.length; i += batchSize) {
            const batch = userIds.slice(i, i + batchSize);
            await Promise.all(
                batch.map(async (userId) => {
                    try {
                        await this.notificationsService.notify(ctx, {
                            userId,
                            eventType: 'ADMIN_BROADCAST',
                            title,
                            body,
                            channels,
                            actionUrl,
                        });
                        sent++;
                    } catch {
                        failed++;
                    }
                })
            );
        }

        return { sent, failed };
    }

    @Query()
    async vapidPublicKey(): Promise<string> {
        return process.env.VAPID_PUBLIC_KEY || '';
    }

    @Mutation()
    @Allow(Permission.Authenticated)
    async subscribeToPush(
        @Ctx() ctx: RequestContext,
        @Args('endpoint') endpoint: string,
        @Args('p256dh') p256dh: string,
        @Args('auth') auth: string,
        @Args('userAgent') userAgent?: string,
    ) {
        if (!ctx.activeUserId) return { success: false };
        await this.notificationsService.savePushSubscription(ctx, ctx.activeUserId.toString(), {
            endpoint,
            p256dh,
            auth,
            userAgent,
        });
        return { success: true };
    }

    @Mutation()
    @Allow(Permission.Authenticated)
    async unsubscribeFromPush(
        @Ctx() ctx: RequestContext,
        @Args('endpoint') endpoint: string,
    ) {
        if (!ctx.activeUserId) return { success: false };
        await this.notificationsService.removePushSubscription(ctx, endpoint);
        return { success: true };
    }

    @Mutation()
    @Allow(Permission.Authenticated)
    async testSmtpConnection(
        @Ctx() ctx: RequestContext,
        @Args('email') email: string,
    ): Promise<boolean> {
        const settings = await this.smsService.getSettings();
        if (!settings) {
            throw new Error('Paramètres Brevo/SMTP introuvables. Veuillez d\'abord enregistrer vos paramètres.');
        }
        await this.smsService.sendTransactionalEmail(
            email,
            'Test de Connexion Ahizan Notifications',
            '<h1>Configuration Valide !</h1><p>Votre serveur de messagerie SMTP ou API Brevo fonctionne correctement.</p>',
            settings,
        );
        return true;
    }

    @Mutation()
    @Allow(Permission.Authenticated)
    async testSmtpConnectionDirect(
        @Ctx() ctx: RequestContext,
        @Args('email') email: string,
        @Args('emailMethod') emailMethod: string,
        @Args('smtpHost') smtpHost?: string,
        @Args('smtpPort') smtpPort?: number,
        @Args('smtpUser') smtpUser?: string,
        @Args('smtpPassword') smtpPassword?: string,
        @Args('brevoApiKey') brevoApiKey?: string,
        @Args('fromEmail') fromEmail?: string,
        @Args('fromName') fromName?: string,
    ): Promise<boolean> {
        // Build a temporary settings object from the provided args
        const tempSettings = {
            emailMethod: emailMethod || 'smtp',
            smtpHost: smtpHost || '',
            smtpPort: smtpPort || 587,
            smtpUser: smtpUser || '',
            smtpPassword: smtpPassword || '',
            brevoApiKey: brevoApiKey || '',
            fromEmail: fromEmail || 'noreply@ahizan.com',
            fromName: fromName || 'AHIZAN',
            defaultPhonePrefix: '+229',
        } as any;

        await this.smsService.sendTransactionalEmail(
            email,
            'Test Direct - Ahizan Notifications',
            '<h1>Configuration Valide !</h1><p>Les identifiants que vous avez saisis fonctionnent correctement.</p>',
            tempSettings,
        );
        return true;
    }

    // ─────────────────────────────────────────────
    // Helpers
    // ─────────────────────────────────────────────

    private parseChannels(channel: string): ('IN_APP' | 'PUSH' | 'EMAIL' | 'SMS')[] {
        switch (channel) {
            case 'IN_APP': return ['IN_APP'];
            case 'PUSH':   return ['PUSH'];
            case 'EMAIL':  return ['EMAIL'];
            case 'SMS':    return ['SMS'];
            case 'ALL':    return ['IN_APP', 'PUSH'];
            default:       return ['IN_APP'];
        }
    }
}
