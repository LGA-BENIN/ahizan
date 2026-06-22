"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Download, X } from "lucide-react";

export function PWAInstallPrompt() {
    const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        const handleBeforeInstallPrompt = (e: Event) => {
            e.preventDefault();
            setDeferredPrompt(e);
            setIsVisible(true);
        };

        window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

        if (window.matchMedia("(display-mode: standalone)").matches) {
            setIsVisible(false);
        }

        return () => {
            window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
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
        <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 z-50 bg-card border border-border rounded-xl shadow-2xl p-4 flex gap-3 items-center animate-in slide-in-from-bottom-5 text-card-foreground">
            <div className="flex-grow min-w-0">
                <h4 className="font-bold text-sm leading-snug">Espace Vendeur Ahizan</h4>
                <p className="text-[11px] text-muted-foreground mt-0.5 leading-normal">Installez le raccourci sur votre écran d'accueil pour gérer vos produits en un clic !</p>
            </div>
            <div className="flex items-center gap-1">
                <Button size="sm" onClick={handleInstallClick} className="gap-1 px-3 text-xs font-bold rounded-lg h-9">
                    <Download className="w-3.5 h-3.5" />
                    Installer
                </Button>
                <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:bg-muted" onClick={() => setIsVisible(false)}>
                    <X className="w-4 h-4" />
                </Button>
            </div>
        </div>
    );
}
