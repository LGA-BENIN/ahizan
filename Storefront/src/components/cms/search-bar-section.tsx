"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search } from 'lucide-react';

interface SearchBarSectionProps {
    placeholder?: string;
    backgroundColor?: string;
    quickLinks?: { label: string; link: string }[];
}

export function SearchBarSection({
    placeholder = "Rechercher un produit, une marque, une catégorie...",
    backgroundColor,
    quickLinks,
}: SearchBarSectionProps) {
    const [query, setQuery] = useState('');
    const router = useRouter();

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (query.trim()) {
            router.push(`/search?q=${encodeURIComponent(query.trim())}`);
        }
    };

    return (
        <section className="py-6" style={backgroundColor ? { backgroundColor } : undefined}>
            <div className="container mx-auto px-4">
                <form onSubmit={handleSubmit} className="relative max-w-2xl mx-auto">
                    <div className="flex items-center bg-white rounded-full shadow-lg border-2 border-primary/20 focus-within:border-primary focus-within:shadow-xl transition-all">
                        <Search className="w-5 h-5 text-muted-foreground ml-5 flex-shrink-0" />
                        <input
                            type="text"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder={placeholder}
                            className="flex-1 px-4 py-3.5 bg-transparent border-none outline-none text-sm placeholder:text-muted-foreground"
                        />
                        <button type="submit"
                            className="bg-primary text-white px-6 py-2.5 rounded-full mr-1.5 font-bold text-sm hover:bg-primary/90 transition-colors flex-shrink-0">
                            Rechercher
                        </button>
                    </div>
                </form>

                {quickLinks && quickLinks.length > 0 && (
                    <div className="flex flex-wrap justify-center gap-2 mt-4 max-w-2xl mx-auto">
                        {quickLinks.map((link, i) => (
                            <a key={i} href={link.link}
                                className="text-xs font-medium px-3 py-1.5 rounded-full bg-muted hover:bg-primary hover:text-white transition-all">
                                {link.label}
                            </a>
                        ))}
                    </div>
                )}
            </div>
        </section>
    );
}
