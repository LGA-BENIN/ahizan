import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as queries from './queries';
const { GET_PAGE, GET_PAGES, UPDATE_SECTION, CREATE_SECTION, DELETE_SECTION, CREATE_PAGE, INITIALIZE_HOME_PAGE, CREATE_ASSETS, CREATE_CMS_ASSET, GET_FACET_VALUES } = queries;

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
    const [view, setView] = useState<'ROADMAP' | 'EDITING_BANNER' | 'EDITING_HERO' | 'PERSONALIZING_HERO' | 'EDITING_PROMO'>('ROADMAP');
    const [bannerConfig, setBannerConfig] = useState<any>(null);
    const [siteCategories, setSiteCategories] = useState<any[]>([]);

    useEffect(() => {
        const loadCategories = async () => {
            try {
                const data = await fetchGraphQL(GET_FACET_VALUES);
                if (data && data.facetValues) {
                    const items = data.facetValues.items;
                    
                    // Filter for values where the parent facet is "category"-related (SAFELY)
                    const categoryValues = items.filter((iv: any) => 
                        iv.facet?.code?.toLowerCase().includes('cat') || 
                        iv.facet?.name?.toLowerCase().includes('cat')
                    );

                    // Use filtered results if available, otherwise EXTREMELY lenient fallback: ALL items
                    const displayItems = categoryValues.length > 0 ? categoryValues : items.slice(0, 100);

                    setSiteCategories(displayItems.map((iv: any) => ({
                        name: iv.name,
                        slug: iv.code,
                        id: iv.id
                    })));
                }
            } catch (err) {
                console.error("Failed to load categories:", err);
            }
        };
        loadCategories();
    }, []);
    const [heroConfig, setHeroConfig] = useState<any>(null);
    const [promoConfig, setPromoConfig] = useState<any>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [saveStatus, setSaveStatus] = useState<string | null>(null);

    // Auto-clear status after 3 seconds
    useEffect(() => {
        if (saveStatus) {
            const timer = setTimeout(() => setSaveStatus(null), 3000);
            return () => clearTimeout(timer);
        }
    }, [saveStatus]);

    // Initial fetch of configs
    useEffect(() => {
        const fetchConfigs = async () => {
            try {
                const [bannerRes, heroRes, promoRes] = await Promise.all([
                    fetch('http://localhost:3000/banner/config'),
                    fetch('http://localhost:3000/banner/hero-config'),
                    fetch('http://localhost:3000/banner/promo-config')
                ]);
                const bannerData = await bannerRes.json();
                const heroData = await heroRes.json();
                const promoData = await promoRes.json();
                setBannerConfig(bannerData);
                setHeroConfig(heroData);
                setPromoConfig(promoData);
            } catch (err) {
                console.error('Error fetching configs:', err);
            }
        };
        fetchConfigs();
    }, []);

    const handleUpload = async (event: any, target: 'banner-desktop' | 'banner-mobile' | 'hero-bg' | 'hero-flash' | 'promo-bg') => {
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
                if (target === 'hero-bg') {
                    const template = heroConfig.selectedTemplate;
                    setHeroConfig((prev: any) => ({
                        ...prev,
                        [template]: { ...prev[template], bgUrl: data.url }
                    }));
                } else if (target === 'hero-flash') {
                    setHeroConfig((prev: any) => ({
                        ...prev,
                        classic: { ...prev.classic, flashBgUrl: data.url }
                    }));
                } else if (target === 'promo-bg') {
                    setPromoConfig((prev: any) => ({
                        ...prev,
                        promoBanner: { ...prev.promoBanner, bgUrl: data.url }
                    }));
                } else if (target.startsWith('facet-icon-')) {
                    const slug = target.replace('facet-icon-', '');
                    setPromoConfig((prev: any) => ({
                        ...prev,
                        facetMedia: { ...prev.facetMedia, [slug]: data.url }
                    }));
                } else {
                    setBannerConfig((prev: any) => ({
                        ...prev,
                        [target === 'banner-desktop' ? 'desktopImageUrl' : 'mobileImageUrl']: data.url
                    }));
                }
                setSaveStatus('✅ Média mis en ligne !');
            }
        } catch (err) {
            setSaveStatus('❌ Échec de l\'upload.');
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
            setSaveStatus('✅ Configuration enregistrée !');
        } catch (err) {
            setSaveStatus("❌ Erreur d'enregistrement.");
        } finally {
            setIsSaving(false);
        }
    };

    const handleHeroSave = async () => {
        setIsSaving(true);
        try {
            await fetch('http://localhost:3000/banner/hero-config', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(heroConfig)
            });
            setSaveStatus('✅ Template Hero mis à jour !');
        } catch (err) {
            setSaveStatus("❌ Erreur de mise à jour.");
        } finally {
            setIsSaving(false);
        }
    };

    const handlePromoSave = async () => {
        setIsSaving(true);
        try {
            await fetch('http://localhost:3000/banner/promo-config', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(promoConfig)
            });
            setSaveStatus('✅ Section Promo mise à jour !');
        } catch (err) {
            setSaveStatus("❌ Erreur de mise à jour.");
        } finally {
            setIsSaving(false);
        }
    };

    // Shared Status Notification UI
    const StatusNotification = () => saveStatus ? (
        <div style={{ position: 'fixed', top: '24px', right: '24px', padding: '12px 24px', background: saveStatus.includes('✅') ? '#059669' : '#e11d48', color: '#fff', borderRadius: '12px', fontWeight: 'bold', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', zIndex: 9999 }}>
            {saveStatus}
        </div>
    ) : null;

    if (!bannerConfig || !heroConfig || !promoConfig) {
        return <div style={{ padding: '80px', textAlign: 'center', fontSize: '18px', color: '#64748b' }}>Chargement du Page Builder...</div>;
    }

    const currentTemplate = heroConfig.selectedTemplate || 'classic';
    const activeConfig = heroConfig[currentTemplate] || {};

    // ──────────────── RENDERING ────────────────

    if (view === 'EDITING_HERO') {
        return (
            <div style={{ padding: '40px', background: '#f8fafc', minHeight: '100vh' }}>
                <StatusNotification />
                <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }}>
                        <div>
                            <h2 style={{ fontSize: '32px', fontWeight: '900', color: '#0f172a', letterSpacing: '-1px' }}>🏢 Étape 1 : Choisir un Template</h2>
                            <p style={{ color: '#64748b', fontSize: '16px', marginTop: '4px' }}>Sélectionnez la structure visuelle de votre section Hero.</p>
                        </div>
                        <button onClick={() => setView('ROADMAP')} style={{ background: '#fff', border: '1px solid #e2e8f0', padding: '12px 24px', borderRadius: '12px', fontSize: '14px', fontWeight: 'bold', cursor: 'pointer' }}>← Retour</button>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '32px' }}>
                        {[
                            { id: 'classic', title: 'Classic Promo Slider', desc: 'Sidebar + Carousel', img: '/assets/templates/classic.png' },
                            { id: 'bento', title: 'Bento Grid', desc: 'Modern High-Energy Grid', img: '/assets/templates/bento.png' },
                            { id: 'fullwidth', title: 'Full-Width Immersive', desc: 'Massive Video/Image Background', img: '/assets/templates/fullwidth.png' }
                        ].map((t) => (
                            <div key={t.id} onClick={() => { setHeroConfig({ ...heroConfig, selectedTemplate: t.id }); setView('PERSONALIZING_HERO'); }} style={{ background: '#fff', borderRadius: '24px', overflow: 'hidden', border: heroConfig.selectedTemplate === t.id ? '4px solid #e31837' : '1px solid #e2e8f0', cursor: 'pointer' }}>
                                <img src={`http://localhost:3000${t.img}`} style={{ width: '100%', height: '220px', objectFit: 'cover' }} alt={t.title} />
                                <div style={{ padding: '24px' }}>
                                    <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '800' }}>{t.title}</h3>
                                    <p style={{ margin: '8px 0 0 0', fontSize: '14px', color: '#64748b' }}>{t.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    if (view === 'PERSONALIZING_HERO') {
        const t = currentTemplate;
        const config = activeConfig;

        return (
            <div style={{ padding: '40px', background: '#f8fafc', minHeight: '100vh' }}>
                <StatusNotification />
                <div style={{ maxWidth: '900px', margin: '0 auto' }}>
                    <div style={{ display: 'flex', gap: '16px', marginBottom: '32px' }}>
                        <button onClick={() => setView('EDITING_HERO')} style={{ background: '#fff', border: '1px solid #e2e8f0', padding: '12px 24px', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer' }}>← Changer le Template</button>
                        <button onClick={() => setView('ROADMAP')} style={{ background: '#fff', border: '1px solid #e2e8f0', padding: '12px 24px', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer' }}>Annuler</button>
                    </div>

                    <div style={{ background: '#fff', padding: '48px', borderRadius: '24px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
                        <h2 style={{ fontSize: '28px', fontWeight: '900', color: '#0f172a', marginBottom: '8px' }}>✍️ Étape 2 : Personnalisation</h2>
                        <p style={{ color: '#64748b', fontSize: '15px', marginBottom: '40px' }}>Template : <strong>{t.toUpperCase()}</strong></p>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
                            {/* SIDEBAR TOGGLE & GLOBAL COLORS (PROMINENT) */}
                            <div style={{ background: '#eff6ff', padding: '24px', borderRadius: '16px', border: '2px solid #3b82f6' }}>
                                <h3 style={{ fontSize: '14px', fontWeight: '900', color: '#1e40af', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>⚙️ CONFIGURATION GLOBALE HERO</h3>
                                <div style={{ marginBottom: '24px', paddingBottom: '20px', borderBottom: '1px solid #dbeafe' }}>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}>
                                        <input type="checkbox" checked={heroConfig.showSidebar} onChange={(e) => setHeroConfig({ ...heroConfig, showSidebar: e.target.checked })} style={{ width: '20px', height: '20px' }} />
                                        <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#1e40af' }}>Afficher la Sidebar de Catégories (À gauche)</span>
                                    </label>
                                </div>

                                <h3 style={{ fontSize: '12px', fontWeight: '900', color: '#1e40af', marginBottom: '16px', opacity: 0.8 }}>🎨 COULEURS DES TEXTES</h3>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                                    <div>
                                        <label style={{ fontSize: '11px', fontWeight: '900', color: '#1e40af', display: 'block', marginBottom: '8px' }}>TEXTE PRINCIPAL (TITRE/DESC)</label>
                                        <select value={config.mainTextColor || 'white'} onChange={(e) => setHeroConfig({ ...heroConfig, [t]: { ...config, mainTextColor: e.target.value } })} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #3b82f6', fontWeight: 'bold' }}>
                                            <option value="white">⚪ Blanc (Défaut)</option>
                                            <option value="black">⚫ Noir / Sombre</option>
                                            <option value="#e31837">🔴 Rouge Ahizan</option>
                                            <option value="#002f6c">🔵 Bleu Ahizan</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '11px', fontWeight: '900', color: '#1e40af', display: 'block', marginBottom: '8px' }}>TEXTE DES COMPOSANTS (BADGES/CÔTÉ)</label>
                                        <select value={config.modalTextColor || (t === 'classic' ? 'black' : 'white')} onChange={(e) => setHeroConfig({ ...heroConfig, [t]: { ...config, modalTextColor: e.target.value } })} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #3b82f6', fontWeight: 'bold' }}>
                                            <option value="white">⚪ Blanc</option>
                                            <option value="black">⚫ Noir / Sombre</option>
                                            <option value="#e31837">🔴 Rouge Ahizan</option>
                                            <option value="#002f6c">🔵 Bleu Ahizan</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            {/* SECTION PRINCIPALE (CARROUSEL / MILIEU / FOND) */}
                            <div style={{ background: '#f8fafc', padding: '24px', borderRadius: '16px' }}>
                                <h3 style={{ fontSize: '14px', fontWeight: '900', color: '#002f6c', marginBottom: '20px', borderBottom: '2px solid #002f6c', display: 'inline-block' }}>SECTION CENTRALE / FOND</h3>
                                
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                    <label style={{ fontSize: '11px', fontWeight: 'bold' }}>TYPE DE MEDIA</label>
                                    <select value={config.type} onChange={(e) => setHeroConfig({ ...heroConfig, [t]: { ...config, type: e.target.value } })} style={{ padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
                                        <option value="text">Texte Artistique uniquement</option>
                                        <option value="image">Image immersive</option>
                                        <option value="video">Vidéo dynamique</option>
                                    </select>
                                    
                                    {config.type !== 'text' && (
                                        <div style={{ marginTop: '8px' }}>
                                            <label style={{ fontSize: '11px', fontWeight: 'bold' }}>UPLOAD MEDIA ({config.type})</label>
                                            <input type="file" onChange={(e) => handleUpload(e, 'hero-bg')} style={{ display: 'block', marginTop: '8px' }} />
                                            {config.bgUrl && <p style={{ fontSize: '10px', color: '#059669', marginTop: '4px' }}>Fichier : {config.bgUrl}</p>}
                                        </div>
                                    )}

                                    <label style={{ fontSize: '11px', fontWeight: 'bold', marginTop: '16px' }}>TEXTES PRINCIPAUX</label>
                                    <input type="text" placeholder="Titre principal" value={config.title || config.mainTitle || ''} onChange={(e) => setHeroConfig({ ...heroConfig, [t]: { ...config, [t === 'bento' ? 'mainTitle' : 'title']: e.target.value } })} style={{ padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
                                    <textarea placeholder="Description / Sous-titre" value={config.subtitle || config.mainSubtitle || ''} onChange={(e) => setHeroConfig({ ...heroConfig, [t]: { ...config, [t === 'bento' ? 'mainSubtitle' : 'subtitle']: e.target.value } })} style={{ padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', minHeight: '80px' }} />
                                    
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                        <input type="text" placeholder="Texte bouton" value={config.buttonText || config.mainButtonText || ''} onChange={(e) => setHeroConfig({ ...heroConfig, [t]: { ...config, [t === 'bento' ? 'mainButtonText' : 'buttonText']: e.target.value } })} style={{ padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
                                        <input type="text" placeholder="Lien bouton (ex: /search)" value={config.buttonLink || config.mainButtonLink || ''} onChange={(e) => setHeroConfig({ ...heroConfig, [t]: { ...config, [t === 'bento' ? 'mainButtonLink' : 'buttonLink']: e.target.value } })} style={{ padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
                                    </div>
                                </div>
                            </div>

                            {/* CARDS SIDEBAR / BADGES (ASSISTANCE / WHATSAPP / VENDRE) */}
                            <div style={{ background: '#f8fafc', padding: '24px', borderRadius: '16px' }}>
                                <h3 style={{ fontSize: '14px', fontWeight: '900', color: '#002f6c', marginBottom: '20px', borderBottom: '2px solid #002f6c', display: 'inline-block' }}>ASSISTANCE & SERVICES</h3>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                    <div>
                                        <label style={{ fontSize: '11px', fontWeight: 'bold' }}>ASSISTANCE</label>
                                        <input type="text" placeholder="Titre" value={config.assistanceTitle || (config.assistanceTitle === undefined ? 'Assistance' : config.assistanceTitle)} onChange={(e) => setHeroConfig({...heroConfig, [t]: {...config, assistanceTitle: e.target.value}})} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', marginBottom: '8px' }} />
                                        <textarea placeholder="Description (optionnel)" value={config.assistanceDesc || ''} onChange={(e) => setHeroConfig({...heroConfig, [t]: {...config, assistanceDesc: e.target.value}})} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', minHeight: '60px' }} />
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '11px', fontWeight: 'bold' }}>WHATSAPP</label>
                                        <input type="text" placeholder="Titre" value={config.whatsappTitle || (config.whatsappTitle === undefined ? 'WhatsApp' : config.whatsappTitle)} onChange={(e) => setHeroConfig({...heroConfig, [t]: {...config, whatsappTitle: e.target.value}})} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', marginBottom: '8px' }} />
                                        <textarea placeholder="Description (optionnel)" value={config.whatsappDesc || ''} onChange={(e) => setHeroConfig({...heroConfig, [t]: {...config, whatsappDesc: e.target.value}})} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', minHeight: '60px' }} />
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '11px', fontWeight: 'bold' }}>VENDRE SUR AHIZAN</label>
                                        <input type="text" placeholder="Titre" value={config.sellTitle || (config.sellTitle === undefined ? 'Vendre ici' : config.sellTitle)} onChange={(e) => setHeroConfig({...heroConfig, [t]: {...config, sellTitle: e.target.value}})} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', marginBottom: '8px' }} />
                                        <textarea placeholder="Description (optionnel)" value={config.sellDesc || ''} onChange={(e) => setHeroConfig({...heroConfig, [t]: {...config, sellDesc: e.target.value}})} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', minHeight: '60px' }} />
                                    </div>
                                </div>
                            </div>

                            {/* OFFRES FLASH (POUR CLASSIC & BENTO) */}
                            {(t === 'classic' || t === 'bento') && (
                                <div style={{ background: '#f8fafc', padding: '24px', borderRadius: '16px' }}>
                                    <h3 style={{ fontSize: '14px', fontWeight: '900', color: '#002f6c', marginBottom: '20px', borderBottom: '2px solid #002f6c', display: 'inline-block' }}>OFFRES FLASH / CARTE SPECIALE</h3>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                            <div>
                                                <label style={{ fontSize: '11px', fontWeight: 'bold' }}>TITRE FLASH</label>
                                                <input type="text" value={config.flashTitle || ''} onChange={(e) => setHeroConfig({...heroConfig, [t]: {...config, flashTitle: e.target.value}})} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
                                            </div>
                                            <div>
                                                <label style={{ fontSize: '11px', fontWeight: 'bold' }}>REMISE / TEXTE (ex: -70%)</label>
                                                <input type="text" value={config.flashDiscount || config.flashDesc || ''} onChange={(e) => setHeroConfig({...heroConfig, [t]: {...config, [t === 'bento' ? 'flashDesc' : 'flashDiscount']: e.target.value}})} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
                                            </div>
                                        </div>
                                        {t === 'classic' && (
                                            <>
                                                <label style={{ fontSize: '11px', fontWeight: 'bold' }}>FOND CARTE FLASH</label>
                                                <select value={config.flashBgType} onChange={(e) => setHeroConfig({...heroConfig, classic: {...config, flashBgType: e.target.value}})} style={{ padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
                                                    <option value="color">Couleur Unie (Bleu Ahizan)</option>
                                                    <option value="image">Image personnalisée</option>
                                                    <option value="video">Vidéo d'ambiance</option>
                                                </select>
                                                {config.flashBgType !== 'color' && (
                                                    <input type="file" onChange={(e) => handleUpload(e, 'hero-flash')} style={{ marginTop: '4px' }} />
                                                )}
                                            </>
                                        )}
                                    </div>
                                </div>
                            )}

                            <button onClick={handleHeroSave} disabled={isSaving} style={{ background: '#002f6c', color: '#fff', padding: '20px', borderRadius: '14px', border: 'none', fontWeight: '900', cursor: 'pointer', boxShadow: '0 10px 15px -3px rgba(0,47,108,0.3)', transition: 'all 0.2s' }}>{isSaving ? 'Enregistrement en cours...' : 'ENREGISTRER MA PERSONNALISATION'}</button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (view === 'EDITING_PROMO') {
        const p = promoConfig;
        return (
            <div style={{ padding: '40px', background: '#f8fafc', minHeight: '100vh', fontFamily: 'Inter, sans-serif' }}>
                <StatusNotification />
                <div style={{ maxWidth: '800px', margin: '0 auto' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
                        <button onClick={() => setView('ROADMAP')} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#fff', border: '1px solid #e2e8f0', padding: '10px 20px', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer', color: '#64748b' }}>
                            ← Retour au Roadmap
                        </button>
                        <button onClick={handlePromoSave} disabled={isSaving} style={{ background: '#e31837', color: 'white', padding: '12px 32px', borderRadius: '12px', fontWeight: '900', border: 'none', cursor: 'pointer', boxShadow: '0 10px 15px -3px rgba(227, 24, 55, 0.3)' }}>
                            {isSaving ? 'Enregistrement...' : 'ENREGISTRER LA SECTION PROMO'}
                        </button>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                        <h2 style={{ fontSize: '24px', fontWeight: '900', color: '#0f172a' }}>⚡ Navigation & Promotion</h2>
                        
                        {/* QUICKLINKS TOGGLE & STYLE */}
                        <div style={{ background: '#fff', padding: '24px', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}>
                                    <input type="checkbox" checked={p.showQuickLinks} onChange={(e) => setPromoConfig({ ...p, showQuickLinks: e.target.checked })} style={{ width: '20px', height: '20px' }} />
                                    <span style={{ fontSize: '16px', fontWeight: '900', color: '#002f6c' }}>ACTIVER LES RACCOURCIS (QuickLinks)</span>
                                </label>
                                <select value={p.quickLinksStyle || 'circles'} onChange={(e) => setPromoConfig({ ...p, quickLinksStyle: e.target.value })} style={{ padding: '8px 16px', borderRadius: '12px', border: '1px solid #cbd5e1', fontSize: '12px', fontWeight: 'bold', color: '#002f6c' }}>
                                    <option value="circles">🟣 Style Cercles (Défaut)</option>
                                    <option value="cards">🗂️ Style Cartes Modernes</option>
                                    <option value="minimal">🔗 Style Minimaliste</option>
                                </select>
                            </div>
                            
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', marginTop: '24px', paddingBottom: '12px', borderBottom: '1px solid #f1f5f9' }}>
                                <h4 style={{ fontSize: '11px', fontWeight: '900', color: '#64748b', margin: 0 }}>🖼️ IMAGES DES CATÉGORIES ({siteCategories.length} FACTETTES TROUVÉES)</h4>
                                <button 
                                    onClick={async () => {
                                        const data = await fetchGraphQL(GET_FACET_VALUES);
                                        if (data?.facetValues) {
                                            setSiteCategories(data.facetValues.items.map((iv: any) => ({ name: iv.name, slug: iv.code })));
                                        }
                                    }}
                                    style={{ fontSize: '10px', background: '#f1f5f9', border: '1px solid #e2e8f0', padding: '4px 10px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
                                >
                                    🔄 Actualiser la liste
                                </button>
                            </div>

                            {siteCategories.length === 0 ? (
                                <div style={{ padding: '20px', textAlign: 'center', background: '#fff9f9', borderRadius: '12px', border: '1px dashed #feb2b2', color: '#c53030', fontSize: '12px', fontWeight: 'bold' }}>
                                    ⚠️ Aucune facette "category" détectée ! Vérifiez vos réglages Vendure.
                                </div>
                            ) : (
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px' }}>
                                    {siteCategories.map((cat: any) => (
                                        <div key={cat.slug} style={{ background: '#f8fafc', padding: '16px', borderRadius: '16px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                            <div style={{ fontSize: '12px', fontWeight: '900', color: '#002f6c', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cat.name}</div>
                                            
                                            <div style={{ width: '100%', height: '80px', background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', position: 'relative' }}>
                                                {p.facetMedia[cat.slug] ? (
                                                    <>
                                                        <img src={p.facetMedia[cat.slug]} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                        <button 
                                                            onClick={(e) => { e.stopPropagation(); const nm = {...p.facetMedia}; delete nm[cat.slug]; setPromoConfig({...p, facetMedia: nm}) }} 
                                                            style={{ position: 'absolute', top: '4px', right: '4px', background: 'rgba(239, 68, 68, 0.9)', color: 'white', border: 'none', borderRadius: '8px', padding: '4px 8px', fontSize: '10px', cursor: 'pointer', zIndex: 10 }}
                                                        >
                                                            Supprimer
                                                        </button>
                                                    </>
                                                ) : (
                                                    <span style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 'bold' }}>AUCUNE IMAGE</span>
                                                )}
                                            </div>

                                            <label style={{ display: 'block' }}>
                                                <span style={{ fontSize: '9px', fontWeight: 'bold', color: '#64748b', display: 'block', marginBottom: '4px' }}>CHOISIR UNE IMAGE / ICONE</span>
                                                <input type="file" onChange={(e) => handleUpload(e, `facet-icon-${cat.slug}`)} style={{ fontSize: '10px', width: '100%' }} />
                                            </label>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* PROMO BANNER (GRANDE BRADERIE) */}
                        <div style={{ background: '#fff', padding: '32px', borderRadius: '16px', border: p.showPromoBanner ? '2px solid #e31837' : '1px solid #e2e8f0' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
                                <div>
                                    <h3 style={{ fontSize: '16px', fontWeight: '900', color: '#002f6c', margin: 0 }}>GRANDE BRADERIE AHIZAN</h3>
                                    <p style={{ fontSize: '12px', color: '#64748b', mt: '4px' }}>Bannière promotionnelle de transition.</p>
                                </div>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', background: '#f8fafc', padding: '10px 20px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                                    <input type="checkbox" checked={p.showPromoBanner} onChange={(e) => setPromoConfig({ ...p, showPromoBanner: e.target.checked })} />
                                    <span style={{ fontSize: '13px', fontWeight: '900' }}>Activer la bannière</span>
                                </label>
                            </div>

                            {p.showPromoBanner && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                                    {/* Config Types */}
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', padding: '20px', background: '#f8fafc', borderRadius: '12px' }}>
                                        <div>
                                            <label style={{ fontSize: '11px', fontWeight: '900', color: '#64748b', display: 'block', marginBottom: '8px' }}>MODE DE CONTENU</label>
                                            <select value={p.promoBanner.type || 'text'} onChange={(e) => setPromoConfig({ ...p, promoBanner: { ...p.promoBanner, type: e.target.value } })} style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #cbd5e1', fontWeight: 'bold' }}>
                                                <option value="text">✍️ Texte uniquement</option>
                                                <option value="image">🖼️ Image Pleine Page</option>
                                                <option value="video">🎥 Vidéo Pleine Page</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label style={{ fontSize: '11px', fontWeight: '900', color: '#64748b', display: 'block', marginBottom: '8px' }}>COULEUR DU TEXTE</label>
                                            <select value={p.promoBanner.textColor || 'white'} onChange={(e) => setPromoConfig({ ...p, promoBanner: { ...p.promoBanner, textColor: e.target.value } })} style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #cbd5e1', fontWeight: 'bold' }}>
                                                <option value="white">⚪ Blanc (Défaut)</option>
                                                <option value="black">⚫ Noir / Sombre</option>
                                            </select>
                                        </div>
                                    </div>

                                    {/* Text Fields (Title/Sub/CTA) */}
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                                            <div>
                                                <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#64748b', display: 'block', marginBottom: '8px' }}>TITRE DE LA BANNIÈRE</label>
                                                <input type="text" value={p.promoBanner.title} onChange={(e) => setPromoConfig({ ...p, promoBanner: { ...p.promoBanner, title: e.target.value } })} style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #cbd5e1' }} />
                                            </div>
                                            <div>
                                                <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#64748b', display: 'block', marginBottom: '8px' }}>SOUS-TITRE / DESCRIPTION</label>
                                                <input type="text" value={p.promoBanner.subtitle} onChange={(e) => setPromoConfig({ ...p, promoBanner: { ...p.promoBanner, subtitle: e.target.value } })} style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #cbd5e1' }} />
                                            </div>
                                        </div>
                                        <div>
                                            <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#64748b', display: 'block', marginBottom: '8px' }}>TEXTE DU BOUTON</label>
                                            <input type="text" value={p.promoBanner.ctaText} onChange={(e) => setPromoConfig({ ...p, promoBanner: { ...p.promoBanner, ctaText: e.target.value } })} style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #cbd5e1' }} />
                                        </div>
                                    </div>

                                    {/* Background Settings */}
                                    <div style={{ borderTop: '2px solid #f1f5f9', paddingTop: '24px' }}>
                                        <label style={{ fontSize: '11px', fontWeight: '900', color: '#64748b', display: 'block', marginBottom: '16px' }}>CONFIGURATION DU FOND</label>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                            <select value={p.promoBanner.bgType || 'color'} onChange={(e) => setPromoConfig({ ...p, promoBanner: { ...p.promoBanner, bgType: e.target.value } })} style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #cbd5e1', fontWeight: 'bold' }}>
                                                <option value="color">🎨 Couleur Unie</option>
                                                <option value="image">🖼️ Image Personnalisée</option>
                                                <option value="video">🎥 Vidéo d'ambiance</option>
                                            </select>

                                            {p.promoBanner.bgType === 'color' ? (
                                                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                                    <input type="color" value={p.promoBanner.bgColor || '#e31837'} onChange={(e) => setPromoConfig({ ...p, promoBanner: { ...p.promoBanner, bgColor: e.target.value } })} style={{ width: '50px', height: '50px', border: 'none', background: 'none', cursor: 'pointer' }} />
                                                    <input type="text" value={p.promoBanner.bgColor || '#e31837'} onChange={(e) => setPromoConfig({ ...p, promoBanner: { ...p.promoBanner, bgColor: e.target.value } })} style={{ flex: 1, padding: '12px', borderRadius: '10px', border: '1px solid #cbd5e1' }} />
                                                </div>
                                            ) : (
                                                <div style={{ padding: '20px', background: '#f8fafc', borderRadius: '12px', border: '1px dashed #cbd5e1' }}>
                                                    <input type="file" onChange={(e) => handleUpload(e, 'promo-bg')} style={{ fontSize: '13px' }} />
                                                    {p.promoBanner.bgUrl && (
                                                        <div style={{ marginTop: '12px', fontSize: '11px', color: '#002f6c' }}>
                                                            ✅ Fichier actif : <strong>{p.promoBanner.bgUrl}</strong>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (view === 'EDITING_BANNER') {
        const b = bannerConfig;
        return (
            <div style={{ padding: '40px', background: '#f8fafc', minHeight: '100vh' }}>
                <StatusNotification />
                <button onClick={() => setView('ROADMAP')} style={{ background: '#fff', border: '1px solid #e2e8f0', padding: '10px 20px', borderRadius: '10px', marginBottom: '32px', fontWeight: 'bold' }}>← Retour</button>
                <div style={{ background: '#fff', padding: '48px', borderRadius: '24px', maxWidth: '800px', margin: '0 auto', border: '1px solid #e2e8f0', boxShadow: '0 10px 25px rgba(0,0,0,0.05)' }}>
                    <h2 style={{ fontSize: '28px', fontWeight: '900', color: '#0f172a', marginBottom: '40px' }}>🚀 TopFlashBanner Management</h2>
                    
                    <div style={{ display: 'flex', gap: '8px', marginBottom: '40px', background: '#f1f5f9', padding: '6px', borderRadius: '12px', width: 'fit-content' }}>
                         <button onClick={() => setBannerConfig({ ...b, type: 'image' })} style={{ padding: '10px 20px', borderRadius: '10px', fontSize: '13px', border: 'none', background: b.type === 'image' ? '#fff' : 'transparent', fontWeight: '800', cursor: 'pointer', boxShadow: b.type === 'image' ? '0 2px 4px rgba(0,0,0,0.05)' : 'none' }}>🖼️ Image</button>
                         <button onClick={() => setBannerConfig({ ...b, type: 'text' })} style={{ padding: '10px 20px', borderRadius: '10px', fontSize: '13px', border: 'none', background: b.type === 'text' ? '#fff' : 'transparent', fontWeight: '800', cursor: 'pointer', boxShadow: b.type === 'text' ? '0 2px 4px rgba(0,0,0,0.05)' : 'none' }}>✍️ Texte</button>
                    </div>

                    {b.type === 'text' ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                <label style={{ fontSize: '11px', fontWeight: 'bold' }}>ETIQUETTE (FLASH AD)</label>
                                <input type="text" value={b.topText} onChange={(e) => setBannerConfig({ ...b, topText: e.target.value })} placeholder="Ex: Flash Ad" style={{ padding: '14px', borderRadius: '10px', border: '1px solid #e2e8f0' }} />
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                <label style={{ fontSize: '11px', fontWeight: 'bold' }}>MESSAGE PRINCIPAL</label>
                                <textarea value={b.mainText} onChange={(e) => setBannerConfig({ ...b, mainText: e.target.value })} placeholder="Message principal..." style={{ padding: '14px', borderRadius: '10px', border: '1px solid #e2e8f0', minHeight: '80px' }} />
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                <label style={{ fontSize: '11px', fontWeight: 'bold' }}>LIEN (TEXTE)</label>
                                <input type="text" value={b.linkText} onChange={(e) => setBannerConfig({ ...b, linkText: e.target.value })} placeholder="Lien texte..." style={{ padding: '14px', borderRadius: '10px', border: '1px solid #e2e8f0' }} />
                            </div>
                        </div>
                    ) : (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}><label style={{ fontSize: '11px', fontWeight: 'bold' }}>DESKTOP BANNER</label><input type="file" onChange={(e) => handleUpload(e, 'banner-desktop')} /></div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}><label style={{ fontSize: '11px', fontWeight: 'bold' }}>MOBILE BANNER</label><input type="file" onChange={(e) => handleUpload(e, 'banner-mobile')} /></div>
                        </div>
                    )}
                    
                    <button onClick={handleSave} disabled={isSaving} style={{ background: '#002f6c', color: '#fff', width: '100%', padding: '18px', borderRadius: '12px', border: 'none', fontWeight: '900', marginTop: '40px', cursor: 'pointer', boxShadow: '0 4px 10px rgba(0,47,108,0.2)' }}>{isSaving ? 'Sauvegarde...' : 'SAUVEGARDER'}</button>
                </div>
            </div>
        );
    }

    // Full Roadmap View
    const groups = [
        {
            title: "0. General Site Settings",
            description: "Configuration globale de la boutique.",
            sections: [
                { id: 'global-layout', title: "Layout & Spacing", desc: "Largeurs, marges et paddings par défaut." },
                { id: 'global-colors', title: "Couleurs & Branding", desc: "Palette principale (Bleu, Rouge Ahizan)." },
                { id: 'global-typography', title: "Typographie", desc: "Polices et tailles de textes de base." }
            ]
        },
        {
            title: "1. The Header Ecosystem",
            description: "Navigation, bannières d'annonces et utilitaires.",
            sections: [
                { id: 'top-flash-banner', title: "TopFlashBanner", desc: "Bannière promo tout en haut." },
                { id: 'utility-header', title: "UtilityHeader", desc: "Compte, Langue, Aide." },
                { id: 'main-navbar', title: "MainNavbar", desc: "Logo, Recherche, Panier." }
            ]
        },
        {
            title: "2. Bloc Hero (Au-dessus de la ligne de flottaison)",
            description: "Section d'impact visuel immédiat.",
            sections: [
                { id: 'hero-carousel', title: "Hero Section Builder", desc: "Le coeur dynamique de la boutique." }
            ]
        },
        {
            title: "3. Déclencheurs de Navigation & Promotion",
            description: "Ventes Flash et liens rapides.",
            sections: [
                { id: 'quick-links', title: "QuickLinks & Grande Braderie", desc: "Raccourcis de catégories et bannière promo." },
                { id: 'flash-sales', title: "Flash Sales Section", desc: "Urgence et compte à rebours (Automatisé)." },
                { id: 'brand-showcase', title: "Brand Showcase", desc: "Logos des partenaires officiels." }
            ]
        },
        {
            title: "4. Content & Discovery",
            description: "Collections et bannières publicitaires.",
            sections: [
                { id: 'category-showcase', title: "Category Showcase", desc: "Grilles de produits par catégorie." },
                { id: 'billboard-banner', title: "Billboard Banner", desc: "Grandes affiches de transition." },
                { id: 'recommendations', title: "Recommendations Feed", desc: "Produits suggérés pour l'utilisateur." }
            ]
        },
        {
            title: "5. Trust & Footer",
            description: "Réassurance et informations légales.",
            sections: [
                { id: 'benefits-bar', title: "BenefitsBar", desc: "Livraison, Paiement sécurisé." },
                { id: 'app-promotion', title: "AppPromotion", desc: "Lien de téléchargement mobile." },
                { id: 'main-footer', title: "MainFooter", desc: "Tous les liens et réseaux sociaux." }
            ]
        }
    ];

    return (
        <div style={{ padding: '40px', background: '#f8fafc', minHeight: '100vh', fontFamily: 'Inter, sans-serif' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }}>
                <div>
                    <h1 style={{ fontSize: '28px', fontWeight: '900', color: '#0f172a', margin: 0 }}>🗺️ ROADMAP DU PAGE BUILDER</h1>
                    <p style={{ margin: '4px 0 0 0', color: '#64748b', fontSize: '14px' }}>Configurez chaque pixel de votre boutique Ahizan</p>
                </div>
                <div style={{ background: '#002f6c', color: '#fff', padding: '10px 20px', borderRadius: '12px', fontSize: '13px', fontWeight: '900' }}>AHIZAN BUILDER V2.0</div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '32px', maxWidth: '1000px' }}>
                {groups.map((group, idx) => (
                    <div key={idx} style={{ background: '#fff', borderRadius: '24px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
                        <div style={{ padding: '24px', background: '#f1f5f9', borderBottom: '1px solid #e2e8f0' }}>
                            <h2 style={{ fontSize: '18px', fontWeight: '800', margin: 0 }}>{group.title}</h2>
                            <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#64748b' }}>{group.description}</p>
                        </div>
                        <div style={{ padding: '0 24px' }}>
                            {group.sections.map((s, sIdx) => (
                                <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 0', borderBottom: sIdx === group.sections.length - 1 ? 'none' : '1px solid #f8fafc' }}>
                                    <div>
                                        <h3 style={{ margin: 0, fontSize: '15px', fontWeight: '700' }}>{s.title}</h3>
                                        <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#64748b' }}>{s.desc}</p>
                                    </div>
                                    <button onClick={() => { 
                                        if (s.id === 'top-flash-banner') setView('EDITING_BANNER'); 
                                        else if (s.id === 'hero-carousel') setView('EDITING_HERO'); 
                                        else if (s.id === 'quick-links') setView('EDITING_PROMO');
                                        else alert('Module en cours de développement...'); 
                                    }} style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #002f6c', color: '#002f6c', fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.2s' }}>Modifier</button>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
            
            <footer style={{ marginTop: '60px', padding: '24px 0', borderTop: '1px solid #e2e8f0', textAlign: 'center', color: '#94a3b8', fontSize: '12px' }}>
                Système de Configuration Ahizan — Mode Superadmin
            </footer>
        </div>
    );
}
