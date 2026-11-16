'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface Slide {
    id: number;
    title: string;
    description: string;
    bgClass: string;
    textClass: string;
    subTextClass: string;
    badgeLabel: string;
    imageSrc: string;
    isApercu: boolean;
}

const slides: Slide[] = [
    {
        id: 1,
        title: "Votre étal et vos articles réunis en ligne...",
        description: "Photographiez vos articles et publiez-les en direct depuis votre smartphone. Grands marchés modernes, petits marchés de quartier ou commerces indépendants : vos articles sont immédiatement visibles par des milliers de clients.",
        bgClass: "bg-[#F3EFE0]",
        textClass: "text-[#0d213d]",
        subTextClass: "text-gray-700",
        badgeLabel: "Étape 1 : Votre étal digital",
        imageSrc: "/images/screen-apercu.jpg",
        isApercu: true
    },
    {
        id: 2,
        title: "Vos clients commandent sans se déplacer...",
        description: "Plus besoin pour vos clients de braver la circulation ou de chercher votre place au marché. Dès qu'une commande est validée, un livreur passe récupérer le colis à votre étal et l'achemine dans les 77 communes.",
        bgClass: "bg-[#d8263e]",
        textClass: "text-white",
        subTextClass: "text-white/95",
        badgeLabel: "Étape 2 : Réseau 77 Communes",
        imageSrc: "/images/screen-ventes.jpg",
        isApercu: false
    },
    {
        id: 3,
        title: "Encaissez et développez vos revenus en direct.",
        description: "Chaque commande livrée est immédiatement créditée sur votre solde vendeur. Retirez vos gains 24h/24 vers votre compte MTN Mobile Money, Moov Money, Celtiis Cash ou banque sans tracasseries.",
        bgClass: "bg-[#0d213d]",
        textClass: "text-white",
        subTextClass: "text-white/90",
        badgeLabel: "Étape 3 : Paiements Instantanés",
        imageSrc: "/images/screen-portefeuille.jpg",
        isApercu: false
    }
];

function PhoneMockup({ slideIndex }: { slideIndex: number }) {
    const slide = slides[slideIndex] || slides[0];

    return (
        <div className="relative w-68 sm:w-74 xl:w-78 h-[470px] sm:h-[510px] xl:h-[530px] rounded-[2.8rem] bg-[#0c1017] p-2.5 shadow-2xl border-4 border-gray-800 ring-2 ring-white/15 shrink-0 transition-transform hover:scale-[1.01]">
            {/* Left Hardware Buttons (Volume Up/Down) */}
            <div className="absolute -left-1.5 top-20 w-1 h-7 bg-gray-700 rounded-l" />
            <div className="absolute -left-1.5 top-30 w-1 h-7 bg-gray-700 rounded-l" />
            
            {/* Right Hardware Button (Power) */}
            <div className="absolute -right-1.5 top-24 w-1 h-10 bg-gray-700 rounded-r" />

            {/* Top Dynamic Island Notch */}
            <div className="absolute top-4 inset-x-0 mx-auto w-22 h-4.5 bg-black rounded-full z-30 flex items-center justify-between px-2.5 shadow-md">
                <div className="size-2 rounded-full bg-[#181d24] ring-1 ring-white/10" />
                <div className="size-1 rounded-full bg-[#0a182d]" />
            </div>

            {/* Inner Phone Screen */}
            <div className="relative size-full rounded-[2.3rem] overflow-hidden bg-white shadow-inner flex flex-col">
                {/* Subtle Glass Reflection Glare */}
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-white/10 z-20" />

                {/* Cropped Real Screenshot Container */}
                <div className="relative w-full h-full overflow-hidden bg-[#fafafa]">
                    <img 
                        src={slide.imageSrc} 
                        alt={slide.title}
                        className="w-full h-[106%] -mt-[3.5%] object-cover object-top select-none pointer-events-none"
                    />

                    {/* Step 1: Solid white overlay completely masking 'Bonjour, PROVIDIS.' and displaying only 'Bonjour, AGOSSOU.' */}
                    {slide.isApercu && (
                        <div className="absolute top-[10.5%] sm:top-[10.8%] left-[5%] right-[5%] h-[8%] min-h-[46px] bg-white z-20 flex items-end pb-1.5 pl-1 shadow-xs">
                            <h3 className="text-[18px] sm:text-[20px] font-black tracking-tight text-[#111827] leading-none select-none">
                                Bonjour, <span className="text-[#d8263e]">AGOSSOU.</span>
                            </h3>
                        </div>
                    )}
                </div>

                {/* Bottom Home Indicator Bar */}
                <div className="absolute bottom-1.5 inset-x-0 mx-auto w-28 h-1 bg-black/40 rounded-full z-20 pointer-events-none" />
            </div>
        </div>
    );
}

