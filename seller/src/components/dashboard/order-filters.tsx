'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';

const STATES = [
    { value: '', label: 'Tous les statuts' },
    { value: 'PaymentSettled', label: 'Payé' },
    { value: 'PaymentAuthorized', label: 'Autorisé' },
    { value: 'Shipped', label: 'Expédié' },
    { value: 'Delivered', label: 'Livré' },
    { value: 'Cancelled', label: 'Annulé' },
];

export function OrderFilters() {
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
        <div className="flex flex-wrap gap-3 mb-4">
            <select
                value={state}
                onChange={(e) => { setState(e.target.value); applyFilters(e.target.value, undefined); }}
                className="px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white"
            >
                {STATES.map(s => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                ))}
            </select>
            <select
                value={sort}
                onChange={(e) => { setSort(e.target.value); applyFilters(undefined, e.target.value); }}
                className="px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white"
            >
                <option value="updatedAt_DESC">Plus récentes</option>
                <option value="updatedAt_ASC">Plus anciennes</option>
                <option value="totalWithTax_DESC">Montant décroissant</option>
                <option value="totalWithTax_ASC">Montant croissant</option>
            </select>
        </div>
    );
}
