'use client';

import { useState } from 'react';
import { Plus, Minus } from 'lucide-react';

interface FaqItem {
    question: string;
    answer: string;
}

export function LandingFaq() {
    const [openIndex, setOpenIndex] = useState<number | null>(0);

    const faqs: FaqItem[] = [
        {
            question: "Comment Ahizan m'aide si mon marché a été réorganisé ou déplacé ?",
            answer: "C'est la mission première d'Ahizan ! Que vous soyez installé dans l'un des nouveaux marchés modernes, dans un petit marché de quartier ou en boutique indépendante, Ahizan réunit tous les marchés sur une seule plateforme. Vos anciens clients vous retrouvent en un clic et de nouveaux acheteurs de tout le pays découvrent vos articles chaque jour."
        },
        {
            question: "Combien coûte l'ouverture de mon étal en ligne sur Ahizan ?",
            answer: "L'ouverture et la gestion de votre boutique sur Ahizan sont 100% gratuites. Aucun abonnement mensuel, aucun loyer numérique. Nous ne prélevons une commission minime que lorsque vous réalisez une vente effective."
        },
        {
            question: "Comment se passe la livraison si je vends au marché physique ?",
            answer: "Vous n'avez pas besoin de quitter votre étal ! Dès qu'une commande est confirmée et préparée, notre livreur partenaire passe directement récupérer le colis à votre point de vente au marché et assure la livraison sécurisée au client partout au Bénin."
        },
        {
            question: "Quand et comment puis-je retirer mes gains ?",
            answer: "Dès que le client reçoit son colis, vos fonds sont crédités sur votre portefeuille vendeur. Vous pouvez demander un retrait immédiat vers votre compte MTN Mobile Money, Moov Money, Celtiis Cash ou par virement bancaire 24h/24."
        },
        {
            question: "Puis-je vendre si je suis dans un petit marché de quartier ou à domicile ?",
            answer: "Oui, absolument ! Ahizan a été conçu pour rassembler TOUS les commerces béninois : grands marchés (Dantokpa, Ouando, Missèbo), nouveaux marchés urbains (Cadjèhoun, Sainte-Rita, Gbégamey, Tokplegbe), petits marchés de quartier, artisans et créateurs à domicile."
        },
        {
            question: "Mes clients peuvent-ils payer par Mobile Money ?",
            answer: "Oui, nous acceptons tous les principaux moyens de paiement utilisés au Bénin : MTN MoMo, Moov Money, Celtiis, Wave ainsi que les cartes Visa et Mastercard. Tout est automatisé."
        }
    ];

    const toggle = (index: number) => {
        setOpenIndex(openIndex === index ? null : index);
    };

    return (
        <section id="faq" data-snap-section="true" className="w-full py-20 lg:py-28 bg-[#fafcff] border-t border-gray-100">
            <div className="max-w-[1440px] mx-auto px-6 md:px-10 flex flex-col lg:flex-row lg:items-start lg:justify-between gap-12 lg:gap-16">
                
                {/* Left Side: Big Bold Heading */}
                <div className="lg:w-[35%] space-y-4">
                    <span className="text-xs font-bold uppercase tracking-widest text-[#d8263e] bg-[#d8263e]/10 px-3 py-1 rounded-full">
                        Questions fréquentes
                    </span>
                    <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-[#0d213d] tracking-tight leading-tight">
                        Tout ce que <br className="hidden lg:inline" />
                        vous voulez <br className="hidden lg:inline" />
                        savoir.
                    </h2>
                    <p className="text-base text-gray-600 max-w-sm leading-relaxed">
                        Des réponses claires pour vous lancer dans les meilleures conditions. Notre équipe est aussi joignable à tout moment.
                    </p>
                </div>

                {/* Right Side: Accordion Items */}
                <div className="lg:w-[65%] flex flex-col gap-3.5">
                    {faqs.map((faq, index) => {
                        const isOpen = openIndex === index;
                        return (
                            <div 
                                key={index}
                                className={`w-full overflow-hidden rounded-2xl border transition-all duration-200 ${
                                    isOpen 
                                        ? 'bg-white border-[#d8263e]/30 shadow-md' 
                                        : 'bg-white border-gray-200/80 hover:border-gray-300'
                                }`}
                            >
                                <button
                                    type="button"
                                    onClick={() => toggle(index)}
                                    aria-expanded={isOpen}
                                    className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left transition-colors"
                                >
                                    <span className="text-base sm:text-lg font-bold text-[#0d213d]">
                                        {faq.question}
                                    </span>
                                    <div 
                                        className={`size-8 shrink-0 rounded-full flex items-center justify-center transition-transform duration-300 ${
                                            isOpen ? 'bg-[#d8263e] text-white rotate-180' : 'bg-gray-100 text-[#0d213d]'
                                        }`}
                                    >
                                        {isOpen ? <Minus className="size-4" /> : <Plus className="size-4" />}
                                    </div>
                                </button>

                                <div 
                                    className={`grid transition-[grid-template-rows] duration-300 ease-out ${
                                        isOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
                                    }`}
                                >
                                    <div className="overflow-hidden">
                                        <p className="px-6 pb-6 text-sm sm:text-base text-gray-600 leading-relaxed pt-1 border-t border-gray-50">
                                            {faq.answer}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

            </div>
        </section>
    );
}
