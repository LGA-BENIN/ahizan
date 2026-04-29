'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import ImageUploader from '@/components/ImageUploader';
import { updateProductAction } from '@/app/dashboard/products/actions';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Package, ImageIcon, Ruler, Save, X, Trash2, Info, Tag } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EditProductFormProps {
    product: any;
    collectionTree: any[];
}

export default function EditProductForm({ product, collectionTree }: EditProductFormProps) {
    const router = useRouter();
    const variant = product.variants[0]; // Assuming single variant for now

    const initialCategoryId = product.collections?.length > 0 ? product.collections[0].id : '';

    const [formData, setFormData] = useState({
        name: product.name,
        description: product.description,
        price: variant?.price || 0,
        stock: variant?.stockLevel === 'IN_STOCK' ? 100 : (parseInt(variant?.stockLevel) || 0),
        parentCategory: '',
        category: initialCategoryId,
    });
    const [assetIds, setAssetIds] = useState<string[]>(product.assets.map((a: any) => a.id));
    const [previewImages, setPreviewImages] = useState(product.assets.map((a: any) => ({ id: a.id, preview: a.preview })));
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [facetValueIds, setFacetValueIds] = useState<string[]>([]);
    const [allowedFacets, setAllowedFacets] = useState<any[]>([]);
    const [loadingFacets, setLoadingFacets] = useState(false);

    // Initialize parentCategory from the tree and fetch facets
    useEffect(() => {
        const initialParent = findParentForCategory(initialCategoryId);
        if (formData.parentCategory !== initialParent && formData.parentCategory === '') {
            setFormData(prev => ({ ...prev, parentCategory: initialParent }));
        }
        if (initialCategoryId) {
            fetchAllowedFacets(initialCategoryId);
        }
    }, [initialCategoryId]);

    // Determine parent category from the tree for initial selection
    const findParentForCategory = (catId: string): string => {
        for (const parent of (collectionTree || [])) {
            if (parent.id === catId) return catId;
            if (parent.children?.some((c: any) => c.id === catId)) return parent.id;
        }
        return catId;
    };

    const selectedParent = collectionTree?.find((c: any) => c.id === formData.parentCategory);
    const subCategories = selectedParent?.children || [];

    const handleParentChange = (v: string) => {
        setFormData({ ...formData, parentCategory: v, category: v });
        setFacetValueIds([]);
        fetchAllowedFacets(v);
    };
    const handleSubCategoryChange = (v: string) => {
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
            console.error('[EditProductForm] Failed to fetch allowed facets:', err);
            setAllowedFacets([]);
        } finally {
            setLoadingFacets(false);
        }
    };

    const toggleFacetValue = (fvId: string) => {
        setFacetValueIds(prev => prev.includes(fvId) ? prev.filter(id => id !== fvId) : [...prev, fvId]);
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
            data.append('price', formData.price.toString());
            data.append('stock', formData.stock.toString());
            data.append('category', formData.category);
            data.append('assetIds', JSON.stringify(assetIds));
            data.append('facetValueIds', JSON.stringify(facetValueIds));

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
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-10">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                {/* Left Column: Basic Info */}
                <div className="space-y-6">
                    <div className="flex items-center gap-2 text-primary font-bold text-lg mb-2">
                        <Package className="w-5 h-5" />
                        <h2>Informations générales</h2>
                    </div>
                    
                    <div className="space-y-2">
                        <Label htmlFor="name">Nom du produit <span className="text-destructive">*</span></Label>
                        <Input
                            id="name"
                            required
                            className="h-12 rounded-xl focus-visible:ring-primary/20"
                            value={formData.name}
                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="category">Catégorie <span className="text-destructive">*</span></Label>
                        <Select 
                            value={formData.parentCategory} 
                            onValueChange={handleParentChange}
                        >
                            <SelectTrigger className="h-12 rounded-xl">
                                <SelectValue placeholder="Choisir une catégorie" />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl">
                                {(collectionTree || []).map((cat: any) => (
                                    <SelectItem key={String(cat.id)} value={String(cat.id)}>{cat.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {subCategories.length > 0 && (
                    <div className="space-y-2">
                        <Label htmlFor="subcategory">Sous-catégorie</Label>
                        <Select 
                            value={formData.category !== formData.parentCategory ? formData.category : ''} 
                            onValueChange={handleSubCategoryChange}
                        >
                            <SelectTrigger className="h-12 rounded-xl">
                                <SelectValue placeholder="Choisir une sous-catégorie" />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl">
                                {subCategories.map((cat: any) => (
                                    <SelectItem key={String(cat.id)} value={String(cat.id)}>{cat.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    )}

                    <div className="space-y-2">
                        <Label htmlFor="description">Description <span className="text-destructive">*</span></Label>
                        <Textarea
                            id="description"
                            required
                            rows={6}
                            className="rounded-xl resize-none focus-visible:ring-primary/20"
                            value={formData.description}
                            onChange={e => setFormData({ ...formData, description: e.target.value })}
                        />
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
                                <div className="space-y-5">
                                    {allowedFacets.map((facet: any) => (
                                        <div key={facet.id}>
                                            <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2 block">{facet.name}</Label>
                                            <div className="flex flex-wrap gap-2">
                                                {facet.values?.map((fv: any) => {
                                                    const isSelected = facetValueIds.includes(String(fv.id));
                                                    return (
                                                        <button
                                                            key={fv.id}
                                                            type="button"
                                                            onClick={() => toggleFacetValue(String(fv.id))}
                                                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                                                                isSelected
                                                                    ? 'bg-primary text-primary-foreground border-primary'
                                                                    : 'bg-muted/30 text-foreground border-border hover:border-primary/40'
                                                            }`}
                                                        >
                                                            {fv.name}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                    )}
                </div>

                {/* Right Column: Pricing, Inventory & Media */}
                <div className="space-y-8">
                    <div className="space-y-6">
                        <div className="flex items-center gap-2 text-primary font-bold text-lg mb-2">
                            <Ruler className="w-5 h-5" />
                            <h2>Prix & Inventaire</h2>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="price">Prix (CFA) <span className="text-destructive">*</span></Label>
                                <Input
                                    id="price"
                                    type="number"
                                    required
                                    className="h-12 rounded-xl"
                                    value={formData.price}
                                    onChange={e => setFormData({ ...formData, price: parseInt(e.target.value) })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="stock">Stock</Label>
                                <Input
                                    id="stock"
                                    type="number"
                                    required
                                    className="h-12 rounded-xl"
                                    value={formData.stock}
                                    onChange={e => setFormData({ ...formData, stock: parseInt(e.target.value) })}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="space-y-6">
                        <div className="flex items-center gap-2 text-primary font-bold text-lg mb-2">
                            <ImageIcon className="w-5 h-5" />
                            <h2>Galerie Photos</h2>
                        </div>
                        
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                            {previewImages.map((asset: any) => (
                                <div key={asset.id} className="group relative aspect-square rounded-xl overflow-hidden border">
                                    <img src={asset.preview} alt="Produit" className="w-full h-full object-cover" />
                                    <button 
                                        type="button"
                                        onClick={() => removeAsset(asset.id)}
                                        className="absolute inset-0 bg-red-500/80 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                        <Trash2 className="w-5 h-5" />
                                    </button>
                                </div>
                            ))}
                        </div>
                        
                        <div className="p-4 rounded-2xl md:rounded-[2rem] border-2 border-dashed border-muted bg-muted/20">
                            <ImageUploader onImageUploaded={(id) => setAssetIds(prev => [...prev, id])} />
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 md:pt-10 border-t">
                <Button
                    type="button"
                    variant="ghost"
                    onClick={() => router.back()}
                    className="w-full sm:w-auto h-12 px-6 rounded-xl hover:bg-muted font-bold text-muted-foreground order-2 sm:order-1"
                >
                    <X className="w-4 h-4 mr-2" />
                    Annuler
                </Button>
                
                <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full sm:w-auto h-12 px-10 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold shadow-lg shadow-primary/20 transition-all hover:scale-[1.02] active:scale-95 order-1 sm:order-2"
                >
                    <Save className="w-4 h-4 mr-2" />
                    {isSubmitting ? 'Enregistrement...' : 'Enregistrer les modifications'}
                </Button>
            </div>
        </form>
    );
}
