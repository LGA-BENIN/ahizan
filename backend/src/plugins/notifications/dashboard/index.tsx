import React from 'react';
import { defineDashboardExtension } from '@vendure/dashboard';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Cloud, Mail, Bell, Send } from 'lucide-react';
import { NotificationsSettingsComponent } from './pages/notifications-settings';
import { NotificationLogsComponent } from './pages/notification-logs';
import { SendNotificationComponent } from './pages/send-notification';
import { SuperadminNotificationBell } from './components/superadmin-notification-bell';

const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            refetchOnWindowFocus: false,
            retry: 1,
        },
    },
});

function withQueryClient<P extends object>(Component: React.ComponentType<P>): React.FC<P> {
    return function WrappedComponent(props: P) {
        return (
            <QueryClientProvider client={queryClient}>
                <Component {...props} />
            </QueryClientProvider>
        );
    };
}

export default defineDashboardExtension({
    toolbarItems: [
        {
            id: 'superadmin-notification-bell',
            component: withQueryClient(SuperadminNotificationBell),
            position: { itemId: 'alerts', order: 'replace' },
        },
    ],
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
            component: withQueryClient(NotificationsSettingsComponent),
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
            component: withQueryClient(NotificationLogsComponent),
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
            component: withQueryClient(SendNotificationComponent),
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
