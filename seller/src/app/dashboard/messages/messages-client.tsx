"use client";

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Send, Search, MessageSquare, Loader2, User, RefreshCw, Mail, Info, Pencil, Trash2, Paperclip, Image, X, CornerUpLeft } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { getConversationsAction, getConversationHistoryAction, replyToCustomerAction, deleteChatMessageAction, modifyChatMessageAction, setTypingAction, isTypingAction, userOnlineStatusAction } from '@/lib/vendure/actions';
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
    sender: 'CUSTOMER' | 'VENDOR' | 'SUPERADMIN';
    content: string;
    deleted?: boolean;
    modified?: boolean;
    seen?: boolean;
}

interface Conversation {
    customer: Customer;
    lastMessage: ChatMessage;
    unreadCount: number;
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
            setReplyToMsg(null);
            setUploadedFile(null);

            // Fetch online status immediately
            const fetchOnline = async () => {
                const onlineRes = await userOnlineStatusAction(activeConversation.customer.id, 'CUSTOMER');
                if (onlineRes.success) {
                    setOnlineStatus(onlineRes.status || 'Hors ligne');
                }
            };
            fetchOnline();

            // Poll message history every 4 seconds for new messages, typing status, and online status
            if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = setInterval(async () => {
                loadConversationHistory(activeConversation.customer.id, false);
                const typingRes = await isTypingAction(activeConversation.customer.id, 'CUSTOMER');
                if (typingRes.success) {
                    setIsOtherPartyTyping(typingRes.isTyping || false);
                }
                const onlineRes = await userOnlineStatusAction(activeConversation.customer.id, 'CUSTOMER');
                if (onlineRes.success) {
                    setOnlineStatus(onlineRes.status || 'Hors ligne');
                }
            }, 4000);
        } else {
            setMessages([]);
            if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
        }

        return () => {
            if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
        };
    }, [activeConversation]);;

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

    useEffect(() => {
        if (!activeConversation) return;
        const targetId = activeConversation.customer.id;
        const targetType = 'VENDOR';

        if (replyText.trim().length > 0) {
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
    }, [replyText, activeConversation]);

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

    const handleReplyTo = (msg: ChatMessage) => {
        setReplyToMsg(msg);
    };

    // Handle send message reply
    const handleSendReply = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!activeConversation || isSending) return;

        const contentText = replyText.trim();
        if (!contentText && !uploadedFile) return;

        setReplyText('');
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

        setUploadedFile(null);
        setReplyToMsg(null);

        try {
            const result = await replyToCustomerAction(activeConversation.customer.id, contentPayload);
            if (result.success && result.message) {
                setMessages(prev => [...prev, result.message as ChatMessage]);
                refreshConversationsList(false);
            } else {
                toast.error(result.error || "Une erreur est survenue lors de l'envoi.");
                setReplyText(contentText);
            }
        } catch (error) {
            toast.error("Erreur de connexion.");
            setReplyText(contentText);
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

    // Parse rich message content
    const parseContent = (content: string) => {
        if (!content) return { type: 'plain', text: '' };
        const trimmed = content.trim();
        if (!trimmed.startsWith('{')) return { type: 'plain', text: content };
        try {
            const parsed = JSON.parse(trimmed);
            if (parsed.type === 'rich') return parsed;
        } catch {}
        return { type: 'plain', text: content };
    };

    // Get display text for sidebar last message
    const getLastMessageText = (content: string) => {
        const parsed = parseContent(content);
        if (parsed.type === 'rich') {
            if (parsed.attachment) return '📎 Fichier joint';
            return parsed.text || '';
        }
        return content;
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
                                const unread = conv.unreadCount || 0;
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
                                        <div className="relative h-10 w-10 flex-shrink-0">
                                            <div className="h-10 w-10 bg-slate-100 dark:bg-slate-800 rounded-xl text-slate-700 dark:text-slate-300 font-bold text-sm flex items-center justify-center shadow-sm">
                                                {getInitials(conv.customer)}
                                            </div>
                                            {unread > 0 && !isActive && (
                                                <span className="absolute -top-1 -right-1 h-4 min-w-[16px] px-1 bg-primary text-white text-[9px] font-black rounded-full flex items-center justify-center">
                                                    {unread > 99 ? '99+' : unread}
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex justify-between items-center">
                                                <p className={`font-bold text-xs truncate ${unread > 0 && !isActive ? 'text-slate-900 dark:text-white' : 'text-slate-900 dark:text-white'}`}>
                                                    {conv.customer.firstName ? `${conv.customer.firstName} ${conv.customer.lastName}` : "Client Anonyme"}
                                                </p>
                                                <span className="text-[9px] font-semibold text-slate-400 shrink-0 ml-1">
                                                    {formatTime(conv.lastMessage.createdAt)}
                                                </span>
                                            </div>
                                            <p className={`text-[11px] truncate mt-1 ${
                                                unread > 0 && !isActive
                                                    ? 'text-slate-800 dark:text-slate-200 font-bold'
                                                    : isActive ? 'text-slate-700 dark:text-slate-300 font-medium' : 'text-slate-500 dark:text-slate-400'
                                            }`}>
                                                {conv.lastMessage.sender === 'VENDOR' ? 'Vous: ' : ''}
                                                {getLastMessageText(conv.lastMessage.content)}
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
                                <div className="flex items-center gap-2 shrink-0">
                                    <span className={`h-1.5 w-1.5 rounded-full ${onlineStatus === 'En ligne' ? 'bg-green-500' : 'bg-slate-300'}`}></span>
                                    <span className="text-[10px] text-slate-400 font-semibold">{onlineStatus}</span>
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
                                        {/* Security Notice Banner */}
                                        <div className="p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/30 rounded-xl flex items-start gap-2.5 text-amber-800 dark:text-amber-300 text-xs font-medium mb-4">
                                            <Info className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                                            <div>
                                                <span className="font-bold">🔒 Sécurité — Ahizan Marketplace</span>
                                                <br />
                                                Ne partagez jamais de mot de passe, code, données bancaires, numéro de carte, téléphone ou e-mail dans cette discussion.
                                            </div>
                                        </div>
                                        {messages.map((msg) => {
                                             const isMe = msg.sender === 'VENDOR';
                                             const isEditing = editingId === msg.id;
                                             const parsed = parseContent(msg.content);
                                             const displayText = parsed.type === 'rich' ? (parsed.text || '') : msg.content;
                                             
                                             const lastVendorMsg = [...messages].reverse().find(m => m.sender === 'VENDOR');
                                             const isLatestVendorMsg = lastVendorMsg?.id === msg.id;

                                             return (
                                                 <div 
                                                     key={msg.id} 
                                                     className={`flex ${isMe ? 'justify-end' : 'justify-start'} group`}
                                                 >
                                                     <div className="flex flex-col max-w-[75%] sm:max-w-[70%] animate-in fade-in duration-200">
                                                         {msg.sender === 'SUPERADMIN' && (
                                                             <span className="text-[10px] text-amber-600 dark:text-amber-450 font-extrabold mb-1 ml-1 uppercase tracking-wide flex items-center gap-1 select-none">
                                                                 <Info className="h-3 w-3" /> Message de l'administrateur
                                                             </span>
                                                         )}
                                                         
                                                         <div className={`rounded-2xl px-4 py-3 text-xs font-medium shadow-sm leading-relaxed ${
                                                             isMe 
                                                             ? 'bg-primary text-white rounded-tr-none' 
                                                             : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-100 dark:border-slate-750 rounded-tl-none'
                                                         }`}>
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
                                                                         className="px-2.5 py-1.5 border border-white/20 bg-white/10 text-white rounded-lg focus:outline-none text-xs w-full"
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
                                                                             className="text-[10px] bg-white text-primary font-bold px-2 py-0.5 rounded"
                                                                         >
                                                                             Enregistrer
                                                                         </button>
                                                                     </div>
                                                                 </div>
                                                             ) : (
                                                                 <div>
                                                                     {/* Quote preview */}
                                                                     {parsed.type === 'rich' && parsed.replyTo && (
                                                                         <div className={`mb-2 px-2 py-1.5 rounded-lg border-l-2 text-[10px] leading-snug ${
                                                                             isMe ? 'bg-white/10 border-white/40 text-white/80' : 'bg-slate-100 dark:bg-slate-700 border-slate-400 text-slate-500 dark:text-slate-400'
                                                                         }`}>
                                                                             <p className="font-bold mb-0.5">
                                                                                 {parsed.replyTo.sender === 'VENDOR' ? 'Vous' : parsed.replyTo.sender === 'SUPERADMIN' ? 'Admin' : 'Client'}
                                                                             </p>
                                                                             <p className="line-clamp-2 break-words">
                                                                                 {(() => {
                                                                                     const rp = parseContent(parsed.replyTo.content || '');
                                                                                     return rp.type === 'rich' ? (rp.text || '📎 Fichier') : (parsed.replyTo.content || '');
                                                                                 })()}
                                                                             </p>
                                                                         </div>
                                                                     )}
                                                                     {/* Attachment */}
                                                                     {parsed.type === 'rich' && parsed.attachment && (
                                                                         <div className="mb-2">
                                                                             {parsed.attachment.mimeType?.startsWith('image/') ? (
                                                                                 <img
                                                                                     src={parsed.attachment.url}
                                                                                     alt={parsed.attachment.name}
                                                                                     className="max-w-[200px] rounded-lg mb-1 cursor-pointer"
                                                                                     onClick={() => window.open(parsed.attachment.url, '_blank')}
                                                                                 />
                                                                             ) : (
                                                                                 <a
                                                                                     href={parsed.attachment.url}
                                                                                     target="_blank"
                                                                                     rel="noopener noreferrer"
                                                                                     className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10px] font-semibold ${
                                                                                         isMe ? 'bg-white/20 hover:bg-white/30 text-white' : 'bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-slate-700 dark:text-slate-200'
                                                                                     }`}
                                                                                 >
                                                                                     <Paperclip className="h-3 w-3 shrink-0" />
                                                                                     <span className="truncate max-w-[150px]">{parsed.attachment.name}</span>
                                                                                 </a>
                                                                             )}
                                                                         </div>
                                                                     )}
                                                                     {/* Text */}
                                                                     {displayText && <p className="whitespace-pre-wrap break-words">{displayText}</p>}
                                                                 </div>
                                                             )}
                                                             <div className={`text-[9px] mt-1.5 text-right font-semibold ${
                                                                 isMe ? 'text-white/70' : 'text-slate-400'
                                                             } flex items-center justify-end gap-1`}>
                                                                 {msg.modified && !msg.deleted && <span className="opacity-80 italic">(modifié)</span>}
                                                                 <span>
                                                                     {new Date(msg.createdAt).toLocaleTimeString('fr-FR', {
                                                                         hour: '2-digit',
                                                                         minute: '2-digit'
                                                                     })}
                                                                 </span>
                                                                 {/* Seen checkmark for latest vendor message */}
                                                                 {isMe && isLatestVendorMsg && !msg.deleted && (
                                                                     <span className={`ml-0.5 font-bold ${msg.seen ? 'text-blue-300' : 'text-white/60'}`}>
                                                                         {msg.seen ? '✓✓' : '✓'}
                                                                     </span>
                                                                 )}
                                                             </div>
                                                         </div>

                                                         {/* Actions below message bubble */}
                                                         {!msg.deleted && (
                                                             <div className={`flex gap-3 mt-1 px-1 text-[10px] text-slate-400 dark:text-slate-500 font-semibold select-none ${isMe ? 'justify-end' : 'justify-start'}`}>
                                                                 <button
                                                                     type="button"
                                                                     onClick={() => handleReplyTo(msg)}
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
                                                                                 setEditValue(displayText);
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

                            {/* Reply-to preview bar */}
                            {replyToMsg && (
                                <div className="px-4 py-2 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center gap-3">
                                    <div className="flex-1 border-l-2 border-primary pl-2.5 text-xs text-slate-500 dark:text-slate-400">
                                        <p className="font-bold text-primary text-[10px] mb-0.5">
                                            {replyToMsg.sender === 'VENDOR' ? 'Vous' : replyToMsg.sender === 'SUPERADMIN' ? 'Admin' : 'Client'}
                                        </p>
                                        <p className="truncate">
                                            {(() => {
                                                const rp = parseContent(replyToMsg.content);
                                                return rp.type === 'rich' ? (rp.text || '📎 Fichier') : replyToMsg.content;
                                            })()}
                                        </p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setReplyToMsg(null)}
                                        className="text-slate-400 hover:text-slate-600 p-1 rounded"
                                    >
                                        <X className="h-3.5 w-3.5" />
                                    </button>
                                </div>
                            )}

                            {/* Uploaded file preview */}
                            {uploadedFile && (
                                <div className="px-4 py-2 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center gap-3">
                                    <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-800 rounded-lg px-3 py-1.5 border border-slate-200 dark:border-slate-700 flex-1">
                                        {uploadedFile.type.startsWith('image/') ? (
                                            <Image className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                                        ) : (
                                            <Paperclip className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                                        )}
                                        <span className="truncate font-medium">{uploadedFile.name}</span>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setUploadedFile(null)}
                                        className="text-slate-400 hover:text-slate-600 p-1 rounded"
                                    >
                                        <X className="h-3.5 w-3.5" />
                                    </button>
                                </div>
                            )}

                            {/* Chat Input Footer */}
                            <form 
                                onSubmit={handleSendReply}
                                className="p-4 bg-white dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex gap-2 items-center"
                            >
                                {/* File upload button */}
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    className="hidden"
                                    onChange={handleFileUpload}
                                    accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
                                />
                                <button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={isUploading || isHistoryLoading}
                                    className="h-10 w-10 flex items-center justify-center rounded-xl border border-slate-200 dark:border-slate-800 text-slate-400 hover:text-slate-600 hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors shrink-0"
                                    title="Joindre un fichier"
                                >
                                    {isUploading ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                        <Paperclip className="h-4 w-4" />
                                    )}
                                </button>
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
                                    disabled={(!replyText.trim() && !uploadedFile) || isSending || isHistoryLoading}
                                    className="h-10 px-4 bg-primary hover:bg-red-700 text-white font-bold rounded-xl text-xs flex gap-2 items-center shadow-md shadow-primary/20 transition-all shrink-0"
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
