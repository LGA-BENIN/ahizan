'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import ImageUploader from '@/components/ImageUploader';
import { updateProductAction } from '@/app/dashboard/products/actions';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Package, ImageIcon, Ruler, Save, X, Trash2, Info } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EditProductFormProps {
    product: any;
    facets: any;
}

export default function EditProductForm({ product, facets }: EditProductFormProps) {
    const router = useRouter();
    const variant = product.variants[0]; // Assuming single variant for now

    const [formData, setFormData] = useState({
        name: product.name,
        description: product.description,
        price: variant?.price || 0,
        stock: variant?.stockLevel === 'IN_STOCK' ? 100 : (parseInt(variant?.stockLevel) || 0),
        category: product.facetValues.length > 0 ? product.facetValues[0].id : '',
    });
    const [assetIds, setAssetIds] = useState<string[]>(product.assets.map((a: any) => a.id));
    const [previewImages, setPreviewImages] = useState(product.assets.map((a: any) => ({ id: a.id, preview: a.preview })));
    const [isSubmitting, setIsSubmitting] = useState(false);

    const categoryFacet = facets?.items?.find((f: any) => 
        f.code === 'category' || 
        f.name.toLowerCase() === 'category' || 
        f.name.toLowerCase() === 'catégorie'
    );
    const categories = categoryFacet?.values || [];

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
                            value={formData.category} 
                            onValueChange={val => setFormData({ ...formData, category: val })}
                        >
                            <SelectTrigger className="h-12 rounded-xl">
                                <SelectValue placeholder="Choisir une catégorie" />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl">
                                {categories.map((cat: any) => (
                                    <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

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
