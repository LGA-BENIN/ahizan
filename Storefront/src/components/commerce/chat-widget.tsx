"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Send, X, MessageSquare, Loader2, Store } from 'lucide-react';
import { getChatHistoryAction, sendChatMessageAction } from '@/app/(storefront)/likes-actions';
import { toast } from 'sonner';

interface ChatMessage {
    id: string;
    createdAt: string;
    sender: 'CUSTOMER' | 'VENDOR';
    content: string;
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
            
            // Set up polling every 4 seconds
            pollingIntervalRef.current = setInterval(() => {
                loadChatHistory(false);
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

    // Scroll to bottom when messages list updates
    useEffect(() => {
        if (messages.length > 0) {
            scrollToBottom();
        }
    }, [messages]);

    // Handle message send
    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!inputValue.trim() || isSending) return;

        const messageContent = inputValue.trim();
        setInputValue('');
        setIsSending(true);

        try {
            const result = await sendChatMessageAction(vendorId, messageContent);
            if (result.success && result.message) {
                // Add message directly to list for instant feedback
                setMessages(prev => [...prev, result.message as ChatMessage]);
            } else if (result.authenticated === false) {
                onClose();
                onUnauthorized();
            } else {
                toast.error(result.error || "Impossible d'envoyer le message.");
                setInputValue(messageContent); // Restore input value in case of error
            }
        } catch (error) {
            toast.error("Erreur de connexion.");
            setInputValue(messageContent);
        } finally {
            setIsSending(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed bottom-0 right-0 sm:right-6 z-50 w-full sm:w-[400px] h-[500px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-t-2xl shadow-2xl flex flex-col transform animate-in slide-in-from-bottom duration-300">
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
                            <span className="h-1.5 w-1.5 bg-green-500 rounded-full"></span>
                            <span className="text-[10px] text-slate-400 font-semibold">Boutique en ligne</span>
                        </div>
                    </div>
                </div>
                <button 
                    onClick={onClose}
                    className="p-1.5 rounded-lg text-slate-400 hover:bg-white/10 hover:text-white transition-colors"
                >
                    <X className="h-4.5 w-4.5" />
                </button>
            </div>

            {/* Chat Body (Messages list) */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-slate-50/60 dark:bg-slate-900/40">
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
                            return (
                                <div 
                                    key={msg.id} 
                                    className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
                                >
                                    <div className={`max-w-[75%] rounded-2xl px-3.5 py-2.5 text-xs font-medium shadow-sm leading-relaxed ${
                                        isMe 
                                        ? 'bg-primary text-white rounded-tr-none' 
                                        : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-100 dark:border-slate-750 rounded-tl-none'
                                    }`}>
                                        <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                                        <div className={`text-[9px] mt-1.5 text-right font-semibold ${
                                            isMe ? 'text-white/70' : 'text-slate-400'
                                        }`}>
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

            {/* Chat Footer (Input) */}
            <form 
                onSubmit={handleSend}
                className="p-3 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-955 flex gap-2 items-center"
            >
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
                    disabled={!inputValue.trim() || isSending || isLoading}
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
