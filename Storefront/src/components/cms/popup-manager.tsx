'use client';

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { getAssetUrl } from '@/lib/vendure/api-utils';

export interface ModalConfig {
    enabled: boolean;
    type: 'image' | 'text';
    value: string;
    link?: string;
    delay?: number;
    duration?: number;
    isClosable?: boolean;
}

export function PopupManager({ popups }: { popups: ModalConfig[] }) {
    const [activePopup, setActivePopup] = useState<ModalConfig | null>(null);
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        if (!popups || popups.length === 0) return;

        // On vérifie dans le localStorage si on a déjà vu ces popups récemment (session en cours)
        const hasSeenPopup = sessionStorage.getItem('vendure_cms_popup_seen');

        if (!hasSeenPopup) {
            // Utiliser le premier popup actif
            const firstPopup = popups[0];
            const delay = (firstPopup.delay || 3) * 1000;

            // Afficher le premier popup actif après le délai configuré
            const timer = setTimeout(() => {
                setActivePopup(firstPopup);
                setIsOpen(true);
            }, delay);

            return () => clearTimeout(timer);
        }
    }, [popups]);

    const handleClose = () => {
        setIsOpen(false);
        sessionStorage.setItem('vendure_cms_popup_seen', 'true');
    };

    if (!activePopup) return null;

    const isClosable = activePopup.isClosable !== false;

    return (
        <Dialog open={isOpen} onOpenChange={(open) => {
            if (!open && isClosable) handleClose();
        }}>
            <DialogContent className="sm:max-w-md p-0 overflow-hidden border-none bg-transparent shadow-none">
                {activePopup.type === 'image' ? (
                    <div className="relative group">
                        {activePopup.link ? (
                            <Link href={activePopup.link} onClick={handleClose}>
                                <img 
                                    src={getAssetUrl(activePopup.value)} 
                                    className="w-full h-auto rounded-lg shadow-2xl transition-transform duration-300 group-hover:scale-[1.01]" 
                                    alt="Promotion" 
                                />
                            </Link>
                        ) : (
                            <img 
                                src={getAssetUrl(activePopup.value)} 
                                className="w-full h-auto rounded-lg shadow-2xl" 
                                alt="Promotion" 
                            />
                        )}
                        
                        {isClosable && (
                            <button 
                                onClick={handleClose}
                                className="absolute top-2 right-2 bg-black/50 hover:bg-black/70 text-white rounded-full w-8 h-8 flex items-center justify-center transition-colors"
                                aria-label="Fermer"
                            >
                                ✕
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="bg-white rounded-lg p-6 shadow-2xl">
                        <DialogHeader>
                            <DialogTitle>Information</DialogTitle>
                            <DialogDescription className="pt-4 text-base whitespace-pre-wrap">
                                {activePopup.value}
                            </DialogDescription>
                        </DialogHeader>

                        {activePopup.link && (
                            <DialogFooter className="mt-4">
                                <Button asChild onClick={handleClose}>
                                    <Link href={activePopup.link}>
                                        En savoir plus
                                    </Link>
                                </Button>
                            </DialogFooter>
                        )}
                        
                        {!isClosable && (
                            <div className="mt-4 text-xs text-center text-gray-400 italic">
                                Ce message ne peut pas être fermé manuellement.
                            </div>
                        )}
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
