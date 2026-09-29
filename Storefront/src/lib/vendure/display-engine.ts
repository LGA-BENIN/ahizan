import { getAssetUrl } from './api-utils';

export interface DisplayVariantOption {
    id: string;
    name: string;
    code: string;
    groupName: string;
    hexColor?: string;
    assetPreview?: string;
    variantId: string;
    price?: number;
    promotionalPrice?: number | null;
    onPromotion?: boolean;
    hasStock?: boolean;
    sku?: string;
}

export interface WinningOffer {
    id: string;
    price: number;
    promotionalPrice?: number | null;
    onPromotion?: boolean;
    discountPercentage?: number;
    deliveryTimeValue?: number | string;
    deliveryTimeUnit?: string;
    condition?: 'NEW' | 'USED' | string;
    declinationName?: string;
    productVariantName?: string;
    vendor?: {
        id?: string;
        name?: string;
        rating?: number;
        ratingCount?: number;
        verificationStatus?: boolean | string;
        location?: { id?: string; name?: string };
        physicalMarket?: { id?: string; name?: string };
        distanceKm?: number;
        latitude?: number;
        longitude?: number;
        logo?: any;
        address?: string;
    };
    productVariant?: any;
    selectedVariant?: any;
    distanceKm?: number;
    stock?: number;
    sku?: string;
    score?: number;
}

export interface DisplayOfferItem {
    id: string; // Unique offer key (e.g. `${productId}-${variantId}-${vendorId}`)
    productId: string;
    productVariantId: string;
    name: string;
    productName: string;
    variantName?: string;
    declinationName?: string;
    productVariantName?: string;
    slug: string;
    featuredAsset?: any;
    productAsset?: any;
    productVariantAsset?: any;
    collections?: Array<{ id: string; name?: string; slug?: string }>;
    facetValueIds?: string[];
    
    // Concrete vendor offer details
    winningOffer: WinningOffer;
    
    // Direct access helper fields
    price: number;
    promotionalPrice?: number | null;
    onPromotion?: boolean;
    discountPercentage?: number;
    vendorId?: string;
    vendorName?: string;
    marketName?: string;
    marketId?: string;
    locationName?: string;
    locationId?: string;
    distanceKm?: number;
    stock?: number;
    condition?: string;
    deliveryTimeValue?: number | string;
    deliveryTimeUnit?: string;
    score?: number;
    fallbackLevel?: number;
    fallbackLabel?: string;
    isMasterResolved?: boolean;
}

// Backward compatibility type alias
export type MasterDisplayItem = DisplayOfferItem;

export interface DiversityPolicy {
    maxVariantsPerCentralProduct?: number;
    maxVariantsPerSeller?: number;
    allowMultipleSellersPerProduct?: boolean;
}

export interface DisplayEngineContext {
    pageType?: 'HOMEPAGE' | 'CMS_SECTION' | 'COLLECTION' | 'CATEGORY' | 'SEARCH' | 'VENDOR_STORE' | 'MARKET_PAGE' | 'NEIGHBORHOOD_PAGE' | 'PDP_SIMILAR' | string;
    experienceStrategy?: 'LOCAL_DISCOVERY' | 'HOME_FEED' | 'TRENDING' | 'FLASH_SALE' | 'CATALOG' | string;
    userLocation?: any;
    userLat?: number;
    userLon?: number;
    marketId?: string;
    locationId?: string;
    communeId?: string;
    communeName?: string;
    sellerId?: string;
    isVendorStore?: boolean;
    boostCertifiedVendors?: boolean;
    onlyInStock?: boolean;
    requirePromotion?: boolean;
    requireVariantsWithOptions?: boolean;
    allowProductsWithoutOptions?: boolean;
    limit?: number;
    maxItemsPerVendor?: number;
    maxVariantsPerCentralProduct?: number;
    diversityPolicy?: DiversityPolicy;
}

/**
 * Calculates distance in kilometers between two GPS points using Haversine formula
 */
export function calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Earth radius in km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

