'use client';

import React from 'react';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import ImageUploader from '@/components/ImageUploader';
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
    DollarSign,
    Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';
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
        price: 0,
        stock: 100,
        parentCategory: '',
        category: '',
    });
    const [assetIds, setAssetIds] = useState<string[]>([]);
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
            price: 0,
            stock: 100,
            parentCategory: '',
            category: '',
        });
        setAssetIds([]);
        setFormKey(prev => prev + 1);
        setIsSubmitting(false);
    };

    // Get subcategories for selected parent
    const selectedParent = collectionTree?.find((c: any) => c.id === formData.parentCategory);
    const subCategories = selectedParent?.children || [];

    // When parent changes, reset subcategory
    const handleParentChange = (v: string) => {
        if (!v || v === formData.parentCategory) return;
        setFormData({ ...formData, parentCategory: v, category: v });
        setFacetValueIds([]);
        fetchAllowedFacets(v);
    };
    const handleSubCategoryChange = (v: string) => {
        if (!v || v === formData.category) return;
        setFormData({ ...formData, category: v });
        setFacetValueIds([]);
        fetchAllowedFacets(v);
    };

    // Fetch allowed facets for a collection
    const fetchAllowedFacets = async (collectionId: string) => {
        if (!collectionId) { setAllowedFacets([]); return; }
        setLoadingFacets(true);
        try {
            const { query } = await import('@/lib/vendure/api');
            const { GetCollectionAllowedFacetsQuery } = await import('@/lib/vendure/queries');
            const result = await query(GetCollectionAllowedFacetsQuery, { collectionId });
            const mapping = (result.data as any)?.collectionAllowedFacets;
            setAllowedFacets(mapping?.allowedFacets || []);
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

        if (!formData.name || !formData.category) {
            toast.error('Veuillez remplir les informations obligatoires');
            return;
        }

        setIsSubmitting(true);
        try {
            const data = new FormData();
            data.append('name', formData.name);
            data.append('description', formData.description);
            data.append('price', formData.price.toString());
            data.append('stock', formData.stock.toString());
            data.append('category', formData.category);
            data.append('assetIds', JSON.stringify(assetIds));
            data.append('facetValueIds', JSON.stringify(facetValueIds));

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
        <div className={cn("max-w-5xl mx-auto space-y-8 pb-20", className)}>
            <form onSubmit={handleSubmit} autoComplete="off" className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                
                {/* Left Column: Data */}
                <div className="lg:col-span-2 space-y-8">
                    
                    {/* Section: Identité */}
                    <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm">
                        <div className="px-6 py-4 bg-muted/30 border-b border-border flex items-center gap-2">
                            <Tag className="w-4 h-4 text-primary" />
                            <h3 className="text-xs font-black uppercase tracking-widest">Identité du Produit</h3>
                        </div>
                        <div className="p-8 space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Nom *</Label>
                                    <Input
                                        value={formData.name}
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, name: e.target.value })}
                                        placeholder="Ex: Panier Tressé"
                                        className="h-11 rounded-xl"
                                        autoComplete="off"
                                        name={`name-${formKey}`}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Catégorie *</Label>
                                    <Select value={formData.parentCategory} onValueChange={handleParentChange}>
                                        <SelectTrigger className="h-11 rounded-xl">
                                            <SelectValue placeholder="Sélectionner une catégorie..." />
                                        </SelectTrigger>
                                        <SelectContent className="rounded-xl">
                                            {(collectionTree || []).map((c: any) => <SelectItem key={String(c.id)} value={String(c.id)}>{c.name}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                                {subCategories.length > 0 && (
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Sous-catégorie</Label>
                                    <Select value={formData.category !== formData.parentCategory ? formData.category : ''} onValueChange={handleSubCategoryChange}>
                                        <SelectTrigger className="h-11 rounded-xl">
                                            <SelectValue placeholder="Sélectionner une sous-catégorie..." />
                                        </SelectTrigger>
                                        <SelectContent className="rounded-xl">
                                            {subCategories.map((c: any) => <SelectItem key={String(c.id)} value={String(c.id)}>{c.name}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                                )}
                            </div>
                            <div className="space-y-2">
                                <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Description</Label>
                                <Textarea
                                    rows={6}
                                    value={formData.description}
                                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setFormData({ ...formData, description: e.target.value })}
                                    placeholder="Décrivez votre produit..."
                                    className="rounded-xl bg-muted/5 min-h-[150px]"
                                    autoComplete="off"
                                    name={`desc-${formKey}`}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Section: Pricing & Inventory */}
                    <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm">
                        <div className="px-6 py-4 bg-muted/30 border-b border-border flex items-center gap-2">
                            <DollarSign className="w-4 h-4 text-primary" />
                            <h3 className="text-xs font-black uppercase tracking-widest">Prix & Stock</h3>
                        </div>
                        <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-8">
                             <div className="space-y-2">
                                <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Prix (CFA) *</Label>
                                <Input
                                    type="number"
                                    value={formData.price}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, price: parseInt(e.target.value) || 0 })}
                                    className="h-11 rounded-xl font-bold text-lg"
                                    autoComplete="off"
                                    name={`price-${formKey}`}
                                />
                            </div>
                             <div className="space-y-2">
                                <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Stock Disponible</Label>
                                <Input
                                    type="number"
                                    value={formData.stock}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, stock: parseInt(e.target.value) || 0 })}
                                    className="h-11 rounded-xl font-bold text-lg"
                                    autoComplete="off"
                                    name={`stock-${formKey}`}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Section: Caractéristiques (Facet Values) */}
                    {formData.category && (
                    <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm">
                        <div className="px-6 py-4 bg-muted/30 border-b border-border flex items-center gap-2">
                            <Tag className="w-4 h-4 text-primary" />
                            <h3 className="text-xs font-black uppercase tracking-widest">Caractéristiques</h3>
                        </div>
                        <div className="p-8">
                            {loadingFacets ? (
                                <p className="text-xs text-muted-foreground animate-pulse">Chargement des caractéristiques...</p>
                            ) : allowedFacets.length === 0 ? (
                                <p className="text-xs text-muted-foreground">Aucune caractéristique définie pour cette catégorie. Le superadmin peut en configurer via le tableau de bord admin.</p>
                            ) : (
                                <div className="space-y-4">
                                    {allowedFacets.map((facet: any) => {
                                        const selectedFvId = facetValueIds.find((id: string) =>
                                            facet.values?.some((fv: any) => String(fv.id) === id)
                                        );
                                        return (
                                            <div key={facet.id}>
                                                <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2 block">{facet.name}</Label>
                                                <Select
                                                    value={selectedFvId || ''}
                                                    onValueChange={(v) => {
                                                        setFacetValueIds(prev => {
                                                            const without = prev.filter(id => !facet.values?.some((fv: any) => String(fv.id) === id));
                                                            return v ? [...without, v] : without;
                                                        });
                                                    }}
                                                >
                                                    <SelectTrigger className="h-12 rounded-xl">
                                                        <SelectValue placeholder={`Sélectionner ${facet.name}`} />
                                                    </SelectTrigger>
                                                    <SelectContent className="rounded-xl">
                                                        {facet.values?.map((fv: any) => (
                                                            <SelectItem key={String(fv.id)} value={String(fv.id)}>{fv.name}</SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                    )}
                </div>

                {/* Right Column: Media */}
                <div className="space-y-8">
                    <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm sticky top-8">
                        <div className="px-6 py-4 bg-muted/30 border-b border-border flex items-center gap-2">
                            <ImageIcon className="w-4 h-4 text-primary" />
                            <h3 className="text-xs font-black uppercase tracking-widest">Médias</h3>
                        </div>
                        <div className="p-8 space-y-6">
                            <div className="p-4 rounded-xl border border-muted bg-muted/5 flex flex-col items-center justify-center gap-4 transition-colors hover:border-brand-navy/20">
                                <ImageUploader 
                                    key={formKey}
                                    onImageUploaded={(id) => setAssetIds((prev: string[]) => [...prev, id])} 
                                    onUploadingChange={setIsUploadingAssets}
                                />
                                {isUploadingAssets && (
                                    <div className="flex items-center gap-2 text-primary font-bold animate-pulse">
                                        <Loader2 className="w-3 h-3 animate-spin" />
                                        <span className="text-[9px] uppercase tracking-widest">Envoi en cours... Veuillez patienter</span>
                                    </div>
                                )}
                            </div>

                            {assetIds.length > 0 && (
                                <div className="grid grid-cols-3 gap-2 mt-4">
                                    {assetIds.map((id, index) => (
                                        <div key={id} className="relative aspect-square rounded-lg overflow-hidden border border-border bg-muted/30 group">
                                            <div className="absolute inset-0 flex items-center justify-center text-[8px] font-black uppercase opacity-20">Img {index+1}</div>
                                            <button 
                                                type="button"
                                                onClick={() => setAssetIds((prev: string[]) => prev.filter(aid => aid !== id))}
                                                className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-md p-1 opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                                            >
                                                <X className="w-3 h-3" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}

                            <div className="pt-6 border-t border-border mt-8 flex flex-col gap-3">
                                <Button
                                    type="submit"
                                    disabled={isSubmitting || isUploadingAssets}
                                    className="w-full h-12 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs uppercase tracking-widest shadow-lg shadow-primary/10 flex items-center justify-center gap-2"
                                >
                                    {(isSubmitting || isUploadingAssets) ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                        <CheckCircle2 className="w-4 h-4" />
                                    )}
                                    {isUploadingAssets ? 'Envoi des photos...' : isSubmitting ? 'Redirection...' : 'Publier le Produit'}
                                </Button>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    onClick={() => setIsConfirmingCancel(true)}
                                    className="w-full h-11 text-[10px] font-bold uppercase tracking-widest text-muted-foreground hover:text-destructive transition-colors"
                                >
                                    Annuler
                                </Button>
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
                            Toutes les modifications seront perdues.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="pt-4">
                        <AlertDialogCancel className="h-10 rounded-xl font-bold text-[10px] uppercase tracking-widest">Rester</AlertDialogCancel>
                        <AlertDialogAction 
                            onClick={() => {
                                setIsConfirmingCancel(false);
                                if (onSuccess) {
                                    onSuccess();
                                } else {
                                    router.push('/dashboard/products');
                                }
                            }}
                            className="h-10 rounded-xl bg-destructive hover:bg-destructive/90 text-destructive-foreground font-bold text-[10px] uppercase tracking-widest"
                        >
                            Quitter
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