export function LandingStickyHow() {
    const [currentSlide, setCurrentSlide] = useState(0);

    // Single source of truth: listen for ahizan:step-change event from SectionScrollManager
    useEffect(() => {
        const handleStepEvent = (e: Event) => {
            const customEvent = e as CustomEvent<{ nextStep: number }>;
            if (customEvent.detail && typeof customEvent.detail.nextStep === 'number') {
                const target = Math.max(0, Math.min(slides.length - 1, customEvent.detail.nextStep));
                setCurrentSlide(target);
            }
        };

        window.addEventListener('ahizan:step-change', handleStepEvent);
        return () => window.removeEventListener('ahizan:step-change', handleStepEvent);
    }, []);

    const active = slides[currentSlide] || slides[0];

    return (
        <section 
            id="how-it-works"
            data-snap-section="true"
            data-current-step={currentSlide}
            data-total-steps={slides.length}
            className="w-full relative transition-colors duration-500 ease-in-out scroll-mt-18 sm:scroll-mt-20"
        >
            {/* ========================================================= */}
            {/* 1. DESKTOP VIEW (lg:flex) -> Alternating layout (G / D / G) */}
            {/* ========================================================= */}
            <div className={`hidden lg:flex w-full min-h-screen items-center justify-center py-16 transition-colors duration-500 ${active.bgClass}`}>
                <div className="max-w-[1440px] mx-auto px-6 md:px-10 w-full flex items-center justify-between gap-10">
                    
                    {/* LEFT COLUMN: Title on steps 1 & 3, Description on step 2 */}
                    <div className="w-[32%] text-left">
                        <AnimatePresence mode="wait">
                            {currentSlide === 1 ? (
                                // Step 2: Description on the LEFT
                                <motion.div
                                    key="desc-step-2"
                                    initial={{ opacity: 0, x: -30 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -30 }}
                                    transition={{ duration: 0.4 }}
                                    className="space-y-4"
                                >
                                    <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white/20 text-white text-xs font-bold tracking-wide uppercase">
                                        <span>Réseau Express 77 Communes</span>
                                    </div>
                                    <p className={`text-xl leading-relaxed ${active.subTextClass}`}>
                                        {active.description}
                                    </p>
                                </motion.div>
                            ) : (
                                // Steps 1 & 3: Title & Badge on the LEFT
                                <motion.div
                                    key={`title-step-${active.id}`}
                                    initial={{ opacity: 0, x: -30 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -30 }}
                                    transition={{ duration: 0.4 }}
                                    className="space-y-3"
                                >
                                    <span className="inline-block px-3.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-black/10 text-current">
                                        Étape {active.id} sur 3
                                    </span>
                                    <h2 className={`text-4xl xl:text-5xl font-black leading-[1.12] ${active.textClass}`}>
                                        {active.title}
                                    </h2>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* CENTER COLUMN: Realistic Smartphone Mockup with Real App Screenshot */}
                    <div className="w-[34%] flex justify-center">
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={`mockup-${currentSlide}`}
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                transition={{ duration: 0.35 }}
                            >
                                <PhoneMockup slideIndex={currentSlide} />
                            </motion.div>
                        </AnimatePresence>
                    </div>

                    {/* RIGHT COLUMN: Description on steps 1 & 3, Title on step 2 */}
                    <div className="w-[32%] text-left">
                        <AnimatePresence mode="wait">
                            {currentSlide === 1 ? (
                                // Step 2: Title & Badge on the RIGHT
                                <motion.div
                                    key="title-step-2"
                                    initial={{ opacity: 0, x: 30 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: 30 }}
                                    transition={{ duration: 0.4 }}
                                    className="space-y-3"
                                >
                                    <span className="inline-block px-3.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-white/20 text-white">
                                        Étape 2 sur 3
                                    </span>
                                    <h2 className={`text-4xl xl:text-5xl font-black leading-[1.12] ${active.textClass}`}>
                                        {active.title}
                                    </h2>
                                </motion.div>
                            ) : (
                                // Steps 1 & 3: Description on the RIGHT
                                <motion.div
                                    key={`desc-step-${active.id}`}
                                    initial={{ opacity: 0, x: 30 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: 30 }}
                                    transition={{ duration: 0.4 }}
                                    className="space-y-4"
                                >
                                    <p className={`text-xl leading-relaxed ${active.subTextClass}`}>
                                        {active.description}
                                    </p>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                </div>
            </div>

            {/* ========================================================= */}
            {/* 2. MOBILE VIEW (block lg:hidden) -> All 3 Steps Stacked   */}
            {/* ========================================================= */}
            <div className="block lg:hidden w-full divide-y divide-black/10">
                {slides.map((s, idx) => (
                    <div 
                        key={s.id} 
                        className={`w-full py-14 px-6 flex flex-col items-center gap-7 ${s.bgClass}`}
                    >
                        {/* Title and details block */}
                        <div className="w-full text-center space-y-3">
                            <span className="inline-block px-3.5 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-black/10 text-current">
                                {s.badgeLabel}
                            </span>
                            <h2 className={`text-2xl sm:text-3xl font-black leading-tight ${s.textClass}`}>
                                {s.title}
                            </h2>
                            <p className={`text-sm sm:text-base leading-relaxed max-w-md mx-auto ${s.subTextClass}`}>
                                {s.description}
                            </p>
                        </div>

                        {/* Real Smartphone Mockup for this step */}
                        <PhoneMockup slideIndex={idx} />
                    </div>
                ))}
            </div>

        </section>
    );
}
