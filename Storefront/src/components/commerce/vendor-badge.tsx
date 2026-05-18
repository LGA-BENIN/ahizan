'use client';

import Link from 'next/link';
import { Star, MapPin, Store } from 'lucide-react';

interface VendorBadgeProps {
    vendor: {
        id: string;
        name: string;
        zone?: string | null;
        rating?: number | null;
        ratingCount?: number | null;
    } | null;
}

export function VendorBadge({ vendor }: VendorBadgeProps) {
    if (!vendor) return null;

    return (
        <Link
            href={`/vendor/${vendor.id}`}
            className="flex items-center gap-2 p-2 rounded-lg border border-border/40 bg-muted/20 hover:bg-muted/40 transition-colors group"
        >
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Store className="w-4 h-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-xs font-bold group-hover:text-primary transition-colors truncate uppercase tracking-tight">
                    Vendeur: {vendor.name}
                </p>
                <div className="flex items-center gap-2 text-[10px] text-muted-foreground font-medium">
                    {vendor.zone && (
                        <span className="flex items-center gap-0.5">
                            <MapPin className="w-2.5 h-2.5" />
                            {vendor.zone}
                        </span>
                    )}
                    {vendor.rating != null && vendor.rating > 0 && (
                        <span className="flex items-center gap-0.5">
                            <Star className="w-2.5 h-2.5 fill-yellow-400 text-yellow-400" />
                            {vendor.rating.toFixed(1)}
                            {vendor.ratingCount != null && (
                                <span className="opacity-70">({vendor.ratingCount})</span>
                            )}
                        </span>
                    )}
                </div>
            </div>
            <span className="text-[10px] font-bold text-primary opacity-0 group-hover:opacity-100 transition-opacity pr-1">
                Boutique →
            </span>
        </Link>
    );
}
