import { useState, useEffect, useRef } from 'react';
import { Bell, CheckCheck, Clock, ExternalLink, ShoppingBag, Info, ShieldAlert } from 'lucide-react';

const getAdminApiUrl = () => {
    return (window as any).__VENDURE_ADMIN_API_URL__ || '/admin-api';
};

interface NotificationLogEntry {
    id: string;
    createdAt: string;
    userId: string;
    eventType: string;
    title: string;
    body: string;
    channel: string;
    isRead: boolean;
    sendSuccess: boolean;
}

const urlBase64ToUint8Array = (base64String: string) => {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
};

const getAuthHeaders = (): Record<string, string> => {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (typeof window === 'undefined') return headers;
    const token = localStorage.getItem('vendure-auth-token') || 
                  localStorage.getItem('auth_token') || 
                  sessionStorage.getItem('vendure-auth-token');
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
};

const registerSuperadminPush = async () => {
    if (typeof window === 'undefined' || !('Notification' in window) || !('serviceWorker' in navigator)) return;
    try {
        const res = await fetch(getAdminApiUrl(), {
            method: 'POST',
            headers: getAuthHeaders(),
            credentials: 'include',
            body: JSON.stringify({ query: 'query { vapidPublicKey }' }),
        });
        const { data } = await res.json();
        const vapidPublicKey = data?.vapidPublicKey;
        if (!vapidPublicKey) return;

        const reg = await navigator.serviceWorker.register('/notifications/sw.js', { scope: '/' });
        await navigator.serviceWorker.ready;

        const sub = await reg.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
        });

        const subJson = sub.toJSON();
        if (subJson.endpoint && subJson.keys?.p256dh && subJson.keys?.auth) {
            await fetch(getAdminApiUrl(), {
                method: 'POST',
                headers: getAuthHeaders(),
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
                        endpoint: subJson.endpoint,
                        p256dh: subJson.keys.p256dh,
                        auth: subJson.keys.auth,
                        userAgent: navigator.userAgent,
                    },
                }),
            });
            console.log('[NotificationBell] Web Push subscription successfully registered for Superadmin!');
        }
    } catch (e) {
        console.error('[NotificationBell] Push registration error:', e);
    }
};

