import { PluginCommonModule, VendurePlugin } from '@vendure/core';
import { BrevoSettings } from './entities/brevo-settings.entity';
import { BrevoSmsService } from './brevo-sms.service';
import { NotificationEventSubscriber } from './notification-event.subscriber';
import { NotificationsAdminResolver, notificationsAdminApiExtensions } from './notifications-admin.resolver';

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
    providers: [
        BrevoSmsService,
        NotificationEventSubscriber,
    ],
})
export class AhizanNotificationsPlugin { }
