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
        query(GetMyVendorProductsQuery, { options: { take: 50 } }, { token }).catch((err) => {
            console.error('[ProductListPage] Failed to fetch products:', err);
            return { data: { myVendorProducts: { items: [], totalItems: 0 } } };
        }),
        query(GetCollectionsTreeQuery, {}, { token }).catch((err) => {
            console.error('[ProductListPage] Failed to fetch collections:', err);
            return { data: null };
        })
    ]);

    const products = (productData as any).myVendorProducts?.items || [];
    const collectionTree = (collectionsResult?.data as any)?.cmsCollectionsTree || [];

    if (products.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[600px] text-center space-y-8 animate-in fade-in zoom-in duration-700">
                <div className="w-32 h-32 bg-muted/50 rounded-full flex items-center justify-center shadow-inner relative overflow-hidden group">
                    <div className="absolute inset-0 bg-brand-navy/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    <Package className="w-14 h-14 text-muted-foreground group-hover:text-brand-navy transition-colors duration-500" />
                </div>
                <div className="space-y-4 px-4">
                    <h2 className="text-2xl md:text-4xl font-serif font-black tracking-tight leading-tight">Créez votre premier produit</h2>
                    <p className="text-sm md:text-base text-muted-foreground max-w-md mx-auto leading-relaxed">
                        Prêt à partager votre expertise ? Mettez vos articles en vente et commencez à générer des revenus sur AHIZAN.
                    </p>
                </div>
                <div className="flex items-center gap-4 pt-4">
                     <Link href="/dashboard/products/new">
                        <Button className="h-12 px-10 rounded-xl bg-brand-navy hover:bg-brand-navy/90 text-white font-bold shadow-lg shadow-brand-navy/20 flex items-center gap-2 uppercase text-xs tracking-widest">
                            <Plus className="w-4 h-4" />
                            Ajouter mon premier produit
                        </Button>
                     </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-6 duration-700">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                <div>
                    <h1 className="text-2xl md:text-4xl font-serif font-black tracking-tight italic underline decoration-brand-red decoration-4">Mes Produits</h1>
                    <p className="text-xs md:text-sm text-muted-foreground font-bold uppercase tracking-widest mt-1">Gestion du catalogue d'articles</p>
                </div>
            </div>

            <ProductListTable initialProducts={products} collectionTree={collectionTree} />
        </div>
    );
}