const COMMUNE_SUB_ZONES: Record<string, string[]> = {
    cotonou: [
        'cotonou', 'dantokpa', 'ganhi', 'missèbo', 'missebo', 'agbodjèdo', 'agbodjedo', 'agbocodji',
        'hlakomè', 'hlakome', 'houinvié', 'houinvie', 'akpakpa', 'gbégamey', 'gbegamey',
        'cadjèhoun', 'cadjehoun', 'menontin', 'mènontin', 'vèdoko', 'vedoko', 'saint michel',
        'maro-militaire', 'jonquet', 'zongo', 'fifadji', 'vogbé', 'vogbe', 'fidjrossè', 'fidjrosse',
        'littoral', '1er arrondissement', '2ème arrondissement', '3ème arrondissement',
        '4ème arrondissement', '5ème arrondissement', '6ème arrondissement', '7ème arrondissement',
        '8ème arrondissement', '9ème arrondissement', '10ème arrondissement', '11ème arrondissement',
        '12ème arrondissement', '13ème arrondissement'
    ],
    'porto-novo': [
        'porto-novo', 'portonovo', 'ouando', 'tokpota', 'ahouangbo', 'avakpa', 'djassin',
        'kandévié', 'kandevie', 'attakè', 'attake', 'ouémé', 'oueme', 'grand marché'
    ],
    'abomey-calavi': [
        'abomey-calavi', 'calavi', 'zogbadjè', 'zogbadje', 'godomey', 'cococodji', 'tankpè',
        'tankpe', 'akassato', 'glo-djigbé', 'glo-djigbe', 'arconville', 'zinvié', 'zinvie', 'atlantique',
        'zoca'
    ],
    parakou: ['parakou', 'arzèkè', 'arzeke', 'borgou'],
    ouidah: ['ouidah', 'kpassè', 'kpasse'],
    bohicon: ['bohicon', 'zou']
};

/**
 * Multi-Signal Scoring Engine:
 * Intelligently evaluates candidate offers based on Strategy, Geography, Pricing, Stock, SLA and Vendor Trust.
 */
