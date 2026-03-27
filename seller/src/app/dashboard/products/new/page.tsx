import { query } from '@/lib/vendure/api';
import { GetFacetsQuery } from '@/lib/vendure/queries';
import { getAuthToken } from '@/lib/auth';
import { ArrowLeft, Plus } from 'lucide-react';
import Link from 'next/link';
import CreateProductForm from '@/components/dashboard/products/create-form';

export default async function NewProductPage() {
    const token = await getAuthToken();

    const { data: facetsData } = await query(GetFacetsQuery, { options: { filter: { name: { eq: "Category" } } } }, { token });
    const facets = (facetsData as any).facets;

    return (
        <div className="space-y-10 animate-in fade-in slide-in-from-bottom-6 duration-700">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-2 border-b border-border/50">
                <div className="space-y-4">
                    <Link 
                        href="/dashboard/products" 
                        className="group flex items-center gap-2 text-xs font-bold text-muted-foreground hover:text-brand-navy transition-colors uppercase tracking-widest"
                    >
                        <ArrowLeft className="w-3 h-3 group-hover:-translate-x-1 transition-transform" />
                        Retour au catalogue
                    </Link>
                    <div>
                        <h1 className="text-4xl font-serif font-bold tracking-tight">Vendre un Produit</h1>
                        <p className="text-muted-foreground font-medium mt-1 uppercase text-[10px] tracking-[0.2em]">Enregistrement d'un nouvel article sur la marketplace</p>
                    </div>
                </div>
            </div>

            <div className="pt-4">
                <CreateProductForm facets={facets} />
            </div>
        </div>
    );
}
