"use client";
import React, { useState, useEffect } from 'react';
import { getAssetUrl } from '@/lib/vendure/api-utils';
import { LottiePreloader } from '@/components/shared/animations/LottiePreloader';

export function AhizanPreloader({ config }: { config: any }) {
    const [status, setStatus] = useState<'drawing' | 'looping' | 'pulse-final' | 'fading' | 'hidden'>('drawing');
    const [isPageLoaded, setIsPageLoaded] = useState(false);

    // 1. Détecter si la page est interactive ou complètement chargée
    useEffect(() => {
        if (typeof window === 'undefined') return;

        const checkInteractive = () => {
            return document.readyState === 'complete' || document.readyState === 'interactive';
        };

        if (checkInteractive()) {
            setIsPageLoaded(true);
        } else {
            const handleLoad = () => setIsPageLoaded(true);
            window.addEventListener('DOMContentLoaded', handleLoad);
            window.addEventListener('load', handleLoad);
            return () => {
                window.removeEventListener('DOMContentLoaded', handleLoad);
                window.removeEventListener('load', handleLoad);
            };
        }
    }, []);

    // 2. Gérer le cycle de vie et l'orchestration des états de l'animation
    useEffect(() => {
        if (config === null) return;

        if (config?.preloader?.type === 'none') {
            setStatus('hidden');
            return;
        }

        if (config?.preloader?.type !== 'default') {
            // Pour les autres types (image, vidéo, lottie), on fait un fondu après 2 secondes
            const timer = setTimeout(() => {
                setStatus('fading');
                const hideTimer = setTimeout(() => setStatus('hidden'), 800);
                return () => clearTimeout(hideTimer);
            }, 2000);
            return () => clearTimeout(timer);
        }

        // --- TYPE PAR DÉFAUT (Animation A-Z Premium avec logo officiel) ---
        // Étape A : À 2.4s, l'animation de tracé A-Z initiale et la révélation à 100% sont complétées.
        // On décide si l'on doit passer directement à la pulsation finale ou boucler en pulsation infinie.
        const drawingTimer = setTimeout(() => {
            const isReady = document.readyState === 'complete' || document.readyState === 'interactive';
            if (isReady) {
                setStatus('pulse-final');
            } else {
                setStatus('looping');
            }
        }, 2400);

        // Étape B : Timeout de sécurité absolu (UX Resilience)
        // Sur les appareils mobiles physiques, certains scripts ou connexions tierces lentes
        // peuvent bloquer l'événement 'load' du document indéfiniment.
        // Ce minuteur de 5,5 secondes garantit que l'utilisateur n'est jamais bloqué et libère l'interface dans tous les cas.
        const safetyTimer = setTimeout(() => {
            setIsPageLoaded(true);
            setStatus((prev) => {
                if (prev === 'drawing' || prev === 'looping') {
                    return 'pulse-final';
                }
                return prev;
            });
        }, 5500);

        return () => {
            clearTimeout(drawingTimer);
            clearTimeout(safetyTimer);
        };
    }, [config]);

    // Étape C : Si on est en état de pulsation infinie ('looping') et que la page se charge enfin,
    // on déclenche instantanément la pulsation finale de transition.
    useEffect(() => {
        if (status === 'looping' && isPageLoaded) {
            setStatus('pulse-final');
        }
    }, [status, isPageLoaded]);

    // Étape C : La pulsation finale dure 600ms, après quoi on passe au fondu de sortie ('fading'),
    // puis on masque définitivement le composant du DOM ('hidden').
    useEffect(() => {
        if (status === 'pulse-final') {
            const timer = setTimeout(() => {
                setStatus('fading');
                const hideTimer = setTimeout(() => {
                    setStatus('hidden');
                }, 700);
                return () => clearTimeout(hideTimer);
            }, 600);
            return () => clearTimeout(timer);
        }
    }, [status]);

    if (status === 'hidden') return null;

    const type = config?.preloader?.type || 'default';
    const mediaUrl = config?.preloader?.url ? getAssetUrl(config.preloader.url) : null;

    return (
        <div className={`fixed inset-0 z-[99999] flex items-center justify-center bg-background transition-opacity duration-700 ${status === 'fading' ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
            {type === 'default' && (
                <div className={`flex flex-col items-center justify-center preloader-${status}`}>
                    <style dangerouslySetInnerHTML={{ __html: `
                        .ahizan-preloader-container {
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            width: 260px;
                            height: 260px;
                            position: relative;
                        }
                        .preloader-circle-spinner {
                            position: absolute;
                            width: 100%;
                            height: 100%;
                            top: 0;
                            left: 0;
                            pointer-events: none;
                            transform-origin: center center;
                            animation: preloader-spin 1.2s linear infinite;
                            opacity: 0.3;
                        }
                        .logo-wrapper {
                            width: 70%;
                            height: 70%;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            transform-origin: center center;
                            position: relative;
                            z-index: 10;
                        }
                        .logo-masked {
                            width: 100%;
                            height: 100%;
                        }
                        .preloader-looping .logo-wrapper {
                            animation: infinite-pulse 1.6s ease-in-out infinite;
                        }
                        .preloader-pulse-final .logo-wrapper {
                            animation: final-pulse 0.6s cubic-bezier(0.25, 1, 0.5, 1) forwards;
                        }
                        .mask-path {
                            fill: none;
                            stroke: #ffffff;
                            stroke-linecap: round;
                            stroke-linejoin: round;
                        }
                        .mask-a {
                            stroke-width: 380;
                            stroke-dasharray: 1020;
                            stroke-dashoffset: 1020;
                            animation: draw-a 0.6s cubic-bezier(0.4, 0, 0.2, 1) 0.1s forwards;
                        }
                        .mask-z {
                            stroke-width: 360;
                            stroke-dasharray: 2050;
                            stroke-dashoffset: 2050;
                            animation: draw-z 0.8s cubic-bezier(0.4, 0, 0.2, 1) 0.6s forwards;
                        }
                        .mask-basket-top {
                            stroke-width: 260;
                            stroke-dasharray: 700;
                            stroke-dashoffset: 700;
                            animation: draw-basket-top 0.5s ease-out 1.2s forwards;
                        }
                        .mask-basket-bottom {
                            stroke-width: 260;
                            stroke-dasharray: 650;
                            stroke-dashoffset: 650;
                            animation: draw-basket-bottom 0.5s ease-out 1.4s forwards;
                        }
                        .mask-wheel-left {
                            transform-origin: 680px 1750px;
                            transform: scale(0);
                            animation: pop-wheel 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) 1.8s forwards;
                        }
                        .mask-wheel-right {
                            transform-origin: 1180px 1750px;
                            transform: scale(0);
                            animation: pop-wheel 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) 1.95s forwards;
                        }
                        .mask-full-reveal {
                            opacity: 0;
                            animation: reveal-all 0.3s ease-out 2.1s forwards;
                        }
                        .preloader-looping .mask-full-reveal,
                        .preloader-pulse-final .mask-full-reveal {
                            opacity: 1 !important;
                        }

                        @keyframes draw-a {
                            to { stroke-dashoffset: 0; }
                        }
                        @keyframes draw-z {
                            to { stroke-dashoffset: 0; }
                        }
                        @keyframes draw-basket-top {
                            to { stroke-dashoffset: 0; }
                        }
                        @keyframes draw-basket-bottom {
                            to { stroke-dashoffset: 0; }
                        }
                        @keyframes pop-wheel {
                            0% { transform: scale(0); }
                            70% { transform: scale(1.15); }
                            100% { transform: scale(1); }
                        }
                        @keyframes reveal-all {
                            to { opacity: 1; }
                        }
                        @keyframes infinite-pulse {
                            0% { transform: scale(1); filter: drop-shadow(0 0 0px rgba(227, 30, 36, 0)); }
                            50% { transform: scale(1.04); filter: drop-shadow(0 0 15px rgba(227, 30, 36, 0.25)); }
                            100% { transform: scale(1); filter: drop-shadow(0 0 0px rgba(227, 30, 36, 0)); }
                        }
                        @keyframes final-pulse {
                            0% { transform: scale(1); }
                            40% { transform: scale(1.08); filter: drop-shadow(0 0 25px rgba(227, 30, 36, 0.55)); }
                            100% { transform: scale(1); }
                        }
                        @keyframes preloader-spin {
                            0% { transform: rotate(0deg); }
                            100% { transform: rotate(360deg); }
                        }
                    ` }} />

                    <div className="ahizan-preloader-container animate-in zoom-in-50 duration-500">
                        {/* Circle spinner around the logo */}
                        <svg className="preloader-circle-spinner" viewBox="0 0 100 100">
                            <circle 
                                cx="50" 
                                cy="50" 
                                r="46" 
                                fill="none" 
                                stroke="#E31E24" 
                                strokeWidth="0.6" 
                                strokeDasharray="132 12"
                                strokeLinecap="round"
                            />
                        </svg>

                        {/* Wrapper div for robust cross-browser animations */}
                        <div className="logo-wrapper">
                            <svg width="100%" height="100%" viewBox="0 0 2000 2021" className="logo-masked">
                            <defs>
                                <mask id="ahizan-az-mask" maskUnits="userSpaceOnUse" x="0" y="0" width="2000" height="2021">
                                    {/* Oblique line for the 'A' montant */}
                                    <path d="M 530 450 L 350 1450" className="mask-path mask-a" />
                                    
                                    {/* Polyline path for the 'Z' */}
                                    <path d="M 520 450 L 950 450 L 630 1450 L 1200 1450" className="mask-path mask-z" />
                                    
                                    {/* Curves for the basket */}
                                    <path d="M 900 650 Q 1200 780 1500 750" className="mask-path mask-basket-top" />
                                    <path d="M 780 1150 Q 1060 1280 1350 1250" className="mask-path mask-basket-bottom" />
                                    
                                    {/* The two wheels */}
                                    <circle cx="680" cy="1750" r="240" fill="#ffffff" className="mask-wheel-left" />
                                    <circle cx="1180" cy="1750" r="240" fill="#ffffff" className="mask-wheel-right" />

                                    {/* Rectangle to fully restore the original complex mosaic logo once drawing is completed */}
                                    <rect x="0" y="0" width="2000" height="2021" fill="#ffffff" className="mask-full-reveal" />
                                </mask>
                            </defs>
                            {/* SVG Image element that is masked */}
                            <image 
                                href="/logo-ahizan-official.svg" 
                                width="2000" 
                                height="2021" 
                                mask="url(#ahizan-az-mask)"
                            />
                        </svg>
                        </div>
                    </div>
                </div>
            )}
            
            {type === 'image' && mediaUrl && (
                <div className="flex flex-col items-center gap-6">
                    <img src={mediaUrl} className="max-w-[240px] h-auto object-contain animate-pulse" alt="Loading..." />
                    <div className="w-48 h-1 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-[#002f6c] w-full animate-ahizan-rush opacity-30"></div>
                    </div>
                </div>
            )}

            {type === 'video' && mediaUrl && (
                <div className="absolute inset-0">
                    <video 
                        src={mediaUrl} 
                        autoPlay 
                        muted 
                        loop
                        playsInline 
                        className="w-full h-full object-cover"
                    />
                </div>
            )}

            {type === 'lottie' && mediaUrl && (
                <LottiePreloader url={mediaUrl} />
            )}
        </div>
    );
}
