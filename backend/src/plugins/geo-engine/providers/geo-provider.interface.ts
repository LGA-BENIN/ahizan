export interface GeoSearchResult {
    latitude: number;
    longitude: number;
    displayName: string;
    rawAddress?: any;
}

export interface IGeoProvider {
    readonly name: string;
    searchAddress(query: string): Promise<GeoSearchResult[]>;
    geocode(address: string): Promise<{ latitude: number; longitude: number } | null>;
}
