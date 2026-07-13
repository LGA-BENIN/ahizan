import React from 'react';
import { HeroSettings } from './sections/HeroSettings';
import { CategorySettings } from './sections/CategorySettings';
import { CategorySectionSettings } from './sections/CategorySectionSettings';
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
    const [title, setTitle] = React.useState(data.title || "Produits à Proximité");
    const [subtitle, setSubtitle] = React.useState(data.subtitle || "Découvrez les articles disponibles à l'achat immédiat auprès des marchands de votre secteur.");
    const [badgeText, setBadgeText] = React.useState(data.badgeText || "Recommandation Locale");
    const [limit, setLimit] = React.useState(data.limit || data.take || 8);
    const [layout, setLayout] = React.useState(data.layout || "grid-4");
    const [requireConfirmedLocation, setRequireConfirmedLocation] = React.useState(
        data.requireConfirmedLocation !== undefined ? data.requireConfirmedLocation : true
    );

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave({ 
            ...data,
            title, 
            subtitle, 
            badgeText,
            limit: Number(limit),
            take: Number(limit),
            layout,
            requireConfirmedLocation 
        });
    };

    return (
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem', padding: '1.5rem', background: '#1e293b', borderRadius: '12px', border: '1px solid #334155' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#f8fafc', margin: 0 }}>⚙️ Paramètres de la section Produits à proximité</h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <label style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 600 }}>Texte du badge supérieur</label>
                <input 
                    type="text" 
                    value={badgeText} 
                    onChange={e => setBadgeText(e.target.value)} 
                    placeholder="Ex: Recommandation Locale"
                    style={{ padding: '0.6rem', borderRadius: '6px', border: '1px solid #475569', background: '#0f172a', color: '#f8fafc' }} 
                />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <label style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 600 }}>Titre de la section</label>
                <input 
                    type="text" 
                    value={title} 
                    onChange={e => setTitle(e.target.value)} 
                    style={{ padding: '0.6rem', borderRadius: '6px', border: '1px solid #475569', background: '#0f172a', color: '#f8fafc' }} 
                />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <label style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 600 }}>Sous-titre</label>
                <textarea 
                    value={subtitle} 
                    onChange={e => setSubtitle(e.target.value)} 
                    rows={3}
                    style={{ padding: '0.6rem', borderRadius: '6px', border: '1px solid #475569', background: '#0f172a', color: '#f8fafc', resize: 'vertical' }} 
                />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <label style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 600 }}>Forme / Disposition des produits</label>
                <select 
                    value={layout} 
                    onChange={e => setLayout(e.target.value)} 
                    style={{ padding: '0.6rem', borderRadius: '6px', border: '1px solid #475569', background: '#0f172a', color: '#f8fafc', fontWeight: 600 }}
                >
                    <option value="grid-4">Grille 4 colonnes (Classique)</option>
                    <option value="grid-3">Grille 3 colonnes (Larges cartes)</option>
                    <option value="carousel">Carousel Horizontal (Défilement)</option>
                    <option value="compact">Grille Compacte (Mini cartes 6 colonnes)</option>
                </select>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <label style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 600 }}>Nombre maximum de produits à afficher</label>
                <input 
                    type="number" 
                    value={limit} 
                    onChange={e => setLimit(Number(e.target.value))} 
                    min={1}
                    max={50}
                    style={{ padding: '0.6rem', borderRadius: '6px', border: '1px solid #475569', background: '#0f172a', color: '#f8fafc' }} 
                />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', background: '#0f172a', padding: '0.8rem', borderRadius: '8px', border: '1px solid #334155' }}>
                <input 
                    type="checkbox" 
                    id="reqLoc"
                    checked={requireConfirmedLocation} 
                    onChange={e => setRequireConfirmedLocation(e.target.checked)} 
                    style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                />
                <label htmlFor="reqLoc" style={{ fontSize: '0.8rem', color: '#e2e8f0', fontWeight: 600, cursor: 'pointer' }}>
                    Afficher UNIQUEMENT si l'utilisateur a confirmé sa position géographique (Recommandé)
                </label>
            </div>

            <button 
                type="submit" 
                style={{ padding: '0.6rem 1.2rem', borderRadius: '6px', border: 'none', background: '#e31837', color: '#ffffff', fontWeight: 700, cursor: 'pointer', transition: 'background 0.2s', marginTop: '0.5rem' }}
                onMouseOver={e => (e.currentTarget.style.background = '#b9132c')}
                onMouseOut={e => (e.currentTarget.style.background = '#e31837')}
            >
                Enregistrer la section
            </button>
        </form>
    );
}
