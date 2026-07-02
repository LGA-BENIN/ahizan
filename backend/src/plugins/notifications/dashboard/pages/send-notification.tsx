import { useState, useCallback } from 'react';
import { Send, User, Users, Bell, Smartphone, Zap, Search, CheckCircle, AlertCircle, X } from 'lucide-react';

const getAdminApiUrl = () =>
    (window as any).__VENDURE_ADMIN_API_URL__ || '/admin-api';

async function gql(query: string, variables?: any) {
    const res = await fetch(getAdminApiUrl(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ query, variables }),
    });
    const { data, errors } = await res.json();
    if (errors?.length) throw new Error(errors[0].message);
    return data;
}

type Channel = 'IN_APP' | 'PUSH' | 'ALL';
type Mode = 'single' | 'broadcast';

interface UserItem {
    id: string;
    identifier: string;
}

interface Toast {
    id: string;
    type: 'success' | 'error';
    message: string;
}

const CHANNEL_OPTIONS: { value: Channel; label: string; icon: any; desc: string }[] = [
    { value: 'IN_APP', label: 'In-App', icon: Bell, desc: 'Cloche + dropdown en temps réel' },
    { value: 'PUSH', label: 'Web Push', icon: Smartphone, desc: 'Notification navigateur / PWA' },
    { value: 'ALL', label: 'Tous', icon: Zap, desc: 'In-App + Web Push simultanément' },
];

