"use client";

import React, { useState } from 'react';
import { Star, ChevronLeft, ChevronRight, Quote } from 'lucide-react';

interface Testimonial {
    name: string;
    text: string;
    rating?: number;
    photoUrl?: string;
    role?: string;
}

interface TestimonialsProps {
    title?: string;
    description?: string;
    testimonials?: Testimonial[];
}

export function TestimonialsSection({
    title = "Ce que disent nos clients",
    description,
    testimonials = [],
}: TestimonialsProps) {
    const [current, setCurrent] = useState(0);

    if (!testimonials || testimonials.length === 0) return null;

    const prev = () => setCurrent(i => (i - 1 + testimonials.length) % testimonials.length);
    const next = () => setCurrent(i => (i + 1) % testimonials.length);
    const t = testimonials[current];

    return (
        <section className="py-14 container mx-auto px-4">
            {(title || description) && (
                <div className="mb-10 text-center max-w-2xl mx-auto">
                    {title && <h2 className="text-2xl md:text-3xl font-black tracking-tight uppercase leading-none">{title}</h2>}
                    {description && <p className="text-muted-foreground font-medium text-base mt-3">{description}</p>}
                    <div className="h-1 w-16 bg-primary mx-auto mt-4 rounded-full" />
                </div>
            )}

            <div className="max-w-2xl mx-auto relative">
                <div className="bg-white rounded-2xl p-8 md:p-10 shadow-sm border border-border text-center">
                    <Quote className="w-8 h-8 text-primary/20 mx-auto mb-4" />

                    <p className="text-base md:text-lg text-foreground leading-relaxed mb-6 italic">
                        &ldquo;{t.text}&rdquo;
                    </p>

                    {t.rating != null && t.rating > 0 && (
                        <div className="flex justify-center gap-0.5 mb-4">
                            {[1, 2, 3, 4, 5].map(star => (
                                <Star key={star} className={`w-4 h-4 ${star <= t.rating! ? 'fill-yellow-400 text-yellow-400' : 'text-gray-200'}`} />
                            ))}
                        </div>
                    )}

                    <div className="flex items-center justify-center gap-3">
                        {t.photoUrl ? (
                            <img src={t.photoUrl} alt={t.name} className="w-12 h-12 rounded-full object-cover" />
                        ) : (
                            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-lg font-black text-primary">
                                {t.name.charAt(0)}
                            </div>
                        )}
                        <div className="text-left">
                            <p className="font-bold text-sm">{t.name}</p>
                            {t.role && <p className="text-xs text-muted-foreground">{t.role}</p>}
                        </div>
                    </div>
                </div>

                {testimonials.length > 1 && (
                    <div className="flex justify-center gap-3 mt-6">
                        <button onClick={prev} aria-label="Précédent"
                            className="w-10 h-10 rounded-full border border-border flex items-center justify-center hover:bg-muted transition-colors">
                            <ChevronLeft className="w-4 h-4" />
                        </button>
                        <div className="flex items-center gap-1.5">
                            {testimonials.map((_, i) => (
                                <button key={i} onClick={() => setCurrent(i)} aria-label={`Témoignage ${i + 1}`}
                                    className={`w-2 h-2 rounded-full transition-all ${i === current ? 'bg-primary w-6' : 'bg-muted-foreground/30'}`} />
                            ))}
                        </div>
                        <button onClick={next} aria-label="Suivant"
                            className="w-10 h-10 rounded-full border border-border flex items-center justify-center hover:bg-muted transition-colors">
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>
                )}
            </div>
        </section>
    );
}
