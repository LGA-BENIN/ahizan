import { headers } from 'next/headers';

export async function getUrlContext() {
  let host = '';
  try {
    const reqHeaders = await headers();
    host = reqHeaders.get('x-forwarded-host') || reqHeaders.get('host') || '';
  } catch {
    // Fallback if headers() cannot be accessed
  }

  const isLocal = host.includes('localhost') || host.includes('127.0.0.1');
  // Si on accède à l'application via un domaine public (ex: auth.ahizan.com), on force les URLs de production
  const useProdUrls = !isLocal || process.env.NODE_ENV === 'production';

  const storefrontUrl = process.env.PUBLIC_STOREFRONT_URL || (useProdUrls ? 'https://ahizan.com' : 'http://localhost:3001');
  const sellerUrl = process.env.PUBLIC_SELLER_URL || (useProdUrls ? 'https://seller.ahizan.com' : 'http://localhost:3002');

  return { storefrontUrl, sellerUrl, useProdUrls };
}

export function sanitizeRedirectUrl(url: string | undefined | null, useProdUrls: boolean): string {
  if (!url) return '';

  let cleanedUrl = url;
  if (useProdUrls) {
    cleanedUrl = url
      .replace('http://localhost:3001', 'https://ahizan.com')
      .replace('http://localhost:3002', 'https://seller.ahizan.com');
  }

  // Enforce secure redirection targets:
  // - Safe relative paths (starting with / but not //)
  const isRelative = cleanedUrl.startsWith('/') && !cleanedUrl.startsWith('//');
  
  // - Official allowed domains
  const isAllowedDomain = 
    cleanedUrl.startsWith('https://ahizan.com') ||
    cleanedUrl.startsWith('https://www.ahizan.com') ||
    cleanedUrl.startsWith('https://seller.ahizan.com') ||
    cleanedUrl.startsWith('https://auth.ahizan.com') ||
    (!useProdUrls && (
      cleanedUrl.startsWith('http://localhost:') ||
      cleanedUrl.startsWith('http://127.0.0.1:')
    ));

  if (isRelative || isAllowedDomain) {
    return cleanedUrl;
  }

  return '';
}
