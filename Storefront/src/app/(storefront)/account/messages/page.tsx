import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getActiveCustomer } from '@/lib/vendure/actions';
import { MessagesClient } from './messages-client';

export const metadata: Metadata = {
    title: 'Ma Messagerie | Espace Client Ahizan',
    description: 'Échangez avec les vendeurs en direct.',
};

export default async function MessagesPage() {
    const customer = await getActiveCustomer();
    if (!customer) {
        redirect('/sign-in');
    }

    return (
        <div className="space-y-6 h-full flex flex-col">
            <div>
                <h1 className="text-2xl md:text-3xl font-serif font-black tracking-tight text-slate-900 dark:text-slate-50">
                    Ma Messagerie
                </h1>
                <p className="text-muted-foreground mt-2 text-sm font-medium">
                    Consultez et gérez vos discussions en direct avec les vendeurs.
                </p>
            </div>
            <MessagesClient
                authToken={(customer as any).authToken}
                shopApiUrl={process.env.NEXT_PUBLIC_VENDURE_SHOP_API_URL || process.env.NEXT_PUBLIC_SHOP_API_URL || 'https://api.ahizan.com/shop-api'}
            />
        </div>
    );
}
