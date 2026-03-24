import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as queries from './queries';
const { GET_PAGE, GET_PAGES, UPDATE_SECTION, CREATE_SECTION, DELETE_SECTION, CREATE_PAGE, INITIALIZE_HOME_PAGE, CREATE_ASSETS, CREATE_CMS_ASSET } = queries;

/* ═══════════════════════════════════════════════════════
   CSS CLASSES — Compatible thème clair/sombre Vendure
   Utilise les variables CSS du dashboard Vendure
   ═══════════════════════════════════════════════════════ */
const cls = {
    page: 'vd-cms-builder',
    sidebar: 'vd-cms-sidebar',
    main: 'vd-cms-main',
    card: 'vd-cms-card',
    label: 'vd-cms-label',
    input: 'vd-cms-input',
    select: 'vd-cms-select',
    textarea: 'vd-cms-textarea',
    btnPrimary: 'vd-cms-btn-primary',
    btnSecondary: 'vd-cms-btn-secondary',
    btnDanger: 'vd-cms-btn-danger',
    btnOutline: 'vd-cms-btn-outline',
    badge: 'vd-cms-badge',
    sectionItem: 'vd-cms-section-item',
    sectionItemActive: 'vd-cms-section-item-active',
    editor: 'vd-cms-editor',
    grid2: 'vd-cms-grid-2',
};

const BUILDER_STYLES = `
.vd-cms-builder { display: flex; height: 100vh; overflow: hidden; font-family: inherit; color: var(--color-text, #1e293b); background: var(--color-component-bg-100, #f8fafc); }
.vd-cms-sidebar { width: 460px; border-right: 1px solid var(--color-component-border, #e2e8f0); background: var(--color-component-bg-200, #fff); display: flex; flex-direction: column; }
.vd-cms-main { flex: 1; padding: 32px; overflow: auto; }
.vd-cms-card { padding: 16px; border-radius: 10px; border: 1px solid var(--color-component-border, #e2e8f0); background: var(--color-component-bg-200, #fff); margin-bottom: 12px; }
.vd-cms-label { display: block; font-size: 11px; font-weight: 700; color: var(--color-text-300, #64748b); margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.05em; }
.vd-cms-input { width: 100%; padding: 8px 12px; border-radius: 6px; border: 1px solid var(--color-component-border, #e2e8f0); background: var(--color-component-bg-100, #f8fafc); color: var(--color-text, #1e293b); font-size: 13px; outline: none; }
.vd-cms-input:focus { border-color: var(--color-primary-500, #3b82f6); box-shadow: 0 0 0 2px var(--color-primary-100, #dbeafe); }
.vd-cms-select { width: 100%; padding: 8px 12px; border-radius: 6px; border: 1px solid var(--color-component-border, #e2e8f0); background: var(--color-component-bg-100, #f8fafc); color: var(--color-text, #1e293b); font-size: 13px; }
.vd-cms-textarea { width: 100%; padding: 8px 12px; border-radius: 6px; border: 1px solid var(--color-component-border, #e2e8f0); background: var(--color-component-bg-100, #f8fafc); color: var(--color-text, #1e293b); font-size: 13px; min-height: 70px; resize: vertical; }
.vd-cms-btn-primary { padding: 8px 16px; border-radius: 6px; border: none; background: var(--color-primary-500, #3b82f6); color: #fff; font-size: 12px; font-weight: 600; cursor: pointer; }
.vd-cms-btn-primary:hover { background: var(--color-primary-600, #2563eb); }
.vd-cms-btn-secondary { padding: 6px 12px; border-radius: 6px; border: 1px solid var(--color-component-border, #e2e8f0); background: var(--color-component-bg-200, #fff); color: var(--color-text, #1e293b); font-size: 11px; font-weight: 600; cursor: pointer; }
.vd-cms-btn-secondary:hover { background: var(--color-component-bg-100, #f1f5f9); }
.vd-cms-btn-danger { padding: 6px 12px; border-radius: 6px; border: 1px solid #fecaca; background: #fef2f2; color: #dc2626; font-size: 11px; font-weight: 600; cursor: pointer; }
.vd-cms-btn-outline { padding: 4px 10px; border-radius: 4px; border: 1px solid var(--color-component-border, #e2e8f0); background: transparent; color: var(--color-text-300, #64748b); font-size: 10px; font-weight: 600; cursor: pointer; }
.vd-cms-badge { display: inline-block; padding: 2px 8px; border-radius: 10px; font-size: 10px; font-weight: 600; background: var(--color-component-bg-100, #f1f5f9); color: var(--color-text-300, #64748b); border: 1px solid var(--color-component-border, #e2e8f0); }
.vd-cms-section-item { width: 100%; padding: 10px 14px; border-radius: 8px; border: 1px solid var(--color-component-border, #e2e8f0); background: var(--color-component-bg-200, #fff); text-align: left; cursor: pointer; display: flex; justify-content: space-between; align-items: center; transition: all 0.15s; }
.vd-cms-section-item:hover { border-color: var(--color-primary-300, #93c5fd); }
.vd-cms-section-item-active { border-color: var(--color-primary-500, #3b82f6); background: var(--color-primary-50, #eff6ff); }
.vd-cms-editor { padding: 16px; border: 1px solid var(--color-component-border, #e2e8f0); border-top: none; border-radius: 0 0 8px 8px; background: var(--color-component-bg-200, #fff); display: flex; flex-direction: column; gap: 14px; }
.vd-cms-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
`;

