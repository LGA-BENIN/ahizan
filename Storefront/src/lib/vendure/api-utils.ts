/**
 * Utility to manage Vendure API URLs and help avoid hardcoding localhost:3000.
 */
export function getShopApiUrl(): string {
    if (typeof window !== 'undefined') {
        const hostname = window.location.hostname;
        if (hostname.includes('ahizan.com')) {
            return 'https://api.ahizan.com/shop-api';
        }
    }
    return process.env.NEXT_PUBLIC_VENDURE_SHOP_API_URL || 
           process.env.VENDURE_SHOP_API_URL || 
           'http://127.0.0.1:3000/shop-api';
}

export function getBaseUrl(): string {
    const shopApiUrl = getShopApiUrl();
    // Remove /shop-api to get the base URL for REST endpoints or assets
    return shopApiUrl.replace(/\/shop-api\/?$/, '');
}

export function getBannerApiUrl(endpoint: string): string {
    // endpoint should not start with a slash
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint.substring(1) : endpoint;
    return `${getBaseUrl()}/banner/${cleanEndpoint}`;
}

export function getAssetUrl(path: string | null | undefined): string | undefined {
    if (!path) return undefined;
    if (path.startsWith('http')) return encodeURI(path);
    if (path.startsWith('data:')) return path;
    
    const baseUrl = getBaseUrl();
    let cleanPath = path.startsWith('/') ? path : `/${path}`;
    // Vendure preview thumbnails use /preview/ subdir and __preview suffix
    // Convert to original asset path: /assets/preview/32/xxx__preview.jpg → /assets/32/xxx.jpg
    cleanPath = cleanPath.replace(/\/preview\//, '/');
    cleanPath = cleanPath.replace(/__preview\./, '.');
    // Encode the path to handle spaces in filenames
    return `${baseUrl}${encodeURI(cleanPath)}`;
}
