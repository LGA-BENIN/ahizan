'use client';

import { useState, useEffect, useCallback } from 'react';
import {
    Bell, BellOff, CheckCheck, Check, ExternalLink,
    Loader2, RefreshCw, Filter
} from 'lucide-react';
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

interface Props {
    authToken?: string;
    shopApiUrl: string;
}

const TAKE = 25;

const CHANNEL_BADGE: Record<string, string> = {
    IN_APP: 'bg-blue-100 text-blue-700',
    PUSH: 'bg-purple-100 text-purple-700',
    EMAIL: 'bg-green-100 text-green-700',
    SMS: 'bg-orange-100 text-orange-700',
};

type Filter = 'all' | 'unread';

export function NotificationsClient({ authToken, shopApiUrl }: Props) {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [totalItems, setTotalItems] = useState(0);
    const [page, setPage] = useState(0);
    const [filter, setFilter] = useState<Filter>('all');
    const [isLoading, setIsLoading] = useState(true);
    const [isMarkingAll, setIsMarkingAll] = useState(false);

    const gqlFetch = useCallback(async (query: string, variables?: any) => {
        const res = await fetch(shopApiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
            },
            credentials: 'include',
            body: JSON.stringify({ query, variables }),
        });
        return res.json();
    }, [shopApiUrl, authToken]);

    const fetchNotifications = useCallback(async (p: number) => {
        setIsLoading(true);
        try {
            const { data } = await gqlFetch(`
                query($take: Int, $skip: Int) {
                    myNotifications(take: $take, skip: $skip) {
                        unreadCount
                        items {
                            id createdAt eventType title body actionUrl iconUrl isRead channel
                        }
                    }
                }
            `, { take: TAKE, skip: p * TAKE });

            const result = data?.myNotifications ?? { items: [], unreadCount: 0 };
            setNotifications(result.items);
            setUnreadCount(result.unreadCount);
            // totalItems approximation : if full page, there may be more
            setTotalItems(result.items.length < TAKE && p === 0
                ? result.items.length
                : (p + 1) * TAKE + (result.items.length === TAKE ? 1 : 0));
        } finally {
            setIsLoading(false);
        }
    }, [gqlFetch]);

    useEffect(() => {
        fetchNotifications(page);
    }, [fetchNotifications, page]);

    const markOneRead = async (id: string) => {
        await gqlFetch(`mutation($id: ID!) { markNotificationRead(id: $id) }`, { id });
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
        setUnreadCount(prev => Math.max(0, prev - 1));
    };

    const markAllRead = async () => {
        setIsMarkingAll(true);
        await gqlFetch(`mutation { markNotificationsRead }`);
        setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
        setUnreadCount(0);
        setIsMarkingAll(false);
    };

    const formatDate = (iso: string) => {
        const d = new Date(iso);
        const now = new Date();
        const diff = (now.getTime() - d.getTime()) / 1000;
        if (diff < 60) return 'À l\'instant';
        if (diff < 3600) return `Il y a ${Math.floor(diff / 60)} min`;
        if (diff < 86400) return `Il y a ${Math.floor(diff / 3600)}h`;
        return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
    };

    const displayed = filter === 'unread'
        ? notifications.filter(n => !n.isRead)
        : notifications;

    return (
        <div className="space-y-4">
            {/* Toolbar */}
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setFilter('all')}
                        className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${filter === 'all' ? 'bg-primary text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                    >
                        Toutes
                    </button>
                    <button
                        onClick={() => setFilter('unread')}
                        className={`px-4 py-2 rounded-lg text-sm font-semibold transition flex items-center gap-1.5 ${filter === 'unread' ? 'bg-primary text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                    >
                        Non lues
                        {unreadCount > 0 && (
                            <span className={`text-xs rounded-full px-1.5 py-0.5 font-bold ${filter === 'unread' ? 'bg-white text-primary' : 'bg-red-100 text-red-600'}`}>
                                {unreadCount}
                            </span>
                        )}
                    </button>
                </div>
                <div className="flex items-center gap-2">
                    {unreadCount > 0 && (
                        <button
                            onClick={markAllRead}
                            disabled={isMarkingAll}
                            className="flex items-center gap-1.5 text-xs text-primary font-semibold hover:underline disabled:opacity-50"
                        >
                            {isMarkingAll ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCheck className="h-3.5 w-3.5" />}
                            Tout marquer lu
                        </button>
                    )}
                    <button
                        onClick={() => fetchNotifications(page)}
                        disabled={isLoading}
                        className="p-2 rounded-lg hover:bg-slate-100 transition text-slate-500"
                        title="Actualiser"
                    >
                        <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            </div>

            {/* List */}
            <div className="rounded-2xl border border-border overflow-hidden divide-y divide-slate-50">
                {isLoading ? (
                    <div className="flex items-center justify-center py-16 text-slate-400">
                        <Loader2 className="h-6 w-6 animate-spin" />
                    </div>
                ) : displayed.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-slate-400 gap-3">
                        <BellOff className="h-10 w-10 opacity-30" />
                        <p className="text-sm font-medium">
                            {filter === 'unread' ? 'Aucune notification non lue' : 'Aucune notification'}
                        </p>
                    </div>
                ) : (
                    displayed.map(notif => (
                        <div
                            key={notif.id}
                            className={`flex gap-4 px-5 py-4 hover:bg-slate-50/70 transition-colors ${!notif.isRead ? 'bg-blue-50/30' : 'bg-white'}`}
                        >
                            {/* Icon */}
                            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mt-0.5">
                                {notif.iconUrl ? (
                                    <img src={notif.iconUrl} alt="" className="w-5 h-5 object-contain" />
                                ) : (
                                    <Bell className="h-4 w-4 text-primary" />
                                )}
                            </div>

                            {/* Content */}
                            <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between gap-2">
                                    <p className={`text-sm leading-snug ${!notif.isRead ? 'font-semibold text-slate-900' : 'font-medium text-slate-700'}`}>
                                        {notif.title}
                                    </p>
                                    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full shrink-0 ${CHANNEL_BADGE[notif.channel] || 'bg-slate-100 text-slate-500'}`}>
                                        {notif.channel}
                                    </span>
                                </div>
                                {notif.body && (
                                    <p className="text-xs text-slate-500 mt-1 line-clamp-2">{notif.body}</p>
                                )}
                                <div className="flex items-center gap-3 mt-2">
                                    <span className="text-[10px] text-slate-400">{formatDate(notif.createdAt)}</span>
                                    {notif.actionUrl && (
                                        <Link
                                            href={notif.actionUrl}
                                            onClick={() => !notif.isRead && markOneRead(notif.id)}
                                            className="flex items-center gap-1 text-[10px] text-primary font-medium hover:underline"
                                        >
                                            Voir <ExternalLink className="h-3 w-3" />
                                        </Link>
                                    )}
                                </div>
                            </div>

                            {/* Mark read button */}
                            {!notif.isRead && (
                                <div className="flex-shrink-0 flex flex-col items-center gap-2 pt-0.5">
                                    <div className="w-2 h-2 rounded-full bg-blue-500" />
                                    <button
                                        onClick={() => markOneRead(notif.id)}
                                        className="text-slate-300 hover:text-primary transition"
                                        title="Marquer comme lu"
                                    >
                                        <Check className="h-4 w-4" />
                                    </button>
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>

            {/* Pagination */}
            {!isLoading && notifications.length === TAKE && (
                <div className="flex justify-center gap-3 pt-2">
                    {page > 0 && (
                        <button
                            onClick={() => setPage(p => p - 1)}
                            className="px-4 py-2 text-sm border border-border rounded-lg hover:bg-slate-50 transition font-medium"
                        >
                            ← Précédent
                        </button>
                    )}
                    <button
                        onClick={() => setPage(p => p + 1)}
                        className="px-4 py-2 text-sm border border-border rounded-lg hover:bg-slate-50 transition font-medium"
                    >
                        Suivant →
                    </button>
                </div>
            )}
        </div>
    );
}
