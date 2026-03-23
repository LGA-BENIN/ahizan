import { defineDashboardExtension } from '@vendure/dashboard';
import { VendorListComponent } from './vendors-list';
import { VendorDetailComponent } from './vendor-detail';
import { ProductListComponent } from './products-list';
import { PlatformSettingsComponent } from './platform-settings';
import { OrderStatusesComponent } from './order-statuses';
import { DeliveryZonesComponent } from './delivery-zones';
import { OrdersListComponent } from './orders-list';
import { SellerStatusColumn, AdminStatusColumn } from './order-columns';

export default defineDashboardExtension({
    routes: [
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
            path: 'vendors/:id',
            component: VendorDetailComponent,
        },
        {
            path: 'orders',
            component: OrdersListComponent,
            navMenuItem: {
                id: 'marketplace-orders',
                title: 'Commandes',
                sectionId: 'marketplace',
                url: '/orders',
            },
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
            path: 'order-statuses',
            component: OrderStatusesComponent,
            navMenuItem: {
                id: 'order-statuses',
                title: 'Statuts commandes',
                sectionId: 'marketplace',
                url: '/order-statuses',
            },
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
    ],
    navSections: [
        {
            id: 'marketplace',
            title: 'Marketplace',
        },
    ],
    dataTableColumns: [
        {
            id: 'seller-status',
            entity: 'Order',
            title: 'Statut Vendeur',
            component: SellerStatusColumn,
        },
        {
            id: 'admin-status',
            entity: 'Order',
            title: 'Statut Livraison',
            component: AdminStatusColumn,
        },
    ],
});
