import { query } from '@/lib/vendure/api';
import { GetMyVendorProductsQuery } from '@/lib/vendure/vendor-product-mutations';
import { GetCollectionsTreeQuery } from '@/lib/vendure/queries';
import { getAuthToken } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { Package, Plus } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import ProductListTable from '@/components/dashboard/products/product-list-table';

export default async function ProductListPage() {
    // Force recompile
    const token = await getAuthToken();
    if (!token) {
        redirect('/onboarding');
    }
    const [{ data: productData }, collectionsResult] = await Promise.all([
        query(GetMyVendorProductsQuery, { options: { take: 500, sort: { createdAt: 'DESC' } } }, { token }).catch((err) => {
            console.error('[ProductListPage] Failed to fetch products:', err);
            return { data: { myVendorProducts: { items: [], totalItems: 0 } } };
        }),
        query(GetCollectionsTreeQuery, {}, { token }).catch((err) => {
            console.error('[ProductListPage] Failed to fetch collections:', err);
            return { data: null };
        })
    ]);

    const products = [...((productData as any).myVendorProducts?.items || [])].sort((a: any, b: any) => {
        return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
    });
    const collectionTree = (collectionsResult?.data as any)?.cmsCollectionsTree || [];

    if (products.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[500px] text-center space-y-8 animate-in fade-in zoom-in duration-500 max-w-2xl mx-auto py-12">
                <div className="w-24 h-24 bg-primary/10 text-primary rounded-3xl flex items-center justify-center shadow-inner">
                    <Package className="w-12 h-12" />
                </div>
                <div className="space-y-2 px-4">
                    <h2 className="text-2xl md:text-3xl font-serif font-black tracking-tight leading-tight text-foreground">
                        Commencez à vendre sur AHIZAN
                    </h2>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                        Le catalogue Ahizan contient déjà des milliers de références. Vous pouvez directement vous affilier à un produit existant pour y greffer vos tarifs et stocks, ou proposer un tout nouvel article.
                    </p>
                </div>
                <div className="flex items-center gap-3 pt-2 w-full justify-center">
                    <Link href="/dashboard/products/new">
                        <Button className="h-12 px-8 rounded-2xl bg-primary hover:bg-primary/90 text-primary-foreground font-black shadow-lg shadow-primary/20 flex items-center justify-center gap-2 uppercase text-xs tracking-widest cursor-pointer">
                            <Plus className="w-4 h-4" />
                            Ajouter un produit
                        </Button>
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <ProductListTable initialProducts={products} collectionTree={collectionTree} />
        </div>
    );
}
