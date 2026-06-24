'use client';

import { formatPrice } from '@/lib/format';

interface PriceProps {
    value: number;
    currencyCode?: string;
}

export function Price({value, currencyCode = 'XOF'}: PriceProps) {
    if (value === undefined || value === null || isNaN(value)) {
        return <>0 FCFA</>;
    }
    return <>{formatPrice(value, currencyCode)}</>;
}
