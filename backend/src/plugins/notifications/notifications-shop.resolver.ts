import { Ctx, RequestContext, Allow, Permission } from '@vendure/core';
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { Controller, Get, Headers, Param, Res, Sse } from '@nestjs/common';
import { Observable } from 'rxjs';
import { NotificationsService } from './notifications.service';
import gql from 'graphql-tag';

export const notificationsShopApiExtensionsV2 = gql`
    type NotificationItem {
        id: ID!
        createdAt: DateTime!
        eventType: String!
        title: String
        body: String
        actionUrl: String
        iconUrl: String
        isRead: Boolean!
        channel: String
        data: JSON
    }

    type NotificationList {
        items: [NotificationItem!]!
        unreadCount: Int!
    }

    type PushSubscriptionResult {
        success: Boolean!
    }

    extend type Query {
        myNotifications(take: Int, skip: Int, portal: String): NotificationList!
        myUnreadCount(portal: String): Int!
        vapidPublicKey: String!
    }

    extend type Mutation {
        markNotificationsRead: Boolean!
        markNotificationRead(id: ID!): Boolean!
        deleteNotification(id: ID!): Boolean!
        subscribeToPush(endpoint: String!, p256dh: String!, auth: String!, userAgent: String): PushSubscriptionResult!
        unsubscribeFromPush(endpoint: String!): PushSubscriptionResult!
    }
`;

@Resolver()
export class NotificationsShopResolverV2 {
    constructor(private readonly notificationsService: NotificationsService) { }

    @Query()
    async vapidPublicKey(): Promise<string> {
        return process.env.VAPID_PUBLIC_KEY || '';
    }

    @Query()
    @Allow(Permission.Authenticated)
    async myNotifications(
        @Ctx() ctx: RequestContext,
        @Args('take') take?: number,
        @Args('skip') skip?: number,
        @Args('portal') portal?: string,
    ) {
        if (!ctx.activeUserId) return { items: [], unreadCount: 0 };
        return this.notificationsService.getNotificationsForUser(
            ctx,
            ctx.activeUserId.toString(),
            take ?? 20,
            skip ?? 0,
            portal,
        );
    }

    @Query()
    @Allow(Permission.Authenticated)
    async myUnreadCount(
        @Ctx() ctx: RequestContext,
        @Args('portal') portal?: string,
    ): Promise<number> {
        if (!ctx.activeUserId) return 0;
        const { unreadCount } = await this.notificationsService.getNotificationsForUser(
            ctx,
            ctx.activeUserId.toString(),
            0,
            0,
            portal,
        );
        return unreadCount;
    }

    @Mutation()
    @Allow(Permission.Authenticated)
    async markNotificationsRead(@Ctx() ctx: RequestContext): Promise<boolean> {
        if (!ctx.activeUserId) return false;
        await this.notificationsService.markAllAsRead(ctx, ctx.activeUserId.toString());
        return true;
    }

    @Mutation()
    @Allow(Permission.Authenticated)
    async markNotificationRead(
        @Ctx() ctx: RequestContext,
        @Args('id') id: string,
    ): Promise<boolean> {
        await this.notificationsService.markAsRead(ctx, id);
        return true;
    }

    @Mutation()
    @Allow(Permission.Authenticated)
    async deleteNotification(
        @Ctx() ctx: RequestContext,
        @Args('id') id: string,
    ): Promise<boolean> {
        await this.notificationsService.deleteNotification(ctx, id);
        return true;
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
        await this.notificationsService.removePushSubscription(ctx, endpoint);
        return { success: true };
    }
}

/**
 * SSE Controller — provides real-time notification stream via Server-Sent Events.
 * Endpoint: GET /notifications/stream/:userId
 * Authorization: Bearer token via query param ?token=xxx
 */
@Controller('notifications')
export class NotificationsSseController {
    constructor(private readonly notificationsService: NotificationsService) { }

    @Sse('stream/:userId')
    stream(@Param('userId') userId: string): Observable<any> {
        return this.notificationsService.registerSseClient(userId);
    }

    @Get('sw.js')
    getServiceWorker(@Res() res: any) {
        const swCode = `
self.addEventListener('push', function(event) {
    if (!event.data) return;
    try {
        const data = event.data.json();
        const title = data.title || 'Notification Ahizan 🔔';
        const options = {
            body: data.body || 'Nouvelle mise à jour disponible.',
            icon: data.icon || '/assets/logo.png',
            badge: '/assets/logo.png',
            data: data,
            vibrate: [200, 100, 200],
        };
        event.waitUntil(self.registration.showNotification(title, options));
    } catch (e) {
        console.error('Error handling push event:', e);
    }
});

self.addEventListener('notificationclick', function(event) {
    event.notification.close();
    const urlToOpen = (event.notification.data && (event.notification.data.url || event.notification.data.actionUrl)) || '/admin';
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
            for (let i = 0; i < clientList.length; i++) {
                let client = clientList[i];
                if (client.url.includes(urlToOpen) && 'focus' in client) {
                    return client.focus();
                }
            }
            if (clients.openWindow) {
                return clients.openWindow(urlToOpen);
            }
        })
    );
});
`;
        res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
        res.setHeader('Service-Worker-Allowed', '/');
        return res.send(swCode);
    }
}
