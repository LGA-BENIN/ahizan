import type { Metadata } from "next";
import Link from "next/link";
import { getActiveCustomer } from "@/lib/vendure/actions";
import { ShaderBackground } from "@/components/shared/shader-background";
import { ThreeDashboard } from "@/components/shared/three-dashboard";
import { SITE_NAME, SITE_URL, buildCanonicalUrl } from "@/lib/metadata";

export const metadata: Metadata = {
    title: {
        absolute: `${SITE_NAME} - Espace Vendeur`,
    },
    description:
        "Gérez votre boutique, vos produits et vos commandes sur AHIZAN.",
    alternates: {
        canonical: buildCanonicalUrl("/"),
    },
    openGraph: {
        title: `${SITE_NAME} - Espace Vendeur`,
        description:
            "Gérez votre boutique, vos produits et vos commandes sur AHIZAN.",
        type: "website",
        url: SITE_URL,
    },
};

export default async function Home() {
    const customer = await getActiveCustomer().catch(() => null);
    const ctaUrl = customer ? "/dashboard" : "/register";
    const ctaText = customer ? "Accéder au tableau de bord" : "Créer ma boutique";
    const ctaTextFree = customer ? "Accéder au tableau de bord" : "Créer ma boutique gratuitement";

    return (
        <main className="stitch-theme bg-background text-on-surface font-body-lg overflow-x-hidden pt-16">
            {/* HERO SECTION */}
            <section className="relative min-h-[60vh] md:min-h-[80vh] flex items-center overflow-hidden py-16">
                <ShaderBackground className="absolute inset-0 w-full h-full -z-10" />
                <div className="max-w-[1440px] mx-auto w-full px-6 md:px-10 grid grid-cols-1 lg:grid-cols-2 gap-10 md:gap-16 items-center relative z-10">
                    <div className="space-y-6 text-center lg:text-left flex flex-col items-center lg:items-start">
                        <h1 className="font-display-lg text-display-lg md:text-[64px] leading-tight text-on-surface">
                            Développez votre activité avec <span className="text-primary">Ahizan.</span>
                        </h1>
                        <p className="text-on-surface-variant text-title-md max-w-xl mx-auto lg:mx-0">
                            Vendez partout au Bénin depuis une seule plateforme. Rejoignez la révolution du commerce local et touchez des milliers de clients chaque jour.
                        </p>
                        <div className="flex flex-col sm:flex-row justify-center lg:justify-start gap-4 md:gap-6 w-full sm:w-auto">
                            <Link href={ctaUrl} className="bg-primary text-white px-10 py-4 rounded-xl font-bold text-lg hover:scale-105 transition-transform shadow-lg text-center w-full sm:w-auto">
                                {ctaText}
                            </Link>
                            <a href="#why-sell" className="border-2 border-secondary text-secondary px-10 py-4 rounded-xl font-bold text-lg hover:bg-secondary/5 transition-colors text-center w-full sm:w-auto">
                                Découvrir les avantages
                            </a>
                        </div>
                        {/* Stats Bar */}
                        <div className="pt-10 grid grid-cols-2 md:grid-cols-4 gap-6 border-t border-outline-variant w-full">
                            <div className="text-center lg:text-left">
                                <p className="text-primary font-bold text-headline-lg" data-count="15000">0</p>
                                <p className="text-body-sm text-secondary uppercase tracking-wider font-semibold">Visiteurs</p>
                            </div>
                            <div className="text-center lg:text-left">
                                <p className="text-primary font-bold text-headline-lg" data-count="2400">0</p>
                                <p className="text-body-sm text-secondary uppercase tracking-wider font-semibold">Commandes</p>
                            </div>
                            <div className="text-center lg:text-left">
                                <p className="text-primary font-bold text-headline-lg" data-count="850">0</p>
                                <p className="text-body-sm text-secondary uppercase tracking-wider font-semibold">Vendeurs</p>
                            </div>
                            <div className="text-center lg:text-left">
                                <p className="text-primary font-bold text-headline-lg" data-count="50000">0</p>
                                <p className="text-body-sm text-secondary uppercase tracking-wider font-semibold">Produits vendus</p>
                            </div>
                        </div>
                    </div>
                    <div className="relative h-[300px] md:h-[500px] lg:h-[600px] w-full overflow-hidden">
                        <ThreeDashboard className="absolute inset-0 w-full h-full" />
                        {/* Floating Animated Cards - Masquées sur mobile pour éviter les décalages */}
                        <div className="hidden md:flex absolute top-10 right-10 bg-card text-card-foreground p-4 rounded-xl shadow-xl items-center gap-6 animate-float border border-outline-variant/30" style={{ animationDelay: '0s' }}>
                            <div className="w-12 h-12 bg-green-100 dark:bg-green-950 rounded-full flex items-center justify-center text-green-600 dark:text-green-400">
                                <span className="material-symbols-outlined">trending_up</span>
                            </div>
                            <div>
                                <p className="font-bold text-primary">+240%</p>
                                <p className="text-xs text-secondary dark:text-secondary-fixed">Ventes Produits</p>
                            </div>
                        </div>
                        <div className="hidden md:flex absolute bottom-20 left-0 bg-card text-card-foreground p-4 rounded-xl shadow-xl items-center gap-6 animate-float border border-outline-variant/30" style={{ animationDelay: '2s' }}>
                            <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center text-primary">
                                <span className="material-symbols-outlined">notifications</span>
                            </div>
                            <div>
                                <p className="font-bold">Notification</p>
                                <p className="text-xs text-secondary dark:text-secondary-fixed">Nouvelle commande #249</p>
                            </div>
                        </div>
                        <div className="hidden md:flex absolute top-1/2 -right-4 bg-card text-card-foreground p-4 rounded-xl shadow-xl items-center gap-2 animate-float border border-outline-variant/30" style={{ animationDelay: '4s' }}>
                            <div className="flex text-yellow-400">
                                <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                                <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                                <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                                <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                                <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                            </div>
                            <p className="font-bold text-secondary dark:text-secondary-fixed">Évaluation 5 Étoiles</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* SOCIAL PROOF: Marquee */}
            <section className="py-4 bg-surface-container-low border-y border-outline-variant/30">
                <div className="marquee">
                    <div className="marquee-content">
                        <span className="text-secondary font-bold text-title-md flex items-center gap-2 opacity-50"><span className="material-symbols-outlined">diamond</span> BENIN TECH</span>
                        <span className="text-secondary font-bold text-title-md flex items-center gap-2 opacity-50"><span className="material-symbols-outlined">shopping_bag</span> COTONOU SHOP</span>
                        <span className="text-secondary font-bold text-title-md flex items-center gap-2 opacity-50"><span className="material-symbols-outlined">bolt</span> LIVRAISON RAPIDE</span>
                        <span className="text-secondary font-bold text-title-md flex items-center gap-2 opacity-50"><span className="material-symbols-outlined">verified</span> PARTENAIRE DE CONFIANCE</span>
                        <span className="text-secondary font-bold text-title-md flex items-center gap-2 opacity-50"><span className="material-symbols-outlined">payments</span> PAYEMENTS SÉCURISÉS</span>
                        <span className="text-secondary font-bold text-title-md flex items-center gap-2 opacity-50"><span className="material-symbols-outlined">groups</span> 2000+ VENDEURS</span>
                    </div>
                    <div className="marquee-content">
                        <span className="text-secondary font-bold text-title-md flex items-center gap-2 opacity-50"><span className="material-symbols-outlined">diamond</span> BENIN TECH</span>
                        <span className="text-secondary font-bold text-title-md flex items-center gap-2 opacity-50"><span className="material-symbols-outlined">shopping_bag</span> COTONOU SHOP</span>
                        <span className="text-secondary font-bold text-title-md flex items-center gap-2 opacity-50"><span className="material-symbols-outlined">bolt</span> LIVRAISON RAPIDE</span>
                        <span className="text-secondary font-bold text-title-md flex items-center gap-2 opacity-50"><span className="material-symbols-outlined">verified</span> PARTENAIRE DE CONFIANCE</span>
                        <span className="text-secondary font-bold text-title-md flex items-center gap-2 opacity-50"><span className="material-symbols-outlined">payments</span> PAYEMENTS SÉCURISÉS</span>
                        <span className="text-secondary font-bold text-title-md flex items-center gap-2 opacity-50"><span className="material-symbols-outlined">groups</span> 2000+ VENDEURS</span>
                    </div>
                </div>
            </section>

            {/* WHY SELL ON AHIZAN */}
            <section id="why-sell" className="py-16 max-w-[1440px] mx-auto px-6 md:px-10">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 md:gap-16 items-center">
                    <div className="relative rounded-2xl overflow-hidden shadow-2xl">
                        <img className="w-full h-auto" alt="Entrepreneuse béninoise dans son bureau à Cotonou" src="https://lh3.googleusercontent.com/aida-public/AB6AXuAyqfdFLNxFn62WRwLPLUdjfJz3Knbe_FRrTf3eGbqD_tJCRhfyyAm83ll15qKIBsILr9T14SBD1Tq2_cG7UaxrcqYr8fVVxzygmtG40ko-dBZZjtzDm3CRbDYV3NlQwCVeWRatRLSSHoyJgKjz0sfCubeb9f-jOc-qgp-261nneQEi0EHoj4lUpPRpf-XOllvdGET9-1QawlLCqGDSgBiSzKgMtSXZ6Briri79EB14Qj2kEEaGuibTZ0xb-REJk8Y4lNIuHpmAfU6_"/>
                        <div className="absolute inset-0 bg-gradient-to-t from-primary/40 to-transparent"></div>
                    </div>
                    <div className="space-y-6">
                        <h2 className="font-headline-lg text-headline-lg text-on-surface">Pourquoi vendre sur Ahizan ?</h2>
                        <div className="space-y-4">
                            <div className="flex gap-6 group">
                                <div className="w-12 h-12 bg-primary/10 rounded-lg flex-shrink-0 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-colors duration-300">
                                    <span className="material-symbols-outlined">visibility</span>
                                </div>
                                <div>
                                    <h3 className="font-title-md text-title-md mb-2">Visibilité nationale</h3>
                                    <p className="text-on-surface-variant">Touchez des clients de Cotonou à Parakou sans quitter votre domicile.</p>
                                </div>
                            </div>
                            <div className="flex gap-6 group">
                                <div className="w-12 h-12 bg-primary/10 rounded-lg flex-shrink-0 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-colors duration-300">
                                    <span className="material-symbols-outlined">shield</span>
                                </div>
                                <div>
                                    <h3 className="font-title-md text-title-md mb-2">Paiements sécurisés</h3>
                                    <p className="text-on-surface-variant">Encaissez via Mobile Money ou Carte Bancaire en toute sérénité.</p>
                                </div>
                            </div>
                            <div className="flex gap-6 group">
                                <div className="w-12 h-12 bg-primary/10 rounded-lg flex-shrink-0 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-colors duration-300">
                                    <span className="material-symbols-outlined">local_shipping</span>
                                </div>
                                <div>
                                    <h3 className="font-title-md text-title-md mb-2">Logistique simplifiée</h3>
                                    <p className="text-on-surface-variant">Nous gérons la livraison pour vous grâce à notre réseau partenaire.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* HOW IT WORKS: Timeline */}
            <section id="features" className="py-16 bg-surface-container">
                <div className="max-w-[1440px] mx-auto px-6 md:px-10 text-center mb-16">
                    <h2 className="font-headline-lg text-headline-lg mb-4">Comment ça marche ?</h2>
                    <p className="text-on-surface-variant max-w-2xl mx-auto">Lancez votre boutique en ligne en moins de 10 minutes avec notre processus simplifié.</p>
                </div>
                <div className="max-w-5xl mx-auto px-6 md:px-10">
                    <div className="relative flex flex-col md:flex-row justify-between items-start md:items-center gap-10">
                        {/* Progress Line */}
                        <div className="hidden md:block absolute top-12 left-0 w-full h-1 bg-primary/20 -z-10"></div>
                        {/* Step 1 */}
                        <div className="flex-1 flex flex-col items-center text-center gap-4 group">
                            <div className="w-16 h-16 bg-card text-primary rounded-full flex items-center justify-center border-4 border-primary font-bold text-xl group-hover:scale-110 transition-transform">1</div>
                            <h3 className="font-bold">Créer un compte</h3>
                            <p className="text-body-sm text-secondary dark:text-secondary-fixed">Inscrivez-vous gratuitement avec vos informations de base.</p>
                        </div>
                        {/* Step 2 */}
                        <div className="flex-1 flex flex-col items-center text-center gap-4 group">
                            <div className="w-16 h-16 bg-card text-primary rounded-full flex items-center justify-center border-4 border-primary font-bold text-xl group-hover:scale-110 transition-transform">2</div>
                            <h3 className="font-bold">Configurer la boutique</h3>
                            <p className="text-body-sm text-secondary dark:text-secondary-fixed">Personnalisez votre espace avec votre logo et vos couleurs.</p>
                        </div>
                        {/* Step 3 */}
                        <div className="flex-1 flex flex-col items-center text-center gap-4 group">
                            <div className="w-16 h-16 bg-card text-primary rounded-full flex items-center justify-center border-4 border-primary font-bold text-xl group-hover:scale-110 transition-transform">3</div>
                            <h3 className="font-bold">Ajouter des produits</h3>
                            <p className="text-body-sm text-secondary dark:text-secondary-fixed">Publiez vos articles avec de belles photos et descriptions.</p>
                        </div>
                        {/* Step 4 */}
                        <div className="flex-1 flex flex-col items-center text-center gap-4 group">
                            <div className="w-16 h-16 bg-card text-primary rounded-full flex items-center justify-center border-4 border-primary font-bold text-xl group-hover:scale-110 transition-transform">4</div>
                            <h3 className="font-bold">Recevoir des commandes</h3>
                            <p className="text-body-sm text-secondary dark:text-secondary-fixed">Vendez et soyez payé directement sur votre compte.</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* SELLER TOOLS: Bento Grid */}
            <section className="py-16 max-w-[1440px] mx-auto px-6 md:px-10">
                <h2 className="font-headline-lg text-headline-lg text-center mb-16">Outils puissants pour les vendeurs</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Large Card */}
                    <div className="md:col-span-2 bg-card text-card-foreground p-10 rounded-2xl shadow-sm border border-outline-variant/30 hover:shadow-xl transition-shadow group">
                        <div className="flex flex-col md:flex-row gap-10">
                            <div className="flex-1 space-y-6">
                                <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                                    <span className="material-symbols-outlined">analytics</span>
                                </div>
                                <h3 className="font-headline-lg text-title-md">Statistiques avancées</h3>
                                <p className="text-on-surface-variant">Suivez vos performances en temps réel. Analysez vos ventes, vos meilleurs produits et le comportement de vos clients.</p>
                                <ul className="space-y-2">
                                    <li className="flex items-center gap-2 text-sm"><span className="material-symbols-outlined text-green-500 text-lg">check_circle</span> Rapport de ventes journalier</li>
                                    <li className="flex items-center gap-2 text-sm"><span className="material-symbols-outlined text-green-500 text-lg">check_circle</span> Analyse d'audience</li>
                                </ul>
                            </div>
                            <div className="flex-1 bg-surface-container rounded-xl overflow-hidden p-6">
                                <div className="h-48 w-full bg-card rounded-lg shadow-inner flex items-end justify-between p-6 gap-2">
                                    <div className="bg-primary/20 w-full h-1/4 rounded-sm"></div>
                                    <div className="bg-primary/40 w-full h-1/2 rounded-sm"></div>
                                    <div className="bg-primary/60 w-full h-3/4 rounded-sm"></div>
                                    <div className="bg-primary w-full h-full rounded-sm"></div>
                                    <div className="bg-primary/80 w-full h-2/3 rounded-sm"></div>
                                </div>
                            </div>
                        </div>
                    </div>
                    {/* Small Card 1 */}
                    <div className="bg-card text-card-foreground p-10 rounded-2xl shadow-sm border border-outline-variant/30 hover:shadow-xl transition-shadow group flex flex-col justify-between">
                        <div className="w-12 h-12 bg-tertiary/10 rounded-xl flex items-center justify-center text-tertiary mb-6 group-hover:scale-110 transition-transform">
                            <span className="material-symbols-outlined">inventory_2</span>
                        </div>
                        <div>
                            <h3 className="font-title-md text-title-md mb-4">Gestion de Stock</h3>
                            <p className="text-body-sm text-on-surface-variant">Ne soyez jamais en rupture. Recevez des alertes automatiques quand vos stocks sont bas.</p>
                        </div>
                    </div>
                    {/* Small Card 2 */}
                    <div className="bg-card text-card-foreground p-10 rounded-2xl shadow-sm border border-outline-variant/30 hover:shadow-xl transition-shadow group flex flex-col justify-between">
                        <div className="w-12 h-12 bg-secondary/10 rounded-xl flex items-center justify-center text-secondary mb-6 group-hover:scale-110 transition-transform">
                            <span className="material-symbols-outlined">campaign</span>
                        </div>
                        <div>
                            <h3 className="font-title-md text-title-md mb-4">Outils Marketing</h3>
                            <p className="text-body-sm text-on-surface-variant">Créez des coupons de réduction et boostez vos ventes pendant les périodes de fêtes.</p>
                        </div>
                    </div>
                    {/* Small Card 3 */}
                    <div className="md:col-span-2 bg-secondary text-white p-10 rounded-2xl shadow-sm hover:shadow-xl transition-shadow flex items-center gap-10">
                        <div className="flex-1 space-y-6">
                            <h3 className="font-headline-lg text-title-md">Support Vendeur 24/7</h3>
                            <p className="text-white/80">Notre équipe est là pour vous aider à chaque étape de votre croissance.</p>
                            <button className="bg-white text-secondary px-6 py-4 rounded-lg font-bold text-sm">Discuter avec un expert</button>
                        </div>
                        <div className="hidden md:block">
                            <span className="material-symbols-outlined text-[80px] opacity-20">headset_mic</span>
                        </div>
                    </div>
                </div>
            </section>

            {/* LOGISTICS & DELIVERY */}
            <section id="logistics" className="py-16 bg-on-surface text-surface overflow-hidden">
                <div className="max-w-[1440px] mx-auto px-6 md:px-10">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 md:gap-16 items-center">
                        <div className="space-y-6">
                            <div className="inline-block bg-primary px-6 py-4 rounded-full text-sm font-bold tracking-widest uppercase">Réseau Ahizan Logistique</div>
                            <h2 className="font-headline-lg text-headline-lg">Livrez partout au Bénin, sans stress.</h2>
                            <p className="text-surface/70 text-lg">Nous avons bâti le plus grand réseau de livraison du pays pour que vous n'ayez pas à le faire. Du ramassage à la porte du client.</p>
                            <div className="space-y-4">
                                <div className="flex items-start gap-6">
                                    <span className="material-symbols-outlined text-primary">pin_drop</span>
                                    <div>
                                        <h4 className="font-bold">77 Communes couvertes</h4>
                                        <p className="text-sm text-surface/60">Une présence nationale inégalée.</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-6">
                                    <span className="material-symbols-outlined text-primary">speed</span>
                                    <div>
                                        <h4 className="font-bold">Livraison en 24-48h</h4>
                                        <p className="text-sm text-surface/60">Rapidité garantie à Cotonou et Porto-Novo.</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="relative">
                            {/* Map Mockup */}
                            <div className="w-full h-[400px] bg-secondary/20 rounded-2xl border border-surface/10 flex items-center justify-center p-10 relative">
                                <div className="absolute inset-0 curve-pattern opacity-20"></div>
                                <div className="w-full h-full rounded-xl bg-surface/5 flex items-center justify-center">
                                    <span className="material-symbols-outlined text-primary text-[120px] opacity-50">map</span>
                                    {/* Delivery Node Animations */}
                                    <div className="absolute top-1/4 left-1/3 w-3 h-3 bg-primary rounded-full animate-ping"></div>
                                    <div className="absolute bottom-1/3 right-1/4 w-3 h-3 bg-primary rounded-full animate-ping" style={{ animationDelay: '1s' }}></div>
                                    <div className="absolute top-1/2 right-1/2 w-3 h-3 bg-primary rounded-full animate-ping" style={{ animationDelay: '0.5s' }}></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* PAYMENTS */}
            <section id="payments" className="py-16 max-w-[1440px] mx-auto px-6 md:px-10">
                <div className="bg-card text-card-foreground rounded-3xl shadow-2xl overflow-hidden grid grid-cols-1 md:grid-cols-2">
                    <div className="p-10 md:p-16 space-y-6 border-r border-outline-variant/30">
                        <h2 className="font-headline-lg text-headline-lg">Vos revenus, en temps réel.</h2>
                        <p className="text-on-surface-variant">Plus besoin d'attendre. Encaissez vos gains via Mobile Money (MTN, Moov) ou directement sur votre compte bancaire.</p>
                        <div className="flex flex-col gap-6">
                            <div className="p-4 bg-surface-container rounded-xl flex items-center gap-6">
                                <img className="w-12 h-12 rounded-lg" alt="MTN Mobile Money" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBD4ZFKhCKzKDZ0Vk6D6IR-_zBmmuBRGNuVglGM1i7UtP3wvqnsxZ4uDoYNztu6oC2OtqApU1dJwJQt-MBU6ISttGLZMtJYUU7dKTrFYNKV6feO7jBWpEAYyA3z-iKuin36ZquG03t7X9S7t2h4k3k2O-j6LpQLshDOX-nTI-Lv12BRXNKzPJ2v5SgjCOv6n4nMWzuyn773jTjIOw3Cs0YHIbXlVFNcKVf9md4YQMox7RgQjvS3EQJ9LjN2Sw0uvQj7I8AoEAoThmOd"/>
                                <div className="flex-1">
                                    <p className="font-bold">MTN Mobile Money</p>
                                    <p className="text-xs text-secondary dark:text-secondary-fixed">Paiement instantané</p>
                                </div>
                                <span className="material-symbols-outlined text-green-500">check_circle</span>
                            </div>
                            <div className="p-4 bg-surface-container rounded-xl flex items-center gap-6">
                                <img className="w-12 h-12 rounded-lg" alt="Moov Money" src="https://lh3.googleusercontent.com/aida-public/AB6AXuAwd5xbxi8Ed55QQ70D8q98qK8L3q489lGol1ndns2lVG2VfDJi1D5po0Vd__1rvUOLSTCxbBTuNaDWijx_VtF2S9wFU6loM24Z43pxrmWJuJNETmBn8WRRbwCxypmZExfvy7o4acUdhUCwr0ZaqcIcluqUJtNv3-VWKX1fLA4hTFsj79c0h6Tt3OSlyd4JftxFVkR9CQyX-4KdVwnYzH4rUgfP_VicwM7HPfWew39AjTRHvp8sqxypLMWZuzhulP-v4Zi9_X9WXRHa"/>
                                <div className="flex-1">
                                    <p className="font-bold">Moov Money</p>
                                    <p className="text-xs text-secondary dark:text-secondary-fixed">Paiement sécurisé</p>
                                </div>
                                <span className="material-symbols-outlined text-green-500">check_circle</span>
                            </div>
                        </div>
                    </div>
                    <div className="bg-surface-container-highest p-10 flex items-center justify-center">
                        <div className="bg-card text-card-foreground rounded-2xl shadow-xl w-full max-w-sm p-10 space-y-6">
                            <div className="flex justify-between items-center">
                                <p className="text-secondary dark:text-secondary-fixed font-bold">Solde Disponible</p>
                                <span className="material-symbols-outlined text-primary">account_balance_wallet</span>
                            </div>
                            <p className="text-headline-lg font-extrabold text-[28px]">250.450 FCFA</p>
                            <div className="h-2 w-full bg-surface-container-low rounded-full overflow-hidden">
                                <div className="h-full bg-primary w-3/4"></div>
                            </div>
                            <button className="w-full bg-primary text-white py-4 rounded-xl font-bold hover:scale-95 transition-transform">Retirer mes fonds</button>
                            <p className="text-[10px] text-center text-secondary dark:text-secondary-fixed">Dernier retrait : Il y a 2 jours</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* SUCCESS STORIES */}
            <section className="py-16 bg-surface-bright relative">
                <div className="max-w-[1440px] mx-auto px-6 md:px-10">
                    <h2 className="font-headline-lg text-headline-lg text-center mb-16">Ils réussissent avec Ahizan</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
                        {/* Story 1 */}
                        <div className="bg-card text-card-foreground p-10 rounded-2xl shadow-lg border-t-4 border-primary space-y-6">
                            <div className="flex items-center gap-6">
                                <img className="w-16 h-16 rounded-full object-cover" alt="Portrait de Koffi A." src="https://lh3.googleusercontent.com/aida-public/AB6AXuDK0abapllVV8Fl91iHb7M-ENmtSB1P9rRHF1r7aLuiqSf1mBllz9a8UXwxwpErhNSBRQy4RrBZr0CfaC_jKBAcoAwsJeml1oX2VrGWAF_QZEUYWP89S02TP3eMR-Kuimof7FZh9LKiCk1Ek47qDhZ4l_fJ81iiRJ5oCtXjYd614g9wViDjocGJoET3sBRAXxiACjG09zHgq-VZe1SPkq-ysiOWEQM4xRbPkRdy6_7MQ-N7fNGJ2cl3w6au3hj0HcTvyyzJB_GIrPKR"/>
                                <div>
                                    <p className="font-bold">Koffi A.</p>
                                    <p className="text-xs text-secondary dark:text-secondary-fixed">Artisan d'art, Porto-Novo</p>
                                </div>
                            </div>
                            <p className="italic text-on-surface-variant">"Depuis que j'ai rejoint Ahizan, mes ventes ont triplé. Je livre maintenant des clients à Natitingou, ce que je n'aurais jamais pu faire seul."</p>
                        </div>
                        {/* Story 2 */}
                        <div className="bg-card text-card-foreground p-10 rounded-2xl shadow-lg border-t-4 border-primary space-y-6">
                            <div className="flex items-center gap-6">
                                <img className="w-16 h-16 rounded-full object-cover" alt="Portrait d'Amina S." src="https://lh3.googleusercontent.com/aida-public/AB6AXuAifl669IYXC24anmuQ2DACBRFVfhj5IylvsLiujj1voPmfylkk00WL-wN2_QILCcSc3A7DA9KlTFaLJEISSyk08us6XnrqxR94q4rPoEu0wGlUPOF_iFtQ9W0ZdHto4eyWlByZERpZ-FHyfcy5AuvzoPFETnufX9O5-xErDFMLzucnpDPrGYdMhB4Ohza5tcy2RdDChBRUGtbw0P6a9CItAgq0KOrxLx3GtBxF4hVD5-HCPL-ak0FiQPs5I_cey3i82MqlWJdsECCR"/>
                                <div>
                                    <p className="font-bold">Amina S.</p>
                                    <p className="text-xs text-secondary dark:text-secondary-fixed">Mode &amp; Accessoires, Cotonou</p>
                                </div>
                            </div>
                            <p className="italic text-on-surface-variant">"La gestion des paiements Mobile Money est un vrai plus. Plus besoin de courir après les règlements, tout est automatique et sécurisé."</p>
                        </div>
                        {/* Story 3 */}
                        <div className="bg-card text-card-foreground p-10 rounded-2xl shadow-lg border-t-4 border-primary space-y-6">
                            <div className="flex items-center gap-6">
                                <img className="w-16 h-16 rounded-full object-cover" alt="Portrait de Jean-Paul M." src="https://lh3.googleusercontent.com/aida-public/AB6AXuBlcaFGzeYWIexuMMkPe8utizl1-19xkBrqvNFCZxfi8NdnrvtoSULQJTw-WHtCvHSQ4kUP51BLh3jSh5ibOZryL5f5Y2yData7ig706GwvoUBcftsg9BKwLvU9rj0CeKIQU5M8jm6ixEGFYk7vc-yl7-sYc5nLsctMkyfgMnKMWIunPxqsYpw5-wGyH5_EwXcHBKFtxPNQ7sxOq5V0e4OEZY5TffEj0PdwCGnV8sFdiv7zTNoe0Cv_zms7XKETc7M12tspa__ZbFOE"/>
                                <div>
                                    <p className="font-bold">Jean-Paul M.</p>
                                    <p className="text-xs text-secondary dark:text-secondary-fixed">Gadgets Tech, Calavi</p>
                                </div>
                            </div>
                            <p className="italic text-on-surface-variant">"Les outils de marketing m'ont permis de lancer des promos qui ont cartonné pendant le Black Friday. Ahizan est le partenaire idéal."</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* FAQ */}
            <section id="faq" className="py-16 max-w-3xl mx-auto px-6 md:px-10">
                <h2 className="font-headline-lg text-headline-lg text-center mb-16">Questions fréquentes</h2>
                <div className="space-y-4">
                    <details className="group bg-card text-card-foreground p-4 rounded-xl border border-outline-variant/30 open:shadow-md transition-all">
                        <summary className="flex justify-between items-center cursor-pointer font-bold list-none">
                            Combien coûte l'ouverture d'une boutique ?
                            <span className="material-symbols-outlined transition-transform group-open:rotate-180">expand_more</span>
                        </summary>
                        <div className="pt-4 text-on-surface-variant">
                            L'ouverture d'une boutique sur Ahizan est totalement gratuite. Nous ne prélevons une petite commission que lorsque vous réalisez une vente.
                        </div>
                    </details>
                    <details className="group bg-card text-card-foreground p-4 rounded-xl border border-outline-variant/30 open:shadow-md transition-all">
                        <summary className="flex justify-between items-center cursor-pointer font-bold list-none">
                            Comment se passe la livraison ?
                            <span className="material-symbols-outlined transition-transform group-open:rotate-180">expand_more</span>
                        </summary>
                        <div className="pt-4 text-on-surface-variant">
                            Dès qu'une commande est passée, vous recevez une notification. Nos livreurs partenaires passent ramasser le colis chez vous pour le livrer au client.
                        </div>
                    </details>
                    <details className="group bg-card text-card-foreground p-4 rounded-xl border border-outline-variant/30 open:shadow-md transition-all">
                        <summary className="flex justify-between items-center cursor-pointer font-bold list-none">
                            Quels documents faut-il pour s'inscrire ?
                            <span className="material-symbols-outlined transition-transform group-open:rotate-180">expand_more</span>
                        </summary>
                        <div className="pt-4 text-on-surface-variant">
                            Pour commencer, une simple pièce d'identité et un numéro de téléphone Mobile Money valide suffisent.
                        </div>
                    </details>
                </div>
            </section>

            {/* FINAL CTA */}
            <section className="py-16 relative bg-primary text-white overflow-hidden">
                <ShaderBackground className="absolute inset-0 w-full h-full opacity-20 z-0" />
                <div className="max-w-[1440px] mx-auto px-6 md:px-10 text-center text-white space-y-6">
                    <h2 className="font-display-lg text-display-lg md:text-[56px]">Prêt à faire décoller votre business ?</h2>
                    <p className="text-xl opacity-90 max-w-2xl mx-auto">Rejoignez la communauté des vendeurs qui font bouger le Bénin. Pas de frais cachés, que de la croissance.</p>
                    <div className="flex flex-wrap justify-center gap-6">
                        <Link href={ctaUrl} className="bg-white text-primary px-16 py-4 rounded-xl font-bold text-xl hover:scale-105 transition-transform shadow-xl">
                            {ctaTextFree}
                        </Link>
                        <a href="mailto:contact@ahizan.com" className="border-2 border-white/40 text-white px-16 py-4 rounded-xl font-bold text-xl hover:bg-white/10 transition-colors">
                            Contacter un conseiller
                        </a>
                    </div>
                    <p className="text-sm opacity-60">Déjà plus de 850 commerçants nous font confiance.</p>
                </div>
            </section>

            {/* Scripts inline client pour l'interactivité de la maquette d'origine */}
            <script dangerouslySetInnerHTML={{ __html: `
                // Effet scroll header
                window.addEventListener('scroll', () => {
                    const header = document.getElementById('top-nav');
                    if (header) {
                        if (window.scrollY > 50) {
                            header.classList.add('header-glass', 'shadow-md');
                        } else {
                            header.classList.remove('header-glass', 'shadow-md');
                        }
                    }
                });

                // Animation des statistiques avec compteur
                setTimeout(() => {
                    const observer = new IntersectionObserver((entries) => {
                        entries.forEach(entry => {
                            if (entry.isIntersecting) {
                                const target = entry.target;
                                const countTo = parseInt(target.getAttribute('data-count'));
                                if (!isNaN(countTo)) {
                                    let current = 0;
                                    const duration = 2000;
                                    const increment = countTo / (duration / 16);
                                    
                                    const timer = setInterval(() => {
                                        current += increment;
                                        if (current >= countTo) {
                                            target.innerText = countTo.toLocaleString() + '+';
                                            clearInterval(timer);
                                        } else {
                                            target.innerText = Math.floor(current).toLocaleString() + '+';
                                        }
                                    }, 16);
                                    observer.unobserve(target);
                                }
                            }
                        });
                    });
                    document.querySelectorAll('[data-count]').forEach(el => observer.observe(el));
                }, 200);
            `}} />
        </main>
    );
}
