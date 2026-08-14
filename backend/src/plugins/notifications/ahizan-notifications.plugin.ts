import {
    PluginCommonModule,
    VendurePlugin,
    TransactionalConnection,
    User,
    RequestContext,
    Ctx,
} from '@vendure/core';
import { Args, Mutation, Resolver } from '@nestjs/graphql';
import gql from 'graphql-tag';
import { BrevoSettings } from './entities/brevo-settings.entity';
import { NotificationLog } from './entities/notification-log.entity';
import { PushSubscription } from './entities/push-subscription.entity';
import { BrevoSmsService } from './brevo-sms.service';
import { NotificationEventSubscriber } from './notification-event.subscriber';
import { NotificationsAdminResolver, notificationsAdminApiExtensions } from './notifications-admin.resolver';
import { NotificationsService } from './notifications.service';
import { NotificationsShopResolverV2, notificationsShopApiExtensionsV2, NotificationsSseController } from './notifications-shop.resolver';

export const notificationsShopApiExtensions = gql`
    extend type Mutation {
        verifyPasswordResetCode(email: String!, code: String!): Boolean!
    }
`;

import * as crypto from 'crypto';

@Resolver()
export class NotificationsShopResolver {
    constructor(private connection: TransactionalConnection) { }

    @Mutation()
    async verifyPasswordResetCode(@Ctx() ctx: RequestContext, @Args() args: any) {
        const { email, code } = args;
        if (!email || !code || typeof code !== 'string') return false;

        // Normalizing email and code comparison
        const normalizedEmail = email.toLowerCase().trim();
        const trimmedCode = code.trim();

        const user = await this.connection.getRepository(ctx, User).findOne({
            where: { identifier: normalizedEmail },
            relations: ['authenticationMethods']
        });

        if (!user) return false;

        const authMethod = user.getNativeAuthenticationMethod(false);
        if (!authMethod || !authMethod.passwordResetToken) {
            return false;
        }

        const storedToken = authMethod.passwordResetToken;
        if (storedToken.length !== trimmedCode.length) {
            return false;
        }

        try {
            const isMatch = crypto.timingSafeEqual(Buffer.from(storedToken), Buffer.from(trimmedCode));
            if (!isMatch) {
                return false;
            }
        } catch (err) {
            return false;
        }

        return true;
    }
}

/**
 * AhizanNotificationsPlugin
 *
 * This plugin manages:
 *   - Brevo SMS/Email transactional notifications via EventBus subscriptions
 *   - Real-time in-app notifications via Server-Sent Events (SSE)
 *   - Web Push notifications (VAPID)
 *   - Admin UI for managing notification settings, history, and campaigns
 *
 * The BrevoSettings entity stores all configuration in the database so that
 * administrators can update SMS keys and templates without touching any .env files.
 */
@VendurePlugin({
    imports: [PluginCommonModule],
    entities: [BrevoSettings, NotificationLog, PushSubscription],
    dashboard: './dashboard',
    controllers: [NotificationsSseController],
    adminApiExtensions: {
        schema: notificationsAdminApiExtensions,
        resolvers: [NotificationsAdminResolver],
    },
    shopApiExtensions: {
        schema: gql`
            ${notificationsShopApiExtensions}
            ${notificationsShopApiExtensionsV2}
        `,
        resolvers: [NotificationsShopResolver, NotificationsShopResolverV2],
    },
    providers: [
        BrevoSmsService,
        NotificationEventSubscriber,
        NotificationsService,
    ],
    exports: [
        NotificationsService,
        BrevoSmsService,
    ],
    compatibility: '^3.0.0',
})
export class AhizanNotificationsPlugin { }

