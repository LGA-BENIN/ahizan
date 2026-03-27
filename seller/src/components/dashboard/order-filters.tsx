'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { Search, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

const STATES = [
    { value: '', label: 'Tous les statuts' },
    { value: 'PaymentSettled', label: 'Payé' },
    { value: 'PaymentAuthorized', label: 'Autorisé' },
    { value: 'Shipped', label: 'Expédié' },
    { value: 'Delivered', label: 'Livré' },
    { value: 'Cancelled', label: 'Annulé' },
];

export default function OrderFilters() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [state, setState] = useState(searchParams.get('state') || '');
    const [sort, setSort] = useState(searchParams.get('sort') || 'updatedAt_DESC');

    const applyFilters = (newState?: string, newSort?: string) => {
        const s = newState ?? state;
        const so = newSort ?? sort;
        const params = new URLSearchParams();
        if (s) params.set('state', s);
        if (so) params.set('sort', so);
        router.push(`/dashboard/orders?${params.toString()}`);
    };

    return (
        <div className="flex flex-wrap items-center gap-3 w-full">
            <div className="relative group flex-1 min-w-[160px] sm:flex-none sm:w-auto">
                <select
                    value={state}
                    onChange={(e) => { setState(e.target.value); applyFilters(e.target.value, undefined); }}
                    className="appearance-none h-11 w-full pl-4 pr-10 text-sm font-bold bg-card border border-border rounded-xl focus:ring-2 focus:ring-primary/10 transition-all cursor-pointer hover:bg-muted/50"
                >
                    {STATES.map(s => (
                        <option key={s.value} value={s.value} className="bg-card">{s.label}</option>
                    ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none group-hover:text-foreground transition-colors" />
            </div>

            <div className="relative group flex-1 min-w-[160px] sm:flex-none sm:w-auto">
                <select
                    value={sort}
                    onChange={(e) => { setSort(e.target.value); applyFilters(undefined, e.target.value); }}
                    className="appearance-none h-11 w-full pl-4 pr-10 text-sm font-bold bg-card border border-border rounded-xl focus:ring-2 focus:ring-primary/10 transition-all cursor-pointer hover:bg-muted/50"
                >
                    <option value="updatedAt_DESC" className="bg-card">Plus récentes</option>
                    <option value="updatedAt_ASC" className="bg-card">Plus anciennes</option>
                    <option value="totalWithTax_DESC" className="bg-card">Montant décroissant</option>
                    <option value="totalWithTax_ASC" className="bg-card">Montant croissant</option>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none group-hover:text-foreground transition-colors" />
            </div>
        </div>
    );
}
