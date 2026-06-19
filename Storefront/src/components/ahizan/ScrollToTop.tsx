'use client';

import React, { useEffect, useState } from 'react';
import { ChevronUp } from 'lucide-react';

export function ScrollToTop({ config }: { config?: any }) {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        const toggleVisibility = () => {
            if (window.scrollY > 300) {
                setIsVisible(true);
            } else {
                setIsVisible(false);
            }
        };

        window.addEventListener('scroll', toggleVisibility);
        return () => window.removeEventListener('scroll', toggleVisibility);
    }, []);

    const scrollToTop = () => {
        window.scrollTo({
            top: 0,
            behavior: 'smooth',
        });
    };

    if (config?.enabled === false) return null;

    const style = config?.style || 'circle';
    const color = config?.color || '#e31837'; // Default Ahizan red or brand color

    return (
        <button
            onClick={scrollToTop}
            className={`fixed right-6 lg:!bottom-6 z-50 p-3 shadow-xl transition-all duration-300 hover:scale-110 focus:outline-none flex items-center justify-center ${
                isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10 pointer-events-none'
            } ${style === 'circle' ? 'rounded-full' : style === 'square' ? 'rounded-md' : 'rounded-xl'}`}
            style={{ backgroundColor: color, color: '#fff', bottom: 'var(--mobile-nav-offset, 1.5rem)' }}
            aria-label="Retour en haut"
        >
            <ChevronUp size={24} strokeWidth={3} />
        </button>
    );
}
