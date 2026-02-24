import { query } from '@/lib/vendure/api';
import { GetMyVendorProductQuery } from '@/lib/vendure/vendor-product-mutations';
import { GetFacetsQuery } from '@/lib/vendure/queries';
import { getAuthToken } from '@/lib/auth';
import EditProductForm from '@/components/dashboard/products/edit-form';

interface EditProductPageProps {
    params: Promise<{ id: string }>;
}

export default async function EditProductPage({ params }: EditProductPageProps) {
    const { id } = await params;
    const token = await getAuthToken();

    // Parallel fetch
    const [productResult, facetsResult] = await Promise.all([
        query(GetMyVendorProductQuery, { id }, { token }),
        query(GetFacetsQuery, { options: { filter: { name: { eq: "Category" } } } }, { token })
    ]);

    const product = productResult.data?.myVendorProduct;
    const facets = facetsResult.data?.facets;

    if (!product) {
        return <div className="p-6">Produit non trouvé</div>;
    }

    return (
        <div className="p-6 max-w-2xl mx-auto">
            <h1 className="text-2xl font-bold mb-6">Modifier le produit</h1>
            <EditProductForm product={product} facets={facets} />
        </div>
    );
}
