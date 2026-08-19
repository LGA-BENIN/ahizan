"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Send, X, MessageSquare, Loader2, Store, Maximize2, Minimize2, Info, Pencil, Trash2, Paperclip, Image, CornerUpLeft } from 'lucide-react';
import { getChatHistoryAction, sendChatMessageAction, deleteChatMessageAction, modifyChatMessageAction, setTypingAction, isTypingAction, userOnlineStatusAction } from '@/app/(storefront)/likes-actions';
import { toast } from 'sonner';

interface ChatMessage {
    id: string;
    createdAt: string;
    sender: 'CUSTOMER' | 'VENDOR' | 'SUPERADMIN';
    content: string;
    deleted?: boolean;
    modified?: boolean;
    seen?: boolean;
}

interface ChatWidgetProps {
    vendorId: string;
    vendorName: string;
    isOpen: boolean;
    onClose: () => void;
    onUnauthorized: () => void;
}

export function ChatWidget({
    vendorId,
    vendorName,
    isOpen,
    onClose,
    onUnauthorized
}: ChatWidgetProps) {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [inputValue, setInputValue] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isSending, setIsSending] = useState(false);
    const [isMaximized, setIsMaximized] = useState(false);
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

    // Scroll to bottom helper
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    // Load message history
    const loadChatHistory = async (showLoader = false) => {
        if (showLoader) setIsLoading(true);
        try {
            const result = await getChatHistoryAction(vendorId);
            if (result.success) {
                setMessages(result.history as ChatMessage[]);
            } else if (result.authenticated === false) {
                onClose();
                onUnauthorized();
            }
        } catch (error) {
            console.error('Erreur lors du chargement des messages:', error);
        } finally {
            if (showLoader) setIsLoading(false);
        }
    };

    // Load initial history and set up polling
    useEffect(() => {
        if (isOpen) {
            loadChatHistory(true);
            setReplyToMsg(null);
            setUploadedFile(null);

            // Fetch online status immediately
            const fetchOnline = async () => {
                const onlineRes = await userOnlineStatusAction(vendorId, 'VENDOR');
                if (onlineRes.success) setOnlineStatus(onlineRes.status || 'Hors ligne');
            };
            fetchOnline();
            
            // Set up polling every 4 seconds for history, typing status, and online status
            pollingIntervalRef.current = setInterval(async () => {
                loadChatHistory(false);
                const typingRes = await isTypingAction(vendorId, 'VENDOR');
                if (typingRes.success) {
                    setIsOtherPartyTyping(typingRes.isTyping || false);
                }
                const onlineRes = await userOnlineStatusAction(vendorId, 'VENDOR');
                if (onlineRes.success) setOnlineStatus(onlineRes.status || 'Hors ligne');
            }, 4000);
        } else {
            // Clear polling when closed
            if (pollingIntervalRef.current) {
                clearInterval(pollingIntervalRef.current);
            }
        }

        return () => {
            if (pollingIntervalRef.current) {
                clearInterval(pollingIntervalRef.current);
            }
        };
    }, [isOpen, vendorId]);

    useEffect(() => {
        if (!isOpen) return;
        const targetId = vendorId;
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
    }, [inputValue, vendorId, isOpen]);

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

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setIsUploading(true);
        try {
            const formData = new FormData();
            formData.append('file', file);
            const shopApiUrl = process.env.NEXT_PUBLIC_VENDURE_SHOP_API_URL || '';
            const uploadUrl = shopApiUrl.replace('/shop-api', '/banner/upload');
            const response = await fetch(uploadUrl, { method: 'POST', body: formData });
            if (!response.ok) throw new Error('Upload failed');
            const data = await response.json();
            setUploadedFile({ url: data.url, name: file.name, type: file.type });
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
                if (parsed.type === 'rich') { parsed.text = newContent; contentPayload = JSON.stringify(parsed); }
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

    // Scroll to bottom when messages list updates
    useEffect(() => {
        if (messages.length > 0) {
            scrollToBottom();
        }
    }, [messages]);

    // Handle message send
    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        const contentText = inputValue.trim();
        if (!contentText && !uploadedFile || isSending) return;

        setInputValue('');
        setIsSending(true);

        let messageContent = contentText;
        if (uploadedFile || replyToMsg) {
            messageContent = JSON.stringify({
                type: 'rich',
                text: contentText,
                replyTo: replyToMsg ? { id: replyToMsg.id, sender: replyToMsg.sender, content: replyToMsg.content } : null,
                attachment: uploadedFile ? { url: uploadedFile.url, name: uploadedFile.name, mimeType: uploadedFile.type } : null
            });
        }
        setUploadedFile(null);
        setReplyToMsg(null);

        try {
            const result = await sendChatMessageAction(vendorId, messageContent);
            if (result.success && result.message) {
                setMessages(prev => [...prev, result.message as ChatMessage]);
            } else if (result.authenticated === false) {
                onClose();
                onUnauthorized();
            } else {
                toast.error(result.error || "Impossible d'envoyer le message.");
                setInputValue(contentText);
            }
        } catch (error) {
            toast.error("Erreur de connexion.");
            setInputValue(contentText);
        } finally {
            setIsSending(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className={`fixed z-[200] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 shadow-2xl flex flex-col transform animate-in slide-in-from-bottom duration-300
            ${isMaximized 
                ? 'fixed inset-0 sm:inset-auto sm:bottom-0 sm:right-6 sm:w-[600px] sm:h-[600px] rounded-none sm:rounded-t-2xl' 
                : 'fixed bottom-[calc(76px+env(safe-area-inset-bottom))] sm:bottom-0 right-0 sm:right-6 w-full sm:w-[400px] h-[450px] sm:h-[500px] rounded-t-2xl'
            }`}
        >
            {/* Chat Header */}
            <div className="bg-slate-900 dark:bg-slate-950 text-white px-4 py-3 rounded-t-2xl flex items-center justify-between shadow-md">
                <div className="flex items-center gap-2.5 min-w-0">
                    <div className="h-9 w-9 bg-white/10 rounded-xl flex items-center justify-center flex-shrink-0">
                        <Store className="h-4.5 w-4.5 text-primary" />
                    </div>
                    <div className="min-w-0">
                        <h3 className="font-black text-sm uppercase tracking-tight truncate pr-2">
                            {vendorName}
                        </h3>
                        <div className="flex items-center gap-1">
                            <span className={`h-1.5 w-1.5 rounded-full ${onlineStatus === 'En ligne' ? 'bg-green-500' : 'bg-slate-500'}`}></span>
                            <span className="text-[10px] text-slate-400 font-semibold">{onlineStatus}</span>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-1">
                    <button 
                        type="button"
                        onClick={() => setIsMaximized(!isMaximized)}
                        className="p-1.5 rounded-lg text-slate-400 hover:bg-white/10 hover:text-white transition-colors"
                        title={isMaximized ? "Réduire" : "Agrandir"}
                    >
                        {isMaximized ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                    </button>
                    <button 
                        type="button"
                        onClick={onClose}
                        className="p-1.5 rounded-lg text-slate-400 hover:bg-white/10 hover:text-white transition-colors"
                    >
                        <X className="h-4.5 w-4.5" />
                    </button>
                </div>
            </div>

            {/* Chat Body (Messages list) */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-slate-50/60 dark:bg-slate-900/40">
                {/* Security Notice Banner */}
                <div className="p-2.5 bg-amber-50 dark:bg-amber-955/20 border border-amber-100 dark:border-amber-900/30 rounded-xl flex items-start gap-2 text-amber-800 dark:text-amber-300 text-[10px] font-semibold mb-2">
                    <Info className="h-3.5 w-3.5 text-amber-500 shrink-0 mt-0.5" />
                    <div>
                        <span className="font-bold">🔒 Sécurité — Ahizan Marketplace</span><br />
                        Ne partagez jamais de mot de passe, code, données bancaires, numéro de carte, téléphone ou e-mail dans cette discussion.
                    </div>
                </div>

                {isLoading ? (
                    <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-2">
                        <Loader2 className="h-7 w-7 animate-spin text-primary" />
                        <span className="text-xs font-semibold">Chargement de la discussion...</span>
                    </div>
                ) : messages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400 gap-3">
                        <div className="h-12 w-12 rounded-full bg-slate-100 dark:bg-slate-800/60 flex items-center justify-center">
                            <MessageSquare className="h-5.5 w-5.5 text-slate-400" />
                        </div>
                        <div>
                            <h4 className="font-bold text-sm text-slate-700 dark:text-slate-300">Lancez la discussion</h4>
                            <p className="text-xs max-w-[220px] mx-auto mt-1 leading-relaxed">
                                Posez une question au vendeur ou demandez des détails sur les produits.
                            </p>
                        </div>
                    </div>
                ) : (
                    <>
                        {messages.map((msg) => {
                            const isMe = msg.sender === 'CUSTOMER';
                            const isEditing = editingId === msg.id;
                            const parsed = parseContent(msg.content);
                            const displayText = parsed.type === 'rich' ? (parsed.text || '') : msg.content;
                            
                            // Check if latest customer message
                            const lastCustomerMsg = [...messages].reverse().find(m => m.sender === 'CUSTOMER');
                            const isLatestCustomerMsg = lastCustomerMsg?.id === msg.id;

                            return (
                                <div 
                                    key={msg.id} 
                                    className={`flex ${isMe ? 'justify-end' : 'justify-start'} group`}
                                >
                                    <div className="flex flex-col max-w-[80%] sm:max-w-[75%] animate-in fade-in duration-200">
                                        {msg.sender === 'SUPERADMIN' && (
                                            <span className="text-[9px] text-amber-600 dark:text-amber-450 font-extrabold mb-1 ml-1 uppercase tracking-wide flex items-center gap-1 select-none">
                                                <Info className="h-3 w-3" /> Message de l'administrateur
                                            </span>
                                        )}
                                        <div className={`rounded-2xl px-3.5 py-2.5 text-xs font-medium shadow-sm leading-relaxed ${
                                            isMe 
                                            ? 'bg-primary text-white rounded-tr-none' 
                                            : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-100 dark:border-slate-750 rounded-tl-none'
                                        }`}>
                                            {msg.deleted ? (
                                                <span className="italic text-slate-400 dark:text-slate-500 flex items-center gap-1">
                                                    🚫 Ce message a été supprimé
                                                </span>
                                            ) : isEditing ? (
                                                <div className="flex flex-col gap-1 w-[180px]">
                                                    <input
                                                        type="text"
                                                        value={editValue}
                                                        onChange={(e) => setEditValue(e.target.value)}
                                                        className="px-2 py-1 border border-white/20 bg-white/10 text-white rounded-lg focus:outline-none text-xs w-full"
                                                        autoFocus
                                                    />
                                                    <div className="flex gap-2 justify-end">
                                                        <button type="button" onClick={() => setEditingId(null)} className="text-[9px] text-white/80 hover:text-white font-bold">Annuler</button>
                                                        <button type="button" onClick={() => handleEditMessage(msg.id, editValue)} className="text-[9px] bg-white text-primary font-bold px-1.5 py-0.5 rounded">Sauver</button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div>
                                                    {/* Quote preview */}
                                                    {parsed.type === 'rich' && parsed.replyTo && (
                                                        <div className={`mb-1.5 px-2 py-1 rounded-lg border-l-2 text-[9px] leading-snug ${
                                                            isMe ? 'bg-white/10 border-white/40 text-white/80' : 'bg-slate-100 dark:bg-slate-700 border-slate-400 text-slate-500 dark:text-slate-400'
                                                        }`}>
                                                            <p className="font-bold mb-0.5">{parsed.replyTo.sender === 'CUSTOMER' ? 'Vous' : parsed.replyTo.sender === 'SUPERADMIN' ? 'Admin' : 'Vendeur'}</p>
                                                            <p className="line-clamp-1 break-words">{(() => { const rp = parseContent(parsed.replyTo.content || ''); return rp.type === 'rich' ? (rp.text || '📎 Fichier') : (parsed.replyTo.content || ''); })()}</p>
                                                        </div>
                                                    )}
                                                    {/* Attachment */}
                                                    {parsed.type === 'rich' && parsed.attachment && (
                                                        <div className="mb-1.5">
                                                            {parsed.attachment.mimeType?.startsWith('image/') ? (
                                                                <img src={parsed.attachment.url} alt={parsed.attachment.name} className="max-w-[160px] rounded-lg mb-1 cursor-pointer" onClick={() => window.open(parsed.attachment.url, '_blank')} />
                                                            ) : (
                                                                <a href={parsed.attachment.url} target="_blank" rel="noopener noreferrer" className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[9px] font-semibold ${ isMe ? 'bg-white/20 hover:bg-white/30 text-white' : 'bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-slate-700 dark:text-slate-200' }`}>
                                                                    <Paperclip className="h-2.5 w-2.5 shrink-0" />
                                                                    <span className="truncate max-w-[120px]">{parsed.attachment.name}</span>
                                                                </a>
                                                            )}
                                                        </div>
                                                    )}
                                                    {displayText && <p className="whitespace-pre-wrap break-words">{displayText}</p>}
                                                </div>
                                            )}
                                            <div className={`text-[9px] mt-1 text-right font-semibold ${
                                                isMe ? 'text-white/70' : 'text-slate-400'
                                            } flex items-center justify-end gap-0.5`}>
                                                {msg.modified && !msg.deleted && <span className="opacity-80 italic">(modifié)</span>}
                                                <span>{new Date(msg.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</span>
                                                {isMe && isLatestCustomerMsg && !msg.deleted && (
                                                    <span className={`font-bold ${msg.seen ? 'text-blue-300' : 'text-white/60'}`}>{msg.seen ? '✓✓' : '✓'}</span>
                                                )}
                                            </div>
                                        </div>

                                        {/* Actions below bubble */}
                                        {!msg.deleted && (
                                            <div className={`flex gap-3.5 mt-1.5 px-1 text-[9px] text-slate-400 dark:text-slate-500 font-semibold select-none ${isMe ? 'justify-end' : 'justify-start'}`}>
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
                                                            onClick={() => { setEditingId(msg.id); setEditValue(displayText); }}
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
                            <div className="flex justify-start items-center gap-1.5 px-2">
                                <div className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-750 rounded-2xl rounded-tl-none px-3 py-2 flex items-center gap-1 shadow-sm">
                                    <span className="h-1 w-1 bg-slate-400 rounded-full animate-bounce" style={{animationDelay: '0ms'}}></span>
                                    <span className="h-1 w-1 bg-slate-400 rounded-full animate-bounce" style={{animationDelay: '150ms'}}></span>
                                    <span className="h-1 w-1 bg-slate-400 rounded-full animate-bounce" style={{animationDelay: '300ms'}}></span>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </>
                )}
            </div>

            {/* Reply-to bar */}
            {replyToMsg && (
                <div className="px-3 py-1.5 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center gap-2">
                    <div className="flex-1 border-l-2 border-primary pl-2 text-[10px] text-slate-500 dark:text-slate-400">
                        <p className="font-bold text-primary mb-0.5">{replyToMsg.sender === 'CUSTOMER' ? 'Vous' : replyToMsg.sender === 'SUPERADMIN' ? 'Admin' : 'Vendeur'}</p>
                        <p className="truncate">{(() => { const rp = parseContent(replyToMsg.content); return rp.type === 'rich' ? (rp.text || '📎 Fichier') : replyToMsg.content; })()}</p>
                    </div>
                    <button type="button" onClick={() => setReplyToMsg(null)} className="text-slate-400 hover:text-slate-600 p-0.5">
                        <X className="h-3 w-3" />
                    </button>
                </div>
            )}
            {/* Uploaded file preview */}
            {uploadedFile && (
                <div className="px-3 py-1.5 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center gap-2">
                    <div className="flex items-center gap-1.5 text-[10px] text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-800 rounded-lg px-2 py-1 border border-slate-200 dark:border-slate-700 flex-1">
                        {uploadedFile.type.startsWith('image/') ? <Image className="h-3 w-3 text-blue-500 shrink-0" /> : <Paperclip className="h-3 w-3 text-slate-400 shrink-0" />}
                        <span className="truncate font-medium">{uploadedFile.name}</span>
                    </div>
                    <button type="button" onClick={() => setUploadedFile(null)} className="text-slate-400 hover:text-slate-600 p-0.5">
                        <X className="h-3 w-3" />
                    </button>
                </div>
            )}
            {/* Chat Footer (Input) */}
            <form 
                onSubmit={handleSend}
                className="p-3 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-955 flex gap-2 items-center"
            >
                <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileUpload} accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt" />
                <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading || isLoading}
                    className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-400 hover:text-slate-600 hover:bg-slate-50 dark:hover:bg-slate-900 flex-shrink-0"
                    title="Joindre un fichier"
                >
                    {isUploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Paperclip className="h-3.5 w-3.5" />}
                </button>
                <input
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    placeholder="Écrire un message..."
                    disabled={isLoading}
                    className="flex-1 px-3.5 py-2 border border-slate-200 dark:border-slate-800 dark:bg-slate-900 rounded-xl text-xs font-medium focus:outline-none focus:border-primary dark:focus:border-primary transition-colors text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-slate-500"
                />
                <button
                    type="submit"
                    disabled={(!inputValue.trim() && !uploadedFile) || isSending || isLoading}
                    className="p-2 bg-primary hover:bg-red-700 text-white rounded-xl disabled:bg-slate-100 dark:disabled:bg-slate-800 disabled:text-slate-400 transition-all shadow-md shadow-primary/15 flex-shrink-0"
                >
                    {isSending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                        <Send className="h-4 w-4" />
                    )}
                </button>
            </form>
        </div>
    );
}
