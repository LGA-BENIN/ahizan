'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import ImageUploader from '@/components/ImageUploader';
import { updateProductAction } from '@/app/dashboard/products/actions';
import { toast } from 'sonner';

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

    const categories = facets?.items[0]?.values || [];

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
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
        }
    };

    const handleImageUploaded = (id: string, preview: string) => {
        // We might need to fetch preview if not returned by uploader, 
        // but uploader refactor didn't return preview to callback?
        // Let's check ImageUploader signature.
        // onImageUploaded: (assetId: string) => void
        // It doesn't pass preview.
        setAssetIds([...assetIds, id]);
        // For preview, we can reload or just show a generic placeholder or fetch it.
        // But wait, ImageUploader manages its own preview state. 
        // Here we show EXISTING images.
        toast.success('Image ajoutée (sauvegarder pour confirmer)');
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6 bg-white p-6 rounded-lg shadow">
            <div>
                <label className="block text-sm font-medium text-gray-700">Nom du produit</label>
                <input
                    type="text"
                    required
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                />
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700">Description</label>
                <textarea
                    required
                    rows={3}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                    value={formData.description}
                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                />
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700">Prix (CFA)</label>
                    <input
                        type="number"
                        required
                        min="0"
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                        value={formData.price}
                        onChange={e => setFormData({ ...formData, price: parseInt(e.target.value) })}
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">Stock</label>
                    <input
                        type="number"
                        required
                        min="0"
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                        value={formData.stock}
                        onChange={e => setFormData({ ...formData, stock: parseInt(e.target.value) })}
                    />
                </div>
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Catégorie</label>
                <select
                    className="block w-full border border-gray-300 rounded-md shadow-sm p-2"
                    value={formData.category}
                    onChange={e => setFormData({ ...formData, category: e.target.value })}
                >
                    <option value="">Sélectionner une catégorie</option>
                    {categories.map((cat: any) => (
                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                </select>
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Images existantes</label>
                <div className="flex gap-2 mb-2 flex-wrap">
                    {previewImages.map((asset: any) => (
                        <div key={asset.id} className="relative">
                            <img src={asset.preview} alt="Asset" className="h-20 w-20 object-cover rounded" />
                            {/* Deletion logic would go here */}
                        </div>
                    ))}
                </div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Ajouter une image</label>
                <ImageUploader onImageUploaded={(id) => setAssetIds(prev => [...prev, id])} />
            </div>

            <div className="flex justify-end gap-3 pt-4">
                <button
                    type="button"
                    onClick={() => router.back()}
                    className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                    Annuler
                </button>
                <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                    Enregistrer les modifications
                </button>
            </div>
        </form>
    );
}
