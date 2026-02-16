import { PluginCommonModule, VendurePlugin } from '@vendure/core';
import { RegistrationField } from './entities/registration-field.entity';
import { RegistrationResponse } from './entities/registration-response.entity';
import { RegistrationFieldService } from './service/registration-field.service';
import { adminApiExtensions, shopApiExtensions } from './api/api-extensions';
import { RegistrationFieldAdminResolver, RegistrationFieldShopResolver } from './api/registration-field.resolver';

@VendurePlugin({
    imports: [PluginCommonModule],
    entities: [RegistrationField, RegistrationResponse],
    providers: [RegistrationFieldService],
    adminApiExtensions: {
        schema: adminApiExtensions,
        resolvers: [RegistrationFieldAdminResolver],
    },
    shopApiExtensions: {
        schema: shopApiExtensions,
        resolvers: [RegistrationFieldShopResolver],
    },
    dashboard: './dashboard',
})
export class PageInscriptionPlugin {
    constructor() {
        console.log('PageInscriptionPlugin initialized');
    }
}