export function SendNotificationComponent() {
    const [mode, setMode] = useState<Mode>('single');
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<UserItem[]>([]);
    const [selectedUsers, setSelectedUsers] = useState<UserItem[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [channel, setChannel] = useState<Channel>('IN_APP');
    const [title, setTitle] = useState('');
    const [body, setBody] = useState('');
    const [actionUrl, setActionUrl] = useState('');
    const [isSending, setIsSending] = useState(false);
    const [toasts, setToasts] = useState<Toast[]>([]);

    const addToast = (message: string, type: 'success' | 'error') => {
        const id = Math.random().toString(36).slice(2);
        setToasts(p => [...p, { id, type, message }]);
        setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 5000);
    };

    const doSearch = useCallback(async (q: string) => {
        if (!q.trim()) { setSearchResults([]); return; }
        setIsSearching(true);
        try {
            const data = await gql(`
                query($emailQuery: String, $take: Int) {
                    searchUsers(emailQuery: $emailQuery, take: $take) {
                        items { id identifier }
                    }
                }
            `, { emailQuery: q, take: 10 });
            setSearchResults(data?.searchUsers?.items || []);
        } finally {
            setIsSearching(false);
        }
    }, []);

    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const v = e.target.value;
        setSearchQuery(v);
        setTimeout(() => doSearch(v), 350);
    };

    const selectUser = (u: UserItem) => {
        if (!selectedUsers.find(s => s.id === u.id)) {
            setSelectedUsers(p => [...p, u]);
        }
        setSearchQuery('');
        setSearchResults([]);
    };

    const removeUser = (id: string) => setSelectedUsers(p => p.filter(u => u.id !== id));

    const isValid = title.trim().length > 0 && body.trim().length > 0 && (mode === 'broadcast' || selectedUsers.length > 0);

    const handleSend = async () => {
        if (!isValid) return;
        setIsSending(true);
        try {
            if (mode === 'single') {
                let sent = 0;
                for (const user of selectedUsers) {
                    await gql(`
                        mutation($userId: ID!, $title: String!, $body: String!, $channel: String!, $actionUrl: String) {
                            sendNotificationToUser(userId: $userId, title: $title, body: $body, channel: $channel, actionUrl: $actionUrl)
                        }
                    `, { userId: user.id, title, body, channel, actionUrl: actionUrl || null });
                    sent++;
                }
                addToast(`Notification envoyée à ${sent} utilisateur${sent > 1 ? 's' : ''}.`, 'success');
            } else {
                const data = await gql(`
                    query { searchUsers(take: 1000) { items { id } } }
                `);
                const allIds: string[] = (data?.searchUsers?.items || []).map((u: UserItem) => u.id);
                if (allIds.length === 0) { addToast('Aucun utilisateur trouvé.', 'error'); return; }
                const result = await gql(`
                    mutation($userIds: [ID!]!, $title: String!, $body: String!, $channel: String!, $actionUrl: String) {
                        sendBroadcastNotification(userIds: $userIds, title: $title, body: $body, channel: $channel, actionUrl: $actionUrl) {
                            sent failed
                        }
                    }
                `, { userIds: allIds, title, body, channel, actionUrl: actionUrl || null });
                const { sent, failed } = result?.sendBroadcastNotification ?? { sent: 0, failed: 0 };
                addToast(`Broadcast : ${sent} envoyé${sent > 1 ? 's' : ''}${failed > 0 ? `, ${failed} échoué${failed > 1 ? 's' : ''}` : ''}.`, failed > 0 ? 'error' : 'success');
            }
            setTitle(''); setBody(''); setActionUrl(''); setSelectedUsers([]);
        } catch (e: any) {
            addToast(`Erreur : ${e.message}`, 'error');
        } finally {
            setIsSending(false);
        }
    };

    return (
        <div className="p-6 max-w-3xl mx-auto space-y-6">
            {/* Toasts */}
            <div className="fixed top-4 right-4 z-50 space-y-2 pointer-events-none">
                {toasts.map(t => (
                    <div key={t.id} className={`flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg text-sm font-medium pointer-events-auto ${t.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
                        {t.type === 'success' ? <CheckCircle className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
                        {t.message}
                    </div>
                ))}
            </div>

            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                    <Send className="w-6 h-6 text-primary" />
                    Envoyer une notification
                </h1>
                <p className="text-gray-500 text-sm mt-1">Composez et envoyez une notification manuelle à un ou plusieurs utilisateurs.</p>
            </div>

            {/* Mode */}
            <div className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm space-y-4">
                <h2 className="font-semibold text-gray-800 text-sm uppercase tracking-wide">Destinataires</h2>
                <div className="flex flex-wrap gap-3">
                    <button onClick={() => setMode('single')} className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition border ${mode === 'single' ? 'bg-primary text-white border-primary' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}>
                        <User className="w-4 h-4" /> Utilisateur(s) spécifique(s)
                    </button>
                    <button onClick={() => { setMode('broadcast'); setSelectedUsers([]); }} className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition border ${mode === 'broadcast' ? 'bg-primary text-white border-primary' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}>
                        <Users className="w-4 h-4" /> Broadcast (tous)
                    </button>
                </div>

                {mode === 'single' && (
                    <div className="space-y-2">
                        {selectedUsers.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                                {selectedUsers.map(u => (
                                    <span key={u.id} className="flex items-center gap-1.5 text-xs bg-primary/10 text-primary px-3 py-1.5 rounded-full font-medium">
                                        {u.identifier}
                                        <button onClick={() => removeUser(u.id)} className="hover:text-red-500 transition"><X className="w-3 h-3" /></button>
                                    </span>
                                ))}
                            </div>
                        )}
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input type="text" placeholder="Rechercher par e-mail..." value={searchQuery} onChange={handleSearchChange}
                                className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" />
                            {isSearching && <div className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />}
                            {searchResults.length > 0 && (
                                <div className="absolute top-full mt-1 left-0 right-0 bg-white border border-gray-200 rounded-lg shadow-lg z-20 overflow-hidden">
                                    {searchResults.map(u => (
                                        <button key={u.id} onClick={() => selectUser(u)} className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 transition flex items-center gap-2">
                                            <User className="w-3.5 h-3.5 text-gray-400" />{u.identifier}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}
                {mode === 'broadcast' && (
                    <div className="flex items-center gap-2 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        La notification sera envoyée à tous les utilisateurs enregistrés (max 1 000).
                    </div>
                )}
            </div>

            {/* Channel */}
            <div className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm space-y-4">
                <h2 className="font-semibold text-gray-800 text-sm uppercase tracking-wide">Canal de diffusion</h2>
                <div className="grid grid-cols-3 gap-3">
                    {CHANNEL_OPTIONS.map(({ value, label, icon: Icon, desc }) => (
                        <button key={value} onClick={() => setChannel(value)}
                            className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 text-sm transition ${channel === value ? 'border-primary bg-primary/5 text-primary' : 'border-gray-100 text-gray-600 hover:border-gray-200 hover:bg-gray-50'}`}>
                            <Icon className="w-5 h-5" />
                            <span className="font-semibold">{label}</span>
                            <span className="text-[11px] text-center leading-tight opacity-70">{desc}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Content */}
            <div className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm space-y-4">
                <h2 className="font-semibold text-gray-800 text-sm uppercase tracking-wide">Contenu</h2>
                <div>
                    <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-semibold text-gray-600">Titre *</label>
                        <span className="text-xs text-gray-400">{title.length}/80</span>
                    </div>
                    <input type="text" maxLength={80} placeholder="Ex: Votre commande a été expédiée" value={title} onChange={e => setTitle(e.target.value)}
                        className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" />
                </div>
                <div>
                    <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-semibold text-gray-600">Message *</label>
                        <span className="text-xs text-gray-400">{body.length}/200</span>
                    </div>
                    <textarea rows={3} maxLength={200} placeholder="Décrivez le contenu de la notification..." value={body} onChange={e => setBody(e.target.value)}
                        className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none" />
                </div>
                <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">URL d'action (optionnel)</label>
                    <input type="url" placeholder="https://ahizan.com/account/orders" value={actionUrl} onChange={e => setActionUrl(e.target.value)}
                        className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" />
                </div>
            </div>

            {/* Preview */}
            {(title || body) && (
                <div className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm">
                    <h2 className="font-semibold text-gray-800 text-sm uppercase tracking-wide mb-3">Prévisualisation</h2>
                    <div className="flex gap-3 p-4 bg-gray-50 rounded-xl border border-gray-100">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                            <Bell className="w-5 h-5 text-primary" />
                        </div>
                        <div className="min-w-0">
                            <p className="text-sm font-semibold text-gray-900">{title || 'Titre'}</p>
                            <p className="text-xs text-gray-500 mt-0.5">{body || 'Contenu'}</p>
                            {actionUrl && <p className="text-[11px] text-primary mt-1 truncate">{actionUrl}</p>}
                        </div>
                    </div>
                </div>
            )}

            {/* Send */}
            <button onClick={handleSend} disabled={!isValid || isSending}
                className="w-full flex items-center justify-center gap-2 px-6 py-3.5 bg-primary text-white rounded-xl font-semibold text-sm hover:bg-primary/90 transition disabled:opacity-40 disabled:cursor-not-allowed">
                {isSending ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Send className="w-4 h-4" />}
                {isSending ? 'Envoi en cours...' : mode === 'broadcast' ? 'Envoyer à tous' : `Envoyer${selectedUsers.length > 1 ? ` (${selectedUsers.length})` : ''}`}
            </button>
        </div>
    );
}
