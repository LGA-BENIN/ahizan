'use client';

interface PriceProps {
    value: number;
    currencyCode?: string;
}

export function Price({value, currencyCode = 'USD'}: PriceProps) {
    if (value === undefined || value === null || isNaN(value)) {
        return <>0.00</>;
    }
    return (
        <>
            {new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: currencyCode,
            }).format(value / 100)}
        </>
    );
}
