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
            question: "Combien coûte l'ouverture d'une boutique sur Ahizan ?",
            answer: "L'ouverture et la gestion de votre boutique sur Ahizan sont 100% gratuites. Aucun abonnement mensuel, aucun frais de dossier. Nous ne prélevons une commission minime que lorsque vous réalisez une vente effective."
        },
        {
            question: "Comment se passe la livraison de mes commandes ?",
            answer: "Dès qu'une commande est confirmée et payée, notre réseau logistique prend le relais. Un livreur partenaire passe récupérer le colis préparé à votre adresse et assure l'acheminement sécurisé chez votre client, partout au Bénin."
        },
        {
            question: "Quand et comment puis-je retirer mes gains ?",
            answer: "Dès la confirmation de livraison, les fonds sont immédiatement crédités sur votre solde vendeur. Vous pouvez déclencher un virement instantané vers votre compte MTN Mobile Money, Moov Money, Celtiis Cash ou par virement bancaire 24h/24."
        },
        {
            question: "Quels documents sont nécessaires pour m'inscrire ?",
            answer: "Pour vous inscrire et débuter, une simple pièce d'identité valide (CIP, CNI, Passeport ou permis) et un numéro de téléphone Mobile Money suffisent. Votre compte est activé en quelques minutes."
        },
        {
            question: "Puis-je vendre si je n'ai pas de magasin physique ?",
            answer: "Oui, tout à fait ! Que vous soyez commerçant avec pignon sur rue, créateur à domicile, grossiste ou artisan, Ahizan est fait pour vous. Nos transporteurs viennent ramasser vos commandes à l'adresse de votre choix."
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
