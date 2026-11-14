import { rawQuery } from '@/lib/vendure/raw-api';
import { Metadata } from 'next';
import { VendorsListClient } from './vendors-list-client';
import { Store, ShieldCheck, MapPin, Sparkles } from 'lucide-react';
import Link from 'next/link';

export const metadata: Metadata = {
    title: 'Boutiques & Artisans Partenaires | Ahizan Bénin',
    description: 'Découvrez l\'ensemble de nos vendeurs certifiés, artisans et boutiques partenaires à Dantokpa, Missèbo, Cotonou, Calavi et partout au Bénin.',
};

const GET_APPROVED_VENDORS = `
    query GetApprovedVendors($options: VendorListOptions) {
        vendors(options: $options) {
            items {
                id
                name
                zone
                address
                rating
                ratingCount
                description
                latitude
                longitude
                verificationStatus
                logo { preview }
                coverImage { preview }
                location { id name }
                physicalMarket { id name slug centerLatitude centerLongitude }
                markets { id name }
            }
        }
    }
`;

export default async function VendorsPage() {
    let vendors = [];
    try {
        const data = await rawQuery(GET_APPROVED_VENDORS, {
            variables: {
                options: {
                    filter: { status: { eq: 'APPROVED' } },
                    sort: { rating: 'DESC' },
                },
            },
        });
        vendors = data?.vendors?.items || [];
    } catch (e) {
        console.error('[VENDORS_PAGE] Failed to fetch vendors', e);
    }

    return (
        <main className="min-h-screen bg-slate-50/70 dark:bg-slate-950">
            {/* HERO SECTION WITH BACKGROUND IMAGE & AHIZAN PALETTE */}
            <section className="relative overflow-hidden bg-[#07152b] text-white">
                {/* Background Image with Dark Navy & Red Gradient Overlay */}
                <div 
                    className="absolute inset-0 bg-cover bg-center opacity-30 transform scale-105"
                    style={{
                        backgroundImage: `url('https://images.unsplash.com/photo-1472851294608-062f824d29cc?auto=format&fit=crop&w=1600&q=80')`,
                    }}
                />
                <div className="absolute inset-0 bg-gradient-to-r from-[#07152b] via-[#0c234b]/95 to-[#e31837]/30" />
                <div className="absolute inset-0 bg-radial at-top-right from-primary/20 via-transparent to-transparent pointer-events-none" />

                <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-7 sm:py-9 lg:py-10">
                    {/* Breadcrumbs */}
                    <nav className="flex items-center gap-2 text-xs text-slate-300 font-semibold mb-3">
                        <Link href="/" className="hover:text-primary transition-colors">Accueil</Link>
                        <span>/</span>
                        <span className="text-white">Boutiques Partenaires</span>
                    </nav>

                    <div className="max-w-3xl space-y-2.5">
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-[11px] font-black uppercase tracking-wider text-amber-300 shadow-sm">
                            <Sparkles className="w-3 h-3 text-amber-400" />
                            <span>Réseau Officiel Ahizan</span>
                        </div>

                        <h1 className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tight leading-tight uppercase">
                            Nos Boutiques & Marchands Partenaires
                        </h1>

                        <p className="text-slate-200 text-xs sm:text-sm md:text-base leading-relaxed font-medium">
                            Achetez directement auprès des meilleurs artisans, boutiques de grands marchés (Dantokpa, Missèbo, Zogbadjè) et créateurs locaux certifiés au Bénin.
                        </p>

                        {/* Quick Trust Highlights */}
                        <div className="pt-2 flex flex-wrap gap-2.5 text-[11px] sm:text-xs font-bold text-slate-200">
                            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/10 backdrop-blur-sm border border-white/10">
                                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                                <span>100% Boutiques Vérifiées</span>
                            </div>
                            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/10 backdrop-blur-sm border border-white/10">
                                <MapPin className="w-3.5 h-3.5 text-primary" />
                                <span>Géolocalisation & Proximité</span>
                            </div>
                            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/10 backdrop-blur-sm border border-white/10">
                                <Store className="w-3.5 h-3.5 text-amber-400" />
                                <span>Marchés & Boutiques</span>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* VENDORS LIST & INTERACTIVE FILTERS */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-12">
                <VendorsListClient initialVendors={vendors} />
            </div>
        </main>
    );
}
