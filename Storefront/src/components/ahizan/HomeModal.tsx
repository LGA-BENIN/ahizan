"use client";

import { useState, useEffect, useCallback } from "react";
import { X } from "lucide-react";
import Link from "next/link";
import { getAssetUrl } from "@/lib/vendure/api-utils";

interface ModalItem {
    enabled?: boolean;
    type?: 'image' | 'text' | 'video' | 'newsletter';
    value?: string;
    link?: string;
    delay?: number;
    duration?: number;
    isClosable?: boolean;
    position?: 'center' | 'bottom' | 'top' | 'bottom-right';
    size?: 'sm' | 'md' | 'lg' | 'xl' | 'fullscreen';
    overlayColor?: string;
    overlayBlur?: number;
    borderRadius?: string;
    animation?: 'fade' | 'zoom' | 'slide-up' | 'slide-down';
    showOnce?: boolean;
    triggerType?: 'timer' | 'scroll' | 'exit' | 'immediate';
    bgColor?: string;
    textColor?: string;
    padding?: string;
    title?: string;
    buttonText?: string;
    buttonLink?: string;
    buttonColor?: string;
}

interface HomeModalProps {
    config: any;
}

const SIZE_MAP: Record<string, string> = {
    sm: 'max-w-sm',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    fullscreen: 'max-w-full w-full h-full',
};

const POSITION_MAP: Record<string, string> = {
    center: 'items-center justify-center',
    bottom: 'items-end justify-center',
    top: 'items-start justify-center pt-16',
    'bottom-right': 'items-end justify-end p-4',
};

const ANIMATION_IN: Record<string, string> = {
    fade: 'animate-in fade-in duration-300',
    zoom: 'animate-in zoom-in-95 duration-300',
    'slide-up': 'animate-in slide-in-from-bottom-8 duration-300',
    'slide-down': 'animate-in slide-in-from-top-8 duration-300',
};

function SingleModal({ modal, onClose }: { modal: ModalItem; onClose: () => void }) {
    const isClosable = modal.isClosable !== false;
    const size = SIZE_MAP[modal.size || 'md'] || SIZE_MAP.md;
    const animation = ANIMATION_IN[modal.animation || 'fade'] || ANIMATION_IN.fade;
    const radius = modal.borderRadius || '16px';
    const bgColor = modal.bgColor || '#ffffff';
    const textColor = modal.textColor || '#1e293b';

    return (
        <div
            className={`relative ${size} w-full mx-2 sm:mx-4 ${animation}`}
            style={{ borderRadius: radius, overflow: 'hidden' }}
        >
            {/* Close Button */}
            {isClosable && (
                <button
                    onClick={onClose}
                    className="absolute top-2 right-2 z-50 bg-black/40 hover:bg-black/60 text-white rounded-full w-8 h-8 flex items-center justify-center transition-colors"
                    aria-label="Fermer"
                >
                    <X className="w-4 h-4" />
                </button>
            )}

            {/* IMAGE type */}
            {modal.type === 'image' && modal.value && (
                <div className="relative">
                    {modal.link ? (
                        <Link href={modal.link} onClick={onClose}>
                            <img
                                src={getAssetUrl(modal.value)}
                                alt={modal.title || 'Promotion'}
                                className="w-full h-auto object-cover max-h-[85vh] hover:scale-[1.01] transition-transform duration-500"
                            />
                        </Link>
                    ) : (
                        <img
                            src={getAssetUrl(modal.value)}
                            alt={modal.title || 'Promotion'}
                            className="w-full h-auto object-cover max-h-[85vh]"
                        />
                    )}
                </div>
            )}

            {/* VIDEO type */}
            {modal.type === 'video' && modal.value && (
                <div className="relative bg-black" style={{ borderRadius: radius }}>
                    {modal.value.includes('youtube') || modal.value.includes('youtu.be') ? (
                        <iframe
                            src={modal.value.replace('watch?v=', 'embed/')}
                            className="w-full aspect-video"
                            allow="autoplay; encrypted-media"
                            allowFullScreen
                        />
                    ) : (
                        <video
                            src={getAssetUrl(modal.value)}
                            className="w-full max-h-[80vh]"
                            controls
                            autoPlay
                            playsInline
                        />
                    )}
                </div>
            )}

            {/* TEXT / HTML type */}
            {modal.type === 'text' && (
                <div style={{ backgroundColor: bgColor, color: textColor, padding: modal.padding || '32px' }}>
                    {modal.title && (
                        <h2 className="text-xl sm:text-2xl font-black mb-3 tracking-tight">{modal.title}</h2>
                    )}
                    {modal.value && (
                        <div className="text-sm leading-relaxed opacity-90" dangerouslySetInnerHTML={{ __html: modal.value }} />
                    )}
                    {modal.buttonText && (
                        <div className="mt-6">
                            <a
                                href={modal.buttonLink || '#'}
                                onClick={onClose}
                                className="inline-flex items-center px-6 py-3 rounded-xl font-bold text-sm text-white transition-transform hover:scale-105 active:scale-95 shadow-lg"
                                style={{ backgroundColor: modal.buttonColor || '#2563eb' }}
                            >
                                {modal.buttonText}
                            </a>
                        </div>
                    )}
                </div>
            )}

            {/* NEWSLETTER type */}
            {modal.type === 'newsletter' && (
                <div style={{ backgroundColor: bgColor, color: textColor, padding: modal.padding || '32px' }} className="text-center">
                    <div className="text-3xl mb-3">✉️</div>
                    <h2 className="text-xl font-black mb-2">{modal.title || 'Restez informé'}</h2>
                    <p className="text-sm opacity-70 mb-4">{modal.value || 'Inscrivez-vous à notre newsletter'}</p>
                    <form className="flex flex-col sm:flex-row gap-2 max-w-sm mx-auto" onSubmit={(e) => { e.preventDefault(); onClose(); }}>
                        <input
                            type="email"
                            placeholder="Votre email"
                            className="flex-1 px-4 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                            style={{ borderColor: modal.buttonColor || '#e2e8f0' }}
                        />
                        <button
                            type="submit"
                            className="px-6 py-2.5 rounded-xl font-bold text-sm text-white"
                            style={{ backgroundColor: modal.buttonColor || '#2563eb' }}
                        >
                            {modal.buttonText || "S'inscrire"}
                        </button>
                    </form>
                </div>
            )}
        </div>
    );
}

