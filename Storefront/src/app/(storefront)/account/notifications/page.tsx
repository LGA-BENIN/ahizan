import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getActiveCustomer } from '@/lib/vendure/actions';
import { NotificationsClient } from './notifications-client';

export const metadata: Metadata = {
    title: 'Mes Notifications | Espace Client Ahizan',
    description: 'Consultez et gérez toutes vos notifications Ahizan.',
};

export default async function NotificationsPage() {
    const customer = await getActiveCustomer();
    if (!customer) {
        redirect('/sign-in');
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl md:text-3xl font-serif font-black tracking-tight text-slate-900 dark:text-slate-50">
                    Mes Notifications
                </h1>
                <p className="text-muted-foreground mt-2 text-sm font-medium">
                    Toutes vos notifications de commande, livraison et compte.
                </p>
            </div>
            <NotificationsClient
                authToken={(customer as any).authToken}
                shopApiUrl={process.env.NEXT_PUBLIC_VENDURE_SHOP_API_URL || process.env.NEXT_PUBLIC_SHOP_API_URL || 'https://api.ahizan.com/shop-api'}
            />
        </div>
    );
}
