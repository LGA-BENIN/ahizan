'use client';

import { MasterProductCard } from '@/components/commerce/master-product-card';

interface VendorProductCardProps {
    product: any;
    config?: any;
}

export function VendorProductCard({ product, config }: VendorProductCardProps) {
    return <MasterProductCard item={product} config={config} />;
}
