'use client';

import React, { useState, useMemo, useEffect } from 'react';
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
    ChevronRight,
    AlertTriangle,
    AlertCircle,
    MessageSquare,
    X,
    Sparkles
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

    const [currentPage, setCurrentPage] = useState(1);
    const [expandedRowId, setExpandedRowId] = useState<string | null>(null);
    const [activeRemarkVariant, setActiveRemarkVariant] = useState<{
        variantName: string;
        productName: string;
        remark: string;
        status?: string;
        productId: string;
    } | null>(null);
    const pageSize = 10;

    // Reset all filters
    const handleResetFilters = () => {
        setSearchQuery('');
        setFilterCategory('all');
        setFilterStatus('all');
        setPriceMin('');
        setPriceMax('');
        setCurrentPage(1);
        toast.info('Filtres réinitialisés');
    };

    // Reset current page when filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery, filterCategory, filterStatus, priceMin, priceMax]);

    // Client-side advanced filtering
    const filteredProducts = useMemo(() => {
        return (initialProducts || []).filter(product => {
            if (!product || !product.variants || product.variants.length === 0) return false;
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

            // IMPORTANT: must return the combined boolean
            return matchesSearch && matchesCategory && matchesStatus && matchesPriceMin && matchesPriceMax;
        });
    }, [initialProducts, searchQuery, filterCategory, filterStatus, priceMin, priceMax]);

    // Paginate products
    const totalPages = Math.ceil(filteredProducts.length / pageSize) || 1;
    const paginatedProducts = useMemo(() => {
        const start = (currentPage - 1) * pageSize;
        return filteredProducts.slice(start, start + pageSize);
    }, [filteredProducts, currentPage, pageSize]);

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
                <div className="flex flex-wrap gap-2.5 shrink-0">
                    <Link href="/dashboard/products/new">
                        <Button className="h-11 px-6 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold flex items-center gap-2.5 shadow-md transition-all active:scale-95 uppercase text-xs tracking-wider cursor-pointer">
                            <Plus className="w-5 h-5" />
                            Ajouter un produit
                        </Button>
                    </Link>
                </div>
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
                                <th className="px-2.5 sm:px-4 md:px-6 py-4">Produit</th>
                                <th className="px-2.5 sm:px-4 md:px-6 py-4">Statut</th>
                                <th className="px-2.5 sm:px-4 md:px-6 py-4">Stock</th>
                                <th className="px-2.5 sm:px-4 md:px-6 py-4 text-right">Prix</th>
                                <th className="px-2.5 sm:px-4 md:px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {paginatedProducts.length > 0 ? (
                                paginatedProducts.map((product: any) => {
                                    const variant = product.variants?.[0];
                                    const isPublished = product.enabled !== false;
                                    const stockInfo = getStockIndicator(product);

                                    return (
                                        <React.Fragment key={product.id}>
                                            <tr className="group hover:bg-muted/20 transition-colors">
                                                
                                                {/* Product Column (Image, Title, SKU) */}
                                                <td className="px-2.5 sm:px-4 md:px-6 py-3.5">
                                                    <div className="flex items-center gap-3">
                                                        {product.variants && product.variants.length > 0 && (
                                                            <button
                                                                type="button"
                                                                onClick={() => setExpandedRowId(expandedRowId === product.id ? null : product.id)}
                                                                className="w-6 h-6 rounded-md bg-muted/60 hover:bg-muted text-muted-foreground flex items-center justify-center text-[10px] font-black transition-all cursor-pointer shrink-0"
                                                                title="Voir les déclinaisons et offres"
                                                            >
                                                                {expandedRowId === product.id ? '▼' : '▶'}
                                                            </button>
                                                        )}
                                                        {product.featuredAsset ? (
                                                            <img 
                                                                src={product.featuredAsset.preview} 
                                                                alt={product.name} 
                                                                className="h-12 w-12 rounded-xl object-cover border border-border/75 shadow-sm group-hover:scale-105 transition-transform shrink-0" 
                                                            />
                                                        ) : (
                                                            <div className="h-12 w-12 bg-muted rounded-xl flex items-center justify-center border border-border/75 shrink-0">
                                                                <Package className="h-6 w-6 text-muted-foreground" />
                                                            </div>
                                                        )}
                                                        <div className="flex flex-col max-w-[90px] sm:max-w-[150px] md:max-w-[240px]">
                                                            <span className="text-sm font-bold text-foreground group-hover:text-primary transition-colors truncate block" title={product.name}>
                                                                {product.name}
                                                            </span>
                                                            <span className="text-[10px] text-muted-foreground font-semibold mt-0.5">
                                                                {product.variants?.length || 1} offre(s) / déclinaison(s)
                                                            </span>
                                                        </div>
                                                    </div>
                                                </td>

                                                {/* Status Badge */}
                                                <td className="px-2.5 sm:px-4 md:px-6 py-3.5 whitespace-nowrap">
                                                    {(() => {
                                                        const status = product.customFields?.approvalStatus || 'pending';
                                                        const reason = product.customFields?.rejectionReason;
                                                        
                                                        // Check for variant corrections
                                                        const variantCorrections = (product.variants || []).filter((v: any) => 
                                                            v.customFields?.offerStatus === 'correction_requested' || 
                                                            v.customFields?.offerStatus === 'rejected' || 
                                                            !!v.customFields?.rejectionReason
                                                        );
                                                        const hasProductCorrection = status === 'correction_requested' || (status === 'rejected' && !!reason);
                                                        const totalCorrections = variantCorrections.length + (hasProductCorrection && variantCorrections.length === 0 ? 1 : 0);

                                                        if (totalCorrections > 0 || status === 'correction_requested') {
                                                            return (
                                                                <div className="flex flex-col gap-1">
                                                                    <Badge 
                                                                        variant="outline"
                                                                        className="rounded-full px-2.5 py-1 text-[9px] font-black gap-1 uppercase tracking-wider border bg-amber-500/15 text-amber-600 border-amber-500/30 animate-pulse w-fit"
                                                                    >
                                                                        <AlertTriangle className="w-3 h-3 text-amber-600" />
                                                                        {totalCorrections > 0 ? `${totalCorrections} correction(s)` : 'Correction demandée'}
                                                                    </Badge>
                                                                    <Link href={`/dashboard/products/${product.id}`} className="text-[10px] text-amber-600 hover:text-amber-700 font-bold hover:underline">
                                                                        Voir remarques ➔
                                                                    </Link>
                                                                </div>
                                                            );
                                                        }
                                                        
                                                        const hasApprovedVariants = (product.variants || []).some((v: any) => {
                                                            const ost = (v.customFields?.offerStatus || v.customFields?.offerstatus || '').toLowerCase();
                                                            return ost === 'approved' || ost === '' || !ost;
                                                        });
                                                        
                                                        let badgeLabel = 'En attente';
                                                        let badgeClass = 'bg-amber-50 text-amber-700 border-amber-100 dark:bg-amber-950/20 dark:text-amber-400';
                                                        let circleClass = 'text-amber-500';
                                                        
                                                        if (status === 'approved' && (hasApprovedVariants || (product.variants || []).length === 0) && product.enabled !== false) {
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
                                                <td className="px-2.5 sm:px-4 md:px-6 py-3.5 whitespace-nowrap">
                                                    <div className="flex items-center gap-2">
                                                        <div className={cn("w-2 h-2 rounded-full", stockInfo.color)} />
                                                        <span className={cn("text-xs", stockInfo.textClass)}>
                                                            {stockInfo.label}
                                                        </span>
                                                    </div>
                                                </td>

                                                {/* Price in CFA */}
                                                <td className="px-2.5 sm:px-4 md:px-6 py-3.5 whitespace-nowrap text-right font-serif font-black text-sm">
                                                    {(() => {
                                                        const hasPromo = variant?.customFields?.onPromotion === true && typeof variant?.customFields?.promotionalPrice === 'number';
                                                        if (hasPromo) {
                                                            const original = priceFromSubunit(variant.priceWithTax, variant.currencyCode || 'XOF');
                                                            const promo = priceFromSubunit(variant.customFields.promotionalPrice, variant.currencyCode || 'XOF');
                                                            return (
                                                                <div className="flex flex-col items-end gap-0.5">
                                                                    <span className="text-red-600 dark:text-red-400 font-bold">
                                                                        {promo.toLocaleString('fr-FR')} F CFA
                                                                    </span>
                                                                    <span className="text-xs text-muted-foreground line-through font-normal">
                                                                        {original.toLocaleString('fr-FR')} F CFA
                                                                    </span>
                                                                </div>
                                                            );
                                                        }
                                                        return (
                                                            <span className="text-foreground">
                                                                {variant?.priceWithTax ? priceFromSubunit(variant.priceWithTax, variant.currencyCode || 'XOF').toLocaleString('fr-FR') : '0'} F CFA
                                                            </span>
                                                        );
                                                    })()}
                                                </td>

                                                {/* Action Buttons */}
                                                <td className="px-2.5 sm:px-4 md:px-6 py-3.5 whitespace-nowrap text-right">
                                                    <div className="flex items-center justify-end gap-1">
                                                        <Link href={`/dashboard/products/${product.id}`}>
                                                            <button 
                                                                className="p-2 text-muted-foreground hover:text-primary hover:bg-primary/5 rounded-lg border border-transparent hover:border-border transition-all cursor-pointer"
                                                                title="Éditer mes offres"
                                                            >
                                                                <Pencil className="w-4 h-4" />
                                                            </button>
                                                        </Link>
                                                        <DeleteProductDialog productId={product.id} productName={product.name} />
                                                    </div>
                                                </td>

                                            </tr>

                                            {/* Expandable Variants Breakdown */}
                                            {expandedRowId === product.id && product.variants && product.variants.length > 0 && (
                                                <tr className="bg-muted/10 border-b border-border">
                                                    <td colSpan={5} className="px-6 py-4">
                                                        <div className="bg-card rounded-2xl border border-border p-4 space-y-3">
                                                            {/* Product-level Admin Remark if any */}
                                                            {product.customFields?.rejectionReason && (
                                                                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-900 dark:text-amber-300 flex items-start gap-2">
                                                                    <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                                                                    <div>
                                                                        <span className="font-bold">Remarque Administrateur sur la fiche :</span> {product.customFields.rejectionReason}
                                                                    </div>
                                                                </div>
                                                            )}

                                                            <div className="text-[11px] font-black uppercase tracking-wider text-muted-foreground flex items-center justify-between">
                                                                <span>Déclinaisons &amp; Offres Actives ({product.variants.length})</span>
                                                                <Link href={`/dashboard/products/${product.id}`} className="text-primary hover:underline font-bold">
                                                                    Modifier les tarifs et stocks ➔
                                                                </Link>
                                                            </div>
                                                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                                                {product.variants.map((v: any, vIdx: number) => {
                                                                    const vPrice = v.priceWithTax ? priceFromSubunit(v.priceWithTax, v.currencyCode || 'XOF') : 0;
                                                                    const vPromo = v.customFields?.onPromotion && v.customFields?.promotionalPrice ? priceFromSubunit(v.customFields.promotionalPrice, v.currencyCode || 'XOF') : null;
                                                                    
                                                                    const optionValues = (v.options || []).map((o: any) => o.name || o.code).filter(Boolean);
                                                                    let optionValuesStr = optionValues.join(' ');
                                                                    if (optionValuesStr.toLowerCase().startsWith(product.name.toLowerCase())) {
                                                                        optionValuesStr = optionValuesStr.slice(product.name.length).replace(/^[\s\-—]+/, '').trim();
                                                                    }

                                                                    const resolvedVariantName = optionValuesStr
                                                                        ? `${product.name} — ${optionValuesStr}`
                                                                        : (v.name && !v.name.includes('Option ') && !v.name.includes('Option 2') && !v.name.startsWith('Option')
                                                                            ? v.name 
                                                                            : `${product.name} (Déclinaison #${vIdx + 1})`);

                                                                    const variantImg = v.featuredAsset?.preview || product.featuredAsset?.preview;
                                                                    const adminReason = v.customFields?.rejectionReason;

                                                                    return (
                                                                        <div key={v.id || vIdx} className={cn(
                                                                            "p-3.5 rounded-xl border flex flex-col justify-between gap-2.5 text-xs transition-all",
                                                                            adminReason 
                                                                                ? "bg-amber-500/10 border-amber-500/40 shadow-xs" 
                                                                                : "bg-muted/20 border-border/80"
                                                                        )}>
                                                                            {/* Admin Rejection / Correction comment notice badge */}
                                                                            {adminReason && (
                                                                                <button
                                                                                    type="button"
                                                                                    onClick={(e: React.MouseEvent) => {
                                                                                        e.stopPropagation();
                                                                                        setActiveRemarkVariant({
                                                                                            variantName: resolvedVariantName,
                                                                                            productName: product.name,
                                                                                            remark: adminReason,
                                                                                            status: v.customFields?.offerStatus,
                                                                                            productId: product.id
                                                                                        });
                                                                                    }}
                                                                                    className="w-full text-left p-2.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-[11px] text-amber-950 dark:text-amber-200 flex items-start gap-2 transition-colors cursor-pointer group/rem"
                                                                                >
                                                                                    <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5 group-hover/rem:scale-110 transition-transform" />
                                                                                    <div className="flex-1 min-w-0">
                                                                                        <div className="flex items-center justify-between gap-1 mb-0.5">
                                                                                            <span className="font-bold uppercase tracking-wider text-[10px] text-amber-800 dark:text-amber-300">
                                                                                                ⚠️ Remarque Administrateur
                                                                                            </span>
                                                                                            <span className="text-[10px] font-semibold text-amber-700 underline shrink-0">
                                                                                                Lire ➔
                                                                                            </span>
                                                                                        </div>
                                                                                        <p className="line-clamp-2 text-xs text-amber-900/90 dark:text-amber-200 font-medium">
                                                                                            {adminReason}
                                                                                        </p>
                                                                                    </div>
                                                                                </button>
                                                                            )}

                                                                            <div className="flex items-center justify-between gap-3">
                                                                                <div className="flex items-center gap-2.5 min-w-0">
                                                                                    {variantImg ? (
                                                                                        <img 
                                                                                            src={variantImg} 
                                                                                            alt={resolvedVariantName} 
                                                                                            className="w-10 h-10 rounded-lg object-cover border border-border shrink-0 bg-background"
                                                                                        />
                                                                                    ) : (
                                                                                        <div className="w-10 h-10 rounded-lg bg-muted border border-border flex items-center justify-center text-muted-foreground shrink-0 font-bold text-[10px]">
                                                                                            IMG
                                                                                        </div>
                                                                                    )}
                                                                                    <div className="min-w-0">
                                                                                        <div className="font-bold text-foreground truncate" title={resolvedVariantName}>
                                                                                            {resolvedVariantName}
                                                                                        </div>
                                                                                        {v.sku && <div className="text-[10px] text-muted-foreground font-mono truncate">SKU: {v.sku}</div>}
                                                                                    </div>
                                                                                </div>

                                                                                <div className="text-right shrink-0">
                                                                                    {vPromo ? (
                                                                                        <div>
                                                                                            <div className="font-black text-red-600">{vPromo.toLocaleString('fr-FR')} F</div>
                                                                                            <div className="text-[10px] text-muted-foreground line-through">{vPrice.toLocaleString('fr-FR')} F</div>
                                                                                        </div>
                                                                                    ) : (
                                                                                        <div className="font-black text-foreground">{vPrice.toLocaleString('fr-FR')} F</div>
                                                                                    )}
                                                                                    <div className="text-[10px] text-muted-foreground font-semibold">Stock: {v.stockOnHand ?? 0}</div>
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </React.Fragment>
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
                <div className="p-4 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4 bg-muted/10">
                    <p className="text-xs text-muted-foreground font-medium">
                        Affichage de <span className="font-bold text-foreground">
                            {Math.min((currentPage - 1) * pageSize + 1, filteredProducts.length)}
                        </span> à <span className="font-bold text-foreground">
                            {Math.min(filteredProducts.length, currentPage * pageSize)}
                        </span> sur <span className="font-bold text-foreground">{filteredProducts.length}</span> produits
                    </p>
                    <div className="flex items-center gap-2">
                         <Button 
                             variant="ghost" 
                             size="icon" 
                             className="h-9 w-9 rounded-xl border border-border bg-card cursor-pointer" 
                             onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                             disabled={currentPage === 1}
                         >
                              <ChevronLeft className="h-4 w-4" />
                         </Button>
                         <span className="text-xs font-bold px-2">{currentPage} / {totalPages}</span>
                         <Button 
                             variant="ghost" 
                             size="icon" 
                             className="h-9 w-9 rounded-xl border border-border bg-card cursor-pointer" 
                             onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                             disabled={currentPage === totalPages}
                         >
                              <ChevronRight className="h-4 w-4" />
                         </Button>
                    </div>
                </div>
            </div>

            {/* Admin Remark Detail Modal */}
            {activeRemarkVariant && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
                    <div className="bg-card border border-border rounded-2xl shadow-2xl max-w-lg w-full p-6 space-y-5 animate-in zoom-in-95">
                        <div className="flex items-start justify-between gap-4 border-b border-border/80 pb-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-600 shrink-0">
                                    <MessageSquare className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-base text-foreground">
                                        Remarque de l'Administrateur
                                    </h3>
                                    <p className="text-xs text-muted-foreground">
                                        {activeRemarkVariant.variantName}
                                    </p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setActiveRemarkVariant(null)}
                                className="w-8 h-8 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors cursor-pointer"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="space-y-3">
                            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/25 space-y-2">
                                <span className="font-bold text-xs uppercase tracking-wider text-amber-800 dark:text-amber-300 block">
                                    Message de correction :
                                </span>
                                <p className="text-sm text-amber-950 dark:text-amber-100 font-medium leading-relaxed whitespace-pre-wrap">
                                    {activeRemarkVariant.remark}
                                </p>
                            </div>

                            <p className="text-xs text-muted-foreground leading-relaxed">
                                Veuillez apporter les modifications nécessaires sur cette déclinaison (prix, stock, visuel ou conformité) pour soumettre à nouveau l'offre à l'équipe Ahizan.
                            </p>
                        </div>

                        <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setActiveRemarkVariant(null)}
                                className="rounded-xl"
                            >
                                Fermer
                            </Button>
                            <Link href={`/dashboard/products/${activeRemarkVariant.productId}`}>
                                <Button
                                    type="button"
                                    className="bg-primary text-primary-foreground font-bold rounded-xl gap-2 shadow-sm shadow-primary/20"
                                >
                                    <Pencil className="w-4 h-4" />
                                    Modifier la déclinaison
                                </Button>
                            </Link>
                        </div>
                    </div>
                </div>
            )}

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
