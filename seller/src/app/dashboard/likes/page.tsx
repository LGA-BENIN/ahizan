import React from 'react';
import { getVendorLikersAction, getVendorProductsLikesAction } from '@/lib/vendure/actions';
import { LikesClient } from './likes-client';

export const metadata = {
    title: 'Abonnés & Likes | Seller Hub',
    description: 'Suivez la liste de vos abonnés et les likes de votre boutique.',
};

export default async function LikesPage() {
    const [initialLikers, productLikesStats] = await Promise.all([
        getVendorLikersAction({ take: 50, skip: 0 }),
        getVendorProductsLikesAction()
    ]);
    
    return (
        <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
            <LikesClient initialLikers={initialLikers} productLikesStats={productLikesStats} />
        </div>
    );
}
