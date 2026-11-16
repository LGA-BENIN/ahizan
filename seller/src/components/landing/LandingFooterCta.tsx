'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { LayoutDashboard, ArrowRight } from 'lucide-react';

interface LandingFooterCtaProps {
    ctaUrl: string;
    ctaText: string;
}

export function LandingFooterCta({ ctaUrl, ctaText }: LandingFooterCtaProps) {
    return (
        <footer id="footer" data-snap-section="true" className="w-full bg-[#0d213d] py-16 md:py-20 xl:py-24 text-white">
            <div className="max-w-[1440px] mx-auto px-6 md:px-10 flex flex-col items-start">
                
                {/* Giant CTA Card with Authentic Ahizan Footer Background */}
                <motion.div 
                    initial={{ opacity: 0, y: 50, scale: 0.97 }}
                    whileInView={{ opacity: 1, y: 0, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.7 }}
                    data-join-card="true" 
                    className="relative isolate flex h-125 w-full flex-col items-center justify-center overflow-hidden rounded-4xl px-5 md:h-150 md:px-10 xl:h-170 text-center shadow-2xl border border-white/10"
                >
                    {/* Background Lifestyle Image of Beninese Store Owner Packaging Products */}
                    <picture className="absolute inset-0 size-full -z-2">
                        <source srcSet="/images/ahizan-footer-bg.webp" type="image/webp" />
                        <img 
                            src="/images/ahizan-footer-bg.jpg" 
                            alt="Commerçante préparant ses commandes sur Ahizan" 
                            aria-hidden="true" 
                            loading="lazy"
                            className="size-full object-cover" 
                        />
                    </picture>
                    
                    {/* Dark Brand Overlay */}
                    <div aria-hidden="true" className="absolute inset-0 -z-1 bg-[#0d213d]/70 backdrop-blur-[2px]" />

                    {/* Headline & Description */}
                    <h2 className="max-w-150 text-center text-[32px] leading-10 font-black text-white md:text-5xl md:leading-14 xl:text-[68px] xl:leading-18">
                        Tous les marchés du Bénin réunis sur Ahizan
                    </h2>
                    <p className="mt-4 max-w-130 text-center text-base leading-[160%] font-normal text-white/95 md:text-lg">
                        Mettez votre étal en ligne en 3 minutes et vendez à des milliers de clients partout au Bénin en toute confiance !
                    </p>

                    {/* Action CTA Button */}
                    <Link 
                        href={ctaUrl}
                        className="inline-flex items-center justify-center gap-3 mt-8 px-8 py-4.5 rounded-2xl bg-[#d8263e] hover:bg-[#b81d32] text-white font-bold text-base md:text-lg shadow-2xl shadow-[#d8263e]/50 transition-all hover:scale-105 active:scale-95 border border-white/20 group"
                    >
                        <LayoutDashboard className="size-5 md:size-6 shrink-0 transition-transform group-hover:rotate-6" />
                        <span>{ctaText}</span>
                        <ArrowRight className="size-5 md:size-6 shrink-0 transition-transform group-hover:translate-x-1" />
                    </Link>
                </motion.div>

                {/* Footer Navigation Bar with clean logo-dark.png */}
                <div className="mt-12 flex w-full flex-col items-center gap-8 md:mt-16 md:flex-row md:justify-between md:gap-10 xl:mt-20">
                    <Link href="/">
                        <img 
                            src="/logo-dark.png" 
                            alt="Ahizan" 
                            className="h-10 w-auto md:h-12 xl:h-14 object-contain" 
                        />
                    </Link>
                    <nav>
                        <ul className="flex flex-wrap items-center justify-center gap-x-6 gap-y-3 md:gap-8 text-sm md:text-base font-medium">
                            <li><a className="text-white hover:text-white/80 transition-colors" href="/">Accueil</a></li>
                            <li><a className="text-white hover:text-white/80 transition-colors" href="/#advantages">Avantages</a></li>
                            <li><a className="text-white hover:text-white/80 transition-colors" href="/#how-it-works">Comment ça marche</a></li>
                            <li><a className="text-white hover:text-white/80 transition-colors" href="/#faq">FAQ</a></li>
                        </ul>
                    </nav>
                    <p className="text-center text-sm leading-5 font-normal text-white/80 md:text-base">
                        Copyright {new Date().getFullYear()}© Ahizan
                    </p>
                </div>

                {/* Bottom Legal Notice */}
                <div className="mt-10 flex w-full flex-col items-center gap-6 border-t border-white/12 pt-8 md:mt-12 md:flex-row md:justify-between md:gap-10 text-xs md:text-sm text-white/70">
                    <p>L'infrastructure numérique des marchés, commerçants et artisans du Bénin.</p>
                    <div className="flex items-center gap-6">
                        <a className="hover:text-white transition-colors" href="/cgu">Conditions générales d'utilisation</a>
                        <a className="hover:text-white transition-colors" href="/privacy">Confidentialité</a>
                    </div>
                </div>

            </div>
        </footer>
    );
}
