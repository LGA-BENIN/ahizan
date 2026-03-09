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
import { BrevoSmsService } from './brevo-sms.service';
import { NotificationEventSubscriber } from './notification-event.subscriber';
import { NotificationsAdminResolver, notificationsAdminApiExtensions } from './notifications-admin.resolver';

export const notificationsShopApiExtensions = gql`
    extend type Mutation {
        verifyPasswordResetCode(email: String!, code: String!): Boolean!
    }
`;

@Resolver()
export class NotificationsShopResolver {
    constructor(private connection: TransactionalConnection) { }

    @Mutation()
    async verifyPasswordResetCode(@Ctx() ctx: RequestContext, @Args() args: any) {
        const { email, code } = args;
        // Normalizing email comparison
        const normalizedEmail = email.toLowerCase().trim();

        const user = await this.connection.getRepository(ctx, User).findOne({
            where: { identifier: normalizedEmail },
            relations: ['authenticationMethods']
        });

        if (!user) return false;

        const authMethod = user.getNativeAuthenticationMethod(false);
        if (!authMethod || authMethod.passwordResetToken !== code) {
            return false;
        }

        const expiresAt = (user.customFields as any).passwordResetCodeExpiresAt;
        if (!expiresAt || new Date() > new Date(expiresAt)) {
            return false;
        }

        return true;
    }
}

/**
 * AhizanNotificationsPlugin
 *
 * This plugin manages:
 *   - Brevo SMS transactional notifications via EventBus subscriptions
 *   - Admin UI API for managing Brevo settings (API key, phone prefix, SMS toggles & templates)
 *
 * The BrevoSettings entity stores all configuration in the database so that
 * administrators can update SMS keys and templates without touching any .env files.
 */
@VendurePlugin({
    imports: [PluginCommonModule],
    entities: [BrevoSettings],
    dashboard: './dashboard',
    adminApiExtensions: {
        schema: notificationsAdminApiExtensions,
        resolvers: [NotificationsAdminResolver],
    },
    shopApiExtensions: {
        schema: notificationsShopApiExtensions,
        resolvers: [NotificationsShopResolver],
    },
    providers: [
        BrevoSmsService,
        NotificationEventSubscriber,
    ],
})
export class AhizanNotificationsPlugin { }
