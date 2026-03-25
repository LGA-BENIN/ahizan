import { defineDashboardExtension } from '@vendure/dashboard';
import { LandingPageBuilder } from './landing-page-builder';

export default defineDashboardExtension({
    routes: [
        {
            path: 'builder',
            component: LandingPageBuilder,
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
