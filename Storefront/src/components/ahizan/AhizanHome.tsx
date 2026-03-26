"use client";

import { useState, useEffect } from "react";
import { 
    Smartphone, 
    Tv, 
    Laptop, 
    Home, 
    Microwave, 
    Shirt, 
    Sparkles, 
    Gamepad2, 
    ShoppingBasket, 
    Trophy, 
    Baby, 
    MoreHorizontal,
    Phone,
    Headset,
    Store,
    Flashlight,
    ChevronLeft,
    ChevronRight,
    Clock,
    ArrowRight,
    X
} from "lucide-react";
import Link from "next/link";
import { getBannerApiUrl, getAssetUrl } from "@/lib/vendure/api-utils";

const categories: any[] = []; // Remplace les anciennes catégories statiques

function FlashSaleSection({ config: activeFlash }: { config: any }) {
    const [flashProducts, setFlashProducts] = useState<any[]>([]);
    const [timeLeft, setTimeLeft] = useState({ h: '00', m: '00', s: '00' });

    // Timer Logic
    useEffect(() => {
        if (!activeFlash?.endTime) return;
        
        const timer = setInterval(() => {
            const now = new Date();
            const end = new Date(activeFlash.endTime);
            const start = activeFlash.startTime ? new Date(activeFlash.startTime) : now;
            
            // Check if active or simple mode
            const isActive = now >= start && now <= end;
            const isSimple = activeFlash.isSimpleMode;

            if (!isActive && !isSimple) {
                setTimeLeft({ h: '00', m: '00', s: '00' });
                clearInterval(timer);
                return;
            }

            const updateTimer = () => {
                const currentTime = new Date();
                const diff = end.getTime() - currentTime.getTime();

                if (diff <= 0) {
                    setTimeLeft({ h: '00', m: '00', s: '00' });
                    clearInterval(timer);
                    return;
                }
            
                const h = Math.floor(diff / (1000 * 60 * 60));
                const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
                const s = Math.floor((diff % (1000 * 60)) / 1000);
                
                setTimeLeft({
                    h: h < 10 ? `0${h}` : `${h}`,
                    m: m < 10 ? `0${m}` : `${m}`,
                    s: s < 10 ? `0${s}` : `${s}`
                });
            };

            updateTimer(); 
        }, 1000);
        
        return () => clearInterval(timer);
    }, [activeFlash]);

    // Dynamic Product Fetching for This Section
    useEffect(() => {
        if (!activeFlash) return;

        const isFilterMode = activeFlash.selectionType === 'FILTER';
        
        if (isFilterMode) {
            const searchInput: any = {
                groupByProduct: true,
                take: activeFlash.filterCriteria?.take || 50 // Fetch more to allow for client-side filtering
            };

            if (activeFlash.filterCriteria?.facetValueIds?.length > 0) {
                searchInput.facetValueIds = activeFlash.filterCriteria.facetValueIds.map((id: any) => String(id));
            }

            const searchQuery = `
                query GetFlashProducts($input: SearchInput!) {
                    search(input: $input) {
                        items {
                            productId
                            productName
                            slug
                            productAsset {
                                id
                                preview
                            }
                            priceWithTax {
                                ... on PriceRange { min max }
                                ... on SinglePrice { value }
                            }
                        }
                    }
                }
            `;

            fetch('http://localhost:3000/shop-api', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    query: searchQuery, 
                    variables: { input: searchInput } 
                })
            })
            .then(res => res.json())
            .then(data => {
                console.log(`Flash Sale (${activeFlash.name}) Search Result:`, data);
                if (data.errors) {
                    console.error('GraphQL Errors:', data.errors);
                    return;
                }
                let items = data.data?.search?.items || [];
                console.log(`Flash Sale (${activeFlash.name}) items before filtering:`, items.length);
                
                // Client-side filtering for fields not supported by the DefaultSearchPlugin's SearchInput
                if (activeFlash.filterCriteria) {
                    const { minPrice, maxPrice, minDiscount, onlyInStock } = activeFlash.filterCriteria;
                    console.log(`Applying filters for ${activeFlash.name}:`, { minPrice, maxPrice, minDiscount, onlyInStock });
                    
                    items = items.filter((item: any) => {
                        const price = item.priceWithTax?.min ?? item.priceWithTax?.value ?? 0;
                        const priceInFcfa = price / 100;

                        if (minPrice && priceInFcfa < minPrice) return false;
                        if (maxPrice && priceInFcfa > maxPrice) return false;
                        
                        // minDiscount check
                        if (minDiscount > 0) {
                            const listPrice = price * 1.25; 
                            const discount = Math.round((1 - price / listPrice) * 100);
                            if (discount < minDiscount) return false;
                        }

                        return true;
                    });
                }

                console.log(`Flash Sale (${activeFlash.name}) items after filtering:`, items.length);

                // Slice to the actual requested limit
                const limit = activeFlash.filterCriteria?.take || 12;
                items = items.slice(0, limit);

                if (items.length === 0) {
                    console.warn(`No products found for flash sale: ${activeFlash.name}. Check your filters.`);
                }
                setFlashProducts(items.map((item: any) => ({
                    id: item.productId,
                    name: item.productName,
                    slug: item.slug,
                    assets: item.productAsset ? [{ preview: item.productAsset.preview }] : [],
                    variants: [{
                        price: item.priceWithTax?.min ?? item.priceWithTax?.value ?? 0,
                        priceWithTax: item.priceWithTax?.min ?? item.priceWithTax?.value ?? 0, // Ensure compatibility
                        listPrice: (item.priceWithTax?.min ?? item.priceWithTax?.value ?? 0) * 1.25,
                        stockLevel: 'En stock'
                    }]
                })));
            })
            .catch(err => {
                console.error(`Fetch error for flash sale ${activeFlash.name}:`, err);
            });

        } else if (activeFlash.selectionType === 'MANUAL' && activeFlash.manualProductIds?.length > 0) {
            fetch('http://localhost:3000/shop-api', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    query: `
                        query GetFlashProducts($options: ProductListOptions) {
                            products(options: $options) {
                                items {
                                    id
                                    name
                                    slug
                                    variants {
                                        price
                                        priceWithTax
                                        stockLevel
                                        listPrice
                                    }
                                    assets {
                                        preview
                                    }
                                }
                            }
                        }
                    `, 
                    variables: { 
                        options: { 
                            filter: { id: { in: activeFlash.manualProductIds } },
                            take: activeFlash.filterCriteria?.take || 12
                        } 
                    } 
                })
            })
            .then(res => res.json())
            .then(data => {
                console.log(`Flash Sale (${activeFlash.name}) Manual Result:`, data);
                setFlashProducts(data.data?.products?.items || []);
            })
            .catch(err => console.error('Error fetching manual products:', err));
        }
    }, [activeFlash]);

    // Checks if we should display
    const now = new Date();
    const isStarted = !activeFlash.startTime || now >= new Date(activeFlash.startTime);
    const isNotEnded = now <= new Date(activeFlash.endTime);
    if (!isStarted || !isNotEnded) return null;

    return (
        <div 
            className={`mt-6 rounded-xl overflow-hidden shadow-sm animate-in fade-in slide-in-from-bottom-12 duration-1000 ${activeFlash.isSimpleMode ? 'border-none' : 'border border-gray-100'}`}
            style={{ 
                backgroundColor: activeFlash.isSimpleMode ? '#ffffff' : (activeFlash?.bgColor || '#e31837'),
                backgroundImage: !activeFlash.isSimpleMode && activeFlash?.bgImageUrl ? `url(${getAssetUrl(activeFlash.bgImageUrl)})` : 'none',
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                position: 'relative'
            }}
        >
            {activeFlash?.bgImageUrl && !activeFlash.isSimpleMode && <div className="absolute inset-0 bg-black/40 z-0"></div>}

            {/* Flash Header */}
            <div className={`p-5 md:p-6 flex flex-col md:flex-row items-center justify-between gap-6 relative z-10 ${activeFlash.isSimpleMode ? 'text-gray-900 border-b border-gray-100' : 'text-white'}`}>
                <div className="flex items-center gap-5">
                    {!activeFlash.isSimpleMode && (
                        <div className="p-3 bg-white/20 rounded-xl animate-pulse shadow-lg">
                            <Clock className="w-7 h-7" />
                        </div>
                    )}
                    <div>
                        <h2 className={`font-black tracking-tighter drop-shadow-sm ${activeFlash.isSimpleMode ? 'text-xl md:text-2xl text-[#002f6c]' : 'text-2xl md:text-3xl'}`}>
                            {activeFlash?.title || "Ventes Flash"}
                        </h2>
                        <p className={`text-[13px] font-bold ${activeFlash.isSimpleMode ? 'text-gray-500' : 'opacity-90'}`}>
                            {activeFlash?.subtitle || "Offres limitées à ne pas rater"}
                        </p>
                    </div>
                </div>
                <div className="flex flex-col md:flex-row items-center gap-4 md:gap-8">
                    {!activeFlash.isSimpleMode && (
                        <div className="flex items-center gap-4 bg-white/15 px-5 py-2.5 rounded-xl border border-white/20 backdrop-blur-md shadow-inner">
                            <span className="text-[11px] font-black uppercase tracking-widest opacity-95">Fini dans:</span>
                            <div className="flex items-center gap-2 font-black text-xl md:text-2xl tracking-tighter">
                                <span style={{ color: activeFlash?.accentColor || 'white' }}>{timeLeft.h}h</span><span className="opacity-40">:</span>
                                <span style={{ color: activeFlash?.accentColor || 'white' }}>{timeLeft.m}m</span><span className="opacity-40">:</span>
                                <span style={{ color: activeFlash?.accentColor || 'white' }}>{timeLeft.s}s</span>
                            </div>
                        </div>
                    )}
                    <Link href="/search?sales=true" className={`${activeFlash.isSimpleMode ? 'text-[#e31837]' : 'text-white'} group text-[14px] font-black flex items-center gap-2 hover:opacity-80 transition-all`}>
                        Voir tout <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </Link>
                </div>
            </div>

            {/* Flash Products Grid */}
            <div className={`p-5 md:p-8 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 md:gap-6 relative z-10 ${activeFlash.isSimpleMode ? 'bg-white/70 backdrop-blur-lg' : 'bg-white/95 backdrop-blur-sm'}`}>
                {(flashProducts.length > 0 ? flashProducts : [1, 2, 3, 4, 5, 6]).map((p: any, i) => {
                    const isPlaceholder = typeof p === 'number';
                    const price = isPlaceholder ? (199 + i * 50) : (p.variants?.[0]?.price || 0);
                    const listPrice = isPlaceholder ? (350 + i * 50) : (p.variants?.[0]?.listPrice || price * 1.5);
                    const discount = Math.round((1 - price / listPrice) * 100);
                    
                    return (
                        <div 
                            key={isPlaceholder ? i : p.id} 
                            className="flex flex-col gap-2 group cursor-pointer bg-white rounded-xl p-2.5 hover:shadow-2xl hover:-translate-y-1.5 transition-all duration-500 border border-gray-50 hover:border-[#e31837]/20"
                        >
                            <div className="relative aspect-square bg-gray-50 rounded-lg overflow-hidden flex items-center justify-center p-2 mb-0.5">
                                <div className="absolute top-2 right-2 bg-[#e31837] text-white text-[10px] font-black px-2 py-1 rounded-md z-10 shadow-md">
                                    -{discount}%
                                </div>
                                <div className="absolute top-2 left-2 bg-white/60 backdrop-blur-sm text-[#002f6c] text-[8px] font-bold px-1.5 py-0.5 rounded border border-gray-100/50 z-10 uppercase tracking-tighter opacity-80">
                                    New
                                </div>
                                {isPlaceholder ? (
                                    <div className="text-5xl text-gray-200 font-black uppercase opacity-50">A</div>
                                ) : (
                                    <img src={p.assets?.[0]?.preview || ''} className="w-full h-full object-contain group-hover:scale-110 transition-transform duration-700" alt={p.name} />
                                )}
                            </div>
                            
                            <div className="space-y-1">
                                <h4 className="text-[13px] font-bold text-gray-800 line-clamp-2 min-h-[36px] group-hover:text-[#e31837] transition-colors leading-tight">{isPlaceholder ? `Produit Ahizan Premium #${i}` : p.name}</h4>
                                <div className="flex flex-col gap-1">
                                    <div className="flex items-center gap-2">
                                        <span className="font-black text-lg text-[#e31837] tracking-tighter">{isPlaceholder ? price : (price / 100).toFixed(0)} <span className="text-xs">FCFA</span></span>
                                    </div>
                                    <span className="text-[11px] text-gray-400 line-through font-medium tracking-tight">{isPlaceholder ? listPrice : (listPrice / 100).toFixed(0)} FCFA</span>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

export function AhizanHome() {
    const [heroConfig, setHeroConfig] = useState<any>(null);
    const [promoConfig, setPromoConfig] = useState<any>(null);
    const [generalConfig, setGeneralConfig] = useState<any>(null);
    const [siteCategories, setSiteCategories] = useState<any[]>([]);
    const [activeFlashSales, setActiveFlashSales] = useState<any[]>([]);

    useEffect(() => {
        const fetchConfigs = async () => {
            try {
                const [heroRes, promoRes, flashRes, generalRes] = await Promise.all([
                    fetch(getBannerApiUrl('hero-config')),
                    fetch(getBannerApiUrl('promo-config')),
                    fetch(getBannerApiUrl('flash-active')),
                    fetch(getBannerApiUrl('general-config'))
                ]);
                
                const heroData = await heroRes.json();
                const promoData = await promoRes.json();
                const flashData = await flashRes.json();
                const generalData = await generalRes.json();
                
                console.log('Active Flash Sales count:', flashData?.length);
                
                setHeroConfig(heroData);
                setPromoConfig(promoData);
                setGeneralConfig(generalData);
                if (Array.isArray(flashData)) {
                    setActiveFlashSales(flashData);
                }
            } catch (err) {
                console.error('Error fetching configs:', err);
            }
        };
        fetchConfigs();

        const gqlQuery = `
            query GetCmsFacets {
                cmsFacetValues
            }
        `;

        fetch('http://localhost:3000/shop-api', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query: gqlQuery })
        })
        .then(res => res.json())
        .then(data => {
            const items = data.data?.cmsFacetValues || [];
            if (items.length > 0) {
                // Priority filtering: facets that are definitely categories
                let filtered = items.filter((iv: any) => 
                    iv.facet?.code?.toLowerCase().includes('cat') || 
                    iv.facet?.name?.toLowerCase().includes('cat') ||
                    iv.facet?.code?.toLowerCase().includes('univer') ||
                    iv.facet?.name?.toLowerCase().includes('univer')
                );
                
                // Fallback: If no "cat" match, just take ALL items (up to 30)
                const finalItems = filtered.length > 0 ? filtered : items.slice(0, 30);

                setSiteCategories(finalItems.map((iv: any) => ({
                    id: iv.id,
                    name: iv.name,
                    slug: iv.code
                })));
            }
        })
        .catch(err => {
            console.error('Error fetching categories:', err);
        });
    }, []);

    if (!heroConfig || !promoConfig) return null;

    const template = heroConfig?.selectedTemplate || 'classic';
    const config = heroConfig?.[template] || {};

    // Background Style calculation
    const getGlobalBgStyle = () => {
        if (!generalConfig?.background) return {};
        const bg = generalConfig.background;
        if (bg.type === 'color') return { backgroundColor: bg.value };
        if (bg.type === 'image' && bg.value) return { 
            backgroundImage: `url(${getAssetUrl(bg.value)})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundAttachment: 'fixed'
        };
        return {};
    };

    return (
        <div className="max-w-[1440px] mx-auto w-full px-4 md:px-8 lg:px-12 pt-2 md:pt-4">
                {/* Main Hero Section Wrapper */}
                <div className="flex flex-col lg:flex-row gap-6">
                    {/* Left Sidebar - Categories (DYNAMIQUE) */}
                    {heroConfig.showSidebar && (
                        <aside className="hidden lg:flex w-64 flex-shrink-0 flex-col bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden animate-in slide-in-from-left duration-700 self-stretch min-h-[420px] md:min-h-[480px]">
                            <div className="flex flex-col h-full">
                                <div className="px-6 py-4 border-b border-gray-50 text-[#002f6c] font-black text-[12px] uppercase tracking-widest">Nos Catégories</div>
                                <div className="flex-1 bg-white overflow-y-auto no-scrollbar py-2">
                                    {(siteCategories.length > 0 ? siteCategories : [1,2,3,4,5,6,7,8,9,10]).map((cat: any, i) => (
                                        <Link 
                                            key={cat.id || i} 
                                            href={cat.id ? `/search?facets=${cat.id}` : '#'}
                                            className={`flex items-center gap-3 px-6 py-2 text-[13px] text-gray-600 hover:text-[#e31837] hover:bg-gray-50 transition-all group ${!cat.id ? 'opacity-50 pointer-events-none' : ''}`}
                                        >
                                            <div className="w-5 h-5 flex items-center justify-center rounded text-gray-400 group-hover:text-[#e31837] transition-all overflow-hidden group-hover:scale-110">
                                                {cat.id && promoConfig?.facetMedia?.[cat.slug] ? (
                                                    <img src={getAssetUrl(promoConfig.facetMedia[cat.slug])} className="w-full h-full object-cover" />
                                                ) : (
                                                    cat.id ? (cat.icon || <Smartphone className="w-4 h-4" />) : <div className="w-4 h-4 bg-gray-100 animate-pulse rounded" />
                                                )}
                                            </div>
                                            <span className={`truncate font-semibold ${!cat.id ? 'bg-gray-100 animate-pulse text-transparent rounded w-24' : ''}`}>{cat.name || 'Chargement...'}</span>
                                        </Link>
                                    ))}
                                </div>
                            </div>
                        </aside>
                    )}

                    {/* DYNAMIC CONTENT AREA */}
                    <div className="flex-grow">
                        {template === 'classic' && (
                            /* Template 1: Classic Promo Slider + Side Boxes */
                            <div className="flex flex-col xl:flex-row gap-6">
                                {/* Middle Slider / Content Area */}
                                <div className={`flex-grow bg-white rounded-xl shadow-sm relative min-h-[300px] md:min-h-[480px] flex items-center justify-center overflow-hidden border border-gray-100 group animate-in zoom-in-95 duration-700 ${config.type === 'text' ? 'bg-gray-50' : ''}`}>
                                    {config.type === 'image' && config.bgUrl && (
                                        <img src={`http://localhost:3000${config.bgUrl}`} className="absolute inset-0 w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105" alt="Hero BG" />
                                    )}
                                    {config.type === 'video' && config.bgUrl && (
                                        <video src={getAssetUrl(config.bgUrl)} autoPlay loop muted playsInline className="absolute inset-0 w-full h-full object-cover" />
                                    )}
                                    
                                    {(config.type === 'image' || config.type === 'video') && config.bgUrl && (
                                        <div className="absolute inset-0 bg-black/15 z-10 transition-opacity group-hover:opacity-0"></div>
                                    )}

                                    <div className={`relative z-20 flex flex-col items-center justify-center text-center p-8 animate-in slide-in-from-bottom-8 duration-1000 delay-300`}>
                                        {config.title && (
                                            <h1 
                                                className={`text-2xl md:text-5xl font-bold mb-4 tracking-tight drop-shadow-md`}
                                                style={{ color: config.mainTextColor || (config.bgUrl ? 'white' : '#002f6c') }}
                                            >
                                                {config.title}
                                            </h1>
                                        )}
                                        {config.subtitle && (
                                            <p 
                                                className={`max-w-md text-sm md:text-lg font-medium drop-shadow-sm`}
                                                style={{ color: config.mainTextColor === 'white' ? 'rgba(255,255,255,0.95)' : (config.mainTextColor || '#4b5563') }}
                                            >
                                                {config.subtitle}
                                            </p>
                                        )}
                                        {config.buttonText && (
                                            <Link href={config.buttonLink || '/search'}>
                                                <button className="mt-6 md:mt-8 bg-[#e31837] text-white px-8 py-3 rounded-lg font-bold hover:bg-[#c4152f] transition-all shadow-lg hover:scale-105 active:scale-95">
                                                    {config.buttonText}
                                                </button>
                                            </Link>
                                        )}
                                    </div>
                                </div>

                                {/* Right Side Boxes */}
                                <div className="hidden xl:flex flex-col gap-4 w-60 flex-shrink-0">
                                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex flex-col gap-4">
                                        {[
                                            { title: config.assistanceTitle || "Assistance", desc: config.assistanceDesc, icon: <Headset className="w-6 h-6" />, color: "text-[#e31837]", bg: "bg-red-50" },
                                            { title: config.whatsappTitle || "WhatsApp", desc: config.whatsappDesc, icon: <Phone className="w-6 h-6" />, color: "text-[#28a745]", bg: "bg-green-50" },
                                            { title: config.sellTitle || "Vendre ici", desc: config.sellDesc, icon: <Store className="w-6 h-6" />, color: "text-[#002f6c]", bg: "bg-blue-50" }
                                        ].map((box, i) => (
                                            <div key={i} className="flex items-center gap-3 cursor-pointer group">
                                                <div className={`p-2.5 ${box.bg} ${box.color} rounded-lg flex-shrink-0 group-hover:scale-105 transition-transform`}>
                                                    {box.icon}
                                                </div>
                                                <div className="overflow-hidden">
                                                    <h3 className={`text-[12px] font-bold leading-tight truncate text-gray-800`}>{box.title}</h3>
                                                    {box.desc && <p className={`text-[10px] mt-0.5 leading-tight line-clamp-2 text-gray-500`}>{box.desc}</p>}
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Offres Flash Card Customization */}
                                    <div className={`flex-grow rounded-xl shadow-sm flex items-center justify-center p-6 relative overflow-hidden group ${config.flashBgType === 'color' || !config.flashBgUrl ? 'bg-[#002f6c]' : ''}`}>
                                        {config.flashBgType === 'image' && config.flashBgUrl && (
                                            <img src={getAssetUrl(config.flashBgUrl)} className="absolute inset-0 w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105" alt="Flash BG" />
                                        )}
                                        {config.flashBgType === 'video' && config.flashBgUrl && (
                                            <video src={getAssetUrl(config.flashBgUrl)} autoPlay loop muted playsInline className="absolute inset-0 w-full h-full object-cover" />
                                        )}
                                        
                                        {config.flashBgUrl && <div className="absolute inset-0 bg-black/20 z-10"></div>}

                                        <div className="relative text-white flex flex-col items-center text-center z-20">
                                            {config.flashTitle && <span className="text-[10px] font-bold tracking-widest uppercase opacity-80">{config.flashTitle}</span>}
                                            {config.flashDiscount && <span className="text-xl font-bold mt-1">{config.flashDiscount}</span>}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {template === 'bento' && (
                            /* Template 2: Bento Box Grid (FIXED LAYOUT) */
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 min-h-[320px] md:min-h-[480px] animate-in slide-in-from-right duration-700">
                                {/* Large Promotion Block (60%) */}
                                <div className={`md:col-span-2 md:row-span-1 lg:row-span-2 bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden relative group ${config.type === 'text' ? 'bg-gray-50' : ''}`}>
                                    {config.type === 'image' && config.bgUrl && (
                                        <img src={`http://localhost:3000${config.bgUrl}`} className="absolute inset-0 w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105" alt="Hero BG" />
                                    )}
                                    {config.type === 'video' && config.bgUrl && (
                                        <video src={getAssetUrl(config.bgUrl)} autoPlay loop muted playsInline className="absolute inset-0 w-full h-full object-cover" />
                                    )}
                                    
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent z-10 transition-opacity"></div>

                                    <div className={`absolute inset-0 flex flex-col justify-end p-6 md:p-8 z-20 animate-in fade-in duration-1000 delay-300`}>
                                        {config.mainTitle && (
                                            <h2 
                                                className={`text-2xl md:text-4xl font-bold mb-2 drop-shadow-md`}
                                                style={{ color: config.mainTextColor || 'white' }}
                                            >
                                                {config.mainTitle}
                                            </h2>
                                        )}
                                        {config.mainSubtitle && (
                                            <p 
                                                className={`font-medium text-sm md:text-base mb-6 leading-tight max-w-sm drop-shadow-sm`}
                                                style={{ color: config.mainTextColor === 'white' ? 'rgba(255,255,255,0.9)' : (config.mainTextColor || 'white') }}
                                            >
                                                {config.mainSubtitle}
                                            </p>
                                        )}
                                        {config.mainButtonText && (
                                            <Link href={config.mainButtonLink || '/promotions'}>
                                                <button className="w-fit bg-white text-[#e31837] px-6 py-2.5 rounded-lg font-bold hover:bg-gray-100 transition-all shadow-lg hover:-translate-y-1">
                                                    {config.mainButtonText}
                                                </button>
                                            </Link>
                                        )}
                                    </div>
                                </div>

                                {/* RIGHT COLUMN STACKED CARDS */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-4 lg:row-span-2 lg:col-span-1">
                                    {/* Flash Deals Block */}
                                    <div className="bg-[#e31837] rounded-xl shadow-md p-5 flex flex-col justify-between text-white relative overflow-hidden group hover:scale-[1.02] transition-transform animate-in slide-in-from-top duration-700 delay-200">
                                        <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl"></div>
                                        <div>{config.flashTitle && <h3 className={`text-base font-bold uppercase tracking-wide ${config.modalTextColor === 'black' ? 'text-black' : 'text-white'}`}>{config.flashTitle}</h3>}</div>
                                        <div className={`text-2xl font-black italic drop-shadow-md ${config.modalTextColor === 'black' ? 'text-black' : 'text-white'}`}>{config.flashDiscount || '-50% OFF'}</div>
                                    </div>

                                    {/* Support/WhatsApp Small Block */}
                                    <div className="bg-[#28a745] rounded-xl shadow-md p-5 flex flex-col justify-center text-white group hover:scale-[1.02] transition-transform animate-in slide-in-from-bottom duration-700 delay-400">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-white/20 rounded-lg group-hover:rotate-12 transition-transform">
                                                <Phone className="w-5 h-5 flex-shrink-0" />
                                            </div>
                                            <div>
                                                <h3 className={`text-sm font-bold leading-tight ${config.modalTextColor === 'black' ? 'text-black' : 'text-white'}`}>{config.whatsappTitle || 'WhatsApp'}</h3>
                                                {config.whatsappDesc && <p className={`text-[10px] mt-1 line-clamp-1 opacity-80 ${config.modalTextColor === 'black' ? 'text-black' : 'text-white'}`}>{config.whatsappDesc}</p>}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Sell Small Block */}
                                    <div className="bg-[#002f6c] rounded-xl shadow-md p-5 flex flex-col justify-center text-white group hover:scale-[1.02] transition-transform sm:col-span-2 lg:col-span-1 animate-in slide-in-from-bottom duration-700 delay-600">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-white/20 rounded-lg group-hover:rotate-12 transition-transform">
                                                <Store className="w-5 h-5 flex-shrink-0" />
                                            </div>
                                            <div>
                                                <h3 className={`text-sm font-bold leading-tight uppercase tracking-wide ${config.modalTextColor === 'black' ? 'text-black' : 'text-white'}`}>{config.sellTitle || 'Vendre ici'}</h3>
                                                {config.sellDesc && <p className={`text-[10px] mt-1 line-clamp-1 opacity-80 ${config.modalTextColor === 'black' ? 'text-black' : 'text-white'}`}>{config.sellDesc}</p>}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {template === 'fullwidth' && (
                            /* Template 3: Full-Immersive Banner + Floating Badges */
                            <div className={`w-full h-full min-h-[320px] md:min-h-[480px] rounded-xl shadow-lg relative overflow-hidden flex items-center justify-center group animate-in zoom-in-95 duration-700 ${config.type === 'text' ? 'bg-[#002f6c]' : 'bg-gray-900'}`}>
                                {/* Background Media */}
                                {config.type === 'image' && config.bgUrl && (
                                    <img src={`http://localhost:3000${config.bgUrl}`} className="absolute inset-0 w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110" alt="Hero BG" />
                                )}
                                {config.type === 'video' && config.bgUrl && (
                                    <video src={`http://localhost:3000${config.bgUrl}`} autoPlay loop muted playsInline className="absolute inset-0 w-full h-full object-cover" />
                                )}

                                <div className="absolute inset-0 bg-gradient-to-br from-black/60 via-black/20 to-transparent z-10 opacity-60 group-hover:opacity-40 transition-opacity"></div>
                                
                                <div className="relative z-20 text-center p-8 max-w-2xl animate-in slide-in-from-bottom-8 duration-1000">
                                    {config.title && (
                                        <h2 
                                            className="text-3xl md:text-6xl font-black mb-6 tracking-tight leading-tight drop-shadow-xl"
                                            style={{ color: config.mainTextColor || 'white' }}
                                        >
                                            {config.title}
                                        </h2>
                                    )}
                                    {config.subtitle && (
                                        <p 
                                            className="text-sm md:text-lg font-medium opacity-90 mb-8 leading-relaxed max-w-lg mx-auto drop-shadow-md"
                                            style={{ color: config.mainTextColor === 'white' ? 'rgba(255,255,255,0.9)' : (config.mainTextColor || 'white') }}
                                        >
                                            {config.subtitle}
                                        </p>
                                    )}
                                    {config.buttonText && (
                                        <div className="flex items-center justify-center gap-4">
                                            <Link href={config.buttonLink || '/collection'}>
                                                <button className="bg-[#e31837] text-white px-10 py-4 rounded-xl font-bold text-sm hover:bg-[#c4152f] transition-all shadow-xl hover:scale-105 active:scale-95">
                                                    {config.buttonText}
                                                </button>
                                            </Link>
                                        </div>
                                    )}
                                </div>

                                {/* Floating Action Badges */}
                                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 hidden md:flex items-center gap-4">
                                    {[
                                        { icon: <Headset className="w-4 h-4" />, label: config.assistanceTitle || "Assistance", color: "bg-[#e31837]" },
                                        { icon: <Phone className="w-4 h-4" />, label: config.whatsappTitle || "WhatsApp", color: "bg-[#28a745]" },
                                        { icon: <Store className="w-4 h-4" />, label: config.sellTitle || "Vendre", color: "bg-white text-[#002f6c]" }
                                    ].map((badge, i) => (
                                        <div key={i} className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-xl px-4 py-3 flex items-center gap-3 shadow-xl hover:bg-white/20 transition-all cursor-pointer group/badge hover:-translate-y-1">
                                            <div className={`p-1.5 ${badge.color} rounded flex-shrink-0 shadow-md`}>{badge.icon}</div>
                                            <span className={`text-[11px] font-bold uppercase tracking-wider ${config.modalTextColor === 'black' ? 'text-black' : 'text-white'}`}>{badge.label}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* QuickLinks Sections DYNAMIQUE */}
                {promoConfig.showQuickLinks && siteCategories.length > 0 && (
                    <div className="mt-6 bg-white/70 backdrop-blur-lg p-6 md:p-8 rounded-xl shadow-sm border border-gray-100/50 overflow-hidden animate-in slide-in-from-bottom-8 duration-700">
                        <div className="flex items-center justify-between mb-8">
                            <h2 className="text-xl md:text-2xl font-bold text-[#002f6c] tracking-tight">{promoConfig.quickLinksTitle || "Nos Catégories"}</h2>
                            <Link href="/categories" className="text-[#e31837] text-sm font-bold hover:opacity-80 transition-opacity flex items-center gap-2 group/all">
                                Voir tout <ArrowRight className="w-4 h-4 group-hover/all:translate-x-1 transition-transform" />
                            </Link>
                        </div>

                        <div 
                            id="quick-links-scroll"
                            className="flex gap-4 md:gap-8 overflow-x-auto pb-6 snap-x no-scrollbar scroll-smooth"
                        >
                            {siteCategories.map((cat, i) => {
                                const customImg = promoConfig.facetMedia?.[cat.slug];
                                return (
                                    <Link 
                                        key={cat.id || i} 
                                        href={`/search?facets=${cat.id}`} 
                                        className="group cursor-pointer snap-start flex-shrink-0"
                                    >
                                        {promoConfig.quickLinksStyle === 'circles' && (
                                            <div className="flex flex-col items-center gap-4 w-32 md:w-40">
                                                <div className="aspect-square w-full bg-gray-50 rounded-[2rem] flex items-center justify-center border border-gray-100 group-hover:border-[#e31837] group-hover:shadow-xl group-hover:-translate-y-2 transition-all duration-500 overflow-hidden relative">
                                                    <div className="absolute inset-0 bg-gradient-to-tr from-[#e31837]/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                                    <img
                                                        src={promoConfig?.facetMedia?.[cat.slug] ? getAssetUrl(promoConfig.facetMedia[cat.slug]) : `https://images.unsplash.com/photo-${i}?w=400&h=400&fit=crop`}
                                                        alt={cat.name}
                                                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                                                    />
                                                </div>
                                                <span className="text-[14px] font-bold text-gray-700 group-hover:text-[#e31837] transition-colors text-center truncate w-full tracking-tight">{cat.name}</span>
                                            </div>
                                        )}

                                        {promoConfig.quickLinksStyle === 'cards' && (
                                            <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm group-hover:border-[#e31837] group-hover:shadow-xl group-hover:-translate-y-2 transition-all duration-500 flex flex-col items-center gap-4 w-40 md:w-48">
                                                <div className="w-16 h-16 bg-gray-50 text-[#e31837] rounded-xl flex items-center justify-center font-bold overflow-hidden shadow-inner group-hover:scale-110 transition-transform">
                                                    {customImg ? (
                                                        <img src={getAssetUrl(customImg)} alt={cat.name} className="w-full h-full object-cover" />
                                                    ) : (
                                                       <span className="text-2xl uppercase group-hover:rotate-12 transition-transform">{cat.name.charAt(0)}</span>
                                                    )}
                                                </div>
                                                <span className="text-[15px] font-bold text-[#002f6c] text-center line-clamp-1 tracking-tight">{cat.name}</span>
                                            </div>
                                        )}

                                        {promoConfig.quickLinksStyle === 'minimal' && (
                                            <div className="bg-white px-8 py-4 rounded-xl border border-gray-200 hover:border-[#e31837] hover:text-[#e31837] hover:shadow-lg hover:-translate-y-1 transition-all flex items-center gap-4 flex-shrink-0 group/min">
                                                {customImg ? (
                                                    <img src={getAssetUrl(customImg)} className="w-8 h-8 rounded-lg object-cover group-hover/min:scale-110 transition-transform" />
                                                ) : (
                                                    <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center font-bold text-[#e31837] text-xs uppercase group-hover/min:rotate-12 transition-transform">{cat.name.charAt(0)}</div>
                                                )}
                                                <span className="text-[16px] font-bold text-gray-800 group-hover:text-[#e31837] whitespace-nowrap tracking-tight">{cat.name}</span>
                                            </div>
                                        )}
                                    </Link>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Middle Banner Ad (GRANDE BRADERIE) */}
                {promoConfig.showPromoBanner && (
                    <div className="mt-6 bg-white/70 backdrop-blur-lg p-1 rounded-xl shadow-sm border border-gray-100/50 overflow-hidden animate-in zoom-in-95 duration-1000">
                        <div 
                            className="h-28 md:h-40 rounded-lg flex flex-col md:flex-row items-center justify-between px-8 md:px-16 overflow-hidden relative group cursor-pointer shadow-inner"
                            style={{ 
                                backgroundColor: (promoConfig.promoBanner.bgType === 'color' || !promoConfig.promoBanner.bgType) ? (promoConfig.promoBanner.bgColor || '#e31837') : 'transparent',
                                backgroundImage: (promoConfig.promoBanner.bgType === 'image' || promoConfig.promoBanner.type === 'image') && promoConfig.promoBanner.bgUrl ? `url("${getAssetUrl(promoConfig.promoBanner.bgUrl)}")` : 'none',
                                backgroundSize: 'cover',
                                backgroundPosition: 'center'
                            }}
                        >
                            {/* Video Background Layer */}
                            {(promoConfig.promoBanner.bgType === 'video' || promoConfig.promoBanner.type === 'video') && promoConfig.promoBanner.bgUrl && (
                                <video autoPlay loop muted playsInline className="absolute inset-0 w-full h-full object-cover z-0">
                                    <source src={getAssetUrl(promoConfig.promoBanner.bgUrl)} type="video/mp4" />
                                </video>
                            )}

                            {/* Glow Effect */}
                            <div className="absolute inset-0 bg-gradient-to-r from-white/20 via-transparent to-black/10 z-0 opacity-0 group-hover:opacity-100 transition-opacity duration-1000"></div>

                            {/* Content based on TYPE or Background */}
                            <div className={`relative z-10 flex flex-col items-center md:items-start text-center md:text-left animate-in slide-in-from-left duration-1000 delay-300 ${
                                promoConfig.promoBanner.textColor === 'black' ? 'text-[#002f6c]' : 'text-white'
                            }`}>
                                {promoConfig.promoBanner.type !== 'image' && promoConfig.promoBanner.type !== 'video' && (
                                    <>
                                        <h2 className="text-2xl md:text-4xl font-black tracking-tighter drop-shadow-md group-hover:scale-105 transition-transform">
                                            {promoConfig.promoBanner.title}
                                        </h2>
                                        {promoConfig.promoBanner.subtitle && (
                                            <p className="mt-1 text-sm md:text-lg font-bold opacity-90 tracking-tight">
                                                {promoConfig.promoBanner.subtitle}
                                            </p>
                                        )}
                                    </>
                                )}
                            </div>

                            <div className="relative z-10 mt-6 md:mt-0 animate-in slide-in-from-right duration-1000 delay-500">
                                {promoConfig.promoBanner.type === 'text' && (
                                    <span className={`px-10 py-4 rounded-xl font-black text-sm md:text-lg shadow-2xl hover:scale-110 active:scale-95 transition-all duration-300 transform hover:-rotate-2 ${
                                        promoConfig.promoBanner.textColor === 'black' ? 'bg-[#002f6c] text-white' : 'bg-white text-[#e31837]'
                                    }`}>
                                        {promoConfig.promoBanner.ctaText}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Ventes Flash Sections DYNAMIQUE (MULTI-SUPPORT) */}
                {activeFlashSales.map((flash) => (
                    <FlashSaleSection key={flash.id} config={flash} />
                ))}

                {/* MODAL POPUP (CONDITIONNEL) */}
                {/* MODAL POPUPS (MULTI-SUPPORT) */}
                {generalConfig?.modals?.map((m: any, idx: number) => (
                    <HomeModal key={idx} config={m} />
                ))}
                {/* Migration Fallback */}
                {(!generalConfig?.modals || generalConfig.modals.length === 0) && generalConfig?.modal && (
                    <HomeModal config={generalConfig.modal} />
                )}
            </div>
    );
}

function HomeModal({ config }: { config: any }) {
    const [isOpen, setIsOpen] = useState(false);
    const [hasShowned, setHasShowned] = useState(false);

    useEffect(() => {
        if (config?.enabled && !hasShowned) {
            const delay = (config.delay || 5) * 1000;
            const timer = setTimeout(() => {
                setIsOpen(true);
                setHasShowned(true);
            }, delay);
            return () => clearTimeout(timer);
        }
    }, [config, hasShowned]);

    // Auto-close duration logic
    useEffect(() => {
        if (isOpen && config?.duration > 0) {
            const timer = setTimeout(() => {
                setIsOpen(false);
            }, config.duration * 1000);
            return () => clearTimeout(timer);
        }
    }, [isOpen, config?.duration]);

    if (!isOpen) return null;

    const isImage = config?.type === 'image';
    const isClosable = config?.isClosable !== false; // Default to true

    return (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 animate-in fade-in duration-500">
            {/* Overlay */}
            <div 
                className="absolute inset-0 bg-black/60 backdrop-blur-sm" 
                onClick={() => isClosable && setIsOpen(false)}
            />
            
            {/* Modal Content */}
            <div className={`relative z-10 w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-500 ${!isClosable ? 'pointer-events-none child-pointer-events-auto' : ''}`}>
                <style jsx>{`
                    .child-pointer-events-auto > * {
                        pointer-events: auto;
                    }
                `}</style>

                {/* Close Button */}
                {isClosable && (
                    <button 
                        onClick={() => setIsOpen(false)}
                        className="absolute top-4 right-4 z-20 p-2 bg-black/10 hover:bg-black/20 rounded-full text-white transition-all shadow-lg"
                    >
                        <X className="w-6 h-6" />
                    </button>
                )}

                {isImage ? (
                    <div className="flex flex-col">
                        {config.link ? (
                            <Link href={config.link} onClick={() => setIsOpen(false)}>
                                <img 
                                    src={getAssetUrl(config.value)} 
                                    alt="Promotion" 
                                    className="w-full h-auto object-cover max-h-[70vh] cursor-pointer"
                                />
                            </Link>
                        ) : (
                            <img 
                                src={getAssetUrl(config.value)} 
                                alt="Promotion" 
                                className="w-full h-auto object-cover max-h-[70vh]"
                            />
                        )}
                    </div>
                ) : (
                    <div className="p-8 md:p-12 text-center">
                        <div className="w-16 h-16 bg-red-50 text-[#e31837] rounded-2xl flex items-center justify-center mx-auto mb-6">
                            <Smartphone className="w-8 h-8" />
                        </div>
                        <h2 className="text-2xl font-black text-[#002f6c] mb-4 tracking-tight">Annonce Spéciale</h2>
                        <div className="text-gray-600 leading-relaxed font-medium whitespace-pre-wrap">
                            {config.value || "Découvrez nos nouvelles offres exceptionnelles sur Ahizan !"}
                        </div>
                        <button 
                            onClick={() => setIsOpen(false)}
                            className="mt-8 w-full bg-[#002f6c] text-white py-4 rounded-xl font-bold hover:bg-[#001f4d] transition-all shadow-lg"
                        >
                            D'accord, j'ai compris
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
