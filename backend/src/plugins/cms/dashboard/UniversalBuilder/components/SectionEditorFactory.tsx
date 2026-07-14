import React from 'react';
import { HeroSettings } from './sections/HeroSettings';
import { CategorySettings } from './sections/CategorySettings';
import { CategorySectionSettings } from './sections/CategorySectionSettings';
import { useAutoSave } from './useAutoSave';
import { FlashSettings } from './sections/FlashSettings';
import { ModalSettings } from './sections/ModalSettings';
import { ThemeSettings } from './sections/ThemeSettings';
import { HeaderSettings } from './sections/HeaderSettings';
import { FooterSettings } from './sections/FooterSettings';
import { PromoSettings } from './sections/PromoSettings';
import { CustomSettings } from './sections/CustomSettings';
import { RichTextSettings } from './sections/RichTextSettings';
import { CodeInjectionPanel } from './sections/CodeInjectionPanel';
import { CategoryHeaderSettings } from './sections/CategoryHeaderSettings';
import { DynamicProductGridSettings } from './sections/DynamicProductGridSettings';
import { ProductOverviewSettings } from './sections/ProductOverviewSettings';
import { ProductReviewsSettings } from './sections/ProductReviewsSettings';
import { RelatedProductsSettings } from './sections/RelatedProductsSettings';
import { SmartVisualGridSettings } from './sections/SmartGrid/SmartVisualGridSettings';
import { FreeformBuilderSettings } from './sections/craft-freeform/FreeformBuilderSettings';
import { useEditor } from '../hooks/EditorContext';
import { fetchGraphQL } from '../../lib/utils';
import { FileUploadField } from './sections/FileUploadField';

const UPDATE_MARKET_CMS_DATA = `
  mutation UpdateMarketCmsData($id: ID!, $image: String, $icon: String) {
    updateMarketCmsData(id: $id, image: $image, icon: $icon) {
      id image icon
    }
  }
`;

const UPDATE_NEIGHBORHOOD_CMS_DATA = `
  mutation UpdateNeighborhoodCmsData($id: ID!, $image: String, $icon: String) {
    updateNeighborhoodCmsData(id: $id, image: $image, icon: $icon) {
      id image icon
    }
  }
`;

const FETCH_MARKETS_FOR_SETTINGS = `query { markets { id name slug image icon } }`;
const FETCH_NEIGHBORHOODS_FOR_SETTINGS = `query { geographicLocations(type: "NEIGHBORHOOD") { id name slug image icon } }`;

interface SectionEditorFactoryProps {
    section: any;
    sectionIndex: number;
    onSaveSuccess: () => void;
}

// --- Shared GraphQL Mutations ---
const UPDATE_SECTION_DATA = `
  mutation UpdateSectionData($input: UpdateSectionInput!) {
    updateSection(input: $input) {
      id
      dataJson
    }
  }
`;

const UPDATE_DRAFT_PRESET = `
  mutation UpdatePreset($input: UpdatePresetInput!) {
    updatePreset(input: $input) { id sectionsJson updatedAt }
  }
`;

const GET_ACTIVE_DRAFT = `
  query GetActiveDraft {
    getActiveDraft { id name sectionsJson sourcePresetId updatedAt }
  }
`;

const AUTO_SAVE_HABILLAGE = `
  mutation AutoSaveHabillage($presetId: ID!, $sectionsJson: String!) {
    autoSaveHabillage(presetId: $presetId, sectionsJson: $sectionsJson) {
      id name sectionsJson changeHistory historyPointer updatedAt
    }
  }
`;

async function updateSectionInBackend(id: string, dataJson: string) {
    return fetchGraphQL(UPDATE_SECTION_DATA, { input: { id, dataJson } });
}

