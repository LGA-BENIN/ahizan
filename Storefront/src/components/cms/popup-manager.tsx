'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { X } from 'lucide-react';
import Link from 'next/link';
import { getAssetUrl } from '@/lib/vendure/api-utils';

export interface ModalConfig {
    enabled: boolean;
    type: 'image' | 'text' | 'video' | 'newsletter';
    value: string;
    link?: string;
    delay?: number;
    duration?: number;
    isClosable?: boolean;
    position?: string;
    size?: string;
    overlayColor?: string;
    overlayBlur?: number;
    borderRadius?: string;
    animation?: string;
    showOnce?: boolean;
    triggerType?: string;
    bgColor?: string;
    textColor?: string;
    padding?: string;
    title?: string;
    buttonText?: string;
    buttonLink?: string;
    buttonColor?: string;
}

const SIZE_MAP: Record<string, string> = {
    sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl', fullscreen: 'max-w-full w-full h-full',
};

export function PopupManager({ popups }: { popups: ModalConfig[] }) {
    const [activePopup, setActivePopup] = useState<ModalConfig | null>(null);
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        if (!popups || popups.length === 0) return;

        const hasSeenPopup = sessionStorage.getItem('vendure_cms_popup_seen');
        if (hasSeenPopup) return;

        const firstPopup = popups[0];
        const delay = (firstPopup.delay || 3) * 1000;

        const timer = setTimeout(() => {
            setActivePopup(firstPopup);
            setIsOpen(true);
        }, delay);

        return () => clearTimeout(timer);
    }, [popups]);

    // Auto-close
    useEffect(() => {
        if (isOpen && activePopup?.duration && activePopup.duration > 0) {
            const timer = setTimeout(handleClose, activePopup.duration * 1000);
            return () => clearTimeout(timer);
        }
    }, [isOpen, activePopup]);

    const handleClose = useCallback(() => {
        setIsOpen(false);
        sessionStorage.setItem('vendure_cms_popup_seen', 'true');
    }, []);

    // ESC key
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && activePopup?.isClosable !== false) handleClose();
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [activePopup, handleClose]);

    if (!activePopup || !isOpen) return null;

    const isClosable = activePopup.isClosable !== false;
    const size = SIZE_MAP[activePopup.size || 'md'] || SIZE_MAP.md;
    const radius = activePopup.borderRadius || '16px';
    const bgColor = activePopup.bgColor || '#ffffff';
    const textColor = activePopup.textColor || '#1e293b';
    const overlayColor = activePopup.overlayColor || 'rgba(0,0,0,0.5)';

    return (
        <div
            className="fixed inset-0 z-[9999] flex items-center justify-center"
            onClick={(e) => { if (e.target === e.currentTarget && isClosable) handleClose(); }}
        >
            {/* Overlay */}
            <div className="absolute inset-0" style={{ backgroundColor: overlayColor }} />

            {/* Content */}
            <div className={`relative z-10 ${size} w-full mx-3 sm:mx-4 animate-in fade-in zoom-in-95 duration-300`}
                style={{ borderRadius: radius, overflow: 'hidden' }}>

                {/* Close button */}
                {isClosable && (
                    <button
                        onClick={handleClose}
                        className="absolute top-2 right-2 z-50 bg-black/40 hover:bg-black/60 text-white rounded-full w-8 h-8 flex items-center justify-center transition-colors"
                        aria-label="Fermer"
                    >
                        <X className="w-4 h-4" />
                    </button>
                )}

                {/* IMAGE */}
                {activePopup.type === 'image' && (
                    <div className="relative group">
                        {activePopup.link ? (
                            <Link href={activePopup.link} onClick={handleClose}>
                                <img src={getAssetUrl(activePopup.value)} className="w-full h-auto rounded-lg shadow-2xl transition-transform duration-300 group-hover:scale-[1.01]" alt={activePopup.title || 'Promotion'} />
                            </Link>
                        ) : (
                            <img src={getAssetUrl(activePopup.value)} className="w-full h-auto rounded-lg shadow-2xl" alt={activePopup.title || 'Promotion'} />
                        )}
                    </div>
                )}

                {/* VIDEO */}
                {activePopup.type === 'video' && activePopup.value && (
                    <div className="bg-black" style={{ borderRadius: radius }}>
                        {activePopup.value.includes('youtube') || activePopup.value.includes('youtu.be') ? (
                            <iframe src={activePopup.value.replace('watch?v=', 'embed/')} className="w-full aspect-video" allow="autoplay; encrypted-media" allowFullScreen />
                        ) : (
                            <video src={getAssetUrl(activePopup.value)} className="w-full max-h-[80vh]" controls autoPlay playsInline />
                        )}
                    </div>
                )}

                {/* TEXT / HTML */}
                {activePopup.type === 'text' && (
                    <div style={{ backgroundColor: bgColor, color: textColor, padding: activePopup.padding || '32px' }}>
                        {activePopup.title && <h2 className="text-xl font-black mb-3">{activePopup.title}</h2>}
                        <div className="text-sm leading-relaxed whitespace-pre-wrap" dangerouslySetInnerHTML={{ __html: activePopup.value }} />
                        {activePopup.buttonText && (
                            <div className="mt-5">
                                <a href={activePopup.buttonLink || '#'} onClick={handleClose}
                                    className="inline-flex items-center px-6 py-3 rounded-xl font-bold text-sm text-white shadow-lg"
                                    style={{ backgroundColor: activePopup.buttonColor || '#2563eb' }}>
                                    {activePopup.buttonText}
                                </a>
                            </div>
                        )}
                    </div>
                )}

                {/* NEWSLETTER */}
                {activePopup.type === 'newsletter' && (
                    <div style={{ backgroundColor: bgColor, color: textColor, padding: activePopup.padding || '32px' }} className="text-center">
                        <div className="text-3xl mb-3">✉️</div>
                        <h2 className="text-xl font-black mb-2">{activePopup.title || 'Restez informé'}</h2>
                        <p className="text-sm opacity-70 mb-4">{activePopup.value || 'Inscrivez-vous à notre newsletter'}</p>
                        <form className="flex flex-col sm:flex-row gap-2 max-w-sm mx-auto" onSubmit={(e) => { e.preventDefault(); handleClose(); }}>
                            <input type="email" placeholder="Votre email" className="flex-1 px-4 py-2.5 rounded-xl border text-sm focus:outline-none" />
                            <button type="submit" className="px-6 py-2.5 rounded-xl font-bold text-sm text-white" style={{ backgroundColor: activePopup.buttonColor || '#2563eb' }}>
                                {activePopup.buttonText || "S'inscrire"}
                            </button>
                        </form>
                    </div>
                )}
            </div>
        </div>
    );
}
