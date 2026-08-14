import { IGeoProvider, GeoSearchResult } from './geo-provider.interface';

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
}
