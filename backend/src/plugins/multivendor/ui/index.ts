import { defineDashboardExtension } from '@vendure/dashboard';

export default defineDashboardExtension({
    navSections: [
        {
            id: 'marketplace',
            title: 'Marketplace',
            items: [
                {
                    id: 'test',
                    title: 'Test Page',
                    url: './test',
                },
            ],
        },
    ],
});
