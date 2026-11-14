'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Menu, X, LayoutDashboard, Download } from 'lucide-react';

interface LandingHeaderProps {
    isLoggedIn?: boolean;
    dashboardUrl?: string;
}

export function LandingHeader({ isLoggedIn = false, dashboardUrl = '/dashboard' }: LandingHeaderProps) {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [isPwaInstalled, setIsPwaInstalled] = useState(true);

    useEffect(() => {
        const checkPwa = () => {
            if (typeof window === 'undefined') return;
            const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
                (window.navigator as any).standalone === true ||
                document.referrer.includes('android-app://') ||
                localStorage.getItem('ahizan_pwa_installed') === 'true';

            setIsPwaInstalled(isStandalone);
        };

        checkPwa();

        const handleInstalled = () => {
            try {
                localStorage.setItem('ahizan_pwa_installed', 'true');
            } catch {}
            setIsPwaInstalled(true);
        };

        window.addEventListener('appinstalled', handleInstalled);
        window.addEventListener('pwa-installed', handleInstalled);

        return () => {
            window.removeEventListener('appinstalled', handleInstalled);
            window.removeEventListener('pwa-installed', handleInstalled);
        };
    }, []);

    return (
        <motion.header 
            initial={{ y: -60, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="fixed inset-x-0 top-0 z-50 w-full bg-[#0d213d] border-b border-white/10 shadow-xl"
        >
            <div className="max-w-[1440px] mx-auto px-6 md:px-10 h-18 sm:h-20 flex items-center justify-between gap-4">
                
                {/* Brand Logo perfectly integrated on #0d213d */}
                <Link href="/" className="shrink-0 transition-transform duration-200 hover:scale-105 flex items-center">
                    <img 
                        src="/logo-dark.png" 
                        alt="Ahizan" 
                        className="h-9 sm:h-11 w-auto object-contain"
                    />
                </Link>

                {/* Desktop Navigation Links */}
                <nav className="hidden lg:block">
                    <ul className="flex items-center gap-7 xl:gap-9">
                        <li>
                            <a className="text-base font-medium text-white/85 hover:text-white transition-colors py-1 relative hover:after:w-full after:w-0 after:h-0.5 after:bg-[#d8263e] after:absolute after:bottom-0 after:left-0 after:transition-all" href="/">
                                Accueil
                            </a>
                        </li>
                        <li>
                            <a className="text-base font-medium text-white/85 hover:text-white transition-colors py-1 relative hover:after:w-full after:w-0 after:h-0.5 after:bg-[#d8263e] after:absolute after:bottom-0 after:left-0 after:transition-all" href="/#advantages">
                                Avantages
                            </a>
                        </li>
                        <li>
                            <a className="text-base font-medium text-white/85 hover:text-white transition-colors py-1 relative hover:after:w-full after:w-0 after:h-0.5 after:bg-[#d8263e] after:absolute after:bottom-0 after:left-0 after:transition-all" href="/#how-it-works">
                                Comment ça marche
                            </a>
                        </li>
                        <li>
                            <a className="text-base font-medium text-white/85 hover:text-white transition-colors py-1 relative hover:after:w-full after:w-0 after:h-0.5 after:bg-[#d8263e] after:absolute after:bottom-0 after:left-0 after:transition-all" href="/#security">
                                Sécurité
                            </a>
                        </li>
                        <li>
                            <a className="text-base font-medium text-white/85 hover:text-white transition-colors py-1 relative hover:after:w-full after:w-0 after:h-0.5 after:bg-[#d8263e] after:absolute after:bottom-0 after:left-0 after:transition-all" href="/#faq">
                                FAQ
                            </a>
                        </li>
                    </ul>
                </nav>

                {/* Right Action: PWA Install + Dashboard Button */}
                <div className="hidden lg:flex items-center gap-3.5">
                    {!isPwaInstalled && (
                        <button
                            type="button"
                            onClick={() => window.dispatchEvent(new CustomEvent('pwa-trigger-install'))}
                            className="inline-flex items-center gap-2 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 px-4 py-2.5 text-xs font-semibold text-white transition-all hover:scale-105 active:scale-95 cursor-pointer"
                            title="Installer l'application sur votre appareil"
                        >
                            <Download className="size-3.5 text-[#d8263e]" />
                            <span>Installer l&apos;application</span>
                        </button>
                    )}

                    <motion.div
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                    >
                        <Link
                            href={isLoggedIn ? dashboardUrl : "/register"}
                            className="inline-flex shrink-0 items-center gap-2.5 rounded-full bg-[#d8263e] hover:bg-[#c01e34] px-6 py-3 text-sm font-bold text-white shadow-lg shadow-[#d8263e]/30 transition-colors"
                        >
                            <LayoutDashboard className="size-4" />
                            <span>{isLoggedIn ? "Mon tableau de bord" : "Créer ma boutique"}</span>
                        </Link>
                    </motion.div>
                </div>

                {/* Mobile Menu & Install Button */}
                <div className="flex items-center gap-2 lg:hidden">
                    {!isPwaInstalled && (
                        <button 
                            type="button"
                            onClick={() => window.dispatchEvent(new CustomEvent('pwa-trigger-install'))}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white text-xs font-bold transition-all active:scale-95 shadow-sm cursor-pointer"
                        >
                            <Download className="size-3.5 text-[#d8263e]" />
                            <span>Installer</span>
                        </button>
                    )}

                    <button 
                        type="button" 
                        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                        aria-label="Ouvrir le menu" 
                        className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white/10 text-white hover:bg-white/20 transition-colors cursor-pointer"
                    >
                        {mobileMenuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
                    </button>
                </div>

            </div>

            {/* Mobile Dropdown Menu */}
            {mobileMenuOpen && (
                <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="lg:hidden bg-[#0d213d] border-b border-white/10 px-6 py-6 space-y-4 shadow-2xl"
                >
                    <nav className="flex flex-col gap-3.5 text-base font-medium">
                        <a href="/" onClick={() => setMobileMenuOpen(false)} className="text-white hover:text-[#d8263e] py-1">Accueil</a>
                        <a href="/#advantages" onClick={() => setMobileMenuOpen(false)} className="text-white hover:text-[#d8263e] py-1">Avantages</a>
                        <a href="/#how-it-works" onClick={() => setMobileMenuOpen(false)} className="text-white hover:text-[#d8263e] py-1">Comment ça marche</a>
                        <a href="/#security" onClick={() => setMobileMenuOpen(false)} className="text-white hover:text-[#d8263e] py-1">Sécurité</a>
                        <a href="/#faq" onClick={() => setMobileMenuOpen(false)} className="text-white hover:text-[#d8263e] py-1">FAQ</a>
                    </nav>
                    <div className="pt-2 space-y-2.5">
                        {!isPwaInstalled && (
                            <button 
                                type="button"
                                onClick={() => {
                                    setMobileMenuOpen(false);
                                    window.dispatchEvent(new CustomEvent('pwa-trigger-install'));
                                }}
                                className="flex items-center justify-center gap-2 w-full py-3 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold text-sm transition-colors cursor-pointer"
                            >
                                <Download className="size-4 text-[#d8263e]" />
                                <span>Installer l&apos;application Ahizan</span>
                            </button>
                        )}

                        <Link 
                            href={isLoggedIn ? dashboardUrl : "/register"}
                            onClick={() => setMobileMenuOpen(false)}
                            className="flex items-center justify-center gap-2 w-full py-3.5 rounded-full bg-[#d8263e] text-white font-bold text-sm shadow-lg shadow-[#d8263e]/30"
                        >
                            <LayoutDashboard className="size-4" />
                            <span>{isLoggedIn ? "Accéder au tableau de bord" : "Créer ma boutique gratuitement"}</span>
                        </Link>
                    </div>
                </motion.div>
            )}
        </motion.header>
    );
}
