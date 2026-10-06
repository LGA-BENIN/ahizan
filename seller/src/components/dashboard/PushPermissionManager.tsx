'use client';

import { useState, useEffect } from 'react';
import { Bell, X, BellOff, Lock, RefreshCw, Smartphone, Laptop, AlertTriangle, Sparkles, ChevronRight } from 'lucide-react';

const DISMISSED_KEY = 'ahizan-push-dismissed';
const DISMISSED_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 jours

interface Props {
    authToken?: string;
    userId?: string;
    shopApiUrl: string;
    vapidPublicKey: string;
}

type DevicePlatform = 'android' | 'ios' | 'desktop';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; i++) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}

async function subscribeToPushMutation(
    shopApiUrl: string,
    authToken: string,
    subscription: PushSubscription,
) {
    const { endpoint } = subscription;
    const keys = subscription.toJSON().keys as { p256dh: string; auth: string };
    await fetch(shopApiUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${authToken}`,
        },
        credentials: 'include',
        body: JSON.stringify({
            query: `
                mutation($endpoint: String!, $p256dh: String!, $auth: String!, $userAgent: String) {
                    subscribeToPush(endpoint: $endpoint, p256dh: $p256dh, auth: $auth, userAgent: $userAgent) {
                        success
                    }
                }
            `,
            variables: {
                endpoint,
                p256dh: keys.p256dh,
                auth: keys.auth,
                userAgent: navigator.userAgent,
            },
        }),
    });
}

export function PushPermissionManager({ authToken, userId, shopApiUrl, vapidPublicKey: initialVapidPublicKey }: Props) {
    const [showPrompt, setShowPrompt] = useState(false);
    const [showRecoveryModal, setShowRecoveryModal] = useState(false);
    const [isPermissionDenied, setIsPermissionDenied] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [status, setStatus] = useState<'idle' | 'success' | 'denied'>('idle');
    const [vapidKey, setVapidKey] = useState(initialVapidPublicKey || '');
    const [activeTab, setActiveTab] = useState<DevicePlatform>('desktop');

    // Detect device platform
    useEffect(() => {
        if (typeof window === 'undefined') return;
        const ua = navigator.userAgent.toLowerCase();
        if (/iphone|ipad|ipod/.test(ua)) {
            setActiveTab('ios');
        } else if (/android/.test(ua)) {
            setActiveTab('android');
        } else {
            setActiveTab('desktop');
        }
    }, []);

    // Check denied state & listen to manual trigger event
    useEffect(() => {
        if (typeof window === 'undefined') return;

        const checkPermissionState = () => {
            if ('Notification' in window) {
                const isDenied = Notification.permission === 'denied';
                setIsPermissionDenied(isDenied);
            }
        };

        checkPermissionState();

        const handleOpenRecovery = () => {
            setShowRecoveryModal(true);
        };

        const handleOpenPrompt = () => {
            if (typeof window !== 'undefined' && 'Notification' in window) {
                if (Notification.permission === 'denied') {
                    setShowRecoveryModal(true);
                } else {
                    setShowPrompt(true);
                }
            }
        };

        window.addEventListener('ahizan:open-push-recovery', handleOpenRecovery);
        window.addEventListener('ahizan:open-push-prompt', handleOpenPrompt);
        return () => {
            window.removeEventListener('ahizan:open-push-recovery', handleOpenRecovery);
            window.removeEventListener('ahizan:open-push-prompt', handleOpenPrompt);
        };
    }, []);

    useEffect(() => {
        // Fetch VAPID public key dynamically from the backend
        if (!authToken || vapidKey) return;
        fetch(shopApiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${authToken}`,
            },
            credentials: 'include',
            body: JSON.stringify({
                query: `
                    query {
                        vapidPublicKey
                    }
                `
            })
        })
        .then(res => res.json())
        .then(res => {
            if (res.data?.vapidPublicKey) {
                setVapidKey(res.data.vapidPublicKey);
            }
        })
        .catch(err => console.error('[PushPermissionManager] Failed to fetch VAPID key:', err));
    }, [authToken, shopApiUrl, vapidKey]);

    useEffect(() => {
        if (!authToken || !userId) return;
        if (!('Notification' in window)) return;
        if (!('serviceWorker' in navigator)) return;
        
        if (Notification.permission === 'denied') {
            setIsPermissionDenied(true);
            return;
        }

        if (Notification.permission !== 'default') return;

        // Check if dismissed recently
        try {
            const dismissedAt = localStorage.getItem(DISMISSED_KEY);
            if (dismissedAt) {
                const elapsed = Date.now() - parseInt(dismissedAt, 10);
                if (elapsed < DISMISSED_DURATION_MS) return;
            }
        } catch {
            // localStorage may be blocked
        }

        const timer = setTimeout(() => setShowPrompt(true), 3000);
        return () => clearTimeout(timer);
    }, [authToken, userId]);

    useEffect(() => {
        if (!authToken || !userId || !vapidKey) return;
        if (!('Notification' in window)) return;
        if (!('serviceWorker' in navigator)) return;
        if (Notification.permission !== 'granted') return;

        const registerPushSilently = async () => {
            try {
                if ('serviceWorker' in navigator) {
                    try {
                        await navigator.serviceWorker.register('/sw.js');
                    } catch (err) {
                        console.warn('[PushPermissionManager] Silent SW registration warning:', err);
                    }
                }
                const registration = await navigator.serviceWorker.ready;
                let subscription = await registration.pushManager.getSubscription();
                if (!subscription) {
                    subscription = await registration.pushManager.subscribe({
                        userVisibleOnly: true,
                        applicationServerKey: urlBase64ToUint8Array(vapidKey) as any,
                    });
                }
                await subscribeToPushMutation(shopApiUrl, authToken, subscription);
            } catch (e) {
                console.error('[PushPermissionManager] Silent push registration failed:', e);
            }
        };

        registerPushSilently();
    }, [authToken, userId, vapidKey, shopApiUrl]);

    const handleDismissPrompt = () => {
        try {
            localStorage.setItem(DISMISSED_KEY, String(Date.now()));
        } catch { /* ignore */ }
        setShowPrompt(false);
    };

    const handleSubscribe = async () => {
        if (!authToken || !vapidKey) return;
        setIsLoading(true);
        try {
            const permission = await Notification.requestPermission();
            if (permission !== 'granted') {
                setStatus('denied');
                setIsPermissionDenied(true);
                setTimeout(() => {
                    setShowPrompt(false);
                    setShowRecoveryModal(true);
                }, 1200);
                return;
            }

            if ('serviceWorker' in navigator) {
                try {
                    await navigator.serviceWorker.register('/sw.js');
                } catch (err) {
                    console.error('[PushPermissionManager] Service Worker registration failed:', err);
                }
            }
            const registration = await navigator.serviceWorker.ready;
            const subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(vapidKey) as any,
            });

            await subscribeToPushMutation(shopApiUrl, authToken, subscription);
            setStatus('success');
            setTimeout(() => setShowPrompt(false), 2500);
        } catch (e) {
            console.error('[PushPermissionManager] subscribe failed:', e);
            handleDismissPrompt();
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <>
            {/* Standard Prompt Banner */}
            {showPrompt && (
                <div
                    className="fixed top-4 left-1/2 -translate-x-1/2 z-[9999] w-[calc(100%-2rem)] max-w-md"
                    role="dialog"
                    aria-label="Activer les notifications push vendeur"
                >
                    <div className="bg-white dark:bg-card border border-gray-200 dark:border-border rounded-2xl shadow-2xl p-4 flex items-start gap-3 animate-in slide-in-from-top-4 duration-300">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                            {status === 'denied'
                                ? <BellOff className="w-5 h-5 text-red-500" />
                                : status === 'success'
                                    ? <Bell className="w-5 h-5 text-green-500" />
                                    : <Bell className="w-5 h-5 text-primary" />
                            }
                        </div>
                        <div className="flex-1 min-w-0">
                            {status === 'success' ? (
                                <>
                                    <p className="text-sm font-semibold text-gray-900 dark:text-foreground">Notifications activées</p>
                                    <p className="text-xs text-gray-500 dark:text-muted-foreground mt-0.5">
                                        Vous recevrez des alertes instantanées pour chaque nouvelle commande reçue.
                                    </p>
                                </>
                            ) : status === 'denied' ? (
                                <>
                                    <p className="text-sm font-semibold text-red-600">Notifications bloquées</p>
                                    <p className="text-xs text-gray-500 dark:text-muted-foreground mt-0.5">
                                        Ouverture du guide de déblocage...
                                    </p>
                                </>
                            ) : (
                                <>
                                    <p className="text-sm font-semibold text-gray-900 dark:text-foreground">
                                        Alertes Commandes en direct 🔔
                                    </p>
                                    <p className="text-xs text-gray-500 dark:text-muted-foreground mt-0.5">
                                        Activez les notifications pour ne manquer aucune vente sur votre boutique Ahizan.
                                    </p>
                                    <div className="flex items-center gap-2 mt-3">
                                        <button
                                            onClick={handleSubscribe}
                                            disabled={isLoading}
                                            className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-white text-xs font-semibold rounded-lg hover:bg-primary/90 transition disabled:opacity-60 shadow-sm"
                                        >
                                            {isLoading
                                                ? <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                                : <Bell className="w-3 h-3" />
                                            }
                                            {isLoading ? 'Activation...' : 'Activer les alertes'}
                                        </button>
                                        <button
                                            onClick={handleDismissPrompt}
                                            className="px-3 py-1.5 text-xs font-medium text-gray-500 dark:text-muted-foreground hover:text-gray-700 transition"
                                        >
                                            Plus tard
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                        {status === 'idle' && (
                            <button
                                onClick={handleDismissPrompt}
                                className="text-gray-300 hover:text-gray-500 transition shrink-0 mt-0.5"
                                aria-label="Fermer"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                </div>
            )}

            {/* Subtle Recovery Pill when permission is Denied for Sellers */}
            {isPermissionDenied && !showRecoveryModal && (
                <div className="fixed bottom-4 right-4 z-[9990] animate-in slide-in-from-bottom-3 duration-300">
                    <button
                        onClick={() => setShowRecoveryModal(true)}
                        className="flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold px-3.5 py-2 rounded-full shadow-lg shadow-amber-500/20 transition-all transform hover:scale-105 active:scale-95"
                        title="Vos alertes de commandes sont bloquées par votre navigateur. Cliquez pour les réactiver."
                    >
                        <BellOff className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Alertes commandes bloquées :</span>
                        <span className="underline decoration-white/70 underline-offset-2">Réactiver 🔒</span>
                    </button>
                </div>
            )}

            {/* HELPER DE RÉCUPÉRATION VENDEUR (SI BLOQUÉ DENIED) */}
            {showRecoveryModal && (
                <div 
                    className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
                    onClick={() => setShowRecoveryModal(false)}
                >
                    <div 
                        className="bg-white dark:bg-card rounded-3xl max-w-lg w-full shadow-2xl border border-gray-100 dark:border-border overflow-hidden animate-in zoom-in-95 duration-200"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Modal Header */}
                        <div className="relative bg-gradient-to-r from-amber-600 via-orange-500 to-primary p-6 text-white text-left">
                            <button 
                                onClick={() => setShowRecoveryModal(false)}
                                className="absolute top-4 right-4 p-2 rounded-full bg-white/20 hover:bg-white/30 text-white transition-colors"
                                aria-label="Fermer"
                            >
                                <X className="w-5 h-5" />
                            </button>
                            <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center mb-3">
                                <Lock className="w-6 h-6 text-white" />
                            </div>
                            <h3 className="text-xl font-bold tracking-tight">Réactiver les alertes de commandes</h3>
                            <p className="text-white/90 text-xs mt-1">
                                Votre navigateur a bloqué les notifications de votre espace vendeur. Suivez ces 3 étapes pour recevoir vos alertes de ventes :
                            </p>
                        </div>

                        {/* Platform Selector Tabs */}
                        <div className="flex border-b border-gray-100 dark:border-border bg-gray-50/70 dark:bg-muted/30 p-1.5 gap-1">
                            <button
                                onClick={() => setActiveTab('desktop')}
                                className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-semibold transition-all ${
                                    activeTab === 'desktop'
                                        ? 'bg-white dark:bg-card text-primary shadow-sm'
                                        : 'text-gray-600 dark:text-muted-foreground hover:text-gray-900 dark:hover:text-foreground'
                                }`}
                            >
                                <Laptop className="w-3.5 h-3.5" />
                                Ordinateur / PC / Mac
                            </button>
                            <button
                                onClick={() => setActiveTab('android')}
                                className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-semibold transition-all ${
                                    activeTab === 'android'
                                        ? 'bg-white dark:bg-card text-primary shadow-sm'
                                        : 'text-gray-600 dark:text-muted-foreground hover:text-gray-900 dark:hover:text-foreground'
                                }`}
                            >
                                <Smartphone className="w-3.5 h-3.5" />
                                Android
                            </button>
                            <button
                                onClick={() => setActiveTab('ios')}
                                className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-semibold transition-all ${
                                    activeTab === 'ios'
                                        ? 'bg-white dark:bg-card text-primary shadow-sm'
                                        : 'text-gray-600 dark:text-muted-foreground hover:text-gray-900 dark:hover:text-foreground'
                                }`}
                            >
                                <Sparkles className="w-3.5 h-3.5" />
                                iPhone / iPad
                            </button>
                        </div>

                        {/* Guide Content */}
                        <div className="p-6 text-left space-y-4">
                            {activeTab === 'desktop' && (
                                <div className="space-y-3.5">
                                    <div className="flex items-start gap-3 bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-800/40 p-3 rounded-2xl">
                                        <div className="w-7 h-7 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 font-bold text-xs">
                                            1
                                        </div>
                                        <div>
                                            <p className="text-xs font-semibold text-gray-900 dark:text-foreground">Cliquez sur le cadenas 🔒 dans la barre d'adresse</p>
                                            <p className="text-[11px] text-gray-600 dark:text-muted-foreground mt-0.5">
                                                En haut à gauche, juste à côté de l'adresse de votre espace vendeur.
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-start gap-3 bg-blue-50/60 dark:bg-blue-950/20 border border-blue-200/60 dark:border-blue-800/40 p-3 rounded-2xl">
                                        <div className="w-7 h-7 rounded-xl bg-blue-500 text-white flex items-center justify-center shrink-0 font-bold text-xs">
                                            2
                                        </div>
                                        <div>
                                            <p className="text-xs font-semibold text-gray-900 dark:text-foreground">Basculez « Notifications » sur « Autoriser »</p>
                                            <p className="text-[11px] text-gray-600 dark:text-muted-foreground mt-0.5">
                                                Activez le commutateur bleu à côté de <strong>Notifications</strong>.
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-start gap-3 bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-800/40 p-3 rounded-2xl">
                                        <div className="w-7 h-7 rounded-xl bg-emerald-500 text-white flex items-center justify-center shrink-0 font-bold text-xs">
                                            3
                                        </div>
                                        <div>
                                            <p className="text-xs font-semibold text-gray-900 dark:text-foreground">Rechargez votre tableau de bord 🔄</p>
                                            <p className="text-[11px] text-gray-600 dark:text-muted-foreground mt-0.5">
                                                Cliquez sur le bouton ci-dessous pour valider la réception des alertes en direct.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'android' && (
                                <div className="space-y-3.5">
                                    <div className="flex items-start gap-3 bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-800/40 p-3 rounded-2xl">
                                        <div className="w-7 h-7 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 font-bold text-xs">
                                            1
                                        </div>
                                        <div>
                                            <p className="text-xs font-semibold text-gray-900 dark:text-foreground">Appuyez sur l'icône de cadenas 🔒</p>
                                            <p className="text-[11px] text-gray-600 dark:text-muted-foreground mt-0.5">
                                                Dans la barre d'adresse en haut, touchez l'icône 🔒 à gauche de l'adresse.
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-start gap-3 bg-blue-50/60 dark:bg-blue-950/20 border border-blue-200/60 dark:border-blue-800/40 p-3 rounded-2xl">
                                        <div className="w-7 h-7 rounded-xl bg-blue-500 text-white flex items-center justify-center shrink-0 font-bold text-xs">
                                            2
                                        </div>
                                        <div>
                                            <p className="text-xs font-semibold text-gray-900 dark:text-foreground">Ouvrez « Autorisations »</p>
                                            <p className="text-[11px] text-gray-600 dark:text-muted-foreground mt-0.5">
                                                Appuyez sur <strong>Autorisations</strong> ou <strong>Paramètres du site</strong>, puis activez <strong>Notifications</strong>.
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-start gap-3 bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-800/40 p-3 rounded-2xl">
                                        <div className="w-7 h-7 rounded-xl bg-emerald-500 text-white flex items-center justify-center shrink-0 font-bold text-xs">
                                            3
                                        </div>
                                        <div>
                                            <p className="text-xs font-semibold text-gray-900 dark:text-foreground">Rechargez la page 🔄</p>
                                            <p className="text-[11px] text-gray-600 dark:text-muted-foreground mt-0.5">
                                                Cliquez sur le bouton ci-dessous pour appliquer.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'ios' && (
                                <div className="space-y-3.5">
                                    <div className="flex items-start gap-3 bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-800/40 p-3 rounded-2xl">
                                        <div className="w-7 h-7 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 font-bold text-xs">
                                            1
                                        </div>
                                        <div>
                                            <p className="text-xs font-semibold text-gray-900 dark:text-foreground">Ouvrez « Réglages » ⚙️</p>
                                            <p className="text-[11px] text-gray-600 dark:text-muted-foreground mt-0.5">
                                                Sur votre appareil Apple, ouvrez l'application <strong>Réglages</strong>.
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-start gap-3 bg-blue-50/60 dark:bg-blue-950/20 border border-blue-200/60 dark:border-blue-800/40 p-3 rounded-2xl">
                                        <div className="w-7 h-7 rounded-xl bg-blue-500 text-white flex items-center justify-center shrink-0 font-bold text-xs">
                                            2
                                        </div>
                                        <div>
                                            <p className="text-xs font-semibold text-gray-900 dark:text-foreground">Sélectionnez « Safari » ou « Ahizan Vendeur »</p>
                                            <p className="text-[11px] text-gray-600 dark:text-muted-foreground mt-0.5">
                                                Allez dans <strong>Notifications</strong> et repérez le navigateur ou l'app.
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-start gap-3 bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-800/40 p-3 rounded-2xl">
                                        <div className="w-7 h-7 rounded-xl bg-emerald-500 text-white flex items-center justify-center shrink-0 font-bold text-xs">
                                            3
                                        </div>
                                        <div>
                                            <p className="text-xs font-semibold text-gray-900 dark:text-foreground">Activez « Autoriser les notifications » 🟢</p>
                                            <p className="text-[11px] text-gray-600 dark:text-muted-foreground mt-0.5">
                                                Passez l'option en vert et revenez sur votre tableau de bord.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Action Buttons */}
                            <div className="pt-2 flex items-center gap-3">
                                <button
                                    onClick={() => window.location.reload()}
                                    className="flex-1 flex items-center justify-center gap-2 py-3 px-4 bg-primary text-white text-xs font-bold rounded-2xl shadow-lg shadow-primary/25 hover:bg-primary/90 transition-all active:scale-[0.98]"
                                >
                                    <RefreshCw className="w-3.5 h-3.5" />
                                    Actualiser la page
                                </button>
                                <button
                                    onClick={() => setShowRecoveryModal(false)}
                                    className="py-3 px-4 bg-gray-100 dark:bg-muted text-gray-700 dark:text-muted-foreground text-xs font-semibold rounded-2xl hover:bg-gray-200 dark:hover:bg-muted/80 transition-colors"
                                >
                                    Fermer
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

