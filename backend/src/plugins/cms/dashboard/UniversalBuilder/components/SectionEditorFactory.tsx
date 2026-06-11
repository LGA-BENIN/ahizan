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
import { ProductGridSettings } from './sections/ProductGridSettings';
import { TabbedProductGridSettings } from './sections/TabbedProductGridSettings';
import { RichTextSettings } from './sections/RichTextSettings';
import { CodeInjectionPanel } from './sections/CodeInjectionPanel';
import { CategoryHeaderSettings } from './sections/CategoryHeaderSettings';
import { DynamicProductGridSettings } from './sections/DynamicProductGridSettings';
import { ProductOverviewSettings } from './sections/ProductOverviewSettings';
import { ProductReviewsSettings } from './sections/ProductReviewsSettings';
import { RelatedProductsSettings } from './sections/RelatedProductsSettings';
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

        // Global system configs — no code injection (they control layout, not visible sections)
        case 'THEME_SETTINGS':
            return <ThemeSettings data={data} onSave={handleSave} />;

        case 'HEADER_CONF':
            return <HeaderSettings data={data} onSave={handleSave} />;

        case 'FOOTER_CONF':
            return <FooterSettings data={data} onSave={handleSave} />;

        case 'PRODUCT_GRID':
            return withCodePanel(<ProductGridSettings data={data} onSave={handleSave} />);

        case 'TABBED_PRODUCT_GRID':
            return withCodePanel(<TabbedProductGridSettings data={data} onSave={handleSave} />);

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

        default:
            return withCodePanel(
                <div style={{ textAlign: 'center', padding: '2rem' }}>
                    <h3>Pas d'éditeur graphique pour {section.type}</h3>
                    <p>Passez à l'onglet Éditeur de Code ci-dessus pour personnaliser cette section avec du HTML, CSS & JS.</p>
                </div>
            );
    }
};
