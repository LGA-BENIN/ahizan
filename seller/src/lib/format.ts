/**
 * Format a price value in FCFA (XOF)
 * @param price Price in cents (smallest currency unit)
 * @param currencyCode Currency code, defaults to XOF
 */
export function formatPrice(price: number, currencyCode: string = 'XOF'): string {
    const zeroDecimalCurrencies = ['BIF', 'CLP', 'DJF', 'GNF', 'JPY', 'KMF', 'KRW', 'MGA', 'PYG', 'RWF', 'UGX', 'VND', 'VUV', 'XAF', 'XOF', 'XPF'];
    const divisor = zeroDecimalCurrencies.includes(currencyCode.toUpperCase()) ? 1 : 100;

    return new Intl.NumberFormat('fr-FR', {
        style: 'currency',
        currency: currencyCode,
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(price / divisor);
}

type DateFormat = 'short' | 'long';

/**
 * Format a date string
 * @param dateString ISO date string
 * @param format 'short' (15 janv. 2024) or 'long' (15 janvier 2024)
 */
export function formatDate(dateString: string, format: DateFormat = 'short'): string {
    const options: Intl.DateTimeFormatOptions = format === 'long'
        ? { year: 'numeric', month: 'long', day: 'numeric' }
        : { year: 'numeric', month: 'short', day: 'numeric' };

    return new Date(dateString).toLocaleDateString('fr-FR', options);
}

const zeroDecimalCurrencies = ['BIF', 'CLP', 'DJF', 'GNF', 'JPY', 'KMF', 'KRW', 'MGA', 'PYG', 'RWF', 'UGX', 'VND', 'VUV', 'XAF', 'XOF', 'XPF'];

export function priceToSubunit(amount: number, currencyCode: string = 'XOF'): number {
    const isZeroDecimal = zeroDecimalCurrencies.includes(currencyCode.toUpperCase());
    return isZeroDecimal ? amount : amount * 100;
}

export function priceFromSubunit(subunitAmount: number, currencyCode: string = 'XOF'): number {
    const isZeroDecimal = zeroDecimalCurrencies.includes(currencyCode.toUpperCase());
    return isZeroDecimal ? subunitAmount : subunitAmount / 100;
}

