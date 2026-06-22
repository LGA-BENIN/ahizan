"use client";

import React, { useState, useEffect } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";

export function PWAHeaderInstallButton() {
    const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
    const [isInstallable, setIsInstallable] = useState(false);

    useEffect(() => {
        const handleBeforeInstallPrompt = (e: Event) => {
            e.preventDefault();
            setDeferredPrompt(e);
            setIsInstallable(true);
        };
        window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
        if (window.matchMedia("(display-mode: standalone)").matches) {
            setIsInstallable(false);
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
        setIsInstallable(false);
    };

    if (!isInstallable) return null;

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
