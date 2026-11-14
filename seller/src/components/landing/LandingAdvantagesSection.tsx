'use client';

import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Store, Smartphone, TrendingUp } from 'lucide-react';

export function LandingAdvantagesSection() {
    const [hasAnimated, setHasAnimated] = useState(false);
    const sectionRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting && !hasAnimated) {
                    setHasAnimated(true);
                }
            },
            { threshold: 0.12 }
        );

        if (sectionRef.current) {
            observer.observe(sectionRef.current);
        }

        return () => observer.disconnect();
    }, [hasAnimated]);

    return (
        <section 
            id="advantages" 
            data-snap-section="true"
            ref={sectionRef}
            className="w-full py-16 sm:py-20 md:py-24 bg-[#FCF8E8] transition-colors duration-300 scroll-mt-18 sm:scroll-mt-20"
        >
            <div className="max-w-[1440px] mx-auto px-6 md:px-10 flex flex-col gap-10 md:gap-14">
                
                {/* 4 Stats Counters Bar (Well proportioned, gentle spacing) */}
                <div className="w-full pb-6 border-b border-[#0d213d]/10">
                    <div className="grid grid-cols-2 gap-x-6 gap-y-8 md:flex md:items-start md:justify-between md:gap-8">
                        
                        {/* Stat 1 */}
                        <motion.div 
                            initial={{ opacity: 0, y: 30 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.5, delay: 0.1 }}
                            className="flex flex-col items-center justify-center gap-1 md:w-70 group"
                        >
                            <h5 className="flex items-center justify-center text-[36px] leading-10 font-black text-[#d8263e] md:text-5xl md:leading-12 xl:text-[68px] xl:leading-18 transition-transform group-hover:scale-105">
                                <span>+</span>
                                <Counter target={10} active={hasAnimated} />
                                <span>K</span>
                            </h5>
                            <p className="text-center text-sm leading-5 font-semibold text-[#0d213d] md:text-base">
                                commerçants & artisans inscrits
                            </p>
                        </motion.div>

                        {/* Stat 2 */}
                        <motion.div 
                            initial={{ opacity: 0, y: 30 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.5, delay: 0.2 }}
                            className="flex flex-col items-center justify-center gap-1 md:w-70 group"
                        >
                            <h5 className="flex items-center justify-center text-[36px] leading-10 font-black text-[#d8263e] md:text-5xl md:leading-12 xl:text-[68px] xl:leading-18 transition-transform group-hover:scale-105">
                                <Counter target={77} active={hasAnimated} />
                            </h5>
                            <p className="text-center text-sm leading-5 font-semibold text-[#0d213d] md:text-base">
                                communes couvertes au Bénin
                            </p>
                        </motion.div>

                        {/* Stat 3 */}
                        <motion.div 
                            initial={{ opacity: 0, y: 30 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.5, delay: 0.3 }}
                            className="flex flex-col items-center justify-center gap-1 md:w-70 group"
                        >
                            <h5 className="flex items-center justify-center text-[36px] leading-10 font-black text-[#d8263e] md:text-5xl md:leading-12 xl:text-[68px] xl:leading-18 transition-transform group-hover:scale-105">
                                <Counter target={4.8} decimals={1} active={hasAnimated} />
                                <span className="ms-1.5 text-[#d8263e]">★</span>
                            </h5>
                            <p className="text-center text-sm leading-5 font-semibold text-[#0d213d] md:text-base">
                                très bien noté par les vendeurs
                            </p>
                        </motion.div>

                        {/* Stat 4 */}
                        <motion.div 
                            initial={{ opacity: 0, y: 30 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.5, delay: 0.4 }}
                            className="flex flex-col items-center justify-center gap-1 md:w-70 group"
                        >
                            <h5 className="flex items-center justify-center text-[36px] leading-10 font-black text-[#d8263e] md:text-5xl md:leading-12 xl:text-[68px] xl:leading-18 transition-transform group-hover:scale-105">
                                <span>+</span>
                                <Counter target={250} active={hasAnimated} />
                                <span>m</span>
                            </h5>
                            <p className="text-center text-sm leading-5 font-semibold text-[#0d213d] md:text-base">
                                de FCFA vendus sur Ahizan
                            </p>
                        </motion.div>

                    </div>
                </div>

                {/* Section Title & Description */}
                <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between lg:gap-10">
                    <motion.h2 
                        initial={{ opacity: 0, x: -30 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.6 }}
                        className="text-[28px] leading-8 font-black text-[#0d213d] md:text-[38px] md:leading-10 lg:text-[46px] lg:leading-[1.15]"
                    >
                        Débutez vos ventes <br className="hidden sm:inline" />
                        sans dépenser 1 franc !
                    </motion.h2>
                    <motion.p 
                        initial={{ opacity: 0, x: 30 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.6 }}
                        className="text-sm leading-[160%] font-medium text-gray-700 md:text-base max-w-md"
                    >
                        Publiez vos produits, encaissez via Mobile Money et gérez vos expéditions nationales en toute simplicité.
                    </motion.p>
                </div>

                {/* 3 Large Cards with Framer Motion Staggered Entrance & Hover Lift */}
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                    
                    {/* Card 1: Sans tracasseries */}
                    <motion.div 
                        initial={{ opacity: 0, y: 40 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.5, delay: 0.15 }}
                        whileHover={{ y: -8, scale: 1.015 }}
                        className="flex flex-col items-start justify-between overflow-hidden rounded-[2rem] min-h-105 group bg-[#F3EFE0] p-7 border border-[#0d213d]/5 shadow-sm hover:shadow-xl transition-shadow"
                    >
                        <div className="flex w-full flex-col items-center justify-center py-6">
                            <div className="relative size-36 sm:size-44 rounded-3xl bg-white shadow-xl flex items-center justify-center p-4 transition-transform duration-500 group-hover:scale-105">
                                <div className="absolute -top-3 -right-3 px-3 py-1 rounded-full bg-[#0d213d] text-white text-[10px] font-bold shadow-md">
                                    3 min chrono
                                </div>
                                <div className="flex flex-col items-center gap-2.5 text-center">
                                    <div className="size-14 rounded-2xl bg-[#0d213d]/10 text-[#0d213d] flex items-center justify-center">
                                        <Store className="size-7 text-[#0d213d]" />
                                    </div>
                                    <span className="text-xs font-bold text-[#0d213d] uppercase tracking-wider">
                                        Boutique Ahizan
                                    </span>
                                    <span className="text-[10px] text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-full font-semibold">
                                        Active en ligne
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-col items-start justify-start gap-2 p-2">
                            <h6 className="text-xl leading-7 font-black md:text-[24px] md:leading-8 text-[#0d213d]">
                                Sans tracasseries techniques
                            </h6>
                            <p className="text-xs leading-[160%] font-normal md:text-sm text-gray-700">
                                Créez votre boutique en 3 minutes avec votre numéro de téléphone. Zéro paperasse, zéro code, zéro agence à payer.
                            </p>
                        </div>
                    </motion.div>

                    {/* Card 2: 100% Mobile Money */}
                    <motion.div 
                        initial={{ opacity: 0, y: 40 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.5, delay: 0.3 }}
                        whileHover={{ y: -8, scale: 1.015 }}
                        className="flex flex-col items-start justify-between overflow-hidden rounded-[2rem] min-h-105 group bg-[#FBE5E1] p-7 border border-[#d8263e]/10 shadow-sm hover:shadow-xl transition-shadow"
                    >
                        <div className="flex w-full flex-col items-center justify-center py-6">
                            <div className="relative size-36 sm:size-44 rounded-3xl bg-white shadow-xl flex items-center justify-center p-4 transition-transform duration-500 group-hover:scale-105">
                                <div className="absolute -top-3 -left-3 px-3 py-1 rounded-full bg-[#d8263e] text-white text-[10px] font-bold shadow-md">
                                    100% Mobile
                                </div>
                                <div className="flex flex-col items-center gap-2.5 text-center">
                                    <div className="size-14 rounded-2xl bg-[#d8263e]/10 text-[#d8263e] flex items-center justify-center">
                                        <Smartphone className="size-7 text-[#d8263e]" />
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <span className="size-2 rounded-full bg-amber-400" />
                                        <span className="size-2 rounded-full bg-blue-500" />
                                        <span className="size-2 rounded-full bg-emerald-500" />
                                    </div>
                                    <span className="text-[11px] font-bold text-[#0d213d]">
                                        MTN • Moov • Celtiis
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-col items-start justify-start gap-2 p-2">
                            <h6 className="text-xl leading-7 font-black md:text-[24px] md:leading-8 text-[#0d213d]">
                                100 % Mobile Money
                            </h6>
                            <p className="text-xs leading-[160%] font-normal md:text-sm text-gray-700">
                                MTN MoMo, Moov, Celtiis, Wave : vos acheteurs règlent facilement et vous retirez vos gains directement sur votre opérateur.
                            </p>
                        </div>
                    </motion.div>

                    {/* Card 3: Tout sous vos yeux */}
                    <motion.div 
                        initial={{ opacity: 0, y: 40 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.5, delay: 0.45 }}
                        whileHover={{ y: -8, scale: 1.015 }}
                        className="sm:col-span-2 lg:col-span-1 flex flex-col items-start justify-between overflow-hidden rounded-[2rem] min-h-105 group bg-[#d8263e] p-7 text-white shadow-xl hover:shadow-2xl transition-shadow"
                    >
                        <div className="flex w-full flex-col items-center justify-center py-6">
                            <div className="relative size-36 sm:size-44 rounded-3xl bg-white/10 backdrop-blur-md border border-white/25 shadow-xl flex items-center justify-center p-4 transition-transform duration-500 group-hover:scale-105">
                                <div className="flex flex-col items-center gap-2.5 text-center">
                                    <div className="size-14 rounded-2xl bg-white text-[#d8263e] flex items-center justify-center shadow-md">
                                        <TrendingUp className="size-7" />
                                    </div>
                                    <span className="text-xs font-bold text-white uppercase tracking-wider">
                                        Suivi En Direct
                                    </span>
                                    <span className="text-[10px] text-white/90 bg-white/20 px-2.5 py-0.5 rounded-full font-semibold">
                                        24h/24 • 7j/7
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-col items-start justify-start gap-2 p-2">
                            <h6 className="text-xl leading-7 font-black md:text-[24px] md:leading-8 text-white">
                                Tout sous vos yeux
                            </h6>
                            <p className="text-xs leading-[160%] font-normal md:text-sm text-white/90">
                                Soldes, historiques, alertes de stock et reçus automatiques : chaque franc est visible en temps réel partout où vous êtes.
                            </p>
                        </div>
                    </motion.div>

                </div>

            </div>
        </section>
    );
}

function Counter({ target, decimals = 0, active }: { target: number; decimals?: number; active: boolean }) {
    const [count, setCount] = useState(0);

    useEffect(() => {
        if (!active) return;

        let start = 0;
        const duration = 1600;
        const steps = 50;
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

    return <span>{Math.floor(count)}</span>;
}
