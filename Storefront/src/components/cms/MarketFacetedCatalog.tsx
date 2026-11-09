'use client';

import React, { useState, useEffect, useMemo, useRef, useTransition } from 'react';
import Link from 'next/link';
import { 
    Search, 
    Filter, 
    LayoutGrid, 
    List, 
    Heart, 
    ShoppingCart, 
    Store, 
    MapPin, 
    Star, 
    ChevronDown, 
    ChevronUp, 
    ChevronRight, 
    RotateCcw, 
    Smartphone, 
    Shirt, 
    Home, 
    Sparkles, 
    UtensilsCrossed, 
    Trophy, 
    MoreHorizontal, 
    CheckCircle2, 
    Zap, 
    Clock, 
    X, 
    ChevronLeft,
    Loader2,
    ArrowRight
} from 'lucide-react';
import { toast } from 'sonner';
import { getAssetUrl, getShopApiUrl } from '@/lib/vendure/api-utils';
import { fetchWithClientCache } from '@/lib/vendure/client-cache';
import { MasterDisplayItem, processAndResolveDisplayItems, DisplayEngineContext } from '@/lib/vendure/display-engine';
import { useLocation } from '@/contexts/location-context';
import { encodeId } from '@/lib/hash-utils';
import { addToCart } from '@/app/(storefront)/product/[slug]/actions';
import { toggleProductLikeAction } from '@/app/(storefront)/likes-actions';

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
        defaultViewMode?: 'grid' | 'list';
        itemsPerPage?: number;
        [key: string]: any;
    };
}

