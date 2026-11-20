export interface GeoSearchResult {
    latitude: number;
    longitude: number;
    displayName: string;
    rawAddress?: any;
}

export interface ReverseGeocodeResult {
    displayName: string;
    neighborhood?: string;
    arrondissement?: string;
    commune?: string;
    department?: string;
    country?: string;
    rawAddress?: any;
}

export interface IGeoProvider {
    readonly name: string;
    searchAddress(query: string): Promise<GeoSearchResult[]>;
    geocode(address: string): Promise<{ latitude: number; longitude: number } | null>;
    reverseGeocode?(lat: number, lng: number): Promise<ReverseGeocodeResult | null>;
}
