import { defineDashboardExtension } from '@vendure/dashboard';
import { VendorListComponent } from './vendors-list';

export default defineDashboardExtension({
    routes: [
        {
            path: '/vendors',
            component: VendorListComponent,
            navMenuItem: {
                id: 'vendors',
                title: 'Vendors',
                sectionId: 'marketplace',
            },
        },
    ],
    navSections: [
        {
            id: 'marketplace',
            title: 'Marketplace',
        },
    ],
});
