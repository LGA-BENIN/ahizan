import { IGeoProvider, GeoSearchResult, ReverseGeocodeResult } from './geo-provider.interface';

export class OSMProvider implements IGeoProvider {
    readonly name = 'OpenStreetMap';

    async searchAddress(query: string): Promise<GeoSearchResult[]> {
        const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=5&addressdetails=1`;
        try {
            const res = await fetch(url, {
                headers: { 'User-Agent': 'Ahizan-GeoEngine/1.0 (contact@ahizan.com)' }
            });
            if (!res.ok) return [];
            const data = await res.json() as any[];
            return data.map(item => ({
                latitude: parseFloat(item.lat),
                longitude: parseFloat(item.lon),
                displayName: item.display_name,
                rawAddress: item.address,
            }));
        } catch (e) {
            console.error('[OSMProvider] searchAddress error:', e);
            return [];
        }
    }

    async geocode(address: string): Promise<{ latitude: number; longitude: number } | null> {
        const results = await this.searchAddress(address);
        if (results.length > 0) {
            return { latitude: results[0].latitude, longitude: results[0].longitude };
        }
        return null;
    }

    async reverseGeocode(lat: number, lng: number): Promise<ReverseGeocodeResult | null> {
        const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1`;
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 2500);
            const res = await fetch(url, {
                headers: { 
                    'User-Agent': 'Ahizan-GeoEngine/1.0 (contact@ahizan.com)',
                    'Accept-Language': 'fr'
                },
                signal: controller.signal
            });
            clearTimeout(timeoutId);
            if (!res.ok) return null;
            const data = await res.json() as any;
            const addr = data.address || {};
            const neighborhood = addr.neighbourhood || addr.suburb || addr.quarter || addr.residential || addr.village;
            const arrondissement = addr.city_district;
            const commune = addr.city || addr.town || addr.municipality || addr.county;
            const department = addr.state;
            const country = addr.country || 'Bénin';
            const displayName = neighborhood || arrondissement || commune || data.display_name || 'Bénin';

            return {
                displayName,
                neighborhood,
                arrondissement,
                commune,
                department,
                country,
                rawAddress: addr,
            };
        } catch (e) {
            console.warn('[OSMProvider] reverseGeocode fallback timeout or error:', e);
            return null;
        }
    }
}
