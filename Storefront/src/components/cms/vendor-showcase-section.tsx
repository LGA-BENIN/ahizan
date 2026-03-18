import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';

interface VendorItem {
    id: string;
    name: string;
    logoUrl?: string;
    productCount?: number;
}

interface VendorShowcaseProps {
    title?: string;
    description?: string;
    layout?: 'grid' | 'carousel';
    vendors: VendorItem[];
}

export function VendorShowcaseSection({
    title = "Vendeurs Vedettes",
    description,
    layout = 'grid',
    vendors
}: VendorShowcaseProps) {
    if (!vendors || vendors.length === 0) return null;

    return (
        <section className="py-16 my-8 bg-card/10 border-y border-border/40">
            <div className="container mx-auto px-4">
                <div className="flex flex-col md:flex-row justify-between items-end mb-12 gap-6">
                    <div className="max-w-xl">
                        <h2 className="text-3xl font-black tracking-tight mb-2 uppercase">{title}</h2>
                        {description && <p className="text-muted-foreground font-medium">{description}</p>}
                    </div>
                    <Button asChild variant="outline" className="rounded-full px-8 font-bold hover:bg-primary hover:text-white transition-all">
                        <Link href="/vendors">Découvrir tous les vendeurs</Link>
                    </Button>
                </div>

                <div className={`grid gap-8 ${layout === 'grid' ? 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6' : 'grid-cols-2 md:grid-cols-3'}`}>
                    {vendors.map((vendor) => (
                        <Link
                            key={vendor.id}
                            href={`/vendors/${vendor.id}`}
                            className="flex flex-col items-center p-8 bg-white rounded-3xl border border-border shadow-sm hover:shadow-2xl hover:-translate-y-2 hover:border-primary/30 transition-all group"
                        >
                            <div className="w-28 h-28 relative mb-6 bg-muted rounded-full overflow-hidden border-8 border-muted shadow-inner group-hover:border-primary/10 transition-colors">
                                {vendor.logoUrl ? (
                                    <Image
                                        src={vendor.logoUrl}
                                        alt={vendor.name}
                                        fill
                                        className="object-cover group-hover:scale-110 transition-transform duration-500"
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-3xl font-black text-primary/40 bg-primary/5 uppercase">
                                        {vendor.name.charAt(0)}
                                    </div>
                                )}
                            </div>
                            <h3 className="font-bold text-center group-hover:text-primary transition-colors text-lg leading-tight mb-1">{vendor.name}</h3>
                            {vendor.productCount !== undefined && (
                                <span className="text-[10px] font-black uppercase tracking-tighter text-muted-foreground bg-muted px-2 py-1 rounded-md">
                                    {vendor.productCount} produits
                                </span>
                            )}
                        </Link>
                    ))}
                </div>
            </div>
        </section>
    );
}
