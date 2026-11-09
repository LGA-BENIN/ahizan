'use client';

import { useState, useEffect } from 'react';
import { Bell, X, BellOff, Lock, RefreshCw, Smartphone, Laptop, CheckCircle2, ChevronRight, AlertCircle, Sparkles } from 'lucide-react';

const PENDING_SUB_KEY = 'ahizan-push-pending-sub';
const RECOVERY_DISMISSED_KEY = 'ahizan-push-recovery-dismissed';

interface Props {
    authToken?: string;
    userId?: string;
    shopApiUrl: string;
    vapidPublicKey: string;
    delaySeconds?: number;
    maxPerDay?: number;
    intervalMinutes?: number;
}

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
                mutation($endpoint: String!, $p256dh: String!, $auth: String!, $userAgent: String, $portal: String) {
                    subscribeToPush(endpoint: $endpoint, p256dh: $p256dh, auth: $auth, userAgent: $userAgent, portal: $portal) {
                        success
                    }
                }
            `,
            variables: {
                endpoint,
                p256dh: keys.p256dh,
                auth: keys.auth,
                userAgent: navigator.userAgent,
                portal: 'storefront',
            },
        }),
    });
}

type DevicePlatform = 'android' | 'ios' | 'desktop';

export function PushPermissionManager({ authToken, userId, shopApiUrl, vapidPublicKey: initialVapidPublicKey, delaySeconds, maxPerDay, intervalMinutes }: Props) {
    const [showPrompt, setShowPrompt] = useState(false);
    const [showRecoveryModal, setShowRecoveryModal] = useState(false);
    const [isPermissionDenied, setIsPermissionDenied] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [status, setStatus] = useState<'idle' | 'success' | 'denied'>('idle');
    const [vapidKey, setVapidKey] = useState(initialVapidPublicKey || '');
    const [activeTab, setActiveTab] = useState<DevicePlatform>('android');

    const isLoggedIn = !!authToken;

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

    // Check permission state on mount & listen to recovery trigger events
    useEffect(() => {
        if (typeof window === 'undefined') return;

        const checkPermissionState = () => {
            if ('Notification' in window) {
                const isDenied = Notification.permission === 'denied';
                setIsPermissionDenied(isDenied);
            }
        };

        checkPermissionState();

        const handleOpenRecovery = (e?: Event) => {
            const isExplicit = (e as CustomEvent)?.detail?.explicit === true;
            try {
                if (!isExplicit) {
                    if (sessionStorage.getItem(RECOVERY_DISMISSED_KEY) === '1') return;
                    const lastDismissed = localStorage.getItem(RECOVERY_DISMISSED_KEY);
                    if (lastDismissed && (Date.now() - parseInt(lastDismissed, 10) < 7 * 24 * 60 * 60 * 1000)) {
                        return;
                    }
                }
            } catch {}
            setShowRecoveryModal(true);
        };

        const handleOpenPrompt = () => {
            if (typeof window !== 'undefined' && 'Notification' in window) {
                if (Notification.permission === 'denied') {
                    // Do not harass user if denied unless explicit
                    try {
                        if (sessionStorage.getItem(RECOVERY_DISMISSED_KEY) === '1') return;
                    } catch {}
                    setShowRecoveryModal(false);
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

    // Fetch VAPID public key dynamically from the backend for ALL users if not already set
    useEffect(() => {
        if (vapidKey) return;
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (authToken) headers['Authorization'] = `Bearer ${authToken}`;

        fetch(shopApiUrl, {
            method: 'POST',
            headers,
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

    // Show the prompt for ALL users (logged in or not) based on CMS timing/frequency settings
    useEffect(() => {
        if (!('Notification' in window)) return;
        if (!('serviceWorker' in navigator)) return;
        
        const isForceTest = typeof window !== 'undefined' && window.location.search.includes('test_push=true');
        
        if (Notification.permission === 'denied') {
            setIsPermissionDenied(true);
            return;
        }

        if (!isForceTest && Notification.permission !== 'default') {
            return;
        }

        // Check cooldown & daily limit
        if (!isForceTest) {
            try {
                const rawStats = localStorage.getItem('ahizan-push-stats');
                if (rawStats) {
                    const stats = JSON.parse(rawStats);
                    const now = Date.now();

                    // 1. Cooldown interval
                    const intervalMin = intervalMinutes !== undefined ? intervalMinutes : 30;
                    if (stats.lastDismissed) {
                        const elapsedMin = (now - stats.lastDismissed) / (60 * 1000);
                        if (elapsedMin < intervalMin) {
                            return;
                        }
                    }

                    // 2. Max shows per day
                    const maxTimes = maxPerDay !== undefined ? maxPerDay : 3;
                    const oneDayAgo = now - 24 * 60 * 60 * 1000;
                    const dailyShows = (stats.dismissedTimes || []).filter((t: number) => t > oneDayAgo);
                    if (dailyShows.length >= maxTimes) {
                        return;
                    }
                }
            } catch (e) {
                // localStorage may be blocked
            }
        }

        // Delay before showing the banner
        const delayLimit = isForceTest ? 500 : (delaySeconds !== undefined ? delaySeconds : 3) * 1000;
        const timer = setTimeout(() => setShowPrompt(true), delayLimit);
        return () => clearTimeout(timer);
    }, [delaySeconds, maxPerDay, intervalMinutes]);

    // For logged-in users: silent re-registration if permission already granted
    useEffect(() => {
        if (!authToken || !vapidKey) return;
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
    }, [authToken, vapidKey, shopApiUrl]);

    // For logged-in users: sync any pending subscription stored in localStorage
    useEffect(() => {
        if (!authToken || !vapidKey) return;
        if (Notification.permission !== 'granted') return;

        const syncPending = async () => {
            try {
                const pendingRaw = localStorage.getItem(PENDING_SUB_KEY);
                if (!pendingRaw) return;

                const registration = await navigator.serviceWorker.ready;
                let subscription = await registration.pushManager.getSubscription();
                if (!subscription) {
                    subscription = await registration.pushManager.subscribe({
                        userVisibleOnly: true,
                        applicationServerKey: urlBase64ToUint8Array(vapidKey) as any,
                    });
                }
                await subscribeToPushMutation(shopApiUrl, authToken, subscription);
                localStorage.removeItem(PENDING_SUB_KEY);
            } catch (e) {
                console.error('[PushPermissionManager] Failed to sync pending subscription:', e);
            }
        };

        syncPending();
    }, [authToken, vapidKey, shopApiUrl]);

    const handleDismissRecovery = () => {
        try {
            sessionStorage.setItem(RECOVERY_DISMISSED_KEY, '1');
            localStorage.setItem(RECOVERY_DISMISSED_KEY, String(Date.now()));
        } catch { /* ignore */ }
        setShowRecoveryModal(false);
    };

    const handleDismissPrompt = () => {
        try {
            const now = Date.now();
            const rawStats = localStorage.getItem('ahizan-push-stats');
            const stats = rawStats ? JSON.parse(rawStats) : { dismissedTimes: [], lastDismissed: 0 };
            
            stats.dismissedTimes.push(now);
            stats.lastDismissed = now;
            
            const oneDayAgo = now - 24 * 60 * 60 * 1000;
            stats.dismissedTimes = stats.dismissedTimes.filter((t: number) => t > oneDayAgo);
            
            localStorage.setItem('ahizan-push-stats', JSON.stringify(stats));
        } catch { /* ignore */ }
        setShowPrompt(false);
    };

    const handleSubscribe = async () => {
        setIsLoading(true);
        try {
            const permission = await Notification.requestPermission();
            if (permission !== 'granted') {
                setStatus('denied');
                setIsPermissionDenied(true);
                setTimeout(() => {
                    setShowPrompt(false);
                }, 1200);
                return;
            }

            // Register service worker
            if ('serviceWorker' in navigator) {
                try {
                    await navigator.serviceWorker.register('/sw.js');
                } catch (err) {
                    console.error('[PushPermissionManager] Service Worker registration failed:', err);
                }
            }

            const effectiveVapidKey = vapidKey || initialVapidPublicKey;

            if (effectiveVapidKey) {
                const registration = await navigator.serviceWorker.ready;
                const subscription = await registration.pushManager.subscribe({
                    userVisibleOnly: true,
                    applicationServerKey: urlBase64ToUint8Array(effectiveVapidKey) as any,
                });

                if (isLoggedIn && authToken) {
                    await subscribeToPushMutation(shopApiUrl, authToken, subscription);
                } else {
                    const subJson = subscription.toJSON();
                    localStorage.setItem(PENDING_SUB_KEY, JSON.stringify({
                        endpoint: subJson.endpoint,
                        keys: subJson.keys,
                        timestamp: Date.now(),
                    }));
                }
            }

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
                    aria-label="Activer les notifications push"
                >
                    <div className="bg-white border border-gray-200 rounded-2xl shadow-2xl p-4 flex items-start gap-3 animate-in slide-in-from-top-4 duration-300">
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
                                    <p className="text-sm font-semibold text-gray-900">Notifications activées</p>
                                    <p className="text-xs text-gray-500 mt-0.5">
                                        {isLoggedIn
                                            ? 'Vous recevrez des alertes pour vos commandes et livraisons.'
                                            : 'Vous recevrez des alertes sur les promotions et nouveautés. Connectez-vous pour un suivi personnalisé.'
                                        }
                                    </p>
                                </>
                            ) : status === 'denied' ? (
                                <>
                                    <p className="text-sm font-semibold text-red-600">Notifications bloquées</p>
                                    <p className="text-xs text-gray-500 mt-0.5">
                                        Ouverture du guide de déblocage...
                                    </p>
                                </>
                            ) : (
                                <>
                                    <p className="text-sm font-semibold text-gray-900">
                                        Activez les notifications
                                    </p>
                                    <p className="text-xs text-gray-500 mt-0.5">
                                        {isLoggedIn
                                            ? 'Soyez informé de vos commandes, livraisons et promotions en temps réel.'
                                            : 'Recevez les meilleures offres et promotions en temps réel.'
                                        }
                                    </p>
                                    <div className="flex items-center gap-2 mt-3">
                                        <button
                                            onClick={handleSubscribe}
                                            disabled={isLoading}
                                            className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-white text-xs font-semibold rounded-lg hover:bg-primary/90 transition disabled:opacity-60"
                                        >
                                            {isLoading
                                                ? <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                                : <Bell className="w-3 h-3" />
                                            }
                                            {isLoading ? 'Activation...' : 'Activer'}
                                        </button>
                                        <button
                                            onClick={handleDismissPrompt}
                                            className="px-3 py-1.5 text-xs font-medium text-gray-500 hover:text-gray-700 transition"
                                        >
                                            Pas maintenant
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

            {/* HELPER DE RÉCUPÉRATION (SI BLOQUÉ DENIED) */}
            {showRecoveryModal && (
                <div 
                    className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
                    onClick={handleDismissRecovery}
                >
                    <div 
                        className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-gray-100 overflow-hidden animate-in zoom-in-95 duration-200"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Modal Header */}
                        <div className="relative bg-gradient-to-r from-red-500 via-amber-500 to-primary p-6 text-white text-left">
                            <button 
                                onClick={handleDismissRecovery}
                                className="absolute top-4 right-4 p-2 rounded-full bg-white/20 hover:bg-white/30 text-white transition-colors"
                                aria-label="Fermer"
                            >
                                <X className="w-5 h-5" />
                            </button>
                            <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center mb-3">
                                <Lock className="w-6 h-6 text-white" />
                            </div>
                            <h3 className="text-xl font-bold tracking-tight">Notifications bloquées</h3>
                            <p className="text-white/90 text-xs mt-1">
                                Votre navigateur a bloqué les notifications. Voici comment les réactiver en 3 étapes simples :
                            </p>
                        </div>

                        {/* Platform Selector Tabs */}
                        <div className="flex border-b border-gray-100 bg-gray-50/70 p-1.5 gap-1">
                            <button
                                onClick={() => setActiveTab('android')}
                                className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-semibold transition-all ${
                                    activeTab === 'android'
                                        ? 'bg-white text-primary shadow-sm'
                                        : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
                                }`}
                            >
                                <Smartphone className="w-3.5 h-3.5" />
                                Android / Chrome
                            </button>
                            <button
                                onClick={() => setActiveTab('ios')}
                                className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-semibold transition-all ${
                                    activeTab === 'ios'
                                        ? 'bg-white text-primary shadow-sm'
                                        : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
                                }`}
                            >
                                <Sparkles className="w-3.5 h-3.5" />
                                iPhone / Safari
                            </button>
                            <button
                                onClick={() => setActiveTab('desktop')}
                                className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-semibold transition-all ${
                                    activeTab === 'desktop'
                                        ? 'bg-white text-primary shadow-sm'
                                        : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
                                }`}
                            >
                                <Laptop className="w-3.5 h-3.5" />
                                Ordinateur / Mac
                            </button>
                        </div>

                        {/* Guide Content */}
                        <div className="p-6 text-left space-y-4">
                            {activeTab === 'android' && (
                                <div className="space-y-3.5">
                                    <div className="flex items-start gap-3 bg-amber-50/60 border border-amber-200/60 p-3 rounded-2xl">
                                        <div className="w-7 h-7 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 font-bold text-xs">
                                            1
                                        </div>
                                        <div>
                                            <p className="text-xs font-semibold text-gray-900">Appuyez sur l'icône de cadenas 🔒</p>
                                            <p className="text-[11px] text-gray-600 mt-0.5">
                                                Dans la barre d'adresse en haut de l'écran, touchez l'icône 🔒 ou les paramètres du site à gauche de l'URL.
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-start gap-3 bg-blue-50/60 border border-blue-200/60 p-3 rounded-2xl">
                                        <div className="w-7 h-7 rounded-xl bg-blue-500 text-white flex items-center justify-center shrink-0 font-bold text-xs">
                                            2
                                        </div>
                                        <div>
                                            <p className="text-xs font-semibold text-gray-900">Ouvrez « Autorisations »</p>
                                            <p className="text-[11px] text-gray-600 mt-0.5">
                                                Appuyez sur <strong>Autorisations</strong> ou <strong>Paramètres du site</strong>, puis trouvez <strong>Notifications</strong>.
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-start gap-3 bg-emerald-50/60 border border-emerald-200/60 p-3 rounded-2xl">
                                        <div className="w-7 h-7 rounded-xl bg-emerald-500 text-white flex items-center justify-center shrink-0 font-bold text-xs">
                                            3
                                        </div>
                                        <div>
                                            <p className="text-xs font-semibold text-gray-900">Basculez sur « Autoriser » 🟢</p>
                                            <p className="text-[11px] text-gray-600 mt-0.5">
                                                Activez le commutateur, puis cliquez sur le bouton <strong>Actualiser</strong> ci-dessous.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'ios' && (
                                <div className="space-y-3.5">
                                    <div className="flex items-start gap-3 bg-amber-50/60 border border-amber-200/60 p-3 rounded-2xl">
                                        <div className="w-7 h-7 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 font-bold text-xs">
                                            1
                                        </div>
                                        <div>
                                            <p className="text-xs font-semibold text-gray-900">Ouvrez les Réglages ⚙️</p>
                                            <p className="text-[11px] text-gray-600 mt-0.5">
                                                Sur votre iPhone, ouvrez l'application <strong>Réglages</strong> principale.
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-start gap-3 bg-blue-50/60 border border-blue-200/60 p-3 rounded-2xl">
                                        <div className="w-7 h-7 rounded-xl bg-blue-500 text-white flex items-center justify-center shrink-0 font-bold text-xs">
                                            2
                                        </div>
                                        <div>
                                            <p className="text-xs font-semibold text-gray-900">Sélectionnez « Safari » ou « Ahizan »</p>
                                            <p className="text-[11px] text-gray-600 mt-0.5">
                                                Faites défiler vers le bas, appuyez sur <strong>Notifications</strong> puis cherchez <strong>Safari</strong> ou l'application installée.
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-start gap-3 bg-emerald-50/60 border border-emerald-200/60 p-3 rounded-2xl">
                                        <div className="w-7 h-7 rounded-xl bg-emerald-500 text-white flex items-center justify-center shrink-0 font-bold text-xs">
                                            3
                                        </div>
                                        <div>
                                            <p className="text-xs font-semibold text-gray-900">Activez « Autoriser les notifications » 🟢</p>
                                            <p className="text-[11px] text-gray-600 mt-0.5">
                                                Basculez l'interrupteur sur vert et revenez sur votre page.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'desktop' && (
                                <div className="space-y-3.5">
                                    <div className="flex items-start gap-3 bg-amber-50/60 border border-amber-200/60 p-3 rounded-2xl">
                                        <div className="w-7 h-7 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 font-bold text-xs">
                                            1
                                        </div>
                                        <div>
                                            <p className="text-xs font-semibold text-gray-900">Cliquez sur le cadenas 🔒 dans l'URL</p>
                                            <p className="text-[11px] text-gray-600 mt-0.5">
                                                En haut à gauche de la barre d'adresse de votre navigateur (Chrome, Edge, Firefox, Brave), cliquez sur l'icône 🔒 ou réglages.
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-start gap-3 bg-blue-50/60 border border-blue-200/60 p-3 rounded-2xl">
                                        <div className="w-7 h-7 rounded-xl bg-blue-500 text-white flex items-center justify-center shrink-0 font-bold text-xs">
                                            2
                                        </div>
                                        <div>
                                            <p className="text-xs font-semibold text-gray-900">Activez « Notifications »</p>
                                            <p className="text-[11px] text-gray-600 mt-0.5">
                                                Positionnez l'option <strong>Notifications</strong> sur <strong>Autoriser</strong> ou cochez le curseur bleu.
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-start gap-3 bg-emerald-50/60 border border-emerald-200/60 p-3 rounded-2xl">
                                        <div className="w-7 h-7 rounded-xl bg-emerald-500 text-white flex items-center justify-center shrink-0 font-bold text-xs">
                                            3
                                        </div>
                                        <div>
                                            <p className="text-xs font-semibold text-gray-900">Rechargez la page 🔄</p>
                                            <p className="text-[11px] text-gray-600 mt-0.5">
                                                Cliquez sur le bouton ci-dessous pour actualiser et valider la connexion.
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
                                    onClick={handleDismissRecovery}
                                    className="py-3 px-4 bg-gray-100 text-gray-700 text-xs font-semibold rounded-2xl hover:bg-gray-200 transition-colors"
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

