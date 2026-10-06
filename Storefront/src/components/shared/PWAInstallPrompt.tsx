"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Download, X } from "lucide-react";

export function PWAInstallPrompt() {
    const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
    const [isVisible, setIsVisible] = useState(false);
    const [deviceType, setDeviceType] = useState<"mobile" | "pc">("mobile");
    const [isStandalone, setIsStandalone] = useState(false);

    useEffect(() => {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('/sw.js').catch(err => {
                console.error('Service Worker registration failed:', err);
            });
        }

        const checkStandalone = () => {
            const standalone = 
                window.matchMedia("(display-mode: standalone)").matches || 
                window.matchMedia("(display-mode: fullscreen)").matches || 
                window.matchMedia("(display-mode: minimal-ui)").matches || 
                (window.navigator as any).standalone === true;
            setIsStandalone(standalone);
            return standalone;
        };

        const standalone = checkStandalone();
        if (standalone) {
            setIsVisible(false);
            return;
        }

        const ua = navigator.userAgent || '';
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
        setDeviceType(isMobile ? "mobile" : "pc");

        // Check if event was already captured globally
        if ((window as any).deferredPrompt) {
            setDeferredPrompt((window as any).deferredPrompt);
            setIsVisible(true);
        }

        const handleReady = () => {
            if (checkStandalone()) return;
            setDeferredPrompt((window as any).deferredPrompt);
            const dismissed = sessionStorage.getItem('ahizan-pwa-dismissed');
            if (!dismissed) {
                setIsVisible(true);
            }
        };

        const handleInstalled = () => {
            setIsVisible(false);
            setIsStandalone(true);
        };

        const handleBeforeInstallPrompt = (e: Event) => {
            if (checkStandalone()) {
                setIsVisible(false);
                return;
            }
            e.preventDefault();
            (window as any).deferredPrompt = e;
            setDeferredPrompt(e);
            const dismissed = sessionStorage.getItem('ahizan-pwa-dismissed');
            if (!dismissed) {
                setIsVisible(true);
            }
        };

        window.addEventListener("pwa-install-ready", handleReady);
        window.addEventListener("pwa-installed", handleInstalled);
        window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
        window.addEventListener("appinstalled", handleInstalled);

        // Show automatically after 4 seconds if not dismissed
        const timer = setTimeout(() => {
            if (!checkStandalone() && !sessionStorage.getItem('ahizan-pwa-dismissed')) {
                setIsVisible(true);
            }
        }, 4000);

        return () => {
            clearTimeout(timer);
            window.removeEventListener("pwa-install-ready", handleReady);
            window.removeEventListener("pwa-installed", handleInstalled);
            window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
            window.removeEventListener("appinstalled", handleInstalled);
        };
    }, []);

    const handleInstallClick = async () => {
        const promptEvent = deferredPrompt || (window as any).deferredPrompt;
        if (!promptEvent) return;
        try {
            await promptEvent.prompt();
            const { outcome } = await promptEvent.userChoice;
            console.log(`PWA Install Choice: ${outcome}`);
            if (outcome === 'accepted') {
                setDeferredPrompt(null);
                (window as any).deferredPrompt = null;
                setIsVisible(false);
            }
        } catch (err) {
            console.error("Error triggering native PWA prompt:", err);
        }
    };

    const handleDismiss = () => {
        setIsVisible(false);
        sessionStorage.setItem('ahizan-pwa-dismissed', 'true');
    };

    if (isStandalone || !isVisible) return null;

    return (
        <div className="fixed bottom-20 left-4 right-4 md:bottom-5 md:left-auto md:right-5 md:w-[380px] z-50 bg-white dark:bg-slate-900 border border-red-100 dark:border-slate-800 shadow-2xl rounded-2xl p-3.5 flex gap-3.5 items-center animate-in slide-in-from-bottom-5 text-slate-900 dark:text-white">
            {/* App Icon */}
            <div className="shrink-0 w-12 h-12 rounded-xl overflow-hidden shadow-sm border border-red-200 bg-white flex items-center justify-center">
                <img
                    src="/icons/icon-96x96.png"
                    alt="Ahizan"
                    className="w-10 h-10 object-contain"
                    onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                    }}
                />
                <div className="w-10 h-10 rounded-lg bg-[#e31837] flex items-center justify-center text-white font-black text-xs">
                    AHZ
                </div>
            </div>

            {/* Text */}
            <div className="flex-grow min-w-0">
                <h4 className="font-extrabold text-sm leading-tight text-slate-900 dark:text-white">Installer l'application</h4>
                <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">
                    Accès 1-clic et suivi des commandes en direct.
                </p>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1 shrink-0">
                <Button
                    size="sm"
                    onClick={handleInstallClick}
                    className="gap-1.5 px-3.5 text-xs font-bold rounded-xl h-9 bg-[#e31837] hover:bg-[#c4122d] text-white shadow-sm cursor-pointer"
                >
                    <Download className="w-3.5 h-3.5" />
                    Installer
                </Button>
                <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 text-muted-foreground hover:bg-muted rounded-xl cursor-pointer"
                    onClick={handleDismiss}
                    aria-label="Fermer"
                >
                    <X className="w-4 h-4" />
                </Button>
            </div>
        </div>
    );
}
