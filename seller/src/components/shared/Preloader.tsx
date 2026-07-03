"use client";
import React, { useState, useEffect } from 'react';
import { LottiePreloader } from '@/components/shared/animations/LottiePreloader';

export function AhizanPreloader() {
    const [status, setStatus] = useState<'showing' | 'fading' | 'hidden'>('showing');
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

    // 2. Gestion du fondu de sortie après chargement complet ou timeout de sécurité
    useEffect(() => {
        if (isPageLoaded) {
            // Maintenir le préchargeur visible au moins 1.5s pour une transition douce
            const timer = setTimeout(() => {
                setStatus('fading');
                const hideTimer = setTimeout(() => setStatus('hidden'), 600);
                return () => clearTimeout(hideTimer);
            }, 1500);
            return () => clearTimeout(timer);
        } else {
            // Timeout de sécurité de 5 secondes au cas où un script externe bloque l'événement load
            const safetyTimer = setTimeout(() => {
                setStatus('fading');
                const hideTimer = setTimeout(() => setStatus('hidden'), 600);
                return () => clearTimeout(hideTimer);
            }, 5000);
            return () => clearTimeout(safetyTimer);
        }
    }, [isPageLoaded]);

    if (status === 'hidden') return null;

    return (
        <div 
            className={`fixed inset-0 z-[99999] flex items-center justify-center bg-white transition-opacity duration-500 ${
                status === 'fading' ? 'opacity-0 pointer-events-none' : 'opacity-100'
            }`}
        >
            <div style={{ width: '240px', height: '240px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <LottiePreloader url="/preloader.json" loop={true} speed={1.0} />
            </div>
        </div>
    );
}
