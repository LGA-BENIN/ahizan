"use client";

import React, { useEffect } from 'react';
import { Heart, X, Sparkles, UserPlus, LogIn } from 'lucide-react';
import Link from 'next/link';

interface LoginPromptModalProps {
    isOpen: boolean;
    onClose: () => void;
    title?: string;
    description?: string;
}

export function LoginPromptModal({
    isOpen,
    onClose,
    title = "Rejoignez Ahizan",
    description = "Créez un compte gratuitement pour enregistrer vos boutiques et produits favoris en un clic, et profitez d'offres exclusives et de codes promos de vos vendeurs préférés."
}: LoginPromptModalProps) {
    
    // Lock scroll when open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop blur overlay */}
            <div 
                className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" 
                onClick={onClose}
            />

            {/* Modal Box */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/50 dark:border-slate-700 max-w-sm w-full p-6 shadow-2xl relative z-10 transform transition-all animate-in fade-in zoom-in-95 duration-200">
                
                {/* Close Button */}
                <button 
                    onClick={onClose}
                    className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
                >
                    <X className="h-4.5 w-4.5" />
                </button>

                {/* Content */}
                <div className="text-center space-y-4 pt-2">
                    {/* Animated Floating Heart/Sparkle Icon */}
                    <div className="mx-auto h-16 w-16 bg-red-50 dark:bg-red-900/20 rounded-full flex items-center justify-center relative">
                        <Heart className="h-8 w-8 text-primary fill-primary/10 animate-pulse" />
                        <Sparkles className="h-4.5 w-4.5 text-yellow-500 absolute -top-1 -right-1" />
                    </div>

                    <div className="space-y-2">
                        <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight leading-tight">
                            {title}
                        </h3>
                        <p className="text-slate-500 dark:text-slate-400 text-xs leading-relaxed font-medium">
                            {description}
                        </p>
                    </div>

                    {/* Action buttons */}
                    <div className="pt-4 flex flex-col gap-3">
                        <Link 
                            href="/register"
                            onClick={onClose}
                            className="flex items-center justify-center gap-2 w-full py-2.5 bg-primary hover:bg-red-700 text-white font-bold rounded-xl text-xs shadow-md shadow-primary/20 transition-all hover:-translate-y-0.5"
                        >
                            <UserPlus className="h-4 w-4" />
                            Créer un compte
                        </Link>
                        <Link 
                            href="/sign-in"
                            onClick={onClose}
                            className="flex items-center justify-center gap-2 w-full py-2.5 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-bold rounded-xl text-xs transition-all shadow-sm"
                        >
                            <LogIn className="h-4 w-4 text-slate-400" />
                            Se connecter
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