// --- GraphQL Fetcher ---
async function fetchGraphQL(query: any, variables?: any, file?: File) {
    const apiUrl = window.location.origin + '/admin-api';
    const headers: Record<string, string> = {};
    let body: any;

    const queryStr = typeof query === 'string' ? query : query.loc?.source?.body || query.definitions?.[0]?.loc?.source?.body;
    let vars = variables?.variables || variables || {};
    
    let uploadFile = file;
    if (!uploadFile && vars && typeof vars === 'object') {
        const fileKey = Object.keys(vars).find(k => vars[k] instanceof File);
        if (fileKey) {
            uploadFile = vars[fileKey];
            vars = { ...vars, [fileKey]: null };
        }
    }

    if (uploadFile) {
        const formData = new FormData();
        let mapPath = 'variables.file';
        if (queryStr.includes('createAssets')) {
            mapPath = 'variables.input.0.file';
            if (!vars.input) vars = { input: [{ file: null }] };
        } else if (vars.file === null) {
            mapPath = 'variables.file';
        }
        const operations = { query: queryStr, variables: vars };
        formData.append('operations', JSON.stringify(operations));
        formData.append('map', JSON.stringify({ '0': [mapPath] }));
        formData.append('0', uploadFile);
        body = formData;
    } else {
        headers['Content-Type'] = 'application/json';
        body = JSON.stringify({ query: queryStr, variables: vars });
    }

    const response = await fetch(apiUrl, { method: 'POST', headers, credentials: 'include', body });
    if (!response.ok) {
        const text = await response.text();
        throw new Error(`HTTP ${response.status}: ${text.substring(0, 200)}`);
    }
    const json = await response.json();
    if (json.errors) throw new Error(json.errors[0].message);
    return json.data;
}

