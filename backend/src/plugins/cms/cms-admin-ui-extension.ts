import { AdminUiExtension } from '@vendure/ui-devkit/compiler';
import path from 'path';

export const cmsAdminUiExtension: AdminUiExtension = {
    extensionPath: path.join(__dirname, 'ui'),
    ngModules: [
        {
            type: 'lazy',
            route: 'cms',
            ngModuleFileName: 'cms-ui-extension.ts',
            ngModuleName: 'CmsUiExtensionModule',
        },
    ],
    // However, with Vite and React in Vendure 3, we define routes differently:
    routes: [{ route: 'cms', filePath: 'routes.ts' }],
    providers: ['providers.ts'],
};