export const SectionEditorFactory = ({ section, sectionIndex, onSaveSuccess }: SectionEditorFactoryProps) => {
    const { setIsSaving, setSaveStatus, activeHabillage, setActiveHabillage, setPreviewVersion } = useEditor();

    const handleSave = (newData: any, silent: boolean = false) => {
        try {
            if (activeHabillage) {
                const sections = JSON.parse(activeHabillage.sectionsJson);
                const match = section.id.match(/^habillage-.+-(\d+)$/);
                const idx = match ? parseInt(match[1]) : (sectionIndex >= 0 && sectionIndex < sections.length ? sectionIndex : sections.findIndex((s: any) => s.type === section.type));
                
                if (idx >= 0 && idx < sections.length) {
                    sections[idx].dataJson = newData;
                } else {
                    sections.push({ type: section.type, dataJson: newData, order: sections.length, isActive: true, pageSlug: section.pageSlug });
                }

                const sectionsJson = JSON.stringify(sections);
                
                // OPTIMISTIC LOCAL UPDATE (Instantly update UI)
                setActiveHabillage((prev: any) => prev ? { ...prev, sectionsJson } : prev);
                
                // FIRE AND FORGET BACKGROUND SAVE
                fetchGraphQL(AUTO_SAVE_HABILLAGE, {
                    presetId: activeHabillage.id,
                    sectionsJson,
                }).catch(err => console.error(err));
            }
        } catch (err: any) {
            console.error(err);
        }
    };

    const data = JSON.parse(section.dataJson || '{}');

    // Each visual editor uses useAutoSave(config, onSave) internally,
    // so any field change auto-saves after 2s debounce.
    // The "Enregistrer" buttons still work for immediate save.

    // Helper: wrap a visual editor in the CodeInjectionPanel
    const withCodePanel = (editor: React.ReactNode) => (
        <CodeInjectionPanel data={data} onSave={handleSave} sectionType={section.type}>
            {editor}
        </CodeInjectionPanel>
    );

    switch (section.type) {
        case 'HERO':
            return withCodePanel(<HeroSettings data={data} onSave={handleSave} />);
        
        case 'CATEGORIES':
            return withCodePanel(<CategorySectionSettings data={data} onSave={handleSave} />);
        
        case 'CATEGORY_PAGE':
        case 'CATEGORY_GRID':
            return withCodePanel(<CategorySettings data={data} onSave={handleSave} />);
        
        case 'FLASH_DEALS':
            return withCodePanel(<FlashSettings data={data} onSave={handleSave} />);
        
        case 'RICH_TEXT':
            return withCodePanel(<RichTextSettings data={data} onSave={handleSave} />);

        // Global system configs — now using code injection to get the Fullscreen wrapper
        case 'THEME_SETTINGS':
            return withCodePanel(<ThemeSettings data={data} onSave={handleSave} />);

        case 'HEADER_CONF':
            return withCodePanel(<HeaderSettings data={data} onSave={handleSave} />);

        case 'FOOTER_CONF':
            return withCodePanel(<FooterSettings data={data} onSave={handleSave} />);

        case 'QUICK_LINKS':
            return withCodePanel(<PromoSettings data={data} onSave={handleSave} />);

        case 'MODALS':
            return withCodePanel(<ModalSettings data={data} onSave={handleSave} />);

        // --- Category page components ---
        case 'CATEGORY_HEADER':
            return withCodePanel(<CategoryHeaderSettings data={data} onSave={handleSave} />);

        case 'DYNAMIC_PRODUCT_GRID':
            return withCodePanel(<DynamicProductGridSettings data={data} onSave={handleSave} />);

        // --- Product page components ---
        case 'PRODUCT_OVERVIEW':
            return withCodePanel(<ProductOverviewSettings data={data} onSave={handleSave} />);

        case 'PRODUCT_REVIEWS':
            return withCodePanel(<ProductReviewsSettings data={data} onSave={handleSave} />);

        case 'RELATED_PRODUCTS':
            return withCodePanel(<RelatedProductsSettings data={data} onSave={handleSave} />);

        case 'FEATURES':
        case 'BLOG_POSTS':
        case 'TESTIMONIALS':
        case 'NEWSLETTER':
        case 'CTA_VENDOR':
            return withCodePanel(
                <div style={{ padding: '2rem', textAlign: 'center', background: 'rgba(255,255,255,0.02)', borderRadius: '1rem', border: '1px dashed var(--builder-border)', maxWidth: '600px' }}>
                    <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>🏗️</div>
                    <h3 style={{ fontSize: '1rem', fontWeight: 800 }}>{section.title || section.type} — Éditeur Visuel Bientôt Disponible</h3>
                    <p style={{ fontSize: '0.8rem', color: 'var(--builder-text-muted)', marginTop: '0.5rem' }}>
                        L'éditeur visuel de ce composant est en cours de développement.
                        <br/><br/>
                        <b>Astuce :</b> Passez au <b>"⌨️ Mode Code"</b> ci-dessus pour écrire du HTML, CSS & JS personnalisés pour cette section.
                    </p>
                </div>
            );

        case 'CUSTOM':
            return withCodePanel(<CustomSettings data={data} onSave={handleSave} />);

        case 'SMART_VISUAL_GRID':
            return withCodePanel(<SmartVisualGridSettings data={data} onSave={handleSave} />);

        case 'LOCAL_PRODUCTS':
            return withCodePanel(<LocalProductsSettings data={data} onSave={handleSave} />);

        case 'MARKET_INFO':
            return withCodePanel(<MarketInfoSettings data={data} onSave={handleSave} />);

        case 'NEIGHBORHOOD_INFO':
            return withCodePanel(<NeighborhoodInfoSettings data={data} onSave={handleSave} />);

        case 'MARKET_CODE':
            return withCodePanel(<MarketCodeSettings data={data} onSave={handleSave} />);

        case 'NEIGHBORHOOD_CODE':
            return withCodePanel(<NeighborhoodCodeSettings data={data} onSave={handleSave} />);

        case 'FREEFORM_BUILDER':
            return <FreeformBuilderSettings data={data} onSave={handleSave} />;

        default:
            return withCodePanel(
                <div style={{ textAlign: 'center', padding: '2rem' }}>
                    <h3>Pas d'éditeur graphique pour {section.type}</h3>
                    <p>Passez à l'onglet Éditeur de Code ci-dessus pour personnaliser cette section avec du HTML, CSS & JS.</p>
                </div>
            );
    }
};

interface LocalProductsSettingsProps {
    data: any;
    onSave: (newData: any) => void;
}

