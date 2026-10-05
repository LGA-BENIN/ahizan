'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
    Search, 
    SlidersHorizontal, 
    Grid3X3, 
    Grid2X2, 
    Layers, 
    Zap, 
    Clock, 
    CheckCircle2, 
    ShoppingBag, 
    X, 
    ArrowUpDown, 
    ChevronDown, 
    ChevronUp,
    Filter,
    Store,
    MapPin,
    ChevronLeft,
    ChevronRight as ChevronRightIcon
} from 'lucide-react';
import { MasterProductCard } from '@/components/commerce/master-product-card';
import { Button } from '@/components/ui/button';
import { getAssetUrl, getShopApiUrl } from '@/lib/vendure/api-utils';
import { fetchWithClientCache } from '@/lib/vendure/client-cache';
import { MasterDisplayItem, processAndResolveDisplayItems, DisplayEngineContext } from '@/lib/vendure/display-engine';
import { useLocation } from '@/contexts/location-context';

interface MarketFacetedCatalogProps {
    config?: {
        title?: string;
        subtitle?: string;
        marketId?: string;
        marketName?: string;
        marketSlug?: string;
        showPriceFilter?: boolean;
        showFacetsFilter?: boolean;
        showQuickToggles?: boolean;
        showCategoriesBar?: boolean;
        showVendorsFilter?: boolean;
        defaultViewMode?: 'grid-4' | 'grid-3';
        itemsPerPage?: number;
        [key: string]: any;
    };
}

