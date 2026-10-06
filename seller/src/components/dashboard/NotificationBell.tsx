'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Bell, BellDot, BellOff, Lock, Sparkles, Check, CheckCheck, ExternalLink, Loader2, Trash2 } from 'lucide-react';
import Link from 'next/link';

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
    const dropdownRef = useRef<HTMLDivElement>(null);
    const eventSourceRef = useRef<EventSource | null>(null);

    const [permissionState, setPermissionState] = useState<'default' | 'granted' | 'denied'>('default');

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
        const res = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
            },
            body: JSON.stringify({ query, variables }),
        });
        return res.json();
    }, [apiUrl, authToken]);

    const fetchNotifications = useCallback(async () => {
        if (!authToken) return;
        setIsLoading(true);
        try {
            const { data } = await gqlFetch(`
                query {
                    myNotifications(take: 20, portal: "seller") {
                        unreadCount
                        items {
                            id createdAt eventType title body actionUrl iconUrl isRead
                        }
                    }
                }
            `);
            if (data?.myNotifications) {
                setNotifications(data.myNotifications.items || []);
                setUnreadCount(data.myNotifications.unreadCount || 0);
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
                    
                    // Filter: Only display notifications meant for the seller dashboard
                    if (!payload.actionUrl || !payload.actionUrl.startsWith('/dashboard')) {
                        return;
                    }

                    // Filter: Only display in-app notifications
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
                // Reconnect in 5 seconds
                reconnectTimeout = setTimeout(connect, 5000);
            };
        }

        connect();

        return () => {
            if (es) {
                es.close();
            }
            clearTimeout(reconnectTimeout);
        };
    }, [userId, sseBaseUrl]);

    // ────────────────────────────────────────────
    // Initial fetch + click outside close
    // ────────────────────────────────────────────

    useEffect(() => {
        fetchNotifications();
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

    if (!authToken) return null;

    // ────────────────────────────────────────────
    // Render
    // ────────────────────────────────────────────

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
                onClick={() => {
                    const willOpen = !isOpen;
                    setIsOpen(willOpen);
                    if (willOpen) {
                        fetchNotifications().then(() => {
                            markAllRead();
                        });
                        if (unreadCount > 0) {
                            markAllRead();
                        }
                    }
                }}
                className="relative p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-muted transition-colors focus:outline-none cursor-pointer flex items-center justify-center"
                aria-label="Notifications"
                title={
                    permissionState === 'denied'
                        ? 'Notifications commandes bloquées — Cliquez pour débloquer 🔒'
                        : permissionState === 'default'
                            ? 'Activer les alertes commandes push'
                            : 'Notifications'
                }
            >
                {unreadCount > 0 ? (
                    <BellDot className="h-5 w-5" style={{ color: iconColor }} />
                ) : permissionState === 'denied' ? (
                    <div className="relative">
                        <BellOff className="h-5 w-5 text-amber-500" />
                        <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full border border-white" />
                    </div>
                ) : (
                    <Bell className="h-5 w-5" style={{ color: iconColor }} />
                )}
                {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 min-w-[16px] h-4 text-white text-[9px] font-bold rounded-full flex items-center justify-center px-1 bg-red-500">
                        {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                )}
            </button>

            {/* Dropdown */}
            {isOpen && (
                <div className="absolute right-0 sm:right-auto sm:left-1/2 sm:-translate-x-1/2 top-full mt-2 w-[calc(100vw-24px)] max-w-[380px] sm:w-96 bg-white dark:bg-card rounded-2xl shadow-2xl border border-gray-100 dark:border-border z-[9999] overflow-hidden animate-in fade-in slide-in-from-top-4 duration-200">
                    {/* Blocked / Recovery Alert Banner */}
                    {permissionState === 'denied' && (
                        <div className="bg-gradient-to-r from-red-500/10 via-amber-500/10 to-primary/10 border-b border-red-100 dark:border-red-900/30 p-3 flex items-start gap-2.5 text-left">
                            <Lock className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                            <div className="flex-1 min-w-0">
                                <p className="text-xs font-bold text-gray-900 dark:text-foreground">Notifications de commandes bloquées 🔒</p>
                                <p className="text-[11px] text-gray-600 dark:text-muted-foreground mt-0.5">
                                    Votre navigateur bloque les alertes. Vous risquez de manquer des nouvelles commandes.
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
                        <div className="bg-blue-50/80 dark:bg-blue-950/20 border-b border-blue-100 dark:border-blue-900/30 p-3 flex items-start gap-2.5 text-left">
                            <Sparkles className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                            <div className="flex-1 min-w-0">
                                <p className="text-xs font-bold text-gray-900 dark:text-foreground">Activez les alertes commandes 🔔</p>
                                <p className="text-[11px] text-gray-600 dark:text-muted-foreground mt-0.5">
                                    Soyez averti instantanément sur votre téléphone ou PC à chaque vente.
                                </p>
                                <button
                                    onClick={() => {
                                        setIsOpen(false);
                                        window.dispatchEvent(new CustomEvent('ahizan:open-push-prompt'));
                                    }}
                                    className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 bg-primary text-white rounded-lg text-[11px] font-bold hover:bg-primary/90 transition-colors shadow-sm"
                                >
                                    <Bell className="w-3 h-3" />
                                    Activer les alertes
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Header */}
                    <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-border">
                        <span className="font-semibold text-sm text-gray-900 dark:text-foreground">
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
                    <div className="max-h-96 overflow-y-auto divide-y divide-gray-50 dark:divide-border">
                        {isLoading ? (
                            <div className="flex items-center justify-center py-10">
                                <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
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
                                    className={`flex gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-muted/50 transition-colors cursor-pointer ${!notif.isRead ? 'bg-blue-50/40 dark:bg-blue-950/10' : ''}`}
                                    onClick={() => {
                                        if (!notif.isRead) markOneRead(notif.id);
                                        if (notif.actionUrl) window.location.href = notif.actionUrl;
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
                                        <p className={`text-sm leading-snug ${!notif.isRead ? 'font-semibold text-gray-900 dark:text-foreground' : 'font-medium text-gray-700 dark:text-muted-foreground'}`}>
                                            {notif.title}
                                        </p>
                                        {notif.body && (
                                            <p className="text-xs text-gray-500 dark:text-muted-foreground mt-0.5 line-clamp-2">{notif.body}</p>
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
                                            className="text-gray-400 hover:text-red-500 p-1 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-md transition-colors"
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
                    <div className="border-t border-gray-100 dark:border-border px-4 py-2.5 flex items-center justify-between text-xs text-gray-500 dark:text-muted-foreground bg-gray-50/50 dark:bg-muted/30">
                        <span>Alertes Push</span>
                        <button
                            onClick={() => {
                                setIsOpen(false);
                                window.dispatchEvent(new CustomEvent('ahizan:open-push-recovery'));
                            }}
                            className="text-primary hover:underline font-medium flex items-center gap-1"
                        >
                            Guide / Débloquer 🔒
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
