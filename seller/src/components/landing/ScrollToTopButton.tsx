'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowUp } from 'lucide-react';

export function ScrollToTopButton() {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        const toggleVisibility = () => {
            if (window.scrollY > 400) {
                setIsVisible(true);
            } else {
                setIsVisible(false);
            }
        };

        window.addEventListener('scroll', toggleVisibility, { passive: true });
        toggleVisibility();

        return () => window.removeEventListener('scroll', toggleVisibility);
    }, []);

    const scrollToTop = () => {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    };

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.button
                    initial={{ opacity: 0, scale: 0.8, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.8, y: 20 }}
                    transition={{ duration: 0.25 }}
                    onClick={scrollToTop}
                    aria-label="Remonter en haut de la page"
                    title="Remonter en haut"
                    className="fixed bottom-6 right-6 md:bottom-8 md:right-8 z-40 size-12 sm:size-13 rounded-full bg-[#d8263e] hover:bg-[#b81d32] text-white shadow-2xl shadow-[#d8263e]/50 border-2 border-white/20 flex items-center justify-center transition-transform hover:scale-110 active:scale-95 cursor-pointer group"
                >
                    <ArrowUp className="size-5 sm:size-6 transition-transform group-hover:-translate-y-1" />
                </motion.button>
            )}
        </AnimatePresence>
    );
}
