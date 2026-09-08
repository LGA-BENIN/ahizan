import { query } from '@/lib/vendure/api';
import { GetMyVendorProductQuery } from '@/lib/vendure/vendor-product-mutations';
import { GetCollectionsTreeQuery } from '@/lib/vendure/queries';
import { getAuthToken } from '@/lib/auth';
import { ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import EditProductForm from '@/components/dashboard/products/edit-form';
import CreateProductForm from '@/components/dashboard/products/create-form';

interface EditProductPageProps {
    params: Promise<{ id: string }>;
}

export default async function EditProductPage({ params }: EditProductPageProps) {
    const { id } = await params;
    const token = await getAuthToken();

    // Parallel fetch
    const [productResult, collectionsResult] = await Promise.all([
        query(GetMyVendorProductQuery, { id }, { token }).catch((err) => {
            console.error('[EditProductPage] Failed to fetch product:', err);
            return { data: { myVendorProduct: null } };
        }),
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

    const isDraft = product.customFields?.approvalStatus === 'draft';

    if (isDraft) {
        return (
            <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex items-center gap-4">
                    <Link href="/dashboard/products">
                        <Button variant="ghost" size="icon" className="rounded-full bg-muted/50 hover:bg-muted cursor-pointer">
                            <ChevronLeft className="w-5 h-5" />
                        </Button>
                    </Link>
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700">
                                Brouillon
                            </span>
                        </div>
                        <h1 className="text-3xl font-serif font-black tracking-tight mt-1 text-foreground">
                            Poursuivre la création de mon article
                        </h1>
                        <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider mt-0.5">
                            Reprenez la configuration de votre fiche produit et déclinaisons avant soumission
                        </p>
                    </div>
                </div>

                <div className="bg-card rounded-2xl md:rounded-[2.5rem] border border-border shadow-sm p-4 sm:p-10">
                    <CreateProductForm initialProduct={product} collectionTree={collectionTree} />
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center gap-4">
                <Link href="/dashboard/products">
                    <Button variant="ghost" size="icon" className="rounded-full bg-muted/50 hover:bg-muted cursor-pointer">
                        <ChevronLeft className="w-5 h-5" />
                    </Button>
                </Link>
                <div>
                    <h1 className="text-3xl font-serif font-black tracking-tight text-foreground">Gestion de mon offre commerciale</h1>
                    <p className="text-sm text-muted-foreground">Configurez vos déclinaisons, prix, stocks et visuels pour cette référence Ahizan.</p>
                </div>
            </div>

            <div className="bg-card rounded-2xl md:rounded-[2.5rem] border border-border shadow-sm p-4 sm:p-10">
                <EditProductForm product={product} collectionTree={collectionTree} />
            </div>
        </div>
    );
}
