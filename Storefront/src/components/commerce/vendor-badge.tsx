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
            className="flex items-center gap-3 p-3 rounded-lg border border-border/50 bg-muted/30 hover:bg-muted/60 transition-colors group"
        >
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Store className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-sm font-medium group-hover:text-primary transition-colors truncate">
                    {vendor.name}
                </p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    {vendor.zone && (
                        <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {vendor.zone}
                        </span>
                    )}
                    {vendor.rating != null && vendor.rating > 0 && (
                        <span className="flex items-center gap-1">
                            <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                            {vendor.rating.toFixed(1)}
                            {vendor.ratingCount != null && (
                                <span>({vendor.ratingCount})</span>
                            )}
                        </span>
                    )}
                </div>
            </div>
            <span className="text-xs text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                Voir la boutique →
            </span>
        </Link>
    );
}
