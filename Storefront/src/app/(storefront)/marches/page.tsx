import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { SITE_NAME, buildCanonicalUrl } from '@/lib/metadata';
import { getShopApiUrl, getAssetUrl } from '@/lib/vendure/api-utils';
import { Landmark, MapPin, Store, ArrowRight, Compass } from 'lucide-react';

export const revalidate = 3600;

export async function generateMetadata(): Promise<Metadata> {
    return {
        title: `Les Grands Marchés du Bénin | Dantokpa, Missèbo, Ganhi | ${SITE_NAME}`,
        description: 'Explorez tous les marchés physiques et traditionnels emblématiques du Bénin : Dantokpa, Missèbo, Porto-Novo, Calavi, Parakou. Achetez en direct des étals avec livraison express.',
        alternates: {
            canonical: buildCanonicalUrl('/marches'),
        },
    };
}

const FALLBACK_MARKETS = [
    {
        id: "1",
        name: "Marché Dantokpa",
        slug: "marche-dantokpa",
        description: "Le plus grand marché à ciel ouvert de l'Afrique de l'Ouest. Tout le commerce du Bénin réuni en un seul lieu : tissus, quincaillerie, alimentation, électronique.",
        image: "https://images.unsplash.com/photo-1578916171728-46686eac8d58?auto=format&fit=crop&w=400&q=70",
        geoZone: { name: "Cotonou" }
    },
    {
        id: "12",
        name: "Marché Missèbo",
        slug: "marche-missebo",
        description: "Le cœur de la mode, du textile et de la friperie de qualité à Cotonou. Vêtements, bazins, chaussures et accessoires au meilleur tarif.",
        image: "https://images.unsplash.com/photo-1544441893-675973e31985?auto=format&fit=crop&w=400&q=70",
        geoZone: { name: "Cotonou" }
    },
    {
        id: "20",
        name: "Marché de Zogbadjè",
        slug: "marche-de-zogbadje",
        description: "Pôle commercial dynamique d'Abomey-Calavi et de la communauté universitaire. Alimentation, fournitures, mode et services rapides.",
        image: "https://images.unsplash.com/photo-1533900298318-6b8da08a523e?auto=format&fit=crop&w=400&q=70",
        geoZone: { name: "Abomey-Calavi" }
    },
    {
        id: "30",
        name: "Grand Marché de Porto-Novo",
        slug: "marche-porto-novo",
        description: "Le marché historique de la capitale béninoise. Vivres frais, artisanat, épices locales et articles traditionnels.",
        image: "https://images.unsplash.com/photo-1488459716781-31db52582fe9?auto=format&fit=crop&w=400&q=70",
        geoZone: { name: "Porto-Novo" }
    },
    {
        id: "31",
        name: "Marché Arzèkè (Parakou)",
        slug: "marche-arzeke-parakou",
        description: "Le grand marché du Nord Bénin. Carrefour commercial reliant le Bénin au Niger, Togo et Nigéria.",
        image: "https://images.unsplash.com/photo-1519567241046-7f570eee3ce6?auto=format&fit=crop&w=400&q=70",
        geoZone: { name: "Parakou" }
    },
    {
        id: "32",
        name: "Marché Kpassè (Ouidah)",
        slug: "marche-kpasse-ouidah",
        description: "Marché historique et culturel de la cité des Kpassè. Produits maraîchers, poissons séchés et artisanat local.",
        image: "https://images.unsplash.com/photo-1513151233558-d860c5398176?auto=format&fit=crop&w=400&q=70",
        geoZone: { name: "Ouidah" }
    }
];