export function MarketFacetedCatalog({ config = {} }: MarketFacetedCatalogProps) {
    const { selectedLocation } = useLocation();
    const catalogTopRef = useRef<HTMLDivElement>(null);
    const [marketInfo, setMarketInfo] = useState<any>(null);
    const [products, setProducts] = useState<MasterDisplayItem[]>(config.initialProducts || []);
    const [vendors, setVendors] = useState<any[]>([]);
    const [collectionsTree, setCollectionsTree] = useState<any[]>([]);
    const [collections, setCollections] = useState<any[]>(config.initialCollections || []);
    const [facetValues, setFacetValues] = useState<any[]>(config.initialFacetValues || []);
    const [loading, setLoading] = useState(!config.initialProducts || config.initialProducts.length === 0);

    // Filter States
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCollection, setSelectedCollection] = useState<string>('all');
    const [selectedVendorId, setSelectedVendorId] = useState<string>('all');
    const [selectedFacetValueIds, setSelectedFacetValueIds] = useState<string[]>([]);
    const [onlyFlashDeals, setOnlyFlashDeals] = useState<boolean>(false);
    const [onlyInStock, setOnlyInStock] = useState<boolean>(false);
    const [onlyFastDelivery, setOnlyFastDelivery] = useState<boolean>(false);
    
    // Price Filters
    const [minPriceInput, setMinPriceInput] = useState<string>('');
    const [maxPriceInput, setMaxPriceInput] = useState<string>('');
    const [priceRangeSlider, setPriceRangeSlider] = useState<number>(500000);
    
    // UI & Pagination State
    const [sortBy, setSortBy] = useState<'recommended' | 'price_asc' | 'price_desc' | 'rating_desc' | 'delivery_fast'>('recommended');
    const [viewMode, setViewMode] = useState<'grid-4' | 'grid-3'>(config.defaultViewMode || 'grid-4');
    const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState(false);
    const [collapsedFacetGroups, setCollapsedFacetGroups] = useState<Record<string, boolean>>({});
    const [currentPage, setCurrentPage] = useState<number>(1);
    const ITEMS_PER_PAGE = config.itemsPerPage || 16;

    // 1. Detect active market context
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const ahizanMarket = (window as any).ahizan?.market;
            if (ahizanMarket) {
                setMarketInfo(ahizanMarket);
            }
        }
    }, []);

    const effectiveMarket = marketInfo || {};
    const effectiveMarketId = config.marketId || effectiveMarket.id;
    const effectiveMarketName = config.marketName || effectiveMarket.name || "ce marché";

    // 2. Fetch Catalog, Facets, Vendors, Root Collections Tree and Seller Offers
    useEffect(() => {
        let isMounted = true;
        if (!config.initialProducts || config.initialProducts.length === 0) {
            setLoading(true);
        }

        const shopApiUrl = getShopApiUrl();

        const catalogQuery = `
            query GetMarketUnifiedCatalog {
                cmsCollectionsTree {
                    id
                    name
                    slug
                    featuredAsset { id preview }
                    children { id name slug featuredAsset { id preview } }
                }
                vendors(options: { filter: { status: { eq: "APPROVED" } }, take: 100 }) {
                    items {
                        id
                        name
                        rating
                        ratingCount
                        verificationStatus
                        latitude
                        longitude
                        logo { preview }
                        physicalMarket { id name }
                        location { id name }
                    }
                }
                search(input: { take: 300, groupByProduct: false }) {
                    totalItems
                    items {
                        productId
                        productVariantId
                        productName
                        productVariantName
                        slug
                        facetValueIds
                        collectionIds
                        productAsset { id preview }
                        productVariantAsset { id preview }
                        priceWithTax {
                            __typename
                            ... on SinglePrice { value }
                            ... on PriceRange { min max }
                        }
                        currencyCode
                        inStock
                    }
                    facetValues {
                        count
                        facetValue {
                            id
                            name
                            code
                            facet { id name code }
                        }
                    }
                }
                collections(options: { take: 100 }) {
                    items { id name slug featuredAsset { id preview } }
                }
            }
        `;

        fetchWithClientCache(shopApiUrl, catalogQuery, {})
            .then(async (data: any) => {
                if (!isMounted) return;

                const tree: any[] = data?.cmsCollectionsTree || [];
                const vendorsList: any[] = data?.vendors?.items || [];
                const searchItems: any[] = data?.search?.items || [];
                const rawFacets: any[] = data?.search?.facetValues || [];
                const rawCols: any[] = data?.collections?.items || [];

                setCollectionsTree(tree);
                setVendors(vendorsList);
                setFacetValues(rawFacets);
                setCollections(rawCols);

                // Build lookup map for all collections
                const colMap = new Map<string, any>();
                rawCols.forEach((c: any) => colMap.set(String(c.id), c));

                const rawCandidateProducts: any[] = [];
                const searchVariantIds = Array.from(new Set(searchItems.map((i: any) => i.productVariantId).filter(Boolean)));

                // Fetch Multivendor Seller Offers for Central Search Variants
                if (searchVariantIds.length > 0) {
                    try {
                        const offersQuery = `
                            query GetSellerOffersForMarketCatalog($vIds: [ID!]!) {
                                sellerOffersForVariants(variantIds: $vIds) {
                                    id
                                    price
                                    stock
                                    onPromotion
                                    promotionalPrice
                                    condition
                                    deliveryTimeValue
                                    deliveryTimeUnit
                                    status
                                    vendor {
                                        id
                                        name
                                        phoneNumber
                                        latitude
                                        longitude
                                        verificationStatus
                                        rating
                                        ratingCount
                                        logo { preview }
                                        location { id name }
                                        physicalMarket { id name }
                                    }
                                    productVariant {
                                        id
                                        name
                                        sku
                                        featuredAsset { id preview }
                                        options { id name code group { id name } }
                                        product {
                                            id
                                            name
                                            slug
                                            featuredAsset { id preview }
                                        }
                                    }
                                }
                            }
                        `;
                        const offersData = await fetchWithClientCache(shopApiUrl, offersQuery, { vIds: searchVariantIds });
                        const offers: any[] = offersData?.sellerOffersForVariants || [];

                        for (const item of searchItems) {
                            const vId = String(item.productVariantId);
                            // Strict candidate offer filtering by physical market
                            const matchingOffers = offers.filter(o => {
                                if (String(o.productVariant?.id) !== vId || !o.vendor?.id) return false;
                                if (effectiveMarketId) {
                                    const vMarketId = String(o.vendor.physicalMarket?.id || o.vendor.marketId || '');
                                    const vMarketName = (o.vendor.physicalMarket?.name || '').toLowerCase();
                                    const isLocal = vMarketId === String(effectiveMarketId) || (effectiveMarketName && vMarketName.includes(effectiveMarketName.toLowerCase()));
                                    return isLocal;
                                }
                                return true;
                            });
                            
                            // Map collection IDs to full collection objects
                            const itemCollections = (item.collectionIds || [])
                                .map((cid: string) => colMap.get(String(cid)))
                                .filter(Boolean);

                            for (const off of matchingOffers) {
                                rawCandidateProducts.push({
                                    id: `${item.productId}-${vId}-${off.vendor?.id}`,
                                    productId: item.productId || off.productVariant?.product?.id,
                                    productName: item.productName || off.productVariant?.product?.name,
                                    productVariantId: vId,
                                    productVariantName: off.productVariant?.name || item.productVariantName,
                                    productVariant: off.productVariant,
                                    slug: item.slug || off.productVariant?.product?.slug,
                                    featuredAsset: off.productVariant?.featuredAsset || item.productVariantAsset || item.productAsset,
                                    sku: off.productVariant?.sku,
                                    vendorId: off.vendor?.id,
                                    vendorName: off.vendor?.name,
                                    marketName: off.vendor?.physicalMarket?.name,
                                    marketId: off.vendor?.physicalMarket?.id,
                                    locationName: off.vendor?.location?.name,
                                    locationId: off.vendor?.location?.id,
                                    latitude: off.vendor?.latitude,
                                    longitude: off.vendor?.longitude,
                                    price: off.price,
                                    promotionalPrice: off.promotionalPrice,
                                    onPromotion: off.onPromotion,
                                    stock: off.stock,
                                    condition: off.condition,
                                    deliveryTimeValue: off.deliveryTimeValue,
                                    deliveryTimeUnit: off.deliveryTimeUnit,
                                    vendor: off.vendor,
                                    collections: itemCollections,
                                    options: off.productVariant?.options || [],
                                    facetValueIds: item.facetValueIds || [],
                                    customFields: {
                                        vendor: off.vendor,
                                        onPromotion: off.onPromotion,
                                        promotionalPrice: off.promotionalPrice,
                                    }
                                });
                            }
                        }
                    } catch (e) {
                        console.warn('[MarketFacetedCatalog] Candidate offers error:', e);
                    }
                }

                // Score via Ahizan Display Engine with Market & Client location context
                const userLat = selectedLocation?.latitude != null 
                    ? Number(selectedLocation.latitude) 
                    : (effectiveMarket.centerLatitude ? Number(effectiveMarket.centerLatitude) : undefined);
                
                const userLon = selectedLocation?.longitude != null 
                    ? Number(selectedLocation.longitude) 
                    : (effectiveMarket.centerLongitude ? Number(effectiveMarket.centerLongitude) : undefined);

                const displayContext: DisplayEngineContext = {
                    pageType: 'MARKET_PAGE',
                    experienceStrategy: 'LOCAL_DISCOVERY',
                    marketId: effectiveMarketId ? String(effectiveMarketId) : undefined,
                    userLocation: selectedLocation,
                    userLat,
                    userLon,
                    communeName: selectedLocation?.name || effectiveMarket.geoZone?.name || 'Cotonou',
                    boostCertifiedVendors: true,
                    maxVariantsPerCentralProduct: 3,
                };

                const resolved = processAndResolveDisplayItems(rawCandidateProducts, displayContext);

                if (isMounted) {
                    setProducts(resolved);
                    setLoading(false);
                }
            })
            .catch((err) => {
                console.error('[MarketFacetedCatalog] Load error:', err);
                if (isMounted) setLoading(false);
            });

        return () => {
            isMounted = false;
        };
    }, [effectiveMarketId, selectedLocation?.latitude, selectedLocation?.longitude, effectiveMarket.centerLatitude, effectiveMarket.centerLongitude]);

    // Extract ONLY vendors belonging to THIS physical market
    const availableVendors = useMemo(() => {
        const vMap = new Map<string, { id: string; name: string; slug?: string; logo?: string; count: number; isMarketLocal: boolean }>();
        
        // Pre-populate ONLY approved vendors belonging strictly to this market
        vendors.forEach((v: any) => {
            const isLocal = !effectiveMarketId || (
                String(v.physicalMarket?.id) === String(effectiveMarketId) ||
                (v.physicalMarket?.name && effectiveMarketName && v.physicalMarket.name.toLowerCase().includes(effectiveMarketName.toLowerCase()))
            );
            if (isLocal) {
                vMap.set(String(v.id), {
                    id: String(v.id),
                    name: v.name,
                    slug: v.id,
                    logo: v.logo?.preview ? getAssetUrl(v.logo.preview) : undefined,
                    count: 0,
                    isMarketLocal: true
                });
            }
        });

        // Count products for these market vendors
        products.forEach((p: any) => {
            const vId = p.vendorId || p.winningOffer?.vendor?.id;
            if (!vId) return;
            const key = String(vId);
            const existing = vMap.get(key);
            if (existing) {
                existing.count += 1;
            }
        });

        return Array.from(vMap.values())
            .sort((a, b) => b.count - a.count);
    }, [products, vendors, effectiveMarketId, effectiveMarketName]);

    // Group Facets dynamically from Vendure + Product Options
    const groupedFacets = useMemo(() => {
        const groups: Record<string, { id: string; name: string; values: Array<{ id: string; name: string; count: number }> }> = {};

        // 1. Standard Vendure Facet Values
        (facetValues || []).forEach((fv: any) => {
            const facet = fv.facetValue?.facet;
            const facetId = facet?.id || 'other';
            const facetName = facet?.name || 'Caractéristiques';
            const valId = fv.facetValue?.id;
            const valName = fv.facetValue?.name;

            if (!valId || !valName) return;

            if (!groups[facetId]) {
                groups[facetId] = {
                    id: facetId,
                    name: facetName,
                    values: []
                };
            }

            const existing = groups[facetId].values.find(v => v.id === valId);
            if (!existing) {
                groups[facetId].values.push({
                    id: valId,
                    name: valName,
                    count: fv.count || 0
                });
            }
        });

        // 2. Extract variant option groups (Taille, Poids, Volume, etc.)
        products.forEach((p: any) => {
            const opts = p.options || p.winningOffer?.productVariant?.options || [];
            opts.forEach((opt: any) => {
                const grpName = opt.group?.name || 'Conditionnement';
                const grpId = `opt_${opt.group?.id || grpName}`;
                if (!groups[grpId]) {
                    groups[grpId] = {
                        id: grpId,
                        name: grpName,
                        values: []
                    };
                }
                const optValId = String(opt.id || opt.code || opt.name);
                const existing = groups[grpId].values.find(v => v.id === optValId || v.name === opt.name);
                if (existing) {
                    existing.count += 1;
                } else {
                    groups[grpId].values.push({
                        id: optValId,
                        name: opt.name,
                        count: 1
                    });
                }
            });
        });

        return Object.values(groups);
    }, [facetValues, products]);

    // Extract ONLY Root / Parent Collections (Grandes Collections) and prioritize those with products
    const availableCategories = useMemo(() => {
        const rootCandidates = (collectionsTree.length > 0 ? collectionsTree : collections)
            .filter(c => c.id && c.name && !c.name.startsWith('_') && !c.name.toLowerCase().includes('root'));

        const list = rootCandidates.map(cat => {
            // Find all matching collection IDs (root collection itself + any child subcollections)
            const childIds = (cat.children || []).map((ch: any) => String(ch.id));
            const allMatchingIds = new Set([String(cat.id), ...childIds]);

            // Count how many products belong to this root category or its subcategories
            const count = products.filter(p => {
                const pCols = p.collections || [];
                return pCols.some((col: any) => allMatchingIds.has(String(col.id || col)));
            }).length;

            return {
                id: String(cat.id),
                name: cat.name,
                slug: cat.slug || String(cat.id),
                featuredAsset: cat.featuredAsset,
                count,
                childIds
            };
        });

        // Sort: Collections with products (count > 0) come FIRST (descending count), followed by remaining
        return list.sort((a, b) => {
            if (a.count > 0 && b.count === 0) return -1;
            if (a.count === 0 && b.count > 0) return 1;
            if (b.count !== a.count) return b.count - a.count;
            return a.name.localeCompare(b.name);
        });
    }, [products, collectionsTree, collections]);

    // Check if a facet group is collapsed (collapsed/rabattu by default)
    const isGroupCollapsed = (groupId: string) => {
        return collapsedFacetGroups[groupId] !== undefined ? collapsedFacetGroups[groupId] : true;
    };

    // Toggle collapsible facet group
    const toggleFacetGroup = (groupId: string) => {
        setCollapsedFacetGroups(prev => ({
            ...prev,
            [groupId]: !isGroupCollapsed(groupId)
        }));
    };

    // Toggle facet value
    const toggleFacetValue = (facetValueId: string) => {
        setCurrentPage(1);
        setSelectedFacetValueIds(prev => 
            prev.includes(facetValueId)
                ? prev.filter(id => id !== facetValueId)
                : [...prev, facetValueId]
        );
    };

    // Price bounds
    const effectiveMinPrice = minPriceInput ? Number(minPriceInput) : 0;
    const hasMaxPriceFilter = Boolean(maxPriceInput) || priceRangeSlider < 500000;
    const effectiveMaxPrice = maxPriceInput ? Number(maxPriceInput) : (priceRangeSlider < 500000 ? priceRangeSlider : Infinity);

    // Filter and sort products
    const filteredProducts = useMemo(() => {
        return products.filter(item => {
            // Search query filter
            if (searchTerm.trim()) {
                const term = searchTerm.toLowerCase();
                const matchName = (item.productName || item.name || '').toLowerCase().includes(term);
                const matchVendor = (item.vendorName || item.winningOffer?.vendor?.name || '').toLowerCase().includes(term);
                const matchDeclination = (item.declinationName || item.winningOffer?.declinationName || '').toLowerCase().includes(term);
                if (!matchName && !matchVendor && !matchDeclination) return false;
            }

            // Collection filter (matches parent collection or any of its subcollections)
            if (selectedCollection !== 'all') {
                const matchedRoot = availableCategories.find(c => c.id === selectedCollection);
                const matchingIds = new Set([String(selectedCollection), ...(matchedRoot?.childIds || [])]);
                const itemCols = item.collections || [];
                const inCol = itemCols.some((c: any) => matchingIds.has(String(c.id || c)) || c.slug === selectedCollection);
                if (!inCol) return false;
            }

            // Vendor / Boutique filter
            if (selectedVendorId !== 'all') {
                const vId = String(item.vendorId || item.winningOffer?.vendor?.id || '');
                if (vId !== String(selectedVendorId)) return false;
            }

            // Facet filters (handles Vendure facets + variant option values + declination names)
            if (selectedFacetValueIds.length > 0) {
                const itemFacets = (item.facetValueIds || []).map((id: any) => String(id));
                const itemOpts: any[] = ((item as any).options || item.winningOffer?.productVariant?.options || []);
                const optIds = itemOpts.map((o: any) => String(o.id || o.code || o.name));
                const optNames = itemOpts.map((o: any) => String(o.name || ''));
                
                const hasFacet = selectedFacetValueIds.some(fid => 
                    itemFacets.includes(fid) || 
                    optIds.includes(fid) || 
                    optNames.includes(fid) ||
                    (item.declinationName && item.declinationName.includes(fid))
                );
                if (!hasFacet) return false;
            }

            // Flash deals only
            if (onlyFlashDeals) {
                const isPromo = item.onPromotion || item.winningOffer?.onPromotion;
                const hasDiscount = (item.discountPercentage || item.winningOffer?.discountPercentage || 0) > 0;
                if (!isPromo && !hasDiscount) return false;
            }

            // Stock filter
            if (onlyInStock) {
                const stock = item.stock ?? item.winningOffer?.stock ?? 1;
                if (stock <= 0) return false;
            }

            // Fast delivery (< 2h)
            if (onlyFastDelivery) {
                const unit = (item.deliveryTimeUnit || item.winningOffer?.deliveryTimeUnit || '').toLowerCase();
                const val = Number(item.deliveryTimeValue || item.winningOffer?.deliveryTimeValue || 0);
                const isFast = unit.includes('heure') || unit.includes('hour') || unit.includes('min') || (val <= 2 && !unit.includes('jour'));
                if (!isFast) return false;
            }

            // Price range filter
            const price = item.promotionalPrice || item.price || item.winningOffer?.promotionalPrice || item.winningOffer?.price || 0;
            if (effectiveMinPrice > 0 && price < effectiveMinPrice) return false;
            if (effectiveMaxPrice !== Infinity && price > effectiveMaxPrice) return false;

            return true;
        }).sort((a, b) => {
            const priceA = a.promotionalPrice || a.price || a.winningOffer?.price || 0;
            const priceB = b.promotionalPrice || b.price || b.winningOffer?.price || 0;
            const ratingA = a.winningOffer?.vendor?.rating || 0;
            const ratingB = b.winningOffer?.vendor?.rating || 0;
            const scoreA = a.score || a.winningOffer?.score || 0;
            const scoreB = b.score || b.winningOffer?.score || 0;

            if (sortBy === 'price_asc') return priceA - priceB;
            if (sortBy === 'price_desc') return priceB - priceA;
            if (sortBy === 'rating_desc') return ratingB - ratingA;
            if (sortBy === 'delivery_fast') {
                const distA = a.distanceKm ?? a.winningOffer?.distanceKm ?? 999;
                const distB = b.distanceKm ?? b.winningOffer?.distanceKm ?? 999;
                return distA - distB;
            }
            return scoreB - scoreA;
        });
    }, [
        products, 
        searchTerm, 
        selectedCollection, 
        selectedVendorId,
        selectedFacetValueIds, 
        onlyFlashDeals, 
        onlyInStock, 
        onlyFastDelivery, 
        effectiveMinPrice, 
        effectiveMaxPrice, 
        sortBy,
        availableCategories
    ]);

    // Reset pagination when filters change
    const handleCategorySelect = (colId: string) => {
        setSelectedCollection(colId);
        setCurrentPage(1);
    };

    const handleVendorSelect = (vendorId: string) => {
        setSelectedVendorId(vendorId);
        setCurrentPage(1);
    };

    const handleSearchChange = (term: string) => {
        setSearchTerm(term);
        setCurrentPage(1);
    };

    // Paginated subset of products
    const totalPages = Math.max(1, Math.ceil(filteredProducts.length / ITEMS_PER_PAGE));
    const paginatedProducts = useMemo(() => {
        const start = (currentPage - 1) * ITEMS_PER_PAGE;
        return filteredProducts.slice(start, start + ITEMS_PER_PAGE);
    }, [filteredProducts, currentPage, ITEMS_PER_PAGE]);

    const handlePageChange = (newPage: number) => {
        if (newPage >= 1 && newPage <= totalPages) {
            setCurrentPage(newPage);
            if (typeof window !== 'undefined' && catalogTopRef.current) {
                catalogTopRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        }
    };

    const activeFiltersCount = useMemo(() => {
        let count = 0;
        if (selectedCollection !== 'all') count++;
        if (selectedVendorId !== 'all') count++;
        if (selectedFacetValueIds.length > 0) count += selectedFacetValueIds.length;
        if (onlyFlashDeals) count++;
        if (onlyFastDelivery) count++;
        if (onlyInStock) count++;
        if (minPriceInput || maxPriceInput) count++;
        if (searchTerm.trim()) count++;
        return count;
    }, [selectedCollection, selectedVendorId, selectedFacetValueIds, onlyFlashDeals, onlyFastDelivery, onlyInStock, minPriceInput, maxPriceInput, searchTerm]);

    const resetFilters = () => {
        setSearchTerm('');
        setSelectedCollection('all');
        setSelectedVendorId('all');
        setSelectedFacetValueIds([]);
        setOnlyFlashDeals(false);
        setOnlyFastDelivery(false);
        setOnlyInStock(false);
        setMinPriceInput('');
        setMaxPriceInput('');
        setPriceRangeSlider(500000);
        setSortBy('recommended');
        setCurrentPage(1);
    };

    return (
        <div ref={catalogTopRef} className="w-full space-y-6 font-sans scroll-mt-24">
            
            {/* 1. GRANDES COLLECTIONS / RAYONS PRINCIPAUX DU MARCHÉ */}
            {config.showCategoriesBar !== false && availableCategories.length > 0 && (
                <div className="border-b border-slate-200 bg-white sticky top-0 z-30 shadow-sm backdrop-blur-md bg-white/90 py-3.5 -mx-4 px-4 sm:mx-0 sm:px-0 sm:rounded-2xl">
                    <div className="flex items-center justify-between gap-4 overflow-x-auto no-scrollbar scroll-smooth">
                        <div className="flex items-center space-x-2 shrink-0">
                            <button
                                onClick={() => handleCategorySelect('all')}
                                className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all shrink-0 flex items-center gap-2 cursor-pointer ${
                                    selectedCollection === 'all'
                                        ? 'bg-slate-900 text-white shadow-md'
                                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                                }`}
                            >
                                <Layers className="w-4 h-4" />
                                Tous les Rayons ({products.length})
                            </button>

                            {availableCategories.map((cat) => (
                                <button
                                    key={cat.id}
                                    onClick={() => handleCategorySelect(cat.id)}
                                    className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all shrink-0 flex items-center gap-1.5 cursor-pointer ${
                                        selectedCollection === cat.id
                                            ? 'bg-amber-500 text-slate-950 font-bold shadow-md'
                                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                                    }`}
                                >
                                    <span>{cat.name}</span>
                                    {cat.count > 0 && (
                                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                                            selectedCollection === cat.id ? 'bg-black/20 text-slate-950' : 'bg-amber-100 text-amber-800'
                                        }`}>
                                            {cat.count}
                                        </span>
                                    )}
                                </button>
                            ))}
                        </div>

                        {/* Mobile Filters Toggle Button */}
                        <div className="lg:hidden shrink-0">
                            <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={() => setIsMobileFiltersOpen(true)}
                                className="border-slate-300 font-semibold text-xs flex items-center gap-1.5 cursor-pointer"
                            >
                                <SlidersHorizontal className="w-3.5 h-3.5 text-amber-600" />
                                Filtres
                                {activeFiltersCount > 0 && (
                                    <span className="w-4 h-4 rounded-full bg-amber-500 text-slate-950 font-black text-[10px] flex items-center justify-center">
                                        {activeFiltersCount}
                                    </span>
                                )}
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* 2. CATALOGUE & GRILLE AVEC SIDEBAR */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                
                {/* SIDEBAR DE FILTRES & FACETTES (DESKTOP) */}
                <aside className="hidden lg:block lg:col-span-3 space-y-6">
                    <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-6 sticky top-24">
                        
                        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                            <h3 className="font-black text-slate-900 flex items-center gap-2 text-sm">
                                <SlidersHorizontal className="w-4 h-4 text-amber-500" />
                                Filtres & Facettes
                            </h3>
                            {activeFiltersCount > 0 && (
                                <button 
                                    onClick={resetFilters}
                                    className="text-xs text-amber-600 hover:underline font-bold cursor-pointer"
                                >
                                    Effacer tout ({activeFiltersCount})
                                </button>
                            )}
                        </div>

                        {/* Quick Checkbox Filters */}
                        {config.showQuickToggles !== false && (
                            <div className="space-y-3">
                                <label className="flex items-center space-x-2.5 cursor-pointer text-xs font-semibold text-slate-700 hover:text-slate-900 transition-colors">
                                    <input 
                                        type="checkbox"
                                        checked={onlyFlashDeals}
                                        onChange={(e) => { setOnlyFlashDeals(e.target.checked); setCurrentPage(1); }}
                                        className="w-4 h-4 text-amber-600 rounded border-slate-300 focus:ring-amber-500"
                                    />
                                    <span className="flex items-center gap-1.5">
                                        <Zap className="w-3.5 h-3.5 text-red-500" />
                                        En Promotion / Vente Flash
                                    </span>
                                </label>

                                <label className="flex items-center space-x-2.5 cursor-pointer text-xs font-semibold text-slate-700 hover:text-slate-900 transition-colors">
                                    <input 
                                        type="checkbox"
                                        checked={onlyFastDelivery}
                                        onChange={(e) => { setOnlyFastDelivery(e.target.checked); setCurrentPage(1); }}
                                        className="w-4 h-4 text-amber-600 rounded border-slate-300 focus:ring-amber-500"
                                    />
                                    <span className="flex items-center gap-1.5">
                                        <Clock className="w-3.5 h-3.5 text-emerald-500" />
                                        Livraison Express (&lt; 2h)
                                    </span>
                                </label>

                                <label className="flex items-center space-x-2.5 cursor-pointer text-xs font-semibold text-slate-700 hover:text-slate-900 transition-colors">
                                    <input 
                                        type="checkbox"
                                        checked={onlyInStock}
                                        onChange={(e) => { setOnlyInStock(e.target.checked); setCurrentPage(1); }}
                                        className="w-4 h-4 text-amber-600 rounded border-slate-300 focus:ring-amber-500"
                                    />
                                    <span className="flex items-center gap-1.5">
                                        <CheckCircle2 className="w-3.5 h-3.5 text-blue-500" />
                                        En Stock Immédiat
                                    </span>
                                </label>
                            </div>
                        )}

                        {/* FILTRE BOUTIQUES DU MARCHÉ */}
                        {availableVendors.length > 0 && (
                            <div className="pt-4 border-t border-slate-100 space-y-2.5">
                                <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center justify-between">
                                    <span className="flex items-center gap-1.5">
                                        <Store className="w-3.5 h-3.5 text-primary" />
                                        Boutiques du Marché
                                    </span>
                                    <span className="text-[10px] text-slate-400 font-bold">
                                        {availableVendors.length}
                                    </span>
                                </h4>

                                <div className="max-h-48 overflow-y-auto space-y-1 pr-1 text-xs no-scrollbar">
                                    <button
                                        onClick={() => handleVendorSelect('all')}
                                        className={`w-full flex items-center justify-between p-2 rounded-xl text-left font-semibold transition-all cursor-pointer ${
                                            selectedVendorId === 'all' 
                                                ? 'bg-primary/10 text-primary font-bold' 
                                                : 'text-slate-700 hover:bg-slate-50'
                                        }`}
                                    >
                                        <span>Toutes les boutiques</span>
                                        <span className="text-[10px] text-slate-400 font-bold bg-slate-100 px-1.5 py-0.5 rounded-full">
                                            {products.length}
                                        </span>
                                    </button>

                                    {availableVendors.map((vendor) => (
                                        <button
                                            key={vendor.id}
                                            onClick={() => handleVendorSelect(selectedVendorId === vendor.id ? 'all' : vendor.id)}
                                            className={`w-full flex items-center justify-between p-2 rounded-xl text-left font-semibold transition-all cursor-pointer ${
                                                selectedVendorId === vendor.id 
                                                    ? 'bg-primary text-white font-bold shadow-xs' 
                                                    : 'text-slate-700 hover:bg-slate-50'
                                            }`}
                                        >
                                            <div className="flex items-center gap-2 truncate">
                                                <Store className="w-3.5 h-3.5 shrink-0 opacity-70" />
                                                <span className="truncate">{vendor.name}</span>
                                            </div>
                                            {vendor.count > 0 && (
                                                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                                                    selectedVendorId === vendor.id ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
                                                }`}>
                                                    {vendor.count}
                                                </span>
                                            )}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* FILTRE DE PRIX COMPLET (MIN/MAX + SLIDER + BOUTONS) */}
                        {config.showPriceFilter !== false && (
                            <div className="space-y-3 pt-4 border-t border-slate-100">
                                <h4 className="text-xs font-black uppercase tracking-wider text-slate-500">
                                    Fourchette de Prix (FCFA)
                                </h4>

                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <label className="text-[10px] text-slate-400 font-semibold block mb-1">Min</label>
                                        <input 
                                            type="number"
                                            placeholder="0"
                                            value={minPriceInput}
                                            onChange={(e) => { setMinPriceInput(e.target.value); setCurrentPage(1); }}
                                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] text-slate-400 font-semibold block mb-1">Max</label>
                                        <input 
                                            type="number"
                                            placeholder="500000"
                                            value={maxPriceInput}
                                            onChange={(e) => { setMaxPriceInput(e.target.value); setCurrentPage(1); }}
                                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-1 pt-1">
                                    <input 
                                        type="range"
                                        min={1000}
                                        max={500000}
                                        step={5000}
                                        value={priceRangeSlider}
                                        onChange={(e) => {
                                            setPriceRangeSlider(Number(e.target.value));
                                            setMaxPriceInput(e.target.value);
                                            setCurrentPage(1);
                                        }}
                                        className="w-full accent-amber-500"
                                    />
                                    <div className="flex items-center justify-between text-[11px] font-bold text-slate-600">
                                        <span>0 F</span>
                                        <span className="text-amber-600">{priceRangeSlider.toLocaleString()} FCFA</span>
                                    </div>
                                </div>

                                <div className="flex flex-wrap gap-1.5 pt-1">
                                    <button
                                        onClick={() => { setMinPriceInput('0'); setMaxPriceInput('5000'); setCurrentPage(1); }}
                                        className="text-[10px] font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 px-2 py-1 rounded-lg transition-colors cursor-pointer"
                                    >
                                        &lt; 5 000 F
                                    </button>
                                    <button
                                        onClick={() => { setMinPriceInput('5000'); setMaxPriceInput('25000'); setCurrentPage(1); }}
                                        className="text-[10px] font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 px-2 py-1 rounded-lg transition-colors cursor-pointer"
                                    >
                                        5k - 25k F
                                    </button>
                                    <button
                                        onClick={() => { setMinPriceInput('25000'); setMaxPriceInput('100000'); setCurrentPage(1); }}
                                        className="text-[10px] font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 px-2 py-1 rounded-lg transition-colors cursor-pointer"
                                    >
                                        25k - 100k F
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* SYSTÈME DE FACETTES DYNAMIQUES VENDURE (RABATTUES PAR DÉFAUT) */}
                        {config.showFacetsFilter !== false && groupedFacets.map((group) => {
                            const isCollapsed = isGroupCollapsed(group.id);
                            return (
                                <div key={group.id} className="pt-4 border-t border-slate-100 space-y-2.5">
                                    <div 
                                        onClick={() => toggleFacetGroup(group.id)}
                                        className="flex items-center justify-between cursor-pointer group select-none py-1 hover:text-amber-600 transition-colors"
                                    >
                                        <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 group-hover:text-amber-600 transition-colors">
                                            {group.name}
                                        </h4>
                                        <div className="p-1 rounded-lg bg-slate-50 group-hover:bg-amber-50 transition-colors">
                                            {isCollapsed ? (
                                                <ChevronDown className="w-3.5 h-3.5 text-slate-400 group-hover:text-amber-600" />
                                            ) : (
                                                <ChevronUp className="w-3.5 h-3.5 text-slate-400 group-hover:text-amber-600" />
                                            )}
                                        </div>
                                    </div>

                                    {!isCollapsed && (
                                        <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1 text-xs animate-in fade-in-50 duration-200">
                                            {group.values.map((val) => {
                                                const isSelected = selectedFacetValueIds.includes(val.id);
                                                return (
                                                    <label 
                                                        key={val.id}
                                                        className="flex items-center justify-between p-1.5 rounded-lg hover:bg-slate-50 cursor-pointer text-slate-700 transition-colors"
                                                    >
                                                        <div className="flex items-center space-x-2">
                                                            <input 
                                                                type="checkbox"
                                                                checked={isSelected}
                                                                onChange={() => toggleFacetValue(val.id)}
                                                                className="w-3.5 h-3.5 text-amber-600 rounded border-slate-300 focus:ring-amber-500"
                                                            />
                                                            <span className={`text-xs ${isSelected ? 'font-bold text-amber-900' : 'font-medium'}`}>
                                                                {val.name}
                                                            </span>
                                                        </div>
                                                        {val.count > 0 && (
                                                            <span className="text-[10px] text-slate-400 font-bold bg-slate-100 px-1.5 py-0.5 rounded-full">
                                                                {val.count}
                                                            </span>
                                                        )}
                                                    </label>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            );
                        })}

                    </div>
                </aside>

                {/* PRODUCT GRID CONTAINER */}
                <div className="lg:col-span-9 space-y-6">
                    
                    {/* Toolbar: Search input, Count, Sorting, View Toggle */}
                    <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                        
                        {/* Integrated Fast Search Input */}
                        <div className="relative flex-1 max-w-md">
                            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input 
                                type="text"
                                value={searchTerm}
                                onChange={(e) => handleSearchChange(e.target.value)}
                                placeholder={`Rechercher un produit au ${effectiveMarketName}...`}
                                className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:bg-white transition-all"
                            />
                            {searchTerm && (
                                <button
                                    onClick={() => handleSearchChange('')}
                                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                                >
                                    <X className="w-3.5 h-3.5" />
                                </button>
                            )}
                        </div>

                        <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                            <span className="font-extrabold text-slate-900 text-xs md:text-sm whitespace-nowrap">
                                {loading ? 'Chargement...' : `${filteredProducts.length} Article${filteredProducts.length > 1 ? 's' : ''}`}
                            </span>

                            {/* Sort Dropdown */}
                            <div className="flex items-center space-x-2">
                                <ArrowUpDown className="w-3.5 h-3.5 text-slate-400 hidden sm:inline" />
                                <select
                                    value={sortBy}
                                    onChange={(e) => { setSortBy(e.target.value as any); setCurrentPage(1); }}
                                    className="bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs text-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer"
                                >
                                    <option value="recommended">Recommandés par Ahizan</option>
                                    <option value="price_asc">Prix : Moins cher d'abord</option>
                                    <option value="price_desc">Prix : Plus cher d'abord</option>
                                    <option value="rating_desc">Meilleures notes commerçants</option>
                                    <option value="delivery_fast">Livraison la plus rapide</option>
                                </select>
                            </div>

                            {/* View Mode Toggle */}
                            <div className="hidden sm:flex items-center border border-slate-200 rounded-xl p-0.5 bg-slate-50">
                                <button
                                    onClick={() => setViewMode('grid-4')}
                                    className={`p-1.5 rounded-lg transition-colors cursor-pointer ${viewMode === 'grid-4' ? 'bg-white shadow text-slate-900' : 'text-slate-400 hover:text-slate-600'}`}
                                    title="Grille 4 colonnes"
                                >
                                    <Grid3X3 className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={() => setViewMode('grid-3')}
                                    className={`p-1.5 rounded-lg transition-colors cursor-pointer ${viewMode === 'grid-3' ? 'bg-white shadow text-slate-900' : 'text-slate-400 hover:text-slate-600'}`}
                                    title="Grille 3 colonnes"
                                >
                                    <Grid2X2 className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Products Rendering with Professional Pagination */}
                    {loading ? (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                            {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                                <div key={n} className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm animate-pulse space-y-3">
                                    <div className="aspect-square bg-slate-100 rounded-xl" />
                                    <div className="h-4 bg-slate-100 rounded w-3/4" />
                                    <div className="h-4 bg-slate-100 rounded w-1/2" />
                                </div>
                            ))}
                        </div>
                    ) : paginatedProducts.length > 0 ? (
                        <div className="space-y-8">
                            <div className={`grid gap-4 ${
                                viewMode === 'grid-4' 
                                    ? 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4' 
                                    : 'grid-cols-2 sm:grid-cols-2 md:grid-cols-3'
                            }`}>
                                {paginatedProducts.map((item) => (
                                    <div key={item.id} className="h-full">
                                        <MasterProductCard item={item} />
                                    </div>
                                ))}
                            </div>

                            {/* STRUCTURED PROFESSIONAL PAGINATION CONTROLS */}
                            {totalPages > 1 && (
                                <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
                                    <div className="text-xs text-slate-500 font-semibold text-center sm:text-left">
                                        Affichage de <span className="font-bold text-slate-900">{(currentPage - 1) * ITEMS_PER_PAGE + 1}</span> à <span className="font-bold text-slate-900">{Math.min(currentPage * ITEMS_PER_PAGE, filteredProducts.length)}</span> sur <span className="font-bold text-slate-900">{filteredProducts.length}</span> articles
                                    </div>

                                    <div className="flex items-center space-x-1.5">
                                        {/* Prev Button */}
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => handlePageChange(currentPage - 1)}
                                            disabled={currentPage <= 1}
                                            className="px-3 py-1.5 h-9 rounded-xl border-slate-200 text-slate-700 font-bold text-xs disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 cursor-pointer flex items-center gap-1"
                                        >
                                            <ChevronLeft className="w-4 h-4" />
                                            <span>Précédent</span>
                                        </Button>

                                        {/* Page Numbers */}
                                        <div className="flex items-center space-x-1 px-1">
                                            {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => {
                                                // Display logic for page numbers: show first, last, current, and neighbours
                                                const isNear = Math.abs(pageNum - currentPage) <= 1;
                                                const isFirst = pageNum === 1;
                                                const isLast = pageNum === totalPages;

                                                if (!isNear && !isFirst && !isLast) {
                                                    if (pageNum === 2 && currentPage > 3) {
                                                        return <span key={pageNum} className="px-1 text-slate-400 text-xs">...</span>;
                                                    }
                                                    if (pageNum === totalPages - 1 && currentPage < totalPages - 2) {
                                                        return <span key={pageNum} className="px-1 text-slate-400 text-xs">...</span>;
                                                    }
                                                    return null;
                                                }

                                                return (
                                                    <button
                                                        key={pageNum}
                                                        onClick={() => handlePageChange(pageNum)}
                                                        className={`w-9 h-9 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center ${
                                                            currentPage === pageNum
                                                                ? 'bg-slate-900 text-white shadow-md'
                                                                : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200/60'
                                                        }`}
                                                    >
                                                        {pageNum}
                                                    </button>
                                                );
                                            })}
                                        </div>

                                        {/* Next Button */}
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => handlePageChange(currentPage + 1)}
                                            disabled={currentPage >= totalPages}
                                            className="px-3 py-1.5 h-9 rounded-xl border-slate-200 text-slate-700 font-bold text-xs disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 cursor-pointer flex items-center gap-1"
                                        >
                                            <span>Suivant</span>
                                            <ChevronRightIcon className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center space-y-4 shadow-sm">
                            <div className="w-16 h-16 rounded-full bg-amber-50 text-amber-500 mx-auto flex items-center justify-center">
                                <ShoppingBag className="w-8 h-8" />
                            </div>
                            <h3 className="text-lg font-black text-slate-900">
                                Aucun produit ne correspond à vos critères
                            </h3>
                            <p className="text-sm text-slate-500 max-w-md mx-auto">
                                Modifiez vos critères de recherche ou réinitialisez vos filtres pour afficher l'ensemble des articles du {effectiveMarketName}.
                            </p>
                            <Button 
                                onClick={resetFilters}
                                className="bg-slate-900 text-white font-bold rounded-xl px-6 py-2.5 cursor-pointer"
                            >
                                Réinitialiser tous les filtres
                            </Button>
                        </div>
                    )}
                </div>
            </div>

        </div>
    );
}

export default MarketFacetedCatalog;
