'use client';

interface PriceProps {
    value: number;
    currencyCode?: string;
}

export function Price({value, currencyCode = 'XOF'}: PriceProps) {
    if (value === undefined || value === null || isNaN(value)) {
        return <>0 FCFA</>;
    }
    return (
        <>
            {new Intl.NumberFormat('fr-FR', {
                style: 'currency',
                currency: currencyCode,
                minimumFractionDigits: 0,
                maximumFractionDigits: 0,
            }).format(value)}
        </>
    );
}
