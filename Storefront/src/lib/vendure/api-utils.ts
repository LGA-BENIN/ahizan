/**
 * Utility to manage Vendure API URLs and help avoid hardcoding localhost:3000.
 */
export function getBaseUrl(): string {
    const shopApiUrl = 
        process.env.VENDURE_SHOP_API_URL || 
        process.env.NEXT_PUBLIC_VENDURE_SHOP_API_URL || 
        'http://127.0.0.1:3000/shop-api';
    
    // Remove /shop-api to get the base URL for REST endpoints or assets
    return shopApiUrl.replace(/\/shop-api\/?$/, '');
}

export function getBannerApiUrl(endpoint: string): string {
    // endpoint should not start with a slash
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint.substring(1) : endpoint;
    return `${getBaseUrl()}/banner/${cleanEndpoint}`;
}

export function getAssetUrl(path: string): string {
    if (!path) return '';
    if (path.startsWith('http')) return encodeURI(path);
    if (path.startsWith('data:')) return path;
    
    const baseUrl = getBaseUrl();
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    // Encode the path to handle spaces in filenames
    return `${baseUrl}${encodeURI(cleanPath)}`;
}
