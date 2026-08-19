'use client';

import React from 'react';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import ImageUploader, { type UploadedAsset } from '@/components/ImageUploader';
import { createProductAction } from '@/app/dashboard/products/actions';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
    CheckCircle2,
    X,
    ImageIcon,
    Tag,
    Coins,
    Loader2,
    Percent,
    AlignLeft
} from 'lucide-react';
import { cn } from '@/lib/utils';
import CategoryCheckboxTree from './category-checkbox-tree';

import { TiptapEditor } from './tiptap-editor';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface CreateProductFormProps {
    collectionTree: any[];
    onSuccess?: () => void;
    className?: string;
}

export default function CreateProductForm({ collectionTree, onSuccess, className }: CreateProductFormProps) {
    const router = useRouter();
    const [isConfirmingCancel, setIsConfirmingCancel] = useState(false);
    const [formKey, setFormKey] = useState(0); // Used to force reset sub-components like ImageUploader
    
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        shortDescription: '',
        price: 0,
        stock: 5,
        parentCategory: '',
        category: '',
        onPromotion: false,
        promotionalPrice: 0,
    });
    const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);
    const [assets, setAssets] = useState<UploadedAsset[]>([]);
    const [featuredAssetId, setFeaturedAssetId] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isUploadingAssets, setIsUploadingAssets] = useState(false);
    const [facetValueIds, setFacetValueIds] = useState<string[]>([]);
    const [allowedFacets, setAllowedFacets] = useState<any[]>([]);
    const [loadingFacets, setLoadingFacets] = useState(false);

    // Force reset on mount to avoid stale data from browser cache/Next navigation
    useEffect(() => {
        handleReset();
    }, []);

    const handleReset = () => {
        setFormData({
            name: '',
            description: '',
            shortDescription: '',
            price: 0,
            stock: 5,
            parentCategory: '',
            category: '',
            onPromotion: false,
            promotionalPrice: 0,
        });
        setSelectedCategoryIds([]);
        setAssets([]);
        setFeaturedAssetId(null);
        setFormKey((prev: number) => prev + 1);
        setIsSubmitting(false);
    };

    const handleCategoriesChange = (ids: string[]) => {
        setSelectedCategoryIds(ids);
        setFormData((prev: any) => ({ ...prev, category: JSON.stringify(ids) }));
        setFacetValueIds([]);
        fetchAllowedFacets(ids);
    };

    // Fetch allowed facets for a collection
    const fetchAllowedFacets = async (collectionIds: string[]) => {
        if (!collectionIds || collectionIds.length === 0) { setAllowedFacets([]); return; }
        setLoadingFacets(true);
        try {
            const { query } = await import('@/lib/vendure/api');
            const { GetCollectionAllowedFacetsQuery } = await import('@/lib/vendure/queries');
            const results = await Promise.all(
                collectionIds.map((id: string) => query(GetCollectionAllowedFacetsQuery, { collectionId: id }).catch(err => {
                    console.error('[CreateProductForm] Failed to fetch allowed facets for', id, err);
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
            console.error('[CreateProductForm] Failed to fetch allowed facets:', err);
            setAllowedFacets([]);
        } finally {
            setLoadingFacets(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (isUploadingAssets) {
            toast.warning('Veuillez patienter la fin de l\'envoi des images');
            return;
        }

        if (!formData.name || selectedCategoryIds.length === 0) {
            toast.error('Veuillez remplir les informations obligatoires');
            return;
        }

        setIsSubmitting(true);
        try {
            const data = new FormData();
            data.append('name', formData.name);
            data.append('description', formData.description);
            data.append('shortDescription', formData.shortDescription);
            data.append('price', formData.price.toString());
            data.append('stock', formData.stock.toString());
            data.append('category', formData.category);
            data.append('assetIds', JSON.stringify(assets.map((a: any) => a.id)));
            data.append('featuredAssetId', featuredAssetId || '');
            data.append('facetValueIds', JSON.stringify(facetValueIds));
            data.append('onPromotion', formData.onPromotion.toString());
            data.append('promotionalPrice', formData.promotionalPrice.toString());

            const result = await createProductAction(null, data);

            if (result.success) {
                toast.success('Produit créé avec succès');
                handleReset();
                router.refresh();
                router.push('/dashboard/products');
            } else {
                toast.error('Erreur: ' + (result as any).error);
                setIsSubmitting(false);
            }
        } catch (err) {
            console.error('Error creating product:', err);
            toast.error('Erreur inattendue');
            setIsSubmitting(false);
        }
    };

    return (
        <div className={cn("max-w-6xl mx-auto space-y-8 pb-20", className)}>
            <form onSubmit={handleSubmit} autoComplete="off" className="grid grid-cols-1 lg:grid-cols-12 gap-8">

                {/* Left Column: Product Info & Facets (7 Cols) */}
                <div className="lg:col-span-7 space-y-8">
                    {/* Section: Identité */}
                    <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm">
                        <div className="px-6 py-4 bg-muted/30 border-b border-border flex items-center gap-2">
                            <Tag className="w-4 h-4 text-primary" />
                            <h3 className="text-xs font-black uppercase tracking-widest text-foreground">Identité du Produit</h3>
                        </div>
                        <div className="p-6 sm:p-8 space-y-6">
                            <div className="space-y-2">
                                <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Nom du produit *</Label>
                                <Input
                                    value={formData.name}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, name: e.target.value })}
                                    placeholder="Ex: Panier Tressé"
                                    className="h-12 rounded-xl bg-card border-border focus-visible:ring-2 focus-visible:ring-primary/10 transition-all duration-300"
                                    autoComplete="off"
                                    name={`name-${formKey}`}
                                />
                            </div>
                            
                            <div className="space-y-2">
                                <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Catégories de classement *</Label>
                                <CategoryCheckboxTree
                                    collectionTree={collectionTree}
                                    selectedIds={selectedCategoryIds}
                                    onChange={handleCategoriesChange}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Description Courte (max. 180 caractères)</Label>
                                <Textarea
                                    rows={2}
                                    value={formData.shortDescription}
                                    maxLength={180}
                                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setFormData({ ...formData, shortDescription: e.target.value })}
                                    placeholder="Une phrase simple et accrocheuse pour présenter votre produit..."
                                    className="rounded-xl bg-card border-border resize-none min-h-[70px] focus-visible:ring-2 focus-visible:ring-primary/10 transition-all duration-300"
                                    autoComplete="off"
                                    name={`shortDesc-${formKey}`}
                                />
                                <div className="text-right text-[9px] font-bold text-muted-foreground uppercase tracking-widest mt-1">
                                    {formData.shortDescription.length}/180 caractères
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Description Détaillée</Label>
                                <TiptapEditor
                                    value={formData.description}
                                    onChange={(html: string) => setFormData(prev => ({ ...prev, description: html }))}
                                    placeholder="Présentez les spécifications, l'histoire et les avantages de ce produit..."
                                />
                            </div>
                        </div>
                    </div>

                    {/* Section: Caractéristiques (Facet Values) */}
                    {selectedCategoryIds.length > 0 && (
                        <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm">
                            <div className="px-6 py-4 bg-muted/30 border-b border-border flex flex-col gap-1">
                                <div className="flex items-center gap-2">
                                    <AlignLeft className="w-4 h-4 text-primary" />
                                    <h3 className="text-xs font-black uppercase tracking-widest text-foreground">Spécifications & Filtres</h3>
                                </div>
                                <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Sélectionnez les attributs spécifiques pour faciliter la recherche.</p>
                            </div>
                            <div className="p-6 sm:p-8">
                                {loadingFacets ? (
                                    <div className="flex items-center gap-2 text-xs text-muted-foreground py-4 animate-pulse">
                                        <Loader2 className="w-4 h-4 animate-spin text-primary" />
                                        <span>Chargement des spécifications autorisées...</span>
                                    </div>
                                ) : allowedFacets.length === 0 ? (
                                    <p className="text-xs text-muted-foreground py-4 italic">Aucun attribut spécifique n’est défini pour les catégories sélectionnées.</p>
                                ) : (
                                    <div className="space-y-4">
                                        {allowedFacets.map((facet: any) => {
                                            const selectedFvId = facetValueIds.find((id: string) =>
                                                facet.values?.some((fv: any) => String(fv.id) === id)
                                            );
                                            const autreKey = `autre:${facet.id}`;
                                            const autreTextKey = facetValueIds.find((id: string) => id.startsWith(`autre:${facet.id}:`));
                                            const autreSelected = selectedFvId === autreKey || !!autreTextKey;
                                            const isBadgeStyle = facet.values && facet.values.length <= 6;
                                            return (
                                                <div key={facet.id} className="p-4 border border-border/60 rounded-xl bg-muted/10 hover:bg-muted/20 transition-colors">
                                                    <Label className="text-xs font-bold text-foreground mb-2 block">
                                                        {facet.name}
                                                        <span className="text-[10px] text-muted-foreground font-normal ml-1">(Sélectionnez une option)</span>
                                                    </Label>
                                                    {isBadgeStyle ? (
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
                                                    )}
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
                    {/* Section: Pricing & Inventory */}
                    <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm">
                        <div className="px-6 py-4 bg-muted/30 border-b border-border flex items-center gap-2">
                            <Coins className="w-4 h-4 text-primary" />
                            <h3 className="text-xs font-black uppercase tracking-widest text-foreground">Tarification & Stock</h3>
                        </div>
                        <div className="p-6 sm:p-8 space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Prix (CFA) *</Label>
                                    <Input
                                        type="number"
                                        min="0"
                                        value={formData.price || ''}
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, price: Math.max(0, parseInt(e.target.value) || 0) })}
                                        className="h-12 rounded-xl bg-card border-border font-bold text-lg focus-visible:ring-2 focus-visible:ring-primary/10 transition-all"
                                        autoComplete="off"
                                        name={`price-${formKey}`}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Stock initial</Label>
                                    <Input
                                        type="number"
                                        min="0"
                                        value={formData.stock || ''}
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, stock: Math.max(0, parseInt(e.target.value) || 0) })}
                                        className="h-12 rounded-xl bg-card border-border font-bold text-lg focus-visible:ring-2 focus-visible:ring-primary/10 transition-all"
                                        autoComplete="off"
                                        name={`stock-${formKey}`}
                                    />
                                </div>
                            </div>

                            {/* Promotional Price Section */}
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
                                            <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Prix Soldé (CFA)</Label>
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
                                                className="h-12 rounded-xl bg-card border-border font-bold text-lg focus-visible:ring-2 focus-visible:ring-primary/10 transition-all"
                                                autoComplete="off"
                                                name={`promotionalPrice-${formKey}`}
                                                max={formData.price}
                                            />
                                            {formData.promotionalPrice > formData.price && (
                                                <p className="text-xs text-destructive">Le prix promotionnel doit être inférieur au prix initial</p>
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

                    {/* Section: Media */}
                    <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm">
                        <div className="px-6 py-4 bg-muted/30 border-b border-border flex items-center gap-2">
                            <ImageIcon className="w-4 h-4 text-primary" />
                            <h3 className="text-xs font-black uppercase tracking-widest text-foreground">Photos du produit</h3>
                        </div>
                        <div className="p-6 sm:p-8 space-y-6">
                            <div className="p-4 rounded-xl border border-border border-dashed bg-muted/5 flex flex-col items-center justify-center gap-4 transition-colors hover:border-primary/50">
                                <ImageUploader
                                    key={formKey}
                                    assets={assets}
                                    featuredAssetId={featuredAssetId}
                                    onAssetsChange={setAssets}
                                    onFeaturedChange={setFeaturedAssetId}
                                    onUploadingChange={setIsUploadingAssets}
                                />
                                {isUploadingAssets && (
                                    <div className="flex items-center gap-2 text-primary font-bold animate-pulse">
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        <span className="text-[9px] uppercase tracking-widest">Envoi des images en cours...</span>
                                    </div>
                                )}
                            </div>

                            <div className="pt-6 border-t border-border mt-8 flex flex-col gap-3">
                                <Button
                                    type="submit"
                                    disabled={isSubmitting || isUploadingAssets}
                                    className="w-full h-12 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs uppercase tracking-widest shadow-lg shadow-primary/10 flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-95"
                                >
                                    {(isSubmitting || isUploadingAssets) ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                        <CheckCircle2 className="w-4 h-4" />
                                    )}
                                    {isUploadingAssets ? 'Photos en cours d\'envoi...' : isSubmitting ? 'Publication en cours...' : 'Publier le Produit'}
                                </Button>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    onClick={() => setIsConfirmingCancel(true)}
                                    className="w-full h-11 text-[10px] font-bold uppercase tracking-widest text-muted-foreground hover:text-destructive transition-colors cursor-pointer"
                                >
                                    Annuler
                                </Button>
                                <p className="text-[9px] text-muted-foreground text-center mt-2 font-medium italic leading-relaxed">
                                    Note : Votre produit sera enregistré et soumis à l'équipe de modération d'Ahizan avant sa mise en ligne publique.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </form>

            {/* Cancel Confirmation */}
            <AlertDialog open={isConfirmingCancel} onOpenChange={setIsConfirmingCancel}>
                <AlertDialogContent className="rounded-2xl border-border shadow-2xl max-w-sm">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-xl font-bold">Abandonner ?</AlertDialogTitle>
                        <AlertDialogDescription className="text-sm">
                            Toutes les modifications en cours de saisie seront perdues.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="pt-4">
                        <AlertDialogCancel className="h-10 rounded-xl font-bold text-[10px] uppercase tracking-widest cursor-pointer">Rester</AlertDialogCancel>
                        <AlertDialogAction 
                            onClick={() => {
                                setIsConfirmingCancel(false);
                                if (onSuccess) {
                                    onSuccess();
                                } else {
                                    router.push('/dashboard/products');
                                }
                            }}
                            className="h-10 rounded-xl bg-destructive hover:bg-destructive/90 text-destructive-foreground font-bold text-[10px] uppercase tracking-widest cursor-pointer"
                        >
                            Quitter
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
