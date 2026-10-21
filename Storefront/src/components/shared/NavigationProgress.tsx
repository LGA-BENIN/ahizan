'use client';

import React, { useEffect, useState, useTransition } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

export function NavigationProgress() {
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const [isNavigating, setIsNavigating] = useState(false);
    const [progress, setProgress] = useState(0);

    // Ensure browser scroll restoration doesn't accidentally scroll to the bottom of new pages
    useEffect(() => {
        if (typeof window !== 'undefined' && 'scrollRestoration' in window.history) {
            window.history.scrollRestoration = 'manual';
        }
    }, []);

    // Reset progress and scroll position to top when URL changes (navigation complete)
    useEffect(() => {
        window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
        if (isNavigating) {
            setProgress(100);
            const timer = setTimeout(() => {
                setIsNavigating(false);
                setProgress(0);
            }, 250);
            return () => clearTimeout(timer);
        }
    }, [pathname, searchParams]);

    // Animate progress smoothly while navigating
    useEffect(() => {
        if (!isNavigating) return;

        setProgress(15);
        const interval = setInterval(() => {
            setProgress((prev) => {
                if (prev >= 85) return prev;
                // Increments slow down as progress gets higher
                const diff = (85 - prev) * 0.15;
                return Math.min(85, prev + Math.max(diff, 1.5));
            });
        }, 120);

        // Safety timeout in case navigation stalls
        const timeout = setTimeout(() => {
            setIsNavigating(false);
            setProgress(0);
        }, 8000);

        return () => {
            clearInterval(interval);
            clearTimeout(timeout);
        };
    }, [isNavigating]);

    // Intercept clicks on internal links to start progress immediately (0ms feedback)
    useEffect(() => {
        const handleClick = (e: MouseEvent) => {
            const target = (e.target as HTMLElement).closest('a');
            if (!target) return;

            const href = target.getAttribute('href');
            if (!href) return;

            // Ignore external links, downloads, new tabs, anchors, and tel/mailto
            if (
                target.target === '_blank' ||
                href.startsWith('http://') ||
                href.startsWith('https://') ||
                href.startsWith('mailto:') ||
                href.startsWith('tel:') ||
                href.startsWith('#') ||
                e.ctrlKey ||
                e.metaKey ||
                e.shiftKey ||
                e.altKey
            ) {
                return;
            }

            // If navigating to the exact same pathname + search, do nothing
            const currentUrl = window.location.pathname + window.location.search;
            if (href === currentUrl) return;

            // Reset scroll to top instantly before new route mounts
            window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
            setIsNavigating(true);
        };

        document.addEventListener('click', handleClick, { capture: true });
        return () => {
            document.removeEventListener('click', handleClick, { capture: true });
        };
    }, []);

    if (!isNavigating && progress === 0) return null;

    return (
        <div 
            className="fixed top-0 left-0 right-0 z-[99999] pointer-events-none h-[3px] overflow-hidden"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={progress}
        >
            <div
                className="h-full bg-gradient-to-r from-red-600 via-rose-500 to-blue-600 shadow-[0_0_12px_rgba(227,24,55,0.7)] transition-all duration-200 ease-out"
                style={{
                    width: `${progress}%`,
                    opacity: progress === 100 ? 0 : 1,
                    transition: progress === 100 ? 'width 0.15s ease-out, opacity 0.25s 0.05s ease-in' : 'width 0.2s ease-out'
                }}
            />
        </div>
    );
}
