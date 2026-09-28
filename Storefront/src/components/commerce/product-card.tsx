"use client";

import { FragmentOf, readFragment } from '@/graphql';
import { ProductCardFragment } from '@/lib/vendure/fragments';
import { MasterProductCard } from '@/components/commerce/master-product-card';

interface ProductCardProps {
    product: FragmentOf<typeof ProductCardFragment> | any;
    config?: any;
}

export function ProductCard({ product: productProp, config }: ProductCardProps) {
    const rawProduct = (productProp as any) || {};
    let fragmentProduct: any = {};
    try {
        fragmentProduct = readFragment(ProductCardFragment, productProp) || {};
    } catch {
        // Not a GraphQL fragment object
    }

    const cleanFragment = Object.fromEntries(
        Object.entries(fragmentProduct).filter(([_, v]) => v !== undefined && v !== null)
    );

    const product = {
        ...rawProduct,
        ...cleanFragment
    };

    return <MasterProductCard item={product} config={config} />;
}
