"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { Search, MapPin, Star, Store, ArrowRight, CheckCircle2 } from 'lucide-react';

interface Vendor {
    id: string;
    name: string;
    description?: string;
    zone?: string;
    address?: string;
    rating?: number;
    ratingCount?: number;
    logo?: { preview: string } | null;
    coverImage?: { preview: string } | null;
}

interface VendorsListClientProps {
    initialVendors: Vendor[];
}

export function VendorsListClient({ initialVendors }: VendorsListClientProps) {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedZone, setSelectedZone] = useState('all');

    // Extract all unique zones for filter dropdown
    const zones = ['all', ...Array.from(new Set(initialVendors.map(v => v.zone).filter(Boolean)))];

    // Filter vendors locally
    const filteredVendors = initialVendors.filter(vendor => {
        const matchesSearch = vendor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (vendor.description && vendor.description.toLowerCase().includes(searchTerm.toLowerCase()));
        const matchesZone = selectedZone === 'all' || vendor.zone === selectedZone;
        return matchesSearch && matchesZone;
    });

    return (
        <div className="space-y-8">
            {/* Search and Filter Bar */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/60 dark:border-slate-700/50 p-4 shadow-sm flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Search className="h-5 w-5 text-slate-400" />
                    </div>
                    <input
                        type="text"
                        placeholder="Rechercher une boutique par nom ou description..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="block w-full pl-10 pr-3 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl leading-5 bg-slate-50 dark:bg-slate-900/50 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary sm:text-sm transition-all"
                    />
                </div>
                <div className="w-full md:w-64">
                    <select
                        value={selectedZone}
                        onChange={(e) => setSelectedZone(e.target.value)}
                        className="block w-full px-3 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl leading-5 bg-slate-50 dark:bg-slate-900/50 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary sm:text-sm transition-all"
                    >
                        <option value="all">Toutes les zones</option>
                        {zones.filter(z => z !== 'all').map(zone => (
                            <option key={zone} value={zone}>{zone}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Grid of Vendors */}
            {filteredVendors.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredVendors.map((vendor) => {
                        const logoUrl = vendor.logo?.preview || null;
                        const coverUrl = vendor.coverImage?.preview || null;
                        const hasRating = typeof vendor.rating === 'number' && vendor.rating > 0;

                        return (
                            <Link
                                key={vendor.id}
                                href={`/vendor/${vendor.id}`}
                                className="group bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/60 dark:border-slate-700/50 overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col h-full no-underline"
                            >
                                {/* Cover Image Header */}
                                <div className="h-32 w-full bg-slate-900 relative overflow-hidden flex-shrink-0">
                                    {coverUrl ? (
                                        <img
                                            src={coverUrl}
                                            alt={`${vendor.name} Cover`}
                                            className="w-full h-full object-cover opacity-85 group-hover:scale-105 transition-transform duration-500"
                                        />
                                    ) : (
                                        <div className="w-full h-full bg-gradient-to-r from-slate-800 to-slate-900 flex items-center justify-center opacity-70">
                                            <Store className="h-8 w-8 text-slate-500" />
                                        </div>
                                    )}
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                                </div>

                                {/* Content Body */}
                                <div className="p-6 pt-0 relative flex-1 flex flex-col">
                                    {/* Logo circular overlapping the cover */}
                                    <div className="h-16 w-16 rounded-2xl border-4 border-white dark:border-slate-800 bg-white shadow-md flex items-center justify-center overflow-hidden -mt-8 mb-4 relative z-10">
                                        {logoUrl ? (
                                            <img
                                                src={logoUrl}
                                                alt={`${vendor.name} Logo`}
                                                className="h-full w-full object-cover"
                                            />
                                        ) : (
                                            <Store className="h-6 w-6 text-slate-400" />
                                        )}
                                    </div>

                                    {/* Name and Certification */}
                                    <div className="flex items-center gap-1.5 mb-1">
                                        <h3 className="font-black text-lg text-slate-955 dark:text-white line-clamp-1 group-hover:text-primary transition-colors">
                                            {vendor.name}
                                        </h3>
                                        <span title="Vendeur Certifié" className="flex-shrink-0">
                                            <CheckCircle2 className="h-4 w-4 text-blue-500 fill-blue-500/10" />
                                        </span>
                                    </div>

                                    {/* Ratings & Zone */}
                                    <div className="flex items-center gap-3 text-xs font-semibold text-slate-500 dark:text-slate-400 mb-4 flex-wrap">
                                        {(vendor.zone || vendor.address) && (
                                            <span className="flex items-center gap-1">
                                                <MapPin className="h-3.5 w-3.5 text-slate-400" />
                                                {vendor.zone || vendor.address}
                                            </span>
                                        )}
                                        {hasRating && (
                                            <span className="flex items-center gap-1 text-yellow-500">
                                                <Star className="h-3.5 w-3.5 fill-yellow-500" />
                                                <span className="text-slate-700 dark:text-slate-300 font-bold">{vendor.rating?.toFixed(1)}</span>
                                                <span className="text-slate-400">({vendor.ratingCount})</span>
                                            </span>
                                        )}
                                    </div>

                                    {/* Description */}
                                    {vendor.description && (
                                        <p className="text-slate-600 dark:text-slate-400 text-xs leading-relaxed line-clamp-2 mb-6">
                                            {vendor.description}
                                        </p>
                                    )}

                                    {/* Footer Link */}
                                    <div className="mt-auto pt-4 border-t border-slate-100 dark:border-slate-700/50 flex items-center justify-between text-xs font-bold text-primary group-hover:text-red-700 transition-colors">
                                        <span>Visiter la boutique</span>
                                        <ArrowRight className="h-4 w-4 transform group-hover:translate-x-1 transition-transform" />
                                    </div>
                                </div>
                            </Link>
                        );
                    })}
                </div>
            ) : (
                <div className="text-center py-16 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/60 dark:border-slate-700/50 p-8 shadow-sm">
                    <Store className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                    <h3 className="font-bold text-lg text-slate-900 dark:text-white mb-2">Aucune boutique trouvée</h3>
                    <p className="text-slate-500 dark:text-slate-400 text-sm max-w-sm mx-auto">
                        Nous n&apos;avons trouvé aucune boutique correspondant à vos critères de recherche. Essayez d&apos;autres mots clés.
                    </p>
                </div>
            )}
        </div>
    );
}
