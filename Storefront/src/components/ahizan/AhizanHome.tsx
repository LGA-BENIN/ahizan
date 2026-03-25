"use client";

import { useState, useEffect } from "react";
import { AhizanNavbar } from "@/components/ahizan/AhizanNavbar";
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
    Clock
} from "lucide-react";
import Link from "next/link";

const categories = [
    { name: "Téléphone & Tablette", icon: <Smartphone className="w-4 h-4" /> },
    { name: "TV & HIGH TECH", icon: <Tv className="w-4 h-4" /> },
    { name: "Informatique", icon: <Laptop className="w-4 h-4" /> },
    { name: "Maison, cuisine & bureau", icon: <Home className="w-4 h-4" /> },
    { name: "Électroménager", icon: <Microwave className="w-4 h-4" /> },
    { name: "Vêtements & Chaussures", icon: <Shirt className="w-4 h-4" /> },
    { name: "Beauté & Santé", icon: <Sparkles className="w-4 h-4" /> },
    { name: "Jeux vidéos & Consoles", icon: <Gamepad2 className="w-4 h-4" /> },
    { name: "Supermarché", icon: <ShoppingBasket className="w-4 h-4" /> },
    { name: "Sports & Loisirs", icon: <Trophy className="w-4 h-4" /> },
    { name: "Bébé & Jouets", icon: <Baby className="w-4 h-4" /> },
    { name: "Autres catégories", icon: <MoreHorizontal className="w-4 h-4" /> },
];

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
            className={`mt-12 rounded-3xl shadow-xl overflow-hidden animate-in fade-in duration-1000 ${activeFlash.isSimpleMode ? 'border-none' : 'border border-gray-100'}`}
            style={{ 
                backgroundColor: activeFlash.isSimpleMode ? '#ffffff' : (activeFlash?.bgColor || '#e31837'),
                backgroundImage: !activeFlash.isSimpleMode && activeFlash?.bgImageUrl ? 'url(http://localhost:3000' + activeFlash.bgImageUrl + ')' : 'none',
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                position: 'relative'
            }}
        >
            {activeFlash?.bgImageUrl && !activeFlash.isSimpleMode && <div className="absolute inset-0 bg-black/40 z-0"></div>}

            {/* Flash Header */}
            <div className={`p-4 md:p-6 flex flex-col md:flex-row items-center justify-between gap-4 relative z-10 ${activeFlash.isSimpleMode ? 'text-gray-900 border-b border-gray-100' : 'text-white'}`}>
                <div className="flex items-center gap-4">
                    {!activeFlash.isSimpleMode && (
                        <div className="p-3 bg-white/20 rounded-2xl animate-pulse">
                            <Clock className="w-8 h-8" />
                        </div>
                    )}
                    <div>
                        <h2 className={`font-black tracking-tight uppercase ${activeFlash.isSimpleMode ? 'text-xl md:text-2xl text-[#002f6c]' : 'text-2xl md:text-3xl'}`}>
                            {activeFlash?.title || "Ventes Flash"}
                        </h2>
                        <p className={`text-xs font-bold ${activeFlash.isSimpleMode ? 'text-gray-500' : 'opacity-75'}`}>
                            {activeFlash?.subtitle || "Offres exceptionnelles limitées dans le temps"}
                        </p>
                    </div>
                </div>
                <div className="flex flex-col md:flex-row items-center gap-4 md:gap-8">
                    {!activeFlash.isSimpleMode && (
                        <div className="flex items-center gap-3 bg-black/20 px-6 py-3 rounded-2xl border border-white/10 backdrop-blur-sm">
                            <span className="text-sm font-bold uppercase tracking-widest opacity-60 text-center">Fini dans:</span>
                            <div className="flex items-center gap-2 font-black text-xl">
                                <span style={{ color: activeFlash?.accentColor || 'white' }}>{timeLeft.h}h</span><span className="opacity-30">:</span>
                                <span style={{ color: activeFlash?.accentColor || 'white' }}>{timeLeft.m}m</span><span className="opacity-30">:</span>
                                <span style={{ color: activeFlash?.accentColor || 'white' }}>{timeLeft.s}s</span>
                            </div>
                        </div>
                    )}
                    <Link href="/search?sales=true" className={`${activeFlash.isSimpleMode ? 'bg-[#002f6c] text-white' : 'bg-white text-[#e31837]'} px-6 py-2.5 rounded-xl font-bold hover:bg-gray-800 hover:text-white transition-all transform hover:-translate-x-2 flex items-center gap-2 group shadow-sm`}>
                        Voir tout <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </Link>
                </div>
            </div>

            {/* Flash Products Grid */}
            <div className={`p-8 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-8 relative z-10 ${activeFlash.isSimpleMode ? 'bg-white' : 'bg-white bg-opacity-95 backdrop-blur-md'}`}>
                {(flashProducts.length > 0 ? flashProducts : [1, 2, 3, 4, 5, 6]).map((p: any, i) => {
                    const isPlaceholder = typeof p === 'number';
                    const price = isPlaceholder ? (199 + i * 50) : (p.variants?.[0]?.price || 0);
                    const listPrice = isPlaceholder ? (350 + i * 50) : (p.variants?.[0]?.listPrice || price * 1.5);
                    const discount = Math.round((1 - price / listPrice) * 100);
                    
                    return (
                        <div key={isPlaceholder ? i : p.id} className="flex flex-col gap-4 group cursor-pointer">
                            <div className="relative aspect-square bg-[#f8f9fa] rounded-[2.5rem] overflow-hidden flex items-center justify-center p-4 border-2 border-gray-50 group-hover:border-[#e31837]/20 group-hover:shadow-2xl group-hover:-translate-y-3 transition-all duration-500">
                                <div className="absolute top-4 right-4 bg-[#e31837] text-white text-[11px] font-black px-2.5 py-1 rounded-full shadow-lg z-10">
                                    -{discount}%
                                </div>
                                {isPlaceholder ? (
                                    <div className="text-6xl text-gray-200 group-hover:text-[#002f6c]/10 transition-colors transform group-hover:scale-125 duration-700 font-black">A</div>
                                ) : (
                                    <img src={p.assets?.[0]?.preview || ''} className="w-full h-full object-contain group-hover:scale-110 transition-transform duration-700" alt={p.name} />
                                )}
                                <div className="absolute inset-0 bg-gradient-to-t from-black/5 to-transparent opacity-100 group-hover:opacity-10 transition-opacity"></div>
                            </div>
                            
                            <div className="space-y-1 px-2">
                                <h4 className="text-[14px] font-bold text-gray-800 line-clamp-1 group-hover:text-[#e31837] transition-colors">{isPlaceholder ? `Produit Ahizan Premium #${i}` : p.name}</h4>
                                <div className="flex items-baseline gap-2">
                                    <span className="font-black text-lg text-[#002f6c]">{isPlaceholder ? price : (price / 100).toFixed(0)} Dhs</span>
                                    <span className="text-xs text-gray-400 line-through font-medium">{isPlaceholder ? listPrice : (listPrice / 100).toFixed(0)} Dhs</span>
                                </div>
                                <div className="pt-2">
                                    <div className="flex justify-between text-[10px] font-bold mb-1.5">
                                        <span className="text-gray-500 uppercase tracking-tighter">Stock</span>
                                        <span className="text-[#e31837]">{isPlaceholder ? (15 + i) : (p.variants?.[0]?.stockLevel || 'Limited')}</span>
                                    </div>
                                    <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden p-0.5 border border-gray-50 shadow-inner">
                                        <div 
                                            className="h-full bg-gradient-to-r from-[#e31837] to-[#ff4b6b] rounded-full transition-all duration-1000 delay-500" 
                                            style={{ width: `${isPlaceholder ? Math.max(20, 100 - i * 12) : 65}%` }}
                                        ></div>
                                    </div>
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
    const [siteCategories, setSiteCategories] = useState<any[]>([]);
    const [activeFlashSales, setActiveFlashSales] = useState<any[]>([]);

    useEffect(() => {
        const fetchConfigs = async () => {
            try {
                const [heroRes, promoRes, flashRes] = await Promise.all([
                    fetch('http://localhost:3000/banner/hero-config'),
                    fetch('http://localhost:3000/banner/promo-config'),
                    fetch('http://localhost:3000/banner/flash-active')
                ]);
                
                const heroData = await heroRes.json();
                const promoData = await promoRes.json();
                const flashData = await flashRes.json();
                
                console.log('Active Flash Sales count:', flashData?.length);
                
                setHeroConfig(heroData);
                setPromoConfig(promoData);
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

    return (
        <div className="bg-[#f8f9fa] min-h-screen pb-20 font-sans">
            <div className="max-w-[1600px] mx-auto w-full px-4 md:px-[2%] xl:px-[4%] pt-8">
                {/* Main Hero Section Wrapper */}
                <div className="flex gap-8 relative">
                    {/* Left Sidebar - Categories (DYNAMIQUE) */}
                    {heroConfig.showSidebar && (
                        <aside className="hidden md:flex w-72 flex-col bg-white rounded-3xl shadow-xl shadow-gray-200 border border-gray-100 overflow-hidden sticky top-32 h-[calc(100vh-160px)] z-20 transition-all duration-500 animate-in slide-in-from-left">
                            <div className="flex flex-col py-4">
                                <div className="px-6 mb-2 text-[#002f6c] font-bold text-xs uppercase tracking-widest opacity-50">Catégories</div>
                                <div className="flex-1 bg-white p-6 border-t border-gray-50 overflow-y-auto custom-scrollbar">
                                    {(siteCategories.length > 0 ? siteCategories : categories).map((cat: any, i) => (
                                        <Link 
                                            key={i} 
                                            href={`/search?facets=${cat.id}`}
                                            className="flex items-center gap-4 px-6 py-2.5 text-[13px] font-medium text-gray-700 hover:text-[#e31837] hover:bg-red-50/50 transition-all group"
                                            style={{ animationDelay: `${i * 50}ms` }}
                                        >
                                            <div className="w-8 h-8 flex items-center justify-center rounded-lg bg-gray-50 text-gray-400 group-hover:text-[#e31837] group-hover:bg-red-50 transition-all overflow-hidden">
                                                {promoConfig.facetMedia?.[cat.slug] ? (
                                                    <img src={`http://localhost:3000${promoConfig.facetMedia[cat.slug]}`} className="w-full h-full object-cover" />
                                                ) : (
                                                    cat.icon || <Smartphone className="w-4 h-4" />
                                                )}
                                            </div>
                                            <span className="truncate">{cat.name}</span>
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
                            <div className="flex flex-col xl:flex-row gap-8 h-full">
                                {/* Middle Slider / Content Area */}
                                <div className={`flex-grow bg-white rounded-2xl shadow-lg relative min-h-[400px] flex items-center justify-center overflow-hidden border border-gray-100 group animate-in zoom-in duration-700 ${config.type === 'text' ? 'bg-gradient-to-br from-[#002f6c]/5 to-[#e31837]/5' : ''}`}>
                                    {config.type === 'image' && config.bgUrl && (
                                        <img src={`http://localhost:3000${config.bgUrl}`} className="absolute inset-0 w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105" alt="Hero BG" />
                                    )}
                                    {config.type === 'video' && config.bgUrl && (
                                        <video src={`http://localhost:3000${config.bgUrl}`} autoPlay loop muted playsInline className="absolute inset-0 w-full h-full object-cover" />
                                    )}
                                    
                                    {(config.type === 'image' || config.type === 'video') && config.bgUrl && (
                                        <div className="absolute inset-0 bg-black/20 z-10 transition-opacity group-hover:opacity-0"></div>
                                    )}

                                    {!config.bgUrl && config.type !== 'text' && (
                                        <div className="relative text-[#002f6c] opacity-20 transform group-hover:scale-110 transition-transform duration-1000">
                                            <div className="w-48 h-48 border-[8px] border-current rounded-full flex items-center justify-center">
                                                <span className="text-8xl font-black">A</span>
                                            </div>
                                        </div>
                                    )}

                                    <div className={`absolute inset-0 flex flex-col items-center justify-center text-center p-8 z-20`}>
                                        {config.title && (
                                            <h1 
                                                className={`text-4xl md:text-5xl font-black mb-4 tracking-tighter animate-in fade-in slide-in-from-bottom duration-1000`}
                                                style={{ color: config.mainTextColor || (config.bgUrl ? 'white' : '#002f6c'), textShadow: config.mainTextColor === 'white' ? '0 2px 10px rgba(0,0,0,0.3)' : 'none' }}
                                            >
                                                {config.title}
                                            </h1>
                                        )}
                                        {config.subtitle && (
                                            <p 
                                                className={`max-w-md text-lg font-medium animate-in fade-in slide-in-from-bottom duration-1000 delay-300`}
                                                style={{ color: config.mainTextColor === 'white' ? 'rgba(255,255,255,0.9)' : (config.mainTextColor || 'text-gray-600') }}
                                            >
                                                {config.subtitle}
                                            </p>
                                        )}
                                        {config.buttonText && (
                                            <Link href={config.buttonLink || '/search'}>
                                                <button className="mt-8 bg-[#002f6c] text-white px-8 py-3 rounded-xl font-bold hover:bg-[#e31837] transition-all hover:scale-105 active:scale-95 shadow-xl shadow-blue-200 animate-in fade-in slide-in-from-bottom duration-1000 delay-500">
                                                    {config.buttonText}
                                                </button>
                                            </Link>
                                        )}
                                    </div>
                                </div>

                                {/* Right Side Boxes */}
                                <div className="hidden xl:flex flex-col gap-6 w-64 flex-shrink-0 animate-in fade-in slide-in-from-right duration-700">
                                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 flex flex-col gap-5 hover:shadow-md transition-shadow">
                                        {[
                                            { title: config.assistanceTitle || "Assistance", desc: config.assistanceDesc, icon: <Headset className="w-7 h-7" />, color: "text-[#e31837]", bg: "bg-red-50" },
                                            { title: config.whatsappTitle || "WhatsApp", desc: config.whatsappDesc, icon: <Phone className="w-7 h-7" />, color: "text-[#28a745]", bg: "bg-green-50" },
                                            { title: config.sellTitle || "Vendre ici", desc: config.sellDesc, icon: <Store className="w-7 h-7" />, color: "text-[#002f6c]", bg: "bg-blue-50" }
                                        ].map((box, i) => (
                                            <div key={i} className="flex items-center gap-4 group cursor-pointer">
                                                <div className={`p-3 ${box.bg} ${box.color} rounded-2xl group-hover:scale-110 transition-transform duration-300 flex-shrink-0`}>
                                                    {box.icon}
                                                </div>
                                                <div className="overflow-hidden">
                                                    <h3 className={`text-[13px] font-bold leading-tight truncate ${config.modalTextColor === 'white' ? 'text-white' : 'text-gray-800'}`}>{box.title}</h3>
                                                    {box.desc && <p className={`text-[10px] mt-0.5 leading-tight line-clamp-2 ${config.modalTextColor === 'white' ? 'text-white/70' : 'text-gray-500'}`}>{box.desc}</p>}
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Offres Flash Card Customization */}
                                    <div className={`flex-grow rounded-2xl shadow-lg flex items-center justify-center p-6 relative overflow-hidden group ${config.flashBgType === 'color' || !config.flashBgUrl ? 'bg-[#002f6c]' : ''}`}>
                                        {config.flashBgType === 'image' && config.flashBgUrl && (
                                            <img src={`http://localhost:3000${config.flashBgUrl}`} className="absolute inset-0 w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110" alt="Flash BG" />
                                        )}
                                        {config.flashBgType === 'video' && config.flashBgUrl && (
                                            <video src={`http://localhost:3000${config.flashBgUrl}`} autoPlay loop muted playsInline className="absolute inset-0 w-full h-full object-cover" />
                                        )}
                                        
                                        {config.flashBgUrl && <div className="absolute inset-0 bg-black/30 z-10 transition-opacity group-hover:opacity-10"></div>}

                                        <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent z-10"></div>
                                        <div className="relative text-white flex flex-col items-center text-center z-20">
                                            <div className="w-20 h-20 border-[4px] border-white/30 rounded-full flex items-center justify-center mb-4 group-hover:rotate-12 transition-transform duration-500">
                                                <span className="text-3xl font-black italic">A</span>
                                            </div>
                                            {config.flashTitle && <span className="text-sm font-bold tracking-widest uppercase opacity-75">{config.flashTitle}</span>}
                                            {config.flashDiscount && <span className="text-2xl font-black mt-1">{config.flashDiscount}</span>}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {template === 'bento' && (
                            /* Template 2: Bento Box Grid (FIXED LAYOUT) */
                            <div className="grid grid-cols-1 md:grid-cols-3 grid-rows-2 gap-6 h-full min-h-[400px] animate-in fade-in zoom-in duration-700">
                                {/* Large Promotion Block (60%) */}
                                <div className={`md:col-span-2 md:row-span-2 bg-white rounded-3xl shadow-lg border border-gray-100 overflow-hidden relative group ${config.type === 'text' ? 'bg-gradient-to-br from-[#002f6c]/10 to-[#e31837]/10' : ''}`}>
                                    {config.type === 'image' && config.bgUrl && (
                                        <img src={`http://localhost:3000${config.bgUrl}`} className="absolute inset-0 w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105" alt="Hero BG" />
                                    )}
                                    {config.type === 'video' && config.bgUrl && (
                                        <video src={`http://localhost:3000${config.bgUrl}`} autoPlay loop muted playsInline className="absolute inset-0 w-full h-full object-cover" />
                                    )}
                                    
                                    {(config.type === 'image' || config.type === 'video') && config.bgUrl && (
                                        <div className="absolute inset-0 bg-black/20 z-10 transition-opacity group-hover:opacity-0"></div>
                                    )}

                                    <div className={`absolute inset-0 flex flex-col justify-center pb-12 p-10 z-20 ${config.bgUrl ? 'bg-gradient-to-t from-black/40 via-transparent to-transparent' : 'bg-gradient-to-t from-white/20 via-white/10 to-transparent'}`}>
                                        {config.mainTitle && (
                                            <h2 
                                                className={`text-4xl font-black mb-2 animate-in slide-in-from-left duration-700`}
                                                style={{ color: config.mainTextColor || (config.bgUrl ? 'white' : '#002f6c'), textShadow: config.mainTextColor === 'white' ? '0 2px 10px rgba(0,0,0,0.3)' : 'none' }}
                                            >
                                                {config.mainTitle}
                                            </h2>
                                        )}
                                        {config.mainSubtitle && (
                                            <p 
                                                className={`font-medium text-lg leading-tight mb-6 animate-in slide-in-from-left duration-700 delay-200`}
                                                style={{ color: config.mainTextColor === 'white' ? 'rgba(255,255,255,0.9)' : (config.mainTextColor || 'text-gray-600') }}
                                            >
                                                {config.mainSubtitle}
                                            </p>
                                        )}
                                        {config.mainButtonText && (
                                            <Link href={config.mainButtonLink || '/promotions'}>
                                                <button className="w-fit bg-[#e31837] text-white px-10 py-4 rounded-2xl font-black hover:scale-110 transition-transform shadow-xl shadow-red-200">
                                                    {config.mainButtonText}
                                                </button>
                                            </Link>
                                        )}
                                    </div>
                                    <div className="absolute top-10 right-10 text-[180px] font-black text-[#002f6c]/5 select-none transition-transform duration-1000 group-hover:scale-125 z-10">A</div>
                                </div>

                                {/* RIGHT COLUMN STACKED CARDS (3 Stacked to match middle height) */}
                                <div className="md:col-span-1 md:row-span-2 flex flex-col gap-4 h-full">
                                    {/* Flash Deals Block */}
                                    <div className="flex-1 bg-[#e31837] rounded-3xl shadow-lg p-5 flex flex-col justify-between text-white relative overflow-hidden group">
                                        <div className="absolute -top-4 -right-4 w-24 h-24 bg-white/10 rounded-full blur-xl animate-pulse"></div>
                                        <div>{config.flashTitle && <h3 className={`text-lg font-black uppercase leading-tight ${config.modalTextColor === 'black' ? 'text-black' : 'text-white'}`}>{config.flashTitle}</h3>}</div>
                                        <div className={`text-2xl font-black italic ${config.modalTextColor === 'black' ? 'text-black' : 'text-white'}`}>{config.flashDiscount || '-50% OFF'}</div>
                                    </div>

                                    {/* Support/WhatsApp Small Block */}
                                    <div className="flex-1 bg-[#28a745] rounded-3xl shadow-lg p-5 flex flex-col justify-center text-white group">
                                        <div>
                                            <h3 className={`text-md font-black leading-tight ${config.modalTextColor === 'black' ? 'text-black' : 'text-white'}`}>{config.whatsappTitle || 'WhatsApp'}</h3>
                                            {config.whatsappDesc && <p className={`text-[10px] mt-1 line-clamp-1 ${config.modalTextColor === 'black' ? 'text-black/70' : 'text-white/80'}`}>{config.whatsappDesc}</p>}
                                        </div>
                                    </div>

                                    {/* Sell Small Block (Now correctly sized & positioned) */}
                                    <div className="flex-1 bg-[#002f6c] rounded-3xl shadow-lg p-5 flex flex-col justify-center text-white group">
                                        <div>
                                            <h3 className={`text-md font-black leading-tight uppercase ${config.modalTextColor === 'black' ? 'text-black' : 'text-white'}`}>{config.sellTitle || 'Vendre ici'}</h3>
                                            {config.sellDesc && <p className={`text-[10px] mt-1 line-clamp-1 ${config.modalTextColor === 'black' ? 'text-black/70' : 'text-white/80'}`}>{config.sellDesc}</p>}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {template === 'fullwidth' && (
                            /* Template 3: Full-Immersive Banner + Floating Badges */
                            <div className={`w-full h-full min-h-[500px] rounded-3xl shadow-2xl relative overflow-hidden flex items-center justify-center group animate-in slide-in-from-bottom duration-1000 ${config.type === 'text' ? 'bg-gradient-to-tr from-[#002f6c] to-[#e31837]' : 'bg-[#002f6c]'}`}>
                                {/* Background Media */}
                                {config.type === 'image' && config.bgUrl && (
                                    <img src={`http://localhost:3000${config.bgUrl}`} className="absolute inset-0 w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105" alt="Hero BG" />
                                )}
                                {config.type === 'video' && config.bgUrl && (
                                    <video src={`http://localhost:3000${config.bgUrl}`} autoPlay loop muted playsInline className="absolute inset-0 w-full h-full object-cover" />
                                )}

                                <div className="absolute inset-0 bg-black/40 z-10 transition-opacity group-hover:opacity-20 opacity-50"></div>
                                {/* Massive Background text */}
                                <div className="absolute inset-0 flex items-center justify-center select-none text-white/5 font-black text-[300px] italic pointer-events-none group-hover:scale-110 transition-transform duration-1000 z-10">A</div>
                                
                                <div className="relative z-20 text-center p-12 max-w-2xl">
                                    {config.title && (
                                        <h2 
                                            className="text-5xl md:text-7xl font-black mb-6 tracking-tighter leading-none"
                                            style={{ color: config.mainTextColor || 'white', textShadow: config.mainTextColor === 'white' ? '0 5px 20px rgba(0,0,0,0.5)' : 'none' }}
                                        >
                                            {config.title}
                                        </h2>
                                    )}
                                    {config.subtitle && (
                                        <p 
                                            className="text-lg md:text-xl font-medium opacity-80 mb-10 leading-relaxed max-w-xl mx-auto"
                                            style={{ color: config.mainTextColor === 'white' ? 'rgba(255,255,255,0.8)' : (config.mainTextColor || 'white') }}
                                        >
                                            {config.subtitle}
                                        </p>
                                    )}
                                    {config.buttonText && (
                                        <div className="flex items-center justify-center gap-4">
                                            <Link href={config.buttonLink || '/collection'}>
                                                <button className="bg-[#e31837] text-white px-10 py-4 rounded-2xl font-black text-sm uppercase tracking-widest hover:scale-110 transition-all shadow-2xl active:scale-95">
                                                    {config.buttonText}
                                                </button>
                                            </Link>
                                        </div>
                                    )}
                                </div>

                                {/* Floating Action Badges at Bottom with Optional Descriptions */}
                                <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-30 flex items-center gap-6 mt-16 animate-in slide-in-from-bottom duration-1000 delay-500">
                                    {[
                                        { icon: <Headset className="w-5 h-5" />, label: config.assistanceTitle || "Assistance", desc: config.assistanceDesc, color: "bg-[#e31837]" },
                                        { icon: <Phone className="w-5 h-5" />, label: config.whatsappTitle || "WhatsApp", desc: config.whatsappDesc, color: "bg-[#28a745]" },
                                        { icon: <Store className="w-5 h-5" />, label: config.sellTitle || "Vendre", desc: config.sellDesc, color: "bg-white text-[#002f6c]" }
                                    ].map((badge, i) => (
                                        <div key={i} className="bg-white/10 backdrop-blur-2xl border border-white/20 rounded-2xl px-6 py-5 flex flex-col items-center gap-2 shadow-2xl hover:bg-white/20 transition-colors cursor-pointer group/badge min-w-[140px] border-b-4 border-b-white/10">
                                            <div className="flex items-center gap-3">
                                                <div className={`p-2 ${badge.color} rounded-xl group-hover/badge:scale-110 transition-transform`}>{badge.icon}</div>
                                                <span className={`text-[11px] font-black uppercase tracking-wider ${config.modalTextColor === 'black' ? 'text-black' : 'text-white'}`}>{badge.label}</span>
                                            </div>
                                            {badge.desc && <span className={`text-[10px] font-bold text-center leading-tight max-w-[120px] ${config.modalTextColor === 'black' ? 'text-black/70' : 'text-white/60'}`}>{badge.desc}</span>}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Bottom Quick Links Slider - DYNAMIC & LARGER */}
                {promoConfig.showQuickLinks && siteCategories.length > 0 && (
                    <div className="mt-16 relative group/slider animate-in fade-in duration-1000">
                        <div className="flex items-center justify-between mb-6 px-2">
                            <h3 className="text-xl font-black text-[#002f6c] uppercase tracking-tight">Découvrez nos univers</h3>
                            <div className="flex gap-2">
                                <button 
                                    onClick={() => document.getElementById('quick-links-scroll')?.scrollBy({ left: -300, behavior: 'smooth' })}
                                    className="p-3 bg-white rounded-full shadow-md border border-gray-100 hover:bg-[#e31837] hover:text-white transition-all active:scale-90"
                                >
                                    <ChevronLeft className="w-5 h-5" />
                                </button>
                                <button 
                                    onClick={() => document.getElementById('quick-links-scroll')?.scrollBy({ left: 300, behavior: 'smooth' })}
                                    className="p-3 bg-white rounded-full shadow-md border border-gray-100 hover:bg-[#e31837] hover:text-white transition-all active:scale-90"
                                >
                                    <ChevronRight className="w-5 h-5" />
                                </button>
                            </div>
                        </div>

                        <div 
                            id="quick-links-scroll"
                            className="flex gap-6 overflow-x-auto pb-8 snap-x no-scrollbar scroll-smooth"
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
                                            <div className="flex flex-col items-center gap-3 w-32 md:w-40">
                                                <div className="aspect-square w-full bg-white rounded-[2.5rem] flex items-center justify-center shadow-md border border-gray-100 group-hover:shadow-2xl group-hover:-translate-y-3 transition-all duration-300 overflow-hidden relative">
                                                    <div className="absolute inset-0 bg-gradient-to-tr from-[#002f6c]/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                                    <img
                                                        src={promoConfig?.facetMedia?.[cat.slug] ? `http://localhost:3000${promoConfig.facetMedia[cat.slug]}` : `https://images.unsplash.com/photo-${i}?w=400&h=400&fit=crop`}
                                                        alt={cat.name}
                                                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                                                    />
                                                </div>
                                                <span className="text-[14px] font-black text-gray-700 group-hover:text-[#e31837] transition-colors text-center truncate w-full uppercase tracking-tighter">{cat.name}</span>
                                            </div>
                                        )}

                                        {promoConfig.quickLinksStyle === 'cards' && (
                                            <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-md group-hover:shadow-2xl group-hover:-translate-y-2 transition-all flex flex-col items-center gap-4 w-40 md:w-48">
                                                <div className="w-16 h-16 bg-red-50 text-[#e31837] rounded-2xl flex items-center justify-center font-black overflow-hidden">
                                                    {customImg ? (
                                                        <img src={`http://localhost:3000${customImg}`} alt={cat.name} className="w-full h-full object-cover" />
                                                    ) : (
                                                       <span className="text-2xl uppercase">{cat.name.charAt(0)}</span>
                                                    )}
                                                </div>
                                                <span className="text-[15px] font-black text-[#002f6c] text-center line-clamp-1 uppercase tracking-tighter">{cat.name}</span>
                                            </div>
                                        )}

                                        {promoConfig.quickLinksStyle === 'minimal' && (
                                            <div className="bg-white px-8 py-4 rounded-3xl border border-gray-200 shadow-sm group-hover:border-[#e31837] group-hover:text-[#e31837] transition-all flex items-center gap-4 flex-shrink-0">
                                                {customImg ? (
                                                    <img src={`http://localhost:3000${customImg}`} className="w-8 h-8 rounded-lg object-cover" />
                                                ) : (
                                                    <div className="w-8 h-8 rounded-lg bg-[#e31837]/10 flex items-center justify-center font-black text-[#e31837] text-xs uppercase">{cat.name.charAt(0)}</div>
                                                )}
                                                <span className="text-[16px] font-black text-gray-800 group-hover:text-[#e31837] whitespace-nowrap uppercase tracking-tighter">{cat.name}</span>
                                            </div>
                                        )}
                                    </Link>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Middle Banner Ad (GRANDE BRADERIE) - REFINED HEIGHT */}
                {promoConfig.showPromoBanner && (
                    <div className="mt-12 bg-white p-2 rounded-[3rem] shadow-2xl shadow-gray-200 border border-gray-100 animate-in slide-in-from-bottom duration-1000 overflow-hidden">
                        <div 
                            className="h-32 md:h-44 rounded-[2.5rem] shadow-inner flex flex-col md:flex-row items-center justify-between px-10 md:px-24 overflow-hidden relative group cursor-pointer"
                            style={{ 
                                backgroundColor: (promoConfig.promoBanner.bgType === 'color' || !promoConfig.promoBanner.bgType) ? (promoConfig.promoBanner.bgColor || '#e31837') : 'transparent',
                                backgroundImage: promoConfig.promoBanner.bgType === 'image' && promoConfig.promoBanner.bgUrl ? `url(${promoConfig.promoBanner.bgUrl})` : 'none',
                                backgroundSize: 'cover',
                                backgroundPosition: 'center',
                                transition: 'all 0.5s ease'
                            }}
                        >
                            {/* Video Background Layer */}
                            {promoConfig.promoBanner.bgType === 'video' && promoConfig.promoBanner.bgUrl && (
                                <video 
                                    autoPlay loop muted playsInline 
                                    className="absolute inset-0 w-full h-full object-cover z-0"
                                    key={promoConfig.promoBanner.bgUrl} // Forces re-render if video changes
                                >
                                    <source src={promoConfig.promoBanner.bgUrl} type="video/mp4" />
                                </video>
                            )}

                            {/* Decorative Overlays */}
                            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-white opacity-10 rounded-full -translate-y-1/2 translate-x-1/2 blur-[100px] group-hover:scale-110 transition-transform duration-1000"></div>
                            <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-black opacity-5 rounded-full translate-y-1/2 -translate-x-1/2 blur-[80px]"></div>

                            {/* Content based on TYPE or Background */}
                            <div className={`relative z-10 flex flex-col items-center md:items-start text-center md:text-left drop-shadow-2xl ${
                                promoConfig.promoBanner.textColor === 'black' ? 'text-[#002f6c]' : 'text-white'
                            }`}>
                                {promoConfig.promoBanner.type !== 'image' && promoConfig.promoBanner.type !== 'video' && (
                                    <>
                                        <h2 className="text-4xl md:text-6xl font-black tracking-tighter uppercase leading-none drop-shadow-2xl">
                                            {promoConfig.promoBanner.title}
                                        </h2>
                                        {promoConfig.promoBanner.subtitle && (
                                            <p className="mt-3 text-lg md:text-2xl font-black opacity-90 max-w-2xl tracking-tight uppercase">
                                                {promoConfig.promoBanner.subtitle}
                                            </p>
                                        )}
                                    </>
                                )}
                            </div>

                            <div className="relative z-10 mt-8 md:mt-0">
                                <span className={`px-12 py-5 rounded-full font-black text-sm md:text-xl uppercase shadow-2xl hover:scale-110 active:scale-95 transition-all duration-300 transform hover:-rotate-2 ${
                                    promoConfig.promoBanner.textColor === 'black' ? 'bg-[#002f6c] text-white' : 'bg-white text-[#e31837]'
                                }`}>
                                    {promoConfig.promoBanner.ctaText}
                                </span>
                            </div>
                        </div>
                    </div>
                )}

                {/* Ventes Flash Sections DYNAMIQUE (MULTI-SUPPORT) */}
                {activeFlashSales.map((flash) => (
                    <FlashSaleSection key={flash.id} config={flash} />
                ))}
            </div>
        </div>
    );
}
