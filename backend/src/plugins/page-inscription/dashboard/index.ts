import { defineDashboardExtension } from '@vendure/dashboard';
import { RegistrationFieldsListComponent } from './fields-list';

export default defineDashboardExtension({
    id: 'page-inscription',
    navSections: [
        {
            id: 'personalisation',
            title: 'Personnalisation des pages',
        },
    ],
    routes: [
        {
            path: 'fields',
            component: RegistrationFieldsListComponent,
            navMenuItem: {
                id: 'page-inscription',
                title: 'Page Inscription',
                sectionId: 'personalisation',
                routerLink: ['/extensions', 'page-inscription', 'fields'],
            },
        },
    ],
});
