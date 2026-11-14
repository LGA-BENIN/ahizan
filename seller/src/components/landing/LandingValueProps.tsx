'use client';

import { Store, CreditCard, BarChart3, Smartphone, ArrowRight } from 'lucide-react';
import Link from 'next/link';

export function LandingValueProps() {
    return (
        <section className="w-full py-20 lg:py-28 bg-[#fafcff]">
            <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 flex flex-col gap-12 lg:gap-16">
                {/* Section Header */}
                <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
                    <div className="space-y-3">
                        <span className="text-xs font-bold uppercase tracking-widest text-[#d8263e] bg-[#d8263e]/10 px-3 py-1 rounded-full">
                            Simplicité & Efficacité
                        </span>
                        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-[#0d213d] tracking-tight leading-tight">
                            Débutez vos ventes en ligne <br className="hidden sm:inline" />
                            sans dépenser un seul franc !
                        </h2>
                    </div>
                    <p className="text-base sm:text-lg text-gray-600 max-w-lg leading-relaxed">
                        Créez votre catalogue, encaissez via Mobile Money et profitez de notre logistique intégrée partout au Bénin.
                    </p>
                </div>

                {/* 3-Card Grid with Paykko Style */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
                    {/* Card 1: Sans tracasseries (Soft Ice Blue #F0F4F8) */}
                    <div className="group relative flex flex-col justify-between overflow-hidden rounded-[2rem] bg-[#F0F4F8] border border-blue-100/60 p-8 sm:p-10 transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl hover:shadow-[#0d213d]/10">
                        {/* Top Illustration Container */}
                        <div className="flex items-center justify-center w-full py-8">
                            <div className="relative size-36 sm:size-44 rounded-3xl bg-white shadow-lg flex items-center justify-center p-6 transition-transform duration-500 group-hover:scale-110">
                                <div className="absolute -top-3 -right-3 size-10 rounded-full bg-[#0d213d] text-white flex items-center justify-center font-bold text-xs shadow-md">
                                    3 min
                                </div>
                                <div className="flex flex-col items-center gap-3 text-center">
                                    <div className="p-3 rounded-2xl bg-[#0d213d]/10 text-[#0d213d]">
                                        <Store className="size-10 sm:size-12" />
                                    </div>
                                    <span className="text-[11px] font-bold text-[#0d213d] uppercase tracking-wider">
                                        Boutique Active
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Card Content */}
                        <div className="space-y-3 mt-4">
                            <h3 className="text-2xl sm:text-3xl font-extrabold text-[#0d213d]">
                                Sans tracasseries techniques
                            </h3>
                            <p className="text-sm sm:text-base text-gray-600 leading-relaxed">
                                Créez votre boutique en 3 minutes avec votre numéro de téléphone. Zéro code, zéro compétence technique, zéro agence à payer.
                            </p>
                        </div>
                    </div>

                    {/* Card 2: 100% Mobile Money (Soft Warm Red #FDF2F3) */}
                    <div className="group relative flex flex-col justify-between overflow-hidden rounded-[2rem] bg-[#FDF2F3] border border-red-100/60 p-8 sm:p-10 transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl hover:shadow-[#d8263e]/10">
                        {/* Top Illustration Container */}
                        <div className="flex items-center justify-center w-full py-8">
                            <div className="relative size-36 sm:size-44 rounded-3xl bg-white shadow-lg flex items-center justify-center p-6 transition-transform duration-500 group-hover:scale-110">
                                <div className="absolute -top-3 -left-3 size-10 rounded-full bg-[#d8263e] text-white flex items-center justify-center font-bold text-xs shadow-md">
                                    100%
                                </div>
                                <div className="flex flex-col items-center gap-3 text-center">
                                    <div className="p-3 rounded-2xl bg-[#d8263e]/10 text-[#d8263e]">
                                        <CreditCard className="size-10 sm:size-12" />
                                    </div>
                                    <span className="text-[11px] font-bold text-[#d8263e] uppercase tracking-wider">
                                        Mobile Money
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Card Content */}
                        <div className="space-y-3 mt-4">
                            <h3 className="text-2xl sm:text-3xl font-extrabold text-[#0d213d]">
                                100 % Mobile Money & Banque
                            </h3>
                            <p className="text-sm sm:text-base text-gray-600 leading-relaxed">
                                MTN MoMo, Moov Money, Celtiis, Wave : vos clients règlent en toute confiance et vous retirez vos gains directement sur votre compte.
                            </p>
                        </div>
                    </div>

                    {/* Card 3: Tout sous vos yeux (Solid Red #d8263e with White Text) */}
                    <div className="group relative flex flex-col justify-between overflow-hidden rounded-[2rem] bg-[#d8263e] text-white p-8 sm:p-10 transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl hover:shadow-[#d8263e]/30 md:col-span-2 lg:col-span-1">
                        {/* Top Illustration Container */}
                        <div className="flex items-center justify-center w-full py-8">
                            <div className="relative size-36 sm:size-44 rounded-3xl bg-white/10 backdrop-blur-md border border-white/20 shadow-xl flex items-center justify-center p-6 transition-transform duration-500 group-hover:scale-110">
                                <div className="flex flex-col items-center gap-3 text-center">
                                    <div className="p-3 rounded-2xl bg-white text-[#d8263e] shadow-md">
                                        <BarChart3 className="size-10 sm:size-12" />
                                    </div>
                                    <span className="text-[11px] font-bold text-white uppercase tracking-wider">
                                        Temps Réel
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Card Content */}
                        <div className="space-y-3 mt-4">
                            <h3 className="text-2xl sm:text-3xl font-extrabold text-white">
                                Tout sous vos yeux
                            </h3>
                            <p className="text-sm sm:text-base text-white/90 leading-relaxed">
                                Ventes, alertes de stock, bordereaux de livraison et reçus automatiques : pilotez votre activité 24h/24 où que vous soyez.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
