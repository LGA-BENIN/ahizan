'use client';

import { useEffect } from 'react';

/**
 * WatermarkProtection:
 * - On-platform browsing remains 100% clean and pristine (zero watermark displayed on screen).
 * - When a user right-clicks on ANY image on the platform to do "Save image as..." (Enregistrer l'image sous...),
 *   the image's source is seamlessly swapped before the native browser context menu opens.
 * - The saved file downloaded to their computer contains the official high-visibility Ahizan watermark.
 */
export function WatermarkProtection() {
    useEffect(() => {
        const handleRightClickStart = (e: MouseEvent | PointerEvent) => {
            // Button 2 is right click, or check if contextmenu event
            if (e.button === 2 || e.type === 'contextmenu') {
                const target = e.target as HTMLElement | null;
                if (!target) return;

                let img: HTMLImageElement | null = null;
                if (target.tagName === 'IMG') {
                    img = target as HTMLImageElement;
                } else {
                    img = target.querySelector('img') || target.closest('img');
                    if (!img && target.parentElement) {
                        img = target.parentElement.querySelector('img');
                    }
                }

                if (img && img.src && img.src.includes('/assets/')) {
                    const originalSrc = img.src;
                    const originalSrcset = img.srcset;

                    if (!originalSrc.includes('/asset-download/')) {
                        const watermarkedUrl = originalSrc.replace('/assets/', '/asset-download/');
                        img.src = watermarkedUrl;
                        if (originalSrcset) {
                            img.removeAttribute('srcset');
                        }

                        // Restore original clean source after context menu has captured the target URL
                        setTimeout(() => {
                            try {
                                if (img && img.src.includes('/asset-download/')) {
                                    img.src = originalSrc;
                                    if (originalSrcset) {
                                        img.srcset = originalSrcset;
                                    }
                                }
                            } catch (_) {}
                        }, 2500);
                    }
                }
            }
        };

        // Capture event early before native context menu evaluates target source
        window.addEventListener('pointerdown', handleRightClickStart, true);
        window.addEventListener('mousedown', handleRightClickStart, true);
        window.addEventListener('contextmenu', handleRightClickStart, true);

        return () => {
            window.removeEventListener('pointerdown', handleRightClickStart, true);
            window.removeEventListener('mousedown', handleRightClickStart, true);
            window.removeEventListener('contextmenu', handleRightClickStart, true);
        };
    }, []);

    return null;
}
