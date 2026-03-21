import React, { useState } from 'react';
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

// --- Visual Preview Mockup ---
function VisualPreview({ sections }: { sections: any[] }) {
    const safeParse = (json: string) => {
        try {
            return JSON.parse(json || '{}');
        } catch (e) {
            console.error('[VisualPreview] JSON parse error:', e);
            return {};
        }
    };

    const sorted = [...sections].sort((a, b) => a.order - b.order);
    const theme = safeParse(sections.find(s => s.type === 'THEME_SETTINGS')?.dataJson);
    const header = safeParse(sections.find(s => s.type === 'HEADER_CONF')?.dataJson);
    const topBar = safeParse(sections.find(s => s.type === 'TOP_BAR')?.dataJson);
    const footer = safeParse(sections.find(s => s.type === 'FOOTER_CONF')?.dataJson);

    return (
        <div style={{
            width: '100%',
            height: '100%',
            background: theme.backgroundType === 'color' ? (theme.backgroundColor || '#f1f5f9') : '#f1f5f9',
            backgroundImage: theme.backgroundType === 'image' && theme.backgroundImageUrl ? `url(${theme.backgroundImageUrl})` : 'none',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            borderRadius: '12px',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: 'inset 0 2px 10px rgba(0,0,0,0.1)',
            border: '8px solid #0f172a',
            position: 'relative'
        }}>
            {/* Background Video Mockup */}
            {theme.backgroundType === 'video' && theme.backgroundVideoUrl && (
                <div style={{ position: 'absolute', inset: 0, zIndex: 0, opacity: 0.2, background: '#000' }}>
                    <div style={{ padding: '20px', color: '#fff', fontSize: '10px', textAlign: 'center' }}>[📹 Vidéo de fond active]</div>
                </div>
            )}

            <div style={{ position: 'relative', zIndex: 1, height: '100%', display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
                {/* Header Area Wrapper (Sticky feel) */}
                <div style={{ background: '#fff', borderBottom: '1px solid #e2e8f0' }}>
                    {/* Top Ad Mockup */}
                    {topBar.adMediaUrl && (
                        <div style={{ background: '#0369a1', color: '#fff', padding: '6px', textAlign: 'center', fontSize: '9px', fontWeight: 'bold' }}>
                            {topBar.adMediaType === 'video' ? '📺 Publication Vidéo en cours' : '🖼️ Image publicitaire active'}
                        </div>
                    )}

                    {/* Top Bar Mockup */}
                    {topBar.text && (
                        <div style={{ background: topBar.backgroundColor || '#0f172a', color: topBar.textColor || '#fff', padding: '6px', textAlign: 'center', fontSize: '10px', fontWeight: 'bold' }}>
                            {topBar.text}
                        </div>
                    )}

                    {/* Navbar Mockup */}
                    <div style={{
                        padding: '12px 20px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        maxWidth: theme.layoutMode === 'boxed' ? '90%' : '100%',
                        margin: '0 auto',
                        width: '100%'
                    }}>
                        {header.layoutType === 'columns' ? (
                            <div style={{ display: 'grid', gridTemplateColumns: `repeat(${header.columnCount || 1}, 1fr)`, width: '100%', gap: '15px' }}>
                                {(header.columnsData || []).map((col: any, i: number) => (
                                    <div key={i} style={{ fontSize: '10px', textAlign: 'center', background: '#f8fafc', padding: '6px', borderRadius: '6px', border: '1px dashed #cbd5e1' }}>
                                        {col.type === 'image' ? (col.imageUrl ? '🖼️ Image' : '🖼️ Vide') : (col.content || 'Texte')}
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <>
                                <div style={{ fontWeight: 'black', fontSize: '14px', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px', fontStyle: 'italic' }}>
                                    {header.logoUrl ? <div style={{ width: '22px', height: '22px', background: '#eee', borderRadius: '4px' }}></div> : '⭐'}
                                    {header.siteName || 'AHIZAN'}
                                </div>
                                <div style={{ display: 'flex', gap: '15px' }}>
                                    {(header.menuItems || []).slice(0, 3).map((item: any, i: number) => (
                                        <span key={i} style={{ fontSize: '10px', color: '#64748b', fontWeight: 'bold', textTransform: 'uppercase' }}>{item.label}</span>
                                    ))}
                                </div>
                            </>
                        )}
                    </div>
                </div>

                {/* Content Area Rendering Mockups for each section */}
                <div style={{
                    flex: 1,
                    maxWidth: theme.layoutMode === 'boxed' ? '90%' : '100%',
                    margin: '0 auto',
                    width: '100%',
                    padding: '20px 0'
                }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        {sorted.map((section: any, idx: number) => {
                            if (['THEME_SETTINGS', 'HEADER_CONF', 'TOP_BAR', 'FOOTER_CONF', 'POPUP'].includes(section.type)) return null;
                            const data = safeParse(section.dataJson);

                            return (
                                <div key={section.id} style={{
                                    background: 'rgba(255,255,255,0.95)',
                                    borderRadius: theme.borderRadius || '16px',
                                    border: '1px solid #e2e8f0',
                                    padding: '20px',
                                    boxShadow: '0 4px 6px rgba(0,0,0,0.02)'
                                }}>
                                    <div style={{ fontSize: '10px', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '10px', display: 'flex', justifyContent: 'space-between' }}>
                                        <span>{section.type}</span>
                                        <span>#{idx + 1}</span>
                                    </div>

                                    {section.type === 'HERO' && (
                                        <div style={{ textAlign: data.textAlign || 'center', padding: '20px 0' }}>
                                            <h2 style={{ fontSize: '18px', fontWeight: '900', color: theme.primaryColor || '#0f172a', margin: '0 0 8px 0', textTransform: 'uppercase', fontStyle: 'italic' }}>{data.title || 'Titre Hero'}</h2>
                                            <p style={{ fontSize: '11px', color: '#64748b', margin: '0 0 15px 0' }}>{data.subtitle}</p>
                                            <div style={{ display: 'inline-block', padding: '8px 16px', background: theme.primaryColor || '#0f172a', color: '#fff', borderRadius: '6px', fontSize: '10px', fontWeight: 'bold' }}>{data.ctaText}</div>
                                        </div>
                                    )}

                                    {section.type === 'PRODUCT_GRID' && (
                                        <div>
                                            <div style={{ fontWeight: 'bold', fontSize: '13px', marginBottom: '12px' }}>{data.title}</div>
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '8px' }}>
                                                {[1, 2, 3, 4].map(i => (
                                                    <div key={i} style={{ aspectRatio: '1/1', background: '#f1f5f9', borderRadius: '8px' }}></div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {section.type === 'FLEX_GRID' && (
                                        <div>
                                            <div style={{ fontWeight: 'bold', fontSize: '13px', marginBottom: '12px' }}>{data.title}</div>
                                            <div style={{ display: 'grid', gridTemplateColumns: `repeat(${data.columns || 1}, 1fr)`, gap: '10px' }}>
                                                {(data.items || []).slice(0, (data.columns || 1) * 2).map((item: any, i: number) => {
                                                    const isSideBySide = data.template === 'IMAGE_LEFT' || data.template === 'IMAGE_RIGHT';
                                                    const isRight = data.template === 'IMAGE_RIGHT';
                                                    return (
                                                        <div key={i} style={{ 
                                                            background: '#f8fafc', 
                                                            padding: '8px', 
                                                            borderRadius: '8px', 
                                                            border: '1px solid #f1f5f9',
                                                            display: 'flex',
                                                            flexDirection: isSideBySide ? (isRight ? 'row-reverse' : 'row') : 'column',
                                                            gap: '8px',
                                                            alignItems: 'center'
                                                        }}>
                                                            <div style={{ 
                                                                width: isSideBySide ? '40%' : '100%', 
                                                                height: isSideBySide ? '30px' : '40px', 
                                                                background: '#eee', 
                                                                borderRadius: '4px' 
                                                            }}></div>
                                                            <div style={{ 
                                                                fontSize: '9px', 
                                                                fontWeight: 'bold',
                                                                textAlign: isSideBySide ? (isRight ? 'right' : 'left') : 'center',
                                                                flex: 1
                                                            }}>{item.title}</div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}

                                    {section.type === 'BLOG_POSTS' && (
                                        <div>
                                            <div style={{ fontWeight: 'bold', fontSize: '13px', marginBottom: '12px', display: 'flex', justifyContent: 'space-between' }}>
                                                {data.title}
                                                <span style={{ fontSize: '9px', color: '#2563eb' }}>Voir tout →</span>
                                            </div>
                                            <div style={{ display: 'grid', gridTemplateColumns: data.layout === 'carousel' ? '1fr' : '1fr 1fr 1fr', gap: '10px' }}>
                                                {(data.items || []).slice(0, 3).map((item: any, i: number) => (
                                                    <div key={i} style={{ border: '1px solid #f1f5f9', borderRadius: '8px', overflow: 'hidden' }}>
                                                        <div style={{ width: '100%', height: '40px', background: item.imageUrl ? `url(${item.imageUrl}) center/cover` : '#eee' }}></div>
                                                        <div style={{ padding: '6px', fontSize: '9px', fontWeight: 'bold' }}>{item.title}</div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {!['HERO', 'PRODUCT_GRID', 'FLEX_GRID', 'BLOG_POSTS'].includes(section.type) && (
                                        <div style={{ color: '#94a3b8', fontSize: '10px', fontStyle: 'italic' }}>{section.title || section.type} (Aperçu non disponible)</div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Footer Mockup */}
                <div style={{ background: '#0f172a', color: '#fff', padding: '25px 20px', fontSize: '10px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
                        <div style={{ width: '45%', color: '#94a3b8', lineHeight: '1.6' }}>{footer.about?.substring(0, 100)}...</div>
                        <div style={{ display: 'flex', gap: '12px' }}>
                            {footer.facebook && <span style={{ padding: '4px 8px', background: '#1e293b', borderRadius: '4px' }}>FB</span>}
                            {footer.whatsapp && <span style={{ padding: '4px 8px', background: '#1e293b', borderRadius: '4px' }}>WA</span>}
                        </div>
                    </div>
                    <div style={{ borderTop: '1px solid #1e293b', paddingTop: '15px', textAlign: 'center', color: '#64748b', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                        © 2026 {header.siteName || 'AHIZAN'}
                    </div>
                </div>
            </div>
        </div>
    );
}

export function LandingPageBuilder() {
    const queryClient = useQueryClient();
    const [editingSectionId, setEditingSectionId] = useState<string | null>(null);

    const { data: pagesData, isLoading: pagesLoading, error: pagesError, refetch: refetchPages } = useQuery({
        queryKey: ['pages'],
        queryFn: () => fetchGraphQL(GET_PAGES, { options: { take: 10 } })
    });

    const pageId = pagesData?.pages?.items?.[0]?.id;

    const { data: pageData, isLoading: pageLoading, error, refetch: refetchPage } = useQuery({
        queryKey: ['page', pageId],
        queryFn: () => fetchGraphQL(GET_PAGE, { id: pageId }),
        enabled: !!pageId,
    });

    const updateSectionMutation = useMutation({
        mutationFn: (input: any) => fetchGraphQL(UPDATE_SECTION, { input }),
        onSuccess: () => refetchPage()
    });

    const createSectionMutation = useMutation({
        mutationFn: (input: any) => fetchGraphQL(CREATE_SECTION, { input }),
        onSuccess: () => refetchPage()
    });

    const deleteSectionMutation = useMutation({
        mutationFn: (id: string) => fetchGraphQL(DELETE_SECTION, { id }),
        onSuccess: () => refetchPage()
    });

    const initializeHomePageMutation = useMutation({
        mutationFn: (pageId: string) => fetchGraphQL(INITIALIZE_HOME_PAGE, { pageId }),
        onSuccess: () => refetchPage()
    });

    const createAssetMutation = useMutation({
        mutationFn: (file: File) => fetchGraphQL(queries.CREATE_CMS_ASSET, { file }),
    });

    const handleFileUpload = async (section: any, key: string) => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*,video/*';
        input.onchange = async (e: any) => {
            const file = e.target.files[0];
            if (file) {
                try {
                    const dataRes = await createAssetMutation.mutateAsync(file);
                    const asset = dataRes.createCmsAsset;
                    if (asset && (asset.preview || asset.source)) {
                        updateDataJson(section, key, asset.preview || asset.source);
                    } else {
                        alert('Erreur: Impossible de récupérer l\'aperçu de l\'asset');
                    }
                } catch (err: any) {
                    console.error('[LandingPageBuilder] Upload Error:', err);
                    alert(`Erreur lors de l'upload: ${err.message || 'Erreur inconnue'}`);
                }
            }
        };
        input.click();
    };

    if (pagesLoading) return <div style={{ padding: '2rem' }}>Chargement...</div>;
    if (pagesError) return <div style={{ padding: '2rem', color: '#ef4444' }}>Erreur de connection API : {(pagesError as Error).message}</div>;

    if (!pageId) return (
        <div style={{ padding: '2rem', textAlign: 'center', maxWidth: '600px', margin: '4rem auto', background: 'white', borderRadius: '16px', border: '1px solid #e5e7eb', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
            <h1 style={{ fontSize: '24px', marginBottom: '1rem' }}>CMS non initialisé</h1>
            <button onClick={() => fetchGraphQL(CREATE_PAGE, { input: { slug: 'home', title: 'Home Page', type: 'HOME', isActive: true } }).then(() => refetchPages())}
                style={{ padding: '12px 24px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>
                Créer la page d'accueil
            </button>
        </div>
    );

    if (pageLoading) return <div style={{ padding: '2rem' }}>Chargement de la page...</div>;
    if (error) return <div style={{ padding: '2rem', color: '#ef4444' }}>Erreur : {(error as Error).message}</div>;

    const page = pageData?.page;
    if (!page) return <div style={{ padding: '2rem' }}>Page introuvable.</div>;

    const handleAddSection = (type: string) => {
        createSectionMutation.mutate({
            pageId: page.id,
            type,
            title: `Nouvelle section ${type}`,
            order: page.sections.length,
            isActive: true,
            dataJson: JSON.stringify(SECTION_TEMPLATES[type] || {}, null, 2)
        });
    };

    const updateDataJson = (section: any, key: string, value: any) => {
        const data = JSON.parse(section.dataJson || '{}');
        data[key] = value;
        updateSectionMutation.mutate({ id: section.id, dataJson: JSON.stringify(data) });
    };

    const ALL_SECTION_TYPES = [
        { type: 'HERO', label: '🖼️ Hero', color: '#0f172a' },
        { type: 'HERO_SLIDER', label: '🎠 Slider', color: '#1e40af' },
        { type: 'SEARCH_BAR', label: '🔍 Recherche', color: '#0891b2' },
        { type: 'PRODUCT_GRID', label: '📦 Produits', color: '#2563eb' },
        { type: 'CATEGORY_GRID', label: '📂 Catégories', color: '#7c3aed' },
        { type: 'FLASH_DEALS', label: '⚡ Flash', color: '#dc2626' },
        { type: 'PROMO_GRID', label: '🎯 Promos', color: '#ea580c' },
        { type: 'VENDOR_SHOWCASE', label: '🏪 Vendeurs', color: '#0d9488' },
        { type: 'BANNER', label: '🏷️ Bannière', color: '#4f46e5' },
        { type: 'FLEX_GRID', label: '⊞ Grille', color: '#8b5cf6' },
        { type: 'BLOG_POSTS', label: '📰 Blog', color: '#10b981' },
        { type: 'FEATURES', label: '✅ Atouts', color: '#059669' },
        { type: 'CTA_VENDOR', label: '📢 CTA Vendeur', color: '#b91c1c' },
        { type: 'NEWSLETTER', label: '✉️ Newsletter', color: '#0369a1' },
        { type: 'TESTIMONIALS', label: '💬 Avis', color: '#a21caf' },
        { type: 'RECENTLY_VIEWED', label: '👁️ Vus récemment', color: '#64748b' },
        { type: 'PROMO_BANNER', label: '🔔 Promo Banner', color: '#ca8a04' },
    ];

    const sections = page.sections || [];
    const globalSections = sections.filter((s: any) => ['THEME_SETTINGS', 'HEADER_CONF', 'TOP_BAR', 'FOOTER_CONF'].includes(s.type));
    const contentSections = sections.filter((s: any) => !['THEME_SETTINGS', 'HEADER_CONF', 'TOP_BAR', 'FOOTER_CONF'].includes(s.type)).sort((a: any, b: any) => a.order - b.order);

    return (
        <div>
        <style dangerouslySetInnerHTML={{ __html: BUILDER_STYLES }} />
        <div className={cls.page}>
            {/* Sidebar Controls */}
            <div className={cls.sidebar}>
                <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--color-component-border, #e2e8f0)' }}>
                    <h1 style={{ margin: 0, fontSize: '18px', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        ✨ AHIZAN CMS
                    </h1>
                    <p style={{ opacity: 0.6, margin: '4px 0 0 0', fontSize: '12px' }}>Personnalisez votre boutique sans code.</p>
                </div>

                <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                        <span className={cls.label} style={{ margin: 0 }}>Configuration Globale</span>
                        <button className={cls.btnDanger} onClick={() => confirm('Réinitialiser toutes les sections ?') && initializeHomePageMutation.mutate(pageId)}>
                            Réinitialiser
                        </button>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '2rem' }}>
                        {globalSections.map((section: any) => (
                            <button
                                key={section.id}
                                onClick={() => setEditingSectionId(editingSectionId === section.id ? null : section.id)}
                                style={{
                                    padding: '12px 16px',
                                    background: editingSectionId === section.id ? '#f1f5f9' : '#fff',
                                    border: editingSectionId === section.id ? '2px solid #0f172a' : '1px solid #e2e8f0',
                                    borderRadius: '12px',
                                    textAlign: 'left',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    transition: 'all 0.2s'
                                }}
                            >
                                <span style={{ fontWeight: '700', fontSize: '14px', color: '#1e293b' }}>{section.title}</span>
                                <span style={{ fontSize: '12px', opacity: 0.5 }}>{editingSectionId === section.id ? '▼' : '▶'}</span>
                            </button>
                        ))}
                    </div>

                    <div style={{ marginBottom: '16px' }}>
                        <span className={cls.label}>Contenu de la Page</span>
                        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginTop: '8px' }}>
                            {ALL_SECTION_TYPES.map(st => (
                                <button key={st.type} onClick={() => handleAddSection(st.type)}
                                    style={{ padding: '3px 8px', background: st.color, color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '9px', fontWeight: '700' }}>
                                    {st.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {contentSections.map((section: any) => (
                            <div key={section.id}>
                                <button
                                    onClick={() => setEditingSectionId(editingSectionId === section.id ? null : section.id)}
                                    style={{
                                        width: '100%',
                                        padding: '12px 16px',
                                        background: editingSectionId === section.id ? '#f1f5f9' : '#fff',
                                        border: editingSectionId === section.id ? '2px solid #0f172a' : '1px solid #e2e8f0',
                                        borderRadius: '12px',
                                        textAlign: 'left',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center'
                                    }}
                                >
                                    <span style={{ fontWeight: '700', fontSize: '14px', color: '#1e293b' }}>{section.title}</span>
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        <span style={{ fontSize: '10px', background: '#f8fafc', padding: '2px 6px', borderRadius: '4px', border: '1px solid #cbd5e1' }}>{section.type}</span>
                                    </div>
                                </button>

                                {editingSectionId === section.id && (
                                    <div style={{ padding: '20px', border: '1px solid #e2e8f0', borderTop: 'none', background: '#fff', borderRadius: '0 0 12px 12px', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                        {/* Editor Content (Unified) */}
                                        {renderEditor(section)}
                                        <button
                                            onClick={() => confirm('Supprimer ?') && deleteSectionMutation.mutate(section.id)}
                                            style={{ color: '#ef4444', background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold', textAlign: 'right' }}
                                        >
                                            ❌ Supprimer cette section
                                        </button>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Status Bar */}
                <div style={{ padding: '16px 24px', background: '#f8fafc', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ width: '8px', height: '8px', background: '#22c55e', borderRadius: '50%' }}></div>
                        <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#64748b' }}>SYNCHRONISÉ</span>
                    </div>
                </div>
            </div>

            {/* Main Preview Area */}
            <div style={{ flex: 1, padding: '40px', background: '#f1f5f9', overflow: 'auto', display: 'flex', justifyContent: 'center' }}>
                <div style={{ width: '100%', maxWidth: '900px', height: 'fit-content' }}>
                    <VisualPreview sections={sections} />
                    <p style={{ textAlign: 'center', marginTop: '20px', color: '#94a3b8', fontSize: '12px', fontWeight: 'bold' }}>APPERÇU INTERACTIF (MOCKUP)</p>
                </div>
            </div>

            {/* Floating Global Editor Overlay (for quick editing) */}
            {editingSectionId && globalSections.find(s => s.id === editingSectionId) && (
                <div style={{ position: 'fixed', top: '24px', left: '460px', width: '400px', maxHeight: 'calc(100vh - 48px)', background: '#fff', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', borderRadius: '16px', border: '1px solid #e2e8f0', overflowY: 'auto', zIndex: 100, padding: '24px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
                        <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '900' }}>{globalSections.find(s => s.id === editingSectionId).title}</h3>
                        <button onClick={() => setEditingSectionId(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px' }}>✕</button>
                    </div>
                    {renderEditor(globalSections.find(s => s.id === editingSectionId))}
                </div>
            )}
        </div>
        </div>
    );

    function renderEditor(section: any) {
        const data = JSON.parse(section.dataJson || '{}');

        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                {section.type === 'THEME_SETTINGS' && (
                    <>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '11px', fontWeight: '900', color: '#64748b', marginBottom: '8px' }}>Couleur Primaire</label>
                                <input type="color" defaultValue={data.primaryColor} onChange={(e) => updateDataJson(section, 'primaryColor', e.target.value)} style={{ width: '100%', height: '40px', cursor: 'pointer', border: '1px solid #e2e8f0', borderRadius: '8px' }} />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '11px', fontWeight: '900', color: '#64748b', marginBottom: '8px' }}>Accentuation</label>
                                <input type="color" defaultValue={data.secondaryColor} onChange={(e) => updateDataJson(section, 'secondaryColor', e.target.value)} style={{ width: '100%', height: '40px', cursor: 'pointer', border: '1px solid #e2e8f0', borderRadius: '8px' }} />
                            </div>
                        </div>

                        <div>
                            <label style={{ display: 'block', fontSize: '11px', fontWeight: '900', color: '#64748b', marginBottom: '8px' }}>Mode Mise en Page</label>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                {['boxed', 'full'].map(mode => (
                                    <button
                                        key={mode}
                                        onClick={() => updateDataJson(section, 'layoutMode', mode)}
                                        style={{
                                            flex: 1,
                                            padding: '8px',
                                            borderRadius: '8px',
                                            border: '1px solid',
                                            borderColor: data.layoutMode === mode ? '#0f172a' : '#e2e8f0',
                                            background: data.layoutMode === mode ? '#0f172a' : '#fff',
                                            color: data.layoutMode === mode ? '#fff' : '#0f172a',
                                            fontSize: '12px',
                                            fontWeight: 'bold',
                                            textTransform: 'capitalize'
                                        }}
                                    >
                                        {mode === 'boxed' ? 'Encadré (Boxed)' : 'Plein Écran (Full)'}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div style={{ padding: '16px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                            <label style={{ display: 'block', fontSize: '11px', fontWeight: '900', color: '#64748b', marginBottom: '12px' }}>Fond Global du Site</label>
                            <select
                                defaultValue={data.backgroundType}
                                onChange={(e) => updateDataJson(section, 'backgroundType', e.target.value)}
                                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '12px', fontSize: '13px' }}
                            >
                                <option value="color">Couleur Unie</option>
                                <option value="image">Image de Fond</option>
                                <option value="video">Vidéo de Fond</option>
                            </select>

                            {data.backgroundType === 'color' && (
                                <input type="color" defaultValue={data.backgroundColor} onChange={(e) => updateDataJson(section, 'backgroundColor', e.target.value)} style={{ width: '100%', height: '30px', cursor: 'pointer' }} />
                            )}

                            {(data.backgroundType === 'image' || data.backgroundType === 'video') && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    <button
                                        onClick={() => handleFileUpload(section, data.backgroundType === 'image' ? 'backgroundImageUrl' : 'backgroundVideoUrl')}
                                        style={{ width: '100%', padding: '10px', background: '#0f172a', color: '#fff', borderRadius: '8px', fontSize: '12px', fontWeight: 'bold' }}
                                    >
                                        Uploader {data.backgroundType === 'image' ? 'l\'image' : 'la vidéo'}
                                    </button>
                                    {(data.backgroundImageUrl || data.backgroundVideoUrl) && (
                                        <div style={{ marginTop: '8px', fontSize: '10px', color: '#64748b', wordBreak: 'break-all' }}>
                                            Source: {data.backgroundImageUrl || data.backgroundVideoUrl}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        <div>
                            <label style={{ display: 'block', fontSize: '11px', fontWeight: '900', color: '#64748b', marginBottom: '8px' }}>Arrondi Global (Boutons/Cartes)</label>
                            <input type="text" defaultValue={data.borderRadius} onBlur={(e) => updateDataJson(section, 'borderRadius', e.target.value)} placeholder="8px" style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0' }} />
                        </div>
                    </>
                )}

                {section.type === 'TOP_BAR' && (
                    <>
                        <div>
                            <label style={{ display: 'block', fontSize: '11px', fontWeight: '900', color: '#64748b', marginBottom: '8px' }}>Texte de l'annonce</label>
                            <textarea defaultValue={data.text} onBlur={(e) => updateDataJson(section, 'text', e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0', minHeight: '60px' }} />
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '11px', fontWeight: '900', color: '#64748b', marginBottom: '8px' }}>Fond</label>
                                <input type="color" defaultValue={data.backgroundColor} onChange={(e) => updateDataJson(section, 'backgroundColor', e.target.value)} style={{ width: '100%', height: '30px', cursor: 'pointer' }} />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '11px', fontWeight: '900', color: '#64748b', marginBottom: '8px' }}>Texte</label>
                                <input type="color" defaultValue={data.textColor} onChange={(e) => updateDataJson(section, 'textColor', e.target.value)} style={{ width: '100%', height: '30px', cursor: 'pointer' }} />
                            </div>
                        </div>

                        <div style={{ padding: '16px', background: '#f0f9ff', borderRadius: '12px', border: '1px solid #bae6fd' }}>
                            <label style={{ display: 'block', fontSize: '11px', fontWeight: '900', color: '#0369a1', marginBottom: '12px' }}>Publicité / Publication Vidéo</label>
                            <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                                {['image', 'video'].map(type => (
                                    <button
                                        key={type}
                                        onClick={() => updateDataJson(section, 'adMediaType', type)}
                                        style={{
                                            flex: 1,
                                            padding: '6px',
                                            borderRadius: '6px',
                                            border: '1px solid',
                                            borderColor: data.adMediaType === type ? '#0369a1' : '#e2e8f0',
                                            background: data.adMediaType === type ? '#0369a1' : '#fff',
                                            color: data.adMediaType === type ? '#fff' : '#0369a1',
                                            fontSize: '11px',
                                            fontWeight: 'bold',
                                            textTransform: 'capitalize'
                                        }}
                                    >
                                        {type}
                                    </button>
                                ))}
                            </div>
                            <button
                                onClick={() => handleFileUpload(section, 'adMediaUrl')}
                                style={{ width: '100%', padding: '10px', background: '#0369a1', color: '#fff', borderRadius: '8px', fontSize: '12px', fontWeight: 'bold', marginBottom: '8px' }}
                            >
                                Uploader {data.adMediaType === 'image' ? 'l\'image' : 'la vidéo'} pub
                            </button>
                            <input
                                type="text"
                                placeholder="Lien de redirection (ex: /promo)"
                                defaultValue={data.adLink}
                                onBlur={(e) => updateDataJson(section, 'adLink', e.target.value)}
                                style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '11px' }}
                            />
                        </div>
                    </>
                )}

                {section.type === 'HEADER_CONF' && (
                    <>
                        <div style={{ padding: '16px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                            <label style={{ display: 'block', fontSize: '11px', fontWeight: '900', color: '#64748b', marginBottom: '12px' }}>Type d'En-tête</label>
                            <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                                {['standard', 'columns'].map(type => (
                                    <button
                                        key={type}
                                        onClick={() => updateDataJson(section, 'layoutType', type)}
                                        style={{
                                            flex: 1,
                                            padding: '8px',
                                            borderRadius: '8px',
                                            border: '1px solid',
                                            borderColor: data.layoutType === type ? '#0f172a' : '#e2e8f0',
                                            background: data.layoutType === type ? '#0f172a' : '#fff',
                                            color: data.layoutType === type ? '#fff' : '#0f172a',
                                            fontSize: '11px',
                                            fontWeight: 'bold'
                                        }}
                                    >
                                        {type === 'standard' ? 'Standard (Logo+Menu)' : 'Modulaire (Colonnes)'}
                                    </button>
                                ))}
                            </div>

                            {data.layoutType === 'standard' && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '11px', color: '#64748b', marginBottom: '4px' }}>Nom du site</label>
                                        <input type="text" defaultValue={data.siteName} onBlur={(e) => updateDataJson(section, 'siteName', e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #e2e8f0' }} />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '11px', color: '#64748b', marginBottom: '4px' }}>Logo URL</label>
                                        <div style={{ display: 'flex', gap: '8px' }}>
                                            <input type="text" value={data.logoUrl || ''} readOnly style={{ flex: 1, padding: '8px', borderRadius: '6px', border: '1px solid #e2e8f0', background: '#f1f5f9', fontSize: '10px' }} />
                                            <button onClick={() => handleFileUpload(section, 'logoUrl')} style={{ padding: '8px 12px', background: '#0f172a', color: '#fff', borderRadius: '6px', fontSize: '11px' }}>Uploader</button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {data.layoutType === 'columns' && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '11px', color: '#64748b', marginBottom: '8px' }}>Nombre de colonnes</label>
                                        <div style={{ display: 'flex', gap: '8px' }}>
                                            {[1, 2, 3].map(n => (
                                                <button
                                                    key={n}
                                                    onClick={() => {
                                                        const newCols = [...(data.columnsData || [])];
                                                        while (newCols.length < n) newCols.push({ type: 'text', content: 'Contenu Colonne' });
                                                        updateDataJson(section, 'columnCount', n);
                                                        updateDataJson(section, 'columnsData', newCols.slice(0, n));
                                                    }}
                                                    style={{ flex: 1, padding: '6px', borderRadius: '6px', border: '1px solid', borderColor: data.columnCount === n ? '#0f172a' : '#e2e8f0', background: data.columnCount === n ? '#0f172a' : '#fff', color: data.columnCount === n ? '#fff' : '#0f172a', fontWeight: 'bold' }}
                                                >
                                                    {n}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {(data.columnsData || []).map((col: any, idx: number) => (
                                        <div key={idx} style={{ padding: '12px', background: '#fff', borderRadius: '8px', border: '1px dashed #cbd5e1' }}>
                                            <label style={{ display: 'block', fontSize: '10px', fontWeight: 'bold', color: '#94a3b8', marginBottom: '8px', textTransform: 'uppercase' }}>Colonne {idx + 1}</label>
                                            <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
                                                {['text', 'image'].map(type => (
                                                    <button
                                                        key={type}
                                                        onClick={() => {
                                                            const newCols = [...data.columnsData];
                                                            newCols[idx].type = type;
                                                            updateDataJson(section, 'columnsData', newCols);
                                                        }}
                                                        style={{ flex: 1, padding: '4px', borderRadius: '4px', border: '1px solid', fontSize: '10px', background: col.type === type ? '#f1f5f9' : '#fff' }}
                                                    >
                                                        {type === 'text' ? 'Texte' : 'Image'}
                                                    </button>
                                                ))}
                                            </div>
                                            {col.type === 'text' ? (
                                                <textarea
                                                    defaultValue={col.content}
                                                    onBlur={(e) => {
                                                        const newCols = [...data.columnsData];
                                                        newCols[idx].content = e.target.value;
                                                        updateDataJson(section, 'columnsData', newCols);
                                                    }}
                                                    style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '12px', minHeight: '60px' }}
                                                />
                                            ) : (
                                                <button
                                                    onClick={() => {
                                                        const input = document.createElement('input');
                                                        input.type = 'file';
                                                        input.accept = 'image/*';
                                                        input.onchange = async (e: any) => {
                                                            const file = e.target.files[0];
                                                            if (file) {
                                                                const dataRes = await createAssetMutation.mutateAsync(file);
                                                                const asset = dataRes.createCmsAsset;
                                                                if (asset && (asset.preview || asset.source)) {
                                                                    const newCols = [...data.columnsData];
                                                                    newCols[idx].imageUrl = asset.preview || asset.source;
                                                                    updateDataJson(section, 'columnsData', newCols);
                                                                }
                                                            }
                                                        };
                                                        input.click();
                                                    }}
                                                    style={{ width: '100%', padding: '8px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '11px' }}
                                                >
                                                    {col.imageUrl ? 'Changer l\'image' : 'Uploader une image'}
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </>
                )}

                {section.type === 'HERO' && (
                    <>
                        <div>
                            <label style={{ display: 'block', fontSize: '11px', fontWeight: '900', color: '#64748b', marginBottom: '8px' }}>Titre de Bienvenue</label>
                            <input type="text" defaultValue={data.title} onBlur={(e) => updateDataJson(section, 'title', e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0', fontWeight: 'bold' }} />
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '11px', fontWeight: '900', color: '#64748b', marginBottom: '8px' }}>Sous-titre / Description</label>
                            <textarea defaultValue={data.subtitle} onBlur={(e) => updateDataJson(section, 'subtitle', e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0', minHeight: '80px' }} />
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '11px', fontWeight: '900', color: '#64748b', marginBottom: '8px' }}>Image de Fond</label>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <input type="text" value={data.backgroundImage} readOnly style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0', background: '#f1f5f9', fontSize: '10px' }} />
                                <button onClick={() => handleFileUpload(section, 'backgroundImage')} style={{ padding: '8px 12px', background: '#0f172a', color: '#fff', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '11px' }}>📁 Uploader</button>
                            </div>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '11px', fontWeight: '900', color: '#64748b', marginBottom: '8px' }}>Texte Bouton</label>
                                <input type="text" defaultValue={data.ctaText} onBlur={(e) => updateDataJson(section, 'ctaText', e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0' }} />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '11px', fontWeight: '900', color: '#64748b', marginBottom: '8px' }}>Lien Bouton</label>
                                <input type="text" defaultValue={data.ctaLink} onBlur={(e) => updateDataJson(section, 'ctaLink', e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0' }} />
                            </div>
                        </div>
                    </>
                )}

                {section.type === 'PRODUCT_GRID' && (
                    <>
                        <div>
                            <label style={{ display: 'block', fontSize: '11px', fontWeight: '900', color: '#64748b', marginBottom: '8px' }}>Titre du Bloc</label>
                            <input type="text" defaultValue={data.title} onBlur={(e) => updateDataJson(section, 'title', e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0' }} />
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '11px', fontWeight: '900', color: '#64748b', marginBottom: '8px' }}>Source</label>
                            <select value={data.filterType} onChange={(e) => updateDataJson(section, 'filterType', e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                                <option value="LATEST">Nouveaux Produits</option>
                                <option value="BEST_SELLERS">Meilleures Ventes</option>
                                <option value="COLLECTION">Par Collection</option>
                            </select>
                        </div>
                    </>
                )}

                {section.type === 'BLOG_POSTS' && (
                    <>
                        <div>
                            <label style={{ display: 'block', fontSize: '11px', fontWeight: '900', color: '#64748b', marginBottom: '8px' }}>Titre de la section</label>
                            <input type="text" defaultValue={data.title} onBlur={(e) => updateDataJson(section, 'title', e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0' }} />
                        </div>
                        
                        <div style={{ marginTop: '16px' }}>
                            <label style={{ display: 'block', fontSize: '11px', fontWeight: '900', color: '#64748b', marginBottom: '12px' }}>Liste des Publications</label>
                            {(data.items || []).map((item: any, idx: number) => (
                                <div key={idx} style={{ padding: '12px', background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '12px', position: 'relative' }}>
                                    <button 
                                        onClick={() => {
                                            const newItems = [...data.items];
                                            newItems.splice(idx, 1);
                                            updateDataJson(section, 'items', newItems);
                                        }}
                                        style={{ position: 'absolute', top: '8px', right: '8px', border: 'none', background: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}
                                    >
                                        Supprimer
                                    </button>
                                    <div style={{ marginBottom: '8px' }}>
                                        <input
                                            type="text"
                                            placeholder="Titre de l'article"
                                            defaultValue={item.title}
                                            onBlur={(e) => {
                                                const newItems = [...data.items];
                                                newItems[idx].title = e.target.value;
                                                updateDataJson(section, 'items', newItems);
                                            }}
                                            style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #f1f5f9', fontSize: '13px', fontWeight: 'bold' }}
                                        />
                                    </div>
                                    <div style={{ marginBottom: '8px', display: 'flex', gap: '8px' }}>
                                        <input
                                            type="text"
                                            placeholder="Date (ex: 12 Mars 2026)"
                                            defaultValue={item.date}
                                            onBlur={(e) => {
                                                const newItems = [...data.items];
                                                newItems[idx].date = e.target.value;
                                                updateDataJson(section, 'items', newItems);
                                            }}
                                            style={{ flex: 1, padding: '8px', borderRadius: '6px', border: '1px solid #f1f5f9', fontSize: '11px' }}
                                        />
                                        <button 
                                            onClick={() => {
                                                const input = document.createElement('input');
                                                input.type = 'file';
                                                input.accept = 'image/*';
                                                input.onchange = async (e: any) => {
                                                    const file = e.target.files[0];
                                                    if (file) {
                                                        const res = await createAssetMutation.mutateAsync(file);
                                                        const asset = res.createCmsAsset;
                                                        if (asset && (asset.preview || asset.source)) {
                                                            const newItems = [...data.items];
                                                            newItems[idx].imageUrl = asset.preview || asset.source;
                                                            updateDataJson(section, 'items', newItems);
                                                        }
                                                    }
                                                };
                                                input.click();
                                            }}
                                            style={{ padding: '8px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '10px' }}
                                        >
                                            {item.imageUrl ? 'Image OK' : '📸 Image'}
                                        </button>
                                    </div>
                                    <textarea
                                        placeholder="Extrait / Description"
                                        defaultValue={item.excerpt}
                                        onBlur={(e) => {
                                            const newItems = [...data.items];
                                            newItems[idx].excerpt = e.target.value;
                                            updateDataJson(section, 'items', newItems);
                                        }}
                                        style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #f1f5f9', fontSize: '11px', minHeight: '60px' }}
                                    />
                                    <div style={{ marginTop: '8px' }}>
                                        <input
                                            type="text"
                                            placeholder="Lien (ex: /blog/article-1)"
                                            defaultValue={item.link}
                                            onBlur={(e) => {
                                                const newItems = [...data.items];
                                                newItems[idx].link = e.target.value;
                                                updateDataJson(section, 'items', newItems);
                                            }}
                                            style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #f1f5f9', fontSize: '11px' }}
                                        />
                                    </div>
                                </div>
                            ))}
                            <button 
                                onClick={() => {
                                    const newItems = [...(data.items || []), { id: Date.now().toString(), title: "Nouvel article", excerpt: "Description ici...", date: "Aujourd'hui", imageUrl: "", link: "#" }];
                                    updateDataJson(section, 'items', newItems);
                                }}
                                style={{ width: '100%', padding: '12px', background: '#fff', border: '2px dashed #e2e8f0', borderRadius: '12px', color: '#64748b', fontWeight: 'bold', cursor: 'pointer' }}
                            >
                                + Ajouter une publication
                            </button>
                        </div>

                        <div style={{ marginTop: '16px' }}>
                            <label style={{ display: 'block', fontSize: '11px', fontWeight: '900', color: '#64748b', marginBottom: '8px' }}>Mise en page</label>
                            <select defaultValue={data.layout || 'grid'} onChange={(e) => updateDataJson(section, 'layout', e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                                <option value="grid">Grille (Grid)</option>
                                <option value="carousel">Défilant (Carousel)</option>
                            </select>
                        </div>
                    </>
                )}

                {section.type === 'FLEX_GRID' && (
                    <>
                        <div>
                            <label style={{ display: 'block', fontSize: '11px', fontWeight: '900', color: '#64748b', marginBottom: '8px' }}>Titre de la section</label>
                            <input type="text" defaultValue={data.title} onBlur={(e) => updateDataJson(section, 'title', e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0' }} />
                        </div>
                        <div style={{ padding: '16px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                            <label style={{ display: 'block', fontSize: '11px', fontWeight: '900', color: '#64748b', marginBottom: '12px' }}>Modèle de Disposition</label>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                                {[
                                    { id: 'IMAGE_LEFT', label: '📸 Texte à droite' },
                                    { id: 'IMAGE_RIGHT', label: 'Texte à gauche 📸' },
                                    { id: 'IMAGE_TOP', label: '📸 Texte en bas' }
                                ].map(t => (
                                    <button
                                        key={t.id}
                                        onClick={() => updateDataJson(section, 'template', t.id)}
                                        style={{
                                            padding: '8px 4px',
                                            borderRadius: '8px',
                                            border: '1px solid',
                                            fontSize: '10px',
                                            fontWeight: 'bold',
                                            borderColor: data.template === t.id ? '#0f172a' : '#e2e8f0',
                                            background: data.template === t.id ? '#0f172a' : '#fff',
                                            color: data.template === t.id ? '#fff' : '#0f172a'
                                        }}
                                    >
                                        {t.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div style={{ marginTop: '16px' }}>
                            <label style={{ display: 'block', fontSize: '11px', fontWeight: '900', color: '#64748b', marginBottom: '12px' }}>Contenu de la Grille</label>
                            {(data.items || []).map((item: any, idx: number) => (
                                <div key={idx} style={{ padding: '12px', background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '12px', position: 'relative' }}>
                                    <div style={{ marginBottom: '8px' }}>
                                        <input
                                            type="text"
                                            placeholder="Titre"
                                            defaultValue={item.title}
                                            onBlur={(e) => {
                                                const newItems = [...data.items];
                                                newItems[idx].title = e.target.value;
                                                updateDataJson(section, 'items', newItems);
                                            }}
                                            style={{ width: '100%', padding: '6px', borderRadius: '4px', border: '1px solid #f1f5f9', fontSize: '13px', fontWeight: 'bold' }}
                                        />
                                    </div>
                                    <div style={{ marginBottom: '8px' }}>
                                        <textarea
                                            placeholder="Description"
                                            defaultValue={item.description}
                                            onBlur={(e) => {
                                                const newItems = [...data.items];
                                                newItems[idx].description = e.target.value;
                                                updateDataJson(section, 'items', newItems);
                                            }}
                                            style={{ width: '100%', padding: '6px', borderRadius: '4px', border: '1px solid #f1f5f9', fontSize: '12px', minHeight: '40px' }}
                                        />
                                    </div>
                                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                        <div style={{ width: '40px', height: '40px', background: '#f8fafc', borderRadius: '8px', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
                                            {item.imageUrl ? <img src={item.imageUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', fontSize: '10px' }}>🖼️</div>}
                                        </div>
                                        <button
                                            onClick={() => {
                                                const input = document.createElement('input');
                                                input.type = 'file';
                                                input.accept = 'image/*';
                                                input.onchange = async (e: any) => {
                                                    const file = e.target.files[0];
                                                    if (file) {
                                                        const res = await createAssetMutation.mutateAsync(file);
                                                        const asset = res.createCmsAsset;
                                                        if (asset && (asset.preview || asset.source)) {
                                                            const newItems = [...data.items];
                                                            newItems[idx].imageUrl = asset.preview || asset.source;
                                                            updateDataJson(section, 'items', newItems);
                                                        }
                                                    }
                                                };
                                                input.click();
                                            }}
                                            style={{ flex: 1, padding: '6px', background: '#f1f5f9', border: 'none', borderRadius: '6px', fontSize: '10px', fontWeight: 'bold', cursor: 'pointer' }}
                                        >
                                            {item.imageUrl ? 'Changer' : 'Uploader'}
                                        </button>
                                        <button
                                            onClick={() => {
                                                const newItems = data.items.filter((_: any, i: number) => i !== idx);
                                                updateDataJson(section, 'items', newItems);
                                            }}
                                            style={{ padding: '6px', background: '#fff1f2', color: '#e11d48', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
                                        >
                                            🗑️
                                        </button>
                                    </div>
                                </div>
                            ))}
                            <button
                                onClick={() => {
                                    const newItems = [...(data.items || []), { title: 'Nouveau', description: 'Description', imageUrl: '' }];
                                    updateDataJson(section, 'items', newItems);
                                }}
                                style={{ width: '100%', padding: '10px', background: '#fff', border: '1px dashed #cbd5e1', borderRadius: '12px', color: '#64748b', fontSize: '12px', cursor: 'pointer' }}
                            >
                                + Ajouter un élément
                            </button>
                        </div>
                    </>
                )}

                {/* Generic editor for types without a specific editor */}
                {!['THEME_SETTINGS', 'TOP_BAR', 'HEADER_CONF', 'HERO', 'PRODUCT_GRID', 'BLOG_POSTS', 'FLEX_GRID'].includes(section.type) && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {Object.entries(data).map(([key, value]) => {
                            if (key === 'slides' || key === 'items' || key === 'testimonials' || key === 'quickLinks' || key === 'features' || key === 'categories') {
                                return (
                                    <div key={key}>
                                        <label className={cls.label}>{key} (liste)</label>
                                        <textarea className={cls.textarea} defaultValue={JSON.stringify(value, null, 2)}
                                            onBlur={(e) => { try { updateDataJson(section, key, JSON.parse(e.target.value)); } catch { alert('JSON invalide pour ' + key); } }}
                                            style={{ fontFamily: 'monospace', fontSize: '11px', minHeight: '120px' }} />
                                    </div>
                                );
                            }
                            if (typeof value === 'boolean') {
                                return (
                                    <label key={key} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <input type="checkbox" defaultChecked={value as boolean} onChange={(e) => updateDataJson(section, key, e.target.checked)} />
                                        <span className={cls.label} style={{ margin: 0 }}>{key}</span>
                                    </label>
                                );
                            }
                            if (typeof value === 'number') {
                                return (
                                    <div key={key}>
                                        <label className={cls.label}>{key}</label>
                                        <input className={cls.input} type="number" defaultValue={value as number} onBlur={(e) => updateDataJson(section, key, Number(e.target.value))} />
                                    </div>
                                );
                            }
                            if (typeof value === 'string' && (key.toLowerCase().includes('color') || key.toLowerCase().includes('background'))) {
                                return (
                                    <div key={key}>
                                        <label className={cls.label}>{key}</label>
                                        <div style={{ display: 'flex', gap: '8px' }}>
                                            <input type="color" defaultValue={(value as string).startsWith('#') ? value as string : '#ffffff'} onChange={(e) => updateDataJson(section, key, e.target.value)} style={{ width: '40px', height: '32px', border: '1px solid var(--color-component-border)', borderRadius: '4px', cursor: 'pointer' }} />
                                            <input className={cls.input} type="text" defaultValue={value as string} onBlur={(e) => updateDataJson(section, key, e.target.value)} />
                                        </div>
                                    </div>
                                );
                            }
                            if (typeof value === 'string' && (key.toLowerCase().includes('image') || key.toLowerCase().includes('url') || key.toLowerCase().includes('logo'))) {
                                return (
                                    <div key={key}>
                                        <label className={cls.label}>{key}</label>
                                        <div style={{ display: 'flex', gap: '8px' }}>
                                            <input className={cls.input} type="text" value={value as string} readOnly style={{ flex: 1, fontSize: '10px' }} />
                                            <button className={cls.btnPrimary} onClick={() => handleFileUpload(section, key)}>📁</button>
                                        </div>
                                    </div>
                                );
                            }
                            if (typeof value === 'string' && (value as string).length > 80) {
                                return (
                                    <div key={key}>
                                        <label className={cls.label}>{key}</label>
                                        <textarea className={cls.textarea} defaultValue={value as string} onBlur={(e) => updateDataJson(section, key, e.target.value)} />
                                    </div>
                                );
                            }
                            if (typeof value === 'string') {
                                return (
                                    <div key={key}>
                                        <label className={cls.label}>{key}</label>
                                        <input className={cls.input} type="text" defaultValue={value as string} onBlur={(e) => updateDataJson(section, key, e.target.value)} />
                                    </div>
                                );
                            }
                            return null;
                        })}
                    </div>
                )}

                {/* Advanced JSON Editor for power users */}
                <div style={{ marginTop: '1rem', borderTop: '1px dashed var(--color-component-border, #e2e8f0)', paddingTop: '1rem' }}>
                    <details>
                        <summary style={{ fontSize: '11px', fontWeight: 'bold', cursor: 'pointer', color: 'var(--color-text-300, #cbd5e1)' }}>Expert: Mode JSON</summary>
                        <textarea
                            defaultValue={section.dataJson}
                            style={{ width: '100%', minHeight: '100px', marginTop: '1rem', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0', fontFamily: 'monospace', fontSize: '11px', background: '#f8fafc' }}
                            onBlur={(e) => {
                                try { JSON.parse(e.target.value); updateSectionMutation.mutate({ id: section.id, dataJson: e.target.value }); }
                                catch (err) { alert('JSON invalide'); }
                            }}
                        />
                    </details>
                </div>
            </div>
        );
    }
}
