'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Bell, BellDot, Check, CheckCheck, ExternalLink, Loader2 } from 'lucide-react';
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
                    myNotifications(take: 20) {
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

                    // Browser notification if tab is hidden or visible
                    if ('Notification' in window && Notification.permission === 'granted') {
                        if ('serviceWorker' in navigator) {
                            navigator.serviceWorker.ready.then((registration) => {
                                registration.showNotification(payload.title || 'Ahizan', {
                                    body: payload.body,
                                    icon: payload.iconUrl || '/icon.png',
                                    data: { url: payload.actionUrl || '/' }
                                });
                            }).catch(() => {
                                new Notification(payload.title || 'Ahizan', {
                                    body: payload.body,
                                    icon: payload.iconUrl || '/icon.png',
                                });
                            });
                        } else {
                            new Notification(payload.title || 'Ahizan', {
                                body: payload.body,
                                icon: payload.iconUrl || '/icon.png',
                            });
                        }
                    }
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
                    setIsOpen(prev => !prev);
                    if (!isOpen) fetchNotifications();
                }}
                className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors focus:outline-none"
                aria-label="Notifications"
            >
                {unreadCount > 0 ? (
                    <BellDot className="h-5 w-5" style={{ color: iconColor }} />
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
                <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-gray-100 z-[9999] overflow-hidden animate-in fade-in slide-in-from-top-4 duration-200">
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
                                        <p className={`text-sm leading-snug ${!notif.isRead ? 'font-semibold text-gray-900' : 'font-medium text-gray-700'}`}>
                                            {notif.title}
                                        </p>
                                        {notif.body && (
                                            <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{notif.body}</p>
                                        )}
                                        <p className="text-[10px] text-gray-400 mt-1">{formatDate(notif.createdAt)}</p>
                                    </div>

                                    {/* Unread dot */}
                                    {!notif.isRead && (
                                        <div className="flex-shrink-0 w-2 h-2 rounded-full bg-blue-500 mt-2" />
                                    )}
                                </div>
                            ))
                        )}
                    </div>

                    {/* Footer */}
                    <div className="border-t border-gray-100 px-4 py-2.5">
                        <Link
                            href="/account/notifications"
                            className="flex items-center justify-center gap-1.5 text-xs text-primary font-medium hover:underline"
                            onClick={() => setIsOpen(false)}
                        >
                            Voir toutes les notifications
                            <ExternalLink className="h-3 w-3" />
                        </Link>
                    </div>
                </div>
            )}
        </div>
    );
}
