'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Bell, BellDot, BellOff, Lock, Check, CheckCheck, ExternalLink, Loader2, Trash2, AlertTriangle, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface Notification {
    id: string;
    createdAt: string;
    eventType: string;
    title: string;
    body: string;
    actionUrl?: string;
    iconUrl?: string;
    isRead: boolean;
    channel: string;
}

interface NotificationBellProps {
    apiUrl: string;           // Vendure shop API URL
    authToken?: string;       // Bearer token
    userId?: string;          // For SSE stream
    sseBaseUrl?: string;      // SSE endpoint base URL (e.g., https://api.ahizan.com)
    style?: React.CSSProperties;
    iconColor?: string;
}

export function NotificationBell({
    apiUrl,
    authToken,
    userId,
    sseBaseUrl,
    style,
    iconColor = 'currentColor',
}: NotificationBellProps) {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [permissionState, setPermissionState] = useState<'default' | 'granted' | 'denied'>('default');
    const dropdownRef = useRef<HTMLDivElement>(null);
    const eventSourceRef = useRef<EventSource | null>(null);
    const router = useRouter();

    // Check browser notification permission
    useEffect(() => {
        if (typeof window !== 'undefined' && 'Notification' in window) {
            setPermissionState(Notification.permission);
        }
    }, [isOpen]);

    // Sync unread notification count with PWA App Badge
    useEffect(() => {
        if (typeof navigator !== 'undefined' && 'setAppBadge' in navigator) {
            if (unreadCount > 0) {
                (navigator as any).setAppBadge(unreadCount).catch((err: any) => {
                    console.error("Failed to set app badge:", err);
                });
            } else {
                (navigator as any).clearAppBadge().catch((err: any) => {
                    console.error("Failed to clear app badge:", err);
                });
            }
        }
    }, [unreadCount]);

    // ────────────────────────────────────────────
    // GraphQL helpers
    // ────────────────────────────────────────────

    const gqlFetch = useCallback(async (query: string, variables?: any) => {
        if (!authToken) return null;
        const res = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${authToken}`,
            },
            body: JSON.stringify({ query, variables }),
        });
        return res.json();
    }, [apiUrl, authToken]);

    const fetchNotifications = useCallback(async () => {
        if (!authToken) return;
        setIsLoading(true);
        try {
            const result = await gqlFetch(`
                query {
                    myNotifications(take: 20, portal: "storefront") {
                        unreadCount
                        items {
                            id createdAt eventType title body actionUrl iconUrl isRead
                        }
                    }
                }
            `);
            if (result?.data?.myNotifications) {
                setNotifications(result.data.myNotifications.items || []);
                setUnreadCount(result.data.myNotifications.unreadCount || 0);
            }
        } finally {
            setIsLoading(false);
        }
    }, [authToken, gqlFetch]);

    const markAllRead = useCallback(async () => {
        if (!authToken) return;
        await gqlFetch(`mutation { markNotificationsRead }`);
        setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
        setUnreadCount(0);
    }, [authToken, gqlFetch]);

    const markOneRead = useCallback(async (id: string) => {
        if (!authToken) return;
        await gqlFetch(`mutation($id: ID!) { markNotificationRead(id: $id) }`, { id });
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
        setUnreadCount(prev => Math.max(0, prev - 1));
    }, [authToken, gqlFetch]);

    const deleteNotification = useCallback(async (id: string) => {
        if (!authToken) return;
        await gqlFetch(`mutation($id: ID!) { deleteNotification(id: $id) }`, { id });
        setNotifications(prev => {
            const exists = prev.find(n => n.id === id);
            if (exists && !exists.isRead) {
                setUnreadCount(c => Math.max(0, c - 1));
            }
            return prev.filter(n => n.id !== id);
        });
    }, [authToken, gqlFetch]);

    // ────────────────────────────────────────────
    // SSE real-time connection
    // ────────────────────────────────────────────

    useEffect(() => {
        if (!userId || !sseBaseUrl) return;

        let es: EventSource | null = null;
        let reconnectTimeout: NodeJS.Timeout;

        function connect() {
            const sseUrl = `${sseBaseUrl}/notifications/stream/${userId}`;
            es = new EventSource(sseUrl);
            eventSourceRef.current = es;

            es.onmessage = (event) => {
                try {
                    const payload = JSON.parse(event.data);
                    
                    if (payload.actionUrl && payload.actionUrl.startsWith('/dashboard')) {
                        return;
                    }

                    if (payload.targetRole === 'VENDOR') {
                        return;
                    }

                    const channels = payload.channels || ['IN_APP'];
                    if (!channels.includes('IN_APP') && !channels.includes('ALL')) {
                        return;
                    }

                    const newNotif: Notification = {
                        id: `sse-${Date.now()}-${Math.random()}`,
                        createdAt: payload.timestamp || new Date().toISOString(),
                        eventType: payload.type,
                        title: payload.title,
                        body: payload.body,
                        actionUrl: payload.actionUrl,
                        iconUrl: payload.iconUrl,
                        isRead: false,
                        channel: payload.channel || 'IN_APP',
                    };
                    setNotifications(prev => [newNotif, ...prev].slice(0, 50));
                    setUnreadCount(prev => prev + 1);
                } catch {
                    // Ignore parse errors
                }
            };

            es.onerror = () => {
                if (es) {
                    es.close();
                }
                reconnectTimeout = setTimeout(connect, 5000);
            };
        }

        connect();

        const handleUnload = () => {
            if (es) {
                es.close();
                es = null;
            }
        };
        window.addEventListener('pagehide', handleUnload);
        window.addEventListener('beforeunload', handleUnload);

        return () => {
            window.removeEventListener('pagehide', handleUnload);
            window.removeEventListener('beforeunload', handleUnload);
            if (es) {
                es.close();
                es = null;
            }
            clearTimeout(reconnectTimeout);
        };
    }, [userId, sseBaseUrl]);

    // ────────────────────────────────────────────
    // Initial fetch + click outside close
    // ────────────────────────────────────────────

    useEffect(() => {
        if (authToken) {
            fetchNotifications();
        }
    }, [authToken]);

    useEffect(() => {
        function handleClickOutside(e: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleBellClick = () => {
        // If notifications are blocked and user is guest, trigger recovery modal directly
        if (!authToken && permissionState === 'denied') {
            window.dispatchEvent(new CustomEvent('ahizan:open-push-recovery'));
            return;
        }

        // If default and guest, prompt to activate
        if (!authToken && permissionState === 'default') {
            window.dispatchEvent(new CustomEvent('ahizan:open-push-prompt'));
            return;
        }

        setIsOpen(prev => !prev);
        if (!isOpen && authToken) {
            fetchNotifications();
        }
    };

    const formatDate = (iso: string) => {
        const d = new Date(iso);
        const now = new Date();
        const diff = (now.getTime() - d.getTime()) / 1000;
        if (diff < 60) return 'À l\'instant';
        if (diff < 3600) return `Il y a ${Math.floor(diff / 60)} min`;
        if (diff < 86400) return `Il y a ${Math.floor(diff / 3600)}h`;
        return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
    };

    return (
        <div ref={dropdownRef} className="relative" style={style}>
            {/* Bell Button */}
            <button
                onClick={handleBellClick}
                className="relative p-1.5 sm:p-2 rounded-lg hover:bg-gray-100 transition-colors focus:outline-none cursor-pointer flex items-center justify-center"
                aria-label="Notifications"
                title={
                    permissionState === 'denied'
                        ? 'Notifications bloquées par votre navigateur — Cliquez pour réactiver 🔒'
                        : permissionState === 'default'
                            ? 'Activer les notifications push'
                            : 'Notifications'
                }
            >
                {unreadCount > 0 ? (
                    <BellDot className="h-4.5 w-4.5 sm:h-5 sm:w-5" style={{ color: iconColor }} />
                ) : permissionState === 'denied' ? (
                    <div className="relative">
                        <BellOff className="h-4.5 w-4.5 sm:h-5 sm:w-5 text-amber-600" />
                        <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full border border-white" />
                    </div>
                ) : permissionState === 'default' && !authToken ? (
                    <div className="relative">
                        <Bell className="h-4.5 w-4.5 sm:h-5 sm:w-5" style={{ color: iconColor }} />
                        <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-primary rounded-full animate-ping" />
                    </div>
                ) : (
                    <Bell className="h-4.5 w-4.5 sm:h-5 sm:w-5" style={{ color: iconColor }} />
                )}

                {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 min-w-[16px] h-4 text-white text-[9px] font-bold rounded-full flex items-center justify-center px-1 bg-red-500">
                        {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                )}
            </button>

            {/* Dropdown */}
            {isOpen && (
                <div className="absolute right-0 sm:right-auto sm:left-1/2 sm:-translate-x-1/2 top-full mt-2 w-[calc(100vw-24px)] max-w-[380px] sm:w-96 bg-white rounded-3xl shadow-2xl border border-gray-100 z-[9999] overflow-hidden animate-in fade-in slide-in-from-top-4 duration-200">
                    {/* Blocked / Recovery Alert Banner */}
                    {permissionState === 'denied' && (
                        <div className="bg-gradient-to-r from-red-500/10 via-amber-500/10 to-primary/10 border-b border-red-100 p-3 flex items-start gap-2.5 text-left">
                            <Lock className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                            <div className="flex-1 min-w-0">
                                <p className="text-xs font-bold text-gray-900">Notifications bloquées 🔒</p>
                                <p className="text-[11px] text-gray-600 mt-0.5">
                                    Votre navigateur bloque les alertes. Vous ne recevrez pas les notifications en temps réel.
                                </p>
                                <button
                                    onClick={() => {
                                        setIsOpen(false);
                                        window.dispatchEvent(new CustomEvent('ahizan:open-push-recovery'));
                                    }}
                                    className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 bg-red-600 text-white rounded-lg text-[11px] font-bold hover:bg-red-700 transition-colors shadow-sm"
                                >
                                    <Lock className="w-3 h-3" />
                                    Guide de déblocage 🔒
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Default (Not yet granted) Prompt Banner */}
                    {permissionState === 'default' && (
                        <div className="bg-blue-50/80 border-b border-blue-100 p-3 flex items-start gap-2.5 text-left">
                            <Sparkles className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                            <div className="flex-1 min-w-0">
                                <p className="text-xs font-bold text-gray-900">Activez les notifications push 🔔</p>
                                <p className="text-[11px] text-gray-600 mt-0.5">
                                    Recevez des alertes en direct pour vos commandes, livraisons et promotions.
                                </p>
                                <button
                                    onClick={() => {
                                        setIsOpen(false);
                                        window.dispatchEvent(new CustomEvent('ahizan:open-push-prompt'));
                                    }}
                                    className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 bg-primary text-white rounded-lg text-[11px] font-bold hover:bg-primary/90 transition-colors shadow-sm"
                                >
                                    <Bell className="w-3 h-3" />
                                    Activer les notifications
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Header */}
                    <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                        <span className="font-semibold text-sm text-gray-900">
                            Notifications
                            {unreadCount > 0 && (
                                <span className="ml-2 px-2 py-0.5 text-xs bg-red-100 text-red-600 rounded-full font-medium">
                                    {unreadCount} non lue{unreadCount > 1 ? 's' : ''}
                                </span>
                            )}
                        </span>
                        {unreadCount > 0 && (
                            <button
                                onClick={markAllRead}
                                className="text-xs text-primary font-medium flex items-center gap-1 hover:underline"
                            >
                                <CheckCheck className="h-3 w-3" />
                                Tout marquer lu
                            </button>
                        )}
                    </div>

                    {/* List */}
                    <div className="max-h-96 overflow-y-auto divide-y divide-gray-50">
                        {isLoading ? (
                            <div className="flex items-center justify-center py-10">
                                <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
                            </div>
                        ) : !authToken ? (
                            <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
                                <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-2">
                                    <Bell className="h-6 w-6 text-primary" />
                                </div>
                                <p className="text-sm font-semibold text-gray-900">Connectez-vous</p>
                                <p className="text-xs text-gray-500 mt-1 max-w-xs">
                                    Connectez-vous à votre compte pour suivre vos commandes et recevoir vos notifications personnalisées.
                                </p>
                                <Link
                                    href="/sign-in"
                                    onClick={() => setIsOpen(false)}
                                    className="mt-3 px-4 py-1.5 bg-primary text-white rounded-xl text-xs font-bold hover:bg-primary/90 transition-colors"
                                >
                                    Se connecter
                                </Link>
                            </div>
                        ) : notifications.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-10 text-gray-400">
                                <Bell className="h-8 w-8 mb-2 opacity-40" />
                                <p className="text-sm font-medium">Aucune notification</p>
                            </div>
                        ) : (
                            notifications.map((notif) => (
                                <div
                                    key={notif.id}
                                    className={`flex gap-3 px-4 py-3 hover:bg-gray-50 transition-colors cursor-pointer ${!notif.isRead ? 'bg-blue-50/40' : ''}`}
                                    onClick={() => {
                                        if (!notif.isRead) markOneRead(notif.id);
                                        setIsOpen(false);
                                        if (notif.actionUrl) {
                                            if (notif.actionUrl.startsWith('/')) {
                                                router.push(notif.actionUrl);
                                            } else {
                                                window.location.href = notif.actionUrl;
                                            }
                                        }
                                    }}
                                >
                                    {/* Icon */}
                                    <div className="flex-shrink-0 w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center mt-0.5">
                                        {notif.iconUrl ? (
                                            <img src={notif.iconUrl} alt="" className="w-5 h-5 object-contain" />
                                        ) : (
                                            <Bell className="h-4 w-4 text-primary" />
                                        )}
                                    </div>

                                    {/* Content */}
                                    <div className="flex-1 min-w-0">
                                        <p className={`text-sm leading-snug ${!notif.isRead ? 'font-semibold text-gray-900' : 'font-medium text-gray-700'}`}>
                                            {notif.title}
                                        </p>
                                        {notif.body && (
                                            <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{notif.body}</p>
                                        )}
                                        <p className="text-[10px] text-gray-400 mt-1">{formatDate(notif.createdAt)}</p>
                                    </div>

                                    {/* Right controls (unread dot & delete icon) */}
                                    <div className="flex flex-col items-center justify-between gap-2 self-stretch flex-shrink-0">
                                        {!notif.isRead ? (
                                            <div className="w-2 h-2 rounded-full bg-blue-500 mt-2" />
                                        ) : (
                                            <div className="w-2 h-2" />
                                        )}
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                deleteNotification(notif.id);
                                            }}
                                            className="text-gray-400 hover:text-red-500 p-1 hover:bg-red-50 rounded-md transition-colors"
                                            title="Supprimer cette notification"
                                        >
                                            <Trash2 className="h-3.5 w-3.5" />
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    {/* Footer */}
                    <div className="border-t border-gray-100 px-4 py-2.5 flex items-center justify-between bg-gray-50/50">
                        {authToken ? (
                            <Link
                                href="/account/notifications"
                                className="flex items-center gap-1.5 text-xs text-primary font-medium hover:underline"
                                onClick={() => setIsOpen(false)}
                            >
                                Voir tout
                                <ExternalLink className="h-3 w-3" />
                            </Link>
                        ) : (
                            <span className="text-[11px] text-gray-400">Ahizan Notifications</span>
                        )}
                        <button
                            onClick={() => {
                                setIsOpen(false);
                                window.dispatchEvent(new CustomEvent('ahizan:open-push-recovery'));
                            }}
                            className="text-xs text-gray-500 hover:text-primary font-semibold transition-colors flex items-center gap-1 cursor-pointer"
                        >
                            <Lock className="w-3 h-3" />
                            Débloquer / Guide 🔒
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

