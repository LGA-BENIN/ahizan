import type {Metadata} from 'next';
import {Cart} from "./cart";
import {Suspense} from "react";
import {CartSkeleton} from "@/components/shared/skeletons/cart-skeleton";
import {noIndexRobots} from '@/lib/metadata';

export const metadata: Metadata = {
    title: 'Panier',
    description: 'Consultez les articles de votre panier.',
    robots: noIndexRobots(),
};

export default function CartPage(_props: PageProps<'/cart'>) {
    return (
        <div className="container mx-auto px-3 sm:px-4 md:px-8 lg:px-12 py-6 md:py-12 min-h-[60vh]">
            <h1 className="text-2xl md:text-3xl font-bold mb-6 tracking-tight">Mon Panier</h1>

            <Suspense fallback={<CartSkeleton />}>
                <Cart/>
            </Suspense>
        </div>
    );
}