export function scoreOffer(
    offer: any, 
    context: DisplayEngineContext, 
    avgPriceInGroup: number
): number {
    let score = 100;
    const strategy = context.experienceStrategy || 'LOCAL_DISCOVERY';

    // 1. In Stock Check (Crucial)
    const stock = Number(offer.stock ?? offer.stockOnHand ?? 1);
    if (stock <= 0) {
        if (context.onlyInStock === true) return -1000;
        score -= 20;
    } else {
        score += 25;
    }

    // 2. Pricing & Promotion Attractiveness
    const effectivePrice = offer.onPromotion && offer.promotionalPrice ? offer.promotionalPrice : offer.price;
    if (offer.onPromotion && offer.promotionalPrice && offer.promotionalPrice < offer.price) {
        const discountPct = Math.round(((offer.price - offer.promotionalPrice) / offer.price) * 100);
        if (strategy === 'FLASH_SALE' || strategy === 'TRENDING') {
            score += 50 + Math.min(30, discountPct);
        } else {
            score += 25 + Math.min(20, discountPct);
        }
    }

    // Relative price attractiveness compared to group
    if (avgPriceInGroup > 0 && effectivePrice > 0) {
        const priceRatio = Math.min(1.5, avgPriceInGroup / effectivePrice);
        score += priceRatio * 20;
    }

    // 3. Geographic Proximity (PostGIS, GeoEngine, GPS and City / Commune matching)
    const vendor = offer.vendor;
    if (vendor) {
        const userLat = context.userLat ?? (context.userLocation?.latitude ? Number(context.userLocation.latitude) : undefined);
        const userLon = context.userLon ?? (context.userLocation?.longitude ? Number(context.userLocation.longitude) : undefined);
        const targetMarketId = context.marketId ?? context.userLocation?.marketId;
        const targetLocationId = context.locationId ?? context.userLocation?.geoZoneId ?? context.userLocation?.id;
        const userCityName = (context.communeName || context.userLocation?.commune || context.userLocation?.name || '').toLowerCase().trim();

        const vendorMarketId = String(vendor.physicalMarket?.id || vendor.marketId || '');
        const vendorLocationId = String(vendor.location?.id || vendor.locationId || '');
        const vendorMarketName = (vendor.physicalMarket?.name || '').toLowerCase();
        const vendorLocationName = (vendor.location?.name || '').toLowerCase();
        const vendorAddress = (vendor.address || '').toLowerCase();
        const vendorZone = (vendor.zone || '').toLowerCase();

        // Check 3.1: Exact Market Match (e.g. Dantokpa, Ganhi, Ouando)
        if (targetMarketId && vendorMarketId && String(targetMarketId) === vendorMarketId) {
            score += 70;
            offer.fallbackLevel = 1;
            offer.fallbackLabel = vendor.physicalMarket?.name || 'Marché';
        }
        // Check 3.2: Exact Zone / Commune / Neighborhood Match
        else if (targetLocationId && vendorLocationId && String(targetLocationId) === vendorLocationId) {
            score += 55;
            offer.fallbackLevel = 1;
            offer.fallbackLabel = vendor.location?.name || 'Quartier';
        }
        // Check 3.3: GPS Proximity Calculation
        else if (userLat && userLon && vendor.latitude && vendor.longitude) {
            const distance = calculateDistanceKm(userLat, userLon, Number(vendor.latitude), Number(vendor.longitude));
            offer.distanceKm = Math.round(distance * 10) / 10;
            if (distance <= 3) {
                score += 60;
                offer.fallbackLevel = 1;
                offer.fallbackLabel = `À ${offer.distanceKm} km`;
            } else if (distance <= 8) {
                score += 45;
                offer.fallbackLevel = 2;
                offer.fallbackLabel = `À ${offer.distanceKm} km`;
            } else if (distance <= 18) {
                score += 30;
                offer.fallbackLevel = 3;
                offer.fallbackLabel = `À ${offer.distanceKm} km`;
            } else if (distance <= 35) {
                score += 15;
                offer.fallbackLevel = 4;
                offer.fallbackLabel = `À ${offer.distanceKm} km`;
            } else {
                score -= 10;
                offer.fallbackLevel = 5;
            }
        }
        // Check 3.4: City / Commune & Neighborhood Semantic Match
        else if (userCityName) {
            // Check direct city name inclusion or sub-zone dictionary match
            let isCityMatch = (
                vendorLocationName.includes(userCityName) ||
                vendorMarketName.includes(userCityName) ||
                vendorAddress.includes(userCityName) ||
                vendorZone.includes(userCityName)
            );

            if (!isCityMatch) {
                // Check if userCityName maps to a known commune list
                const matchingCommuneKey = Object.keys(COMMUNE_SUB_ZONES).find(k => 
                    userCityName.includes(k) || k.includes(userCityName)
                );
                if (matchingCommuneKey) {
                    const subZones = COMMUNE_SUB_ZONES[matchingCommuneKey];
                    isCityMatch = subZones.some(sz => 
                        vendorZone.includes(sz) || 
                        vendorMarketName.includes(sz) || 
                        vendorLocationName.includes(sz) || 
                        vendorAddress.includes(sz)
                    );
                }
            }

            if (isCityMatch) {
                score += 50;
                offer.fallbackLevel = 2;
                offer.fallbackLabel = vendor.physicalMarket?.name || vendor.zone || vendor.location?.name || userCityName;
            }
        }
    }

    // 4. Delivery SLA (Shorter lead time = higher score)
    const deliveryValue = Number(offer.deliveryTimeValue ?? 2);
    const deliveryUnit = offer.deliveryTimeUnit || 'HOURS';
    if (deliveryUnit === 'HOURS' || deliveryUnit === 'h') {
        if (deliveryValue <= 2) score += 20;
        else if (deliveryValue <= 6) score += 15;
    } else if (deliveryUnit === 'DAYS' || deliveryUnit === 'j') {
        if (deliveryValue <= 1) score += 10;
    }

    // 5. Vendor Trust & Rating
    if (vendor?.verificationStatus && context.boostCertifiedVendors !== false) {
        score += 20;
    }
    if (vendor?.rating && Number(vendor.rating) >= 4.5) {
        score += 15;
    }

    return score;
}