const SECTION_TEMPLATES: Record<string, any> = {
    THEME_SETTINGS: {
        primaryColor: '#0f172a',
        secondaryColor: '#f59e0b',
        backgroundColor: '#ffffff',
        fontFamily: 'Inter, sans-serif',
        borderRadius: '8px',
        layoutMode: 'boxed',
        backgroundType: 'color',
        backgroundImageUrl: '',
        backgroundVideoUrl: ''
    },
    TOP_BAR: {
        text: "Livraison gratuite dès 50.000 FCFA ! 🚚",
        backgroundColor: '#0f172a',
        textColor: '#ffffff',
        showSocials: true,
        adMediaType: 'image',
        adMediaUrl: '',
        adLink: ''
    },
    HEADER_CONF: {
        siteName: 'AHIZAN',
        logoUrl: '',
        sticky: true,
        layoutType: 'standard',
        columnCount: 1,
        columnsData: [],
        menuItems: [
            { label: 'Accueil', link: '/' },
            { label: 'Boutique', link: '/search' },
            { label: 'Vendeurs', link: '/vendors' }
        ],
        showSearch: true,
        searchPlaceholder: 'Rechercher un produit, une marque ou une catégorie',
        showVendorLink: true,
        vendorLinkText: 'Vendez sur AHIZAN',
        vendorLinkUrl: '/register',
        helpLinks: [{ label: 'Aide', link: '/help' }]
    },
    HERO: {
        title: "Découvrez l'Afrique Autrement",
        subtitle: "La première plateforme de commerce électronique panafricaine dédiée aux produits authentiques.",
        ctaText: "Acheter Maintenant",
        ctaLink: "/search",
        backgroundImage: "https://images.unsplash.com/photo-1523381210434-271e8be1f52b",
        textAlign: "center",
        overlayColor: "rgba(15, 23, 42, 0.5)",
        height: "md"
    },
    BANNER: {
        title: "Offre Spéciale",
        subtitle: "Profitez de nos remises exclusives cette semaine.",
        imageUrl: "https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?auto=format&fit=crop&q=80&w=2000",
        link: "/search",
        ctaText: "Découvrir",
        backgroundColor: "#2563eb"
    },
    PRODUCT_GRID: {
        title: "Produits Vedettes",
        collectionSlug: "electronics",
        filterType: "LATEST",
        take: 8,
        layout: "grid"
    },
    BLOG_POSTS: {
        title: "Actualités & Publications",
        items: [
            { id: '1', title: "Comment choisir vos produits AHIZAN ?", excerpt: "Découvrez nos conseils pour sélectionner les meilleurs articles...", date: "12 Mars 2026", imageUrl: "", link: "/blog" },
            { id: '2', title: "Les tendances du moment", excerpt: "Restez à la pointe de la mode avec notre nouvelle collection...", date: "10 Mars 2026", imageUrl: "", link: "/blog" }
        ],
        layout: "grid"
    },
    FEATURES: {
        features: [
            { title: "Service 24/7", description: "Nous sommes là pour vous aider.", icon: "Check" },
            { title: "Paiement Sécurisé", description: "Transactions protégées.", icon: "Shield" },
            { title: "Qualité Garantie", description: "Produits sélectionnés.", icon: "Star" }
        ]
    },
    CATEGORY_GRID: {
        title: "Nos Collections",
        categories: [],
        layout: "grid"
    },
    FLEX_GRID: {
        title: "Nos Services / Avantages",
        template: 'IMAGE_LEFT', // IMAGE_LEFT, IMAGE_RIGHT, IMAGE_TOP
        columns: 3,
        items: [
            { title: "Service 24/7", description: "Qualité AHIZAN garantie.", imageUrl: "" },
            { title: "Paiement Sécurisé", description: "Transactions protégées.", imageUrl: "" },
            { title: "Qualité Garantie", description: "Produits sélectionnés.", imageUrl: "" }
        ]
    },
    FOOTER_CONF: {
        about: "AHIZAN est votre marketplace de confiance pour le shopping en ligne au Bénin. Nous nous engageons à vous offrir le meilleur service.",
        facebook: "https://facebook.com/ahizan",
        instagram: "",
        twitter: "",
        youtube: "",
        linkedin: "",
        tiktok: "",
        whatsapp: "+22900000000",
        appStoreUrl: "",
        playStoreUrl: "",
        showNewsletter: true,
        newsletterTitle: "NOUVEAU SUR AHIZAN ?",
        newsletterSubtitle: "Inscrivez-vous pour recevoir nos offres exclusives et nouveautés.",
        linkGroups: [
            { title: "BESOIN D'AIDE ?", links: [{ label: 'Discuter avec nous', link: '/contact' }, { label: 'Aide & FAQ', link: '/help' }, { label: 'Contactez-nous', link: '/contact' }] },
            { title: 'LIENS UTILES', links: [{ label: 'Suivre sa commande', link: '/account/orders' }, { label: 'Politique de retour', link: '/returns' }, { label: 'Comment commander ?', link: '/how-to' }] },
            { title: 'À PROPOS', links: [{ label: 'Qui sommes-nous', link: '/about' }, { label: 'Conditions générales', link: '/terms' }, { label: 'Politique de confidentialité', link: '/privacy' }] }
        ],
        paymentMethods: ['Mobile Money', 'Cash'],
        brands: ['Samsung', 'Apple', 'Nike', 'Adidas', 'Infinix', 'Tecno'],
        copyrightText: "© 2026 AHIZAN. Tous droits réservés."
    },
    HERO_SLIDER: {
        slides: [
            { title: "Bienvenue sur AHIZAN", subtitle: "La marketplace du Bénin", ctaText: "Acheter", ctaLink: "/search", imageUrl: "https://images.unsplash.com/photo-1523381210434-271e8be1f52b", overlayColor: "rgba(0,0,0,0.4)", textAlign: "center" },
            { title: "Nouveautés", subtitle: "Découvrez nos derniers arrivages", ctaText: "Voir", ctaLink: "/search", imageUrl: "https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da", overlayColor: "rgba(0,0,0,0.4)", textAlign: "left" }
        ],
        autoPlay: true,
        interval: 5000,
        height: "md"
    },
    SEARCH_BAR: {
        placeholder: "Rechercher un produit, une marque, une catégorie...",
        backgroundColor: "#F8FAFC",
        quickLinks: [
            { label: "Électronique", link: "/search?q=electronique" },
            { label: "Mode", link: "/search?q=mode" },
            { label: "Maison", link: "/search?q=maison" }
        ]
    },
    PROMO_GRID: {
        title: "Promotions",
        layout: "2cols",
        items: [
            { title: "Soldes d'été", subtitle: "Jusqu'à -50%", imageUrl: "", link: "/search" },
            { title: "Nouveautés", subtitle: "Arrivages de la semaine", imageUrl: "", link: "/search" }
        ]
    },
    RECENTLY_VIEWED: {
        title: "Vus récemment",
        take: 8
    },
    CTA_VENDOR: {
        title: "Vendez sur AHIZAN",
        subtitle: "Rejoignez des milliers de vendeurs et touchez des millions d'acheteurs au Bénin.",
        ctaText: "Devenir vendeur",
        ctaLink: "/register",
        backgroundImage: "",
        overlayColor: "rgba(15, 23, 42, 0.85)"
    },
    NEWSLETTER: {
        title: "Restez informé",
        subtitle: "Inscrivez-vous pour recevoir nos offres exclusives.",
        placeholder: "Votre adresse email",
        buttonText: "S'inscrire",
        backgroundColor: "#F8FAFC"
    },
    TESTIMONIALS: {
        title: "Ce que disent nos clients",
        testimonials: [
            { name: "Koffi A.", text: "Service excellent, livraison rapide !", rating: 5, role: "Client fidèle" },
            { name: "Aïcha M.", text: "J'adore la qualité des produits sur AHIZAN.", rating: 5, role: "Acheteuse" }
        ]
    },
    VENDOR_SHOWCASE: {
        title: "Nos Vendeurs",
        description: "Découvrez les meilleurs vendeurs de la plateforme",
        take: 8,
        layout: "grid"
    }
};

