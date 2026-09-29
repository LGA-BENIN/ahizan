/**
 * Smart template variable interpolation for CMS sections.
 * Replaces placeholders like {{marche}}, {{quartier}}, {{ville}}, {{distance}}, {{position}}
 * with real-time location context from the buyer.
 */

export function interpolateLocalVariables(
    text: string | undefined | null,
    locationContext: any,
    extra?: { distance?: string | number }
): string {
    if (!text || typeof text !== 'string') return '';

    const loc = locationContext || {};
    
    const marketName = loc.type === 'MARKET' ? (loc.name || 'Marché local') : (loc.physicalMarket?.name || loc.marketName || 'Grand Marché');
    const neighborhoodName = loc.type === 'NEIGHBORHOOD' ? (loc.name || 'votre quartier') : (loc.location?.name || loc.commune || loc.name || 'votre quartier');
    const cityName = loc.city || loc.commune || (loc.type !== 'MARKET' ? loc.name : 'votre ville') || 'Bénin';
    const generalPosition = loc.name || loc.commune || 'votre zone';
    const distanceStr = extra?.distance ? `${extra.distance} km` : (loc.distanceKm ? `${loc.distanceKm} km` : 'proximité');

    return text
        .replace(/\{\{\s*(marche|marché|market|marketName|market_name)\s*\}\}/gi, marketName)
        .replace(/\{\{\s*(quartier|neighborhood|neighbourhood|zone)\s*\}\}/gi, neighborhoodName)
        .replace(/\{\{\s*(ville|city|commune)\s*\}\}/gi, cityName)
        .replace(/\{\{\s*(position|location|adresse)\s*\}\}/gi, generalPosition)
        .replace(/\{\{\s*(distance|rayon|radius)\s*\}\}/gi, distanceStr);
}
