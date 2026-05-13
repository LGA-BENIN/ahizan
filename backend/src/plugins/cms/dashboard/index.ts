import { defineDashboardExtension } from '@vendure/dashboard';
import { UniversalBuilder } from './UniversalBuilder/UniversalBuilder';

export default defineDashboardExtension({
    routes: [
        {
            path: 'builder',
            component: UniversalBuilder,
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
