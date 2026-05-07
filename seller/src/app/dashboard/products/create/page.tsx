import { query } from '@/lib/vendure/api';
import { GetCollectionsTreeQuery } from '@/lib/vendure/queries';
import { getAuthToken } from '@/lib/auth';
import CreateProductForm from '@/components/dashboard/products/create-form';

export default async function CreateProductPage() {
    const token = await getAuthToken();
    const { data } = await query(GetCollectionsTreeQuery, {}, { token }).catch((err) => {
        console.error('[CreateProductPage] Failed to fetch collections:', err);
        return { data: null };
    });
    const collectionTree = (data as any)?.cmsCollectionsTree || [];

    return (
        <div className="p-6 max-w-2xl mx-auto">
            <h1 className="text-2xl font-bold mb-6">Ajouter un produit</h1>
            <CreateProductForm collectionTree={collectionTree} />
        </div>
    );
}
