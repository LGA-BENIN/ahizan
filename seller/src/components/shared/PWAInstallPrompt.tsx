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

        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        setDeviceType(isMobile ? "mobile" : "pc");

        // Check if event was already captured globally
        if ((window as any).deferredPrompt) {
            setDeferredPrompt((window as any).deferredPrompt);
            setIsVisible(true);
        }

        const handleReady = () => {
            if (checkStandalone()) return;
            setDeferredPrompt((window as any).deferredPrompt);
            setIsVisible(true);
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
            setIsVisible(true);
        };

        window.addEventListener("pwa-install-ready", handleReady);
        window.addEventListener("pwa-installed", handleInstalled);
        window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
        window.addEventListener("appinstalled", handleInstalled);

        return () => {
            window.removeEventListener("pwa-install-ready", handleReady);
            window.removeEventListener("pwa-installed", handleInstalled);
            window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
            window.removeEventListener("appinstalled", handleInstalled);
        };
    }, []);

    const handleInstallClick = async () => {
        if (!deferredPrompt) return;
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        console.log(`PWA Install Choice: ${outcome}`);
        setDeferredPrompt(null);
        setIsVisible(false);
    };

    if (!isVisible) return null;

    return (
        <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 z-50 bg-card border border-border rounded-2xl shadow-2xl p-3 flex gap-3 items-center animate-in slide-in-from-bottom-5 text-card-foreground">
            {/* Icône PWA */}
            <div className="shrink-0 w-12 h-12 rounded-xl overflow-hidden shadow-sm border border-border/50 bg-white flex items-center justify-center">
                <img
                    src="/icons/seller-icon-96x96.png"
                    alt="Ahizan Vendeur"
                    className="w-10 h-10 object-contain"
                />
            </div>
            {/* Texte */}
            <div className="flex-grow min-w-0">
                <h4 className="font-bold text-sm leading-snug">Espace Vendeur Ahizan</h4>
                <p className="text-[11px] text-muted-foreground mt-0.5 leading-normal">
                    Gérez vos produits en un clic depuis votre {deviceType === "mobile" ? "mobile" : "PC"}.
                </p>
            </div>
            {/* Actions */}
            <div className="flex items-center gap-1 shrink-0">
                <Button size="sm" onClick={handleInstallClick} className="gap-1 px-3 text-xs font-bold rounded-xl h-9">
                    <Download className="w-3.5 h-3.5" />
                    Installer
                </Button>
                <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:bg-muted rounded-xl" onClick={() => setIsVisible(false)}>
                    <X className="w-4 h-4" />
                </Button>
            </div>
        </div>
    );
}
