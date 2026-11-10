"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Download, X, Share2, PlusSquare, MoreVertical, ExternalLink, ShieldCheck, Laptop } from "lucide-react";

export function PWAInstallPrompt() {
    const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
    const [isVisible, setIsVisible] = useState(false);
    const [isStandalone, setIsStandalone] = useState(false);
    const [platform, setPlatform] = useState<"ios" | "android" | "desktop">("desktop");
    const [showGuideModal, setShowGuideModal] = useState(false);
    const [isInstalling, setIsInstalling] = useState(false);

    useEffect(() => {
        if (typeof window === "undefined") return;

        const checkStandalone = () => {
            const standalone = 
                window.matchMedia("(display-mode: standalone)").matches || 
                window.matchMedia("(display-mode: fullscreen)").matches || 
                window.matchMedia("(display-mode: minimal-ui)").matches || 
                (window.navigator as any).standalone === true;
            setIsStandalone(standalone);
            return standalone;
        };

        if (checkStandalone()) {
            setIsVisible(false);
            return;
        }

        const ua = navigator.userAgent || '';
        const isIOS = /iPhone|iPad|iPod/i.test(ua);
        const isAndroid = /Android/i.test(ua);

        if (isIOS) {
            setPlatform("ios");
        } else if (isAndroid) {
            setPlatform("android");
        } else {
            setPlatform("desktop");
        }

        // Check if event was already captured globally
        if ((window as any).deferredPrompt) {
            setDeferredPrompt((window as any).deferredPrompt);
            const dismissed = sessionStorage.getItem('ahizan-seller-pwa-dismissed');
            if (!dismissed) setIsVisible(true);
        }

        const handleReady = () => {
            if (checkStandalone()) return;
            setDeferredPrompt((window as any).deferredPrompt);
            const dismissed = sessionStorage.getItem('ahizan-seller-pwa-dismissed');
            if (!dismissed) setIsVisible(true);
        };

        const handleBeforeInstallPrompt = (e: Event) => {
            if (checkStandalone()) return;
            e.preventDefault();
            (window as any).deferredPrompt = e;
            setDeferredPrompt(e);
            const dismissed = sessionStorage.getItem('ahizan-seller-pwa-dismissed');
            if (!dismissed) {
                setIsVisible(true);
            }
        };

        const handleInstalled = () => {
            setIsVisible(false);
            setShowGuideModal(false);
            setIsStandalone(true);
        };

        window.addEventListener("pwa-install-ready", handleReady);
        window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
        window.addEventListener("pwa-installed", handleInstalled);
        window.addEventListener("appinstalled", handleInstalled);

        // Show automatically after 3 seconds if not already dismissed
        const timer = setTimeout(() => {
            if (!checkStandalone() && !sessionStorage.getItem('ahizan-seller-pwa-dismissed')) {
                setIsVisible(true);
            }
        }, 3000);

        return () => {
            clearTimeout(timer);
            window.removeEventListener("pwa-install-ready", handleReady);
            window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
            window.removeEventListener("pwa-installed", handleInstalled);
            window.removeEventListener("appinstalled", handleInstalled);
        };
    }, []);

    const handleInstallClick = async () => {
        const promptEvent = deferredPrompt || (window as any).deferredPrompt;

        // 1. If native PWA prompt is ready (Chrome Android, Chrome/Edge PC)
        if (promptEvent) {
            setIsInstalling(true);
            try {
                await promptEvent.prompt();
                const choice = await promptEvent.userChoice;
                if (choice?.outcome === 'accepted') {
                    setDeferredPrompt(null);
                    (window as any).deferredPrompt = null;
                    setIsVisible(false);
                }
            } catch (err) {
                console.warn("Native PWA prompt error on seller:", err);
            } finally {
                setIsInstalling(false);
            }
            // Always return after native prompt interaction.
            // Do NOT fall through to the modal if user dismissed/cancelled the native prompt!
            return;
        }

        // 2. On Desktop PC / Mac: never show mobile APK modal
        if (platform === "desktop") {
            return;
        }

        // 3. On Mobile only when native prompt is unavailable (iOS Safari, WhatsApp/Facebook webviews)
        setShowGuideModal(true);
    };

    const handleDismiss = () => {
        setIsVisible(false);
        sessionStorage.setItem('ahizan-seller-pwa-dismissed', 'true');
    };

    if (isStandalone) return null;

    return (
        <>
            {/* Floating Banner */}
            {isVisible && !showGuideModal && (
                <div className="fixed bottom-4 left-3 right-3 md:bottom-5 md:left-auto md:right-5 md:w-[380px] z-[90] bg-white dark:bg-slate-900 border border-red-100 dark:border-slate-800 shadow-2xl rounded-2xl p-3 flex gap-3 items-center animate-in slide-in-from-bottom-5 text-slate-900 dark:text-white">
                    {/* App Icon */}
                    <div className="shrink-0 w-11 h-11 rounded-xl overflow-hidden shadow-sm border border-red-100 dark:border-slate-800 bg-white flex items-center justify-center p-1">
                        <img
                            src="/icons/seller-icon-192x192.png"
                            alt="Ahizan Vendeur"
                            className="w-full h-full object-contain"
                        />
                    </div>

                    {/* Text */}
                    <div className="flex-grow min-w-0">
                        <h4 className="font-extrabold text-xs leading-tight text-slate-900 dark:text-white">
                            Espace Vendeur Ahizan
                        </h4>
                        <p className="text-[11px] text-muted-foreground mt-0.5 leading-tight truncate">
                            {platform === "ios" 
                                ? "Accès direct sur iPhone"
                                : platform === "android"
                                ? "Accès 1-clic ou APK Vendeur"
                                : "Installer sur votre PC"}
                        </p>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 shrink-0">
                        <Button
                            size="sm"
                            onClick={handleInstallClick}
                            disabled={isInstalling}
                            className="gap-1 px-3 text-xs font-bold rounded-xl h-8 bg-[#e31837] hover:bg-[#c4122d] text-white shadow-sm cursor-pointer disabled:opacity-75"
                        >
                            <Download className="w-3.5 h-3.5" />
                            {isInstalling ? "Ouverture..." : "Installer"}
                        </Button>
                        <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 text-muted-foreground hover:bg-muted rounded-xl cursor-pointer"
                            onClick={handleDismiss}
                            aria-label="Fermer"
                        >
                            <X className="w-3.5 h-3.5" />
                        </Button>
                    </div>
                </div>
            )}

            {/* Guide & Download Modal: Centered & Elevated (z-[99999]) */}
            {showGuideModal && (
                <div 
                    className="fixed inset-0 z-[99999] bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200"
                    onClick={(e) => {
                        if (e.target === e.currentTarget) setShowGuideModal(false);
                    }}
                >
                    <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-3xl p-5 shadow-2xl border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 duration-200 my-auto max-h-[90vh] overflow-y-auto flex flex-col">
                        
                        {/* Header */}
                        <div className="flex items-start justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                            <div className="flex items-center gap-2.5">
                                <div className="w-10 h-10 rounded-2xl bg-red-50 dark:bg-red-950/40 p-1 border border-red-100 dark:border-red-900/30 shrink-0 flex items-center justify-center">
                                    <img src="/icons/seller-icon-192x192.png" alt="Ahizan Vendeur" className="w-full h-full object-contain" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-sm text-slate-900 dark:text-white leading-tight">
                                        Installer Ahizan Vendeur {platform === "ios" ? "sur iPhone" : "sur Téléphone"}
                                    </h3>
                                    <p className="text-[11px] text-muted-foreground">
                                        Gérez vos produits & commandes plus vite
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => setShowGuideModal(false)}
                                className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1 rounded-full cursor-pointer"
                                aria-label="Fermer"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Content tailored to platform */}
                        {platform === "ios" ? (
                            /* iOS / iPhone instructions */
                            <div className="py-4 space-y-3">
                                <div className="flex items-start gap-3 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50">
                                    <div className="w-7 h-7 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 font-bold text-xs">
                                        1
                                    </div>
                                    <div className="text-xs leading-relaxed text-slate-700 dark:text-slate-300">
                                        En bas de Safari, appuyez sur le bouton de <strong>Partage</strong>{" "}
                                        <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 font-semibold">
                                            <Share2 className="w-3 h-3 inline mr-1" /> Partager
                                        </span>
                                    </div>
                                </div>

                                <div className="flex items-start gap-3 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50">
                                    <div className="w-7 h-7 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 font-bold text-xs">
                                        2
                                    </div>
                                    <div className="text-xs leading-relaxed text-slate-700 dark:text-slate-300">
                                        Faites défiler le menu et appuyez sur{" "}
                                        <strong className="text-slate-900 dark:text-white">
                                            « Sur l'écran d'accueil »
                                        </strong>{" "}
                                        <PlusSquare className="w-3.5 h-3.5 inline text-blue-600 ml-1" />
                                    </div>
                                </div>

                                <div className="flex items-start gap-3 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50">
                                    <div className="w-7 h-7 rounded-lg bg-green-500/10 text-green-600 dark:text-green-400 flex items-center justify-center shrink-0 font-bold text-xs">
                                        3
                                    </div>
                                    <div className="text-xs leading-relaxed text-slate-700 dark:text-slate-300">
                                        Appuyez enfin sur <strong className="text-green-600 dark:text-green-400">Ajouter</strong> en haut à droite.
                                    </div>
                                </div>
                            </div>
                        ) : platform === "android" ? (
                            /* Android instructions */
                            <div className="py-3.5 space-y-3">
                                
                                {/* 1. APK DIRECT DOWNLOAD BUTTON */}
                                <a
                                    href="/downloads/ahizan-seller.apk"
                                    download="Ahizan-Vendeur.apk"
                                    className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-[#e31837] to-[#ff4757] hover:from-[#c4122d] hover:to-[#e31837] text-white font-bold py-3 px-4 rounded-2xl shadow-md hover:shadow-lg transition-all cursor-pointer text-xs group"
                                >
                                    <Download className="w-4 h-4 group-hover:translate-y-0.5 transition-transform" />
                                    <span>Télécharger l'APK Vendeur</span>
                                </a>
                                <p className="text-[10px] text-center text-muted-foreground -mt-1.5 flex items-center justify-center gap-1">
                                    <ShieldCheck className="w-3 h-3 text-green-500" />
                                    Fichier officiel sécurisé (installation directe)
                                </p>

                                <div className="relative flex py-1 items-center">
                                    <div className="flex-grow border-t border-slate-200 dark:border-slate-800"></div>
                                    <span className="flex-shrink mx-2 text-[10px] uppercase font-bold text-muted-foreground">OU VIA VOTRE NAVIGATEUR</span>
                                    <div className="flex-grow border-t border-slate-200 dark:border-slate-800"></div>
                                </div>

                                {/* 2. Add to Home Screen Steps */}
                                <div className="space-y-2">
                                    <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                                        <div className="w-6 h-6 rounded-lg bg-orange-500/10 text-orange-600 dark:text-orange-400 flex items-center justify-center shrink-0 font-bold text-xs">
                                            1
                                        </div>
                                        <div className="text-xs leading-relaxed text-slate-700 dark:text-slate-300">
                                            Appuyez sur le menu <strong className="text-slate-900 dark:text-white">Options</strong> (les 3 points verticaux <MoreVertical className="w-3 h-3 inline" />) en haut de votre écran.
                                        </div>
                                    </div>

                                    <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                                        <div className="w-6 h-6 rounded-lg bg-green-500/10 text-green-600 dark:text-green-400 flex items-center justify-center shrink-0 font-bold text-xs">
                                            2
                                        </div>
                                        <div className="text-xs leading-relaxed text-slate-700 dark:text-slate-300">
                                            Sélectionnez <strong className="text-slate-900 dark:text-white">« Ajouter à l'écran d'accueil »</strong> ou <strong className="text-slate-900 dark:text-white">« Installer »</strong>.
                                        </div>
                                    </div>
                                </div>

                                {/* 3. Open in Chrome button */}
                                <a
                                    href="intent://seller.ahizan.com#Intent;scheme=https;package=com.android.chrome;end"
                                    className="w-full flex items-center justify-center gap-1.5 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60 font-semibold py-2 px-3 rounded-xl text-[11px] text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
                                >
                                    <ExternalLink className="w-3 h-3 text-blue-500" />
                                    <span>Ouvrir dans Google Chrome (Installation 1-clic)</span>
                                </a>
                            </div>
                        ) : (
                            /* Desktop instructions */
                            <div className="py-4 space-y-3">
                                <div className="flex items-start gap-3 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50">
                                    <div className="w-7 h-7 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 font-bold text-xs">
                                        <Laptop className="w-4 h-4" />
                                    </div>
                                    <div className="text-xs leading-relaxed text-slate-700 dark:text-slate-300">
                                        Dans la barre d'adresse de votre navigateur (Chrome ou Edge), cliquez sur l'icône <strong>Installer l'application</strong> située à droite.
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Footer Close Button */}
                        <div className="pt-2 mt-auto border-t border-slate-100 dark:border-slate-800">
                            <Button
                                onClick={() => setShowGuideModal(false)}
                                className="w-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold rounded-xl h-10 text-xs cursor-pointer shadow-sm"
                            >
                                J'ai compris
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
