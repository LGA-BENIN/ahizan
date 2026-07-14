"use client";

import React, { useEffect, useRef, useId } from 'react';
import { getShopApiUrl } from '@/lib/vendure/api-utils';

interface SectionCodeWrapperProps {
    config: any;
    sectionId?: string;
    children: React.ReactNode;
}

/**
 * Wraps any CMS section and handles code injection:
 * - If `_codeOverride` is true, renders `_overrideHTML` instead of children
 * - Injects `_customHTMLBefore` / `_customHTMLAfter` around children
 * - Injects `_customCSS` as a scoped <style> tag
 * - Executes `_customJS` when the section mounts
 * - Automatically initializes the Leaflet map if `#ahizan-custom-map` placeholder is present
 */
export function SectionCodeWrapper({ config, sectionId, children }: SectionCodeWrapperProps) {
    const scopeId = useId().replace(/:/g, '');
    const jsRef = useRef<boolean>(false);
    const sectionRef = useRef<HTMLDivElement>(null);

    const isOverride = config?._codeOverride === true;
    const overrideHTML = config?._overrideHTML || '';
    const customCSS = config?._customCSS || '';
    const customJS = config?._customJS || '';
    const htmlBefore = config?._customHTMLBefore || '';
    const htmlAfter = config?._customHTMLAfter || '';

    const hasCode = isOverride || customCSS || customJS || htmlBefore || htmlAfter;

    // Execute custom JS once on mount
    useEffect(() => {
        if (customJS && !jsRef.current) {
            jsRef.current = true;
            try {
                // Create a scoped execution context with useful references
                const sectionEl = sectionRef.current;
                const fn = new Function('section', 'document', 'window', customJS);
                fn(sectionEl, document, window);
            } catch (err) {
                console.error(`[SectionCodeWrapper] JS error in section ${sectionId}:`, err);
            }
        }
    }, [customJS, sectionId]);

    // Automatically initialize Leaflet map if #ahizan-custom-map is rendered inside this section wrapper
    useEffect(() => {
        const mapContainer = sectionRef.current?.querySelector('#ahizan-custom-map');
        if (!mapContainer) return;

        // Retrieve active context coordinates from global window object
        const ahizan = (window as any).ahizan;
        const activeEntity = ahizan?.market || ahizan?.neighborhood;
        if (!activeEntity) return;

        const latitude = activeEntity.centerLatitude || activeEntity.latitude;
        const longitude = activeEntity.centerLongitude || activeEntity.longitude;
        if (!latitude || !longitude) return;

        const radius = activeEntity.radiusMeters || activeEntity.radius || 400;
        const name = activeEntity.name;
        const type = ahizan?.market ? 'MARKET' : 'NEIGHBORHOOD';
        const id = activeEntity.id;

        const initializeMap = (L: any) => {
            if ((mapContainer as any)._leaflet_id) return;
            const map = L.map(mapContainer).setView([latitude, longitude], 15);
            
            setTimeout(() => { map.invalidateSize(); }, 150);

            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '&copy; OpenStreetMap contributors'
            }).addTo(map);

            L.circle([latitude, longitude], {
                color: '#e31837',
                fillColor: '#e31837',
                fillOpacity: 0.1,
                radius: radius
            }).addTo(map);

            const centerIcon = L.icon({
                iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
                shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
                iconSize: [25, 41],
                iconAnchor: [12, 41],
                popupAnchor: [1, -34],
                shadowSize: [41, 41]
            });

            L.marker([latitude, longitude], { icon: centerIcon }).addTo(map)
                .bindPopup(`<b>${name}</b><br/>${type === 'MARKET' ? 'Centre du Marché' : 'Quartier'}`)
                .openPopup();

            // Load resident vendors
            const variables = type === 'MARKET' ? { marketId: id } : { locationId: id };
            const query = `
                query GetLocalVendors($marketId: ID, $locationId: ID) {
                    vendors(
                        marketId: $marketId, 
                        locationId: $locationId, 
                        options: { filter: { status: { eq: "APPROVED" } } }
                    ) {
                        items {
                            id name latitude longitude address logo { preview }
                        }
                    }
                }
            `;
            const shopApiUrl = getShopApiUrl();
            fetch(shopApiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query, variables })
            })
            .then(res => res.json())
            .then(result => {
                const vendors = result.data?.vendors?.items || [];
                const shopIcon = L.icon({
                    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
                    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
                    iconSize: [25, 41],
                    iconAnchor: [12, 41],
                    popupAnchor: [1, -34],
                    shadowSize: [41, 41]
                });
                vendors.forEach((v: any) => {
                    if (v.latitude && v.longitude) {
                        L.marker([v.latitude, v.longitude], { icon: shopIcon }).addTo(map)
                            .bindPopup(`
                                <div class="p-1 font-sans">
                                    <b class="text-sm font-bold text-slate-900">${v.name}</b>
                                    <p class="text-xs text-slate-600 my-1">${v.address || ''}</p>
                                    <a href="/vendor/${v.id}" class="inline-block text-xs font-bold text-emerald-600 hover:text-emerald-700 hover:underline mt-1">Visiter la boutique →</a>
                                </div>
                            `);
                    }
                });
            })
            .catch(err => console.error("Error loading map vendors in SectionCodeWrapper:", err));

            // Saved user location marker
            const savedLocation = localStorage.getItem('ahizan_client_location');
            if (savedLocation) {
                try {
                    const loc = JSON.parse(savedLocation);
                    if (loc.latitude && loc.longitude) {
                        const clientIcon = L.icon({
                            iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-gold.png',
                            shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
                            iconSize: [25, 41],
                            iconAnchor: [12, 41],
                            popupAnchor: [1, -34],
                            shadowSize: [41, 41]
                        });
                        L.marker([loc.latitude, loc.longitude], { icon: clientIcon }).addTo(map)
                            .bindPopup(`<b>Votre position</b><br/>${loc.name}`);
                    }
                } catch (e) {
                    console.error("Error setting user location:", e);
                }
            }
        };

        // Load Leaflet dynamically if not loaded
        if ((window as any).L) {
            initializeMap((window as any).L);
        } else {
            // CSS
            if (!document.querySelector('link[href*="leaflet.css"]')) {
                const link = document.createElement('link');
                link.rel = 'stylesheet';
                link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
                document.head.appendChild(link);
            }
            // JS
            if (!document.querySelector('script[src*="leaflet.js"]')) {
                const script = document.createElement('script');
                script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
                script.onload = () => {
                    initializeMap((window as any).L);
                };
                document.body.appendChild(script);
            } else {
                const interval = setInterval(() => {
                    if ((window as any).L) {
                        initializeMap((window as any).L);
                        clearInterval(interval);
                    }
                }, 100);
            }
        }
    }, [children]);

    // No code fields at all — render children inside contents wrapper so ref can query selector
    if (!hasCode) {
        return (
            <div
                ref={sectionRef}
                data-section-id={sectionId}
                style={{ display: 'contents' }}
            >
                {children}
            </div>
        );
    }

    // Full override mode — replace React component entirely
    if (isOverride && overrideHTML) {
        return (
            <div
                ref={sectionRef}
                data-section-id={sectionId}
                data-code-override="true"
                className={`section-code-${scopeId}`}
                suppressHydrationWarning
            >
                {customCSS && (
                    <style suppressHydrationWarning dangerouslySetInnerHTML={{
                        __html: customCSS.replace(/:scope/g, `.section-code-${scopeId}`)
                    }} />
                )}
                <div suppressHydrationWarning dangerouslySetInnerHTML={{ __html: overrideHTML }} />
            </div>
        );
    }

    // Injection mode — add HTML before/after, CSS, JS around the section
    return (
        <div
            ref={sectionRef}
            data-section-id={sectionId}
            className={`section-code-${scopeId}`}
            suppressHydrationWarning
        >
            {customCSS && (
                <style suppressHydrationWarning dangerouslySetInnerHTML={{
                    __html: customCSS.replace(/:scope/g, `.section-code-${scopeId}`)
                }} />
            )}
            {htmlBefore && (
                <div suppressHydrationWarning dangerouslySetInnerHTML={{ __html: htmlBefore }} />
            )}
            {children}
            {htmlAfter && (
                <div suppressHydrationWarning dangerouslySetInnerHTML={{ __html: htmlAfter }} />
            )}
        </div>
    );
}
