import { cacheLife, cacheTag } from 'next/cache';
import { CartIcon } from './cart-icon';
import { query } from '@/lib/vendure/api';
import { GetActiveOrderQuery } from '@/lib/vendure/queries';

export async function NavbarCart() {
    'use cache: private';
    cacheLife('minutes');
    cacheTag('cart');
    cacheTag('active-order');

    let cartItemCount = 0;
    try {
        const orderResult = await query(GetActiveOrderQuery, undefined, {
            useAuthToken: true,
            tags: ['cart'],
        });
        cartItemCount = orderResult.data.activeOrder?.totalQuantity || 0;
    } catch (e) {
        // Backend unavailable — show empty cart rather than crashing the page
        console.warn('NavbarCart: failed to fetch active order', e);
    }

    return <CartIcon cartItemCount={cartItemCount} />;
}
