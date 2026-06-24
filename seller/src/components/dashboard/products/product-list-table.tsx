'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { 
    Search, 
    Filter, 
    Pencil,
    Circle, 
    Package, 
    ArrowRight,
    Plus,
    RefreshCw,
    HelpCircle,
    Copy,
    ChevronLeft,
    ChevronRight
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import DeleteProductDialog from '@/components/dashboard/products/delete-dialog';
import { toast } from 'sonner';
import { priceFromSubunit } from '@/lib/format';

interface ProductListTableProps {
    initialProducts: any[];
    collectionTree: any[];
}

export default function ProductListTable({ initialProducts, collectionTree }: ProductListTableProps) {
    const [searchQuery, setSearchQuery] = useState('');
    const [filterCategory, setFilterCategory] = useState<string>('all');
    const [filterStatus, setFilterStatus] = useState<'all' | 'published' | 'draft' | 'outofstock'>('all');
    const [priceMin, setPriceMin] = useState<string>('');
    const [priceMax, setPriceMax] = useState<string>('');

    // Reset all filters
    const handleResetFilters = () => {
        setSearchQuery('');
        setFilterCategory('all');
        setFilterStatus('all');
        setPriceMin('');
        setPriceMax('');
        toast.info('Filtres réinitialisés');
    };

    // Client-side advanced filtering
    const filteredProducts = useMemo(() => {
        return (initialProducts || []).filter(product => {
            if (!product) return false;
            const variant = product.variants?.[0];
            const approvalStatus = product.customFields?.approvalStatus || 'pending';
            const price = variant?.priceWithTax ? priceFromSubunit(variant.priceWithTax, variant.currencyCode) : 0; // Convert to main unit for comparison
            
            // 1. Search Query (Name, SKU, or Slug)
            const matchesSearch = 
                (product.name || '').toLowerCase().includes(searchQuery.toLowerCase()) || 
                (product.slug || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                (variant?.sku && variant.sku.toLowerCase().includes(searchQuery.toLowerCase()));

            // 2. Category / Collection Filter
            const matchesCategory = 
                filterCategory === 'all' || 
                product.collections?.some((c: any) => c && (c.id === filterCategory || c.name === filterCategory));

            // 3. Status Filter (including out of stock)
            let matchesStatus = true;
            if (filterStatus === 'published') {
                matchesStatus = approvalStatus === 'approved';
            } else if (filterStatus === 'draft') {
                matchesStatus = approvalStatus === 'pending' || approvalStatus === 'rejected';
            } else if (filterStatus === 'outofstock') {
                matchesStatus = !product.variants || product.variants.length === 0 || product.variants.every((v: any) => v && v.stockLevel === 'OUT_OF_STOCK');
            }

            // 4. Price range filters
            const min = priceMin ? Number(priceMin) : null;
            const max = priceMax ? Number(priceMax) : null;
            const matchesPriceMin = min === null || price >= min;
            const matchesPriceMax = max === null || price <= max;

            return matchesSearch && matchesCategory && matchesStatus && matchesPriceMin && matchesPriceMax;
        });
    }, [initialProducts, searchQuery, filterCategory, filterStatus, priceMin, priceMax]);

    // Handle product duplication (simulated client-side)
    const handleDuplicateProduct = (productName: string) => {
        toast.success(`Produit "${productName}" dupliqué avec succès (simulation)`);
    };

    // Helper for stock level indicators
    const getStockIndicator = (product: any) => {
        const variants = product?.variants || [];
        if (variants.length === 0) {
            return { 
                label: 'Sans stock', 
                color: 'bg-slate-300 text-slate-400',
                textClass: 'text-muted-foreground',
                badgeStyle: 'bg-muted text-muted-foreground'
            };
        }

        const isOutOfStock = variants.every((v: any) => v && v.stockLevel === 'OUT_OF_STOCK');
        const isLowStock = variants.some((v: any) => v && v.stockLevel === 'LOW_STOCK');

        if (isOutOfStock) {
            return {
                label: 'Épuisé',
                color: 'bg-red-500',
                textClass: 'text-red-600 font-semibold dark:text-red-400',
                badgeStyle: 'bg-red-50 text-red-700 border-red-100 dark:bg-red-950/20 dark:text-red-400'
            };
        }
        if (isLowStock) {
            return {
                label: 'Stock faible',
                color: 'bg-amber-500',
                textClass: 'text-amber-600 font-semibold dark:text-amber-400',
                badgeStyle: 'bg-amber-50 text-amber-700 border-amber-100 dark:bg-amber-950/20 dark:text-amber-400'
            };
        }
        return {
            label: 'En stock',
            color: 'bg-green-500',
            textClass: 'text-foreground font-medium',
            badgeStyle: 'bg-green-50 text-green-700 border-green-100 dark:bg-green-950/20 dark:text-green-400'
        };
    };

    return (
        <div className="space-y-6">
            
            {/* Toolbar & Add Product Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
                <div>
                    <h1 className="text-2xl md:text-3xl font-serif font-black tracking-tight text-foreground">
                        Mes Produits
                    </h1>
                    <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider mt-0.5">
                        Gérez votre inventaire, mettez à jour vos tarifs et suivez vos stocks
                    </p>
                </div>
                <Link href="/dashboard/products/new" className="shrink-0">
                    <Button className="h-11 px-6 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold flex items-center gap-2 shadow-md transition-all active:scale-95 uppercase text-[10px] tracking-widest">
                        <Plus className="w-4 h-4" />
                        Ajouter un produit
                    </Button>
                </Link>
            </div>

            {/* Advanced Filters Bar (Stitch Layout) */}
            <div className="bg-card p-4 rounded-2xl border border-border flex flex-wrap items-center gap-3.5 shadow-sm transition-colors duration-300">
                
                {/* Text search by name/SKU */}
                <div className="flex-1 min-w-[240px] relative group">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4.5 w-4.5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                    <Input
                        placeholder="Rechercher par nom, SKU ou slug..."
                        className="pl-10 h-11 bg-muted/30 border-border rounded-xl focus-visible:ring-2 focus-visible:ring-primary/10 transition-all font-medium"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>

                {/* Category selector (Collections from Vendure) */}
                <div className="min-w-[160px]">
                    <select
                        value={filterCategory}
                        onChange={(e) => setFilterCategory(e.target.value)}
                        className="h-11 w-full pl-4 pr-10 text-xs font-black uppercase tracking-wider bg-muted/30 border border-border rounded-xl focus:ring-2 focus:ring-primary/10 transition-all cursor-pointer hover:bg-muted/50 outline-none"
                    >
                        <option value="all">Toutes les catégories</option>
                        {collectionTree.map((c: any) => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                    </select>
                </div>

                {/* Status selector */}
                <div className="min-w-[140px]">
                    <select
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value as any)}
                        className="h-11 w-full pl-4 pr-10 text-xs font-black uppercase tracking-wider bg-muted/30 border border-border rounded-xl focus:ring-2 focus:ring-primary/10 transition-all cursor-pointer hover:bg-muted/50 outline-none"
                    >
                        <option value="all">Statuts</option>
                        <option value="published">Publiés</option>
                        <option value="draft">Brouillons</option>
                        <option value="outofstock">En rupture</option>
                    </select>
                </div>

                {/* Price Min/Max Range */}
                <div className="flex items-center border border-border bg-muted/30 rounded-xl px-3 h-11 text-xs font-black uppercase tracking-wider gap-2">
                    <span className="text-muted-foreground">Prix</span>
                    <input 
                        type="number"
                        placeholder="Min" 
                        value={priceMin}
                        onChange={(e) => setPriceMin(e.target.value)}
                        className="w-14 border-none p-0 bg-transparent focus:ring-0 text-xs font-bold text-foreground placeholder:text-muted-foreground/60 outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                    <span className="text-muted-foreground/50">-</span>
                    <input 
                        type="number"
                        placeholder="Max" 
                        value={priceMax}
                        onChange={(e) => setPriceMax(e.target.value)}
                        className="w-14 border-none p-0 bg-transparent focus:ring-0 text-xs font-bold text-foreground placeholder:text-muted-foreground/60 outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                </div>

                {/* Reset button */}
                <button 
                    onClick={handleResetFilters}
                    className="h-11 w-11 flex items-center justify-center border border-border bg-muted/30 hover:bg-muted/80 rounded-xl transition-all active:scale-95 text-muted-foreground hover:text-foreground shrink-0"
                    title="Réinitialiser les filtres"
                >
                    <RefreshCw className="w-4.5 h-4.5" />
                </button>

            </div>

            {/* Products Table Container */}
            <div className="bg-card rounded-[2.5rem] border border-border overflow-hidden shadow-sm transition-colors duration-300">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-muted/30 text-muted-foreground text-[10px] uppercase font-black tracking-wider border-b border-border">
                                <th className="px-6 py-4">Produit</th>
                                <th className="px-6 py-4">Statut</th>
                                <th className="px-6 py-4">Stock</th>
                                <th className="px-6 py-4 text-right">Prix</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {filteredProducts.length > 0 ? (
                                filteredProducts.map((product: any) => {
                                    const variant = product.variants?.[0];
                                    const isPublished = product.enabled !== false;
                                    const stockInfo = getStockIndicator(product);

                                    return (
                                        <tr key={product.id} className="group hover:bg-muted/20 transition-colors">
                                            
                                            {/* Product Column (Image, Title, SKU) */}
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center gap-4">
                                                    {product.featuredAsset ? (
                                                        <img 
                                                            src={product.featuredAsset.preview} 
                                                            alt={product.name} 
                                                            className="h-12 w-12 rounded-xl object-cover border border-border/75 shadow-sm group-hover:scale-105 transition-transform" 
                                                        />
                                                    ) : (
                                                        <div className="h-12 w-12 bg-muted rounded-xl flex items-center justify-center border border-border/75">
                                                            <Package className="h-6 w-6 text-muted-foreground" />
                                                        </div>
                                                    )}
                                                    <div className="flex flex-col">
                                                        <span className="text-sm font-bold text-foreground group-hover:text-primary transition-colors">
                                                            {product.name}
                                                        </span>
                                                        {variant?.sku && (
                                                            <span className="text-[9px] text-slate-400 font-mono uppercase tracking-wider mt-1">
                                                                SKU: {variant.sku}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Status Badge */}
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                {(() => {
                                                    const status = product.customFields?.approvalStatus || 'pending';
                                                    const reason = product.customFields?.rejectionReason;
                                                    
                                                    let badgeLabel = 'En attente';
                                                    let badgeClass = 'bg-amber-50 text-amber-700 border-amber-100 dark:bg-amber-950/20 dark:text-amber-400';
                                                    let circleClass = 'text-amber-500';
                                                    
                                                    if (status === 'approved') {
                                                        badgeLabel = 'En ligne';
                                                        badgeClass = 'bg-green-50 text-green-700 border-green-100 dark:bg-green-950/20 dark:text-green-400';
                                                        circleClass = 'text-green-500';
                                                    } else if (status === 'rejected') {
                                                        badgeLabel = 'Rejeté';
                                                        badgeClass = 'bg-red-50 text-red-700 border-red-100 dark:bg-red-950/20 dark:text-red-400';
                                                        circleClass = 'text-red-500';
                                                    }
                                                    
                                                    return (
                                                        <div className="flex flex-col gap-1.5">
                                                            <Badge 
                                                                variant="outline"
                                                                className={cn(
                                                                    "rounded-full px-3 py-1 text-[9px] font-black gap-1.5 uppercase tracking-wider border w-fit",
                                                                    badgeClass
                                                                )}
                                                                title={status === 'rejected' && reason ? `Motif: ${reason}` : undefined}
                                                            >
                                                                <Circle className={cn("w-1.5 h-1.5 fill-current", circleClass)} />
                                                                {badgeLabel}
                                                            </Badge>
                                                            {status === 'rejected' && reason && (
                                                                <span className="text-[9px] text-red-500 font-bold italic max-w-[150px] truncate" title={reason}>
                                                                    Motif: {reason}
                                                                </span>
                                                            )}
                                                        </div>
                                                    );
                                                })()}
                                            </td>

                                            {/* Stock Indicator */}
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center gap-2">
                                                    <div className={cn("w-2 h-2 rounded-full", stockInfo.color)} />
                                                    <span className={cn("text-xs", stockInfo.textClass)}>
                                                        {stockInfo.label}
                                                    </span>
                                                </div>
                                            </td>

                                            {/* Price in CFA */}
                                            <td className="px-6 py-4 whitespace-nowrap text-right font-serif font-black text-foreground text-sm">
                                                {variant?.priceWithTax ? priceFromSubunit(variant.priceWithTax, variant.currencyCode || 'XOF').toLocaleString('fr-FR') : '0'} F CFA
                                            </td>

                                            {/* Action Buttons (discretes, scale on hover) */}
                                            <td className="px-6 py-4 whitespace-nowrap text-right">
                                                <div className="flex items-center justify-end gap-1">
                                                    <Link href={`/dashboard/products/${product.id}`}>
                                                        <button 
                                                            className="p-2 text-muted-foreground hover:text-primary hover:bg-primary/5 rounded-lg border border-transparent hover:border-border transition-all"
                                                            title="Éditer le produit"
                                                        >
                                                            <Pencil className="w-4 h-4" />
                                                        </button>
                                                    </Link>
                                                    <button 
                                                        onClick={() => handleDuplicateProduct(product.name)}
                                                        className="p-2 text-muted-foreground hover:text-blue-600 hover:bg-blue-50 rounded-lg border border-transparent hover:border-border transition-all"
                                                        title="Dupliquer le produit"
                                                    >
                                                        <Copy className="w-4 h-4" />
                                                    </button>
                                                    <DeleteProductDialog productId={product.id} productName={product.name} />
                                                </div>
                                            </td>

                                        </tr>
                                    );
                                })
                            ) : (
                                <tr>
                                    <td colSpan={5} className="p-16 text-center text-muted-foreground">
                                        <p className="text-sm font-medium">Aucun produit ne correspond aux filtres.</p>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                <div className="px-6 py-4 bg-muted/20 border-t border-border flex justify-between items-center">
                    <p className="text-xs text-muted-foreground">
                        Affichage de <span className="font-bold text-foreground">{filteredProducts.length}</span> sur <span className="font-bold text-foreground">{initialProducts.length}</span> produits
                    </p>
                    <div className="flex items-center gap-2">
                         <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl border border-border bg-card" disabled>
                              <ChevronLeft className="h-4 w-4" />
                         </Button>
                         <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl border border-border bg-card" disabled>
                              <ChevronRight className="h-4 w-4" />
                         </Button>
                    </div>
                </div>
            </div>

            {/* Floating Help Action Button (FAB) (Stitch) */}
            <button 
                onClick={() => toast.info('Ouverture du support Ahizan (simulation)')}
                className="fixed bottom-8 right-8 w-14 h-14 bg-[#0d1c32] text-white rounded-full shadow-2xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all group z-50"
            >
                <HelpCircle className="w-6 h-6 text-white group-hover:scale-105 transition-transform" />
                <span className="absolute right-full mr-4 px-4 py-2 bg-slate-900 text-white text-xs font-bold rounded-xl opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none shadow-xl border border-slate-800">
                    Besoin d'aide ?
                </span>
            </button>

        </div>
    );
}
