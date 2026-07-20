'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Cookie, X } from 'lucide-react';

interface CookieConsentProps {
    config?: {
        enabled: boolean;
        message: string;
        linkText: string;
        linkUrl: string;
        acceptButtonText: string;
        declineButtonText: string;
    };
}

export function CookieConsent({ config }: CookieConsentProps) {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        if (config?.enabled === false) return;

        const consent = localStorage.getItem('ahizan_cookie_consent');
        if (!consent) {
            // Show after a short delay
            const timer = setTimeout(() => setIsVisible(true), 1500);
            return () => clearTimeout(timer);
        }
    }, [config]);

    const handleAccept = () => {
        localStorage.setItem('ahizan_cookie_consent', 'accepted');
        setIsVisible(false);
    };

    const handleDecline = () => {
        localStorage.setItem('ahizan_cookie_consent', 'declined');
        setIsVisible(false);
    };

    if (!isVisible) return null;

    const message = config?.message || "Nous utilisons des cookies pour améliorer votre expérience sur notre boutique.";
    const linkText = config?.linkText || "En savoir plus";
    const linkUrl = config?.linkUrl || "/privacy-policy";
    const acceptText = config?.acceptButtonText || "Tout accepter";
    const declineText = config?.declineButtonText || "Rejeter";

    return (
        <div className="fixed bottom-4 left-4 right-4 z-[100] md:left-auto md:right-6 md:bottom-6 md:max-w-md animate-in slide-in-from-bottom-10 duration-500 ease-out">
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-border p-5 md:p-6 backdrop-blur-lg bg-opacity-95 dark:bg-opacity-95">
                <div className="flex items-start gap-4">
                    <div className="bg-primary/10 p-2.5 rounded-xl text-primary hidden sm:block">
                        <Cookie className="w-6 h-6" />
                    </div>
                    <div className="flex-1">
                        <div className="flex justify-between items-start mb-2">
                            <h3 className="font-bold text-lg flex items-center gap-2">
                                <Cookie className="w-5 h-5 text-primary sm:hidden" />
                                Gestion des cookies
                            </h3>
                            <button 
                                onClick={() => setIsVisible(false)}
                                className="text-muted-foreground hover:text-foreground transition-colors p-1"
                                aria-label="Fermer"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                            {message}{' '}
                            {linkText && (
                                <Link href={linkUrl} className="text-primary font-semibold hover:underline">
                                    {linkText}
                                </Link>
                            )}
                        </p>
                        <div className="flex flex-col sm:flex-row gap-2">
                            <Button 
                                onClick={handleAccept}
                                className="flex-1 rounded-full font-bold shadow-md hover:shadow-lg transition-all"
                            >
                                {acceptText}
                            </Button>
                            <Button 
                                onClick={handleDecline}
                                variant="outline"
                                className="flex-1 rounded-full font-semibold border-border hover:bg-muted transition-all"
                            >
                                {declineText}
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
