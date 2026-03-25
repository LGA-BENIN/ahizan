/**
 * Formats a phone number to E.164 international format.
 * This is required by the Brevo SMS API.
 *
 * @param phone - Raw phone number entered by the user
 * @param defaultPrefix - Country code prefix to add if missing (e.g. '+229' for Benin)
 * @returns Formatted phone number in E.164 format (e.g. '+22961234567')
 */
export function formatPhoneE164(phone: string | null | undefined, defaultPrefix = '+229'): string | undefined {
    if (!phone) return undefined;

    // Remove all spaces, dashes, and parentheses
    const cleaned = phone.replace(/[\s\-()]/g, '');

    // Already has international format
    if (cleaned.startsWith('+')) return cleaned;

    // Has leading 00 (international prefix without +)
    if (cleaned.startsWith('00')) return '+' + cleaned.slice(2);

    // Assume local number — prepend the default country prefix
    return defaultPrefix + cleaned;
}
