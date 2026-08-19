'use client';

import { useState, useEffect, useRef } from 'react';
import { MessageSquare, Store, Send, ChevronLeft, Loader2, ArrowRight, Info, Pencil, Trash2, Paperclip, Image, X, CornerUpLeft } from 'lucide-react';
import { getMyConversationsAction, getChatHistoryAction, sendChatMessageAction, deleteChatMessageAction, modifyChatMessageAction, setTypingAction, isTypingAction, userOnlineStatusAction } from '@/app/(storefront)/likes-actions';
import { toast } from 'sonner';
import Link from 'next/link';
import { encodeId } from '@/lib/hash-utils';

interface Vendor {
    id: string;
    name: string;
    logo?: {
        preview: string;
    };
}

interface ChatMessage {
    id: string;
    createdAt: string;
    sender: 'CUSTOMER' | 'VENDOR' | 'SUPERADMIN';
    content: string;
    deleted?: boolean;
    modified?: boolean;
    seen?: boolean;
}

interface Conversation {
    vendor: Vendor;
    lastMessage: ChatMessage;
    unreadCount: number;
}

interface Props {
    authToken?: string;
    shopApiUrl: string;
}

export function MessagesClient({ authToken, shopApiUrl }: Props) {
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [selectedConv, setSelectedConv] = useState<Conversation | null>(null);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [inputValue, setInputValue] = useState('');
    const [isLoadingConvs, setIsLoadingConvs] = useState(true);
    const [isLoadingHistory, setIsLoadingHistory] = useState(false);
    const [isSending, setIsSending] = useState(false);
    const [isMobileChatActive, setIsMobileChatActive] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editValue, setEditValue] = useState('');
    const [isOtherPartyTyping, setIsOtherPartyTyping] = useState(false);
    const [onlineStatus, setOnlineStatus] = useState<string>('Hors ligne');
    const [isUploading, setIsUploading] = useState(false);
    const [uploadedFile, setUploadedFile] = useState<{ url: string; name: string; type: string } | null>(null);
    const [replyToMsg, setReplyToMsg] = useState<ChatMessage | null>(null);

    const sentTypingRef = useRef<boolean>(false);
    const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    // 1. Load active conversations
    const loadConversations = async (silent = false) => {
        if (!silent) setIsLoadingConvs(true);
        try {
            const result = await getMyConversationsAction();
            if (result.success) {
                setConversations(result.conversations as Conversation[]);
                
                // If a conversation is currently selected, update its reference to keep lastMessage sync
                if (selectedConv) {
                    const updated = (result.conversations as Conversation[]).find(
                        c => c.vendor.id === selectedConv.vendor.id
                    );
                    if (updated) {
                        setSelectedConv(updated);
                    }
                }
            } else {
                console.error('Erreur conversations:', result.error);
            }
        } catch (e) {
            console.error('Erreur chargement conversations:', e);
        } finally {
            if (!silent) setIsLoadingConvs(false);
        }
    };

    // 2. Load active chat history
    const loadChatHistory = async (vendorId: string, silent = false) => {
        if (!silent) setIsLoadingHistory(true);
        try {
            const result = await getChatHistoryAction(vendorId);
            if (result.success) {
                const history = result.history as ChatMessage[];
                setMessages(prev => {
                    const hasChanged = prev.length !== history.length || 
                        (prev.length > 0 && history.length > 0 && prev[prev.length - 1].id !== history[history.length - 1].id);
                    if (hasChanged) {
                        return history;
                    }
                    return prev;
                });
            }
        } catch (e) {
            console.error('Erreur historique:', e);
        } finally {
            if (!silent) setIsLoadingHistory(false);
        }
    };

    // Load list on mount
    useEffect(() => {
        loadConversations();
        
        // Poll conversation list every 10 seconds for updates
        const listInterval = setInterval(() => {
            loadConversations(true);
        }, 10000);

        return () => clearInterval(listInterval);
    }, []);

    // Scroll to bottom when messages update
    useEffect(() => {
        if (messages.length > 0) {
            scrollToBottom();
        }
    }, [messages]);

    // Handle chat selection and setup polling
    const handleSelectConversation = async (conv: Conversation) => {
        setSelectedConv(conv);
        setIsMobileChatActive(true);
        setMessages([]); // Reset messages array when switching conversations
        setReplyToMsg(null);
        setUploadedFile(null);
        
        // Clear previous polling
        if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
        }

        loadChatHistory(conv.vendor.id, false);

        // Fetch online status immediately
        const onlineRes = await userOnlineStatusAction(conv.vendor.id, 'VENDOR');
        if (onlineRes.success) {
            setOnlineStatus(onlineRes.status || 'Hors ligne');
        }

        // Setup polling every 4 seconds for new messages, typing status, and online status
        pollingIntervalRef.current = setInterval(async () => {
            loadChatHistory(conv.vendor.id, true);
            const typingRes = await isTypingAction(conv.vendor.id, 'VENDOR');
            if (typingRes.success) {
                setIsOtherPartyTyping(typingRes.isTyping || false);
            }
            const onlineRes = await userOnlineStatusAction(conv.vendor.id, 'VENDOR');
            if (onlineRes.success) {
                setOnlineStatus(onlineRes.status || 'Hors ligne');
            }
        }, 4000);
    };

    useEffect(() => {
        return () => {
            if (pollingIntervalRef.current) {
                clearInterval(pollingIntervalRef.current);
            }
        };
    }, []);

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        try {
            const formData = new FormData();
            formData.append('file', file);
            
            const shopApiUrl = process.env.NEXT_PUBLIC_VENDURE_SHOP_API_URL || '';
            const uploadUrl = shopApiUrl.replace('/shop-api', '/banner/upload');
            
            const response = await fetch(uploadUrl, {
                method: 'POST',
                body: formData,
            });
            if (!response.ok) throw new Error('Upload failed');
            const data = await response.json();
            
            setUploadedFile({
                url: data.url,
                name: file.name,
                type: file.type
            });
            toast.success("Fichier téléversé !");
        } catch (err: any) {
            toast.error("Erreur de téléversement : " + err.message);
        } finally {
            setIsUploading(false);
        }
    };

    const handleDeleteMessage = async (messageId: string) => {
        if (!window.confirm("Voulez-vous supprimer ce message ?")) return;
        try {
            const result = await deleteChatMessageAction(messageId);
            if (result.success) {
                setMessages(prev => prev.map(m => m.id === messageId ? { ...m, deleted: true, content: 'Ce message a été supprimé' } : m));
                toast.success("Message supprimé");
            } else {
                toast.error(result.error || "Impossible de supprimer");
            }
        } catch (error) {
            toast.error("Erreur de connexion");
        }
    };

    const handleEditMessage = async (messageId: string, newContent: string) => {
        if (!newContent.trim()) return;

        const msg = messages.find(m => m.id === messageId);
        if (!msg) return;

        let contentPayload = newContent;
        if (msg.content.trim().startsWith('{')) {
            try {
                const parsed = JSON.parse(msg.content);
                if (parsed.type === 'rich') {
                    parsed.text = newContent;
                    contentPayload = JSON.stringify(parsed);
                }
            } catch {}
        }

        try {
            const result = await modifyChatMessageAction(messageId, contentPayload);
            if (result.success) {
                setMessages(prev => prev.map(m => m.id === messageId ? { ...m, modified: true, content: contentPayload } : m));
                setEditingId(null);
                setEditValue('');
                toast.success("Message modifié");
            } else {
                toast.error(result.error || "Impossible de modifier");
            }
        } catch (error) {
            toast.error("Erreur de connexion");
        }
    };

    useEffect(() => {
        if (!selectedConv) return;
        const targetId = selectedConv.vendor.id;
        const targetType = 'CUSTOMER';

        if (inputValue.trim().length > 0) {
            if (!sentTypingRef.current) {
                sentTypingRef.current = true;
                setTypingAction(targetId, targetType, true);
            }
            if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
            typingTimeoutRef.current = setTimeout(() => {
                sentTypingRef.current = false;
                setTypingAction(targetId, targetType, false);
            }, 3000);
        } else {
            if (sentTypingRef.current) {
                sentTypingRef.current = false;
                setTypingAction(targetId, targetType, false);
            }
        }
    }, [inputValue, selectedConv]);

    // Send a message
    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedConv || isSending) return;

        const contentText = inputValue.trim();
        if (!contentText && !uploadedFile) return;

        setInputValue('');
        setIsSending(true);

        let contentPayload = contentText;
        if (uploadedFile || replyToMsg) {
            contentPayload = JSON.stringify({
                type: 'rich',
                text: contentText,
                replyTo: replyToMsg ? {
                    id: replyToMsg.id,
                    sender: replyToMsg.sender,
                    content: replyToMsg.content
                } : null,
                attachment: uploadedFile ? {
                    url: uploadedFile.url,
                    name: uploadedFile.name,
                    mimeType: uploadedFile.type
                } : null
            });
        }

        // Reset previews
        setUploadedFile(null);
        setReplyToMsg(null);

        try {
            const result = await sendChatMessageAction(selectedConv.vendor.id, contentPayload);
            if (result.success && result.message) {
                setMessages(prev => [...prev, result.message as ChatMessage]);
                // Silently refresh conversations list to update previews
                loadConversations(true);
            } else {
                toast.error("Impossible d'envoyer le message.");
                setInputValue(contentText);
            }
        } catch (err) {
            toast.error("Erreur de connexion.");
            setInputValue(contentText);
        } finally {
            setIsSending(false);
        }
    };

    const formatDate = (iso: string) => {
        const d = new Date(iso);
        const now = new Date();
        const diff = (now.getTime() - d.getTime()) / 1000;
        if (diff < 60) return 'À l\'instant';
        if (diff < 3600) return `${Math.floor(diff / 60)}m`;
        if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
        return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
    };

    if (isLoadingConvs) {
        return (
            <div className="flex items-center justify-center py-20 text-slate-400">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (conversations.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-center px-4">
                <div className="h-16 w-16 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center mb-4 text-slate-400">
                    <MessageSquare className="h-8 w-8" />
                </div>
                <h3 className="font-bold text-slate-800 dark:text-slate-200 text-lg">Aucune discussion</h3>
                <p className="text-slate-500 text-sm max-w-sm mt-1">
                    Vous n'avez pas encore envoyé de messages aux vendeurs. Visitez les boutiques et utilisez le bouton "Discuter" pour démarrer une conversation.
                </p>
                <Link 
                    href="/"
                    className="mt-6 px-5 py-2.5 bg-primary text-white font-bold rounded-xl text-xs uppercase tracking-wider hover:bg-primary/95 transition shadow-lg shadow-primary/10"
                >
                    Découvrir les boutiques
                </Link>
            </div>
        );
    }

    return (
        <div className="flex flex-col lg:flex-row rounded-2xl border border-slate-150 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-sm h-[calc(100vh-120px)] lg:h-[650px]">
            {/* Conversations List */}
            <div className={`w-full lg:w-1/3 border-r border-slate-150 dark:border-slate-800 flex flex-col h-full ${isMobileChatActive ? 'hidden lg:flex' : 'flex'}`}>
                <div className="p-4 border-b border-slate-150 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
                    <h3 className="font-bold text-slate-950 dark:text-white text-sm">Discussions ({conversations.length})</h3>
                </div>
                <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
                    {conversations.map((conv) => {
                        const isSelected = selectedConv?.vendor.id === conv.vendor.id;
                        const isLastMsgFromMe = conv.lastMessage?.sender === 'CUSTOMER';
                        return (
                            <button
                                key={conv.vendor.id}
                                onClick={() => handleSelectConversation(conv)}
                                className={`w-full text-left p-4 flex gap-3 transition-colors ${isSelected ? 'bg-slate-50 dark:bg-slate-800/50' : 'hover:bg-slate-50/50 dark:hover:bg-slate-800/20'}`}
                            >
                                <div className="h-10 w-10 bg-slate-100 dark:bg-slate-800 rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden border border-slate-150 dark:border-slate-700">
                                    {conv.vendor.logo?.preview ? (
                                        <img src={conv.vendor.logo.preview} alt="" className="h-full w-full object-cover" />
                                    ) : (
                                        <Store className="h-4.5 w-4.5 text-slate-400" />
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex justify-between items-baseline gap-1.5">
                                        <h4 className="font-bold text-slate-900 dark:text-slate-100 text-xs truncate uppercase tracking-wide">
                                            {conv.vendor.name}
                                        </h4>
                                        <div className="flex flex-col items-end gap-1 shrink-0">
                                            <span className="text-[9px] text-slate-400">
                                                {conv.lastMessage ? formatDate(conv.lastMessage.createdAt) : ''}
                                            </span>
                                            {conv.unreadCount > 0 && (
                                                <span className="h-4.5 min-w-[18px] px-1 bg-orange-500 text-[9px] font-black text-white rounded-full flex items-center justify-center animate-pulse shadow-sm">
                                                    {conv.unreadCount}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <p className={`text-xs mt-1 truncate ${isSelected ? 'text-slate-700 dark:text-slate-300' : 'text-slate-500'}`}>
                                        {isLastMsgFromMe && <span className="font-semibold text-primary mr-1">Vous:</span>}
                                        {conv.lastMessage?.content?.trim().startsWith('{') ? (JSON.parse(conv.lastMessage.content).text || '📎 Fichier joint') : (conv.lastMessage?.content || 'Aucun message')}
                                    </p>
                                </div>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Active Discussion Window */}
            <div className={`w-full lg:w-2/3 flex flex-col h-full relative ${isMobileChatActive ? 'flex' : 'hidden lg:flex'}`}>
                {selectedConv ? (
                    <>
                        {/* Chat Header */}
                        <div className="px-4 py-3 bg-slate-900 dark:bg-slate-950 text-white flex items-center justify-between shadow-sm">
                            <div className="flex items-center gap-2.5 min-w-0">
                                <button
                                    onClick={() => setIsMobileChatActive(false)}
                                    className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition lg:hidden"
                                    aria-label="Retour"
                                >
                                    <ChevronLeft className="h-5 w-5" />
                                </button>
                                <div className="h-9 w-9 bg-white/10 rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden">
                                    {selectedConv.vendor.logo?.preview ? (
                                        <img src={selectedConv.vendor.logo.preview} alt="" className="h-full w-full object-cover" />
                                    ) : (
                                        <Store className="h-4 w-4 text-primary" />
                                    )}
                                </div>
                                <div className="min-w-0">
                                    <h4 className="font-black text-xs uppercase tracking-wider truncate pr-2">
                                        {selectedConv.vendor.name}
                                    </h4>
                                    <div className="flex items-center gap-1.5 mt-0.5">
                                        <span className={`h-1.5 w-1.5 rounded-full ${onlineStatus === 'En ligne' ? 'bg-green-500 animate-pulse' : 'bg-slate-400'}`} />
                                        <span className="text-[10px] text-slate-400 font-semibold">{onlineStatus}</span>
                                    </div>
                                </div>
                            </div>
                            <Link
                                href={`/vendor/${encodeId(selectedConv.vendor.id)}`}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/15 text-white text-[10px] font-bold rounded-lg uppercase tracking-wider transition-colors shrink-0"
                            >
                                <Store className="h-3.5 w-3.5" />
                                <span className="hidden sm:inline">Voir Boutique</span>
                            </Link>
                        </div>

                        {/* Chat Messages */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-slate-50/60 dark:bg-slate-900/40">
                            {/* Security Notice Banner */}
                            <div className="p-3 bg-amber-50 dark:bg-amber-955/20 border border-amber-100 dark:border-amber-900/30 rounded-xl flex items-start gap-2.5 text-amber-800 dark:text-amber-300 text-xs font-medium">
                                <Info className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                                <div className="flex flex-col">
                                    <span className="font-bold flex items-center gap-1 text-amber-900 dark:text-amber-105">
                                        🔒 Sécurité — Ahizan Marketplace
                                    </span>
                                    <span className="mt-0.5">
                                        Ne partagez jamais de mot de passe, code, données bancaires, numéro de carte, téléphone ou e-mail dans cette discussion.
                                    </span>
                                </div>
                            </div>

                            {isLoadingHistory ? (
                                <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-2">
                                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                                    <span className="text-xs">Chargement...</span>
                                </div>
                            ) : (
                                <>
                                    {messages.map((msg) => {
                                        const isMe = msg.sender === 'CUSTOMER';
                                        const isEditing = editingId === msg.id;
                                        
                                        // Parse rich message content
                                        let text = msg.content;
                                        let replyTo = null;
                                        let attachment = null;
                                        if (msg.content.trim().startsWith('{')) {
                                            try {
                                                const parsed = JSON.parse(msg.content);
                                                if (parsed.type === 'rich') {
                                                    text = parsed.text || '';
                                                    replyTo = parsed.replyTo || null;
                                                    attachment = parsed.attachment || null;
                                                }
                                            } catch {}
                                        }

                                        // Check if this is the latest CUSTOMER message in the array
                                        const lastCustomerMsg = [...messages].reverse().find(m => m.sender === 'CUSTOMER');
                                        const isLatestCustomerMsg = lastCustomerMsg?.id === msg.id;

                                        return (
                                            <div
                                                key={msg.id}
                                                className={`flex ${isMe ? 'justify-end' : 'justify-start'} group`}
                                            >
                                                <div className="flex flex-col max-w-[80%] sm:max-w-[70%] animate-in fade-in duration-200">
                                                    {msg.sender === 'SUPERADMIN' && (
                                                        <span className="text-[10px] text-amber-600 dark:text-amber-455 font-extrabold mb-1 ml-1 uppercase tracking-wide flex items-center gap-1 select-none">
                                                            <Info className="h-3 w-3" /> Message de l'administrateur
                                                        </span>
                                                    )}
                                                    <div className={`rounded-2xl px-3.5 py-2.5 text-xs font-medium shadow-sm leading-relaxed ${isMe ? 'bg-primary text-white rounded-tr-none' : 'bg-white dark:bg-slate-800 text-slate-850 dark:text-slate-200 border border-slate-100 dark:border-slate-750 rounded-tl-none'}`}>
                                                        {/* Quoted message preview inside the bubble */}
                                                        {replyTo && (
                                                            <div className="mb-2 p-2 bg-slate-100/80 dark:bg-slate-700/50 border-l-4 border-slate-400 dark:border-slate-500 rounded text-[10px] text-slate-600 dark:text-slate-300 select-none">
                                                                <div className="font-extrabold text-[9px] text-slate-500 dark:text-slate-450 mb-0.5 uppercase">
                                                                    {replyTo.sender === 'CUSTOMER' ? 'Client' : replyTo.sender === 'VENDOR' ? 'Vendeur' : 'Administrateur'}
                                                                </div>
                                                                <div className="truncate">
                                                                    {replyTo.content.startsWith('{') ? (JSON.parse(replyTo.content).text || '📎 Fichier joint') : replyTo.content}
                                                                </div>
                                                            </div>
                                                        )}

                                                        {/* Attachment preview inside the bubble */}
                                                        {attachment && (
                                                            <div className="mb-2 max-w-[200px] rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 shadow-sm bg-slate-50 dark:bg-slate-900">
                                                                {attachment.mimeType?.startsWith('image/') ? (
                                                                    <a href={attachment.url} target="_blank" rel="noopener noreferrer">
                                                                        <img src={attachment.url} alt={attachment.name} className="max-h-[120px] w-full object-cover hover:opacity-90 transition" />
                                                                    </a>
                                                                ) : (
                                                                    <a href={attachment.url} target="_blank" rel="noopener noreferrer" className="p-2 flex items-center gap-1.5 text-[10px] font-bold text-slate-700 dark:text-slate-300 hover:text-primary">
                                                                        <Paperclip className="h-3.5 w-3.5 shrink-0 text-slate-450" />
                                                                        <span className="truncate flex-1">{attachment.name}</span>
                                                                    </a>
                                                                )}
                                                            </div>
                                                        )}

                                                        {msg.deleted ? (
                                                            <span className="italic text-slate-400 dark:text-slate-500 flex items-center gap-1">
                                                                🚫 Ce message a été supprimé
                                                            </span>
                                                        ) : isEditing ? (
                                                            <div className="flex flex-col gap-1.5 w-[200px] sm:w-[250px]">
                                                                <input
                                                                    type="text"
                                                                    value={editValue}
                                                                    onChange={(e) => setEditValue(e.target.value)}
                                                                    className="px-2.5 py-1.5 border border-white/20 bg-white/10 text-white rounded-lg focus:outline-none text-xs w-full text-slate-900"
                                                                    autoFocus
                                                                />
                                                                <div className="flex gap-2 justify-end">
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => setEditingId(null)}
                                                                        className="text-[10px] text-white/80 hover:text-white font-bold"
                                                                    >
                                                                        Annuler
                                                                    </button>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => handleEditMessage(msg.id, editValue)}
                                                                        className="text-[10px] bg-white text-primary font-bold px-2 py-0.5 rounded animate-pulse"
                                                                    >
                                                                        Enregistrer
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <p className="whitespace-pre-wrap break-words">{text}</p>
                                                        )}
                                                        <div className={`text-[9px] mt-1.5 text-right font-semibold ${isMe ? 'text-white/70' : 'text-slate-400'} flex items-center justify-end gap-1`}>
                                                            {msg.modified && !msg.deleted && <span className="opacity-80 italic">(modifié)</span>}
                                                            <span>
                                                                {new Date(msg.createdAt).toLocaleTimeString('fr-FR', {
                                                                    hour: '2-digit',
                                                                    minute: '2-digit'
                                                                })}
                                                            </span>
                                                        </div>
                                                    </div>

                                                    {/* Actions below bubble */}
                                                    {!msg.deleted && (
                                                        <div className={`flex gap-3 mt-1 px-1 text-[10px] text-slate-400 dark:text-slate-500 font-semibold select-none ${isMe ? 'justify-end' : 'justify-start'}`}>
                                                            <button
                                                                type="button"
                                                                onClick={() => setReplyToMsg(msg)}
                                                                className="hover:text-primary transition-colors flex items-center gap-0.5"
                                                                title="Répondre"
                                                            >
                                                                <CornerUpLeft className="h-2.5 w-2.5" /> Répondre
                                                            </button>
                                                            {isMe && !msg.seen && (
                                                                <>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => {
                                                                            setEditingId(msg.id);
                                                                            setEditValue(text);
                                                                        }}
                                                                        className="hover:text-primary transition-colors flex items-center gap-0.5"
                                                                        title="Modifier"
                                                                    >
                                                                        <Pencil className="h-2.5 w-2.5" /> Modifier
                                                                    </button>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => handleDeleteMessage(msg.id)}
                                                                        className="hover:text-red-500 transition-colors flex items-center gap-0.5"
                                                                        title="Supprimer"
                                                                    >
                                                                        <Trash2 className="h-2.5 w-2.5" /> Supprimer
                                                                    </button>
                                                                </>
                                                            )}
                                                        </div>
                                                    )}
                                                    
                                                    {/* Seen status for the latest sent message */}
                                                    {isMe && isLatestCustomerMsg && (
                                                        <div className="text-right pr-1">
                                                            {msg.seen ? (
                                                                <span className="text-blue-500 text-[10px] font-black select-none">✓✓</span>
                                                            ) : (
                                                                <span className="text-slate-400 text-[10px] font-black select-none">✓</span>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                    {isOtherPartyTyping && (
                                        <div className="flex justify-start items-center gap-2 px-2">
                                            <div className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-750 rounded-2xl rounded-tl-none px-4 py-2.5 flex items-center gap-1.5 shadow-sm">
                                                <span className="h-1.5 w-1.5 bg-slate-400 rounded-full animate-bounce" style={{animationDelay: '0ms'}}></span>
                                                <span className="h-1.5 w-1.5 bg-slate-400 rounded-full animate-bounce" style={{animationDelay: '150ms'}}></span>
                                                <span className="h-1.5 w-1.5 bg-slate-400 rounded-full animate-bounce" style={{animationDelay: '300ms'}}></span>
                                            </div>
                                        </div>
                                    )}
                                    <div ref={messagesEndRef} />
                                </>
                            )}
                        </div>

                        {/* Previews and Input Form */}
                        <div className="border-t border-slate-150 dark:border-slate-800 bg-white dark:bg-slate-950 p-2.5 space-y-2">
                            {/* Reply Quote Preview */}
                            {replyToMsg && (
                                <div className="flex items-center justify-between p-2.5 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-350">
                                    <div className="flex items-center gap-2 truncate">
                                        <CornerUpLeft className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                                        <div className="truncate">
                                            <span className="font-extrabold uppercase text-[10px] text-slate-500 mr-1.5">
                                                Répondre à {replyToMsg.sender === 'CUSTOMER' ? 'Vous' : 'Vendeur'}:
                                            </span>
                                            {replyToMsg.content.startsWith('{') ? (JSON.parse(replyToMsg.content).text || 'Fichier joint') : replyToMsg.content}
                                        </div>
                                    </div>
                                    <button type="button" onClick={() => setReplyToMsg(null)} className="p-1 hover:bg-slate-150 dark:hover:bg-slate-800 rounded-lg">
                                        <X className="h-3.5 w-3.5 text-slate-450" />
                                    </button>
                                </div>
                            )}

                            {/* File Upload Preview */}
                            {uploadedFile && (
                                <div className="flex items-center justify-between p-2 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-350">
                                    <div className="flex items-center gap-2 truncate">
                                        <Paperclip className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                                        <span className="truncate font-bold">{uploadedFile.name}</span>
                                    </div>
                                    <button type="button" onClick={() => setUploadedFile(null)} className="p-1 hover:bg-slate-150 dark:hover:bg-slate-800 rounded-lg">
                                        <X className="h-3.5 w-3.5 text-slate-455" />
                                    </button>
                                </div>
                            )}

                            <form onSubmit={handleSendMessage} className="flex gap-2 items-center">
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    onChange={handleFileUpload}
                                    className="hidden"
                                    accept="image/*,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
                                />
                                <button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={isUploading || isLoadingHistory}
                                    className="p-2.5 bg-slate-100 hover:bg-slate-150 dark:bg-slate-850 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl transition flex-shrink-0"
                                    title="Ajouter un fichier"
                                >
                                    {isUploading ? (
                                        <Loader2 className="h-4.5 w-4.5 animate-spin" />
                                    ) : (
                                        <Paperclip className="h-4.5 w-4.5" />
                                    )}
                                </button>

                                <input
                                    type="text"
                                    value={inputValue}
                                    onChange={(e) => setInputValue(e.target.value)}
                                    placeholder="Écrire votre message..."
                                    disabled={isLoadingHistory}
                                    className="flex-1 px-4 py-2.5 border border-slate-200 dark:border-slate-800 dark:bg-slate-900 rounded-xl text-xs font-medium focus:outline-none focus:border-primary transition-colors text-slate-850 dark:text-white placeholder-slate-400 dark:placeholder-slate-500"
                                />
                                
                                <button
                                    type="submit"
                                    disabled={(!inputValue.trim() && !uploadedFile) || isSending || isLoadingHistory}
                                    className="p-2.5 bg-primary hover:bg-red-750 text-white rounded-xl disabled:bg-slate-100 dark:disabled:bg-slate-850 disabled:text-slate-400 transition shadow-md shadow-primary/10 flex-shrink-0"
                                >
                                    {isSending ? (
                                        <Loader2 className="h-4.5 w-4.5 animate-spin" />
                                    ) : (
                                        <Send className="h-4.5 w-4.5" />
                                    )}
                                </button>
                            </form>
                        </div>
                    </>
                ) : (
                    <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400 gap-3">
                        <div className="h-16 w-16 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center">
                            <MessageSquare className="h-7 w-7 text-slate-400" />
                        </div>
                        <div>
                            <h4 className="font-bold text-slate-800 dark:text-slate-200">Sélectionnez une discussion</h4>
                            <p className="text-xs max-w-xs mx-auto mt-1 leading-relaxed">
                                Choisissez une boutique dans la liste de gauche pour afficher l'historique et continuer votre échange.
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
