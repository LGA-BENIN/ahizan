'use client';

import React from 'react';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import ImageUploader, { type UploadedAsset } from '@/components/ImageUploader';
import { updateProductAction } from '@/app/dashboard/products/actions';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Package, ImageIcon, Save, X, Trash2, Tag, Star, Percent, CheckCircle2, AlertTriangle, AlertOctagon, AlignLeft, Coins, Loader2, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { priceFromSubunit } from '@/lib/format';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import CategoryCheckboxTree from './category-checkbox-tree';
import { TiptapEditor } from './tiptap-editor';

interface EditProductFormProps {
    product: any;
    collectionTree: any[];
}

interface VariantRow {
    id: string;
    name: string;
    sku: string;
    price: number;
    stock: number;
    onPromotion: boolean;
    promotionalPrice: number;
}

export default function EditProductForm({ product, collectionTree }: EditProductFormProps) {
    const router = useRouter();
    const variant = product.variants?.[0];

    const initialCategoryIds = (product.collections || []).map((coll: any) => String(coll.id));

    const initialVariants: VariantRow[] = (product.variants && product.variants.length > 0)
        ? product.variants.map((v: any, index: number) => ({
            id: String(v.id),
            name: v.name || `${product.name} - Option ${index + 1}`,
            sku: v.sku || '',
            price: v.priceWithTax ? priceFromSubunit(v.priceWithTax, v.currencyCode) : 0,
            stock: v.stockOnHand ?? 0,
            onPromotion: (v.customFields as any)?.onPromotion || false,
            promotionalPrice: (v.customFields as any)?.promotionalPrice ? priceFromSubunit((v.customFields as any).promotionalPrice, v.currencyCode) : 0,
        }))
        : [{ id: 'new_1', name: product.name, sku: '', price: 0, stock: 5, onPromotion: false, promotionalPrice: 0 }];

    const [hasMultipleVariants, setHasMultipleVariants] = useState(initialVariants.length > 1);
    const [variants, setVariants] = useState<VariantRow[]>(initialVariants);

    const [formData, setFormData] = useState({
        name: product.name,
        description: product.description || '',
        shortDescription: product.customFields?.shortDescription || '',
        price: variant?.priceWithTax ? priceFromSubunit(variant.priceWithTax, variant.currencyCode) : 0,
        stock: variant?.stockOnHand !== undefined && variant?.stockOnHand !== null ? variant.stockOnHand : 0,
        sku: variant?.sku || '',
        weight: product.customFields?.weight !== undefined && product.customFields?.weight !== null ? String(product.customFields.weight) : '',
        width: product.customFields?.width !== undefined && product.customFields?.width !== null ? String(product.customFields.width) : '',
        height: product.customFields?.height !== undefined && product.customFields?.height !== null ? String(product.customFields.height) : '',
        parentCategory: '',
        category: JSON.stringify(initialCategoryIds),
        enabled: product.enabled !== false || product.customFields?.approvalStatus === 'pending' || product.customFields?.approvalStatus === 'rejected',
        onPromotion: (variant?.customFields as any)?.onPromotion || false,
        promotionalPrice: (variant?.customFields as any)?.promotionalPrice ? priceFromSubunit((variant.customFields as any).promotionalPrice, variant.currencyCode) : 0,
    });
    const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>(initialCategoryIds);
    const [assetIds, setAssetIds] = useState<string[]>(product.assets.map((a: any) => a.id));
    const [previewImages, setPreviewImages] = useState(product.assets.map((a: any) => ({ id: a.id, preview: a.preview })));
    const [featuredAssetId, setFeaturedAssetId] = useState<string | null>(
        product.featuredAsset?.id || (product.assets.length > 0 ? product.assets[0].id : null)
    );
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [facetValueIds, setFacetValueIds] = useState<string[]>(
        (product.facetValues || []).map((fv: any) => String(fv.id))
    );
    const [allowedFacets, setAllowedFacets] = useState<any[]>([]);
    const [loadingFacets, setLoadingFacets] = useState(false);

    const handleAddVariant = () => {
        setVariants(prev => [
            ...prev,
            {
                id: `new_${Date.now()}`,
                name: '',
                sku: '',
                price: formData.price,
                stock: formData.stock,
                onPromotion: false,
                promotionalPrice: 0,
            }
        ]);
    };

    const handleRemoveVariant = (id: string) => {
        if (variants.length <= 1) {
            toast.warning('Le produit doit avoir au moins une déclinaison');
            return;
        }
        setVariants(prev => prev.filter(v => v.id !== id));
    };

    const handleVariantChange = (id: string, field: keyof VariantRow, value: any) => {
        setVariants(prev => prev.map(v => v.id === id ? { ...v, [field]: value } : v));
    };

    // Fetch allowed facets for a collection
    const fetchAllowedFacets = async (collectionIds: string[]) => {
        if (!collectionIds || collectionIds.length === 0) { setAllowedFacets([]); return; }
        setLoadingFacets(true);
        try {
            const { query } = await import('@/lib/vendure/api');
            const { GetCollectionAllowedFacetsQuery } = await import('@/lib/vendure/queries');
            const results = await Promise.all(
                collectionIds.map((id: string) => query(GetCollectionAllowedFacetsQuery, { collectionId: id }).catch((err: any) => {
                    console.error('[EditProductForm] Failed to fetch allowed facets for', id, err);
                    return { data: null };
                }))
            );
            const allFacetsMap = new Map();
            for (const res of results) {
                const mapping = (res.data as any)?.collectionAllowedFacets;
                if (mapping?.allowedFacets) {
                    for (const facet of mapping.allowedFacets) {
                        allFacetsMap.set(facet.id, facet);
                    }
                }
            }
            setAllowedFacets(Array.from(allFacetsMap.values()));
        } catch (err) {
            console.error('[EditProductForm] Failed to fetch allowed facets:', err);
            setAllowedFacets([]);
        } finally {
            setLoadingFacets(false);
        }
    };

    // Initialize allowed facets on mount
    useEffect(() => {
        if (initialCategoryIds.length > 0) {
            fetchAllowedFacets(initialCategoryIds);
        }
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const handleCategoriesChange = (ids: string[]) => {
        setSelectedCategoryIds(ids);
        setFormData((prev: any) => ({ ...prev, category: JSON.stringify(ids) }));
        setFacetValueIds([]);
        fetchAllowedFacets(ids);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            const data = new FormData();
            data.append('id', product.id);
            if (variant) data.append('variantId', variant.id);

            data.append('name', formData.name);
            data.append('description', formData.description);
            data.append('shortDescription', formData.shortDescription);
            data.append('price', formData.price.toString());
            data.append('stock', formData.stock.toString());
            data.append('sku', formData.sku);
            data.append('weight', formData.weight);
            data.append('width', formData.width);
            data.append('height', formData.height);
            data.append('category', formData.category);
            data.append('enabled', formData.enabled.toString());
            data.append('assetIds', JSON.stringify(assetIds));
            data.append('featuredAssetId', featuredAssetId || '');
            data.append('facetValueIds', JSON.stringify(facetValueIds));
            data.append('onPromotion', formData.onPromotion.toString());
            data.append('promotionalPrice', formData.promotionalPrice.toString());
            if (hasMultipleVariants && variants.length > 0) {
                data.append('variants', JSON.stringify(variants));
            }

            const result = await updateProductAction(null, data);

            if (result.success) {
                toast.success('Produit mis à jour avec succès');
                router.push('/dashboard/products');
                router.refresh();
            } else {
                toast.error('Erreur: ' + result.error);
            }
        } catch (err) {
            console.error('Error updating product:', err);
            toast.error('Erreur inattendue');
        } finally {
            setIsSubmitting(false);
        }
    };

    const removeAsset = (assetId: string) => {
        setAssetIds(assetIds.filter(id => id !== assetId));
        setPreviewImages(previewImages.filter((a: any) => a.id !== assetId));
        if (featuredAssetId === assetId) {
            const remaining = assetIds.filter(id => id !== assetId);
            setFeaturedAssetId(remaining.length > 0 ? remaining[0] : null);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="max-w-6xl mx-auto space-y-8 pb-20">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                
                {/* Left Column: Product Info & Facets (7 Cols) */}
                <div className="lg:col-span-7 space-y-8">
                    {/* Section: Identité */}
                    <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm">
                        <div className="px-6 py-4 bg-muted/30 border-b border-border flex items-center gap-2">
                            <Tag className="w-4 h-4 text-primary" />
                            <h3 className="text-xs font-black uppercase tracking-widest text-foreground">Modifier l'identité du produit</h3>
                        </div>
                        <div className="p-6 sm:p-8 space-y-6">
                            <div className="space-y-2">
                                <Label htmlFor="name" className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Nom du produit *</Label>
                                <Input
                                    id="name"
                                    required
                                    className="h-12 rounded-xl bg-card border-border focus-visible:ring-2 focus-visible:ring-primary/10 transition-all duration-300"
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                />
                            </div>

                            {/* Visibility Switch */}
                            {(() => {
                                const isPendingOrRejected = product.customFields?.approvalStatus === 'pending' || product.customFields?.approvalStatus === 'rejected';
                                return (
                                    <div className="flex items-center justify-between p-4 bg-muted/5 border border-border rounded-xl shadow-sm">
                                        <div className="space-y-0.5">
                                            <Label htmlFor="enabled" className="text-xs font-bold text-foreground">Visibilité du produit</Label>
                                            <p className="text-[9px] text-muted-foreground uppercase tracking-widest font-black">
                                                {isPendingOrRejected 
                                                    ? "Sera visible automatiquement après validation" 
                                                    : (formData.enabled ? "En ligne (visible en boutique)" : "Masqué (brouillon / indisponible)")}
                                            </p>
                                        </div>
                                        <Switch 
                                            id="enabled"
                                            checked={formData.enabled}
                                            disabled={isPendingOrRejected}
                                            onCheckedChange={checked => setFormData({ ...formData, enabled: checked })}
                                        />
                                    </div>
                                );
                            })()}

                            {/* Categories Selection */}
                            <div className="space-y-2">
                                <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Catégories de classement *</Label>
                                <CategoryCheckboxTree
                                    collectionTree={collectionTree}
                                    selectedIds={selectedCategoryIds}
                                    onChange={handleCategoriesChange}
                                />
                            </div>

                            {/* Validation Status Notice */}
                            {(() => {
                                const approvalStatus = product.customFields?.approvalStatus || 'pending';
                                const reason = product.customFields?.rejectionReason;
                                
                                if (approvalStatus === 'pending') {
                                    return (
                                        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 flex items-start gap-3.5 text-amber-800 dark:bg-amber-950/20 dark:border-amber-900/30 dark:text-amber-300">
                                            <AlertTriangle className="w-5 h-5 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
                                            <div>
                                                <h4 className="text-xs font-black uppercase tracking-wider">Modération en cours</h4>
                                                <p className="text-xs mt-1 leading-relaxed font-medium">Ce produit est actuellement en cours d'examen par nos équipes. Il sera mis en ligne dès validation.</p>
                                            </div>
                                        </div>
                                    );
                                }
                                
                                if (approvalStatus === 'approved') {
                                    return (
                                        <div className="bg-green-50 border border-green-200 rounded-2xl p-5 flex items-start gap-3.5 text-green-800 dark:bg-green-950/20 dark:border-green-900/30 dark:text-green-300">
                                            <CheckCircle2 className="w-5 h-5 shrink-0 text-green-600 dark:text-green-400 mt-0.5" />
                                            <div>
                                                <h4 className="text-xs font-black uppercase tracking-wider">Produit Approuvé</h4>
                                                <p className="text-xs mt-1 leading-relaxed font-medium">Ce produit est validé et visible publiquement sur la plateforme.</p>
                                            </div>
                                        </div>
                                    );
                                }
                                
                                if (approvalStatus === 'rejected') {
                                    return (
                                        <div className="bg-red-50 border border-red-200 rounded-2xl p-5 flex items-start gap-3.5 text-red-800 dark:bg-red-950/20 dark:border-red-900/30 dark:text-red-300">
                                            <AlertOctagon className="w-5 h-5 shrink-0 text-red-600 dark:text-red-400 mt-0.5" />
                                            <div>
                                                <h4 className="text-xs font-black uppercase tracking-wider">Produit Refusé</h4>
                                                <p className="text-xs mt-1 leading-relaxed font-medium">Ce produit n'a pas été validé par la modération.</p>
                                                {reason && (
                                                    <div className="mt-2 text-xs font-semibold bg-red-100/50 dark:bg-red-950/40 p-3 rounded-lg border border-red-200/50 dark:border-red-900/30">
                                                        Motif : {reason}
                                                    </div>
                                                )}
                                                <p className="text-[9px] font-black uppercase tracking-wider mt-3 text-red-750">Corrigez les informations ci-dessous et enregistrez pour le soumettre à nouveau.</p>
                                            </div>
                                        </div>
                                    );
                                }
                                return null;
                            })()}

                            {/* Short Description */}
                            <div className="space-y-2">
                                <Label htmlFor="shortDescription" className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Description Courte (max. 180 caractères)</Label>
                                <Textarea
                                    id="shortDescription"
                                    rows={2}
                                    maxLength={180}
                                    className="rounded-xl bg-card border-border resize-none min-h-[70px] focus-visible:ring-2 focus-visible:ring-primary/10 transition-all duration-300"
                                    value={formData.shortDescription}
                                    onChange={e => setFormData({ ...formData, shortDescription: e.target.value })}
                                    placeholder="Une phrase simple et attrayante pour présenter votre produit..."
                                />
                                <div className="text-right text-[9px] font-bold text-muted-foreground uppercase tracking-widest mt-1">
                                    {formData.shortDescription.length}/180 caractères
                                </div>
                            </div>

                            {/* Long Description using Tiptap */}
                            <div className="space-y-2">
                                <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Description Détaillée</Label>
                                <TiptapEditor
                                    value={formData.description}
                                    onChange={(html: string) => setFormData(prev => ({ ...prev, description: html }))}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Section: Logistique & Dimensions */}
                    <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm">
                        <div className="px-6 py-4 bg-muted/30 border-b border-border flex items-center gap-2">
                            <Package className="w-4 h-4 text-primary" />
                            <h3 className="text-xs font-black uppercase tracking-widest text-foreground">Logistique & Dimensions (Optionnel)</h3>
                        </div>
                        <div className="p-6 sm:p-8 space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Code Article (SKU)</Label>
                                    <Input
                                        value={formData.sku}
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, sku: e.target.value })}
                                        placeholder="Ex: PRD-TSHIRT-001"
                                        className="h-11 rounded-xl bg-card border-border font-mono text-sm"
                                        autoComplete="off"
                                    />
                                    <p className="text-[9px] text-muted-foreground">Généré automatiquement si laissé vide.</p>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Poids (kg)</Label>
                                    <Input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        value={formData.weight}
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, weight: e.target.value })}
                                        placeholder="Ex: 0.5"
                                        className="h-11 rounded-xl bg-card border-border text-sm"
                                        autoComplete="off"
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Largeur (cm)</Label>
                                    <Input
                                        type="number"
                                        step="0.1"
                                        min="0"
                                        value={formData.width}
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, width: e.target.value })}
                                        placeholder="Ex: 20"
                                        className="h-11 rounded-xl bg-card border-border text-sm"
                                        autoComplete="off"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Hauteur (cm)</Label>
                                    <Input
                                        type="number"
                                        step="0.1"
                                        min="0"
                                        value={formData.height}
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, height: e.target.value })}
                                        placeholder="Ex: 15"
                                        className="h-11 rounded-xl bg-card border-border text-sm"
                                        autoComplete="off"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Section: Déclinaisons & Variantes Multiples */}
                    <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm">
                        <div className="px-6 py-4 bg-muted/30 border-b border-border flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Tag className="w-4 h-4 text-primary" />
                                <h3 className="text-xs font-black uppercase tracking-widest text-foreground">Déclinaisons & Variantes ({variants.length})</h3>
                            </div>
                            <div className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    id="hasMultipleVariants"
                                    checked={hasMultipleVariants}
                                    onChange={(e) => setHasMultipleVariants(e.target.checked)}
                                    className="w-4 h-4 rounded border-border text-primary focus:ring-primary cursor-pointer"
                                />
                                <Label htmlFor="hasMultipleVariants" className="text-xs font-bold text-foreground cursor-pointer">
                                    Plusieurs options (Tailles, Couleurs...)
                                </Label>
                            </div>
                        </div>
                        {hasMultipleVariants && (
                            <div className="p-6 space-y-4 animate-in fade-in duration-300">
                                <p className="text-xs text-muted-foreground font-medium">
                                    Définissez les différentes options pour ce produit avec leur prix et stock respectifs.
                                </p>
                                <div className="space-y-3">
                                    {variants.map((v: VariantRow, index: number) => (
                                        <div key={v.id} className="p-4 rounded-xl border border-border bg-muted/10 space-y-3">
                                            <div className="flex items-center justify-between gap-3">
                                                <span className="text-xs font-black text-foreground">Déclinaison #{index + 1}</span>
                                                {variants.length > 1 && (
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => handleRemoveVariant(v.id)}
                                                        className="h-7 text-xs text-destructive hover:bg-destructive/10"
                                                    >
                                                        Supprimer
                                                    </Button>
                                                )}
                                            </div>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                <div>
                                                    <Label className="text-[10px] font-bold text-muted-foreground uppercase">Nom / Option (ex: XL - Bleu)</Label>
                                                    <Input
                                                        value={v.name}
                                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleVariantChange(v.id, 'name', e.target.value)}
                                                        placeholder="Ex: Taille XL"
                                                        className="h-10 rounded-lg text-sm mt-1"
                                                    />
                                                </div>
                                                <div>
                                                    <Label className="text-[10px] font-bold text-muted-foreground uppercase">SKU (Code Article)</Label>
                                                    <Input
                                                        value={v.sku}
                                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleVariantChange(v.id, 'sku', e.target.value)}
                                                        placeholder="Optionnel"
                                                        className="h-10 rounded-lg font-mono text-sm mt-1"
                                                    />
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-2 gap-3">
                                                <div>
                                                    <Label className="text-[10px] font-bold text-muted-foreground uppercase">Prix (CFA) *</Label>
                                                    <Input
                                                        type="number"
                                                        min="0"
                                                        value={v.price || ''}
                                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleVariantChange(v.id, 'price', Math.max(0, parseInt(e.target.value) || 0))}
                                                        placeholder="0"
                                                        className="h-10 rounded-lg font-bold text-sm mt-1"
                                                    />
                                                </div>
                                                <div>
                                                    <Label className="text-[10px] font-bold text-muted-foreground uppercase">Stock *</Label>
                                                    <Input
                                                        type="number"
                                                        min="0"
                                                        value={v.stock || ''}
                                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleVariantChange(v.id, 'stock', Math.max(0, parseInt(e.target.value) || 0))}
                                                        placeholder="5"
                                                        className="h-10 rounded-lg font-bold text-sm mt-1"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={handleAddVariant}
                                    className="w-full rounded-xl border-dashed h-11 text-xs font-bold uppercase tracking-wider"
                                >
                                    + Ajouter une déclinaison
                                </Button>
                            </div>
                        )}
                    </div>

                    {/* Section: Caractéristiques (Facet Values) */}
                    {selectedCategoryIds.length > 0 && (
                        <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm">
                            <div className="px-6 py-4 bg-muted/30 border-b border-border flex flex-col gap-1">
                                <div className="flex items-center gap-2">
                                    <AlignLeft className="w-4 h-4 text-primary" />
                                    <h3 className="text-xs font-black uppercase tracking-widest text-foreground">Attributs & Spécifications</h3>
                                </div>
                                <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Sélectionnez les détails techniques pour optimiser les filtres client.</p>
                            </div>
                            <div className="p-6 sm:p-8">
                                {loadingFacets ? (
                                    <div className="flex items-center gap-2 text-xs text-muted-foreground py-4 animate-pulse">
                                        <Loader2 className="w-4 h-4 animate-spin text-primary" />
                                        <span>Recherche des attributs disponibles...</span>
                                    </div>
                                ) : allowedFacets.length === 0 ? (
                                    <p className="text-xs text-muted-foreground py-4 italic">Aucun attribut spécifique n'est disponible pour ces catégories.</p>
                                ) : (
                                    <div className="space-y-4">
                                        {allowedFacets.map((facet: any) => {
                                            const selectedFvId = facetValueIds.find((id: string) =>
                                                facet.values?.some((fv: any) => String(fv.id) === id)
                                            );
                                            const isBadgeStyle = facet.values && facet.values.length <= 6;
                                            return (
                                                <div key={facet.id} className="p-4 border border-border/60 rounded-xl bg-muted/10 hover:bg-muted/20 transition-colors">
                                                    <Label className="text-xs font-bold text-foreground mb-2 block">
                                                        {facet.name}
                                                        <span className="text-[10px] text-muted-foreground font-normal ml-1">(Sélectionnez une option)</span>
                                                    </Label>
                                                    {(() => {
                                                        const autreKey = `autre:${facet.id}`;
                                                        const autreTextKey = facetValueIds.find((id: string) => id.startsWith(`autre:${facet.id}:`));
                                                        const autreSelected = selectedFvId === autreKey || !!autreTextKey;
                                                        return isBadgeStyle ? (
                                                            <div className="space-y-2">
                                                                <div className="flex flex-wrap gap-2 mt-2">
                                                                    {facet.values.map((fv: any) => {
                                                                        const isSelected = selectedFvId === String(fv.id);
                                                                        return (
                                                                            <button
                                                                                key={String(fv.id)}
                                                                                type="button"
                                                                                onClick={() => {
                                                                                    setFacetValueIds((prev: string[]) => {
                                                                                        const without = prev.filter(id => !facet.values?.some((fv2: any) => String(fv2.id) === id) && !id.startsWith(`autre:${facet.id}`));
                                                                                        return isSelected ? without : [...without, String(fv.id)];
                                                                                    });
                                                                                }}
                                                                                className={`px-3 py-1.5 text-xs font-semibold rounded-full border transition-all duration-200 cursor-pointer ${
                                                                                    isSelected
                                                                                        ? "bg-primary text-primary-foreground border-primary shadow-sm hover:bg-primary/95"
                                                                                        : "bg-background text-muted-foreground border-border hover:bg-muted hover:text-foreground"
                                                                                }`}
                                                                            >
                                                                                {fv.name}
                                                                            </button>
                                                                        );
                                                                    })}
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => {
                                                                            setFacetValueIds((prev: string[]) => {
                                                                                const without = prev.filter(id => !facet.values?.some((fv2: any) => String(fv2.id) === id) && !id.startsWith(`autre:${facet.id}`));
                                                                                return autreSelected ? without : [...without, autreKey];
                                                                            });
                                                                        }}
                                                                        className={`px-3 py-1.5 text-xs font-semibold rounded-full border border-dashed transition-all duration-200 cursor-pointer ${
                                                                            autreSelected
                                                                                ? "bg-primary/10 text-primary border-primary"
                                                                                : "bg-background text-muted-foreground border-muted-foreground/40 hover:bg-muted"
                                                                        }`}
                                                                    >
                                                                        ✏️ Autre
                                                                    </button>
                                                                </div>
                                                                {autreSelected && (
                                                                    <input
                                                                        type="text"
                                                                        placeholder={`Préciser la valeur pour ${facet.name}…`}
                                                                        defaultValue={autreTextKey ? autreTextKey.split(':').slice(2).join(':') : ''}
                                                                        className="w-full h-10 rounded-xl border border-primary/40 bg-background px-3 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary/20"
                                                                        onChange={(e) => {
                                                                            const val = e.target.value;
                                                                            setFacetValueIds((prev: string[]) => {
                                                                                const without = prev.filter(id => !id.startsWith(`autre:${facet.id}`));
                                                                                return val.trim() ? [...without, `autre:${facet.id}:${val}`] : [...without, autreKey];
                                                                            });
                                                                        }}
                                                                    />
                                                                )}
                                                            </div>
                                                        ) : (
                                                            <div className="space-y-2">
                                                                <Select
                                                                    value={autreSelected ? autreKey : (selectedFvId || '')}
                                                                    onValueChange={(v) => {
                                                                        setFacetValueIds((prev: string[]) => {
                                                                            const without = prev.filter(id => !facet.values?.some((fv: any) => String(fv.id) === id) && !id.startsWith(`autre:${facet.id}`));
                                                                            return v ? [...without, v] : without;
                                                                        });
                                                                    }}
                                                                >
                                                                    <SelectTrigger className="h-11 rounded-xl bg-background border-border">
                                                                        <SelectValue placeholder={`Sélectionner ${facet.name}`} />
                                                                    </SelectTrigger>
                                                                    <SelectContent className="rounded-xl">
                                                                        {facet.values?.map((fv: any) => (
                                                                            <SelectItem key={String(fv.id)} value={String(fv.id)}>{fv.name}</SelectItem>
                                                                        ))}
                                                                        <SelectItem value={autreKey}>✏️ Autre</SelectItem>
                                                                    </SelectContent>
                                                                </Select>
                                                                {autreSelected && (
                                                                    <input
                                                                        type="text"
                                                                        placeholder={`Préciser la valeur pour ${facet.name}…`}
                                                                        defaultValue={autreTextKey ? autreTextKey.split(':').slice(2).join(':') : ''}
                                                                        className="w-full h-10 rounded-xl border border-primary/40 bg-background px-3 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary/20"
                                                                        onChange={(e) => {
                                                                            const val = e.target.value;
                                                                            setFacetValueIds((prev: string[]) => {
                                                                                const without = prev.filter(id => !id.startsWith(`autre:${facet.id}`));
                                                                                return val.trim() ? [...without, `autre:${facet.id}:${val}`] : [...without, autreKey];
                                                                            });
                                                                        }}
                                                                    />
                                                                )}
                                                            </div>
                                                        );
                                                    })()}
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Right Column: Pricing, Inventory & Media (5 Cols) */}
                <div className="lg:col-span-5 space-y-8">
                    {/* Section: Tarification & Stock */}
                    <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm">
                        <div className="px-6 py-4 bg-muted/30 border-b border-border flex items-center gap-2">
                            <Coins className="w-4 h-4 text-primary" />
                            <h3 className="text-xs font-black uppercase tracking-widest text-foreground">Tarification & Stock</h3>
                        </div>
                        <div className="p-6 sm:p-8 space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="price" className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Prix de vente (CFA) *</Label>
                                    <Input
                                        id="price"
                                        type="number"
                                        min="0"
                                        required
                                        className="h-12 rounded-xl bg-card border-border font-bold text-lg focus-visible:ring-2"
                                        value={formData.price}
                                        onChange={e => setFormData({ ...formData, price: Math.max(0, parseInt(e.target.value) || 0) })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="stock" className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Stock Restant</Label>
                                    <Input
                                        id="stock"
                                        type="number"
                                        min="0"
                                        required
                                        className="h-12 rounded-xl bg-card border-border font-bold text-lg focus-visible:ring-2"
                                        value={formData.stock}
                                        onChange={e => setFormData({ ...formData, stock: Math.max(0, parseInt(e.target.value) || 0) })}
                                    />
                                </div>
                            </div>

                            {/* Promotion Config */}
                            <div className="pt-6 border-t border-border space-y-4">
                                <div className="flex items-center gap-3">
                                    <input
                                        type="checkbox"
                                        id="onPromotion"
                                        checked={formData.onPromotion}
                                        onChange={(e) => setFormData({ ...formData, onPromotion: e.target.checked, promotionalPrice: e.target.checked ? formData.promotionalPrice : 0 })}
                                        className="w-5 h-5 rounded border-border text-primary focus:ring-primary cursor-pointer"
                                    />
                                    <Label htmlFor="onPromotion" className="text-xs font-bold uppercase tracking-wider text-foreground cursor-pointer">Activer une promotion</Label>
                                </div>

                                {formData.onPromotion && (
                                    <div className="grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-4 duration-300">
                                        <div className="space-y-2">
                                            <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Prix Promotionnel (CFA)</Label>
                                            <Input
                                                type="number"
                                                min="0"
                                                value={formData.promotionalPrice || ''}
                                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                                                    const value = Math.max(0, parseInt(e.target.value) || 0);
                                                    if (value > formData.price) {
                                                        return; // Prevent promotional price from being higher than original price
                                                    }
                                                    setFormData({ ...formData, promotionalPrice: value });
                                                }}
                                                className="h-12 rounded-xl bg-card border-border font-bold text-lg focus-visible:ring-2"
                                                max={formData.price}
                                            />
                                            {formData.promotionalPrice > formData.price && (
                                                <p className="text-xs text-destructive">Doit être inférieur au prix initial</p>
                                            )}
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Réduction</Label>
                                            <div className="h-12 rounded-xl bg-muted/30 border border-border flex items-center px-4">
                                                <Percent className="w-4 h-4 text-primary mr-2" />
                                                <span className="font-bold text-lg text-primary">
                                                    {formData.price > 0 && formData.promotionalPrice > 0
                                                        ? Math.round(((formData.price - formData.promotionalPrice) / formData.price) * 100)
                                                        : 0}%
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Section: Photos */}
                    <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm">
                        <div className="px-6 py-4 bg-muted/30 border-b border-border flex items-center gap-2">
                            <ImageIcon className="w-4 h-4 text-primary" />
                            <h3 className="text-xs font-black uppercase tracking-widest text-foreground">Gestion des photos</h3>
                        </div>
                        <div className="p-6 sm:p-8 space-y-6">
                            {/* Gallery Preview Grid */}
                            <div className="grid grid-cols-2 gap-4">
                                {previewImages.map((asset: any) => (
                                    <div key={asset.id} className="group relative aspect-[4/3] rounded-xl overflow-hidden border border-border/80 shadow-inner">
                                        <img src={asset.preview} alt="Produit" className="w-full h-full object-cover" />
                                        <button 
                                            type="button"
                                            onClick={() => setFeaturedAssetId(asset.id)}
                                            className={`absolute top-2 left-2 p-1.5 rounded-full shadow-md transition-all cursor-pointer ${
                                                featuredAssetId === asset.id 
                                                    ? 'bg-primary text-white' 
                                                    : 'bg-white/90 text-muted-foreground hover:bg-white'
                                            }`}
                                            title={featuredAssetId === asset.id ? 'Photo principale' : 'Définir comme principale'}
                                        >
                                            <Star className={`w-3.5 h-3.5 ${featuredAssetId === asset.id ? 'fill-yellow-400 text-yellow-400' : ''}`} />
                                        </button>
                                        <button 
                                            type="button"
                                            onClick={() => removeAsset(asset.id)}
                                            className="absolute top-2 right-2 bg-destructive text-destructive-foreground rounded-md p-1.5 opacity-0 group-hover:opacity-100 transition-opacity shadow-md cursor-pointer hover:bg-destructive/90"
                                            title="Supprimer la photo"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                ))}
                            </div>

                            {/* Uploader */}
                            <div className="p-4 rounded-xl border border-border border-dashed bg-muted/5">
                                <ImageUploader 
                                    assets={previewImages}
                                    featuredAssetId={featuredAssetId}
                                    onAssetsChange={(newAssets) => {
                                        setPreviewImages(newAssets);
                                        setAssetIds(newAssets.map(a => a.id));
                                    }}
                                    onFeaturedChange={setFeaturedAssetId}
                                />
                            </div>

                            {/* Actions Buttons */}
                            <div className="pt-6 border-t border-border flex flex-col gap-3">
                                <Button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="w-full h-12 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold text-xs uppercase tracking-widest shadow-lg shadow-primary/20 flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-95"
                                >
                                    <Save className="w-4 h-4" />
                                    {isSubmitting ? 'Enregistrement en cours...' : 'Enregistrer les modifications'}
                                </Button>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    onClick={() => router.back()}
                                    className="w-full h-11 text-[10px] font-bold uppercase tracking-widest text-muted-foreground hover:bg-muted transition-colors cursor-pointer"
                                >
                                    Annuler & Retour
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </form>
    );
}