/**
 * Robustly resolves the declination (variant) title suffix (e.g. "Rouge • L" or "Rouge" or "256 Go").
 * Prevents generic master product fallback when valid variant names or option values exist.
 */
export function resolveDeclinationName(
    productName: string,
    options?: any[],
    rawVariantName?: string,
    fallbackNames?: (string | undefined | null)[]
): string {
    // 1. Check structured option list
    const optNames = (options || [])
        .map((o: any) => o?.name || o?.code || o?.translations?.[0]?.name)
        .filter(Boolean)
        .join(' • ');
    if (optNames && optNames.trim().length > 0) {
        return optNames.trim();
    }

    const prodClean = (productName || '').trim().toLowerCase();
    const candidates = [rawVariantName, ...(fallbackNames || [])].filter(
        (n): n is string => Boolean(n && typeof n === 'string' && n.trim().length > 0)
    );

    for (const raw of candidates) {
        const str = raw.trim();
        const strLower = str.toLowerCase();

        // 2. Check if variant name contains product name prefix (e.g. "T-shirt Col V Rouge" -> "Rouge")
        if (prodClean && strLower.startsWith(prodClean) && str.length > prodClean.length) {
            const clean = str.substring(prodClean.length).replace(/^[\s\-–—:•/]+/, '').trim();
            if (clean && clean.toLowerCase() !== prodClean) {
                return clean;
            }
        }

        // 3. Check delimiter patterns (e.g. "Product - Rouge", "Product / XL")
        if (str.includes(' — ') || str.includes(' - ') || str.includes(' : ') || str.includes(' / ')) {
            const parts = str.split(/\s+[—\-:/]\s+/);
            if (parts.length > 1 && parts[parts.length - 1].trim()) {
                const tail = parts[parts.length - 1].trim();
                if (tail.toLowerCase() !== prodClean) {
                    return tail;
                }
            }
        }

        // 4. If str is completely different from product name (e.g. "Rouge", "128 Go", "XL")
        if (prodClean && strLower !== prodClean && !strLower.startsWith(prodClean)) {
            return str;
        }
    }

    return '';
}

/**
 * Normalizes raw product & variant data into individual sellable declination offers.
 */
