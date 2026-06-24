"use client";

import React, { useState, useMemo } from 'react';
import { Heart, Search, Calendar, User, UserCheck, RefreshCw, ShoppingBag, Store, Package } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { getVendorLikersAction, getVendorProductsLikesAction } from '@/lib/vendure/actions';
import { getAssetUrl } from '@/lib/vendure/api-utils'; // Supposé existant ou fallback en chaîne
import { toast } from 'sonner';

interface Liker {
    id: string;
    createdAt: string;
    firstName: string;
    lastName: string;
}

interface Product {
    id: string;
    name: string;
    slug: string;
    featuredAsset?: { preview: string } | null;
    variants?: Array<{ id: string; price: number }> | null;
}

interface ProductLikesStats {
    product: Product;
    likesCount: number;
}

interface LikesClientProps {
    initialLikers: {
        items: Liker[];
        totalItems: number;
    };
    productLikesStats: ProductLikesStats[];
}

export function LikesClient({ initialLikers, productLikesStats }: LikesClientProps) {
    const [likersData, setLikersData] = useState(initialLikers);
    const [productsLikes, setProductsLikes] = useState<ProductLikesStats[]>(productLikesStats);
    const [activeTab, setActiveTab] = useState<'shop' | 'products'>('shop');
    const [searchTerm, setSearchTerm] = useState('');
    const [isRefreshing, setIsRefreshing] = useState(false);

    // Refresh both lists
    const handleRefresh = async () => {
        setIsRefreshing(true);
        try {
            const [likers, products] = await Promise.all([
                getVendorLikersAction({ take: 50, skip: 0 }),
                getVendorProductsLikesAction()
            ]);
            setLikersData(likers);
            setProductsLikes(products);
            toast.success("Statistiques de likes et abonnés actualisées.");
        } catch (error) {
            toast.error("Erreur lors de l'actualisation des statistiques.");
        } finally {
            setIsRefreshing(false);
        }
    };

    // Filter followers locally
    const filteredLikers = useMemo(() => {
        const list = likersData.items || [];
        if (!searchTerm.trim()) return list;
        
        const term = searchTerm.toLowerCase();
        return list.filter(liker => 
            liker.firstName?.toLowerCase().includes(term) ||
            liker.lastName?.toLowerCase().includes(term)
        );
    }, [likersData.items, searchTerm]);

    // Filter products locally
    const filteredProducts = useMemo(() => {
        if (!searchTerm.trim()) return productsLikes;
        const term = searchTerm.toLowerCase();
        return productsLikes.filter(stat => 
            stat.product.name?.toLowerCase().includes(term)
        );
    }, [productsLikes, searchTerm]);

    // Format date helper
    const formatDate = (dateString: string) => {
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString('fr-FR', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
        } catch {
            return dateString;
        }
    };

    // Helper for avatar initials
    const getInitials = (firstName: string, lastName: string) => {
        const first = firstName ? firstName.charAt(0).toUpperCase() : '';
        const last = lastName ? lastName.charAt(0).toUpperCase() : '';
        return `${first}${last}` || <User className="h-4 w-4" />;
    };

    // Format price in XOF (FCFA)
    const formatPrice = (priceInCents: number) => {
        return new Intl.NumberFormat('fr-FR', {
            style: 'currency',
            currency: 'XOF',
            minimumFractionDigits: 0
        }).format(priceInCents / 100);
    };

    // Safe asset URL helper
    const getProductImageUrl = (preview?: string | null) => {
        if (!preview) return '';
        // If it's already a full URL, return it
        if (preview.startsWith('http://') || preview.startsWith('https://')) {
            return preview;
        }
        // Fallback or api-utils getAssetUrl logic
        return `/assets/${preview}`;
    };

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white uppercase leading-none">
                        Abonnés & Likes
                    </h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400 font-medium mt-1.5">
                        Consultez et suivez la popularité de votre boutique et de vos produits.
                    </p>
                </div>
                <Button 
                    onClick={handleRefresh} 
                    disabled={isRefreshing}
                    variant="outline"
                    className="flex items-center gap-2 rounded-xl font-bold text-xs"
                >
                    <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
                    Actualiser
                </Button>
            </div>

            {/* Navigation Tabs */}
            <div className="flex border-b border-slate-200 dark:border-slate-800 gap-6">
                <button
                    onClick={() => {
                        setActiveTab('shop');
                        setSearchTerm('');
                    }}
                    className={`pb-3 text-xs uppercase tracking-wider font-black border-b-2 transition-all flex items-center gap-2 ${
                        activeTab === 'shop'
                        ? 'border-primary text-primary font-bold'
                        : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                    }`}
                >
                    <Store className="h-4 w-4" />
                    Abonnés à la boutique
                </button>
                <button
                    onClick={() => {
                        setActiveTab('products');
                        setSearchTerm('');
                    }}
                    className={`pb-3 text-xs uppercase tracking-wider font-black border-b-2 transition-all flex items-center gap-2 ${
                        activeTab === 'products'
                        ? 'border-primary text-primary font-bold'
                        : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                    }`}
                >
                    <ShoppingBag className="h-4 w-4" />
                    Produits les plus aimés
                </button>
            </div>

            {/* Total Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <Card className="border border-slate-200/60 dark:border-slate-800 rounded-2xl shadow-sm bg-white dark:bg-slate-900/50">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2.5">
                        <CardTitle className="text-xs font-black uppercase tracking-wider text-slate-400">
                            Abonnés Boutique
                        </CardTitle>
                        <div className="h-10 w-10 rounded-xl bg-red-50 dark:bg-red-950/30 flex items-center justify-center">
                            <Heart className="h-5.5 w-5.5 text-primary fill-primary/10 animate-pulse" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-black text-slate-900 dark:text-white">
                            {likersData.totalItems}
                        </div>
                        <p className="text-[10px] text-slate-400 font-semibold mt-1">
                            Abonnés uniques suivant votre enseigne
                        </p>
                    </CardContent>
                </Card>

                <Card className="border border-slate-200/60 dark:border-slate-800 rounded-2xl shadow-sm bg-white dark:bg-slate-900/50">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2.5">
                        <CardTitle className="text-xs font-black uppercase tracking-wider text-slate-400">
                            Produits Aimés
                        </CardTitle>
                        <div className="h-10 w-10 rounded-xl bg-amber-50 dark:bg-amber-950/30 flex items-center justify-center">
                            <ShoppingBag className="h-5.5 w-5.5 text-amber-600" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-black text-slate-900 dark:text-white">
                            {productsLikes.length}
                        </div>
                        <p className="text-[10px] text-slate-400 font-semibold mt-1">
                            Nombre de produits uniques ayant reçu au moins un Like
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Search and List Card */}
            <Card className="border border-slate-200/60 dark:border-slate-800 rounded-2xl shadow-sm bg-white dark:bg-slate-900/50">
                <CardHeader className="pb-3.5">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                        <div>
                            <CardTitle className="text-sm font-black uppercase tracking-tight text-slate-900 dark:text-white">
                                {activeTab === 'shop' ? "Abonnés à la boutique" : "Classement des produits les plus populaires"}
                            </CardTitle>
                            <CardDescription className="text-xs font-medium text-slate-500 mt-1">
                                {activeTab === 'shop' 
                                    ? "Retrouvez l'identité de vos followers pour estimer votre popularité (les emails sont masqués par sécurité)."
                                    : "Classement anonyme et statistique de vos produits selon le nombre de Likes des clients."
                                }
                            </CardDescription>
                        </div>
                        
                        {/* Search Input */}
                        <div className="relative w-full sm:w-72">
                            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <Input
                                type="text"
                                placeholder={activeTab === 'shop' ? "Rechercher un abonné..." : "Rechercher un produit..."}
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-10 rounded-xl border border-slate-200 dark:border-slate-800 dark:bg-slate-950 text-xs font-medium placeholder-slate-400 dark:placeholder-slate-500"
                            />
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    {activeTab === 'shop' ? (
                        /* --- SHOP FOLLOWERS TAB --- */
                        filteredLikers.length === 0 ? (
                            <div className="text-center py-12 border border-dashed border-slate-200 dark:border-slate-855 rounded-2xl">
                                <Heart className="h-10 w-10 text-slate-300 mx-auto mb-3" />
                                <h3 className="font-bold text-sm text-slate-700 dark:text-slate-300">Aucun abonné trouvé</h3>
                                <p className="text-slate-400 dark:text-slate-500 text-xs mt-1 max-w-xs mx-auto leading-relaxed">
                                    {searchTerm ? "Aucun abonné ne correspond à votre recherche." : "Vous n'avez pas encore d'abonnés à votre boutique."}
                                </p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="border-b border-slate-100 dark:border-slate-850 text-[10px] font-black uppercase tracking-wider text-slate-400">
                                            <th className="py-3.5 pl-2">Abonné</th>
                                            <th className="py-3.5">Date d'abonnement</th>
                                            <th className="py-3.5 pr-2 text-right">Statut</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-850 text-xs font-medium text-slate-700 dark:text-slate-300">
                                        {filteredLikers.map((liker) => (
                                            <tr key={liker.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/40 transition-colors">
                                                <td className="py-3 pl-2">
                                                    <div className="flex items-center gap-3">
                                                        <div className="h-9 w-9 bg-slate-100 dark:bg-slate-800 rounded-xl text-slate-700 dark:text-slate-300 font-bold text-xs flex items-center justify-center shadow-sm flex-shrink-0">
                                                            {getInitials(liker.firstName, liker.lastName)}
                                                        </div>
                                                        <div>
                                                            <p className="font-bold text-slate-900 dark:text-white">
                                                                {liker.firstName ? `${liker.firstName} ${liker.lastName}` : "Client Anonyme"}
                                                            </p>
                                                            <p className="text-[10px] text-slate-400 font-semibold mt-0.5">
                                                                ID Membre: #{liker.id}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="py-3">
                                                    <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                                                        <Calendar className="h-3.5 w-3.5 text-slate-400" />
                                                        <span>{formatDate(liker.createdAt)}</span>
                                                    </div>
                                                </td>
                                                <td className="py-3 pr-2 text-right">
                                                    <span className="inline-flex items-center gap-1 bg-green-50 dark:bg-green-950/35 border border-green-100 dark:border-green-900/30 text-green-700 dark:text-green-400 px-2 py-0.5 rounded-lg text-[10px] font-black uppercase">
                                                        <UserCheck className="h-3 w-3" />
                                                        Abonné
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )
                    ) : (
                        /* --- PRODUCTS LIKES TAB --- */
                        filteredProducts.length === 0 ? (
                            <div className="text-center py-12 border border-dashed border-slate-200 dark:border-slate-855 rounded-2xl">
                                <ShoppingBag className="h-10 w-10 text-slate-300 mx-auto mb-3" />
                                <h3 className="font-bold text-sm text-slate-700 dark:text-slate-300">Aucun produit aimé</h3>
                                <p className="text-slate-400 dark:text-slate-500 text-xs mt-1 max-w-xs mx-auto leading-relaxed">
                                    {searchTerm ? "Aucun produit ne correspond à votre recherche." : "Vos produits n'ont pas encore reçu de Likes de la part des clients."}
                                </p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="border-b border-slate-100 dark:border-slate-850 text-[10px] font-black uppercase tracking-wider text-slate-400">
                                            <th className="py-3.5 pl-2">Produit</th>
                                            <th className="py-3.5">Prix unitaire</th>
                                            <th className="py-3.5 text-center">Popularité</th>
                                            <th className="py-3.5 pr-2 text-right">Nombre de Likes</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-850 text-xs font-medium text-slate-700 dark:text-slate-300">
                                        {filteredProducts.map((stat, idx) => {
                                            const featuredImageUrl = getProductImageUrl(stat.product.featuredAsset?.preview);
                                            const price = stat.product.variants?.[0]?.price || 0;
                                            return (
                                                <tr key={stat.product.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/40 transition-colors">
                                                    <td className="py-3 pl-2">
                                                        <div className="flex items-center gap-3">
                                                            <div className="h-10 w-10 bg-slate-100 dark:bg-slate-800 rounded-xl overflow-hidden flex items-center justify-center flex-shrink-0 shadow-sm border border-slate-200/40">
                                                                {featuredImageUrl ? (
                                                                    <img src={featuredImageUrl} alt={stat.product.name} className="w-full h-full object-cover" />
                                                                ) : (
                                                                    <Package className="h-5 w-5 text-slate-400" />
                                                                )}
                                                            </div>
                                                            <div>
                                                                <p className="font-bold text-slate-900 dark:text-white">
                                                                    {stat.product.name}
                                                                </p>
                                                                <p className="text-[10px] text-slate-400 font-semibold mt-0.5">
                                                                    Slug: {stat.product.slug}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="py-3 font-bold text-slate-900 dark:text-white">
                                                        {formatPrice(price)}
                                                    </td>
                                                    <td className="py-3 text-center">
                                                        {/* Visual popularity rank indicator */}
                                                        {idx === 0 && (
                                                            <span className="inline-flex items-center bg-amber-50 dark:bg-amber-950/35 border border-amber-200/40 text-amber-700 dark:text-amber-400 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider">
                                                                🔥 Top 1
                                                            </span>
                                                        )}
                                                        {idx === 1 && (
                                                            <span className="inline-flex items-center bg-slate-100 dark:bg-slate-800 border border-slate-200/40 text-slate-700 dark:text-slate-400 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider">
                                                                ⭐ Top 2
                                                            </span>
                                                        )}
                                                        {idx === 2 && (
                                                            <span className="inline-flex items-center bg-orange-50 dark:bg-orange-950/35 border border-orange-200/40 text-orange-700 dark:text-orange-400 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider">
                                                                ⭐ Top 3
                                                            </span>
                                                        )}
                                                        {idx > 2 && (
                                                            <span className="text-[10px] text-slate-400 font-bold">
                                                                #{idx + 1}
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="py-3 pr-2 text-right font-black text-sm text-primary">
                                                        <div className="flex items-center justify-end gap-1.5">
                                                            <Heart className="h-4 w-4 text-primary fill-primary" />
                                                            <span>{stat.likesCount}</span>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
