'use client';

interface PriceProps {
    value: number;
    currencyCode?: string;
}

export function Price({ value, currencyCode = 'XOF' }: PriceProps) {
    return (
        <>
            {new Intl.NumberFormat('fr-FR', {
                style: 'currency',
                currency: currencyCode,
                minimumFractionDigits: 0,
                maximumFractionDigits: 0,
            }).format(value / 100)}
        </>
    );
}

