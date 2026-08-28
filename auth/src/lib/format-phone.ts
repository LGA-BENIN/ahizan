export function formatPhoneE164(phone: string | null | undefined, defaultPrefix = '+229'): string | undefined {
    if (!phone) return undefined;
    const cleaned = phone.replace(/[\s\-()]/g, '');
    if (cleaned.startsWith('+')) return cleaned;
    if (cleaned.startsWith('00')) return '+' + cleaned.slice(2);
    return defaultPrefix + cleaned;
}
