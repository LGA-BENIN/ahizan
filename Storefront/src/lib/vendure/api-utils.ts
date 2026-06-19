/**
 * Utility to manage Vendure API URLs and help avoid hardcoding localhost:3000.
 */
export function getShopApiUrl(): string {
    if (typeof window !== 'undefined') {
        const hostname = window.location.hostname;
        if (hostname.includes('ahizan.com')) {
            return 'https://api.ahizan.com/shop-api';
        }
    }
    return process.env.NEXT_PUBLIC_VENDURE_SHOP_API_URL || 
           process.env.VENDURE_SHOP_API_URL || 
           'http://127.0.0.1:3000/shop-api';
}

export function getBaseUrl(): string {
    const shopApiUrl = getShopApiUrl();
    // Remove /shop-api to get the base URL for REST endpoints or assets
    return shopApiUrl.replace(/\/shop-api\/?$/, '');
}

export function getBannerApiUrl(endpoint: string): string {
    // endpoint should not start with a slash
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint.substring(1) : endpoint;
    return `${getBaseUrl()}/banner/${cleanEndpoint}`;
}

export function getAssetUrl(path: string | null | undefined): string | undefined {
    if (!path) return undefined;
    if (path.startsWith('http')) return encodeURI(path);
    if (path.startsWith('data:')) return path;
    
    const baseUrl = getBaseUrl();
    let cleanPath = path.startsWith('/') ? path : `/${path}`;
    // Vendure preview thumbnails use /preview/ subdir and __preview suffix
    // Convert to original asset path: /assets/preview/32/xxx__preview.jpg → /assets/32/xxx.jpg
    cleanPath = cleanPath.replace(/\/preview\//, '/');
    cleanPath = cleanPath.replace(/__preview\./, '.');
    // Encode the path to handle spaces in filenames
    return `${baseUrl}${encodeURI(cleanPath)}`;
}

export interface PromoPriceInfo {
    hasPromotion: boolean;
    originalPrice: number;
    promotionalPrice: number;
    discountPercentage: number;
    showBothPrices: boolean;
}

export function getPromoPriceInfo({
    price,
    variantCustomFields,
    productId,
    collectionIds = [],
    activeFlash,
    globalApplySettings,
}: {
    price: number;
    variantCustomFields?: any;
    productId?: string;
    collectionIds?: string[];
    activeFlash?: any;
    globalApplySettings?: { applyToProduct?: boolean; applyToCollection?: boolean; isProductPage?: boolean; isCollectionPage?: boolean };
}): PromoPriceInfo {
    // 1. Check if the product qualifies for the active flash sale campaign
    let qualifiesForFlash = false;
    if (activeFlash) {
        if (activeFlash.selectionType === 'MANUAL') {
            qualifiesForFlash = activeFlash.manualProductIds?.includes(productId) || false;
        } else if (activeFlash.selectionType === 'FILTER') {
            const campaignCollectionIds = activeFlash.filterCriteria?.collectionIds || [];
            if (campaignCollectionIds.length === 0) {
                qualifiesForFlash = true; // All collections qualify
            } else {
                qualifiesForFlash = collectionIds.some(id => campaignCollectionIds.includes(id));
            }
            
            // Check price limits if configured in filterCriteria
            if (qualifiesForFlash && activeFlash.filterCriteria) {
                const { minPrice, maxPrice } = activeFlash.filterCriteria;
                if (minPrice > 0 && price < minPrice) qualifiesForFlash = false;
                if (maxPrice > 0 && price > maxPrice) qualifiesForFlash = false;
            }
        }
    }

    // 2. Determine if we should apply the flash sale pricing logic on this page
    let shouldApplyFlashLogic = false;
    if (activeFlash) {
        if (globalApplySettings?.isProductPage && globalApplySettings.applyToProduct) {
            shouldApplyFlashLogic = qualifiesForFlash;
        } else if (globalApplySettings?.isCollectionPage && globalApplySettings.applyToCollection) {
            shouldApplyFlashLogic = qualifiesForFlash;
        } else if (!globalApplySettings?.isProductPage && !globalApplySettings?.isCollectionPage) {
            // This is the Vente Flash block itself!
            shouldApplyFlashLogic = true; 
        }
    }

    // 3. Extract the real promotional price from the variant's custom fields
    const hasRealPromo = variantCustomFields?.onPromotion === true && typeof variantCustomFields?.promotionalPrice === 'number';
    const realPromoPrice = hasRealPromo ? variantCustomFields.promotionalPrice : null;

    let hasPromotion = false;
    let finalOriginalPrice = price;
    let finalPromoPrice = price;
    let discountPct = 0;
    let showBothPrices = activeFlash ? activeFlash.showPromotionalPrice !== false : true;

    if (shouldApplyFlashLogic && activeFlash) {
        // Vente Flash rules:
        if (hasRealPromo && realPromoPrice !== null) {
            hasPromotion = true;
            finalPromoPrice = realPromoPrice;
            discountPct = Math.round(((price - realPromoPrice) / price) * 100);
        } else if (activeFlash.applyFakePromotion && activeFlash.discountPercentage > 0) {
            // Apply fake promotion
            hasPromotion = true;
            discountPct = activeFlash.discountPercentage;
            finalPromoPrice = price; // The actual price paid is what the seller chose
            finalOriginalPrice = Math.round(price / (1 - discountPct / 100)); // The crossed-out price is inflated
        }
    } else {
        // Standard (Non-flash) pages:
        if (hasRealPromo && realPromoPrice !== null) {
            hasPromotion = true;
            finalPromoPrice = realPromoPrice;
            discountPct = Math.round(((price - realPromoPrice) / price) * 100);
        }
    }

    return {
        hasPromotion,
        originalPrice: finalOriginalPrice,
        promotionalPrice: finalPromoPrice,
        discountPercentage: discountPct,
        showBothPrices,
    };
}
