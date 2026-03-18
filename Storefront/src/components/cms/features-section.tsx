"use client";

import React from 'react';
import * as Icons from 'lucide-react';

interface FeatureItem {
    title: string;
    description: string;
    icon?: string;
}

interface FeaturesSectionProps {
    title?: string;
    description?: string;
    features: FeatureItem[];
}

export function FeaturesSection({ title, description, features }: FeaturesSectionProps) {
    if (!features || features.length === 0) return null;

    return (
        <section className="py-10 bg-muted/20 border-y border-border/40 overflow-hidden relative">
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full translate-x-1/2 -translate-y-1/2 blur-3xl" />

            <div className="container mx-auto px-4 relative z-10">
                {(title || description) && (
                    <div className="mb-16 text-center max-w-3xl mx-auto space-y-4">
                        {title && <h2 className="text-2xl md:text-3xl font-black tracking-tighter uppercase italic pr-2">{title}</h2>}
                        {description && <p className="text-muted-foreground font-medium text-base">{description}</p>}
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
                    {features.map((feature, idx) => {
                        // Dynamically resolve icon from lucide-react
                        const IconComponent = (Icons as any)[feature.icon || 'Check'] || Icons.Check;

                        return (
                            <div
                                key={idx}
                                className="group p-8 bg-card rounded-[2.5rem] border border-border/50 shadow-sm hover:shadow-2xl hover:border-primary/20 hover:-translate-y-2 transition-all duration-500 text-center"
                            >
                                <div className="w-14 h-14 mx-auto bg-primary/5 rounded-[2rem] flex items-center justify-center mb-8 border border-primary/10 group-hover:bg-primary group-hover:text-white transition-all duration-500 group-hover:rotate-6 shadow-inner">
                                    <IconComponent className="w-7 h-7 stroke-[2.5px]" />
                                </div>
                                <h3 className="text-xl font-black mb-3 tracking-tight group-hover:text-primary transition-colors italic">{feature.title}</h3>
                                <p className="text-muted-foreground font-medium leading-relaxed">{feature.description}</p>
                            </div>
                        );
                    })}
                </div>
            </div>
        </section>
    );
}
