import { defineDashboardExtension } from '@vendure/dashboard';
import { CmsListComponent } from './pages/cms-list';
import { CmsDetailComponent } from './pages/cms-detail';

export default defineDashboardExtension({
    id: 'cms',
    navSections: [
        {
            id: 'cms',
            title: 'Content Management',
        },
    ],
    routes: [
        {
            path: 'cms',
            component: CmsListComponent,
            navMenuItem: {
                id: 'cms-pages',
                title: 'Gestion CMS',
                sectionId: 'cms',
            },
        },
        {
            path: 'cms/:id',
            component: CmsDetailComponent,
        },
    ],
});
