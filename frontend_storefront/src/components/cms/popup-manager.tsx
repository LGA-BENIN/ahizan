'use client';

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { PopupData } from '@/lib/vendure/cms-queries';

export function PopupManager({ popups }: { popups: PopupData[] }) {
    const [activePopup, setActivePopup] = useState<PopupData | null>(null);
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        if (!popups || popups.length === 0) return;

        // On vérifie dans le localStorage si on a déjà vu ces popups récemment (session en cours)
        const hasSeenPopup = sessionStorage.getItem('vendure_cms_popup_seen');

        if (!hasSeenPopup) {
            // Afficher le premier popup actif après un court délai
            const timer = setTimeout(() => {
                setActivePopup(popups[0]);
                setIsOpen(true);
            }, 3000);

            return () => clearTimeout(timer);
        }
    }, [popups]);

    const handleClose = () => {
        setIsOpen(false);
        sessionStorage.setItem('vendure_cms_popup_seen', 'true');
    };

    if (!activePopup) return null;

    return (
        <Dialog open={isOpen} onOpenChange={(open) => {
            if (!open) handleClose();
        }}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    {activePopup.title && (
                        <DialogTitle>{activePopup.title}</DialogTitle>
                    )}
                    {activePopup.content && (
                        <DialogDescription className="pt-4 text-base">
                            {activePopup.content}
                        </DialogDescription>
                    )}
                </DialogHeader>

                {activePopup.ctaText && activePopup.ctaLink && (
                    <DialogFooter className="mt-4">
                        <Button asChild onClick={handleClose}>
                            <Link href={activePopup.ctaLink}>
                                {activePopup.ctaText}
                            </Link>
                        </Button>
                    </DialogFooter>
                )}
            </DialogContent>
        </Dialog>
    );
}
