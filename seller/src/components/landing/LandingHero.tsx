'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Eye, EyeOff, LayoutDashboard, ArrowRight } from 'lucide-react';

interface LandingHeroProps {
    ctaUrl: string;
    ctaText: string;
    dashboardUrl?: string;
}

export function LandingHero({ ctaUrl, ctaText, dashboardUrl = '/dashboard' }: LandingHeroProps) {
    const [showAmount1, setShowAmount1] = useState(true);
    const [showAmount2, setShowAmount2] = useState(true);
    const [showAmount3, setShowAmount3] = useState(true);

    return (
        <section 
            id="hero"
            data-snap-section="true"
            className="relative isolate w-full overflow-hidden bg-[#0d213d] min-h-dvh flex justify-end items-end pt-20"
        >
            {/* Authentic Ahizan Beninese Entrepreneurs Background Image */}
            <div data-hero="bg" className="absolute inset-0 z-0">
                <picture>
                    <source srcSet="/images/ahizan-hero-bg.webp" type="image/webp" />
                    <img 
                        alt="Entrepreneurs et commerçants réunis sur Ahizan Bénin" 
                        src="/images/ahizan-hero-bg.jpg" 
                        fetchPriority="high"
                        className="relative size-full object-cover object-[50%_35%] xl:object-[50%_30%]" 
                    />
                </picture>
            </div>

            {/* Bottom Dark Gradient Fade into #0d213d */}
            <div 
                data-hero="gradient" 
                aria-hidden="true" 
                className="absolute inset-x-0 bottom-0 z-1 h-[75%] md:h-130" 
                style={{
                    background: 'linear-gradient(180deg, rgba(13, 33, 61, 0) 0%, rgba(13, 33, 61, 0.75) 28%, #0d213d 60%)'
                }}
            />

            {/* Hero Interactive Content */}
            <div data-hero="content" className="relative z-2 flex w-full flex-col justify-end pt-28 pb-4 text-white md:pb-6 xl:pb-8">
                <div className="max-w-[1440px] mx-auto px-6 md:px-10 w-full">
                    
                    {/* The 3 Floating Cards (Cascading across the image with framer-motion entrance + float) */}
                    <div className="hidden w-full items-end justify-between gap-4 md:flex lg:gap-6 xl:gap-8 transform translate-y-12 xl:translate-y-20 2xl:translate-y-16 md:px-6 2xl:px-16">
                        
                        {/* Card 1: Boutique Cotonou (Rouge Ahizan #d8263e) */}
                        <motion.div 
                            initial={{ opacity: 0, y: 50, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            transition={{ duration: 0.6, delay: 0.2 }}
                            whileHover={{ y: -6, scale: 1.02 }}
                            className="w-full max-w-84.75 animate-[float_5s_ease-in-out_infinite]"
                        >
                            <div className="relative isolate flex h-auto min-h-34 w-full max-w-84.75 flex-col items-start justify-between gap-4 overflow-hidden rounded-2xl p-4 lg:min-h-38 xl:min-h-34 2xl:min-h-41.75 xl:p-5 bg-[#d8263e] shadow-2xl transition-all">
                                <div className="pointer-events-none absolute -right-6 -bottom-6 size-36 rounded-full bg-white/10 blur-sm select-none" />
                                
                                <div className="relative z-1 flex flex-col gap-1.5 w-full">
                                    <p className="flex items-center justify-between text-xs font-medium text-white/90 xl:text-sm">
                                        <span className="flex items-center gap-1.5 truncate text-white">
                                            <span className="size-2 rounded-full bg-emerald-400 animate-ping" />
                                            Boutique Mode Cotonou
                                        </span>
                                        <button 
                                            type="button" 
                                            onClick={() => setShowAmount1(!showAmount1)} 
                                            className="text-white hover:opacity-80 transition-opacity"
                                            title="Masquer/Afficher"
                                        >
                                            {showAmount1 ? <EyeOff className="size-4 text-white" /> : <Eye className="size-4 text-white" />}
                                        </button>
                                    </p>
                                    <h6 className="text-xl leading-[120%] font-bold text-white lg:text-[26px] xl:text-[22px] 2xl:text-[32px]">
                                        <span>{showAmount1 ? '1 123 000' : '••••••••'}</span>{' '}
                                        <span className="text-white/60 font-normal text-base">FCFA</span>
                                    </h6>
                                </div>
                                <Link 
                                    href={ctaUrl}
                                    className="relative z-1 w-full rounded-full bg-[#FCF8E8] hover:bg-white py-2.5 text-xs text-center font-bold text-[#0d213d] shadow-sm transition-all active:scale-95"
                                >
                                    Retirer mes fonds
                                </Link>
                            </div>
                        </motion.div>

                        {/* Card 2: Commandes en cours (Bleu Ahizan #0d213d, translated downwards) */}
                        <motion.div 
                            initial={{ opacity: 0, y: 50, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            transition={{ duration: 0.6, delay: 0.35 }}
                            whileHover={{ y: -6, scale: 1.02 }}
                            className="w-full max-w-84.75 animate-[float_6s_ease-in-out_infinite_1s]"
                        >
                            <div className="relative isolate flex h-auto min-h-34 w-full max-w-84.75 flex-col items-start justify-between gap-4 overflow-hidden rounded-2xl p-4 lg:min-h-38 xl:min-h-34 2xl:min-h-41.75 xl:p-5 translate-y-8 bg-[#0a182d] border border-white/20 xl:translate-y-12 2xl:translate-y-16 shadow-2xl transition-all">
                                <div className="relative z-1 flex flex-col gap-1.5 w-full">
                                    <p className="flex items-center justify-between text-xs font-medium text-white/90 xl:text-sm">
                                        <span className="flex items-center gap-1.5 truncate text-white">
                                            <span className="size-2 rounded-full bg-[#d8263e] animate-pulse" />
                                            Commandes en cours
                                        </span>
                                        <button 
                                            type="button" 
                                            onClick={() => setShowAmount2(!showAmount2)} 
                                            className="text-white hover:opacity-80 transition-opacity"
                                            title="Masquer/Afficher"
                                        >
                                            {showAmount2 ? <EyeOff className="size-4 text-white" /> : <Eye className="size-4 text-white" />}
                                        </button>
                                    </p>
                                    <h6 className="text-xl leading-[120%] font-bold text-white lg:text-[26px] xl:text-[22px] 2xl:text-[32px]">
                                        <span>{showAmount2 ? '345 000' : '••••••••'}</span>{' '}
                                        <span className="text-white/60 font-normal text-base">FCFA</span>
                                    </h6>
                                </div>
                                <Link 
                                    href={ctaUrl}
                                    className="relative z-1 w-full rounded-full bg-[#FCF8E8] hover:bg-white py-2.5 text-xs text-center font-bold text-[#0d213d] shadow-sm transition-all active:scale-95"
                                >
                                    Voir les expéditions
                                </Link>
                            </div>
                        </motion.div>

                        {/* Card 3: Épicerie & Produits Locaux (Rouge #d8263e) */}
                        <motion.div 
                            initial={{ opacity: 0, y: 50, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            transition={{ duration: 0.6, delay: 0.5 }}
                            whileHover={{ y: -6, scale: 1.02 }}
                            className="w-full max-w-84.75 animate-[float_5.5s_ease-in-out_infinite_2s]"
                        >
                            <div className="relative isolate flex h-auto min-h-34 w-full max-w-84.75 flex-col items-start justify-between gap-4 overflow-hidden rounded-2xl p-4 lg:min-h-38 xl:min-h-34 2xl:min-h-41.75 xl:p-5 bg-[#d8263e] shadow-2xl transition-all">
                                <div className="pointer-events-none absolute -right-6 -bottom-6 size-36 rounded-full bg-white/10 blur-sm select-none" />
                                
                                <div className="relative z-1 flex flex-col gap-1.5 w-full">
                                    <p className="flex items-center justify-between text-xs font-medium text-white/90 xl:text-sm">
                                        <span className="truncate text-white">Épicerie & Produits Locaux</span>
                                        <button 
                                            type="button" 
                                            onClick={() => setShowAmount3(!showAmount3)} 
                                            className="text-white hover:opacity-80 transition-opacity"
                                            title="Masquer/Afficher"
                                        >
                                            {showAmount3 ? <EyeOff className="size-4 text-white" /> : <Eye className="size-4 text-white" />}
                                        </button>
                                    </p>
                                    <h6 className="text-xl leading-[120%] font-bold text-white lg:text-[26px] xl:text-[22px] 2xl:text-[32px]">
                                        <span>{showAmount3 ? '421 350' : '••••••••'}</span>{' '}
                                        <span className="text-white/60 font-normal text-base">FCFA</span>
                                    </h6>
                                </div>
                                <Link 
                                    href={ctaUrl}
                                    className="relative z-1 w-full rounded-full bg-[#FCF8E8] hover:bg-white py-2.5 text-xs text-center font-bold text-[#0d213d] shadow-sm transition-all active:scale-95"
                                >
                                    Retirer mes fonds
                                </Link>
                            </div>
                        </motion.div>

                    </div>

                    {/* Headline and Scannez-moi Row */}
                    <div className="flex w-full items-end justify-between gap-8 xl:gap-12 mt-12 md:mt-20">
                        {/* Left: Two-line Title & Subtitle with motion entrance */}
                        <motion.div 
                            initial={{ opacity: 0, x: -30 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.7, delay: 0.3 }}
                            className="max-w-130 md:max-w-110 md:mt-12 xl:mt-20 2xl:mt-16 xl:max-w-130 2xl:max-w-203.75 flex flex-col gap-4"
                        >
                            {/* High-visibility Seller Access Pill */}
                            <Link 
                                href={dashboardUrl}
                                className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/25 text-xs sm:text-sm font-semibold text-white transition-all w-fit group shadow-lg"
                            >
                                <span className="size-2 rounded-full bg-emerald-400 animate-ping" />
                                <span className="font-bold text-[#FCF8E8]">Espace Vendeur</span>
                                <span className="text-white/40">•</span>
                                <span className="group-hover:text-white transition-colors flex items-center gap-1">
                                    Accéder à votre tableau de bord <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-1" />
                                </span>
                            </Link>

                            <h1 data-hero="title" className="text-[36px] leading-10 font-black text-white md:text-[40px] md:leading-11 xl:text-5xl xl:leading-12 2xl:text-[72px] 2xl:leading-20">
                                <span className="block">Vendez seul.</span>
                                <span className="block">Grandissez ensemble.</span>
                            </h1>
                            <p data-hero="lead" className="max-w-120.5 text-base leading-[160%] font-normal text-white/90 md:text-lg">
                                Vendez via Mobile Money, suivez chaque franc et commande en direct, expédiez dans les 77 communes du Bénin sans quitter votre boutique.
                            </p>

                            {/* Prominent Action Buttons (Visible on Desktop & Mobile) */}
                            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3.5 pt-2">
                                <Link 
                                    href={dashboardUrl}
                                    className="inline-flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-xl bg-[#d8263e] hover:bg-[#b81d32] text-white font-bold text-sm sm:text-base shadow-xl shadow-[#d8263e]/50 transition-all hover:scale-[1.03] active:scale-95 border border-white/20 group"
                                >
                                    <LayoutDashboard className="size-5 shrink-0 transition-transform group-hover:rotate-6" />
                                    <span>Accéder à votre tableau de bord</span>
                                </Link>
                                
                                <Link 
                                    href={ctaUrl}
                                    className="inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl bg-white/10 hover:bg-white/20 backdrop-blur-md text-white font-semibold text-sm sm:text-base border border-white/25 transition-all hover:scale-[1.02]"
                                >
                                    <span>{ctaText}</span>
                                </Link>
                            </div>
                        </motion.div>

                        {/* Right: Scannez-moi tilted note with red curved arrow & QR code */}
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.6, delay: 0.6 }}
                            className="hidden shrink-0 items-end gap-3 lg:flex xl:gap-4"
                        >
                            <div className="flex flex-col items-start transform -translate-y-10 translate-x-6">
                                <span data-hero="scan-me" className="text-lg leading-6 font-bold text-white xl:text-xl transform rotate-[-12.64deg] drop-shadow-md">
                                    Scannez-moi
                                </span>
                                <svg 
                                    viewBox="0 0 121 107" 
                                    fill="none" 
                                    aria-hidden="true" 
                                    className="mt-1 h-auto w-20 xl:w-28 drop-shadow-md"
                                >
                                    <path 
                                        d="M95.1814 93.3591C89.6158 92.9464 85.5057 91.0035 81.2966 87.3535C80.4898 87.0905 81.1198 88.2477 81.2548 88.5771C82.5577 91.4625 86.1267 93.3652 89.0383 94.6846C80.103 95.1204 69.5851 94.0112 62.0773 89.0091C53.2639 83.3871 47.1183 71.8289 51.208 61.6083C57.988 62.5376 65.621 62.0028 71.4226 58.0168C78.4035 52.1835 72.641 44.4244 64.0528 45.7068C57.0875 46.7481 51.1763 51.6762 47.7717 57.7602C21.2419 50.1722 16.3807 21.2052 33.117 1.18022C14.3034 21.0863 19.3399 51.7079 46.5326 60.5293C43.6195 68.1588 45.5565 76.974 50.3142 83.4049C58.6971 95.0333 75.6259 98.8325 89.166 96.1076L95.3068 93.8215Z" 
                                        fill="#d8263e" 
                                        stroke="#d8263e" 
                                        strokeWidth="0" 
                                    />
                                </svg>
                            </div>
                            
                            {/* QR Code Container with Ahizan center badge */}
                            <div className="relative size-24 rounded-2xl xl:size-28 bg-white p-2 shadow-2xl flex items-center justify-center">
                                <svg viewBox="0 0 100 100" className="size-full">
                                    <path d="M0,0 h30 v30 h-30 z M8,8 h14 v14 h-14 z" fill="#0d213d"/>
                                    <path d="M70,0 h30 v30 h-30 z M78,8 h14 v14 h-14 z" fill="#0d213d"/>
                                    <path d="M0,70 h30 v30 h-30 z M8,78 h14 v14 h-14 z" fill="#0d213d"/>
                                    <path d="M35,12 h10 v8 h-10 z M52,12 h8 v8 h-8 z" fill="#d8263e"/>
                                    <path d="M35,35 h30 v8 h-30 z M15,45 h15 v8 h-15 z M75,45 h15 v8 h-15 z" fill="#0d213d"/>
                                    <path d="M42,55 h16 v16 h-16 z" fill="#d8263e"/>
                                    <path d="M35,75 h8 v15 h-8 z M50,75 h15 v8 h-15 z M72,72 h18 v18 h-18 z" fill="#0d213d"/>
                                </svg>
                            </div>
                        </motion.div>

                    </div>

                </div>

                {/* Bottom Marquee */}
                <div className="w-full mt-10 md:mt-12 xl:mt-14 border-t border-white/10 pt-4 bg-[#091524]/60 backdrop-blur-sm">
                    <div className="overflow-hidden w-full">
                        <div className="flex w-max items-center animate-[marquee_20s_linear_infinite] gap-12 text-sm text-white/80 font-medium whitespace-nowrap">
                            {[
                                'MTN Mobile Money Bénin',
                                'Moov Money Bénin',
                                'Celtiis Cash',
                                'Wave Bénin',
                                'FedaPay',
                                'Kkiapay',
                                'DHL Express Bénin',
                                'Bénin Logistique 77 Communes',
                                'Cartes Bancaires Visa & Mastercard'
                            ].concat([
                                'MTN Mobile Money Bénin',
                                'Moov Money Bénin',
                                'Celtiis Cash',
                                'Wave Bénin',
                                'FedaPay',
                                'Kkiapay',
                                'DHL Express Bénin',
                                'Bénin Logistique 77 Communes',
                                'Cartes Bancaires Visa & Mastercard'
                            ]).map((partner, idx) => (
                                <div key={idx} className="flex items-center gap-3">
                                    <span className="size-2 rounded-full bg-[#d8263e] animate-ping" />
                                    <span>{partner}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

            </div>
        </section>
    );
}
