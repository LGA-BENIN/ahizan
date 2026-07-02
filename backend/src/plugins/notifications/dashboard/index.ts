import { defineDashboardExtension } from '@vendure/dashboard';
import { Cloud, Mail, Bell, Send } from 'lucide-react';
import { NotificationsSettingsComponent } from './pages/notifications-settings';
import { NotificationLogsComponent } from './pages/notification-logs';
import { SendNotificationComponent } from './pages/send-notification';

export default defineDashboardExtension({
    navSections: [
        {
            id: 'integrations',
            title: 'Intégrations',
            icon: Cloud,
        },
    ],
    routes: [
        {
            path: 'notifications',
            component: NotificationsSettingsComponent,
            navMenuItem: {
                id: 'notifications-settings',
                title: 'Notifications Brevo',
                sectionId: 'integrations',
                icon: Mail,
                url: '/notifications',
            },
        },
        {
            path: 'notification-logs',
            component: NotificationLogsComponent,
            navMenuItem: {
                id: 'notification-logs',
                title: 'Journal Notifications',
                sectionId: 'integrations',
                icon: Bell,
                url: '/notification-logs',
            },
        },
        {
            path: 'send-notification',
            component: SendNotificationComponent,
            navMenuItem: {
                id: 'send-notification',
                title: 'Envoyer une notification',
                sectionId: 'integrations',
                icon: Send,
                url: '/send-notification',
            },
        },
    ],
});
