'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import ImageUploader from '@/components/ImageUploader';
import { createProductAction } from '@/app/dashboard/products/actions';
import { toast } from 'sonner';

interface CreateProductFormProps {
    facets: any; // Type this properly if possible, or use any for now
    onSuccess?: () => void;
    className?: string;
}

export default function CreateProductForm({ facets, onSuccess, ...props }: CreateProductFormProps) {
    const router = useRouter();
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        price: '',
        stock: '',
        category: '',
    });
    const [assetIds, setAssetIds] = useState<string[]>([]);
    // Find the facet with code 'category' or name 'Category'/'Catégorie'
    const categoryFacet = facets?.items?.find((f: any) => 
        f.code === 'category' || 
        f.name.toLowerCase() === 'category' || 
        f.name.toLowerCase() === 'catégorie'
    );
    const [localCategories, setLocalCategories] = useState(categoryFacet?.values || []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const data = new FormData();
            data.append('name', formData.name);
            data.append('description', formData.description);
            data.append('price', formData.price);
            data.append('stock', formData.stock);
            data.append('category', formData.category);
            data.append('assetIds', JSON.stringify(assetIds));

            const result = await createProductAction(null, data);

            if (result.success) {
                toast.success('Produit créé avec succès');
                if (onSuccess) {
                    onSuccess();
                } else {
                    router.push('/dashboard/products');
                }
            } else {
                toast.error('Erreur: ' + result.error);
            }
        } catch (err) {
            console.error('Error creating product:', err);
            toast.error('Erreur inattendue');
        }
    };


    return (
        <form onSubmit={handleSubmit} className={`space-y-6 ${props.className || 'bg-white p-6 rounded-lg shadow'}`}>
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

            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Image du produit</label>
                <ImageUploader onImageUploaded={(id) => setAssetIds([...assetIds, id])} />
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
                        onChange={e => setFormData({ ...formData, price: e.target.value })}
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
                        onChange={e => setFormData({ ...formData, stock: e.target.value })}
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
                    {localCategories.map((cat: any) => (
                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                </select>
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
                    Créer le produit
                </button>
            </div>
        </form >
    );
}
