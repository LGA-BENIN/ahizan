import { defineDashboardExtension } from '@vendure/dashboard';
import { NotificationsSettingsComponent } from './pages/notifications-settings';

export default defineDashboardExtension({
    id: 'ahizan-notifications',
    navSections: [
        {
            id: 'integrations',
            title: 'Intégrations',
            icon: 'cloud',
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
                icon: 'email',
            },
        },
    ],
});
