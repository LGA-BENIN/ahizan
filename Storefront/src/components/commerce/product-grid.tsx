import {ResultOf} from '@/graphql';
import {ReactiveProductGrid} from './reactive-product-grid';
import {SearchProductsQuery} from "@/lib/vendure/queries";
import {getActiveChannel} from '@/lib/vendure/actions';
import { expandProductsWithSellerOffers } from '@/lib/vendure/seller-offers';
import { DisplayEngineContext } from '@/lib/vendure/display-engine';
import { cookies } from 'next/headers';

interface ProductGridProps {
    productData?: {
        data: ResultOf<typeof SearchProductsQuery>;
        token?: string;
    };
    productDataPromise?: Promise<{
        data: ResultOf<typeof SearchProductsQuery>;
        token?: string;
    }>;
    currentPage: number;
    take: number;
    columns?: number;
    config?: any;
    minPrice?: number;
    maxPrice?: number;
    userLocation?: any;
}

export async function ProductGrid({productData, productDataPromise, currentPage, take, columns = 3, config, minPrice, maxPrice, userLocation: userLocationProp}: ProductGridProps) {
    const channel = await getActiveChannel();

    const resolvedData = productData || (productDataPromise ? await productDataPromise : null);
    if (!resolvedData) return null;

    let userLocation = userLocationProp;
    if (!userLocation) {
        try {
            const cookieStore = await cookies();
            const locCookie = cookieStore.get('ahizan_client_location')?.value;
            if (locCookie) {
                userLocation = JSON.parse(decodeURIComponent(locCookie));
            }
        } catch {}
    }

    const displayContext: DisplayEngineContext = {
        pageType: 'COLLECTION',
        userLocation,
        userLat: userLocation?.latitude ? Number(userLocation.latitude) : undefined,
        userLon: userLocation?.longitude ? Number(userLocation.longitude) : undefined,
        marketId: userLocation?.marketId ? String(userLocation.marketId) : undefined,
        locationId: userLocation?.geoZoneId || userLocation?.id ? String(userLocation.geoZoneId || userLocation.id) : undefined,
        communeName: userLocation?.commune || userLocation?.name,
        maxVariantsPerCentralProduct: config?.maxVariantsPerCentralProduct || 2,
        maxItemsPerVendor: config?.maxItemsPerVendor || 4, // Diversity policy to prevent single vendor dominance
        boostCertifiedVendors: true,
    };

    const searchResult = resolvedData.data.search;
    const rawItems = searchResult.items || [];
    const expandedItems = await expandProductsWithSellerOffers(rawItems, displayContext);

    return (
        <ReactiveProductGrid
            initialItems={expandedItems}
            currentPage={currentPage}
            take={take}
            columns={columns}
            config={config}
            minPrice={minPrice}
            maxPrice={maxPrice}
            initialLocation={userLocation}
        />
    );
}
