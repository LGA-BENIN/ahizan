'use client';

import { formatPrice } from '@/lib/format';

interface PriceProps {
    value: number;
    currencyCode?: string;
}

export function Price({value, currencyCode = 'XOF'}: PriceProps) {
    if (value === undefined || value === null || isNaN(value)) {
        return <span className="whitespace-nowrap">0&nbsp;FCFA</span>;
    }
    return <span className="whitespace-nowrap">{formatPrice(value, currencyCode)}</span>;
}
