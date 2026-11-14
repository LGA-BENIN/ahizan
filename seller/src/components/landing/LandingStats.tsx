'use client';

import { useState, useEffect, useRef } from 'react';

interface StatItem {
    prefix?: string;
    target: number;
    suffix: string;
    label: string;
    decimals?: number;
}

export function LandingStats() {
    const stats: StatItem[] = [
        { prefix: '+', target: 10, suffix: 'K', label: 'Commerçants & Artisans inscrits', decimals: 0 },
        { prefix: '', target: 77, suffix: '', label: 'Communes couvertes au Bénin', decimals: 0 },
        { prefix: '', target: 4.8, suffix: ' ★', label: 'Note moyenne de satisfaction', decimals: 1 },
        { prefix: '+', target: 250, suffix: 'M', label: 'de FCFA reversés aux vendeurs', decimals: 0 }
    ];

    const [hasAnimated, setHasAnimated] = useState(false);
    const sectionRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting && !hasAnimated) {
                    setHasAnimated(true);
                }
            },
            { threshold: 0.2 }
        );

        if (sectionRef.current) {
            observer.observe(sectionRef.current);
        }

        return () => observer.disconnect();
    }, [hasAnimated]);

    return (
        <section 
            id="advantages" 
            ref={sectionRef} 
            className="w-full py-16 sm:py-20 bg-white border-b border-gray-100"
        >
            <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-10 md:gap-8 text-center">
                    {stats.map((stat, idx) => (
                        <div key={idx} className="flex flex-col items-center justify-center gap-2 group">
                            <h3 className="flex items-center justify-center text-4xl sm:text-5xl lg:text-6xl font-extrabold text-[#d8263e] tracking-tight group-hover:scale-105 transition-transform duration-300">
                                {stat.prefix && <span>{stat.prefix}</span>}
                                <Counter target={stat.target} decimals={stat.decimals || 0} active={hasAnimated} />
                                {stat.suffix && <span className="text-[#d8263e]">{stat.suffix}</span>}
                            </h3>
                            <p className="text-sm sm:text-base font-semibold text-[#0d213d] max-w-[200px] leading-snug">
                                {stat.label}
                            </p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}

function Counter({ target, decimals = 0, active }: { target: number; decimals: number; active: boolean }) {
    const [count, setCount] = useState(0);

    useEffect(() => {
        if (!active) return;

        let start = 0;
        const duration = 1800; // ms
        const steps = 60;
        const increment = target / steps;
        const intervalTime = duration / steps;

        const timer = setInterval(() => {
            start += increment;
            if (start >= target) {
                setCount(target);
                clearInterval(timer);
            } else {
                setCount(start);
            }
        }, intervalTime);

        return () => clearInterval(timer);
    }, [active, target]);

    if (decimals > 0) {
        return <span>{count.toFixed(decimals).replace('.', ',')}</span>;
    }

    return <span>{Math.floor(count).toLocaleString('fr-FR')}</span>;
}