// --- Helper for Icons in Section List ---
function getSectionIcon(type: string) {
    switch (type) {
        case 'TOP_BAR': return '🏷️';
        case 'HEADER_CONF': return '🧭';
        case 'HERO': return '🖼️';
        case 'HERO_SLIDER': return '🎠';
        case 'QUICK_LINKS': return '📱';
        case 'FLASH_DEALS': return '⚡';
        case 'PRODUCT_GRID': return '📦';
        case 'BRAND_SHOWCASE': return '👟';
        case 'CATEGORY_SHOWCASE': return '📂';
        case 'BANNER': return '📰';
        case 'FEATURES': return '✅';
        case 'APP_PROMO': return '📲';
        case 'FOOTER_CONF': return '🦶';
        case 'THEME_SETTINGS': return '🎨';
        default: return '🧩';
    }
}

function getSectionDescription(type: string) {
    switch (type) {
        case 'TOP_BAR': return 'Petite bannière d\'annonce tout en haut.';
        case 'HEADER_CONF': return 'Logo, menu et barre de recherche.';
        case 'HERO': return 'Section principale avec titre et image.';
        case 'HERO_SLIDER': return 'Carousel d\'images promotionnelles.';
        case 'QUICK_LINKS': return 'Raccourcis vers les catégories populaires.';
        case 'FLASH_DEALS': return 'Ventes à durée limitée avec compte à rebours.';
        case 'PRODUCT_GRID': return 'Grille de produits personnalisable.';
        case 'FOOTER_CONF': return 'Informations de contact et liens utiles.';
        default: return 'Section personnalisable de votre boutique.';
    }
}