export function HomeModal({ config }: HomeModalProps) {
    // Support both formats: { modals: [...] } and legacy single { enabled, type, value, ... }
    const modals: ModalItem[] = config?.modals
        ? config.modals.filter((m: any) => m.enabled)
        : (config?.enabled ? [config] : []);

    const [activeIndex, setActiveIndex] = useState(-1);
    const [shown, setShown] = useState<Set<number>>(new Set());

    const activeModal = activeIndex >= 0 ? modals[activeIndex] : null;

    const closeModal = useCallback(() => {
        if (activeIndex >= 0) {
            setShown(prev => new Set(prev).add(activeIndex));
        }
        setActiveIndex(-1);
    }, [activeIndex]);

    // Timer-based trigger for each modal
    useEffect(() => {
        if (modals.length === 0) return;

        const timers: ReturnType<typeof setTimeout>[] = [];
        modals.forEach((m, idx) => {
            if (shown.has(idx)) return;
            if (m.showOnce && sessionStorage.getItem(`ahizan_modal_${idx}`)) return;

            const trigger = m.triggerType || 'timer';
            if (trigger === 'timer' || trigger === 'immediate') {
                const delay = trigger === 'immediate' ? 100 : ((m.delay || 3) * 1000);
                timers.push(setTimeout(() => {
                    setActiveIndex(idx);
                    if (m.showOnce) sessionStorage.setItem(`ahizan_modal_${idx}`, '1');
                }, delay));
            }
        });

        return () => timers.forEach(clearTimeout);
    }, [modals.length, shown]);

    // Scroll-based trigger
    useEffect(() => {
        const scrollModals = modals
            .map((m, idx) => ({ ...m, idx }))
            .filter(m => m.triggerType === 'scroll' && !shown.has(m.idx));

        if (scrollModals.length === 0) return;

        const handler = () => {
            const scrollPercent = (window.scrollY / (document.body.scrollHeight - window.innerHeight)) * 100;
            for (const m of scrollModals) {
                if (scrollPercent >= 30) { // trigger at 30% scroll
                    setActiveIndex(m.idx);
                    if (m.showOnce) sessionStorage.setItem(`ahizan_modal_${m.idx}`, '1');
                    break;
                }
            }
        };

        window.addEventListener('scroll', handler, { passive: true });
        return () => window.removeEventListener('scroll', handler);
    }, [modals.length, shown]);

    // Auto-close duration
    useEffect(() => {
        if (activeModal && activeModal.duration && activeModal.duration > 0) {
            const timer = setTimeout(closeModal, activeModal.duration * 1000);
            return () => clearTimeout(timer);
        }
    }, [activeModal, closeModal]);

    // ESC key to close
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && activeModal?.isClosable !== false) closeModal();
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [activeModal, closeModal]);

    if (!activeModal) return null;

    const position = POSITION_MAP[activeModal.position || 'center'] || POSITION_MAP.center;
    const overlayColor = activeModal.overlayColor || 'rgba(0,0,0,0.5)';
    const overlayBlur = activeModal.overlayBlur || 0;

    return (
        <div
            className={`fixed inset-0 z-[9999] flex ${position}`}
            onClick={(e) => {
                if (e.target === e.currentTarget && activeModal.isClosable !== false) closeModal();
            }}
        >
            {/* Overlay */}
            <div
                className="absolute inset-0 animate-in fade-in duration-200"
                style={{
                    backgroundColor: overlayColor,
                    backdropFilter: overlayBlur > 0 ? `blur(${overlayBlur}px)` : undefined,
                }}
            />

            {/* Modal Content */}
            <div className="relative z-10">
                <SingleModal modal={activeModal} onClose={closeModal} />
            </div>
        </div>
    );
}
