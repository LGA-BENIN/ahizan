'use client';

import React, { useRef, useState, useEffect, useId } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { ProductCard } from "@/components/commerce/product-card";
import { MasterProductCard } from "@/components/commerce/master-product-card";
import { Button } from "@/components/ui/button";

interface ProductCarouselClientProps {
    title: string;
    products: any[];
}

export function ProductCarousel({ title, products }: ProductCarouselClientProps) {
    const id = useId();
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const [canScrollLeft, setCanScrollLeft] = useState(false);
    const [canScrollRight, setCanScrollRight] = useState(true);

    const checkScroll = () => {
        if (!scrollContainerRef.current) return;
        const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
        setCanScrollLeft(scrollLeft > 5);
        setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 5);
    };

    useEffect(() => {
        checkScroll();
        const el = scrollContainerRef.current;
        if (el) {
            el.addEventListener('scroll', checkScroll, { passive: true });
            window.addEventListener('resize', checkScroll);
        }
        return () => {
            if (el) el.removeEventListener('scroll', checkScroll);
            window.removeEventListener('resize', checkScroll);
        };
    }, [products]);

    const handleScroll = (direction: 'left' | 'right') => {
        if (!scrollContainerRef.current) return;
        const container = scrollContainerRef.current;
        const scrollAmount = container.clientWidth * 0.75;
        container.scrollBy({
            left: direction === 'left' ? -scrollAmount : scrollAmount,
            behavior: 'smooth',
        });
    };

    if (!products || products.length === 0) return null;

    return (
        <section className="py-6 md:py-8 border-t border-border/40 mt-8">
            <div className="container mx-auto px-4 md:px-6 lg:px-8">
                <div className="flex items-center justify-between mb-4 md:mb-6">
                    {title && (
                        <h2 className="text-lg md:text-xl font-bold tracking-tight text-foreground">
                            {title}
                        </h2>
                    )}
                    
                    {/* Header Navigation Buttons */}
                    <div className="flex items-center gap-1.5 ml-auto">
                        <Button
                            variant="outline"
                            size="icon"
                            type="button"
                            onClick={() => handleScroll('left')}
                            disabled={!canScrollLeft}
                            aria-label="Défiler vers la gauche"
                            className="h-8 w-8 rounded-full border-border/60 hover:bg-muted disabled:opacity-30 transition-all cursor-pointer shadow-2xs"
                        >
                            <ChevronLeft className="h-4 w-4 text-foreground" />
                        </Button>
                        <Button
                            variant="outline"
                            size="icon"
                            type="button"
                            onClick={() => handleScroll('right')}
                            disabled={!canScrollRight}
                            aria-label="Défiler vers la droite"
                            className="h-8 w-8 rounded-full border-border/60 hover:bg-muted disabled:opacity-30 transition-all cursor-pointer shadow-2xs"
                        >
                            <ChevronRight className="h-4 w-4 text-foreground" />
                        </Button>
                    </div>
                </div>

                {/* Carousel container with floating side buttons */}
                <div className="relative group/carousel">
                    {/* Floating Left Arrow */}
                    <button
                        type="button"
                        onClick={() => handleScroll('left')}
                        disabled={!canScrollLeft}
                        aria-label="Défiler vers la gauche"
                        className={`absolute left-0 top-1/2 -translate-y-1/2 z-20 w-9 h-9 sm:w-10 sm:h-10 -ml-2 sm:-ml-4 rounded-full bg-white/95 dark:bg-slate-900/95 hover:bg-white dark:hover:bg-slate-800 border border-border shadow-md flex items-center justify-center text-foreground transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer disabled:opacity-0 disabled:pointer-events-none ${
                            canScrollLeft ? 'opacity-100' : 'opacity-0 pointer-events-none'
                        }`}
                    >
                        <ChevronLeft className="w-5 h-5" />
                    </button>

                    {/* Products track */}
                    <div
                        ref={scrollContainerRef}
                        className="flex gap-3 md:gap-4 overflow-x-auto scrollbar-none scroll-smooth pb-2 px-1 snap-x snap-mandatory"
                        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                    >
                        {products.map((product, i) => (
                            <div
                                key={product.id ? `${product.id}-${i}` : `${id}-${i}`}
                                className="flex-none w-[170px] sm:w-[210px] md:w-[230px] lg:w-[250px] snap-start"
                            >
                                {product.isMasterResolved || product.winningOffer ? (
                                    <MasterProductCard item={product} />
                                ) : (
                                    <ProductCard product={product} />
                                )}
                            </div>
                        ))}
                    </div>

                    {/* Floating Right Arrow */}
                    <button
                        type="button"
                        onClick={() => handleScroll('right')}
                        disabled={!canScrollRight}
                        aria-label="Défiler vers la droite"
                        className={`absolute right-0 top-1/2 -translate-y-1/2 z-20 w-9 h-9 sm:w-10 sm:h-10 -mr-2 sm:-mr-4 rounded-full bg-white/95 dark:bg-slate-900/95 hover:bg-white dark:hover:bg-slate-800 border border-border shadow-md flex items-center justify-center text-foreground transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer disabled:opacity-0 disabled:pointer-events-none ${
                            canScrollRight ? 'opacity-100' : 'opacity-0 pointer-events-none'
                        }`}
                    >
                        <ChevronRight className="w-5 h-5" />
                    </button>
                </div>
            </div>
        </section>
    );
}
