import { query } from '@/lib/vendure/api';
import { GetMyVendorProductQuery } from '@/lib/vendure/vendor-product-mutations';
import { GetCollectionsTreeQuery } from '@/lib/vendure/queries';
import { getAuthToken } from '@/lib/auth';
import { ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import EditProductForm from '@/components/dashboard/products/edit-form';

interface EditProductPageProps {
    params: Promise<{ id: string }>;
}

export default async function EditProductPage({ params }: EditProductPageProps) {
    const { id } = await params;
    const token = await getAuthToken();

    // Parallel fetch
    const [productResult, collectionsResult] = await Promise.all([
        query(GetMyVendorProductQuery, { id }, { token }),
        query(GetCollectionsTreeQuery, {}, { token }).catch((err) => {
            console.error('[EditProductPage] Failed to fetch collections:', err);
            return { data: null };
        })
    ]);

    const product = productResult.data?.myVendorProduct;
    const collectionTree = (collectionsResult?.data as any)?.cmsCollectionsTree || [];

    if (!product) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
                <p className="text-muted-foreground font-medium">Produit non trouvé</p>
                <Link href="/dashboard/products">
                    <Button variant="outline">Retour aux produits</Button>
                </Link>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center gap-4">
                <Link href="/dashboard/products">
                    <Button variant="ghost" size="icon" className="rounded-full bg-muted/50 hover:bg-muted">
                        <ChevronLeft className="w-5 h-5" />
                    </Button>
                </Link>
                <div>
                    <h1 className="text-3xl font-serif font-bold tracking-tight">Modifier le produit</h1>
                    <p className="text-sm text-muted-foreground">Mettez à jour les détails de votre article en vente.</p>
                </div>
            </div>

            <div className="bg-card rounded-2xl md:rounded-[2.5rem] border border-border shadow-sm p-4 sm:p-10">
                <EditProductForm product={product} collectionTree={collectionTree} />
            </div>
        </div>
    );
}
