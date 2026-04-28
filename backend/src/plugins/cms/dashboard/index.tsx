import { defineDashboardExtension } from '@vendure/dashboard';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { UniversalBuilder } from './UniversalBuilder/UniversalBuilder';

const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            refetchOnWindowFocus: false,
            retry: 1,
        },
    },
});

const WrappedBuilder = () => (
    <QueryClientProvider client={queryClient}>
        <UniversalBuilder />
    </QueryClientProvider>
);

export default defineDashboardExtension({
    routes: [
        {
            path: 'builder',
            component: WrappedBuilder,
            navMenuItem: {
                id: 'cms-builder',
                sectionId: 'cms-section',
                url: '/builder',
            },
        },
    ],
    navSections: [
        {
            id: 'cms-section',
            title: 'Gestion CMS',
        },
    ],
});
