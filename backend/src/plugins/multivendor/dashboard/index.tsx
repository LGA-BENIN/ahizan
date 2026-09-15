import { defineDashboardExtension } from '@vendure/dashboard';
import React from 'react';
import { VendorListComponent } from './vendors-list';
import { VendorDetailComponent } from './vendor-detail';
import { ProductListComponent } from './products-list';
import { PlatformSettingsComponent } from './platform-settings';
import { OrderStatusesComponent } from './order-statuses';
import { DeliveryZonesComponent } from './delivery-zones';
import { OrdersListComponent } from './orders-list';
import { PaymentManagementComponent } from './payment-management';
import { VendorSelector } from './vendor-selector';
import { SuivreDiscussionsComponent } from './suivre-discussions';
import { EmployeeRolesManagementComponent } from './employee-roles-management';
import { AhizanAIHubComponent } from './ai-hub';
import { AhizanAIChatDrawer } from './ai-chat-drawer';

function AhizanAIProvider({ children }: { children: React.ReactNode }) {
    return (
        <>
            {children}
            <AhizanAIChatDrawer />
        </>
    );
}

export default defineDashboardExtension({
    customProviders: [
        {
            id: 'ahizan-ai-drawer',
            component: AhizanAIProvider,
            location: 'app',
        },
    ],
    routes: [
        {
            path: 'ahizan-ai',
            component: AhizanAIHubComponent,
            navMenuItem: {
                id: 'ahizan-ai',
                title: '✨ Ahizan AI (Hub)',
                sectionId: 'marketplace',
                url: '/ahizan-ai',
            },
        },
        {
            path: 'extensions/ahizan-ai',
            component: AhizanAIHubComponent,
        },
        {
            path: 'gestion-paiement',
            component: PaymentManagementComponent,
            navMenuItem: {
                id: 'gestion-paiement',
                title: 'Commissions & Règlements',
                sectionId: 'marketplace',
                url: '/gestion-paiement',
            },
        },
        {
            path: 'extensions/gestion-paiement',
            component: PaymentManagementComponent,
        },
        {
            path: 'vendors',
            component: VendorListComponent,
            navMenuItem: {
                id: 'vendors',
                title: 'Vendeurs',
                sectionId: 'marketplace',
                url: '/vendors',
            },
        },
        {
            path: 'extensions/vendors',
            component: VendorListComponent,
        },
        {
            path: 'vendors/:id',
            component: VendorDetailComponent,
        },
        {
            path: 'extensions/vendors/:id',
            component: VendorDetailComponent,
        },
        {
            path: 'vendor-orders',
            component: OrdersListComponent,
            navMenuItem: {
                id: 'vendor-orders-list',
                title: 'Ventes des Vendeurs',
                sectionId: 'marketplace',
                url: '/vendor-orders',
            },
        },
        {
            path: 'extensions/vendor-orders',
            component: OrdersListComponent,
        },
        {
            path: 'orders',
            component: OrdersListComponent,
        },
        {
            path: 'settings',
            component: PlatformSettingsComponent,
            navMenuItem: {
                id: 'platform-settings',
                title: 'Paramètres',
                sectionId: 'marketplace',
                url: '/settings',
            },
        },
        {
            path: 'extensions/settings',
            component: PlatformSettingsComponent,
        },
        {
            path: 'order-statuses',
            component: OrderStatusesComponent,
            navMenuItem: {
                id: 'order-statuses',
                title: 'Configuration des Statuts',
                sectionId: 'marketplace',
                url: '/order-statuses',
            },
        },
        {
            path: 'extensions/order-statuses',
            component: OrderStatusesComponent,
        },
        {
            path: 'delivery-zones',
            component: DeliveryZonesComponent,
            navMenuItem: {
                id: 'delivery-zones',
                title: 'Zones de livraison',
                sectionId: 'marketplace',
                url: '/delivery-zones',
            },
        },
        {
            path: 'extensions/delivery-zones',
            component: DeliveryZonesComponent,
        },
        {
            path: 'marketplace-products',
            component: ProductListComponent,
            navMenuItem: {
                id: 'marketplace-products-list',
                title: 'Produits Marketplace',
                sectionId: 'marketplace',
                url: '/marketplace-products',
            },
        },
        {
            path: 'extensions/marketplace-products',
            component: ProductListComponent,
        },
        {
            path: 'suivre-discussions',
            component: SuivreDiscussionsComponent,
            navMenuItem: {
                id: 'suivre-discussions',
                title: 'Suivre les discussions',
                sectionId: 'marketplace',
                url: '/suivre-discussions',
            },
        },
        {
            path: 'extensions/suivre-discussions',
            component: SuivreDiscussionsComponent,
        },
        {
            path: 'roles-employees',
            component: EmployeeRolesManagementComponent,
            navMenuItem: {
                id: 'roles-employees',
                title: 'Rôles & Employés',
                sectionId: 'marketplace',
                url: '/roles-employees',
            },
        },
        {
            path: 'extensions/roles-employees',
            component: EmployeeRolesManagementComponent,
        },
    ],
    navSections: [
        {
            id: 'marketplace',
            title: 'Marketplace',
        },
    ],
    customFormComponents: {
        customFields: [
            {
                id: 'vendor-selector',
                component: VendorSelector,
            },
        ],
    },
});