function extractOfferCandidates(rawItems: any[]): {
    offers: any[];
    productMap: Map<string, any>;
} {
    const offers: any[] = [];
    const productMap = new Map<string, any>();

    for (const item of rawItems) {
        if (!item) continue;

        // Skip unapproved items (pending / rejected)
        const approval = item.customFields?.approvalStatus || item.approvalStatus;
        if (approval && (String(approval).toLowerCase() === 'pending' || String(approval).toLowerCase() === 'rejected' || String(approval).toLowerCase() === 'refused')) {
            continue;
        }

        const prodId = String(item.productId || item.product?.id || item.id || '');
        if (!prodId) continue;

        const rawAsset = item.productVariantAsset
            || item.featuredAsset
            || item.productAsset
            || item.product?.featuredAsset
            || item.product?.productAsset
            || item.assets?.[0]
            || item.product?.assets?.[0];

        if (!productMap.has(prodId)) {
            productMap.set(prodId, {
                id: prodId,
                name: item.productName || item.product?.name || item.name || 'Produit',
                slug: item.slug || item.product?.slug || prodId,
                featuredAsset: rawAsset,
                productAsset: rawAsset,
                collections: item.collections || item.product?.collections || [],
                facetValueIds: item.facetValueIds || item.product?.facetValueIds || [],
            });
        }

        // Collect variants
        const variantObj = item.winningOffer?.productVariant || item.productVariant;
        const itemVariants = item.variants && item.variants.length > 0
            ? item.variants
            : (variantObj ? [variantObj] : [{
                id: item.productVariantId || item.id,
                name: item.productVariantName || item.productVariant?.name || item.declinationName || item.variantName || item.name,
                priceWithTax: item.priceWithTax?.value ?? item.priceWithTax ?? item.price ?? 0,
                featuredAsset: item.productVariantAsset || item.featuredAsset || rawAsset,
                customFields: item.customFields,
                options: item.options || variantObj?.options,
                sku: item.sku || variantObj?.sku,
            }]);

        for (const vr of itemVariants) {
            if (!vr || vr.deletedAt) continue;
            
            // Skip unapproved variants or unapproved seller offers (pending / rejected)
            const vrApproval = vr.customFields?.approvalStatus || vr.approvalStatus;
            if (vrApproval && (String(vrApproval).toLowerCase() === 'pending' || String(vrApproval).toLowerCase() === 'rejected' || String(vrApproval).toLowerCase() === 'refused')) {
                continue;
            }

            const offerStatus = vr.customFields?.offerStatus || vr.offerStatus || item.offerStatus;
            if (offerStatus && (String(offerStatus).toLowerCase() === 'pending' || String(offerStatus).toLowerCase() === 'rejected' || String(offerStatus).toLowerCase() === 'refused')) {
                continue;
            }

            const vrId = String(vr.id);
            const winningVendor = item.winningOffer?.vendor;
            const directVendor = item.vendor;
            const customVendor = item.customFields?.vendor;

            const vendorInfo = {
                id: item.vendorId || winningVendor?.id || directVendor?.id || customVendor?.id,
                name: item.vendorName || winningVendor?.name || directVendor?.name || customVendor?.name,
                rating: winningVendor?.rating ?? directVendor?.rating ?? customVendor?.rating,
                ratingCount: winningVendor?.ratingCount ?? directVendor?.ratingCount ?? customVendor?.ratingCount,
                verificationStatus: winningVendor?.verificationStatus ?? directVendor?.verificationStatus ?? customVendor?.verificationStatus,
                zone: winningVendor?.zone || directVendor?.zone || customVendor?.zone || item.zone,
                location: item.locationName ? { id: item.locationId || winningVendor?.location?.id || directVendor?.location?.id, name: item.locationName } : (winningVendor?.location || directVendor?.location || customVendor?.location),
                physicalMarket: item.marketName ? { id: item.marketId || winningVendor?.physicalMarket?.id || directVendor?.physicalMarket?.id, name: item.marketName } : (winningVendor?.physicalMarket || directVendor?.physicalMarket || customVendor?.physicalMarket),
                latitude: winningVendor?.latitude ?? directVendor?.latitude ?? customVendor?.latitude ?? item.latitude,
                longitude: winningVendor?.longitude ?? directVendor?.longitude ?? customVendor?.longitude ?? item.longitude,
                logo: winningVendor?.logo || directVendor?.logo || customVendor?.logo,
                address: winningVendor?.address || directVendor?.address || customVendor?.address,
            };

            const vendorId = String(vendorInfo.id || 'main');
            const vrAsset = vr.featuredAsset?.preview ? vr.featuredAsset : (vr.assets?.[0]?.preview ? vr.assets[0] : rawAsset);
            const rawPrice = vr.price ?? item.price ?? vr.priceWithTax?.value ?? vr.priceWithTax?.min ?? item.priceWithTax?.value ?? item.priceWithTax?.min ?? (typeof vr.priceWithTax === 'number' ? vr.priceWithTax : (typeof item.priceWithTax === 'number' ? item.priceWithTax : 0));
            const vrPrice = Number(rawPrice) || 0;
            const onPromotion = Boolean(vr.customFields?.onPromotion ?? item.onPromotion ?? false);
            const promotionalPrice = vr.customFields?.promotionalPrice ?? item.promotionalPrice ?? null;
            const stock = Number(vr.stockOnHand ?? vr.customFields?.stock ?? item.stock ?? 5);

            const prodName = productMap.get(prodId).name;
            const declinationName = resolveDeclinationName(
                prodName,
                vr.options || item.options,
                vr.name,
                [item.productVariantName, item.declinationName, item.variantName]
            );

            const variantName = declinationName 
                ? `${prodName} — ${declinationName}` 
                : prodName;

            const offerCandidate = {
                id: `${prodId}-${vrId}-${vendorId}`,
                productId: prodId,
                productVariantId: vrId,
                productName: prodName,
                variantName,
                declinationName,
                productVariantName: vr.name || item.productVariantName || declinationName,
                slug: productMap.get(prodId).slug,
                productVariant: {
                    ...vr,
                    featuredAsset: vrAsset,
                },
                price: vrPrice,
                onPromotion,
                promotionalPrice,
                discountPercentage: onPromotion && promotionalPrice && vrPrice > promotionalPrice
                    ? Math.round(((vrPrice - promotionalPrice) / vrPrice) * 100)
                    : 0,
                stock,
                condition: vr.customFields?.condition || item.condition || 'NEW',
                deliveryTimeValue: vr.customFields?.deliveryTimeValue || item.deliveryTimeValue || 2,
                deliveryTimeUnit: vr.customFields?.deliveryTimeUnit || item.deliveryTimeUnit || 'HOURS',
                vendor: vendorInfo,
                featuredAsset: vrAsset,
                productAsset: rawAsset,
                productVariantAsset: vrAsset,
                sku: vr.sku,
                collections: productMap.get(prodId).collections,
                facetValueIds: productMap.get(prodId).facetValueIds,
                options: vr.options || [],
            };

            offers.push(offerCandidate);
        }
    }

    return { offers, productMap };
}

