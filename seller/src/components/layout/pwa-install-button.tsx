"use client";

import React, { useState, useEffect } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";

export function PWAHeaderInstallButton() {
    const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
    const [isInstallable, setIsInstallable] = useState(false);
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
            setIsInstallable(false);
            return;
        }

        // Check if event was already captured globally
        if ((window as any).deferredPrompt) {
            setDeferredPrompt((window as any).deferredPrompt);
            setIsInstallable(true);
        }

        const handleReady = () => {
            if (checkStandalone()) return;
            setDeferredPrompt((window as any).deferredPrompt);
            setIsInstallable(true);
        };

        const handleInstalled = () => {
            setIsInstallable(false);
            setIsStandalone(true);
        };

        const handleBeforeInstallPrompt = (e: Event) => {
            if (checkStandalone()) {
                setIsInstallable(false);
                return;
            }
            e.preventDefault();
            (window as any).deferredPrompt = e;
            setDeferredPrompt(e);
            setIsInstallable(true);
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
        setIsInstallable(false);
    };

    if (!isInstallable || isStandalone) return null;

    return (
        <Button 
            onClick={handleInstallClick}
            variant="outline" 
            size="sm" 
            className="h-9 gap-1.5 px-3 hover:bg-muted text-primary font-semibold text-xs rounded-xl"
        >
            <Download className="h-4 w-4 animate-bounce" />
            <span>Installer</span>
        </Button>
    );
}
