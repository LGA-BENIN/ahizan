/**
 * Client Event Tracker pour le Storefront Next.js.
 * Envoie les événements d'impression, clic, ajout au panier de manière non-bloquante (navigator.sendBeacon ou fetch async).
 */
export function trackCmsEvent(eventType: string, data?: { productId?: string; geoZoneId?: string; metadata?: any }) {
    if (typeof window === 'undefined') return;

    const payload = {
        eventType,
        productId: data?.productId,
        geoZoneId: data?.geoZoneId,
        metadata: data?.metadata,
        timestamp: new Date().toISOString()
    };

    const url = '/api/cms-events/track';
    
    if (navigator.sendBeacon) {
        const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
        navigator.sendBeacon(url, blob);
    } else {
        fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
            keepalive: true
        }).catch(err => console.error('[trackCmsEvent] Failed to send event:', err));
    }
}
