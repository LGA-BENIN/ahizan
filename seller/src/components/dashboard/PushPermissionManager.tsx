'use client';

import { useState, useEffect } from 'react';
import { Bell, X, BellOff } from 'lucide-react';

const DISMISSED_KEY = 'ahizan-push-dismissed';
const DISMISSED_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 jours

interface Props {
    authToken?: string;
    userId?: string;
    shopApiUrl: string;
    vapidPublicKey: string;
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

export function PushPermissionManager({ authToken, userId, shopApiUrl, vapidPublicKey: initialVapidPublicKey }: Props) {
    const [show, setShow] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [status, setStatus] = useState<'idle' | 'success' | 'denied'>('idle');
    const [vapidKey, setVapidKey] = useState(initialVapidPublicKey || '');

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
        // Ne s'affiche que si :
        // 1. L'utilisateur est connecté
        // 2. Le navigateur supporte les notifications et SW
        // 3. La permission est 'default' (ni accordée ni refusée)
        // 4. L'utilisateur n'a pas récemment dismissé
        if (!authToken || !userId) return;
        if (!('Notification' in window)) return;
        if (!('serviceWorker' in navigator)) return;
        if (Notification.permission !== 'default') return;

        // Vérifier si dismissé récemment
        try {
            const dismissedAt = localStorage.getItem(DISMISSED_KEY);
            if (dismissedAt) {
                const elapsed = Date.now() - parseInt(dismissedAt, 10);
                if (elapsed < DISMISSED_DURATION_MS) return;
            }
        } catch {
            // localStorage peut être bloqué (mode privé strict)
        }

        // Délai de 3 secondes avant d'afficher le banner (laisser la page se charger)
        const timer = setTimeout(() => setShow(true), 3000);
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
                console.log('[PushPermissionManager] Silent push subscription updated successfully.');
            } catch (e) {
                console.error('[PushPermissionManager] Silent push registration failed:', e);
            }
        };

        registerPushSilently();
    }, [authToken, userId, vapidKey, shopApiUrl]);

    const handleDismiss = () => {
        try {
            localStorage.setItem(DISMISSED_KEY, String(Date.now()));
        } catch { /* ignore */ }
        setShow(false);
    };

    const handleSubscribe = async () => {
        if (!authToken || !vapidKey) return;
        setIsLoading(true);
        try {
            const permission = await Notification.requestPermission();
            if (permission !== 'granted') {
                setStatus('denied');
                setTimeout(() => setShow(false), 2000);
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
                                Vous recevrez des alertes pour vos commandes et livraisons.
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
                                Soyez informé de vos commandes, livraisons et promotions en temps réel.
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
