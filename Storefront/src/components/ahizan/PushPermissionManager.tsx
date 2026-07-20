'use client';

import { useState, useEffect } from 'react';
import { Bell, X, BellOff } from 'lucide-react';

const PENDING_SUB_KEY = 'ahizan-push-pending-sub';

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

export function PushPermissionManager({ authToken, userId, shopApiUrl, vapidPublicKey: initialVapidPublicKey, delaySeconds, maxPerDay, intervalMinutes }: Props) {
    const [show, setShow] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [status, setStatus] = useState<'idle' | 'success' | 'denied'>('idle');
    const [vapidKey, setVapidKey] = useState(initialVapidPublicKey || '');

    const isLoggedIn = !!authToken;

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
        if (!('Notification' in window)) {
            console.log('[PushPermissionManager] Not showing: Browser does not support Notification API');
            return;
        }
        if (!('serviceWorker' in navigator)) {
            console.log('[PushPermissionManager] Not showing: Browser does not support Service Workers');
            return;
        }
        
        const isForceTest = typeof window !== 'undefined' && window.location.search.includes('test_push=true');
        console.log('[PushPermissionManager] Current notification permission:', Notification.permission, isForceTest ? '(Force test mode active)' : '');
        
        if (!isForceTest && Notification.permission !== 'default') {
            console.log('[PushPermissionManager] Not showing: Notification permission is not "default" (already allowed or blocked)');
            return;
        }

        // Check cooldown & daily limit (applies to ALL users unless in force test mode)
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
                            console.log(`[PushPermissionManager] Dismissed recently. Cooldown remaining: ${Math.round(intervalMin - elapsedMin)}m`);
                            return;
                        }
                    }

                    // 2. Max shows per day
                    const maxTimes = maxPerDay !== undefined ? maxPerDay : 3;
                    const oneDayAgo = now - 24 * 60 * 60 * 1000;
                    const dailyShows = (stats.dismissedTimes || []).filter((t: number) => t > oneDayAgo);
                    if (dailyShows.length >= maxTimes) {
                        console.log(`[PushPermissionManager] Exceeded daily show limit (${dailyShows.length}/${maxTimes}).`);
                        return;
                    }
                }
            } catch (e) {
                // localStorage may be blocked
            }
        }

        // Delay before showing the banner
        const delayLimit = isForceTest ? 500 : (delaySeconds !== undefined ? delaySeconds : 3) * 1000;
        console.log(`[PushPermissionManager] Scheduling prompt in ${delayLimit / 1000}s...`);
        const timer = setTimeout(() => setShow(true), delayLimit);
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
                console.log('[PushPermissionManager] Silent push subscription updated successfully.');
            } catch (e) {
                console.error('[PushPermissionManager] Silent push registration failed:', e);
            }
        };

        registerPushSilently();
    }, [authToken, vapidKey, shopApiUrl]);

    // For logged-in users: sync any pending subscription stored in localStorage from a previous non-logged-in session
    useEffect(() => {
        if (!authToken || !vapidKey) return;
        if (Notification.permission !== 'granted') return;

        const syncPending = async () => {
            try {
                const pendingRaw = localStorage.getItem(PENDING_SUB_KEY);
                if (!pendingRaw) return;

                // We have a pending subscription from when user wasn't logged in
                // Re-subscribe and sync to backend
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
                console.log('[PushPermissionManager] Synced pending push subscription to backend.');
            } catch (e) {
                console.error('[PushPermissionManager] Failed to sync pending subscription:', e);
            }
        };

        syncPending();
    }, [authToken, vapidKey, shopApiUrl]);

    const handleDismiss = () => {
        try {
            const now = Date.now();
            const rawStats = localStorage.getItem('ahizan-push-stats');
            const stats = rawStats ? JSON.parse(rawStats) : { dismissedTimes: [], lastDismissed: 0 };
            
            stats.dismissedTimes.push(now);
            stats.lastDismissed = now;
            
            // Keep only last 24 hours
            const oneDayAgo = now - 24 * 60 * 60 * 1000;
            stats.dismissedTimes = stats.dismissedTimes.filter((t: number) => t > oneDayAgo);
            
            localStorage.setItem('ahizan-push-stats', JSON.stringify(stats));
        } catch { /* ignore */ }
        setShow(false);
    };

    const handleSubscribe = async () => {
        setIsLoading(true);
        try {
            const permission = await Notification.requestPermission();
            if (permission !== 'granted') {
                setStatus('denied');
                setTimeout(() => setShow(false), 2000);
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
                    // Logged-in: sync to backend immediately
                    await subscribeToPushMutation(shopApiUrl, authToken, subscription);
                } else {
                    // Not logged in: store subscription info in localStorage for later sync
                    const subJson = subscription.toJSON();
                    localStorage.setItem(PENDING_SUB_KEY, JSON.stringify({
                        endpoint: subJson.endpoint,
                        keys: subJson.keys,
                        timestamp: Date.now(),
                    }));
                    console.log('[PushPermissionManager] Stored push subscription locally (user not logged in).');
                }
            }

            setStatus('success');
            setTimeout(() => setShow(false), 2500);
        } catch (e) {
            console.error('[PushPermissionManager] subscribe failed:', e);
            handleDismiss();
        } finally {
            setIsLoading(false);
        }
    };

    if (!show) return null;

    return (
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
                            <p className="text-sm font-semibold text-gray-900">Notifications refusées</p>
                            <p className="text-xs text-gray-500 mt-0.5">
                                Vous pouvez les activer depuis les paramètres de votre navigateur.
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
                                    onClick={handleDismiss}
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
                        onClick={handleDismiss}
                        className="text-gray-300 hover:text-gray-500 transition shrink-0 mt-0.5"
                        aria-label="Fermer"
                    >
                        <X className="w-4 h-4" />
                    </button>
                )}
            </div>
        </div>
    );
}
