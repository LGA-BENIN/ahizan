import { query } from '@/lib/vendure/api';
import { GetCollectionsTreeQuery, GetMyVendorFullProfileQuery } from '@/lib/vendure/queries';
import { getAuthToken } from '@/lib/auth';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import NewProductClient from './new-product-client';
import { isVendorLocationValid } from '@/lib/vendor-location';
import { unstable_noStore as noStore } from 'next/cache';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function NewProductPage() {
    noStore();
    const token = await getAuthToken();

    const [{ data: collectionsData }, { data: vendorData }] = await Promise.all([
        query(GetCollectionsTreeQuery, {}, { token, useAuthToken: true }).catch((err) => {
            console.error('[NewProductPage] Failed to fetch collections:', err);
            return { data: null };
        }),
        query(GetMyVendorFullProfileQuery, {}, { token, useAuthToken: true }).catch((err) => {
            console.error('[NewProductPage] Failed to fetch vendor profile:', err);
            return { data: null };
        })
    ]);
    const collectionTree = (collectionsData as any)?.cmsCollectionsTree || [];
    const vendorProfile = (vendorData as any)?.myVendorProfile || null;

    const hasLocation = isVendorLocationValid(vendorProfile);

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-2 border-b border-border/50">
                <div className="space-y-3">
                    <Link 
                        href="/dashboard/products" 
                        className="group flex items-center gap-2 text-xs font-bold text-muted-foreground hover:text-foreground transition-colors uppercase tracking-widest"
                    >
                        <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-1 transition-transform" />
                        Retour à mes produits
                    </Link>
                    <div>
                        <h1 className="text-3xl font-serif font-black tracking-tight text-foreground">Ajouter un Produit</h1>
                        <p className="text-muted-foreground font-semibold mt-0.5 text-xs uppercase tracking-wider">
                            Recherchez un article existant pour y greffer vos offres ou proposez un nouvel article
                        </p>
                    </div>
                </div>
            </div>

            <div className="pt-2">
                <NewProductClient collectionTree={collectionTree} hasLocation={hasLocation} />
            </div>
        </div>
    );
}