export function SuperadminNotificationBell() {
    const [unreadCount, setUnreadCount] = useState<number>(0);
    const [logs, setLogs] = useState<NotificationLogEntry[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const fetchData = async () => {
        try {
            const res = await fetch(getAdminApiUrl(), {
                method: 'POST',
                headers: getAuthHeaders(),
                credentials: 'include',
                body: JSON.stringify({
                    query: `
                        query {
                            notificationStats {
                                unread
                            }
                            notificationLogs(options: { take: 10 }) {
                                items {
                                    id
                                    createdAt
                                    userId
                                    eventType
                                    title
                                    body
                                    channel
                                    isRead
                                    sendSuccess
                                }
                            }
                        }
                    `,
                }),
            });
            const { data } = await res.json();
            if (data) {
                setUnreadCount(data.notificationStats?.unread ?? 0);
                setLogs(data.notificationLogs?.items ?? []);
            }
        } catch (e) {
            console.error('[NotificationBell] Failed to fetch notifications:', e);
        }
    };

    const markAllRead = async () => {
        setIsLoading(true);
        try {
            await fetch(getAdminApiUrl(), {
                method: 'POST',
                headers: getAuthHeaders(),
                credentials: 'include',
                body: JSON.stringify({
                    query: `
                        mutation {
                            markNotificationsAsRead
                        }
                    `,
                }),
            });
            setUnreadCount(0);
            setLogs(prev => prev.map(l => ({ ...l, isRead: true })));
        } catch (e) {
            console.error('[NotificationBell] Failed to mark as read:', e);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 15000); // Polling backup every 15s

        // Request browser Web Push notification permission and register
        if (typeof window !== 'undefined' && 'Notification' in window && 'serviceWorker' in navigator) {
            if (Notification.permission === 'default') {
                Notification.requestPermission().then(permission => {
                    if (permission === 'granted') {
                        registerSuperadminPush();
                    }
                }).catch(err => console.error(err));
            } else if (Notification.permission === 'granted') {
                registerSuperadminPush();
            }
        }

        // Close dropdown when clicking outside
        const handleClickOutside = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);

        return () => {
            clearInterval(interval);
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const formatTimeAgo = (iso: string) => {
        const diffMs = Date.now() - new Date(iso).getTime();
        const mins = Math.floor(diffMs / 60000);
        if (mins < 1) return "À l'instant";
        if (mins < 60) return `il y a ${mins} min`;
        const hours = Math.floor(mins / 60);
        if (hours < 24) return `il y a ${hours} h`;
        return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
    };

    return (
        <div ref={dropdownRef} style={{ position: 'relative', display: 'inline-block' }}>
            {/* Bell Icon Trigger */}
            <button
                type="button"
                onClick={() => {
                    setIsOpen(!isOpen);
                    if (!isOpen) fetchData();
                }}
                style={{
                    position: 'relative',
                    background: 'transparent',
                    border: 'none',
                    padding: '8px',
                    borderRadius: '50%',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'inherit',
                }}
                title="Notifications Ventes & Système"
            >
                <Bell size={20} />
                {unreadCount > 0 && (
                    <span
                        style={{
                            position: 'absolute',
                            top: '4px',
                            right: '4px',
                            background: '#ef4444',
                            color: '#ffffff',
                            borderRadius: '10px',
                            padding: '1px 5px',
                            fontSize: '10px',
                            fontWeight: 'bold',
                            lineHeight: 1,
                            border: '2px solid white',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                            minWidth: '16px',
                            textAlign: 'center',
                        }}
                    >
                        {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                )}
            </button>

            {/* Dropdown Menu */}
            {isOpen && (
                <div
                    style={{
                        position: 'absolute',
                        right: 0,
                        top: '42px',
                        width: '360px',
                        maxHeight: '480px',
                        backgroundColor: '#ffffff',
                        borderRadius: '12px',
                        boxShadow: '0 10px 25px -5px rgba(0,0,0,0.15), 0 8px 10px -6px rgba(0,0,0,0.1)',
                        border: '1px solid #e5e7eb',
                        zIndex: 9999,
                        overflow: 'hidden',
                        display: 'flex',
                        flexDirection: 'column',
                        color: '#1f2937',
                        fontFamily: 'system-ui, -apple-system, sans-serif',
                    }}
                >
                    {/* Header */}
                    <div
                        style={{
                            padding: '12px 16px',
                            borderBottom: '1px solid #f3f4f6',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'between',
                            backgroundColor: '#f9fafb',
                        }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
                            <Bell size={16} style={{ color: '#4f46e5' }} />
                            <span style={{ fontWeight: 700, fontSize: '14px', color: '#111827' }}>Notifications</span>
                            {unreadCount > 0 && (
                                <span
                                    style={{
                                        backgroundColor: '#eef2ff',
                                        color: '#4f46e5',
                                        fontSize: '11px',
                                        fontWeight: 700,
                                        padding: '2px 8px',
                                        borderRadius: '12px',
                                    }}
                                >
                                    {unreadCount} non lue{unreadCount > 1 ? 's' : ''}
                                </span>
                            )}
                        </div>
                        {unreadCount > 0 && (
                            <button
                                onClick={markAllRead}
                                disabled={isLoading}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    color: '#4f46e5',
                                    fontSize: '12px',
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                }}
                            >
                                <CheckCheck size={14} /> Tout lire
                            </button>
                        )}
                    </div>

                    {/* Notification List */}
                    <div style={{ overflowY: 'auto', flex: 1, maxHeight: '380px' }}>
                        {logs.length === 0 ? (
                            <div style={{ padding: '32px 16px', textAlign: 'center', color: '#6b7280' }}>
                                <Bell size={32} style={{ margin: '0 auto 8px', color: '#d1d5db' }} />
                                <p style={{ margin: 0, fontSize: '13px', fontWeight: 500 }}>Aucune notification récente</p>
                            </div>
                        ) : (
                            logs.map((log) => {
                                const isSale = log.title.includes('vente') || log.title.includes('Commande');
                                return (
                                    <div
                                        key={log.id}
                                        style={{
                                            padding: '12px 16px',
                                            borderBottom: '1px solid #f3f4f6',
                                            backgroundColor: log.isRead ? '#ffffff' : '#f0f9ff',
                                            transition: 'background-color 0.2s',
                                            display: 'flex',
                                            gap: '12px',
                                            alignItems: 'flex-start',
                                        }}
                                    >
                                        <div
                                            style={{
                                                width: '32px',
                                                height: '32px',
                                                borderRadius: '50%',
                                                backgroundColor: isSale ? '#dcfce7' : '#e0e7ff',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                flexShrink: 0,
                                                color: isSale ? '#166534' : '#3730a3',
                                            }}
                                        >
                                            {isSale ? <ShoppingBag size={16} /> : <Info size={16} />}
                                        </div>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '2px' }}>
                                                <h4 style={{ margin: 0, fontSize: '13px', fontWeight: log.isRead ? 600 : 700, color: '#111827' }}>
                                                    {log.title}
                                                </h4>
                                                <span style={{ fontSize: '10px', color: '#9ca3af', display: 'flex', alignItems: 'center', gap: '2px', flexShrink: 0 }}>
                                                    <Clock size={10} /> {formatTimeAgo(log.createdAt)}
                                                </span>
                                            </div>
                                            <p style={{ margin: 0, fontSize: '12px', color: '#4b5563', lineHeight: '1.4', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                {log.body}
                                            </p>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>

                    {/* Footer */}
                    <div
                        style={{
                            padding: '10px 16px',
                            borderTop: '1px solid #f3f4f6',
                            backgroundColor: '#f9fafb',
                            textAlign: 'center',
                        }}
                    >
                        <a
                            href="/admin/notification-logs"
                            onClick={() => setIsOpen(false)}
                            style={{
                                color: '#4f46e5',
                                fontSize: '12px',
                                fontWeight: 600,
                                textDecoration: 'none',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                            }}
                        >
                            Voir tous les journaux <ExternalLink size={12} />
                        </a>
                    </div>
                </div>
            )}
        </div>
    );
}
