'use client';

import { useState, useEffect, useRef } from 'react';
import { MessageSquare, Store, Send, ChevronLeft, Loader2, ArrowRight, Info } from 'lucide-react';
import { getMyConversationsAction, getChatHistoryAction, sendChatMessageAction } from '@/app/(storefront)/likes-actions';
import { toast } from 'sonner';
import Link from 'next/link';

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
    sender: 'CUSTOMER' | 'VENDOR';
    content: string;
}

interface Conversation {
    vendor: Vendor;
    lastMessage: ChatMessage;
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
    const handleSelectConversation = (conv: Conversation) => {
        setSelectedConv(conv);
        setIsMobileChatActive(true);
        setMessages([]); // Reset messages array when switching conversations
        
        // Clear previous polling
        if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
        }

        loadChatHistory(conv.vendor.id, false);

        // Setup polling every 4 seconds for new messages
        pollingIntervalRef.current = setInterval(() => {
            loadChatHistory(conv.vendor.id, true);
        }, 4000);
    };

    useEffect(() => {
        return () => {
            if (pollingIntervalRef.current) {
                clearInterval(pollingIntervalRef.current);
            }
        };
    }, []);

    // Send a message
    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedConv || !inputValue.trim() || isSending) return;

        const content = inputValue.trim();
        setInputValue('');
        setIsSending(true);

        try {
            const result = await sendChatMessageAction(selectedConv.vendor.id, content);
            if (result.success && result.message) {
                setMessages(prev => [...prev, result.message as ChatMessage]);
                // Silently refresh conversations list to update previews
                loadConversations(true);
            } else {
                toast.error("Impossible d'envoyer le message.");
                setInputValue(content);
            }
        } catch (err) {
            toast.error("Erreur de connexion.");
            setInputValue(content);
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
        <div className="flex flex-col lg:flex-row rounded-2xl border border-slate-150 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-sm h-[600px]">
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
                                        <span className="text-[9px] text-slate-400 shrink-0">
                                            {conv.lastMessage ? formatDate(conv.lastMessage.createdAt) : ''}
                                        </span>
                                    </div>
                                    <p className={`text-xs mt-1 truncate ${isSelected ? 'text-slate-700 dark:text-slate-300' : 'text-slate-500'}`}>
                                        {isLastMsgFromMe && <span className="font-semibold text-primary mr-1">Vous:</span>}
                                        {conv.lastMessage?.content || 'Aucun message'}
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
                                        <span className="h-1.5 w-1.5 bg-green-500 rounded-full" />
                                        <span className="text-[10px] text-slate-400 font-semibold">Discussion avec le vendeur</span>
                                    </div>
                                </div>
                            </div>
                            <Link
                                href={`/vendor/${selectedConv.vendor.id}`}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/15 text-white text-[10px] font-bold rounded-lg uppercase tracking-wider transition-colors shrink-0"
                            >
                                <Store className="h-3.5 w-3.5" />
                                <span className="hidden sm:inline">Voir Boutique</span>
                            </Link>
                        </div>

                        {/* Chat Messages */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-slate-50/60 dark:bg-slate-900/40">
                            {isLoadingHistory ? (
                                <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-2">
                                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                                    <span className="text-xs">Chargement...</span>
                                </div>
                            ) : (
                                <>
                                    {messages.map((msg) => {
                                        const isMe = msg.sender === 'CUSTOMER';
                                        return (
                                            <div
                                                key={msg.id}
                                                className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
                                            >
                                                <div className={`max-w-[80%] sm:max-w-[70%] rounded-2xl px-3.5 py-2.5 text-xs font-medium shadow-sm leading-relaxed ${isMe ? 'bg-primary text-white rounded-tr-none' : 'bg-white dark:bg-slate-800 text-slate-850 dark:text-slate-200 border border-slate-100 dark:border-slate-750 rounded-tl-none'}`}>
                                                    <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                                                    <div className={`text-[9px] mt-1.5 text-right font-semibold ${isMe ? 'text-white/70' : 'text-slate-400'}`}>
                                                        {new Date(msg.createdAt).toLocaleTimeString('fr-FR', {
                                                            hour: '2-digit',
                                                            minute: '2-digit'
                                                        })}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                    <div ref={messagesEndRef} />
                                </>
                            )}
                        </div>

                        {/* Input form */}
                        <form
                            onSubmit={handleSendMessage}
                            className="p-3.5 border-t border-slate-150 dark:border-slate-800 bg-white dark:bg-slate-950 flex gap-2 items-center"
                        >
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
                                disabled={!inputValue.trim() || isSending || isLoadingHistory}
                                className="p-2.5 bg-primary hover:bg-red-750 text-white rounded-xl disabled:bg-slate-100 dark:disabled:bg-slate-850 disabled:text-slate-400 transition shadow-md shadow-primary/10 flex-shrink-0"
                            >
                                {isSending ? (
                                    <Loader2 className="h-4.5 w-4.5 animate-spin" />
                                ) : (
                                    <Send className="h-4.5 w-4.5" />
                                )}
                            </button>
                        </form>
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
