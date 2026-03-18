'use client';

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Image from 'next/image';
import Link from 'next/link';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';

interface PopupSectionProps {
    id: string;
    title: string;
    description?: string;
    imageUrl?: string;
    ctaText?: string;
    ctaLink?: string;
    delay?: number; // ms
    frequency?: 'always' | 'once_per_session' | 'once_ever';
}

export function PopupSection({
    id,
    title,
    description,
    imageUrl,
    ctaText,
    ctaLink,
    delay = 2000,
    frequency = 'once_per_session',
}: PopupSectionProps) {
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        const storageKey = `popup_dismissed_${id}`;
        const isDismissed = frequency === 'once_ever'
            ? localStorage.getItem(storageKey)
            : frequency === 'once_per_session'
                ? sessionStorage.getItem(storageKey)
                : null;

        if (!isDismissed) {
            const timer = setTimeout(() => {
                setIsOpen(true);
            }, delay);
            return () => clearTimeout(timer);
        }
    }, [id, delay, frequency]);

    const handleClose = () => {
        setIsOpen(false);
        const storageKey = `popup_dismissed_${id}`;
        if (frequency === 'once_ever') {
            localStorage.setItem(storageKey, 'true');
        } else if (frequency === 'once_per_session') {
            sessionStorage.setItem(storageKey, 'true');
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
            <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden border-none">
                <div className="relative">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="absolute right-2 top-2 z-10 rounded-full bg-black/20 text-white hover:bg-black/40 border-none"
                        onClick={handleClose}
                    >
                        <X className="h-4 w-4" />
                        <span className="sr-only">Close</span>
                    </Button>

                    {imageUrl && (
                        <div className="relative h-64 w-full">
                            <Image
                                src={imageUrl}
                                alt={title}
                                fill
                                className="object-cover"
                            />
                        </div>
                    )}

                    <div className="p-8 text-center">
                        <DialogHeader>
                            <DialogTitle className="text-2xl font-bold">{title}</DialogTitle>
                            {description && (
                                <DialogDescription className="text-base mt-2">
                                    {description}
                                </DialogDescription>
                            )}
                        </DialogHeader>

                        {ctaText && ctaLink && (
                            <div className="mt-8">
                                <Button asChild className="w-full bg-orange-600 hover:bg-orange-700" size="lg" onClick={handleClose}>
                                    <Link href={ctaLink}>{ctaText}</Link>
                                </Button>
                            </div>
                        )}

                        <button
                            onClick={handleClose}
                            className="mt-4 text-xs text-muted-foreground hover:underline"
                        >
                            Non merci, peut-être plus tard
                        </button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