// Map category name to icon matching Image 1
function getCategoryIcon(name: string) {
    const n = (name || '').toLowerCase();
    if (n.includes('électro') || n.includes('téléphone') || n.includes('phone') || n.includes('audio') || n.includes('tech') || n.includes('informatique')) {
        return Smartphone;
    }
    if (n.includes('mode') || n.includes('vêtement') || n.includes('habillement') || n.includes('tissu') || n.includes('chaussure')) {
        return Shirt;
    }
    if (n.includes('maison') || n.includes('déco') || n.includes('meuble') || n.includes('bureau') || n.includes('cuisine')) {
        return Home;
    }
    if (n.includes('beauté') || n.includes('soin') || n.includes('hygiène') || n.includes('parfum') || n.includes('cosmétique')) {
        return Sparkles;
    }
    if (n.includes('aliment') || n.includes('boisson') || n.includes('jus') || n.includes('épice') || n.includes('vivrier') || n.includes('nourriture')) {
        return UtensilsCrossed;
    }
    if (n.includes('sport') || n.includes('loisir') || n.includes('fitness')) {
        return Trophy;
    }
    return MoreHorizontal;
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
    const [onlyFlashDeals, setOnlyFlashDeals] = useState<boolean>(false);
    const [onlyInStock, setOnlyInStock] = useState<boolean>(false);
    const [onlyFastDelivery, setOnlyFastDelivery] = useState<boolean>(false);
    
    // Price Filters
    const [minPriceInput, setMinPriceInput] = useState<string>('');
    const [maxPriceInput, setMaxPriceInput] = useState<string>('');
    const [priceRangeSlider, setPriceRangeSlider] = useState<number>(500000);
    
    // UI & Pagination State
    const [sortBy, setSortBy] = useState<'recommended' | 'price_asc' | 'price_desc' | 'rating_desc'>('recommended');
    const [viewMode, setViewMode] = useState<'grid' | 'list'>(config.defaultViewMode || 'grid');
    const [currentPage, setCurrentPage] = useState<number>(1);
    const ITEMS_PER_PAGE = config.itemsPerPage || 20;

    // Accordions collapse state
    const [accordionOpen, setAccordionOpen] = useState({
        categories: true,
        price: true,
        condition: true,
        boutique: false,
    });

    // Wishlist & Add to cart states
    const [likedProducts, setLikedProducts] = useState<Record<string, boolean>>({});
    const [addingCartId, setAddingCartId] = useState<string | null>(null);
    const [isPending, startTransition] = useTransition();

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
    const effectiveMarketName = config.marketName || effectiveMarket.name || "Marché";

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
                                    featuredAsset { id preview }
                                    vendor {
                                        id
                                        name
                                        rating
                                        ratingCount
                                        latitude
                                        longitude
                                        physicalMarket { id name }
                                        location { id name }
                                    }
                                    productVariant {
                                        id
                                        name
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
                            // Candidate offer filtering by physical market
                            let matchingOffers = offers.filter(o => {
                                if (String(o.productVariant?.id) !== vId || !o.vendor?.id) return false;
                                if (effectiveMarketId) {
                                    const vMarketId = String(o.vendor.physicalMarket?.id || '');
                                    const vMarketName = (o.vendor.physicalMarket?.name || '').toLowerCase();
                                    const isLocal = vMarketId === String(effectiveMarketId) || (effectiveMarketName && vMarketName.includes(effectiveMarketName.toLowerCase()));
                                    return isLocal;
                                }
                                return true;
                            });

                            // Intelligent Fallback: If no vendor is specifically tagged for this market, fallback to available verified offers
                            if (matchingOffers.length === 0 && offers.length > 0) {
                                matchingOffers = offers.filter(o => String(o.productVariant?.id) === vId && o.vendor?.id);
                            }
                            
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
                                    featuredAsset: off.featuredAsset || off.productVariant?.product?.featuredAsset || item.productAsset || item.productVariantAsset,
                                    vendorId: off.vendor?.id,
                                    vendorName: off.vendor?.name,
                                    marketName: off.vendor?.physicalMarket?.name,
                                    locationName: off.vendor?.location?.name,
                                    rating: off.vendor?.rating || 4.7,
                                    ratingCount: off.vendor?.ratingCount || 120,
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
    }, [effectiveMarketId, effectiveMarketName, selectedLocation?.latitude, selectedLocation?.longitude, effectiveMarket.centerLatitude, effectiveMarket.centerLongitude]);

    // Extract available categories / collections with count
    const availableCategories = useMemo(() => {
        const rootCandidates = (collectionsTree.length > 0 ? collectionsTree : collections)
            .filter(c => c.id && c.name && !c.name.startsWith('_') && !c.name.toLowerCase().includes('root'));

        const list = rootCandidates.map(cat => {
            const childIds = (cat.children || []).map((ch: any) => String(ch.id));
            const allMatchingIds = new Set([String(cat.id), ...childIds]);

            const count = products.filter(p => {
                const pCols = p.collections || [];
                return pCols.some((col: any) => allMatchingIds.has(String(col.id || col)));
            }).length;

            return {
                id: String(cat.id),
                name: cat.name,
                slug: cat.slug || String(cat.id),
                count,
                childIds
            };
        });

        // Show categories with products first, then others
        return list.sort((a, b) => {
            if (a.count > 0 && b.count === 0) return -1;
            if (a.count === 0 && b.count > 0) return 1;
            if (b.count !== a.count) return b.count - a.count;
            return a.name.localeCompare(b.name);
        });
    }, [products, collectionsTree, collections]);

    // Extract boutiques in this market (or popular vendors)
    const marketVendors = useMemo(() => {
        const localList = vendors.filter((v: any) => {
            if (!effectiveMarketId) return true;
            const vMId = String(v.physicalMarket?.id || '');
            const vMName = (v.physicalMarket?.name || '').toLowerCase();
            return vMId === String(effectiveMarketId) || (effectiveMarketName && vMName.includes(effectiveMarketName.toLowerCase()));
        });

        // If fewer than 5 local vendors, supplement with top approved vendors
        if (localList.length < 5) {
            const others = vendors.filter((v: any) => !localList.some(lv => lv.id === v.id));
            return [...localList, ...others].slice(0, 5);
        }
        return localList.slice(0, 5);
    }, [vendors, effectiveMarketId, effectiveMarketName]);

    // Filter & Sort Products
    const filteredProducts = useMemo(() => {
        const result = products.filter(item => {
            // Search query filter
            if (searchTerm.trim()) {
                const term = searchTerm.toLowerCase();
                const matchName = (item.productName || item.name || '').toLowerCase().includes(term);
                const matchVendor = (item.vendorName || item.winningOffer?.vendor?.name || '').toLowerCase().includes(term);
                const matchDeclination = (item.declinationName || item.winningOffer?.declinationName || '').toLowerCase().includes(term);
                if (!matchName && !matchVendor && !matchDeclination) return false;
            }

            // Collection filter
            if (selectedCollection !== 'all') {
                const matchedRoot = availableCategories.find(c => c.id === selectedCollection);
                const matchingIds = new Set([String(selectedCollection), ...(matchedRoot?.childIds || [])]);
                const itemCols = item.collections || [];
                const inCol = itemCols.some((c: any) => matchingIds.has(String(c.id || c)) || c.slug === selectedCollection);
                if (!inCol) return false;
            }

            // Vendor filter
            if (selectedVendorId !== 'all') {
                const vId = String(item.vendorId || item.winningOffer?.vendor?.id || '');
                if (vId !== String(selectedVendorId)) return false;
            }

            // Quick toggles
            if (onlyFlashDeals && !item.onPromotion && !item.winningOffer?.onPromotion) return false;
            if (onlyInStock && (item.stock === 0 || item.winningOffer?.stock === 0)) return false;
            if (onlyFastDelivery) {
                const dt = Number(item.deliveryTimeValue || item.winningOffer?.deliveryTimeValue || 24);
                if (dt > 2) return false;
            }

            // Price bounds
            const rawPrice = item.price ?? item.winningOffer?.price ?? 0;
            const price = rawPrice > 1000 ? Math.round(rawPrice / 100) : rawPrice; // handle subunits if present
            if (minPriceInput && price < Number(minPriceInput)) return false;
            if (maxPriceInput && price > Number(maxPriceInput)) return false;
            if (!maxPriceInput && priceRangeSlider < 500000 && price > priceRangeSlider) return false;

            return true;
        });

        // Sorting
        result.sort((a, b) => {
            const priceA = a.price ?? a.winningOffer?.price ?? 0;
            const priceB = b.price ?? b.winningOffer?.price ?? 0;
            if (sortBy === 'price_asc') return priceA - priceB;
            if (sortBy === 'price_desc') return priceB - priceA;
            if (sortBy === 'rating_desc') {
                const rA = Number((a as any).rating || (a as any).vendorRating || (a as any).vendor?.rating || 0);
                const rB = Number((b as any).rating || (b as any).vendorRating || (b as any).vendor?.rating || 0);
                return rB - rA;
            }
            // 'recommended'
            return (b.score || 0) - (a.score || 0);
        });

        return result;
    }, [products, searchTerm, selectedCollection, selectedVendorId, onlyFlashDeals, onlyInStock, onlyFastDelivery, minPriceInput, maxPriceInput, priceRangeSlider, sortBy, availableCategories]);

    // Pagination
    const totalPages = Math.ceil(filteredProducts.length / ITEMS_PER_PAGE);
    const paginatedProducts = useMemo(() => {
        const start = (currentPage - 1) * ITEMS_PER_PAGE;
        return filteredProducts.slice(start, start + ITEMS_PER_PAGE);
    }, [filteredProducts, currentPage, ITEMS_PER_PAGE]);

    // Handle Quick Add to Cart with live notification
    const handleAddToCart = async (item: any) => {
        const variantId = item.productVariantId || item.variants?.[0]?.id;
        const vendorId = item.vendorId || item.winningOffer?.vendor?.id;
        const offerId = item.winningOffer?.id;
        if (!variantId) {
            toast.error("Variante introuvable");
            return;
        }

        setAddingCartId(item.id);
        try {
            const res = await addToCart(
                String(variantId), 
                1, 
                vendorId ? String(vendorId) : undefined,
                offerId ? String(offerId) : undefined
            );

            if (res?.success) {
                toast.success(`${item.productName || 'Article'} ajouté au panier !`, {
                    description: `Vendu par ${item.vendorName || 'Boutique certifiée'}`,
                });
                window.dispatchEvent(new Event('ahizan_cart_updated'));
            } else {
                toast.error(res?.error || "Erreur lors de l'ajout au panier");
            }
        } catch (err: any) {
            toast.error(err?.message || "Erreur lors de l'ajout au panier");
        } finally {
            setAddingCartId(null);
        }
    };

    // Handle Wishlist Toggle
    const handleToggleLike = async (productId: string) => {
        try {
            setLikedProducts(prev => ({ ...prev, [productId]: !prev[productId] }));
            const res = await toggleProductLikeAction(productId);
            if (res?.success) {
                toast.success(res.liked ? "Ajouté aux favoris !" : "Retiré des favoris");
            }
        } catch {
            // Keep state
        }
    };

    // Reset all filters
    const resetFilters = () => {
        setSearchTerm('');
        setSelectedCollection('all');
        setSelectedVendorId('all');
        setOnlyFlashDeals(false);
        setOnlyInStock(false);
        setOnlyFastDelivery(false);
        setMinPriceInput('');
        setMaxPriceInput('');
        setPriceRangeSlider(500000);
        setSortBy('recommended');
        setCurrentPage(1);
    };

    return (
        <div ref={catalogTopRef} className="w-full space-y-8 font-sans scroll-mt-20">
            {/* MAIN LAYOUT: SIDEBAR (LEFT) + CATALOG (RIGHT) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
                
                {/* 1. LEFT SIDEBAR: FILTRER PAR */}
                <aside className="lg:col-span-3">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-xs space-y-5 sticky top-24">
                        
                        {/* Header: Filtrer par */}
                        <div className="flex items-center justify-between pb-3.5 border-b border-slate-100 dark:border-slate-800">
                            <h2 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                                <Filter className="w-4 h-4 text-slate-700 dark:text-slate-300" />
                                Filtrer par
                            </h2>
                            {(searchTerm || selectedCollection !== 'all' || selectedVendorId !== 'all' || minPriceInput || maxPriceInput || onlyFlashDeals) && (
                                <button 
                                    onClick={resetFilters}
                                    className="text-[11px] text-primary hover:underline font-bold"
                                >
                                    Effacer tout
                                </button>
                            )}
                        </div>

                        {/* ACCORDION 1: Catégories */}
                        <div className="space-y-2">
                            <button
                                onClick={() => setAccordionOpen(p => ({ ...p, categories: !p.categories }))}
                                className="w-full flex items-center justify-between text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider py-1"
                            >
                                <span>Catégories</span>
                                {accordionOpen.categories ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                            </button>

                            {accordionOpen.categories && (
                                <div className="space-y-1 pt-1.5 max-h-64 overflow-y-auto pr-1">
                                    <button
                                        onClick={() => { setSelectedCollection('all'); setCurrentPage(1); }}
                                        className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                                            selectedCollection === 'all'
                                                ? 'bg-primary/10 text-primary font-bold'
                                                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                                        }`}
                                    >
                                        <div className="flex items-center gap-2 truncate">
                                            <MoreHorizontal className="w-4 h-4 text-slate-400 shrink-0" />
                                            <span className="truncate">Toutes les catégories</span>
                                        </div>
                                        <span className="text-[10px] text-slate-400 font-bold bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded-full">
                                            {products.length}
                                        </span>
                                    </button>

                                    {availableCategories.map(cat => {
                                        const CatIcon = getCategoryIcon(cat.name);
                                        const isSelected = selectedCollection === cat.id;

                                        return (
                                            <button
                                                key={cat.id}
                                                onClick={() => { setSelectedCollection(isSelected ? 'all' : cat.id); setCurrentPage(1); }}
                                                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                                                    isSelected
                                                        ? 'bg-primary text-white font-bold shadow-xs'
                                                        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                                                }`}
                                            >
                                                <div className="flex items-center gap-2 truncate">
                                                    <CatIcon className={`w-4 h-4 shrink-0 ${isSelected ? 'text-white' : 'text-slate-400'}`} />
                                                    <span className="truncate">{cat.name}</span>
                                                </div>
                                                {cat.count > 0 && (
                                                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                                                        isSelected ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                                                    }`}>
                                                        {cat.count}
                                                    </span>
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        {/* ACCORDION 2: Prix (FCFA) */}
                        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
                            <button
                                onClick={() => setAccordionOpen(p => ({ ...p, price: !p.price }))}
                                className="w-full flex items-center justify-between text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider py-1"
                            >
                                <span>Prix (FCFA)</span>
                                {accordionOpen.price ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                            </button>

                            {accordionOpen.price && (
                                <div className="space-y-3 pt-1">
                                    <div className="grid grid-cols-2 gap-2">
                                        <div>
                                            <label className="text-[10px] text-slate-400 font-semibold block mb-0.5">Min</label>
                                            <input 
                                                type="number"
                                                placeholder="0"
                                                value={minPriceInput}
                                                onChange={(e) => { setMinPriceInput(e.target.value); setCurrentPage(1); }}
                                                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-primary/20 focus:border-primary"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[10px] text-slate-400 font-semibold block mb-0.5">Max</label>
                                            <input 
                                                type="number"
                                                placeholder="500000"
                                                value={maxPriceInput}
                                                onChange={(e) => { setMaxPriceInput(e.target.value); setCurrentPage(1); }}
                                                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-primary/20 focus:border-primary"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-1">
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
                                            className="w-full accent-primary"
                                        />
                                        <div className="flex items-center justify-between text-[11px] font-bold text-slate-500">
                                            <span>0 F</span>
                                            <span className="text-primary font-black">{priceRangeSlider.toLocaleString()} FCFA</span>
                                        </div>
                                    </div>

                                    <div className="flex flex-wrap gap-1.5">
                                        <button
                                            onClick={() => { setMinPriceInput('0'); setMaxPriceInput('5000'); setCurrentPage(1); }}
                                            className="text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 px-2 py-1 rounded-lg transition-colors"
                                        >
                                            &lt; 5 000 F
                                        </button>
                                        <button
                                            onClick={() => { setMinPriceInput('5000'); setMaxPriceInput('25000'); setCurrentPage(1); }}
                                            className="text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 px-2 py-1 rounded-lg transition-colors"
                                        >
                                            5k - 25k F
                                        </button>
                                        <button
                                            onClick={() => { setMinPriceInput('25000'); setMaxPriceInput('100000'); setCurrentPage(1); }}
                                            className="text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 px-2 py-1 rounded-lg transition-colors"
                                        >
                                            25k - 100k F
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* ACCORDION 3: État du produit */}
                        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
                            <button
                                onClick={() => setAccordionOpen(p => ({ ...p, condition: !p.condition }))}
                                className="w-full flex items-center justify-between text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider py-1"
                            >
                                <span>État du produit</span>
                                {accordionOpen.condition ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                            </button>

                            {accordionOpen.condition && (
                                <div className="space-y-2 pt-1 text-xs font-semibold text-slate-700 dark:text-slate-300">
                                    <label className="flex items-center gap-2 cursor-pointer hover:text-primary transition-colors">
                                        <input 
                                            type="checkbox"
                                            checked={onlyFlashDeals}
                                            onChange={(e) => { setOnlyFlashDeals(e.target.checked); setCurrentPage(1); }}
                                            className="rounded border-slate-300 text-primary focus:ring-primary"
                                        />
                                        <span className="flex items-center gap-1.5">
                                            <Zap className="w-3.5 h-3.5 text-primary" />
                                            En Promotion / Vente Flash
                                        </span>
                                    </label>

                                    <label className="flex items-center gap-2 cursor-pointer hover:text-primary transition-colors">
                                        <input 
                                            type="checkbox"
                                            checked={onlyInStock}
                                            onChange={(e) => { setOnlyInStock(e.target.checked); setCurrentPage(1); }}
                                            className="rounded border-slate-300 text-primary focus:ring-primary"
                                        />
                                        <span className="flex items-center gap-1.5">
                                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                                            En Stock Immédiat
                                        </span>
                                    </label>

                                    <label className="flex items-center gap-2 cursor-pointer hover:text-primary transition-colors">
                                        <input 
                                            type="checkbox"
                                            checked={onlyFastDelivery}
                                            onChange={(e) => { setOnlyFastDelivery(e.target.checked); setCurrentPage(1); }}
                                            className="rounded border-slate-300 text-primary focus:ring-primary"
                                        />
                                        <span className="flex items-center gap-1.5">
                                            <Clock className="w-3.5 h-3.5 text-amber-500" />
                                            Livraison Express (&lt; 2h)
                                        </span>
                                    </label>
                                </div>
                            )}
                        </div>

                        {/* ACCORDION 4: Boutique */}
                        {marketVendors.length > 0 && (
                            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
                                <button
                                    onClick={() => setAccordionOpen(p => ({ ...p, boutique: !p.boutique }))}
                                    className="w-full flex items-center justify-between text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider py-1"
                                >
                                    <span>Boutique</span>
                                    {accordionOpen.boutique ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                                </button>

                                {accordionOpen.boutique && (
                                    <div className="space-y-1 pt-1 max-h-48 overflow-y-auto pr-1">
                                        <button
                                            onClick={() => { setSelectedVendorId('all'); setCurrentPage(1); }}
                                            className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                                                selectedVendorId === 'all'
                                                    ? 'bg-primary/10 text-primary font-bold'
                                                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                                            }`}
                                        >
                                            <span>Toutes les boutiques</span>
                                            <span className="text-[10px] text-slate-400 font-bold bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded-full">
                                                {products.length}
                                            </span>
                                        </button>

                                        {marketVendors.map(v => (
                                            <button
                                                key={v.id}
                                                onClick={() => { setSelectedVendorId(selectedVendorId === v.id ? 'all' : v.id); setCurrentPage(1); }}
                                                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                                                    selectedVendorId === v.id
                                                        ? 'bg-primary text-white font-bold shadow-xs'
                                                        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                                                }`}
                                            >
                                                <div className="flex items-center gap-2 truncate">
                                                    <Store className="w-3.5 h-3.5 shrink-0 opacity-70" />
                                                    <span className="truncate">{v.name}</span>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Reset Button (Bottom of Sidebar matching Image 1) */}
                        <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
                            <button
                                onClick={resetFilters}
                                className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold transition-colors cursor-pointer"
                            >
                                <RotateCcw className="w-3.5 h-3.5" />
                                <span>Réinitialiser</span>
                            </button>
                        </div>
                    </div>
                </aside>

                {/* 2. MAIN CATALOG (RIGHT): TOOLBAR + 5-COLUMN PRODUCT GRID */}
                <div className="lg:col-span-9 space-y-6">
                    
                    {/* Top Toolbar matching Image 1 */}
                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-3 sm:p-4 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
                        
                        {/* Search Input: Rechercher un produit, une boutique... */}
                        <div className="relative flex-1">
                            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input 
                                type="text"
                                value={searchTerm}
                                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                                placeholder="Rechercher un produit, une boutique..."
                                className="w-full pl-10 pr-8 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm font-semibold text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                            />
                            {searchTerm && (
                                <button
                                    onClick={() => setSearchTerm('')}
                                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                                >
                                    <X className="w-3.5 h-3.5" />
                                </button>
                            )}
                        </div>

                        {/* Right: Sort + View Toggles */}
                        <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                            {/* Sort Dropdown */}
                            <div className="flex items-center gap-1.5 text-xs text-slate-500 font-semibold">
                                <span className="hidden sm:inline">Trier par :</span>
                                <select
                                    value={sortBy}
                                    onChange={(e) => { setSortBy(e.target.value as any); setCurrentPage(1); }}
                                    className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-slate-900 dark:text-slate-100 font-bold focus:outline-hidden focus:ring-2 focus:ring-primary/20 focus:border-primary cursor-pointer"
                                >
                                    <option value="recommended">Plus populaires</option>
                                    <option value="price_asc">Prix : Moins cher</option>
                                    <option value="price_desc">Prix : Plus cher</option>
                                    <option value="rating_desc">Mieux notés ⭐</option>
                                </select>
                            </div>

                            {/* View Mode Toggle: 4-square grid active in Ahizan red */}
                            <div className="flex items-center gap-1">
                                <button
                                    onClick={() => setViewMode('grid')}
                                    className={`p-1.5 sm:p-2 rounded-xl transition-all cursor-pointer ${
                                        viewMode === 'grid' 
                                            ? 'bg-primary text-white shadow-xs' 
                                            : 'border border-slate-200 dark:border-slate-700 text-slate-400 hover:text-slate-600'
                                    }`}
                                    title="Vue Grille"
                                >
                                    <LayoutGrid className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={() => setViewMode('list')}
                                    className={`p-1.5 sm:p-2 rounded-xl transition-all cursor-pointer ${
                                        viewMode === 'list' 
                                            ? 'bg-primary text-white shadow-xs' 
                                            : 'border border-slate-200 dark:border-slate-700 text-slate-400 hover:text-slate-600'
                                    }`}
                                    title="Vue Liste"
                                >
                                    <List className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* PRODUCT GRID (5 COLUMNS ON DESKTOP EXACTLY AS IN IMAGE 1) */}
                    {loading ? (
                        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-3.5">
                            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                                <div key={n} className="bg-white dark:bg-slate-900 rounded-2xl p-3 border border-slate-200/80 dark:border-slate-800 shadow-xs animate-pulse space-y-2.5">
                                    <div className="aspect-square bg-slate-100 dark:bg-slate-800 rounded-xl" />
                                    <div className="h-3.5 bg-slate-100 dark:bg-slate-800 rounded w-3/4" />
                                    <div className="h-3.5 bg-slate-100 dark:bg-slate-800 rounded w-1/2" />
                                    <div className="h-7 bg-slate-100 dark:bg-slate-800 rounded-xl w-full" />
                                </div>
                            ))}
                        </div>
                    ) : paginatedProducts.length > 0 ? (
                        <div className="space-y-6">
                            <div className={
                                viewMode === 'grid'
                                    ? "grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-3.5"
                                    : "space-y-3"
                            }>
                                {paginatedProducts.map((item) => {
                                    const rawPrice = item.price ?? item.winningOffer?.price ?? 0;
                                    const activePrice = rawPrice > 1000 ? Math.round(rawPrice / 100) : rawPrice;
                                    const isPromo = Boolean(item.onPromotion || item.winningOffer?.onPromotion);
                                    const promoPrice = item.promotionalPrice ?? item.winningOffer?.promotionalPrice;
                                    const displayActivePrice = isPromo && promoPrice ? (promoPrice > 1000 ? Math.round(promoPrice / 100) : promoPrice) : activePrice;
                                    const displayOldPrice = isPromo && promoPrice ? activePrice : Math.round(activePrice * 1.2);
                                    const discountPercent = item.discountPercentage || item.winningOffer?.discountPercentage || 15;
                                    const isLiked = Boolean(likedProducts[item.productId || item.id]);
                                    const isAdding = addingCartId === item.id;

                                    const imageUrl = item.featuredAsset?.preview ? getAssetUrl(item.featuredAsset.preview) : (
                                        item.productAsset?.preview ? getAssetUrl(item.productAsset.preview) : null
                                    );

                                    return (
                                        <div
                                            key={item.id}
                                            className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-2.5 sm:p-3 shadow-xs hover:shadow-lg hover:border-primary/40 transition-all duration-300 flex flex-col justify-between relative group"
                                        >
                                            {/* Top Float Actions: Wishlist Heart & Promo Badge */}
                                            <div className="flex items-center justify-between w-full mb-1">
                                                <button
                                                    onClick={() => handleToggleLike(item.productId || item.id)}
                                                    className="w-7 h-7 rounded-full bg-slate-50 dark:bg-slate-800 hover:bg-red-50 text-slate-400 hover:text-red-500 flex items-center justify-center transition-colors z-10 cursor-pointer"
                                                    title="Ajouter aux favoris"
                                                >
                                                    <Heart className={`w-3.5 h-3.5 ${isLiked ? 'fill-red-500 text-red-500' : ''}`} />
                                                </button>

                                                <span className="bg-primary text-white font-black text-[10px] px-2 py-0.5 rounded-full shadow-2xs">
                                                    -{discountPercent}%
                                                </span>
                                            </div>

                                            {/* Centered Product Image */}
                                            <Link 
                                                href={`/product/${item.slug}?marketId=${effectiveMarketId}`} 
                                                className="block aspect-square w-full relative overflow-hidden my-1 flex items-center justify-center"
                                            >
                                                {imageUrl ? (
                                                    <img 
                                                        src={imageUrl} 
                                                        alt={item.productName || item.name || 'Produit'} 
                                                        className="w-full h-full object-contain p-1 group-hover:scale-105 transition-transform duration-300"
                                                        loading="lazy"
                                                    />
                                                ) : (
                                                    <div className="w-full h-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center rounded-xl">
                                                        <Store className="w-8 h-8 text-slate-300" />
                                                    </div>
                                                )}
                                            </Link>

                                            {/* Product Info */}
                                            <div className="space-y-1 pt-1 text-left flex-1 flex flex-col justify-between">
                                                <div>
                                                    <Link 
                                                        href={`/product/${item.slug}?marketId=${effectiveMarketId}`}
                                                        className="font-bold text-xs sm:text-[13px] text-slate-900 dark:text-white line-clamp-1 hover:text-primary transition-colors block"
                                                        title={item.productName || item.name}
                                                    >
                                                        {item.productName || item.name}
                                                    </Link>

                                                    {/* Price line in bold Ahizan red + strikethrough gray */}
                                                    <div className="flex items-baseline gap-1.5 flex-wrap mt-0.5">
                                                        <span className="text-primary font-black text-xs sm:text-sm">
                                                            {displayActivePrice.toLocaleString()} FCFA
                                                        </span>
                                                        <span className="line-through text-slate-400 text-[10px] font-semibold">
                                                            {displayOldPrice.toLocaleString()} FCFA
                                                        </span>
                                                    </div>

                                                    {/* Rating ⭐ */}
                                                    <div className="flex items-center gap-1 text-[10.5px] text-amber-500 font-bold mt-0.5">
                                                        <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                                                        <span>{(((item as any).rating || (item as any).vendorRating || 4.7) as number).toFixed(1)}</span>
                                                        <span className="text-slate-400 font-normal">
                                                            ({(item as any).ratingCount || 120} avis)
                                                        </span>
                                                    </div>
                                                </div>

                                                {/* Full-width Ahizan Red CTA Button matching Image 1 */}
                                                <button
                                                    onClick={() => handleAddToCart(item)}
                                                    disabled={isAdding}
                                                    className="w-full mt-2.5 bg-primary hover:bg-red-700 active:scale-98 text-white font-bold text-xs py-2 rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-xs cursor-pointer disabled:opacity-50"
                                                >
                                                    {isAdding ? (
                                                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                                    ) : (
                                                        <ShoppingCart className="w-3.5 h-3.5" />
                                                    )}
                                                    <span>Ajouter au panier</span>
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Pagination Controls */}
                            {totalPages > 1 && (
                                <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-3 sm:p-4 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
                                    <span className="text-xs text-slate-500 font-medium">
                                        Page {currentPage} sur {totalPages} ({filteredProducts.length} articles)
                                    </span>

                                    <div className="flex items-center gap-1">
                                        <button
                                            onClick={() => {
                                                setCurrentPage(p => Math.max(1, p - 1));
                                                catalogTopRef.current?.scrollIntoView({ behavior: 'smooth' });
                                            }}
                                            disabled={currentPage <= 1}
                                            className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 disabled:opacity-40 cursor-pointer"
                                        >
                                            <ChevronLeft className="w-3.5 h-3.5 inline mr-1" />
                                            Précédent
                                        </button>

                                        <button
                                            onClick={() => {
                                                setCurrentPage(p => Math.min(totalPages, p + 1));
                                                catalogTopRef.current?.scrollIntoView({ behavior: 'smooth' });
                                            }}
                                            disabled={currentPage >= totalPages}
                                            className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 disabled:opacity-40 cursor-pointer"
                                        >
                                            Suivant
                                            <ChevronRight className="w-3.5 h-3.5 inline ml-1" />
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-8 shadow-xs">
                            <Store className="h-10 w-10 text-slate-400 mx-auto mb-3" />
                            <h3 className="font-bold text-base text-slate-900 dark:text-white mb-1">Aucun produit ne correspond à vos critères</h3>
                            <p className="text-slate-500 dark:text-slate-400 text-xs max-w-sm mx-auto mb-4">
                                Modifiez vos critères de recherche ou réinitialisez vos filtres pour afficher l&apos;ensemble des articles du {effectiveMarketName}.
                            </p>
                            <button
                                onClick={resetFilters}
                                className="px-4 py-2 rounded-xl bg-primary text-white text-xs font-bold hover:bg-red-700 transition-colors shadow-xs cursor-pointer"
                            >
                                Réinitialiser tous les filtres
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* 3. BOTTOM SECTION: BOUTIQUES POPULAIRES (MATCHING IMAGE 1 EXACTLY) */}
            <div className="pt-6 sm:pt-8 border-t border-slate-200/80 dark:border-slate-800 space-y-4">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-red-50 dark:bg-red-950/30 flex items-center justify-center text-primary">
                            <Store className="w-4 h-4" />
                        </div>
                        <h3 className="font-black text-sm sm:text-base text-slate-900 dark:text-white">
                            Boutiques populaires
                        </h3>
                    </div>

                    <Link 
                        href="/vendors" 
                        className="text-xs font-bold text-primary hover:text-red-700 transition-colors flex items-center gap-1 group"
                    >
                        <span>Voir toutes les boutiques</span>
                        <ArrowRight className="w-3.5 h-3.5 transform group-hover:translate-x-1 transition-transform" />
                    </Link>
                </div>

                {/* 5 Boutique Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3.5">
                    {marketVendors.map((vendor, idx) => {
                        const logoUrl = vendor.logo?.preview ? getAssetUrl(vendor.logo.preview) : null;
                        const rating = vendor.rating || (4.6 + (idx % 3) * 0.1);
                        const reviews = vendor.ratingCount || (500 + idx * 150);

                        // Icon fallback matching Image 1
                        const fallbackIcons = [Smartphone, Shirt, Home, Sparkles, Trophy];
                        const FallbackIcon = fallbackIcons[idx % fallbackIcons.length];

                        return (
                            <div
                                key={vendor.id}
                                className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-3.5 shadow-2xs hover:shadow-md hover:border-primary/40 transition-all flex flex-col justify-between"
                            >
                                <div className="flex items-center gap-2.5">
                                    {/* Logo / Domain Icon */}
                                    <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center overflow-hidden shrink-0">
                                        {logoUrl ? (
                                            <img src={logoUrl} alt={vendor.name} className="w-full h-full object-cover" />
                                        ) : (
                                            <FallbackIcon className="w-4 h-4 text-slate-600 dark:text-slate-300" />
                                        )}
                                    </div>

                                    {/* Name & Rating */}
                                    <div className="min-w-0 flex-1">
                                        <div className="font-extrabold text-xs sm:text-[13px] text-slate-900 dark:text-white truncate">
                                            {vendor.name}
                                        </div>
                                        <div className="flex items-center gap-1 text-[11px] text-amber-500 font-bold">
                                            <span>{rating.toFixed(1)}</span>
                                            <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />
                                            <span className="text-slate-400 font-normal">
                                                ({reviews > 999 ? `${(reviews / 1000).toFixed(1)}k` : reviews} avis)
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* Visiter la boutique button */}
                                <Link
                                    href={`/vendor/${encodeId(vendor.id)}`}
                                    className="w-full mt-3 py-1.5 px-3 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-primary hover:text-primary text-slate-700 dark:text-slate-300 text-xs font-bold text-center transition-colors block"
                                >
                                    Visiter la boutique
                                </Link>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}

export default MarketFacetedCatalog;