export function LandingPageBuilder() {
    const [view, setView] = useState<'ROADMAP' | 'EDITING_BANNER'>('ROADMAP');
    const [bannerConfig, setBannerConfig] = useState<any>(null);
    const [isSaving, setIsSaving] = useState(false);

    // Initial fetch of banner config
    useEffect(() => {
        fetch('http://localhost:3000/banner/config')
            .then(res => res.json())
            .then(data => setBannerConfig(data))
            .catch(err => console.error('Error fetching banner config:', err));
    }, []);

    const handleUpload = async (event: any, type: 'desktop' | 'mobile') => {
        const file = event.target.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('file', file);

        try {
            const res = await fetch('http://localhost:3000/banner/upload', {
                method: 'POST',
                body: formData
            });
            const data = await res.json();
            if (data.url) {
                setBannerConfig({
                    ...bannerConfig,
                    [type === 'desktop' ? 'desktopImageUrl' : 'mobileImageUrl']: data.url
                });
            }
        } catch (err) {
            alert("Erreur lors de l'upload de l'image.");
        }
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await fetch('http://localhost:3000/banner/config', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(bannerConfig)
            });
            alert('Paramètres enregistrés avec succès !');
        } catch (err) {
            alert("Erreur lors de l'enregistrement.");
        } finally {
            setIsSaving(false);
        }
    };

    // Mapping for our groups and sections
    const groups = [
        // ... (rest of groups definition)
        {
            title: "0. General Site Settings",
            description: "Global configurations for the entire storefront.",
            sections: [
                { id: 'global-layout', type: 'GLOBAL', title: "Layout & Spacing", desc: "Site width, container margins, and default padding." },
                { id: 'global-colors', type: 'GLOBAL', title: "Color Palette", desc: "Main branding colors (Red, Navy Blue, White)." },
                { id: 'global-typography', type: 'GLOBAL', title: "Typography", desc: "Font families and base text sizes." }
            ]
        },
        {
            title: "1. The Header Ecosystem (The Top Layer)",
            description: "Control what customers see first—ads, navigation, and site-wide utilities.",
            sections: [
                { id: 'top-flash-banner', type: 'TOP_BAR', title: "TopFlashBanner", desc: "Time-sensitive announcement bar." },
                { id: 'utility-header', type: 'UTILITY_HEADER', title: "UtilityHeader", desc: "Language, Account, and Vendor links." },
                { id: 'main-navbar', type: 'HEADER_CONF', title: "MainNavbar", desc: "Logo, Search and primary navigation." }
            ]
        },
        {
            title: "2. The Hero Block (The 'Above the Fold' Section)",
            description: "The primary entry point of your homepage. High-visual impact area.",
            sections: [
                { id: 'category-sidebar', type: 'CATEGORY_SIDEBAR', title: "CategorySidebar", desc: "Animated vertical category list." },
                { id: 'hero-carousel', type: 'HERO', title: "HeroCarousel", desc: "Main marketing sliding banners." },
                { id: 'service-panel', type: 'SERVICE_PANEL', title: "ServicePanel", desc: "WhatsApp, Support, and Vendor boxes." }
            ]
        },
        {
            title: "3. Navigation & Promotional Triggers",
            description: "Fast-access grids and high-urgency sales sections.",
            sections: [
                { id: 'quick-links-grid', type: 'QUICK_LINKS', title: "QuickLinksGrid", desc: "Circular icons for services/popular categories." },
                { id: 'flash-sales-section', type: 'FLASH_DEALS', title: "FlashSalesSection", desc: "Urgency section with countdown and stock." },
                { id: 'brand-showcase', type: 'BRAND_SHOWCASE', title: "BrandShowcase", desc: "Scrolling list of official partner brands." }
            ]
        },
        {
            title: "4. Content & Discovery Sections",
            description: "Drive interest through curated collections and large banners.",
            sections: [
                { id: 'category-showcase', type: 'PRODUCT_GRID', title: "CategoryShowcase", desc: "Selected product grids per category." },
                { id: 'billboard-banner', type: 'BANNER', title: "BillboardBanner", desc: "Full-width posters to break up the scroll." },
                { id: 'recommendations-feed', type: 'RECENTLY_VIEWED', title: "RecommendationsFeed", desc: "Personalized product recommendations." }
            ]
        },
        {
            title: "5. Trust & Footer (The Foundation)",
            description: "Build confidence and provide site-wide links and SEO content.",
            sections: [
                { id: 'benefits-bar', type: 'FEATURES', title: "BenefitsBar", desc: "Free Delivery, Secure Payment guarantees." },
                { id: 'app-promotion', type: 'APP_PROMO', title: "AppPromotion", desc: "Link to download the Mobile App." },
                { id: 'main-footer', type: 'FOOTER_CONF', title: "MainFooter", desc: "Full list of links and social icons." },
                { id: 'seo-text-section', type: 'SEO_TEXT', title: "SeoTextSection", desc: "Rich text for SEO and site description." }
            ]
        }
    ];

    const { data: pagesData, isLoading, error } = useQuery({
        queryKey: ['pages'],
        queryFn: () => fetchGraphQL(GET_PAGES, { options: { take: 10 } })
    });

    if (view === 'EDITING_BANNER') {
        return (
            <div style={{ padding: '40px', background: '#f8fafc', minHeight: '100vh' }}>
                <button 
                    onClick={() => setView('ROADMAP')}
                    style={{ background: '#fff', border: '1px solid #e2e8f0', padding: '10px 20px', borderRadius: '10px', fontSize: '14px', fontWeight: 'bold', cursor: 'pointer', marginBottom: '32px' }}
                >
                    ← Retour au Roadmap
                </button>

                <div style={{ background: '#fff', borderRadius: '24px', padding: '48px', border: '1px solid #e2e8f0', maxWidth: '900px', boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
                    <h2 style={{ fontSize: '28px', fontWeight: '900', color: '#0f172a', marginBottom: '8px' }}>🚀 Personnalisation du TopFlashBanner</h2>
                    <p style={{ color: '#64748b', fontSize: '15px', marginBottom: '40px' }}>Gérez la bannière publicitaire tout en haut de votre boutique.</p>

                    {/* Mode Selector */}
                    <div style={{ display: 'flex', gap: '8px', marginBottom: '32px', background: '#f1f5f9', padding: '6px', borderRadius: '14px', width: 'fit-content' }}>
                        <button 
                            onClick={() => setBannerConfig({ ...bannerConfig, type: 'image' })}
                            style={{ 
                                padding: '10px 20px', borderRadius: '10px', fontSize: '13px', fontWeight: '800', border: 'none', cursor: 'pointer',
                                background: bannerConfig?.type === 'image' || !bannerConfig?.type ? '#fff' : 'transparent', 
                                boxShadow: bannerConfig?.type === 'image' || !bannerConfig?.type ? '0 2px 4px rgba(0,0,0,0.05)' : 'none',
                                color: bannerConfig?.type === 'image' || !bannerConfig?.type ? '#002f6c' : '#64748b'
                            }}
                        >
                            🖼️ Mode Image (Bannières)
                        </button>
                        <button 
                            onClick={() => setBannerConfig({ ...bannerConfig, type: 'text' })}
                            style={{ 
                                padding: '10px 20px', borderRadius: '10px', fontSize: '13px', fontWeight: '800', border: 'none', cursor: 'pointer',
                                background: bannerConfig?.type === 'text' ? '#fff' : 'transparent', 
                                boxShadow: bannerConfig?.type === 'text' ? '0 2px 4px rgba(0,0,0,0.05)' : 'none',
                                color: bannerConfig?.type === 'text' ? '#002f6c' : '#64748b'
                            }}
                        >
                            ✍️ Mode Texte (Annonce Flash)
                        </button>
                    </div>

                    {bannerConfig?.type === 'text' ? (
                        /* Text Mode Fields */
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                <label style={{ fontSize: '12px', fontWeight: '900', color: '#002f6c', textTransform: 'uppercase' }}>Étiquette (Ex: Flash Ad)</label>
                                <input 
                                    type="text"
                                    value={bannerConfig?.topText || ''}
                                    onChange={(e) => setBannerConfig({ ...bannerConfig, topText: e.target.value })}
                                    style={{ padding: '14px 20px', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '14px' }}
                                />
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                <label style={{ fontSize: '12px', fontWeight: '900', color: '#002f6c', textTransform: 'uppercase' }}>Message Principal</label>
                                <textarea 
                                    value={bannerConfig?.mainText || ''}
                                    onChange={(e) => setBannerConfig({ ...bannerConfig, mainText: e.target.value })}
                                    style={{ padding: '14px 20px', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '14px', minHeight: '80px', fontFamily: 'inherit' }}
                                />
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                <label style={{ fontSize: '12px', fontWeight: '900', color: '#002f6c', textTransform: 'uppercase' }}>Texte du Lien (Ex: En savoir plus)</label>
                                <input 
                                    type="text"
                                    value={bannerConfig?.linkText || ''}
                                    onChange={(e) => setBannerConfig({ ...bannerConfig, linkText: e.target.value })}
                                    style={{ padding: '14px 20px', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '14px' }}
                                />
                            </div>
                        </div>
                    ) : (
                        /* Image Mode Fields */
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '40px' }}>
                            {/* Desktop Image Section */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                <label style={{ fontSize: '12px', fontWeight: '900', color: '#002f6c', textTransform: 'uppercase' }}>Bannière Desktop (Large)</label>
                                <div style={{ 
                                    width: '100%', height: '140px', background: '#f8fafc', borderRadius: '16px', border: '2px dashed #e2e8f0', 
                                    overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' 
                                }}>
                                    {bannerConfig?.desktopImageUrl ? (
                                        <img src={`http://localhost:3000${bannerConfig.desktopImageUrl}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="Desktop Preview" />
                                    ) : (
                                        <span style={{ color: '#94a3b8', fontSize: '12px' }}>Aucune image sélectionnée</span>
                                    )}
                                </div>
                                <input type="file" onChange={(e) => handleUpload(e, 'desktop')} style={{ fontSize: '12px' }} />
                            </div>

                            {/* Mobile Image Section */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                <label style={{ fontSize: '12px', fontWeight: '900', color: '#002f6c', textTransform: 'uppercase' }}>Bannière Mobile (Portrait)</label>
                                <div style={{ 
                                    width: '100px', height: '140px', background: '#f8fafc', borderRadius: '16px', border: '2px dashed #e2e8f0', 
                                    overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' 
                                }}>
                                    {bannerConfig?.mobileImageUrl ? (
                                        <img src={`http://localhost:3000${bannerConfig.mobileImageUrl}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="Mobile Preview" />
                                    ) : (
                                        <span style={{ color: '#94a3b8', fontSize: '10px', textAlign: 'center' }}>Aucune image</span>
                                    )}
                                </div>
                                <input type="file" onChange={(e) => handleUpload(e, 'mobile')} style={{ fontSize: '12px' }} />
                            </div>
                        </div>
                    )}

                    <div style={{ height: '1px', background: '#f1f5f9', margin: '40px 0' }}></div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            <label style={{ fontSize: '12px', fontWeight: '900', color: '#002f6c', textTransform: 'uppercase' }}>URL de Redirection (Target URL)</label>
                            <input 
                                type="text"
                                placeholder="Ex: /promotions"
                                value={bannerConfig?.targetUrl || ''}
                                onChange={(e) => setBannerConfig({ ...bannerConfig, targetUrl: e.target.value })}
                                style={{ padding: '14px 20px', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '14px', width: '100%' }}
                            />
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px', background: '#f8fafc', borderRadius: '16px', border: '1px solid #f1f5f9' }}>
                            <div>
                                <h4 style={{ margin: 0, fontSize: '15px', fontWeight: '800', color: '#0f172a' }}>Visibilité de la bannière</h4>
                                <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#64748b' }}>Activez ou désactivez l'affichage sur la boutique.</p>
                            </div>
                            <button 
                                onClick={() => setBannerConfig({ ...bannerConfig, isActive: !bannerConfig.isActive })}
                                style={{ 
                                    padding: '10px 24px', borderRadius: '12px', fontWeight: '900', fontSize: '12px', border: 'none', cursor: 'pointer',
                                    background: bannerConfig?.isActive ? '#059669' : '#e2e8f0', color: bannerConfig?.isActive ? '#fff' : '#475569'
                                }}
                            >
                                {bannerConfig?.isActive ? 'ACTIVÉE' : 'DÉSACTIVÉE'}
                            </button>
                        </div>
                    </div>

                    <button 
                        onClick={handleSave}
                        disabled={isSaving}
                        style={{ 
                            marginTop: '48px', width: '100%', padding: '16px', borderRadius: '12px', border: 'none', cursor: 'pointer',
                            background: '#002f6c', color: '#fff', fontSize: '15px', fontWeight: '800', boxShadow: '0 10px 15px -3px rgba(0,47,108,0.3)'
                        }}
                    >
                        {isSaving ? 'Enregistrement...' : 'SAUVEGARDER LES PARAMÈTRES'}
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div style={{ padding: '40px', background: '#f8fafc', minHeight: '100vh', fontFamily: 'Inter, sans-serif' }}>
            <header style={{ marginBottom: '40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h1 style={{ margin: 0, fontSize: '24px', fontWeight: '900', color: '#0f172a' }}>🗺️ ROADMAP DU PAGE BUILDER</h1>
                    <p style={{ margin: '4px 0 0 0', color: '#64748b', fontSize: '14px' }}>Structure ordonnée de votre boutique Ahizan</p>
                </div>
                <div style={{ background: '#002f6c', color: '#fff', padding: '8px 16px', borderRadius: '8px', fontSize: '12px', fontWeight: 'bold' }}>
                    CONFIGURÉ POUR AHIZAN
                </div>
            </header>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '32px', maxWidth: '1000px' }}>
                {groups.map((group, gIdx) => (
                    <div key={gIdx} style={{ background: '#fff', borderRadius: '16px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 1px 3px 0 rgba(0,0,0,0.1)' }}>
                        <div style={{ padding: '24px', background: '#f1f5f9', borderBottom: '1px solid #e2e8f0' }}>
                            <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '800', color: '#0f172a' }}>{group.title}</h2>
                            <p style={{ margin: '4px 0 0 0', color: '#64748b', fontSize: '13px' }}>{group.description}</p>
                        </div>
                        <div style={{ padding: '0 24px' }}>
                            {group.sections.map((section, sIdx) => (
                                <div key={sIdx} style={{ 
                                    padding: '20px 0', 
                                    borderBottom: sIdx === group.sections.length - 1 ? 'none' : '1px solid #f1f5f9',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center'
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                        <div style={{ 
                                            width: '8px', height: '8px', background: '#e31837', borderRadius: '50%'
                                        }}></div>
                                        <div>
                                            <h3 style={{ margin: 0, fontSize: '15px', fontWeight: '700', color: '#0f172a' }}>{section.title}</h3>
                                            <p style={{ margin: '2px 0 0 0', color: '#94a3b8', fontSize: '12px' }}>{section.desc}</p>
                                        </div>
                                    </div>
                                    <button 
                                        onClick={() => section.id === 'top-flash-banner' ? setView('EDITING_BANNER') : alert(`L'éditeur pour ${section.title} sera prêt prochainement !`)}
                                        style={{ 
                                            background: '#fff', 
                                            border: '1px solid #002f6c', 
                                            color: '#002f6c', 
                                            padding: '8px 16px', 
                                            borderRadius: '8px', 
                                            fontSize: '13px', 
                                            fontWeight: '700', 
                                            cursor: 'pointer',
                                            transition: 'all 0.2s',
                                        }}
                                        onMouseOver={(e) => { e.currentTarget.style.background = '#002f6c'; e.currentTarget.style.color = '#fff'; }}
                                        onMouseOut={(e) => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.color = '#002f6c'; }}
                                    >
                                        Modifier la section
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>

            <footer style={{ marginTop: '60px', padding: '24px 0', borderTop: '1px solid #e2e8f0', color: '#94a3b8', fontSize: '12px' }}>
                Système de Configuration Ahizan — Mode Simplifié
            </footer>
        </div>
    );
}
