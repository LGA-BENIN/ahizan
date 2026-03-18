/**
 * Format a price value in FCFA (XOF)
 * @param price Price in cents (smallest currency unit)
 * @param currencyCode Currency code, defaults to XOF
 */
export function formatPrice(price: number, currencyCode: string = 'XOF'): string {
    return new Intl.NumberFormat('fr-FR', {
        style: 'currency',
        currency: currencyCode,
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(price / 100);
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

