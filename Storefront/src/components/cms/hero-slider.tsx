"use client";

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface Slide {
    title?: string;
    subtitle?: string;
    ctaText?: string;
    ctaLink?: string;
    imageUrl: string;
    overlayColor?: string;
    textAlign?: 'left' | 'center' | 'right';
}

interface HeroSliderProps {
    slides?: Slide[];
    autoPlay?: boolean;
    interval?: number;
    height?: 'sm' | 'md' | 'lg' | 'full';
}

const heightMap: Record<string, string> = {
    sm: 'h-[30vh] min-h-[250px]',
    md: 'h-[45vh] min-h-[350px]',
    lg: 'h-[60vh] min-h-[450px]',
    full: 'h-[80vh] min-h-[500px]',
};

const alignMap: Record<string, string> = {
    left: 'items-start text-left',
    center: 'items-center text-center',
    right: 'items-end text-right',
};

export function HeroSlider({
    slides = [],
    autoPlay = true,
    interval = 5000,
    height = 'md',
}: HeroSliderProps) {
    const [current, setCurrent] = useState(0);

    const next = useCallback(() => {
        setCurrent(prev => (prev + 1) % slides.length);
    }, [slides.length]);

    const prev = useCallback(() => {
        setCurrent(prev => (prev - 1 + slides.length) % slides.length);
    }, [slides.length]);

    useEffect(() => {
        if (!autoPlay || slides.length <= 1) return;
        const timer = setInterval(next, interval);
        return () => clearInterval(timer);
    }, [autoPlay, interval, next, slides.length]);

    if (!slides || slides.length === 0) return null;

    const slide = slides[current];

    return (
        <section className={`relative overflow-hidden ${heightMap[height] || heightMap.md}`}>
            {slides.map((s, i) => (
                <div
                    key={i}
                    className={`absolute inset-0 transition-opacity duration-700 ease-in-out ${i === current ? 'opacity-100 z-10' : 'opacity-0 z-0'}`}
                    style={{
                        backgroundImage: `url(${s.imageUrl})`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                    }}
                >
                    <div className="absolute inset-0" style={{ backgroundColor: s.overlayColor || 'rgba(0,0,0,0.4)' }} />
                </div>
            ))}

            <div className={`relative z-20 h-full container mx-auto px-4 flex flex-col justify-center ${alignMap[slide.textAlign || 'center']}`}>
                <div className="max-w-2xl space-y-4">
                    {slide.title && (
                        <h2 className="text-3xl md:text-5xl font-black text-white leading-tight uppercase tracking-tight">
                            {slide.title}
                        </h2>
                    )}
                    {slide.subtitle && (
                        <p className="text-base md:text-lg text-gray-200 max-w-xl leading-relaxed">
                            {slide.subtitle}
                        </p>
                    )}
                    {slide.ctaText && slide.ctaLink && (
                        <Link href={slide.ctaLink}
                            className="inline-block mt-4 bg-white text-black font-bold px-8 py-3 rounded-full hover:bg-primary hover:text-white transition-all text-sm uppercase tracking-wide">
                            {slide.ctaText}
                        </Link>
                    )}
                </div>
            </div>

            {slides.length > 1 && (
                <>
                    <button onClick={prev} aria-label="Précédent"
                        className="absolute left-3 top-1/2 -translate-y-1/2 z-30 w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm hover:bg-white/40 flex items-center justify-center transition-all">
                        <ChevronLeft className="w-5 h-5 text-white" />
                    </button>
                    <button onClick={next} aria-label="Suivant"
                        className="absolute right-3 top-1/2 -translate-y-1/2 z-30 w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm hover:bg-white/40 flex items-center justify-center transition-all">
                        <ChevronRight className="w-5 h-5 text-white" />
                    </button>

                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30 flex gap-2">
                        {slides.map((_, i) => (
                            <button key={i} onClick={() => setCurrent(i)} aria-label={`Slide ${i + 1}`}
                                className={`w-2.5 h-2.5 rounded-full transition-all ${i === current ? 'bg-white w-8' : 'bg-white/40 hover:bg-white/60'}`} />
                        ))}
                    </div>
                </>
            )}
        </section>
    );
}
