/**
 * Pure utility function to check if a vendor has configured their physical/GPS location.
 * Safe to import in both Server Components and Client Components.
 */
export function isVendorLocationValid(vendor: any): boolean {
    if (!vendor) return false;
    const lat = Number(vendor.latitude);
    const lng = Number(vendor.longitude);
    const hasCoords = vendor.latitude != null && vendor.longitude != null && !isNaN(lat) && !isNaN(lng) && (lat !== 0 || lng !== 0);
    const hasMarket = Boolean(vendor.physicalMarket?.id || vendor.location?.id);
    return Boolean(hasCoords || hasMarket);
}
