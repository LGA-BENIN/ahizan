import React from 'react';
import { defineDashboardExtension } from '@vendure/dashboard';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { VendorListComponent } from './vendors-list';
import { VendorDetailComponent } from './vendor-detail';
import { ProductListComponent } from './products-list';
import { PlatformSettingsComponent } from './platform-settings';
import { OrderStatusesComponent } from './order-statuses';
import { DeliveryZonesComponent } from './delivery-zones';
import { OrdersListComponent } from './orders-list';
import { PaymentManagementComponent } from './payment-management';
import { SellerStatusColumn, AdminStatusColumn } from './order-columns';
import { VendorSelector } from './vendor-selector';
import { SuivreDiscussionsComponent } from './suivre-discussions';
import { EmployeeRolesManagementComponent } from './employee-roles-management';

const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            refetchOnWindowFocus: false,
            retry: 1,
        },
    },
});

function withQueryClient<P extends object>(Component: React.ComponentType<P>): React.FC<P> {
    return function WrappedComponent(props: P) {
        return (
            <QueryClientProvider client={queryClient}>
                <Component {...props} />
            </QueryClientProvider>
        );
    };
}

export default defineDashboardExtension({
    routes: [
        {
            path: 'gestion-paiement',
            component: withQueryClient(PaymentManagementComponent),
            navMenuItem: {
                id: 'gestion-paiement',
                title: 'Commissions & Règlements',
                sectionId: 'marketplace',
                url: '/gestion-paiement',
            },
        },
        {
            path: 'extensions/gestion-paiement',
            component: withQueryClient(PaymentManagementComponent),
        },
        {
            path: 'vendors',
            component: withQueryClient(VendorListComponent),
            navMenuItem: {
                id: 'vendors',
                title: 'Vendeurs',
                sectionId: 'marketplace',
                url: '/vendors',
            },
        },
        {
            path: 'extensions/vendors',
            component: withQueryClient(VendorListComponent),
        },
        {
            path: 'vendors/:id',
            component: withQueryClient(VendorDetailComponent),
        },
        {
            path: 'extensions/vendors/:id',
            component: withQueryClient(VendorDetailComponent),
        },
        {
            path: 'vendor-orders',
            component: withQueryClient(OrdersListComponent),
            navMenuItem: {
                id: 'vendor-orders-list',
                title: 'Ventes des Vendeurs',
                sectionId: 'marketplace',
                url: '/vendor-orders',
            },
        },
        {
            path: 'extensions/vendor-orders',
            component: withQueryClient(OrdersListComponent),
        },
        {
            path: 'orders',
            component: withQueryClient(OrdersListComponent),
        },
        {
            path: 'settings',
            component: withQueryClient(PlatformSettingsComponent),
            navMenuItem: {
                id: 'platform-settings',
                title: 'Paramètres',
                sectionId: 'marketplace',
                url: '/settings',
            },
        },
        {
            path: 'extensions/settings',
            component: withQueryClient(PlatformSettingsComponent),
        },
        {
            path: 'order-statuses',
            component: withQueryClient(OrderStatusesComponent),
            navMenuItem: {
                id: 'order-statuses',
                title: 'Configuration des Statuts',
                sectionId: 'marketplace',
                url: '/order-statuses',
            },
        },
        {
            path: 'extensions/order-statuses',
            component: withQueryClient(OrderStatusesComponent),
        },
        {
            path: 'delivery-zones',
            component: withQueryClient(DeliveryZonesComponent),
            navMenuItem: {
                id: 'delivery-zones',
                title: 'Zones de livraison',
                sectionId: 'marketplace',
                url: '/delivery-zones',
            },
        },
        {
            path: 'extensions/delivery-zones',
            component: withQueryClient(DeliveryZonesComponent),
        },
        {
            path: 'marketplace-products',
            component: withQueryClient(ProductListComponent),
            navMenuItem: {
                id: 'marketplace-products-list',
                title: 'Produits Marketplace',
                sectionId: 'marketplace',
                url: '/marketplace-products',
            },
        },
        {
            path: 'extensions/marketplace-products',
            component: withQueryClient(ProductListComponent),
        },
        {
            path: 'suivre-discussions',
            component: withQueryClient(SuivreDiscussionsComponent),
            navMenuItem: {
                id: 'suivre-discussions',
                title: 'Suivre les discussions',
                sectionId: 'marketplace',
                url: '/suivre-discussions',
            },
        },
        {
            path: 'extensions/suivre-discussions',
            component: withQueryClient(SuivreDiscussionsComponent),
        },
        {
            path: 'roles-employees',
            component: withQueryClient(EmployeeRolesManagementComponent),
            navMenuItem: {
                id: 'roles-employees',
                title: 'Rôles & Employés',
                sectionId: 'marketplace',
                url: '/roles-employees',
            },
        },
        {
            path: 'extensions/roles-employees',
            component: withQueryClient(EmployeeRolesManagementComponent),
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