/**
 * Central Selection & Decision Engine:
 * 
 * Implements the operational decision pipeline:
 * 1. Extraction of individual sellable declination offers (e.g. T-shirt Red DALTON 1200, T-shirt Blue DALTON 2200).
 * 2. Multi-signal scoring (Geo proximity, pricing competitiveness, SLA, certified vendor boost).
 * 3. Smart anti-monopoly diversity policy with fair interleaving.
 * 4. Formatting of clean DisplayOfferItems ready for compact card rendering and direct PDP navigation.
 */
export function processAndResolveDisplayItems(
    rawItems: any[], 
    context: DisplayEngineContext = {}
): DisplayOfferItem[] {
    if (!rawItems || rawItems.length === 0) return [];

    const isVendorStore = context.isVendorStore || context.pageType === 'VENDOR_STORE' || Boolean(context.sellerId);

    // 1. Extract candidate offers
    const { offers, productMap } = extractOfferCandidates(rawItems);
    if (offers.length === 0) return [];

    // 2. Compute average/min price per central product for competitive pricing scoring
    const avgPricePerProduct = new Map<string, number>();
    for (const off of offers) {
        const effPrice = off.onPromotion && off.promotionalPrice ? off.promotionalPrice : off.price;
        if (typeof effPrice === 'number' && effPrice > 0) {
            const current = avgPricePerProduct.get(off.productId);
            if (current === undefined) {
                avgPricePerProduct.set(off.productId, effPrice);
            }
        }
    }

    // 3. Score each candidate
    for (const off of offers) {
        const avgPrice = avgPricePerProduct.get(off.productId) || off.price;
        off.score = scoreOffer(off, context, avgPrice);
    }

    const mustHaveOptions = context.requireVariantsWithOptions === true;

    // 4. Filter out ineligible candidates (e.g. score < -500 for strict out of stock, or missing option group when explicitly required)
    const eligibleOffers = offers.filter(o => {
        if (o.score <= -500) return false;
        if (mustHaveOptions) {
            const hasOptions = (o.options && o.options.length > 0) || (o.declinationName && o.declinationName.trim().length > 0);
            if (!hasOptions) return false;
        }
        return true;
    });

    // 5. Sort candidates by score descending (highest score first)
    eligibleOffers.sort((a, b) => (b.score || 0) - (a.score || 0));

    // 6. Apply Diversity & Anti-Monopoly Policy
    // On vendor store: no diversity limits (all declination offers of this vendor are shown).
    // On marketplace/collections/home: allow multiple distinct declinations per product (e.g. max 2 or 3)
    // while preventing a single vendor from monopolizing the entire grid (max 3 or 4 per vendor).
    const maxVariantsPerCentralProduct = isVendorStore 
        ? Infinity 
        : (context.maxVariantsPerCentralProduct ?? context.diversityPolicy?.maxVariantsPerCentralProduct ?? 2);

    const maxVariantsPerSeller = isVendorStore 
        ? Infinity 
        : (context.maxItemsPerVendor ?? context.diversityPolicy?.maxVariantsPerSeller ?? 4);

    const productCountMap = new Map<string, number>();
    const sellerCountMap = new Map<string, number>();
    const selectedOffers: any[] = [];
    const overflowOffers: any[] = [];

    // Pass 1: Strict diversity quota
    for (const off of eligibleOffers) {
        const pCount = productCountMap.get(off.productId) || 0;
        const vCount = sellerCountMap.get(off.vendor?.id || 'main') || 0;

        if (pCount < maxVariantsPerCentralProduct && vCount < maxVariantsPerSeller) {
            selectedOffers.push(off);
            productCountMap.set(off.productId, pCount + 1);
            sellerCountMap.set(off.vendor?.id || 'main', vCount + 1);
        } else {
            overflowOffers.push(off);
        }
    }

    // Pass 2: Backfill if section limit not reached and candidates exist
    const targetLimit = context.limit && context.limit > 0 ? context.limit : (isVendorStore ? Infinity : 50);
    if (selectedOffers.length < targetLimit && overflowOffers.length > 0) {
        for (const off of overflowOffers) {
            if (selectedOffers.length >= targetLimit) break;
            const pCount = productCountMap.get(off.productId) || 0;
            if (pCount <= maxVariantsPerCentralProduct + 1) {
                selectedOffers.push(off);
                productCountMap.set(off.productId, pCount + 1);
            }
        }
    }

    // 7. Format into clean DisplayOfferItems
    const resultItems: DisplayOfferItem[] = selectedOffers.map((off) => {
        const prod = productMap.get(off.productId) || {};

        const winningOffer: WinningOffer = {
            id: off.id,
            price: off.price,
            promotionalPrice: off.promotionalPrice,
            onPromotion: off.onPromotion,
            discountPercentage: off.discountPercentage,
            deliveryTimeValue: off.deliveryTimeValue,
            deliveryTimeUnit: off.deliveryTimeUnit,
            condition: off.condition,
            declinationName: off.declinationName,
            productVariantName: off.productVariantName,
            vendor: off.vendor,
            productVariant: off.productVariant,
            selectedVariant: off.productVariant,
            distanceKm: off.distanceKm,
            stock: off.stock,
            sku: off.sku,
            score: off.score,
        };

        return {
            id: off.id,
            productId: off.productId,
            productVariantId: off.productVariantId,
            name: off.variantName || prod.name || off.productName,
            productName: prod.name || off.productName,
            variantName: off.variantName,
            declinationName: off.declinationName,
            productVariantName: off.productVariantName,
            slug: prod.slug || off.slug,
            featuredAsset: off.featuredAsset || prod.featuredAsset,
            productAsset: prod.productAsset || off.featuredAsset,
            productVariantAsset: off.productVariantAsset || off.featuredAsset,
            collections: prod.collections,
            facetValueIds: prod.facetValueIds,

            winningOffer,
            price: off.price,
            promotionalPrice: off.promotionalPrice,
            onPromotion: off.onPromotion,
            discountPercentage: off.discountPercentage,
            vendorId: off.vendor?.id,
            vendorName: off.vendor?.name,
            marketName: off.vendor?.physicalMarket?.name,
            marketId: off.vendor?.physicalMarket?.id,
            locationName: off.vendor?.location?.name,
            locationId: off.vendor?.location?.id,
            distanceKm: off.distanceKm,
            stock: off.stock,
            condition: off.condition,
            deliveryTimeValue: off.deliveryTimeValue,
            deliveryTimeUnit: off.deliveryTimeUnit,
            score: off.score,
            fallbackLevel: off.fallbackLevel,
            fallbackLabel: off.fallbackLabel,
            isMasterResolved: true,
        };
    });

    return resultItems;
}

