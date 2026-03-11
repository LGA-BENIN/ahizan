import { defineDashboardExtension } from '@vendure/dashboard';
import { LandingPageBuilder } from './landing-page-builder';

export default defineDashboardExtension({
    id: 'cms',
    routes: [
        {
            path: 'builder',
            component: LandingPageBuilder,
            navMenuItem: {
                id: 'cms-builder',
                title: 'Landing Page Builder',
                sectionId: 'cms-section',
                routerLink: ['/extensions', 'cms', 'builder'],
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
