/**
 * Real Product Image Sourcing Module
 * Fetches genuine, high-quality packshots and official product images from web sources.
 */

export interface RealImageResult {
  id: string;
  url: string;
  previewUrl: string;
  title?: string;
  source: string;
  variantOptionValue?: string;
  imageType?: 'MAIN_WHITE_BG' | 'BACK' | 'PERSPECTIVE' | 'PACKAGING' | 'LIFESTYLE' | 'VARIANT_COLOR' | 'OTHER';
  width?: number;
  height?: number;
}

/**
 * Searches DuckDuckGo for direct image URLs
 */
export async function searchDuckDuckGoImages(query: string, limit: number = 8): Promise<RealImageResult[]> {
  try {
    const searchUrl = `https://duckduckgo.com/?q=${encodeURIComponent(query)}&iax=images&ia=images`;
    const res = await fetch(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'fr,fr-FR;q=0.9,en;q=0.8',
      },
      signal: AbortSignal.timeout(6000),
    });

    if (!res.ok) return [];
    const text = await res.text();
    const vqdMatch = text.match(/vqd=([0-9-]+)/) || text.match(/vqd=([\w-]+)/);
    if (!vqdMatch || !vqdMatch[1]) return [];

    const vqd = vqdMatch[1];
    const imgUrl = `https://duckduckgo.com/i.js?l=wt-wt&o=json&q=${encodeURIComponent(query)}&vqd=${vqd}&f=,,,&p=1`;
    const imgRes = await fetch(imgUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json',
      },
      signal: AbortSignal.timeout(6000),
    });

    if (!imgRes.ok) return [];
    const data = await imgRes.json() as { results?: Array<{ image?: string; thumbnail?: string; title?: string; width?: number; height?: number; source?: string }> };
    if (!data.results || !Array.isArray(data.results)) return [];

    const results: RealImageResult[] = [];
    for (const item of data.results) {
      if (!item.image || !item.image.startsWith('https://')) continue;
      // Filter out untrusted formats
      if (/\.(svg|gif)($|\?)/i.test(item.image)) continue;

      results.push({
        id: `ddg-${Date.now()}-${results.length + 1}`,
        url: item.image,
        previewUrl: item.thumbnail || item.image,
        title: item.title,
        source: item.source || 'Web Packshot',
        width: item.width,
        height: item.height,
      });

      if (results.length >= limit) break;
    }

    return results;
  } catch (err: any) {
    console.warn(`[searchDuckDuckGoImages] Error querying "${query}":`, err?.message || err);
    return [];
  }
}

/**
 * Searches Wikimedia Commons as high-trust open source fallback
 */
export async function searchWikimediaImages(query: string, limit: number = 4): Promise<RealImageResult[]> {
  try {
    const apiUrl = `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrnamespace=6&gsrsearch=${encodeURIComponent(query)}&gsrlimit=${limit}&prop=imageinfo&iiprop=url|size|mime&format=json&origin=*`;
    const res = await fetch(apiUrl, {
      headers: { 'User-Agent': 'AhizanMarketplace/2.0 (contact@ahizan.com)' },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return [];
    const data = await res.json() as any;
    const pages = data.query?.pages || {};
    const results: RealImageResult[] = [];

    for (const pageId of Object.keys(pages)) {
      const page = pages[pageId];
      const info = page.imageinfo?.[0];
      if (info?.url && info.url.startsWith('https://') && !info.url.endsWith('.svg')) {
        results.push({
          id: `wiki-${pageId}`,
          url: info.url,
          previewUrl: info.thumburl || info.url,
          title: page.title,
          source: 'Wikimedia Commons',
          width: info.width,
          height: info.height,
        });
      }
    }
    return results;
  } catch (err: any) {
    console.warn(`[searchWikimediaImages] Error querying "${query}":`, err?.message || err);
    return [];
  }
}

/**
 * Comprehensive Product & Variants Image Sourcing Engine
 */
export async function fetchRealProductImages(params: {
  brand: string;
  model: string;
  colors?: string[];
  maxTotal?: number;
}): Promise<RealImageResult[]> {
  const { brand, model, colors = [], maxTotal = 8 } = params;
  const collectedImages: RealImageResult[] = [];
  const seenUrls = new Set<string>();

  const addUnique = (items: RealImageResult[], defaultColor?: string, defaultType: RealImageResult['imageType'] = 'MAIN_WHITE_BG') => {
    for (const item of items) {
      if (!seenUrls.has(item.url) && !seenUrls.has(item.previewUrl)) {
        seenUrls.add(item.url);
        seenUrls.add(item.previewUrl);
        collectedImages.push({
          ...item,
          variantOptionValue: item.variantOptionValue || defaultColor,
          imageType: item.imageType || defaultType,
        });
      }
      if (collectedImages.length >= maxTotal) break;
    }
  };

  // 1. Search general white background packshot for the main model
  const mainQuery = `${brand} ${model} official white background packshot`.trim();
  const mainResults = await searchDuckDuckGoImages(mainQuery, 4);
  addUnique(mainResults, colors[0] || undefined, 'MAIN_WHITE_BG');

  // 2. Search specific packshots for each color variant
  for (const color of colors) {
    if (collectedImages.length >= maxTotal) break;
    const colorQuery = `${brand} ${model} ${color} packshot`.trim();
    const colorResults = await searchDuckDuckGoImages(colorQuery, 2);
    addUnique(colorResults, color, 'MAIN_WHITE_BG');
  }

  // 3. If we still need more images, run a fallback with angle queries
  if (collectedImages.length < 3) {
    const angleQuery = `${brand} ${model} vue arriere face detail`.trim();
    const angleResults = await searchDuckDuckGoImages(angleQuery, 3);
    addUnique(angleResults, undefined, 'PERSPECTIVE');
  }

  // 4. Fallback to Wikimedia Commons if still empty
  if (collectedImages.length === 0) {
    const wikiResults = await searchWikimediaImages(`${brand} ${model}`, 4);
    addUnique(wikiResults, undefined, 'MAIN_WHITE_BG');
  }

  return collectedImages;
}
