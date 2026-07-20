"use client";

import React, { useState } from 'react';
import { Mail } from 'lucide-react';

interface NewsletterProps {
    title?: string;
    subtitle?: string;
    placeholder?: string;
    buttonText?: string;
    backgroundColor?: string;
}

export function NewsletterSection({
    title = "Restez informé",
    subtitle = "Inscrivez-vous à notre newsletter pour recevoir nos offres exclusives et nouveautés.",
    placeholder = "Votre adresse email",
    buttonText = "S'inscrire",
    backgroundColor,
}: NewsletterProps) {
    const [email, setEmail] = useState('');
    const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!email.trim() || !email.includes('@')) return;
        setStatus('success');
        setEmail('');
        setTimeout(() => setStatus('idle'), 4000);
    };

    return (
        <section className="py-12 my-8 rounded-2xl" style={{ backgroundColor: backgroundColor || '#F8FAFC' }}>
            <div className="container mx-auto px-4">
                <div className="max-w-xl mx-auto text-center space-y-4">
                    <Mail className="w-10 h-10 text-primary mx-auto" />
                    {title && <h2 className="text-2xl font-black tracking-tight uppercase">{title}</h2>}
                    {subtitle && <p className="text-muted-foreground text-sm">{subtitle}</p>}

                    <form onSubmit={handleSubmit} className="flex gap-2 max-w-md mx-auto mt-6">
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder={placeholder}
                            required
                            className="flex-1 px-4 py-3 rounded-full border border-border bg-white text-sm outline-none focus:border-primary transition-colors"
                        />
                        <button type="submit"
                            className="bg-primary text-white px-6 py-3 rounded-full font-bold text-sm hover:bg-primary/90 transition-colors flex-shrink-0">
                            {buttonText}
                        </button>
                    </form>

                    {status === 'success' && (
                        <p className="text-green-600 text-sm font-medium">Merci pour votre inscription !</p>
                    )}
                </div>
            </div>
        </section>
    );
}
