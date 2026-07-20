"use client";

import React, { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { 
    MapPin, Calendar, Package, Star, CheckCircle2, 
    MessageSquare, Globe, Facebook, Instagram, Phone, 
    Mail, FileText, Truck, Grid, List, Search, Heart, 
    Sparkles, ArrowUpDown, Store
} from 'lucide-react';
import { VendorProductCard } from '@/components/commerce/vendor-product-card';
import { toast } from 'sonner';
import { getAssetUrl } from '@/lib/vendure/api-utils';
import { LoginPromptModal } from '@/components/shared/login-prompt-modal';
import { checkVendorLikeStatus, toggleVendorLikeAction } from '@/app/(storefront)/likes-actions';
import { ChatWidget } from '@/components/commerce/chat-widget';

interface Collection {
    id: string;
    name: string;
    slug: string;
}

interface Product {
    id: string;
    name: string;
    slug: string;
    enabled?: boolean;
    featuredAsset?: { preview: string } | null;
    customFields?: { approvalStatus?: string } | null;
    collections?: Collection[];
    variants?: Array<{
        id: string;
        priceWithTax: number;
        customFields?: any;
    }>;
}

interface Vendor {
    id: string;
    name: string;
    description?: string;
    address?: string;
    phoneNumber?: string;
    email?: string;
    zone?: string;
    deliveryInfo?: string;
    returnPolicy?: string;
    rating?: number;
    ratingCount?: number;
    followersCount?: number;
    facebook?: string;
    instagram?: string;
    website?: string;
    logo?: { preview: string } | null;
    coverImage?: { preview: string } | null;
    products?: Product[];
}

interface VendorShopClientProps {
    vendor: Vendor;
}

export function VendorShopClient({ vendor }: VendorShopClientProps) {
    const [activeTab, setActiveTab] = useState<'all' | 'deals' | 'new' | 'reviews'>('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCollections, setSelectedCollections] = useState<string[]>([]);
    const [sortBy, setSortBy] = useState<'recommended' | 'priceAsc' | 'priceDesc' | 'newest'>('recommended');
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [isFollowed, setIsFollowed] = useState(false);
    const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
    const [isChatOpen, setIsChatOpen] = useState(false);
    const [loginModalTitle, setLoginModalTitle] = useState("S'abonner à la boutique");
    const [loginModalDescription, setLoginModalDescription] = useState("");

    // Load initial follow status
    useEffect(() => {
        if (vendor.id) {
            checkVendorLikeStatus(vendor.id).then(liked => {
                setIsFollowed(liked);
            });
        }
    }, [vendor.id]);

    // Dynamic stats and default fallbacks
    const logoUrl = vendor.logo?.preview || '';
    const coverUrl = vendor.coverImage?.preview || '';
    const ratingValue = vendor.rating || 0;
    const ratingCountValue = vendor.ratingCount || 0;
    const followersCountValue = vendor.followersCount || 0;
    const productsList = vendor.products || [];

    // Extract unique collections from products for sidebar filters
    const availableCollections = useMemo(() => {
        const map = new Map<string, { id: string; name: string; count: number }>();
        productsList.forEach(product => {
            product.collections?.forEach(col => {
                const existing = map.get(col.id);
                if (existing) {
                    existing.count += 1;
                } else {
                    map.set(col.id, { id: col.id, name: col.name, count: 1 });
                }
            });
        });
        return Array.from(map.values());
    }, [productsList]);

    // Handle Category Filter Toggle
    const handleCollectionToggle = (colId: string) => {
        setSelectedCollections(prev => 
            prev.includes(colId) ? prev.filter(id => id !== colId) : [...prev, colId]
        );
    };

    // Filter and Sort Products
    const processedProducts = useMemo(() => {
        // Only show approved/validated products on the public vendor boutique page
        let list = (productsList || []).filter(p => p.enabled !== false && p.customFields?.approvalStatus === 'approved');

        // 1. Filter by Tab
        if (activeTab === 'deals') {
            // Faux deals or products with high original price/compareAt
            list = list.filter(p => {
                const price = p.variants?.[0]?.priceWithTax || 0;
                // Just as a filter, show products that are "promoted" or arbitrarily select some for demo
                return price > 0 && parseInt(p.id) % 2 === 0;
            });
        } else if (activeTab === 'new') {
            // New arrivals, show last added or arbitrary subset
            list = list.slice(-6);
        }

        // 2. Filter by Search Term
        if (searchTerm) {
            list = list.filter(p => 
                p.name.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        // 3. Filter by Selected Categories/Collections
        if (selectedCollections.length > 0) {
            list = list.filter(p => 
                p.collections?.some(c => selectedCollections.includes(c.id))
            );
        }

        // 4. Sort
        if (sortBy === 'priceAsc') {
            list.sort((a, b) => (a.variants?.[0]?.priceWithTax || 0) - (b.variants?.[0]?.priceWithTax || 0));
        } else if (sortBy === 'priceDesc') {
            list.sort((a, b) => (b.variants?.[0]?.priceWithTax || 0) - (a.variants?.[0]?.priceWithTax || 0));
        } else if (sortBy === 'newest') {
            list.sort((a, b) => parseInt(b.id) - parseInt(a.id));
        }

        return list;
    }, [productsList, activeTab, searchTerm, selectedCollections, sortBy]);

    // Follow action
    const handleFollowToggle = async () => {
        try {
            const result = await toggleVendorLikeAction(vendor.id);
            if (result.success) {
                setIsFollowed(!!result.liked);
                if (result.liked) {
                    toast.success(`Vous suivez désormais la boutique ${vendor.name} !`);
                } else {
                    toast.info(`Vous ne suivez plus la boutique ${vendor.name}.`);
                }
            } else if (result.authenticated === false) {
                setLoginModalTitle("S'abonner à la boutique");
                setLoginModalDescription(`Créez un compte ou connectez-vous pour suivre la boutique ${vendor.name}, recevoir ses actualités et ses offres exclusives.`);
                setIsLoginModalOpen(true);
            } else {
                toast.error(result.error || "Une erreur est survenue.");
            }
        } catch (error) {
            toast.error("Erreur lors de la mise à jour de l'abonnement.");
        }
    };

    // Chat action
    const handleChatClick = () => {
        setIsChatOpen(true);
    };

    return (
        <main className="flex-grow pb-16 bg-slate-50/50 dark:bg-slate-900/50">
            {/* Header Banner */}
            <div className="relative w-full h-48 md:h-64 bg-slate-900 overflow-hidden">
                <div className="absolute inset-0 opacity-15" style={{ backgroundImage: 'radial-gradient(#ffffff 2px, transparent 2px)', backgroundSize: '24px 24px' }}></div>
                {coverUrl ? (
                    <img alt="Store Banner" className="w-full h-full object-cover opacity-60" src={coverUrl} />
                ) : (
                    <div className="w-full h-full bg-gradient-to-r from-secondary to-slate-800 opacity-65" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent"></div>
            </div>

            {/* Float Vendor Info Block */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-16 relative z-10">
                <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200/60 dark:border-slate-700/50 p-6 flex flex-col md:flex-row gap-6 items-start">
                    <div className="relative flex-shrink-0">
                        <div className="h-28 w-28 md:h-32 md:w-32 rounded-2xl border-4 border-white dark:border-slate-800 bg-white shadow-md flex items-center justify-center overflow-hidden">
                            {logoUrl ? (
                                <img alt={`${vendor.name} Logo`} className="h-full w-full object-cover" src={logoUrl} />
                            ) : (
                                <Store className="h-12 w-12 text-slate-400" />
                            )}
                        </div>
                        <div className="absolute bottom-2 right-2 h-5 w-5 bg-green-500 rounded-full border-4 border-white dark:border-slate-850" title="En ligne maintenant"></div>
                    </div>
                    
                    <div className="flex-1 w-full">
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                            <div>
                                <div className="flex items-center gap-2 flex-wrap">
                                    <h1 className="text-xl md:text-2xl font-black text-slate-955 dark:text-white leading-tight">
                                        {vendor.name}
                                    </h1>
                                    <span title="Vendeur Certifié" className="inline-flex">
                                        <CheckCircle2 className="h-5 w-5 text-blue-500 fill-blue-500/10" />
                                    </span>
                                </div>
                                
                                <div className="flex items-center gap-x-4 gap-y-1.5 mt-2 text-xs md:text-sm font-semibold text-slate-500 dark:text-slate-400 flex-wrap">
                                    <span className="flex items-center gap-1">
                                        <MapPin className="h-4 w-4 text-slate-400" />
                                        {vendor.zone || vendor.address || "Aucune localisation"}
                                    </span>
                                    <span className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-600 hidden sm:inline"></span>
                                    <span>
                                        <span className="font-bold text-slate-800 dark:text-slate-200">{followersCountValue}</span> {followersCountValue === 1 ? 'Follower' : 'Followers'}
                                    </span>
                                    <span className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-600 hidden sm:inline"></span>
                                    <span className="flex items-center gap-1 text-yellow-500">
                                        <Star className="h-4 w-4 fill-yellow-500" />
                                        <span className="font-bold text-slate-800 dark:text-slate-200">{ratingValue.toFixed(1)}</span> ({ratingCountValue} {ratingCountValue === 1 ? 'avis' : 'avis'})
                                    </span>
                                </div>
                                
                                {vendor.description && (
                                    <p className="mt-3 text-slate-600 dark:text-slate-300 max-w-2xl text-xs md:text-sm leading-relaxed font-medium">
                                        {vendor.description}
                                    </p>
                                )}
                            </div>
                            
                            {/* Follow and Chat Action Buttons */}
                            <div className="flex gap-3 w-full md:w-auto mt-3 md:mt-0 flex-shrink-0">
                                <button 
                                    onClick={handleFollowToggle}
                                    className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-2.5 font-bold rounded-xl transition-all shadow-sm text-sm ${
                                        isFollowed 
                                        ? "bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-600 hover:bg-slate-200"
                                        : "bg-primary hover:bg-red-700 text-white"
                                    }`}
                                >
                                    <Heart className={`h-4 w-4 ${isFollowed ? "fill-primary text-primary" : ""}`} />
                                    {isFollowed ? "Suivi" : "Suivre"}
                                </button>
                                <button 
                                    onClick={handleChatClick}
                                    className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-2.5 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-bold rounded-xl transition-all shadow-sm text-sm"
                                >
                                    <MessageSquare className="h-4 w-4 text-slate-400" />
                                    Discuter
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Shop Navigation Tabs */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
                <div className="border-b border-slate-200 dark:border-slate-700/50">
                    <nav className="-mb-px flex space-x-8 overflow-x-auto">
                        <button 
                            onClick={() => setActiveTab('all')}
                            className={`whitespace-nowrap py-4 px-1 border-b-2 font-bold text-sm flex items-center gap-2 transition-all ${
                                activeTab === 'all' 
                                ? 'border-primary text-primary' 
                                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                            }`}
                        >
                            <Grid className="h-4.5 w-4.5" /> Tous les produits
                        </button>
                        <button 
                            onClick={() => setActiveTab('deals')}
                            className={`whitespace-nowrap py-4 px-1 border-b-2 font-bold text-sm flex items-center gap-2 transition-all ${
                                activeTab === 'deals' 
                                ? 'border-primary text-primary' 
                                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                            }`}
                        >
                            <Sparkles className="h-4.5 w-4.5" /> Top Offres
                        </button>
                        <button 
                            onClick={() => setActiveTab('new')}
                            className={`whitespace-nowrap py-4 px-1 border-b-2 font-bold text-sm flex items-center gap-2 transition-all ${
                                activeTab === 'new' 
                                ? 'border-primary text-primary' 
                                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                            }`}
                        >
                            <Calendar className="h-4.5 w-4.5" /> Nouveautés
                        </button>
                        <button 
                            onClick={() => setActiveTab('reviews')}
                            className={`whitespace-nowrap py-4 px-1 border-b-2 font-bold text-sm flex items-center gap-2 transition-all ${
                                activeTab === 'reviews' 
                                ? 'border-primary text-primary' 
                                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                            }`}
                        >
                            <Star className="h-4.5 w-4.5" /> Avis Clients
                        </button>
                    </nav>
                </div>
            </div>

            {/* Main Layout Grid (Aside Sidebar + Products Panel) */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8 grid grid-cols-1 lg:grid-cols-4 gap-8">
                {/* Aside Left Sidebar */}
                <aside className="lg:col-span-1 space-y-6">
                    {/* Info Card */}
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200/60 dark:border-slate-700/50 p-5">
                        <h3 className="font-black text-slate-950 dark:text-white mb-4 flex items-center gap-2 uppercase tracking-wider text-xs">
                            <Store className="h-4.5 w-4.5 text-primary" /> Détails Boutique
                        </h3>
                        <ul className="space-y-4 text-xs md:text-sm font-semibold text-slate-600 dark:text-slate-300">
                            {vendor.address && (
                                <li className="flex items-start gap-3">
                                    <MapPin className="h-5 w-5 text-slate-400 mt-0.5 flex-shrink-0" />
                                    <span className="leading-relaxed">{vendor.address}</span>
                                </li>
                            )}
                            <li className="flex items-center gap-3">
                                <Calendar className="h-5 w-5 text-slate-400 flex-shrink-0" />
                                <span>Membre depuis Mars 2024</span>
                            </li>
                            <li className="flex items-center gap-3">
                                <Package className="h-5 w-5 text-slate-400 flex-shrink-0" />
                                <span>{productsList.length} Produits en vente</span>
                            </li>
                        </ul>
                        
                        {/* Performance stats */}
                        <div className="mt-6 pt-6 border-t border-slate-100 dark:border-slate-700/50">
                            <h4 className="font-bold text-slate-900 dark:text-white mb-4 text-xs uppercase tracking-wider">Performance Vendeur</h4>
                            <div className="space-y-4">
                                <div>
                                    <div className="flex justify-between text-xs font-bold mb-1.5">
                                        <span className="text-slate-500 dark:text-slate-400">Taux de réponse</span>
                                        <span className="text-green-600 dark:text-green-500">98%</span>
                                    </div>
                                    <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-1.5">
                                        <div className="bg-green-500 h-1.5 rounded-full" style={{ width: '98%' }}></div>
                                    </div>
                                </div>
                                <div>
                                    <div className="flex justify-between text-xs font-bold mb-1.5">
                                        <span className="text-slate-500 dark:text-slate-400">Livraison à temps</span>
                                        <span className="text-blue-600 dark:text-blue-500">95%</span>
                                    </div>
                                    <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-1.5">
                                        <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: '95%' }}></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Category Filter Widget */}
                    {availableCollections.length > 0 && activeTab !== 'reviews' && (
                        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200/60 dark:border-slate-700/50 p-5">
                            <h3 className="font-black text-slate-955 dark:text-white mb-4 uppercase tracking-wider text-xs">Catégories</h3>
                            <div className="space-y-3">
                                {availableCollections.map(col => (
                                    <label key={col.id} className="flex items-center space-x-3 cursor-pointer group">
                                        <input
                                            type="checkbox"
                                            checked={selectedCollections.includes(col.id)}
                                            onChange={() => handleCollectionToggle(col.id)}
                                            className="form-checkbox h-4.5 w-4.5 text-primary border-slate-200 dark:border-slate-700 rounded-lg focus:ring-primary/25 focus:ring-offset-0 dark:bg-slate-900"
                                        />
                                        <span className="text-slate-600 dark:text-slate-300 text-sm font-semibold group-hover:text-primary transition-colors">
                                            {col.name}
                                        </span>
                                        <span className="ml-auto text-xs font-bold text-slate-400 bg-slate-50 dark:bg-slate-900 px-2 py-0.5 rounded-md">
                                            {col.count}
                                        </span>
                                    </label>
                                ))}
                            </div>
                        </div>
                    )}
                </aside>

                {/* Right Panel: Products or Reviews */}
                <div className="lg:col-span-3">
                    {activeTab === 'reviews' ? (
                        /* Reviews view */
                        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200/60 dark:border-slate-700/50 p-6 space-y-6">
                            <h3 className="font-black text-slate-950 dark:text-white text-lg border-b border-slate-100 dark:border-slate-700/50 pb-4">
                                Avis Clients sur la boutique
                            </h3>
                            
                            <div className="space-y-6">
                                {[
                                    { name: "Koffi S.", rating: 5, date: "Il y a 2 jours", comment: "Excellent service ! La commande de laptops est arrivée très rapidement et bien emballée. Je recommande vivement ce vendeur pour son sérieux." },
                                    { name: "Mariam D.", rating: 4, date: "Il y a 1 semaine", comment: "Bons produits, conformes à la description. Le service de livraison à Cotonou est efficace. Le vendeur répond rapidement aux messages." },
                                    { name: "Jean-Pierre T.", rating: 5, date: "Il y a 2 semaines", comment: "Achat d'accessoires intelligents pour la maison, tout fonctionne parfaitement. Très bon contact client !" }
                                ].map((review, idx) => (
                                    <div key={idx} className="space-y-2 border-b border-slate-100 dark:border-slate-700/50 pb-6 last:border-none last:pb-0">
                                        <div className="flex justify-between items-center">
                                            <span className="font-bold text-slate-900 dark:text-white text-sm">{review.name}</span>
                                            <span className="text-xs text-slate-400 font-semibold">{review.date}</span>
                                        </div>
                                        <div className="flex text-yellow-500">
                                            {Array.from({ length: 5 }).map((_, i) => (
                                                <Star key={i} className={`h-3.5 w-3.5 ${i < review.rating ? 'fill-yellow-500' : 'text-slate-200'}`} />
                                            ))}
                                        </div>
                                        <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed font-medium">
                                            {review.comment}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        /* Products view */
                        <div className="space-y-6">
                            {/* Search/Sort header controls */}
                            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200/60 dark:border-slate-700/50 p-4 flex flex-col sm:flex-row justify-between items-center gap-4">
                                <div className="relative w-full sm:max-w-xs">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <Search className="h-4.5 w-4.5 text-slate-400" />
                                    </div>
                                    <input
                                        type="text"
                                        placeholder="Rechercher dans la boutique..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="block w-full pl-9 pr-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl leading-5 bg-slate-50 dark:bg-slate-900/50 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-xs font-semibold transition-all"
                                    />
                                </div>
                                
                                <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
                                    <div className="flex items-center gap-2 text-slate-700 dark:text-slate-200">
                                        <ArrowUpDown className="h-4 w-4 text-slate-400" />
                                        <select
                                            value={sortBy}
                                            onChange={(e) => setSortBy(e.target.value as any)}
                                            className="form-select text-xs font-bold border-slate-200 dark:border-slate-700 rounded-xl py-2 pl-2 pr-8 bg-slate-50 dark:bg-slate-900/50 focus:ring-primary/20 focus:border-primary"
                                        >
                                            <option value="recommended">Recommandé</option>
                                            <option value="priceAsc">Prix : Bas à Élevé</option>
                                            <option value="priceDesc">Prix : Élevé à Bas</option>
                                            <option value="newest">Plus Récents</option>
                                        </select>
                                    </div>
                                    <div className="flex bg-slate-100 dark:bg-slate-900 rounded-lg p-1">
                                        <button 
                                            onClick={() => setViewMode('grid')}
                                            className={`p-1.5 rounded-md transition-colors ${viewMode === 'grid' ? 'bg-white dark:bg-slate-800 text-primary shadow-sm' : 'text-slate-400 hover:text-slate-700'}`}
                                        >
                                            <Grid className="h-4 w-4" />
                                        </button>
                                        <button 
                                            onClick={() => setViewMode('list')}
                                            className={`p-1.5 rounded-md transition-colors ${viewMode === 'list' ? 'bg-white dark:bg-slate-800 text-primary shadow-sm' : 'text-slate-400 hover:text-slate-700'}`}
                                        >
                                            <List className="h-4 w-4" />
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Products Grid or List */}
                            {processedProducts.length > 0 ? (
                                viewMode === 'grid' ? (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                                        {processedProducts.map(product => (
                                            <VendorProductCard key={product.id} product={product} />
                                        ))}
                                    </div>
                                ) : (
                                    /* List view (simple row design) */
                                    <div className="space-y-4">
                                        {processedProducts.map(product => {
                                            const price = product.variants?.[0]?.priceWithTax || 0;
                                            const featuredImageUrl = product.featuredAsset?.preview ? getAssetUrl(product.featuredAsset.preview) : null;
                                            return (
                                                <Link 
                                                    key={product.id} 
                                                    href={`/product/${product.slug}`}
                                                    className="flex gap-4 p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/60 dark:border-slate-700/50 hover:shadow-md transition-shadow group no-underline text-inherit"
                                                >
                                                    <div className="w-24 h-24 bg-slate-100 dark:bg-slate-900 rounded-xl overflow-hidden flex-shrink-0 flex items-center justify-center">
                                                        {featuredImageUrl ? (
                                                            <img src={featuredImageUrl} alt={product.name} className="w-full h-full object-contain p-1" />
                                                        ) : (
                                                            <Package className="h-8 w-8 text-slate-300" />
                                                        )}
                                                    </div>
                                                    <div className="flex-1 min-w-0 flex flex-col justify-between py-1">
                                                        <div>
                                                            <h3 className="font-bold text-sm md:text-base text-slate-950 dark:text-white group-hover:text-primary transition-colors line-clamp-1">
                                                                {product.name}
                                                            </h3>
                                                            {product.collections && product.collections.length > 0 && (
                                                                <p className="text-xs text-slate-400 font-semibold mt-1">
                                                                    {product.collections[0].name}
                                                                </p>
                                                            )}
                                                        </div>
                                                        <div className="text-base font-black text-primary">
                                                            {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF', minimumFractionDigits: 0 }).format(price)}
                                                        </div>
                                                    </div>
                                                </Link>
                                            );
                                        })}
                                    </div>
                                )
                            ) : (
                                <div className="text-center py-16 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/60 dark:border-slate-700/50 p-8 shadow-sm">
                                    <Package className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                                    <h3 className="font-bold text-lg text-slate-900 dark:text-white mb-2">Aucun produit disponible</h3>
                                    <p className="text-slate-500 dark:text-slate-400 text-sm max-w-xs mx-auto">
                                        Cette boutique ne propose actuellement aucun produit correspondant à vos filtres.
                                    </p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            <LoginPromptModal 
                isOpen={isLoginModalOpen} 
                onClose={() => setIsLoginModalOpen(false)} 
                title={loginModalTitle} 
                description={loginModalDescription}
            />

            <ChatWidget
                vendorId={vendor.id}
                vendorName={vendor.name}
                isOpen={isChatOpen}
                onClose={() => setIsChatOpen(false)}
                onUnauthorized={() => {
                    setLoginModalTitle("Contacter le vendeur");
                    setLoginModalDescription(`Créez un compte ou connectez-vous pour envoyer un message en direct à la boutique ${vendor.name} et échanger avec le vendeur.`);
                    setIsLoginModalOpen(true);
                }}
            />
        </main>
    );
}
