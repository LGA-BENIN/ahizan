import { useState, useEffect } from 'react';
import { Bell, CheckCheck, Clock, AlertTriangle, TrendingUp, Users, RefreshCw } from 'lucide-react';

// Vendure Dashboard Admin API URL
const getAdminApiUrl = () => {
    return (window as any).__VENDURE_ADMIN_API_URL__ || '/admin-api';
};

interface NotificationStats {
    total: number;
    unread: number;
    sent24h: number;
    failed: number;
}

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
    sendError?: string;
}

async function fetchStats(): Promise<NotificationStats> {
    const res = await fetch(getAdminApiUrl(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
            query: `
                query {
                    notificationStats {
                        total
                        unread
                        sent24h
                        failed
                    }
                }
            `,
        }),
    });
    const { data } = await res.json();
    return data?.notificationStats ?? { total: 0, unread: 0, sent24h: 0, failed: 0 };
}

async function fetchLogs(skip = 0, take = 25): Promise<{ items: NotificationLogEntry[]; totalItems: number }> {
    const res = await fetch(getAdminApiUrl(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
            query: `
                query($options: NotificationLogListOptions) {
                    notificationLogs(options: $options) {
                        items {
                            id createdAt userId eventType title body channel isRead sendSuccess sendError
                        }
                        totalItems
                    }
                }
            `,
            variables: { options: { skip, take } },
        }),
    });
    const { data } = await res.json();
    return data?.notificationLogs ?? { items: [], totalItems: 0 };
}

export function NotificationLogsComponent() {
    const [stats, setStats] = useState<NotificationStats>({ total: 0, unread: 0, sent24h: 0, failed: 0 });
    const [logs, setLogs] = useState<NotificationLogEntry[]>([]);
    const [totalItems, setTotalItems] = useState(0);
    const [page, setPage] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const pageSize = 25;

    const refresh = async () => {
        setIsLoading(true);
        try {
            const [s, l] = await Promise.all([
                fetchStats(),
                fetchLogs(page * pageSize, pageSize),
            ]);
            setStats(s);
            setLogs(l.items);
            setTotalItems(l.totalItems);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => { refresh(); }, [page]);

    const formatDate = (iso: string) => new Date(iso).toLocaleString('fr-FR', {
        day: '2-digit', month: '2-digit', year: '2-digit',
        hour: '2-digit', minute: '2-digit',
    });

    const channelBadge = (channel: string) => {
        const colors: Record<string, string> = {
            IN_APP: 'bg-blue-100 text-blue-700',
            PUSH: 'bg-purple-100 text-purple-700',
            EMAIL: 'bg-green-100 text-green-700',
            SMS: 'bg-orange-100 text-orange-700',
        };
        return colors[channel] || 'bg-gray-100 text-gray-600';
    };

    return (
        <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <Bell className="w-6 h-6 text-primary" />
                        Journal des Notifications
                    </h1>
                    <p className="text-gray-500 text-sm mt-1">Historique complet des notifications envoyées via la plateforme.</p>
                </div>
                <button
                    onClick={refresh}
                    disabled={isLoading}
                    className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition text-sm font-medium disabled:opacity-50"
                >
                    <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                    Actualiser
                </button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                    { label: 'Total envoyées', value: stats.total, icon: Bell, color: 'text-blue-600 bg-blue-50' },
                    { label: 'Non lues', value: stats.unread, icon: Clock, color: 'text-amber-600 bg-amber-50' },
                    { label: 'Dernières 24h', value: stats.sent24h, icon: TrendingUp, color: 'text-green-600 bg-green-50' },
                    { label: 'Échecs', value: stats.failed, icon: AlertTriangle, color: 'text-red-600 bg-red-50' },
                ].map(({ label, value, icon: Icon, color }) => (
                    <div key={label} className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
                        <div className="flex items-start justify-between">
                            <div>
                                <p className="text-xs text-gray-500 font-medium">{label}</p>
                                <p className="text-2xl font-bold text-gray-900 mt-1">{value.toLocaleString('fr-FR')}</p>
                            </div>
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
                                <Icon className="w-5 h-5" />
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Logs Table */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                    <h2 className="font-semibold text-gray-800">Historique ({totalItems} entrées)</h2>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="bg-gray-50 text-left">
                                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</th>
                                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Événement</th>
                                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Titre</th>
                                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Canal</th>
                                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Statut</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {isLoading ? (
                                <tr>
                                    <td colSpan={5} className="px-4 py-12 text-center text-gray-400">
                                        <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
                                        Chargement...
                                    </td>
                                </tr>
                            ) : logs.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-4 py-12 text-center text-gray-400">
                                        Aucun journal de notification trouvé.
                                    </td>
                                </tr>
                            ) : (
                                logs.map((log) => (
                                    <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-4 py-3 text-gray-500 whitespace-nowrap text-xs">
                                            {formatDate(log.createdAt)}
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded font-mono">
                                                {log.eventType}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 font-medium text-gray-800 max-w-xs truncate">
                                            {log.title}
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full ${channelBadge(log.channel)}`}>
                                                {log.channel}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            {log.sendSuccess ? (
                                                <span className="flex items-center gap-1 text-green-600 text-xs font-medium">
                                                    <CheckCheck className="w-3.5 h-3.5" /> Envoyée
                                                </span>
                                            ) : (
                                                <span className="flex items-center gap-1 text-red-600 text-xs font-medium" title={log.sendError}>
                                                    <AlertTriangle className="w-3.5 h-3.5" /> Échec
                                                </span>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {totalItems > pageSize && (
                    <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100">
                        <p className="text-sm text-gray-500">
                            Page {page + 1} / {Math.ceil(totalItems / pageSize)}
                        </p>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setPage(p => Math.max(0, p - 1))}
                                disabled={page === 0}
                                className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40"
                            >
                                ← Précédent
                            </button>
                            <button
                                onClick={() => setPage(p => p + 1)}
                                disabled={(page + 1) * pageSize >= totalItems}
                                className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40"
                            >
                                Suivant →
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
