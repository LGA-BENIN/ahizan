import { query } from '@/lib/vendure/api';
import { GetMyVendorProductsQuery } from '@/lib/vendure/vendor-product-mutations';
import { GetFacetsQuery } from '@/lib/vendure/queries';
import { getAuthToken } from '@/lib/auth';
import Link from 'next/link';
import CreateProductModal from '@/components/dashboard/products/create-modal';
import DeleteProductDialog from '@/components/dashboard/products/delete-dialog';
import CreateCategoryModal from '@/components/dashboard/products/create-category-modal';

export default async function ProductListPage() {
    const token = await getAuthToken();

    const [{ data: productData }, { data: facetsData }] = await Promise.all([
        query(GetMyVendorProductsQuery, { options: { take: 50 } }, { token }),
        query(GetFacetsQuery, { options: { filter: { name: { eq: "Category" } } } }, { token })
    ]);

    const products = (productData as any).myVendorProducts?.items || [];
    const facets = (facetsData as any).facets;
    const categoryFacetId = facets?.items[0]?.id;

    // Note: Currency code usually comes from ActiveChannel or Product Variant. 
    // GetMyVendorProducts returns variants. 
    // We can pick first variant price or range.

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold">Mes Produits</h1>
                <div className="flex gap-2">
                    {categoryFacetId && <CreateCategoryModal facetId={categoryFacetId} />}
                    <CreateProductModal facets={facets} />
                </div>
            </div>

            <div className="bg-white rounded-lg shadow overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Image</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nom</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Catégorie</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Prix</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stock</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {products.map((product: any) => {
                            const variant = product.variants[0];
                            // Try to find a facet value that belongs to the 'Category' facet (this logic might need adjustment depending on how you identify category facets vs others)
                            // Ideally we would check the facet code. For now, we take any facet value.
                            // Or better: filter by checking if the facetValue ID is in the category facet values list if we had it fully loaded.
                            // Simply taking the first facetValue for now or checking name.
                            const category = product.facetValues?.find((fv: any) => fv.facet?.name === 'Category' || true)?.name || '-';

                            return (
                                <tr key={product.id}>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        {product.featuredAsset ? (
                                            <img src={product.featuredAsset.preview} alt={product.name} className="h-10 w-10 rounded object-cover" />
                                        ) : (
                                            <div className="h-10 w-10 bg-gray-200 rounded flex items-center justify-center text-gray-400">?</div>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm font-medium text-gray-900">{product.name}</div>
                                        <div className="text-sm text-gray-500">{product.slug}</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm text-gray-500">{category}</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm text-gray-900">
                                            {variant ? `${variant.price} CFA` : '-'}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${variant?.stockLevel === 'IN_STOCK' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                            }`}>
                                            {variant?.stockLevel === 'IN_STOCK' ? 'En Stock' : (variant?.stockLevel === 'OUT_OF_STOCK' ? 'Épuisé' : variant?.stockLevel)}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                        <div className="flex items-center gap-4">
                                            <Link href={`/dashboard/products/${product.id}`} className="text-indigo-600 hover:text-indigo-900">
                                                Modifier
                                            </Link>
                                            <DeleteProductDialog productId={product.id} productName={product.name} />
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
                {products.length === 0 && (
                    <div className="p-6 text-center text-gray-500">
                        Aucun produit trouvé. Commencez par en ajouter un !
                    </div>
                )}
            </div>
        </div>
    );
}
