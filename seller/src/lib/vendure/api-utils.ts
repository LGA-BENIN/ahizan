/**
 * Utility to manage Vendure API URLs and help avoid hardcoding localhost:3000.
 */
export function getBaseUrl(): string {
    // For images and assets, we MUST use the public URL so the Next.js Image component
    // has a valid public remotePattern and the browser can load them directly if needed.
    const shopApiUrl = 
        process.env.NEXT_PUBLIC_VENDURE_SHOP_API_URL || 
        process.env.VENDURE_SHOP_API_URL || 
        'http://127.0.0.1:3000/shop-api';
    
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
    
    const normalizedPath = path.replace(/\\/g, '/');
    if (normalizedPath.startsWith('http://') || normalizedPath.startsWith('https://')) {
        return encodeURI(normalizedPath);
    }
    if (normalizedPath.startsWith('data:')) {
        return normalizedPath;
    }
    
    const baseUrl = getBaseUrl();
    let cleanPath = normalizedPath.startsWith('/') ? normalizedPath.substring(1) : normalizedPath;
    if (!cleanPath.startsWith('assets/')) {
        cleanPath = `assets/${cleanPath}`;
    }
    return `${baseUrl}/${encodeURI(cleanPath)}`;
}
