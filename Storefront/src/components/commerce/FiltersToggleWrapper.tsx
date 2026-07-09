'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { SlidersHorizontal } from 'lucide-react';

interface FiltersToggleWrapperProps {
    sidebar: React.ReactNode;
    children: React.ReactNode;
}

export function FiltersToggleWrapper({ sidebar, children }: FiltersToggleWrapperProps) {
    const [show, setShow] = useState(true);

    return (
        <div className="space-y-6">
            <div className="flex justify-start">
                <Button
                    variant="outline"
                    onClick={() => setShow(!show)}
                    className="flex items-center gap-2 font-bold rounded-xl h-10 px-4 text-xs uppercase tracking-wider bg-card border-border hover:bg-muted text-foreground transition-all"
                >
                    <SlidersHorizontal className="w-4 h-4" />
                    {show ? 'Masquer les filtres' : 'Afficher les filtres'}
                </Button>
            </div>
            <div className="flex flex-col lg:flex-row gap-12">
                {show && (
                    <aside className="w-full lg:w-1/4 shrink-0 animate-in fade-in slide-in-from-left duration-300">
                        <div className="sticky top-28">
                            {sidebar}
                        </div>
                    </aside>
                )}
                <div className={`flex-grow transition-all duration-300 ${show ? 'lg:w-3/4' : 'w-full'}`}>
                    {children}
                </div>
            </div>
        </div>
    );
}
