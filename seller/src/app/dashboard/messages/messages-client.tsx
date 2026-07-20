"use client";

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Send, Search, MessageSquare, Loader2, User, RefreshCw, Mail } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { getConversationsAction, getConversationHistoryAction, replyToCustomerAction } from '@/lib/vendure/actions';
import { toast } from 'sonner';

interface Customer {
    id: string;
    firstName: string;
    lastName: string;
    emailAddress: string;
}

interface ChatMessage {
    id: string;
    createdAt: string;
    sender: 'CUSTOMER' | 'VENDOR';
    content: string;
}

interface Conversation {
    customer: Customer;
    lastMessage: ChatMessage;
}

interface MessagesClientProps {
    initialConversations: Conversation[];
}

export function MessagesClient({ initialConversations }: MessagesClientProps) {
    const [conversations, setConversations] = useState<Conversation[]>(initialConversations);
    const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    
    const [searchTerm, setSearchTerm] = useState('');
    const [replyText, setReplyText] = useState('');
    
    const [isHistoryLoading, setIsHistoryLoading] = useState(false);
    const [isSending, setIsSending] = useState(false);
    const [isRefreshingList, setIsRefreshingList] = useState(false);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const listPollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

    // Scroll to bottom helper
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    // Load active conversation messages
    const loadConversationHistory = async (customerId: string, showLoader = false) => {
        if (showLoader) setIsHistoryLoading(true);
        try {
            const history = await getConversationHistoryAction(customerId);
            setMessages(history as ChatMessage[]);
        } catch (error) {
            console.error('Erreur lors du chargement des messages:', error);
        } finally {
            if (showLoader) setIsHistoryLoading(false);
        }
    };

    // Refresh conversation list from server
    const refreshConversationsList = async (showLoader = false) => {
        if (showLoader) setIsRefreshingList(true);
        try {
            const list = await getConversationsAction();
            setConversations(list);
        } catch (error) {
            console.error('Erreur lors du rafraîchissement des conversations:', error);
        } finally {
            if (showLoader) setIsRefreshingList(false);
        }
    };

    // Set up polling for active conversation and list updates
    useEffect(() => {
        if (activeConversation) {
            loadConversationHistory(activeConversation.customer.id, true);

            // Poll message history every 4 seconds
            if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = setInterval(() => {
                loadConversationHistory(activeConversation.customer.id, false);
            }, 4000);
        } else {
            setMessages([]);
            if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
        }

        return () => {
            if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
        };
    }, [activeConversation]);

    // Poll conversations list in background every 8 seconds
    useEffect(() => {
        refreshConversationsList(false);
        
        listPollingIntervalRef.current = setInterval(() => {
            refreshConversationsList(false);
        }, 8000);

        return () => {
            if (listPollingIntervalRef.current) clearInterval(listPollingIntervalRef.current);
        };
    }, []);

    // Scroll to bottom on message list updates
    useEffect(() => {
        if (messages.length > 0) {
            scrollToBottom();
        }
    }, [messages]);

    // Filter conversations locally by search term
    const filteredConversations = useMemo(() => {
        if (!searchTerm.trim()) return conversations;
        const term = searchTerm.toLowerCase();
        return conversations.filter(c => 
            c.customer.firstName?.toLowerCase().includes(term) ||
            c.customer.lastName?.toLowerCase().includes(term) ||
            c.customer.emailAddress?.toLowerCase().includes(term)
        );
    }, [conversations, searchTerm]);

    // Handle send message reply
    const handleSendReply = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!replyText.trim() || !activeConversation || isSending) return;

        const content = replyText.trim();
        setReplyText('');
        setIsSending(true);

        try {
            const result = await replyToCustomerAction(activeConversation.customer.id, content);
            if (result.success && result.message) {
                // Instantly add message to local state
                setMessages(prev => [...prev, result.message as ChatMessage]);
                // Refresh list in background to update lastMessage
                refreshConversationsList(false);
            } else {
                toast.error(result.error || "Une erreur est survenue lors de l'envoi.");
                setReplyText(content); // Restore input in case of failure
            }
        } catch (error) {
            toast.error("Erreur de connexion.");
            setReplyText(content);
        } finally {
            setIsSending(false);
        }
    };

    // Helper for initials
    const getInitials = (cust: Customer) => {
        const first = cust.firstName ? cust.firstName.charAt(0).toUpperCase() : '';
        const last = cust.lastName ? cust.lastName.charAt(0).toUpperCase() : '';
        return `${first}${last}` || <User className="h-4 w-4" />;
    };

    // Format time/date helper
    const formatTime = (dateString: string) => {
        try {
            const date = new Date(dateString);
            const now = new Date();
            
            // If today, show time only
            if (date.toDateString() === now.toDateString()) {
                return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
            }
            // If yesterday, show 'Hier'
            const yesterday = new Date(now);
            yesterday.setDate(now.getDate() - 1);
            if (date.toDateString() === yesterday.toDateString()) {
                return 'Hier';
            }
            // Else show date
            return date.toLocaleDateString('fr-FR', { month: 'short', day: 'numeric' });
        } catch {
            return '';
        }
    };

    return (
        <div className="flex-1 flex flex-col h-full bg-slate-50/50 dark:bg-slate-900/40 rounded-2xl border border-slate-200/60 dark:border-slate-800 overflow-hidden shadow-sm">
            <div className="flex flex-1 overflow-hidden h-full">
                
                {/* Left Panel: Conversations List */}
                <div className="w-full md:w-[340px] border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 flex flex-col h-full flex-shrink-0">
                    {/* Panel Header */}
                    <div className="p-4 border-b border-slate-150 dark:border-slate-850 space-y-3">
                        <div className="flex justify-between items-center">
                            <h2 className="font-extrabold text-lg text-slate-900 dark:text-white uppercase tracking-tight">
                                Discussions
                            </h2>
                            <Button 
                                variant="ghost" 
                                size="icon"
                                onClick={() => refreshConversationsList(true)}
                                disabled={isRefreshingList}
                                className="h-8 w-8 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-white"
                            >
                                <RefreshCw className={`h-4 w-4 ${isRefreshingList ? 'animate-spin' : ''}`} />
                            </Button>
                        </div>
                        {/* Search Input */}
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <Input
                                type="text"
                                placeholder="Rechercher un client..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-9 h-9 rounded-xl border border-slate-200 dark:border-slate-800 dark:bg-slate-900 text-xs font-medium placeholder-slate-400 dark:placeholder-slate-500"
                            />
                        </div>
                    </div>

                    {/* Conversations Scrollable List */}
                    <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-850 p-2 space-y-1">
                        {filteredConversations.length === 0 ? (
                            <div className="text-center py-12 text-slate-400 px-4">
                                <MessageSquare className="h-10 w-10 text-slate-300 mx-auto mb-3" />
                                <h4 className="font-bold text-sm text-slate-700 dark:text-slate-300">Aucune discussion</h4>
                                <p className="text-xs mt-1 leading-relaxed">
                                    {searchTerm ? "Aucune conversation ne correspond à vos critères." : "Vous n'avez pas encore reçu de messages de clients."}
                                </p>
                            </div>
                        ) : (
                            filteredConversations.map((conv) => {
                                const isActive = activeConversation?.customer.id === conv.customer.id;
                                return (
                                    <button
                                        key={conv.customer.id}
                                        onClick={() => setActiveConversation(conv)}
                                        className={`w-full text-left p-3 rounded-xl flex gap-3 items-start transition-all border-l-4 ${
                                            isActive 
                                            ? 'bg-primary/5 dark:bg-white/5 border-primary shadow-sm' 
                                            : 'border-transparent hover:bg-slate-50 dark:hover:bg-white/5'
                                        }`}
                                    >
                                        <div className="h-10 w-10 bg-slate-100 dark:bg-slate-800 rounded-xl text-slate-700 dark:text-slate-300 font-bold text-sm flex items-center justify-center flex-shrink-0 shadow-sm">
                                            {getInitials(conv.customer)}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex justify-between items-center">
                                                <p className="font-bold text-xs text-slate-900 dark:text-white truncate">
                                                    {conv.customer.firstName ? `${conv.customer.firstName} ${conv.customer.lastName}` : "Client Anonyme"}
                                                </p>
                                                <span className="text-[9px] font-semibold text-slate-400">
                                                    {formatTime(conv.lastMessage.createdAt)}
                                                </span>
                                            </div>
                                            <p className={`text-[11px] truncate mt-1 ${
                                                isActive ? 'text-slate-700 dark:text-slate-300 font-medium' : 'text-slate-500 dark:text-slate-400'
                                            }`}>
                                                {conv.lastMessage.sender === 'VENDOR' ? 'Vous: ' : ''}
                                                {conv.lastMessage.content}
                                            </p>
                                        </div>
                                    </button>
                                );
                            })
                        )}
                    </div>
                </div>

                {/* Right Panel: Conversation Details & Chat History */}
                <div className="flex-grow flex flex-col h-full bg-slate-50/20 dark:bg-slate-900/10">
                    {!activeConversation ? (
                        /* Empty State */
                        <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-slate-400">
                            <div className="h-14 w-14 rounded-full bg-white dark:bg-slate-850 flex items-center justify-center shadow-md mb-4 border border-slate-100 dark:border-slate-800">
                                <MessageSquare className="h-6.5 w-6.5 text-primary" />
                            </div>
                            <h3 className="font-black text-slate-900 dark:text-white uppercase text-sm tracking-wide">
                                Sélectionnez une discussion
                            </h3>
                            <p className="text-xs max-w-xs mx-auto mt-2 leading-relaxed font-medium">
                                Choisissez un client dans le volet de gauche pour consulter l'historique et répondre à ses messages.
                            </p>
                        </div>
                    ) : (
                        /* Chat Active View */
                        <div className="flex-1 flex flex-col h-full overflow-hidden">
                            {/* Chat Header */}
                            <div className="px-6 py-3.5 bg-white dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shadow-sm">
                                <div className="min-w-0">
                                    <h3 className="font-black text-sm text-slate-900 dark:text-white uppercase tracking-tight truncate">
                                        {activeConversation.customer.firstName ? `${activeConversation.customer.firstName} ${activeConversation.customer.lastName}` : "Client Anonyme"}
                                    </h3>
                                    <div className="flex items-center gap-1.5 mt-0.5 text-[10px] text-slate-400 font-semibold">
                                        <Mail className="h-3.5 w-3.5 text-slate-400" />
                                        <span className="truncate">{activeConversation.customer.emailAddress || "Aucun email"}</span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="h-1.5 w-1.5 bg-green-500 rounded-full"></span>
                                    <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Actif</span>
                                </div>
                            </div>

                            {/* Chat Messages Stream */}
                            <div className="flex-grow overflow-y-auto p-6 space-y-4 bg-slate-50/40 dark:bg-slate-900/20">
                                {isHistoryLoading ? (
                                    <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-2">
                                        <Loader2 className="h-7 w-7 animate-spin text-primary" />
                                        <span className="text-xs font-semibold">Chargement du fil...</span>
                                    </div>
                                ) : (
                                    <>
                                        {messages.map((msg) => {
                                            const isMe = msg.sender === 'VENDOR';
                                            return (
                                                <div 
                                                    key={msg.id} 
                                                    className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
                                                >
                                                    <div className={`max-w-[70%] rounded-2xl px-4 py-3 text-xs font-medium shadow-sm leading-relaxed ${
                                                        isMe 
                                                        ? 'bg-primary text-white rounded-tr-none' 
                                                        : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-100 dark:border-slate-750 rounded-tl-none'
                                                    }`}>
                                                        <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                                                        <p className={`text-[9px] mt-1.5 text-right font-semibold ${
                                                            isMe ? 'text-white/70' : 'text-slate-400'
                                                        }`}>
                                                            {new Date(msg.createdAt).toLocaleTimeString('fr-FR', {
                                                                hour: '2-digit',
                                                                minute: '2-digit'
                                                            })}
                                                        </p>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                        <div ref={messagesEndRef} />
                                    </>
                                )}
                            </div>

                            {/* Chat Input Footer */}
                            <form 
                                onSubmit={handleSendReply}
                                className="p-4 bg-white dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex gap-3 items-center"
                            >
                                <Input
                                    type="text"
                                    value={replyText}
                                    onChange={(e) => setReplyText(e.target.value)}
                                    placeholder="Écrire une réponse..."
                                    disabled={isHistoryLoading}
                                    className="flex-1 h-10 rounded-xl border border-slate-200 dark:border-slate-800 dark:bg-slate-900 text-xs font-medium focus-visible:ring-primary text-slate-800 dark:text-white"
                                />
                                <Button
                                    type="submit"
                                    disabled={!replyText.trim() || isSending || isHistoryLoading}
                                    className="h-10 px-4 bg-primary hover:bg-red-700 text-white font-bold rounded-xl text-xs flex gap-2 items-center shadow-md shadow-primary/20 transition-all"
                                >
                                    {isSending ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                        <>
                                            <span>Envoyer</span>
                                            <Send className="h-3.5 w-3.5" />
                                        </>
                                    )}
                                </Button>
                            </form>
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
}