export function LocalProductsSettings({ data, onSave }: LocalProductsSettingsProps) {
    const [config, setConfig] = React.useState<any>({});
    const [collections, setCollections] = React.useState<any[]>([]);

    React.useEffect(() => {
        const defaults = {
            title: "Produits à Proximité",
            subtitle: "Découvrez les articles disponibles à l'achat immédiat auprès des marchands de votre secteur.",
            badgeText: "Recommandation Locale",
            limit: 8,
            layout: "grid-4",
            requireConfirmedLocation: true,
            textAlign: "left",
            titleColor: "#0f172a",
            subtitleColor: "#475569",
            badgeBgColor: "#e31837",
            badgeTextColor: "#ffffff",
            cardTheme: "default",
            topLeftBadge: "none",
            topRightBadge: "like_button",
            bottomLeftBadge: "none",
            bottomRightBadge: "none",
            mixCollectionId: "",
            mixMode: "none",
            interleaveSchema: "2:1"
        };
        setConfig({ ...defaults, ...data });
    }, [data]);

    useAutoSave(config, onSave);

    React.useEffect(() => {
        // Fetch collections tree to populate the selector
        const fetchCollections = async () => {
            try {
                const res = await fetch('/admin-api', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        query: `query { cmsCollectionsTree { id name slug children { id name slug children { id name slug } } } }`
                    })
                });
                const result = await res.json();
                const tree = result.data?.cmsCollectionsTree || [];
                const flat: any[] = [];
                const flatten = (nodes: any[]) => {
                    for (const node of nodes) {
                        flat.push({ id: node.id, name: node.name, slug: node.slug });
                        if (node.children && node.children.length > 0) {
                            flatten(node.children);
                        }
                    }
                };
                flatten(tree);
                setCollections(flat);
            } catch (err) {
                console.error('[CMS LOCAL_PRODUCTS] Failed to fetch collections:', err);
            }
        };
        fetchCollections();
    }, []);

    const handleChange = (field: string, value: any) => {
        setConfig((prev: any) => ({ ...prev, [field]: value }));
    };

    const ColorField = ({ label, value, onChange }: { label: string; value: string, onChange: (v: string) => void }) => (
        <div>
            <label className="label-pro">{label}</label>
            <div className="color-row">
                <input type="color" className="color-swatch" value={value || '#000000'} onChange={(e) => onChange(e.target.value)} />
                <input className="input-pro" value={value || ''} onChange={(e) => onChange(e.target.value)} />
            </div>
        </div>
    );

    return (
        <div className="stack-lg" style={{ width: "100%", height: "100%", maxHeight: "calc(100vh - 200px)", overflowY: "auto" }}>
            
            {/* ===== TITLE & HEADER ===== */}
            <div className="settings-card">
                <div className="settings-card-header">✍️ Titre & En-tête (Produits Proches)</div>
                <div className="stack">
                    <div className="grid-2">
                        <div>
                            <label className="label-pro">Titre</label>
                            <input type="text" className="input-pro" value={config.title || ''} onChange={e => handleChange('title', e.target.value)} />
                        </div>
                        <div>
                            <label className="label-pro">Texte du badge</label>
                            <input type="text" className="input-pro" value={config.badgeText || ''} onChange={e => handleChange('badgeText', e.target.value)} />
                        </div>
                    </div>

                    <div>
                        <label className="label-pro">Sous-titre</label>
                        <textarea className="input-pro" value={config.subtitle || ''} onChange={e => handleChange('subtitle', e.target.value)} rows={2} />
                    </div>

                    <div className="grid-3">
                        <div>
                            <label className="label-pro">Alignement</label>
                            <select className="input-pro" value={config.textAlign || 'left'} onChange={e => handleChange('textAlign', e.target.value)}>
                                <option value="left">Gauche</option>
                                <option value="center">Centré</option>
                                <option value="right">Droite</option>
                            </select>
                        </div>
                        <ColorField label="Couleur Titre" value={config.titleColor} onChange={(v) => handleChange('titleColor', v)} />
                        <ColorField label="Couleur Sous-Titre" value={config.subtitleColor} onChange={(v) => handleChange('subtitleColor', v)} />
                    </div>

                    <div className="grid-2">
                        <ColorField label="Fond du Badge" value={config.badgeBgColor} onChange={(v) => handleChange('badgeBgColor', v)} />
                        <ColorField label="Texte du Badge" value={config.badgeTextColor} onChange={(v) => handleChange('badgeTextColor', v)} />
                    </div>
                </div>
            </div>

            {/* ===== LAYOUT & RENDERING ===== */}
            <div className="settings-card">
                <div className="settings-card-header">📐 Disposition & Rendu</div>
                <div className="stack">
                    <div className="grid-2">
                        <div>
                            <label className="label-pro">Format de grille</label>
                            <select className="input-pro" value={config.layout || 'grid-4'} onChange={e => handleChange('layout', e.target.value)}>
                                <option value="grid-4">Grille classique (4 colonnes)</option>
                                <option value="grid-3">Grille large (3 colonnes)</option>
                                <option value="carousel">Carousel Horizontal (Défilement)</option>
                                <option value="compact">Mini cartes (6 colonnes)</option>
                                <option value="list-split">Cartes Horizontales divisées (Liste)</option>
                            </select>
                        </div>
                        <div>
                            <label className="label-pro">Thème de carte</label>
                            <select className="input-pro" value={config.cardTheme || 'default'} onChange={e => handleChange('cardTheme', e.target.value)}>
                                <option value="default">Standard</option>
                                <option value="flat">Minimaliste Plat (Flat design)</option>
                                <option value="glassmorphism">Glassmorphism (Verre Dépoli)</option>
                                <option value="neon">Néon Premium (Glow rouge/noir)</option>
                                <option value="bold-border">Rétro Bordure Épaisse</option>
                                <option value="gradient-bg">Dégradé de Couleur Arrière-plan</option>
                            </select>
                        </div>
                    </div>

                    <div className="grid-2">
                        <div>
                            <label className="label-pro">Produits maximum</label>
                            <input type="number" className="input-pro" value={config.limit || 8} onChange={e => handleChange('limit', Number(e.target.value))} min={1} max={50} />
                        </div>
                        <div className="toggle-row" style={{ marginTop: '22px' }}>
                            <label className="label-pro" style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                                <input type="checkbox" checked={config.requireConfirmedLocation !== false} onChange={e => handleChange('requireConfirmedLocation', e.target.checked)} />
                                Masquer si non localisé
                            </label>
                        </div>
                    </div>
                </div>
            </div>

            {/* ===== CORNER BADGES ===== */}
            <div className="settings-card">
                <div className="settings-card-header">🏷️ Badges des 4 Coins de la Carte</div>
                <div className="stack">
                    <div className="grid-2">
                        <div>
                            <label className="label-pro">Haut Gauche ↖️</label>
                            <select className="input-pro" value={config.topLeftBadge || 'none'} onChange={e => handleChange('topLeftBadge', e.target.value)}>
                                <option value="none">Aucun</option>
                                <option value="vendor_name">Nom du Vendeur</option>
                                <option value="market_badge">Badge Marché (Dantokpa, etc.)</option>
                                <option value="promo_percent">Pourcentage Promotion</option>
                            </select>
                        </div>
                        <div>
                            <label className="label-pro">Haut Droite ↗️</label>
                            <select className="input-pro" value={config.topRightBadge || 'like_button'} onChange={e => handleChange('topRightBadge', e.target.value)}>
                                <option value="none">Aucun</option>
                                <option value="like_button">Bouton J'aime (Favori)</option>
                                <option value="location_distance">Distance / Zone</option>
                                <option value="market_icon">Icône Marché</option>
                            </select>
                        </div>
                    </div>

                    <div className="grid-2">
                        <div>
                            <label className="label-pro">Bas Gauche ↙️</label>
                            <select className="input-pro" value={config.bottomLeftBadge || 'none'} onChange={e => handleChange('bottomLeftBadge', e.target.value)}>
                                <option value="none">Aucun</option>
                                <option value="stock_status">Indicateur Stock (Disponible/Rupture)</option>
                                <option value="market_name_short">Nom court du marché</option>
                                <option value="delivery_time">Temps Livraison (Estimé)</option>
                            </select>
                        </div>
                        <div>
                            <label className="label-pro">Bas Droite ↘️</label>
                            <select className="input-pro" value={config.bottomRightBadge || 'none'} onChange={e => handleChange('bottomRightBadge', e.target.value)}>
                                <option value="none">Aucun</option>
                                <option value="market_badge">Badge Marché</option>
                                <option value="cart_button">Bouton Ajouter Panier</option>
                            </select>
                        </div>
                    </div>
                </div>
            </div>

            {/* ===== HYBRID / COLLECTION MIX ===== */}
            <div className="settings-card">
                <div className="settings-card-header">🔀 Mixage & Repli Collection</div>
                <div className="stack">
                    <div>
                        <label className="label-pro">Collection associée</label>
                        <select className="input-pro" value={config.mixCollectionId || ''} onChange={e => handleChange('mixCollectionId', e.target.value)}>
                            <option value="">-- Aucune collection (Proximité pure) --</option>
                            {collections.map(c => (
                                <option key={c.id} value={c.id}>{c.name} ({c.slug})</option>
                            ))}
                        </select>
                    </div>

                    <div className="grid-2">
                        <div>
                            <label className="label-pro">Mode de mixage</label>
                            <select className="input-pro" value={config.mixMode || 'none'} onChange={e => handleChange('mixMode', e.target.value)}>
                                <option value="none">Aucun (Uniquement les produits de ma zone)</option>
                                <option value="hybrid">Remplissage Hybride (Combler le reste de la grille)</option>
                                <option value="local-only-in-collection">Filtrer localement dans cette Collection</option>
                                <option value="fallback">Repli complet (Collection si vide à proximité)</option>
                                <option value="mix-interleaved">Interlaçage Alterné (Weaving)</option>
                            </select>
                        </div>
                        {config.mixMode === 'mix-interleaved' && (
                            <div>
                                <label className="label-pro">Schéma d'alternance (Local:Collection)</label>
                                <input type="text" className="input-pro" value={config.interleaveSchema || '2:1'} onChange={e => handleChange('interleaveSchema', e.target.value)} placeholder="Ex: 2:1" />
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

interface MarketInfoSettingsProps {
    data: any;
    onSave: (newData: any) => void;
}

export function MarketInfoSettings({ data, onSave }: MarketInfoSettingsProps) {
    const [config, setConfig] = React.useState<any>({});
    const [markets, setMarkets] = React.useState<any[]>([]);
    const [selectedMarketId, setSelectedMarketId] = React.useState<string>('');
    const [marketImage, setMarketImage] = React.useState<string>('');
    const [marketIcon, setMarketIcon] = React.useState<string>('');
    const [saveStatus, setSaveStatus] = React.useState<string>('');

    React.useEffect(() => {
        const defaults = {
            textColor: "#0f172a",
            bgColor: "#ffffff",
            showMap: true,
            showProductsCount: true,
            selectedMarketId: ""
        };
        setConfig({ ...defaults, ...data });
        if (data.selectedMarketId) {
            setSelectedMarketId(data.selectedMarketId);
        }
    }, [data]);

    useAutoSave(config, onSave);

    React.useEffect(() => {
        fetchGraphQL(FETCH_MARKETS_FOR_SETTINGS).then(res => {
            const list = res?.markets || [];
            setMarkets(list);
            if (list.length > 0) {
                const initialId = data.selectedMarketId || list[0].id;
                setSelectedMarketId(initialId);
                const active = list.find((m: any) => m.id === initialId);
                if (active) {
                    setMarketImage(active.image || '');
                    setMarketIcon(active.icon || '');
                }
            }
        });
    }, [data.selectedMarketId]);

    const handleMarketChange = (id: string) => {
        setSelectedMarketId(id);
        handleChange('selectedMarketId', id);
        const active = markets.find(m => m.id === id);
        if (active) {
            setMarketImage(active.image || '');
            setMarketIcon(active.icon || '');
        }
    };

    const handleUploadImage = async (url: string) => {
        setMarketImage(url);
        if (selectedMarketId) {
            try {
                await fetchGraphQL(UPDATE_MARKET_CMS_DATA, { id: selectedMarketId, image: url });
                setSaveStatus('✅ Image enregistrée !');
                setTimeout(() => setSaveStatus(''), 2000);
            } catch (e) {
                console.error(e);
            }
        }
    };

    const handleUploadIcon = async (url: string) => {
        setMarketIcon(url);
        if (selectedMarketId) {
            try {
                await fetchGraphQL(UPDATE_MARKET_CMS_DATA, { id: selectedMarketId, icon: url });
                setSaveStatus('✅ Icône enregistrée !');
                setTimeout(() => setSaveStatus(''), 2000);
            } catch (e) {
                console.error(e);
            }
        }
    };

    const handleChange = (field: string, value: any) => {
        setConfig((prev: any) => ({ ...prev, [field]: value }));
    };

    return (
        <div className="stack-lg" style={{ width: "100%", height: "100%", maxHeight: "calc(100vh - 200px)", overflowY: "auto" }}>
            <div className="settings-card">
                <div className="settings-card-header">🏪 Sélection du Marché & Assets</div>
                <div className="stack">
                    <div>
                        <label className="label-pro">Sélectionner un marché</label>
                        <select className="input-pro" value={selectedMarketId} onChange={e => handleMarketChange(e.target.value)}>
                            {markets.map(m => (
                                <option key={m.id} value={m.id}>{m.name} ({m.slug})</option>
                            ))}
                        </select>
                    </div>

                    {selectedMarketId && (
                        <>
                            <FileUploadField
                                label="Image du Marché"
                                value={marketImage}
                                onChange={handleUploadImage}
                            />
                            <FileUploadField
                                label="Icône du Marché"
                                value={marketIcon}
                                onChange={handleUploadIcon}
                            />
                        </>
                    )}
                    {saveStatus && <div style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#10b981' }}>{saveStatus}</div>}
                </div>
            </div>

            <div className="settings-card">
                <div className="settings-card-header">🎨 Styles de la Section</div>
                <div className="stack">
                    <div className="grid-2">
                        <div>
                            <label className="label-pro">Couleur du texte</label>
                            <div className="color-row">
                                <input type="color" className="color-swatch" value={config.textColor || '#0f172a'} onChange={e => handleChange('textColor', e.target.value)} />
                                <input className="input-pro" value={config.textColor || ''} onChange={e => handleChange('textColor', e.target.value)} />
                            </div>
                        </div>
                        <div>
                            <label className="label-pro">Couleur de fond</label>
                            <div className="color-row">
                                <input type="color" className="color-swatch" value={config.bgColor || '#ffffff'} onChange={e => handleChange('bgColor', e.target.value)} />
                                <input className="input-pro" value={config.bgColor || ''} onChange={e => handleChange('bgColor', e.target.value)} />
                            </div>
                        </div>
                    </div>

                    <div className="grid-2" style={{ marginTop: '12px' }}>
                        <label className="label-pro" style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                            <input type="checkbox" checked={config.showMap !== false} onChange={e => handleChange('showMap', e.target.checked)} />
                            Afficher la carte
                        </label>
                        <label className="label-pro" style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                            <input type="checkbox" checked={config.showProductsCount !== false} onChange={e => handleChange('showProductsCount', e.target.checked)} />
                            Afficher le compteur de produits
                        </label>
                    </div>
                </div>
            </div>
        </div>
    );
}

interface NeighborhoodInfoSettingsProps {
    data: any;
    onSave: (newData: any) => void;
}

export function NeighborhoodInfoSettings({ data, onSave }: NeighborhoodInfoSettingsProps) {
    const [config, setConfig] = React.useState<any>({});
    const [neighborhoods, setNeighborhoods] = React.useState<any[]>([]);
    const [selectedNeighborhoodId, setSelectedNeighborhoodId] = React.useState<string>('');
    const [neighborhoodImage, setNeighborhoodImage] = React.useState<string>('');
    const [neighborhoodIcon, setNeighborhoodIcon] = React.useState<string>('');
    const [saveStatus, setSaveStatus] = React.useState<string>('');

    React.useEffect(() => {
        const defaults = {
            textColor: "#0f172a",
            bgColor: "#ffffff",
            showMap: true,
            showProductsCount: true,
            selectedNeighborhoodId: ""
        };
        setConfig({ ...defaults, ...data });
        if (data.selectedNeighborhoodId) {
            setSelectedNeighborhoodId(data.selectedNeighborhoodId);
        }
    }, [data]);

    useAutoSave(config, onSave);

    React.useEffect(() => {
        fetchGraphQL(FETCH_NEIGHBORHOODS_FOR_SETTINGS).then(res => {
            const list = res?.geographicLocations || [];
            setNeighborhoods(list);
            if (list.length > 0) {
                const initialId = data.selectedNeighborhoodId || list[0].id;
                setSelectedNeighborhoodId(initialId);
                const active = list.find((n: any) => n.id === initialId);
                if (active) {
                    setNeighborhoodImage(active.image || '');
                    setNeighborhoodIcon(active.icon || '');
                }
            }
        });
    }, [data.selectedNeighborhoodId]);

    const handleNeighborhoodChange = (id: string) => {
        setSelectedNeighborhoodId(id);
        handleChange('selectedNeighborhoodId', id);
        const active = neighborhoods.find(n => n.id === id);
        if (active) {
            setNeighborhoodImage(active.image || '');
            setNeighborhoodIcon(active.icon || '');
        }
    };

    const handleUploadImage = async (url: string) => {
        setNeighborhoodImage(url);
        if (selectedNeighborhoodId) {
            try {
                await fetchGraphQL(UPDATE_NEIGHBORHOOD_CMS_DATA, { id: selectedNeighborhoodId, image: url });
                setSaveStatus('✅ Image enregistrée !');
                setTimeout(() => setSaveStatus(''), 2000);
            } catch (e) {
                console.error(e);
            }
        }
    };

    const handleUploadIcon = async (url: string) => {
        setNeighborhoodIcon(url);
        if (selectedNeighborhoodId) {
            try {
                await fetchGraphQL(UPDATE_NEIGHBORHOOD_CMS_DATA, { id: selectedNeighborhoodId, icon: url });
                setSaveStatus('✅ Icône enregistrée !');
                setTimeout(() => setSaveStatus(''), 2000);
            } catch (e) {
                console.error(e);
            }
        }
    };

    const handleChange = (field: string, value: any) => {
        setConfig((prev: any) => ({ ...prev, [field]: value }));
    };

    return (
        <div className="stack-lg" style={{ width: "100%", height: "100%", maxHeight: "calc(100vh - 200px)", overflowY: "auto" }}>
            <div className="settings-card">
                <div className="settings-card-header">📍 Sélection du Quartier & Assets</div>
                <div className="stack">
                    <div>
                        <label className="label-pro">Sélectionner un quartier</label>
                        <select className="input-pro" value={selectedNeighborhoodId} onChange={e => handleNeighborhoodChange(e.target.value)}>
                            {neighborhoods.map(n => (
                                <option key={n.id} value={n.id}>{n.name} ({n.slug})</option>
                            ))}
                        </select>
                    </div>

                    {selectedNeighborhoodId && (
                        <>
                            <FileUploadField
                                label="Image du Quartier"
                                value={neighborhoodImage}
                                onChange={handleUploadImage}
                            />
                            <FileUploadField
                                label="Icône du Quartier"
                                value={neighborhoodIcon}
                                onChange={handleUploadIcon}
                            />
                        </>
                    )}
                    {saveStatus && <div style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#10b981' }}>{saveStatus}</div>}
                </div>
            </div>

            <div className="settings-card">
                <div className="settings-card-header">🎨 Styles de la Section</div>
                <div className="stack">
                    <div className="grid-2">
                        <div>
                            <label className="label-pro">Couleur du texte</label>
                            <div className="color-row">
                                <input type="color" className="color-swatch" value={config.textColor || '#0f172a'} onChange={e => handleChange('textColor', e.target.value)} />
                                <input className="input-pro" value={config.textColor || ''} onChange={e => handleChange('textColor', e.target.value)} />
                            </div>
                        </div>
                        <div>
                            <label className="label-pro">Couleur de fond</label>
                            <div className="color-row">
                                <input type="color" className="color-swatch" value={config.bgColor || '#ffffff'} onChange={e => handleChange('bgColor', e.target.value)} />
                                <input className="input-pro" value={config.bgColor || ''} onChange={e => handleChange('bgColor', e.target.value)} />
                            </div>
                        </div>
                    </div>

                    <div className="grid-2" style={{ marginTop: '12px' }}>
                        <label className="label-pro" style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                            <input type="checkbox" checked={config.showMap !== false} onChange={e => handleChange('showMap', e.target.checked)} />
                            Afficher la carte
                        </label>
                        <label className="label-pro" style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                            <input type="checkbox" checked={config.showProductsCount !== false} onChange={e => handleChange('showProductsCount', e.target.checked)} />
                            Afficher le compteur de produits
                        </label>
                    </div>
                </div>
            </div>
        </div>
    );
}

interface MarketCodeSettingsProps {
    data: any;
    onSave: (newData: any) => void;
}

export function MarketCodeSettings({ data, onSave }: MarketCodeSettingsProps) {
    const [config, setConfig] = React.useState<any>({});

    React.useEffect(() => {
        const defaults = {
            htmlContent: "<!-- Écrivez votre code HTML pour le marché ici -->\n<div style='padding: 20px; background: #eff6ff; border-radius: 8px;'>\n  <h3>Bienvenue au Marché {{market.name}}</h3>\n  <p>{{market.description}}</p>\n  <p>Coordonnées : {{market.latitude}}, {{market.longitude}}</p>\n</div>",
            cssContent: ".market-custom { color: #1e3a8a; }",
            jsContent: "console.log('Code personnalisé exécuté pour le marché : ' + window.ahizan?.market?.name);"
        };
        setConfig({ ...defaults, ...data });
    }, [data]);

    useAutoSave(config, onSave);

    const handleChange = (field: string, value: any) => {
        setConfig((prev: any) => ({ ...prev, [field]: value }));
    };

    return (
        <div className="stack-lg" style={{ width: "100%", height: "100%", maxHeight: "calc(100vh - 200px)", overflowY: "auto" }}>
            <div className="settings-card">
                <div className="settings-card-header">💻 Code Personnalisé pour Marché</div>
                <div className="stack" style={{ gap: '16px' }}>
                    <div>
                        <label className="label-pro" style={{ fontWeight: 'bold' }}>HTML Content</label>
                        <textarea
                            className="input-pro font-mono"
                            value={config.htmlContent || ''}
                            onChange={e => handleChange('htmlContent', e.target.value)}
                            rows={8}
                            style={{ fontFamily: 'monospace', fontSize: '0.82rem', whiteSpace: 'pre', background: '#0f172a', color: '#f8fafc', padding: '12px', border: '1px solid #1e293b' }}
                        />
                    </div>
                    <div>
                        <label className="label-pro" style={{ fontWeight: 'bold' }}>CSS Content (Optionnel)</label>
                        <textarea
                            className="input-pro font-mono"
                            value={config.cssContent || ''}
                            onChange={e => handleChange('cssContent', e.target.value)}
                            rows={4}
                            style={{ fontFamily: 'monospace', fontSize: '0.82rem', whiteSpace: 'pre', background: '#0f172a', color: '#f8fafc', padding: '12px', border: '1px solid #1e293b' }}
                        />
                    </div>
                    <div>
                        <label className="label-pro" style={{ fontWeight: 'bold' }}>JavaScript Content (Optionnel)</label>
                        <textarea
                            className="input-pro font-mono"
                            value={config.jsContent || ''}
                            onChange={e => handleChange('jsContent', e.target.value)}
                            rows={4}
                            style={{ fontFamily: 'monospace', fontSize: '0.82rem', whiteSpace: 'pre', background: '#0f172a', color: '#f8fafc', padding: '12px', border: '1px solid #1e293b' }}
                        />
                    </div>
                </div>
            </div>

            <div className="settings-card">
                <div className="settings-card-header">📋 Variables Disponibles</div>
                <div style={{ padding: '12px', fontSize: '0.75rem', background: '#f8fafc', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                    <p style={{ margin: '0 0 8px 0', fontWeight: 'bold', color: '#1e293b' }}>Vous pouvez utiliser ces placeholders dans votre HTML/CSS :</p>
                    <ul style={{ margin: 0, paddingLeft: '16px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <li><code>{"{{market.name}}"}</code> : Nom du marché</li>
                        <li><code>{"{{market.slug}}"}</code> : Identifiant unique (slug)</li>
                        <li><code>{"{{market.description}}"}</code> : Description du marché</li>
                        <li><code>{"{{market.image}}"}</code> : URL de l'image de couverture</li>
                        <li><code>{"{{market.icon}}"}</code> : URL de l'icône</li>
                        <li><code>{"{{market.latitude}}"}</code> : Latitude</li>
                        <li><code>{"{{market.longitude}}"}</code> : Longitude</li>
                        <li><code>{"{{market.radius}}"}</code> : Rayon en mètres</li>
                        <li><code>{"{{market.map}}"}</code> : Rendu HTML de la carte Leaflet interactive</li>
                    </ul>
                    <p style={{ margin: '8px 0 0 0', opacity: 0.8 }}>Dans votre JS, vous pouvez y accéder via <code>window.ahizan.market</code>.</p>
                </div>
            </div>
        </div>
    );
}

interface NeighborhoodCodeSettingsProps {
    data: any;
    onSave: (newData: any) => void;
}

export function NeighborhoodCodeSettings({ data, onSave }: NeighborhoodCodeSettingsProps) {
    const [config, setConfig] = React.useState<any>({});

    React.useEffect(() => {
        const defaults = {
            htmlContent: "<!-- Écrivez votre code HTML pour le quartier ici -->\n<div style='padding: 20px; background: #fef3c7; border-radius: 8px;'>\n  <h3>Bienvenue au Quartier {{neighborhood.name}}</h3>\n  <p>Coordonnées : {{neighborhood.latitude}}, {{neighborhood.longitude}}</p>\n</div>",
            cssContent: ".neighborhood-custom { color: #92400e; }",
            jsContent: "console.log('Code personnalisé exécuté pour le quartier : ' + window.ahizan?.neighborhood?.name);"
        };
        setConfig({ ...defaults, ...data });
    }, [data]);

    useAutoSave(config, onSave);

    const handleChange = (field: string, value: any) => {
        setConfig((prev: any) => ({ ...prev, [field]: value }));
    };

    return (
        <div className="stack-lg" style={{ width: "100%", height: "100%", maxHeight: "calc(100vh - 200px)", overflowY: "auto" }}>
            <div className="settings-card">
                <div className="settings-card-header">💻 Code Personnalisé pour Quartier</div>
                <div className="stack" style={{ gap: '16px' }}>
                    <div>
                        <label className="label-pro" style={{ fontWeight: 'bold' }}>HTML Content</label>
                        <textarea
                            className="input-pro font-mono"
                            value={config.htmlContent || ''}
                            onChange={e => handleChange('htmlContent', e.target.value)}
                            rows={8}
                            style={{ fontFamily: 'monospace', fontSize: '0.82rem', whiteSpace: 'pre', background: '#0f172a', color: '#f8fafc', padding: '12px', border: '1px solid #1e293b' }}
                        />
                    </div>
                    <div>
                        <label className="label-pro" style={{ fontWeight: 'bold' }}>CSS Content (Optionnel)</label>
                        <textarea
                            className="input-pro font-mono"
                            value={config.cssContent || ''}
                            onChange={e => handleChange('cssContent', e.target.value)}
                            rows={4}
                            style={{ fontFamily: 'monospace', fontSize: '0.82rem', whiteSpace: 'pre', background: '#0f172a', color: '#f8fafc', padding: '12px', border: '1px solid #1e293b' }}
                        />
                    </div>
                    <div>
                        <label className="label-pro" style={{ fontWeight: 'bold' }}>JavaScript Content (Optionnel)</label>
                        <textarea
                            className="input-pro font-mono"
                            value={config.jsContent || ''}
                            onChange={e => handleChange('jsContent', e.target.value)}
                            rows={4}
                            style={{ fontFamily: 'monospace', fontSize: '0.82rem', whiteSpace: 'pre', background: '#0f172a', color: '#f8fafc', padding: '12px', border: '1px solid #1e293b' }}
                        />
                    </div>
                </div>
            </div>

            <div className="settings-card">
                <div className="settings-card-header">📋 Variables Disponibles</div>
                <div style={{ padding: '12px', fontSize: '0.75rem', background: '#f8fafc', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                    <p style={{ margin: '0 0 8px 0', fontWeight: 'bold', color: '#1e293b' }}>Vous pouvez utiliser ces placeholders dans votre HTML/CSS :</p>
                    <ul style={{ margin: 0, paddingLeft: '16px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <li><code>{"{{neighborhood.name}}"}</code> : Nom du quartier</li>
                        <li><code>{"{{neighborhood.slug}}"}</code> : Identifiant unique (slug)</li>
                        <li><code>{"{{neighborhood.image}}"}</code> : URL de l'image de couverture</li>
                        <li><code>{"{{neighborhood.icon}}"}</code> : URL de l'icône</li>
                        <li><code>{"{{neighborhood.latitude}}"}</code> : Latitude</li>
                        <li><code>{"{{neighborhood.longitude}}"}</code> : Longitude</li>
                        <li><code>{"{{neighborhood.radius}}"}</code> : Rayon en mètres</li>
                        <li><code>{"{{neighborhood.parent.name}}"}</code> : Nom du quartier parent</li>
                        <li><code>{"{{neighborhood.map}}"}</code> : Rendu HTML de la carte Leaflet interactive</li>
                    </ul>
                    <p style={{ margin: '8px 0 0 0', opacity: 0.8 }}>Dans votre JS, vous pouvez y accéder via <code>window.ahizan.neighborhood</code>.</p>
                </div>
            </div>
        </div>
    );
}
