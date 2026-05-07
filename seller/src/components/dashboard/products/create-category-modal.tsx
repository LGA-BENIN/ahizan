'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
} from '@/components/ui/dialog';
import { toast } from 'sonner';

interface CreateCategoryModalProps {
    parentId?: string; // Optional parent collection ID for subcategories
}

export default function CreateCategoryModal({ parentId }: CreateCategoryModalProps) {
    const [open, setOpen] = useState(false);
    const [name, setName] = useState('');
    const [slug, setSlug] = useState('');
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name) return;

        setLoading(true);
        try {
            // Create collection via admin API
            const adminApiUrl = process.env.NEXT_PUBLIC_VENDURE_ADMIN_API_URL || 'http://localhost:3000/admin-api';
            // Get auth token from cookie
            const authToken = document.cookie
                .split('; ')
                .find(row => row.startsWith('vendure-auth-token='))
                ?.split('=')[1];
            const res = await fetch(adminApiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(authToken ? { 'Authorization': `Bearer ${authToken}`, 'vendure-auth-token': authToken } : {}),
                },
                credentials: 'include',
                body: JSON.stringify({
                    query: `mutation CreateCollection($input: CreateCollectionInput!) {
                        createCollection(input: $input) {
                            id
                            name
                            slug
                        }
                    }`,
                    variables: {
                        input: {
                            translations: [{ languageCode: 'fr', name, slug: slug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') }],
                            parentId: parentId || null,
                        }
                    }
                })
            });
            const data = await res.json();
            if (data.errors) {
                throw new Error(data.errors[0]?.message || 'GraphQL error');
            }
            toast.success('Collection créée avec succès');
            setOpen(false);
            setName('');
            setSlug('');
            router.refresh();
        } catch (err: any) {
            console.error('Error creating collection:', err);
            toast.error('Erreur: ' + (err.message || 'Erreur inattendue'));
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <button className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-50 transition">
                    Nouvelle Catégorie
                </button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Ajouter une catégorie</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                            Nom de la catégorie
                        </label>
                        <input
                            id="name"
                            type="text"
                            value={name}
                            onChange={(e) => {
                                setName(e.target.value);
                                if (!slug) setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''));
                            }}
                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="Ex: Électronique"
                            required
                        />
                    </div>
                    <div>
                        <label htmlFor="slug" className="block text-sm font-medium text-gray-700">
                            Slug (auto-généré)
                        </label>
                        <input
                            id="slug"
                            type="text"
                            value={slug}
                            onChange={(e) => setSlug(e.target.value)}
                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="electronique"
                        />
                    </div>
                    <DialogFooter>
                        <button
                            type="button"
                            onClick={() => setOpen(false)}
                            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 mr-2"
                        >
                            Annuler
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                        >
                            {loading ? 'Création...' : 'Créer'}
                        </button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
