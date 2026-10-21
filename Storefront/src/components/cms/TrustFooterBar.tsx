"use client";

import React from 'react';
import { Smartphone, Truck, ShieldCheck, Headphones, RefreshCw, Award } from 'lucide-react';
import * as LucideIcons from 'lucide-react';

export interface TrustItem {
    icon?: string;
    title: string;
    subtitle: string;
}

export interface TrustFooterBarProps {
    title?: string;
    subtitle?: string;
    items?: TrustItem[];
    className?: string;
}

const DEFAULT_TRUST_ITEMS: TrustItem[] = [
    {
        icon: "Smartphone",
        title: "Paiement Mobile Sécurisé",
        subtitle: "MTN MoMo, Moov Money, Celtiis et Cartes"
    },
    {
        icon: "Truck",
        title: "Livraison Locale Rapide",
        subtitle: "Cotonou, Calavi, Porto-Novo et tout le Bénin"
    },
    {
        icon: "ShieldCheck",
        title: "Garantie Authenticité",
        subtitle: "Commerçants certifiés & produits vérifiés"
    },
    {
        icon: "Headphones",
        title: "Assistance Locale 7j/7",
        subtitle: "Support client WhatsApp & appel dédié"
    }
];

export function TrustFooterBar({
    title,
    subtitle,
    items = DEFAULT_TRUST_ITEMS,
    className = ""
}: TrustFooterBarProps) {
    const displayItems = items && items.length > 0 ? items : DEFAULT_TRUST_ITEMS;
    const cleanTitle = title ? title.replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}]/gu, '').trim() : '';
    const cleanSubtitle = subtitle ? subtitle.replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}]/gu, '').trim() : '';

    return (
        <section className={`w-full my-6 py-6 sm:py-8 bg-card border-y border-border/60 rounded-xl md:rounded-2xl shadow-xs ${className}`}>
            <div className="container mx-auto px-4">
                {(cleanTitle || cleanSubtitle) && (
                    <div className="text-center mb-6 max-w-2xl mx-auto">
                        {cleanTitle && <h2 className="text-lg md:text-xl font-bold text-gray-900 tracking-tight">{cleanTitle}</h2>}
                        {cleanSubtitle && <p className="text-xs text-gray-500 mt-0.5">{cleanSubtitle}</p>}
                    </div>
                )}

                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 md:gap-8">
                    {displayItems.map((item, idx) => {
                        const IconComponent = (LucideIcons as any)[item.icon || 'ShieldCheck'] || ShieldCheck;
                        const itemTitle = item.title ? item.title.replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}]/gu, '').trim() : '';
                        const itemSubtitle = item.subtitle ? item.subtitle.replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}]/gu, '').trim() : '';

                        return (
                            <div 
                                key={idx} 
                                className="group flex flex-col sm:flex-row items-center sm:items-start text-center sm:text-left gap-3 p-3 sm:p-4 rounded-xl hover:bg-slate-50 transition-all duration-300"
                            >
                                <div className="w-12 h-12 rounded-full bg-red-50 text-red-600 flex items-center justify-center shrink-0 border border-red-100 group-hover:scale-105 group-hover:bg-red-600 group-hover:text-white transition-all duration-300 shadow-xs">
                                    <IconComponent className="w-5 h-5 stroke-[1.75]" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className="font-bold text-xs sm:text-sm text-gray-900 tracking-tight group-hover:text-red-600 transition-colors line-clamp-1">
                                        {itemTitle}
                                    </h3>
                                    <p className="text-[11px] sm:text-xs text-gray-500 font-medium mt-0.5 leading-snug line-clamp-2">
                                        {itemSubtitle}
                                    </p>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </section>
    );
}

export default TrustFooterBar;
