import { useState, useCallback, useEffect } from 'react';
import { Send, User, Users, Bell, Smartphone, Zap, Search, CheckCircle, AlertCircle, X, Mail, Eye, CheckSquare, Square, RefreshCw } from 'lucide-react';

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
type Mode = 'single' | 'broadcast' | 'brevo_bulk';
type BulkTarget = 'CUSTOMERS' | 'SELLERS' | 'ALL';

interface UserItem {
    id: string;
    identifier: string;
}

interface RecipientItem {
    email: string;
    name?: string;
    role: string;
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

    // Brevo Bulk Email State
    const [bulkTarget, setBulkTarget] = useState<BulkTarget>('CUSTOMERS');
    const [availableRecipients, setAvailableRecipients] = useState<RecipientItem[]>([]);
    const [selectedRecipients, setSelectedRecipients] = useState<string[]>([]);
    const [isLoadingRecipients, setIsLoadingRecipients] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalSearch, setModalSearch] = useState('');
    const [emailSubject, setEmailSubject] = useState('');
    const [emailContent, setEmailContent] = useState('');

    const addToast = (message: string, type: 'success' | 'error') => {
        const id = Math.random().toString(36).slice(2);
        setToasts(p => [...p, { id, type, message }]);
        setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 5000);
    };

    const fetchAvailableEmails = async (target: BulkTarget) => {
        setIsLoadingRecipients(true);
        try {
            const data = await gql(`
                query($target: String!) {
                    availableRecipientEmails(target: $target) {
                        target total recipients { email name role }
                    }
                }
            `, { target });
            const list: RecipientItem[] = data?.availableRecipientEmails?.recipients || [];
            setAvailableRecipients(list);
            setSelectedRecipients(list.map(r => r.email));
        } catch (err: any) {
            addToast(`Erreur chargement e-mails: ${err.message}`, 'error');
        } finally {
            setIsLoadingRecipients(false);
        }
    };

    const handleOpenModal = async () => {
        await fetchAvailableEmails(bulkTarget);
        setIsModalOpen(true);
    };

    const toggleRecipient = (email: string) => {
        if (selectedRecipients.includes(email)) {
            setSelectedRecipients(p => p.filter(e => e !== email));
        } else {
            setSelectedRecipients(p => [...p, email]);
        }
    };

    const toggleSelectAllModal = () => {
        if (selectedRecipients.length === availableRecipients.length) {
            setSelectedRecipients([]);
        } else {
            setSelectedRecipients(availableRecipients.map(r => r.email));
        }
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

    const isBrevoValid = emailSubject.trim().length > 0 && emailContent.trim().length > 0 && selectedRecipients.length > 0;
    const isNotificationValid = title.trim().length > 0 && body.trim().length > 0 && (mode === 'broadcast' || selectedUsers.length > 0);

    const handleSend = async () => {
        if (mode === 'brevo_bulk') {
            if (!isBrevoValid) return;
            setIsSending(true);
            try {
                const res = await gql(`
                    mutation($target: String!, $subject: String!, $contentHtml: String!, $selectedEmails: [String!]) {
                        sendBulkEmail(target: $target, subject: $subject, contentHtml: $contentHtml, selectedEmails: $selectedEmails) {
                            success sentCount failedCount
                        }
                    }
                `, {
                    target: bulkTarget,
                    subject: emailSubject,
                    contentHtml: emailContent,
                    selectedEmails: selectedRecipients,
                });
                const { sentCount, failedCount } = res?.sendBulkEmail || { sentCount: 0, failedCount: 0 };
                addToast(`Campagne Brevo envoyée : ${sentCount} e-mail(s) délivré(s)${failedCount > 0 ? `, ${failedCount} échec(s)` : ''}.`, failedCount > 0 ? 'error' : 'success');
                setEmailSubject('');
                setEmailContent('');
            } catch (e: any) {
                addToast(`Erreur d'envoi Brevo : ${e.message}`, 'error');
            } finally {
                setIsSending(false);
            }
            return;
        }

        if (!isNotificationValid) return;
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

    const filteredModalRecipients = availableRecipients.filter(r => 
        r.email.toLowerCase().includes(modalSearch.toLowerCase()) || 
        (r.name && r.name.toLowerCase().includes(modalSearch.toLowerCase()))
    );

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

            {/* Modal de consultation et sélection d'emails */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl max-w-xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden border border-gray-100 animate-in fade-in zoom-in-95 duration-200">
                        {/* Header */}
                        <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                            <div>
                                <h3 className="font-bold text-gray-900 text-lg flex items-center gap-2">
                                    <Mail className="w-5 h-5 text-primary" />
                                    Liste des e-mails disponibles
                                </h3>
                                <p className="text-xs text-gray-500 mt-0.5">
                                    Target : <span className="font-semibold text-primary">{bulkTarget === 'CUSTOMERS' ? 'Clients' : bulkTarget === 'SELLERS' ? 'Vendeurs' : 'Tous (Clients + Vendeurs)'}</span> • {selectedRecipients.length} / {availableRecipients.length} sélectionné(s)
                                </p>
                            </div>
                            <button onClick={() => setIsModalOpen(false)} className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-200/50 transition">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Search & Actions Bar */}
                        <div className="p-4 border-b border-gray-100 bg-white flex items-center gap-3">
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Filtrer par nom ou email..."
                                    value={modalSearch}
                                    onChange={e => setModalSearch(e.target.value)}
                                    className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
                                />
                            </div>
                            <button
                                onClick={toggleSelectAllModal}
                                className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition shrink-0"
                            >
                                {selectedRecipients.length === availableRecipients.length ? <CheckSquare className="w-4 h-4 text-primary" /> : <Square className="w-4 h-4 text-gray-400" />}
                                {selectedRecipients.length === availableRecipients.length ? 'Tout désélectionner' : 'Tout sélectionner'}
                            </button>
                        </div>

                        {/* List of Recipients */}
                        <div className="flex-1 overflow-y-auto p-4 divide-y divide-gray-100">
                            {isLoadingRecipients ? (
                                <div className="py-12 text-center text-sm text-gray-400 flex flex-col items-center gap-2">
                                    <RefreshCw className="w-6 h-6 animate-spin text-primary" />
                                    Chargement des destinataires...
                                </div>
                            ) : filteredModalRecipients.length === 0 ? (
                                <div className="py-12 text-center text-sm text-gray-400">
                                    Aucun e-mail correspondant trouvé.
                                </div>
                            ) : (
                                filteredModalRecipients.map(r => {
                                    const isChecked = selectedRecipients.includes(r.email);
                                    return (
                                        <label key={r.email} className="flex items-center justify-between py-3 px-2 hover:bg-gray-50/80 rounded-lg cursor-pointer transition">
                                            <div className="flex items-center gap-3 min-w-0">
                                                <input
                                                    type="checkbox"
                                                    checked={isChecked}
                                                    onChange={() => toggleRecipient(r.email)}
                                                    className="w-4 h-4 rounded text-primary focus:ring-primary"
                                                />
                                                <div className="min-w-0">
                                                    <p className="text-sm font-semibold text-gray-800 truncate">{r.name || r.email}</p>
                                                    <p className="text-xs text-gray-400 truncate">{r.email}</p>
                                                </div>
                                            </div>
                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${r.role === 'VENDEUR' ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-blue-50 text-blue-700 border border-blue-200'}`}>
                                                {r.role}
                                            </span>
                                        </label>
                                    );
                                })
                            )}
                        </div>

                        {/* Footer */}
                        <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-between items-center">
                            <span className="text-xs text-gray-500 font-medium">
                                {selectedRecipients.length} destinataire(s) retenu(s)
                            </span>
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="px-5 py-2 bg-primary text-white rounded-lg font-semibold text-sm hover:bg-primary/90 transition shadow-sm"
                            >
                                Valider la sélection
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                    <Send className="w-6 h-6 text-primary" />
                    Centre d'envois & notifications Superadmin
                </h1>
                <p className="text-gray-500 text-sm mt-1">Envoyez des push notifications in-app ou de grands e-mails groupés Brevo aux clients et vendeurs.</p>
            </div>

            {/* Mode Selector */}
            <div className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm space-y-4">
                <h2 className="font-semibold text-gray-800 text-sm uppercase tracking-wide">Type de message & Destinataires</h2>
                <div className="flex flex-wrap gap-3">
                    <button onClick={() => setMode('single')} className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition border ${mode === 'single' ? 'bg-primary text-white border-primary' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}>
                        <User className="w-4 h-4" /> Utilisateur(s) Push
                    </button>
                    <button onClick={() => { setMode('broadcast'); setSelectedUsers([]); }} className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition border ${mode === 'broadcast' ? 'bg-primary text-white border-primary' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}>
                        <Users className="w-4 h-4" /> Push Broadcast (Tous)
                    </button>
                    <button onClick={() => { setMode('brevo_bulk'); fetchAvailableEmails(bulkTarget); }} className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition border ${mode === 'brevo_bulk' ? 'bg-primary text-white border-primary shadow-sm' : 'bg-white text-primary border-primary/30 hover:bg-primary/5'}`}>
                        <Mail className="w-4 h-4" /> Email de Masse Brevo (Clients & Vendeurs)
                    </button>
                </div>

                {mode === 'single' && (
                    <div className="space-y-2 pt-2">
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
                        La notification sera envoyée à tous les utilisateurs enregistrés.
                    </div>
                )}

                {mode === 'brevo_bulk' && (
                    <div className="space-y-4 pt-2 border-t border-gray-100">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200/80">
                            <div>
                                <label className="text-xs font-bold text-gray-700 uppercase tracking-wider block mb-1">Cible Brevo :</label>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => { setBulkTarget('CUSTOMERS'); fetchAvailableEmails('CUSTOMERS'); }}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${bulkTarget === 'CUSTOMERS' ? 'bg-primary text-white border-primary' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-100'}`}
                                    >
                                        Clients ({availableRecipients.filter(r => r.role === 'CLIENT').length})
                                    </button>
                                    <button
                                        onClick={() => { setBulkTarget('SELLERS'); fetchAvailableEmails('SELLERS'); }}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${bulkTarget === 'SELLERS' ? 'bg-primary text-white border-primary' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-100'}`}
                                    >
                                        Vendeurs ({availableRecipients.filter(r => r.role === 'VENDEUR').length})
                                    </button>
                                    <button
                                        onClick={() => { setBulkTarget('ALL'); fetchAvailableEmails('ALL'); }}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${bulkTarget === 'ALL' ? 'bg-primary text-white border-primary' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-100'}`}
                                    >
                                        Tous ({availableRecipients.length})
                                    </button>
                                </div>
                            </div>
                            <button
                                onClick={handleOpenModal}
                                className="flex items-center gap-2 px-4 py-2 bg-white text-primary border border-primary/30 rounded-xl text-xs font-bold hover:bg-primary/5 transition shadow-sm shrink-0"
                            >
                                <Eye className="w-4 h-4" />
                                Voir les e-mails disponibles ({selectedRecipients.length})
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Canal (only for push notifications) */}
            {mode !== 'brevo_bulk' && (
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
            )}

            {/* Content Form */}
            {mode === 'brevo_bulk' ? (
                <div className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm space-y-4">
                    <h2 className="font-semibold text-gray-800 text-sm uppercase tracking-wide flex items-center gap-2">
                        <Mail className="w-4 h-4 text-primary" />
                        Rédaction du Mail Brevo
                    </h2>
                    <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1">Objet du message *</label>
                        <input
                            type="text"
                            placeholder="Ex: Grande promotion de rentrée sur Ahizan !"
                            value={emailSubject}
                            onChange={e => setEmailSubject(e.target.value)}
                            className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-medium"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1">Contenu de l'e-mail (HTML autorisé) *</label>
                        <textarea
                            rows={8}
                            placeholder="<p>Bonjour,</p><p>Découvrez nos nouvelles offres exceptionnelles sur Ahizan...</p>"
                            value={emailContent}
                            onChange={e => setEmailContent(e.target.value)}
                            className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-mono resize-y"
                        />
                    </div>
                </div>
            ) : (
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
            )}

            {/* Submit Button */}
            <button onClick={handleSend} disabled={(mode === 'brevo_bulk' ? !isBrevoValid : !isNotificationValid) || isSending}
                className="w-full flex items-center justify-center gap-2 px-6 py-3.5 bg-primary text-white rounded-xl font-semibold text-sm hover:bg-primary/90 transition disabled:opacity-40 disabled:cursor-not-allowed shadow-md">
                {isSending ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : (mode === 'brevo_bulk' ? <Mail className="w-4 h-4" /> : <Send className="w-4 h-4" />)}
                {isSending ? 'Envoi en cours...' : mode === 'brevo_bulk' ? `Envoyer l'e-mail Brevo à ${selectedRecipients.length} destinataire(s)` : mode === 'broadcast' ? 'Envoyer à tous' : `Envoyer${selectedUsers.length > 1 ? ` (${selectedUsers.length})` : ''}`}
            </button>
        </div>
    );
}
