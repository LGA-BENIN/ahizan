import { redirect } from 'next/navigation';
import { getActiveCustomer } from '@/lib/vendure/actions';
import { getMyLikedProductsAction } from '@/app/(storefront)/likes-actions';
import { FavoritesClient } from './favorites-client';

export const metadata = {
    title: 'Mes Favoris | Espace Client Ahizan',
    description: 'Retrouvez et gérez la liste de vos produits favoris sur Ahizan.',
};

export default async function FavoritesPage() {
    const customer = await getActiveCustomer();
    if (!customer) {
        redirect('/sign-in');
    }

    const response = await getMyLikedProductsAction();
    const products = response.success ? response.products : [];

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl md:text-3xl font-serif font-black tracking-tight text-slate-900 dark:text-slate-50">
                    Mes Favoris
                </h1>
                <p className="text-muted-foreground mt-2 text-sm font-medium">
                    Gerez et retrouvez facilement tous les produits que vous avez aimes et enregistres.
                </p>
            </div>

            <FavoritesClient initialProducts={products} />
        </div>
    );
}
