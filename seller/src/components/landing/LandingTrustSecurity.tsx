'use client';

import { motion } from 'framer-motion';

export function LandingTrustSecurity() {
    return (
        <section id="security" data-snap-section="true" className="w-full py-16 md:py-24 bg-[#FCFCFC]">
            <div className="max-w-[1440px] mx-auto px-6 md:px-10 space-y-12">
                <motion.div 
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6 }}
                    className="text-center max-w-2xl mx-auto space-y-2"
                >
                    <span className="text-xs font-bold uppercase tracking-widest text-[#d8263e] bg-[#d8263e]/10 px-3 py-1 rounded-full">
                        Sérénité & Confiance Locale
                    </span>
                    <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-[#0d213d] tracking-tight">
                        La confiance des marchés, la sécurité du digital.
                    </h2>
                    <p className="text-base text-gray-600">
                        Nous protégeons vos articles, vos recettes Mobile Money et assurons la livraison traçable à vos clients.
                    </p>
                </motion.div>

                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                    
                    {/* Card 1: Marchands & Clients vérifiés */}
                    <motion.div 
                        initial={{ opacity: 0, x: -40 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.6 }}
                        whileHover={{ y: -6, scale: 1.01 }}
                        className="flex flex-col items-start justify-center overflow-hidden rounded-3xl min-h-100 group bg-[#F3EFE0] p-6 sm:p-8 shadow-sm hover:shadow-xl transition-shadow"
                    >
                        <div className="flex w-full flex-col items-center justify-center py-4">
                            <img 
                                alt="Identités vérifiées" 
                                className="transition-transform duration-500 group-hover:scale-105 max-h-full object-contain h-56 w-auto" 
                                src="https://d23psjls4f6wzo.cloudfront.net/images/verified-id.svg" 
                            />
                        </div>
                        <div className="flex flex-col items-start justify-start gap-2 p-3">
                            <h6 className="text-2xl leading-8 font-black md:text-[28px] md:leading-9 text-[#0d213d]">
                                Marchands & Clients vérifiés
                            </h6>
                            <p className="text-sm leading-[160%] font-normal md:text-base text-gray-700">
                                Chaque vendeur et chaque acheteur sont identifiés. La réputation de votre étal est protégée et vos transactions s'effectuent en toute sécurité.
                            </p>
                        </div>
                    </motion.div>

                    {/* Card 2: Tout est tracé */}
                    <motion.div 
                        initial={{ opacity: 0, x: 40 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.6 }}
                        whileHover={{ y: -6, scale: 1.01 }}
                        className="flex flex-col items-start justify-center overflow-hidden rounded-3xl min-h-100 group bg-[#d8263e] p-6 sm:p-8 text-white shadow-xl hover:shadow-2xl transition-shadow"
                    >
                        <div className="flex w-full flex-col items-center justify-center py-4">
                            <img 
                                alt="Tout est tracé" 
                                className="transition-transform duration-500 group-hover:scale-105 max-h-full object-contain h-56 w-auto" 
                                src="https://d23psjls4f6wzo.cloudfront.net/images/all-well-followed.svg" 
                            />
                        </div>
                        <div className="flex flex-col items-start justify-start gap-2 p-3">
                            <h6 className="text-2xl leading-8 font-black md:text-[28px] md:leading-9 text-white">
                                Chaque vente est tracée
                            </h6>
                            <p className="text-sm leading-[160%] font-normal md:text-base text-white/90">
                                Bordereau de livraison, confirmation de remise au client et reçu électronique immédiat. Vos recettes sont garanties noir sur blanc.
                            </p>
                        </div>
                    </motion.div>

                </div>
            </div>
        </section>
    );
}