export default async function MarketsIndexPage() {
    let markets = FALLBACK_MARKETS;
    try {
        const query = `
            query GetMarketsList {
                markets {
                    id
                    name
                    slug
                    description
                    image
                    centerLatitude
                    centerLongitude
                    radiusMeters
                    geoZone {
                        id
                        name
                        slug
                    }
                }
            }
        `;
        const res = await fetch(getShopApiUrl(), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query }),
            next: { revalidate: 3600 }
        });
        if (res.ok) {
            const data = await res.json();
            if (data?.data?.markets && data.data.markets.length > 0) {
                markets = data.data.markets;
            }
        }
    } catch {
        // Fallback to FALLBACK_MARKETS
    }

    const jsonLd = {
        '@context': 'https://schema.org',
        '@type': 'ItemList',
        name: 'Les Grands Marchés du Bénin sur Ahizan',
        description: 'Répertoire des marchés physiques et traditionnels au Bénin',
        itemListElement: markets.map((m, index) => ({
            '@type': 'ListItem',
            position: index + 1,
            item: {
                '@type': 'ShoppingCenter',
                name: m.name,
                description: m.description,
                url: `https://ahizan.com/marches/${m.slug}`,
                address: {
                    '@type': 'PostalAddress',
                    addressLocality: m.geoZone?.name || 'Bénin',
                    addressCountry: 'BJ',
                },
            },
        })),
    };

    return (
        <div className="min-h-screen bg-slate-50/60 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans pb-16">
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
            />

            {/* HERO SECTION */}
            <header className="relative bg-gradient-to-br from-[#0B1E3B] via-[#102a52] to-[#1e3a8a] text-white py-16 px-4 sm:px-6 lg:px-8">
                <div className="max-w-6xl mx-auto text-center space-y-4">
                    <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-xs font-black uppercase tracking-wider text-blue-200">
                        <Compass className="w-3.5 h-3.5" />
                        <span>Pôles Commerciaux du Bénin</span>
                    </div>
                    <h1 className="text-3xl sm:text-5xl font-black tracking-tight leading-tight">
                        Tous les Grands Marchés du Bénin en Ligne
                    </h1>
                    <p className="max-w-2xl mx-auto text-sm sm:text-base text-slate-200/90 leading-relaxed">
                        De Dantokpa à Missèbo, d’Arzèkè à Porto-Novo, explorez les étals physiques de nos commerçants partenaires et profitez de la livraison groupée Ahizan.
                    </p>
                </div>
            </header>

            {/* BREADCRUMBS */}
            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
                <nav className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 font-semibold">
                    <Link href="/" className="hover:text-primary transition-colors">Accueil</Link>
                    <span>/</span>
                    <span className="text-slate-800 dark:text-slate-200">Marchés</span>
                </nav>
            </div>

            {/* MARKETS GRID */}
            <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {markets.map((m: any) => {
                        const marketUrl = `/marches/${m.slug || m.id}`;
                        const displayImg = m.image ? (m.image.startsWith('http') ? m.image : getAssetUrl(m.image)) : 'https://images.unsplash.com/photo-1578916171728-46686eac8d58?auto=format&fit=crop&w=400&q=70';
                        return (
                            <article
                                key={m.id}
                                className="bg-white dark:bg-slate-900 rounded-3xl overflow-hidden border border-slate-200/80 dark:border-slate-800 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col group hover:-translate-y-1"
                            >
                                <div className="relative h-48 w-full overflow-hidden bg-slate-100 dark:bg-slate-800">
                                    <img
                                        src={displayImg}
                                        alt={m.name}
                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                        loading="lazy"
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                                    <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-white">
                                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/20 backdrop-blur-md text-[11px] font-bold">
                                            <MapPin className="w-3 h-3" />
                                            {m.geoZone?.name || 'Bénin'}
                                        </span>
                                    </div>
                                </div>

                                <div className="p-5 flex flex-col flex-1 justify-between gap-4">
                                    <div>
                                        <h2 className="text-lg font-black tracking-tight text-slate-900 dark:text-white group-hover:text-blue-600 transition-colors">
                                            {m.name}
                                        </h2>
                                        <p className="mt-2 text-xs text-slate-600 dark:text-slate-400 line-clamp-3 leading-relaxed">
                                            {m.description || `Découvrez les commerces, boutiques et produits phares du ${m.name}.`}
                                        </p>
                                    </div>

                                    <Link href={marketUrl} className="w-full">
                                        <button className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-[#0B1E3B] hover:text-white text-slate-800 dark:text-slate-200 font-bold text-xs transition-colors cursor-pointer">
                                            <span>Explorer ce marché</span>
                                            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                                        </button>
                                    </Link>
                                </div>
                            </article>
                        );
                    })}
                </div>
            </main>
        </div>
    );
}
