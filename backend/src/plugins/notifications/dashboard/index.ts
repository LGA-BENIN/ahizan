import { defineDashboardExtension } from '@vendure/dashboard';
import { Cloud, Mail } from 'lucide-react';
import { NotificationsSettingsComponent } from './pages/notifications-settings';

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
    ],
});
