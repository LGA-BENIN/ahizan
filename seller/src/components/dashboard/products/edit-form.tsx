'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import ImageUploader, { type UploadedAsset } from '@/components/ImageUploader';
import { updateProductAction } from '@/app/dashboard/products/actions';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Package, ImageIcon, Ruler, Save, X, Trash2, Info, Tag, Star, Percent, CheckCircle2, AlertTriangle, AlertOctagon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { priceFromSubunit } from '@/lib/format';

interface EditProductFormProps {
    product: any;
    collectionTree: any[];
}

export default function EditProductForm({ product, collectionTree }: EditProductFormProps) {
    const router = useRouter();
    const variant = product.variants[0]; // Assuming single variant for now

    let initialCategoryId = '';
    if (product.collections?.length > 0) {
        // Find if any product collection is a subcategory in the tree
        const subCategoryColl = product.collections.find((coll: any) => {
            return collectionTree?.some((parent: any) => 
                parent.children?.some((child: any) => String(child.id) === String(coll.id))
            );
        });
        initialCategoryId = subCategoryColl ? String(subCategoryColl.id) : String(product.collections[0].id);
    }

    const [formData, setFormData] = useState({
        name: product.name,
        description: product.description,
        price: variant?.priceWithTax ? priceFromSubunit(variant.priceWithTax, variant.currencyCode) : 0,
        stock: variant?.stockOnHand !== undefined && variant?.stockOnHand !== null ? variant.stockOnHand : 0,
        parentCategory: '',
        category: initialCategoryId,
        enabled: product.enabled !== false,
        onPromotion: (variant?.customFields as any)?.onPromotion || false,
        promotionalPrice: (variant?.customFields as any)?.promotionalPrice ? priceFromSubunit((variant.customFields as any).promotionalPrice, variant.currencyCode) : 0,
    });
    const [assetIds, setAssetIds] = useState<string[]>(product.assets.map((a: any) => a.id));
    const [previewImages, setPreviewImages] = useState(product.assets.map((a: any) => ({ id: a.id, preview: a.preview })));
    const [featuredAssetId, setFeaturedAssetId] = useState<string | null>(
        product.featuredAsset?.id || (product.assets.length > 0 ? product.assets[0].id : null)
    );
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [facetValueIds, setFacetValueIds] = useState<string[]>(
        (product.facetValues || []).map((fv: any) => String(fv.id))
    );
    console.log('[EditProductForm] Initial product facetValues:', product.facetValues);
    console.log('[EditProductForm] Initial facetValueIds:', facetValueIds);
    const [allowedFacets, setAllowedFacets] = useState<any[]>([]);
    const [loadingFacets, setLoadingFacets] = useState(false);

    // Determine parent category from the tree for initial selection
    const findParentForCategory = (catId: string): string => {
        const search = (nodes: any[], parentId?: string): string | null => {
            for (const node of nodes) {
                if (String(node.id) === String(catId)) {
                    return parentId || String(node.id);
                }
                if (node.children?.length) {
                    const found = search(node.children, String(node.id));
                    if (found) return found;
                }
            }
            return null;
        };
        return search(collectionTree || []) || catId;
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
            console.log('[EditProductForm] Fetched allowedFacets mapping:', mapping);
            setAllowedFacets(mapping?.allowedFacets || []);
        } catch (err) {
            console.error('[EditProductForm] Failed to fetch allowed facets:', err);
            setAllowedFacets([]);
        } finally {
            setLoadingFacets(false);
        }
    };

    // Initialize parentCategory from the tree and fetch facets on mount
    useEffect(() => {
        const initialParent = findParentForCategory(initialCategoryId);
        setFormData(prev => {
            if (prev.parentCategory === '') {
                return { ...prev, parentCategory: initialParent };
            }
            return prev;
        });
        if (initialCategoryId) {
            fetchAllowedFacets(initialCategoryId);
        }
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const selectedParent = collectionTree?.find((c: any) => String(c.id) === String(formData.parentCategory));
    const subCategories = selectedParent?.children || [];

    const handleParentChange = (v: string) => {
        if (!v || v === formData.parentCategory) return;
        console.log('[EditProductForm] handleParentChange called with:', v);
        setFormData({ ...formData, parentCategory: v, category: v });
        setFacetValueIds([]);
        fetchAllowedFacets(v);
    };
    const handleSubCategoryChange = (v: string) => {
        if (!v || v === formData.category) return;
        console.log('[EditProductForm] handleSubCategoryChange called with:', v);
        setFormData({ ...formData, category: v });
        setFacetValueIds([]);
        fetchAllowedFacets(v);
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
            data.append('enabled', formData.enabled.toString());
            data.append('assetIds', JSON.stringify(assetIds));
            data.append('featuredAssetId', featuredAssetId || '');
            data.append('facetValueIds', JSON.stringify(facetValueIds));
            data.append('onPromotion', formData.onPromotion.toString());
            data.append('promotionalPrice', formData.promotionalPrice.toString());

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

                    {(() => {
                        const approvalStatus = product.customFields?.approvalStatus || 'pending';
                        const reason = product.customFields?.rejectionReason;
                        
                        if (approvalStatus === 'pending') {
                            return (
                                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 flex items-start gap-3.5 text-amber-800 dark:bg-amber-950/20 dark:border-amber-900/30 dark:text-amber-300">
                                    <AlertTriangle className="w-5 h-5 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
                                    <div>
                                        <h4 className="text-xs font-black uppercase tracking-wider">En cours de validation</h4>
                                        <p className="text-xs mt-1 leading-relaxed font-medium">Ce produit est en cours de validation par l'administrateur. Il sera visible sur la boutique dès qu'il sera approuvé.</p>
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
                                        <p className="text-xs mt-1 leading-relaxed font-medium">Ce produit a été approuvé par l'administrateur et est actuellement en ligne sur la boutique.</p>
                                    </div>
                                </div>
                            );
                        }
                        
                        if (approvalStatus === 'rejected') {
                            return (
                                <div className="bg-red-50 border border-red-200 rounded-2xl p-5 flex items-start gap-3.5 text-red-800 dark:bg-red-950/20 dark:border-red-900/30 dark:text-red-300">
                                    <AlertOctagon className="w-5 h-5 shrink-0 text-red-600 dark:text-red-400 mt-0.5" />
                                    <div>
                                        <h4 className="text-xs font-black uppercase tracking-wider">Produit Rejeté</h4>
                                        <p className="text-xs mt-1 leading-relaxed font-medium">Ce produit a été rejeté par l'administrateur.</p>
                                        {reason && (
                                            <div className="mt-2 text-xs font-semibold bg-red-100/50 dark:bg-red-950/40 p-3 rounded-lg border border-red-200/50 dark:border-red-900/30">
                                                Motif du rejet : {reason}
                                            </div>
                                        )}
                                        <p className="text-[10px] font-bold uppercase tracking-wider mt-3 text-red-700 dark:text-red-400">Veuillez corriger le produit et l'enregistrer pour le soumettre à nouveau.</p>
                                    </div>
                                </div>
                            );
                        }
                        return null;
                    })()}

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

                        {/* Promotional Price Section */}
                        <div className="pt-4 border-t border-border">
                            <div className="flex items-center gap-3 mb-4">
                                <input
                                    type="checkbox"
                                    id="onPromotion"
                                    checked={formData.onPromotion}
                                    onChange={(e) => setFormData({ ...formData, onPromotion: e.target.checked, promotionalPrice: e.target.checked ? formData.promotionalPrice : 0 })}
                                    className="w-5 h-5 rounded border-border text-primary focus:ring-primary"
                                />
                                <Label htmlFor="onPromotion" className="text-sm font-semibold cursor-pointer">Ce produit est en promotion</Label>
                            </div>

                            {formData.onPromotion && (
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Prix Promotionnel (CFA)</Label>
                                        <Input
                                            type="number"
                                            value={formData.promotionalPrice}
                                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                                                const value = parseInt(e.target.value) || 0;
                                                if (value > formData.price) {
                                                    return; // Prevent promotional price from being higher than original price
                                                }
                                                setFormData({ ...formData, promotionalPrice: value });
                                            }}
                                            className="h-12 rounded-xl font-bold text-lg"
                                            max={formData.price}
                                        />
                                        {formData.promotionalPrice > formData.price && (
                                            <p className="text-xs text-destructive">Le prix promotionnel ne peut pas être supérieur au prix original</p>
                                        )}
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Réduction</Label>
                                        <div className="h-12 rounded-xl bg-muted/50 border border-border flex items-center px-4">
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

                    <div className="space-y-8">
                        <div className="flex items-center gap-2 text-primary font-bold text-lg mb-2">
                            <ImageIcon className="w-5 h-5" />
                            <h2>Galerie Photos</h2>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {previewImages.map((asset: any) => (
                                <div key={asset.id} className="group relative aspect-[4/3] rounded-2xl overflow-hidden border-2 shadow-md">
                                    <img src={asset.preview} alt="Produit" className="w-full h-full object-cover" />
                                    <button 
                                        type="button"
                                        onClick={() => setFeaturedAssetId(asset.id)}
                                        className={`absolute top-2 left-2 p-2 rounded-full shadow-lg transition-all ${
                                            featuredAssetId === asset.id 
                                                ? 'bg-brand-navy text-white' 
                                                : 'bg-white/90 text-muted-foreground hover:bg-white'
                                        }`}
                                        title={featuredAssetId === asset.id ? 'Image principale' : 'Définir comme principale'}
                                    >
                                        <Star className={`w-4 h-4 ${featuredAssetId === asset.id ? 'fill-yellow-400 text-yellow-400' : ''}`} />
                                    </button>
                                    <button 
                                        type="button"
                                        onClick={() => removeAsset(asset.id)}
                                        className="absolute top-2 right-2 bg-destructive text-destructive-foreground rounded-md p-2 opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            ))}
                        </div>
                        
                        <div className="p-6 rounded-2xl border-2 border-dashed border-muted bg-muted/20">
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
