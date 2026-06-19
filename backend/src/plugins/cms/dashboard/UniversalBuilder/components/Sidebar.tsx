import React, { useState } from 'react';
import { useEditor } from '../hooks/EditorContext';

interface SidebarProps {
  sections: any[];
  pageSlug?: string;
  onRefetch: () => void;
  onCreate: (type: string) => void;
  onDelete: (id: string) => void;
  onMove: (id: string, currentOrder: number, direction: 'up' | 'down', targetSectionId?: string) => void;
  onToggle: (id: string, isActive: boolean) => void;
  onMoveGroup: (sectionType: string, direction: 'up' | 'down') => void;
}

/** 
 * Defines the storefront component roadmap.
 * "singleton" types appear as a single clickable row (clicking opens its editor).
 * "multi" types show a dropdown of all instances of that type; the superadmin
 * can have 4 flash campaigns, 2 promo banners, etc.
 */
const MASTER_ZONE_MAP = [
    {
        zone: 'Général',
        items: [
            { type: 'THEME_SETTINGS', icon: '⚙️', label: 'Thème et Image de marque', mode: 'singleton' },
            { type: 'MODALS', icon: '📢', label: 'Modales Pop-up', mode: 'singleton' },
        ],
        allowedOn: ['home']
    },
    {
        zone: 'En-tête',
        items: [
            { type: 'HEADER_CONF', icon: '🧭', label: 'En-tête et TopBar', mode: 'singleton' },
        ],
        allowedOn: ['home']
    },
    {
        zone: 'Impact',
        items: [
            { type: 'HERO', icon: '🎬', label: 'Slider Hero', mode: 'singleton' },
        ],
        allowedOn: ['home']
    },
    {
        zone: 'Page Produit (Modèles)',
        items: [
            { type: 'PRODUCT_OVERVIEW', icon: '🛍️', label: 'Fiche Produit Principale', mode: 'singleton' },
            { type: 'PRODUCT_REVIEWS', icon: '⭐', label: 'Avis Clients', mode: 'singleton' },
            { type: 'RELATED_PRODUCTS', icon: '🔄', label: 'Produits Similaires', mode: 'singleton' },
        ],
        allowedOn: ['product']
    },
    {
        zone: 'Page Catégorie (Modèles)',
        items: [
            { type: 'CATEGORY_HEADER', icon: '🖼️', label: 'En-tête de Catégorie (Bannière)', mode: 'singleton' },
            { type: 'DYNAMIC_PRODUCT_GRID', icon: '🎛️', label: 'Grille de Produits & Filtres', mode: 'singleton' },
        ],
        allowedOn: ['category']
    },
    {
        zone: 'Corps',
        items: [
            { type: 'FLASH_DEALS', icon: '⚡', label: 'Campagnes Flash', mode: 'multi' },
            { type: 'QUICK_LINKS', icon: '🏷️', label: 'Liens Rapides et Bannières', mode: 'multi' },
            { type: 'CATEGORIES', icon: '', label: 'Catégories', mode: 'multi' },
            { type: 'SMART_VISUAL_GRID', icon: '✨', label: 'Smart Visual Grid', mode: 'multi' },
            { type: 'FREEFORM_BUILDER', icon: '🏗️', label: 'Constructeur Libre Drag & Drop', mode: 'multi' },
        ],
        allowedOn: ['all']
    },
    {
        zone: 'Contenu',
        items: [
            { type: 'RICH_TEXT', icon: '📝', label: 'Texte Riche (Tiptap)', mode: 'multi' },
        ],
        allowedOn: ['all']
    },
    {
        zone: 'Pied de page',
        items: [
            { type: 'FOOTER_CONF', icon: '🦶', label: 'Pied de page global', mode: 'singleton' },
        ],
        allowedOn: ['home']
    },
    {
        zone: 'Avancé',
        items: [
            { type: 'CUSTOM', icon: '🛠️', label: 'Code HTML personnalisé', mode: 'multi' },
        ],
        allowedOn: ['all']
    },
];

const getZoneMapForSlug = (slug?: string) => {
    const activeSlug = slug || 'home';
    
    // Define exact permitted types for each page type to prevent clutter
    const permittedTypes: Record<string, string[]> = {
        home: [
            'THEME_SETTINGS', 'MODALS', 'HEADER_CONF', 'HERO',
            'FLASH_DEALS', 'QUICK_LINKS', 'CATEGORIES', 'SMART_VISUAL_GRID', 'FREEFORM_BUILDER',
            'RICH_TEXT', 'FOOTER_CONF', 'CUSTOM'
        ],
        category: [
            'CATEGORY_HEADER', 'DYNAMIC_PRODUCT_GRID', 'FLASH_DEALS', 'SMART_VISUAL_GRID', 'RICH_TEXT', 'FREEFORM_BUILDER'
        ],
        product: [
            'PRODUCT_OVERVIEW', 'PRODUCT_REVIEWS', 'RELATED_PRODUCTS', 'FLASH_DEALS', 'SMART_VISUAL_GRID', 'RICH_TEXT', 'FREEFORM_BUILDER'
        ]
    };

    const allowedTypes = permittedTypes[activeSlug] || permittedTypes['home'];

    // Map and filter the zones dynamically
    return MASTER_ZONE_MAP
        .map(zone => {
            const filteredItems = zone.items.filter(item => allowedTypes.includes(item.type));
            return {
                ...zone,
                items: filteredItems
            };
        })
        .filter(zone => zone.items.length > 0);
};

export const Sidebar = ({ sections, pageSlug, onRefetch, onCreate, onDelete, onMove, onToggle, onMoveGroup }: SidebarProps) => {
    const { selectedSection, setSelectedSection, setMode } = useEditor();
    // Track which "multi" groups have their dropdown expanded
    const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
    // Track sidebar collapse state
    const [isCollapsed, setIsCollapsed] = useState(false);
    // Track view mode
    const [viewMode, setViewMode] = useState<'LIBRARY' | 'STRUCTURE'>('LIBRARY');

    const sortedSections = [...sections].sort((a, b) => a.order - b.order);
    const activeZoneMap = getZoneMapForSlug(pageSlug);

    const getTypeInfo = (type: string) => {
        for (const zone of MASTER_ZONE_MAP) {
            const item = zone.items.find(i => i.type === type);
            if (item) return item;
        }
        // Extra known types not in ZONE_MAP
        const extraTypes: Record<string, { icon: string; label: string; mode: string }> = {
            'TOP_BAR': { icon: '📢', label: 'Barre Supérieure', mode: 'singleton' },
            'CATEGORY_GRID': { icon: '📐', label: 'Grille de Catégories', mode: 'multi' },
        };
        return extraTypes[type] || { icon: '📦', label: type, mode: 'multi' };
    };

    // Get all sections matching a given type
    const getSectionsOfType = (type: string) => sortedSections.filter(s => s.type === type);

    const toggleExpand = (type: string) => {
        setExpandedGroups(prev => ({ ...prev, [type]: !prev[type] }));
    };

    const handleSelect = (section: any) => {
        setSelectedSection(section);
        setMode('PAR_VISUEL');
    };

    const handleAdd = (type: string) => {
        onCreate(type);
        // Auto-expand the group after creation
        setExpandedGroups(prev => ({ ...prev, [type]: true }));
    };

    // Render a single section item row (used inside dropdowns for multi items)
    const renderSectionRow = (s: any) => {
        const isSelected = selectedSection?.id === s.id;
        const isStructureMode = viewMode === 'STRUCTURE';
        
        // Define non-layout types
        const NON_LAYOUT_TYPES = ['THEME_SETTINGS', 'MODALS', 'HEADER_CONF', 'FOOTER_CONF'];
        const layoutSections = sortedSections.filter(sec => !NON_LAYOUT_TYPES.includes(sec.type));
        
        let upDisabled = false;
        let downDisabled = false;
        let targetUpId: string | undefined;
        let targetDownId: string | undefined;

        if (isStructureMode) {
            const layoutIndex = layoutSections.findIndex(sec => sec.id === s.id);
            upDisabled = layoutIndex <= 0;
            downDisabled = layoutIndex >= layoutSections.length - 1 || layoutIndex === -1;
            if (!upDisabled) targetUpId = layoutSections[layoutIndex - 1].id;
            if (!downDisabled) targetDownId = layoutSections[layoutIndex + 1].id;
        } else {
            const globalIndex = sortedSections.findIndex(sec => sec.id === s.id);
            upDisabled = globalIndex <= 0;
            downDisabled = globalIndex >= sortedSections.length - 1;
        }

        // Calculate index of this section among its own type for auto-numbering
        const typeIndex = sortedSections.filter(sec => sec.type === s.type).findIndex(sec => sec.id === s.id) + 1;
        
        let customTitle = s.title;
        if (!customTitle && s.dataJson) {
            try {
                const d = typeof s.dataJson === 'string' ? JSON.parse(s.dataJson) : s.dataJson;
                if (s.type === 'FLASH_DEALS' && d.flashVersions?.[0]?.name) customTitle = d.flashVersions[0].name;
                else if (d.title) customTitle = d.title;
            } catch(e){}
        }
        
        const typeLabel = getTypeInfo(s.type).label;
        const displayTitle = customTitle || `${typeLabel} ${typeIndex}`;

        return (
            <div
                key={s.id}
                onClick={() => handleSelect(s)}
                style={{
                    padding: '8px 10px',
                    background: isSelected ? 'var(--builder-primary-light)' : '#fff',
                    border: `1px solid ${isSelected ? 'var(--builder-primary-border)' : 'var(--builder-border)'}`,
                    borderRadius: '6px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    transition: 'all 0.15s',
                    fontSize: '0.75rem',
                }}
            >
                {/* Move arrows */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
                    <button
                        disabled={upDisabled}
                        onClick={(e) => { e.stopPropagation(); onMove(s.id, s.order, 'up', targetUpId); }}
                        style={{ background: 'none', border: 'none', cursor: upDisabled ? 'default' : 'pointer', opacity: upDisabled ? 0.3 : 1, fontSize: '0.6rem', color: 'var(--builder-text-muted)', padding: '0 2px', lineHeight: 1 }}
                        title="Déplacer vers le haut"
                    >▲</button>
                    <button
                        disabled={downDisabled}
                        onClick={(e) => { e.stopPropagation(); onMove(s.id, s.order, 'down', targetDownId); }}
                        style={{ background: 'none', border: 'none', cursor: downDisabled ? 'default' : 'pointer', opacity: downDisabled ? 0.3 : 1, fontSize: '0.6rem', color: 'var(--builder-text-muted)', padding: '0 2px', lineHeight: 1 }}
                        title="Déplacer vers le bas"
                    >▼</button>
                </div>
                <span style={{ fontSize: '1rem', marginRight: '4px' }}>{getTypeInfo(s.type).icon}</span>
                <div style={{ flex: 1, overflow: 'hidden' }}>
                    <div style={{
                        fontWeight: 600,
                        whiteSpace: 'nowrap',
                        textOverflow: 'ellipsis',
                        overflow: 'hidden',
                    }}>
                        {displayTitle}
                    </div>
                    <div style={{ fontSize: '0.6rem', color: s.isActive ? 'var(--builder-success)' : 'var(--builder-text-soft)', fontWeight: 600 }}>
                        {typeLabel} • {s.isActive ? 'Actif' : 'Inactif'}
                    </div>
                </div>
                {/* Activation Toggle */}
                <button 
                    onClick={(e) => { e.stopPropagation(); onToggle(s.id, !s.isActive); }} 
                    title={s.isActive ? "Masquer de la boutique" : "Afficher sur la boutique"}
                    style={{ 
                        background: 'none', 
                        border: 'none', 
                        fontSize: '0.9rem', 
                        cursor: 'pointer',
                        opacity: s.isActive ? 1 : 0.4,
                        filter: s.isActive ? 'none' : 'grayscale(1)'
                    }}
                >
                    {s.isActive ? '👁️' : '🙈'}
                </button>
                {isSelected && <span style={{ color: 'var(--builder-primary)', fontSize: '0.8rem' }}>→</span>}
                <button
                    onClick={(e) => { e.stopPropagation(); onDelete(s.id); }}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', fontSize: '0.7rem', padding: '2px', marginLeft: 'auto' }}
                    title="Supprimer la section"
                >✕</button>
            </div>
        );
    };

    return (
        <aside style={{ 
            width: isCollapsed ? '60px' : '300px', 
            background: '#fff', 
            borderRight: '1px solid var(--builder-border)', 
            display: 'flex', 
            flexDirection: 'column',
            transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            overflow: 'hidden',
            flexShrink: 0
        }}>
            {/* Header & Toggle */}
            <div style={{ 
                padding: '16px', 
                borderBottom: '1px solid var(--builder-border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: 'linear-gradient(to right, #f8fafc, #fff)'
            }}>
                {!isCollapsed && <h2 style={{ fontSize: '0.9rem', fontWeight: 800, margin: 0, color: 'var(--builder-text)' }}>Structure / Composants</h2>}
                <button 
                    onClick={() => setIsCollapsed(!isCollapsed)}
                    style={{
                        background: 'transparent', border: 'none', cursor: 'pointer',
                        fontSize: '1rem', color: 'var(--builder-text-soft)',
                        padding: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}
                >
                    {isCollapsed ? '▶' : '◀'}
                </button>
            </div>

            {/* View Toggle */}
            {!isCollapsed && (
                <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--builder-border)', background: '#f8fafc' }}>
                    <div style={{ display: 'flex', background: '#e2e8f0', borderRadius: '8px', padding: '4px' }}>
                        <button
                            onClick={() => setViewMode('LIBRARY')}
                            style={{
                                flex: 1, border: 'none', borderRadius: '6px', padding: '6px 0',
                                background: viewMode === 'LIBRARY' ? '#fff' : 'transparent',
                                color: viewMode === 'LIBRARY' ? '#0f172a' : '#64748b',
                                fontSize: '0.7rem', fontWeight: 700, cursor: 'pointer',
                                boxShadow: viewMode === 'LIBRARY' ? '0 1px 2px rgba(0,0,0,0.1)' : 'none',
                                transition: 'all 0.2s'
                            }}
                        >
                            📚 Bibliothèque
                        </button>
                        <button
                            onClick={() => setViewMode('STRUCTURE')}
                            style={{
                                flex: 1, border: 'none', borderRadius: '6px', padding: '6px 0',
                                background: viewMode === 'STRUCTURE' ? '#fff' : 'transparent',
                                color: viewMode === 'STRUCTURE' ? '#0f172a' : '#64748b',
                                fontSize: '0.7rem', fontWeight: 700, cursor: 'pointer',
                                boxShadow: viewMode === 'STRUCTURE' ? '0 1px 2px rgba(0,0,0,0.1)' : 'none',
                                transition: 'all 0.2s'
                            }}
                        >
                            ☰ Structure
                        </button>
                    </div>
                </div>
            )}

            {/* Component List */}
            {!isCollapsed && (
                <div style={{ flex: 1, overflowY: 'auto', padding: '10px' }}>
                    {viewMode === 'LIBRARY' ? (
                        <div className="stack-lg">
                    {activeZoneMap.map((zone) => (
                        <div key={zone.zone}>
                            {/* Zone Label */}
                            <div style={{
                                fontSize: '0.55rem',
                                fontWeight: 700,
                                color: 'var(--builder-text-soft)',
                                textTransform: 'uppercase',
                                letterSpacing: '0.08em',
                                paddingBottom: '6px',
                                borderBottom: '1px solid var(--builder-border)',
                                marginBottom: '6px',
                            }}>
                                {zone.zone === 'Corps' ? '── SECTIONS DU CORPS ──' :
                                 zone.zone === 'Contenu' ? '── CONTENU ──' :
                                 zone.zone}
                            </div>

                            <div className="stack" style={{ gap: '4px' }}>
                                {zone.items.map((item) => {
                                    const matchingSections = getSectionsOfType(item.type);
                                    const count = matchingSections.length;
                                    const isExpanded = expandedGroups[item.type];

                                    if (item.mode === 'singleton') {
                                        // Singleton: directly clickable, opens the first matching section (or creates one)
                                        const existingSection = matchingSections[0];
                                        const isSelected = existingSection && selectedSection?.id === existingSection.id;

                                        return (
                                            <div key={item.type}>
                                                <div
                                                    onClick={() => {
                                                        if (existingSection) {
                                                            handleSelect(existingSection);
                                                        } else {
                                                            // Auto-create the singleton section ONLY if it doesn't exist
                                                            handleAdd(item.type);
                                                        }
                                                    }}
                                                    style={{
                                                        padding: '8px 10px',
                                                        background: isSelected ? 'var(--builder-primary-light)' : '#fff',
                                                        border: `1px solid ${isSelected ? 'var(--builder-primary-border)' : 'var(--builder-border)'}`,
                                                        borderRadius: '8px',
                                                        cursor: 'pointer',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '8px',
                                                        transition: 'all 0.15s',
                                                    }}
                                                    onMouseEnter={(e) => { if (!isSelected) { e.currentTarget.style.borderColor = '#bfdbfe'; e.currentTarget.style.background = '#f8faff'; } }}
                                                    onMouseLeave={(e) => { if (!isSelected) { e.currentTarget.style.borderColor = 'var(--builder-border)'; e.currentTarget.style.background = '#fff'; } }}
                                                >
                                                    <span style={{ fontSize: '1rem' }}>{item.icon}</span>
                                                    <div style={{ flex: 1 }}>
                                                        <div style={{ fontSize: '0.75rem', fontWeight: 600 }}>{item.label}</div>
                                                        <div style={{ fontSize: '0.6rem', color: existingSection ? (existingSection.isActive ? 'var(--builder-success)' : 'var(--builder-text-red)') : '#f59e0b', fontWeight: 500 }}>
                                                            {existingSection ? (existingSection.isActive ? '● Actif & Configuré' : '○ Masqué / Désactivé') : '⚠ Non créé'}
                                                        </div>
                                                    </div>
                                                    {existingSection && (
                                                        <button 
                                                            onClick={(e) => { e.stopPropagation(); onToggle(existingSection.id, !existingSection.isActive); }} 
                                                            title={existingSection.isActive ? "Masquer de la boutique" : "Afficher sur la boutique"}
                                                            style={{ 
                                                                background: existingSection.isActive ? 'var(--builder-primary-light)' : '#f1f5f9', 
                                                                border: 'none', 
                                                                borderRadius: '4px',
                                                                padding: '4px 8px',
                                                                fontSize: '0.6rem',
                                                                fontWeight: 700,
                                                                color: existingSection.isActive ? 'var(--builder-primary)' : '#64748b',
                                                                cursor: 'pointer'
                                                            }}
                                                        >
                                                            {existingSection.isActive ? 'ON' : 'OFF'}
                                                        </button>
                                                    )}
                                                    {isSelected && <span style={{ color: 'var(--builder-primary)', fontSize: '0.7rem' }}>→</span>}
                                                </div>
                                            </div>
                                        );
                                    }

                                    // Multi mode: show a row with count + chevron + group move arrows, clicking expands the dropdown
                                    // Determine if group move is possible (has at least 1 section)
                                    const canMoveGroup = count > 0;
                                    return (
                                        <div key={item.type}>
                                            <div
                                                onClick={() => toggleExpand(item.type)}
                                                style={{
                                                    padding: '8px 10px',
                                                    background: isExpanded ? '#f8f9fb' : '#fff',
                                                    border: `1px solid var(--builder-border)`,
                                                    borderRadius: isExpanded ? '8px 8px 0 0' : '8px',
                                                    cursor: 'pointer',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '8px',
                                                    transition: 'all 0.15s',
                                                }}
                                                onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#bfdbfe'; }}
                                                onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--builder-border)'; }}
                                            >
                                                <span style={{ fontSize: '1rem' }}>{item.icon}</span>
                                                <div style={{ flex: 1 }}>
                                                    <div style={{ fontSize: '0.75rem', fontWeight: 600 }}>{item.label}</div>
                                                    <div style={{ fontSize: '0.6rem', color: count > 0 ? 'var(--builder-success)' : 'var(--builder-text-soft)', fontWeight: 500 }}>
                                                        {count > 0 ? `${count} section${count > 1 ? 's' : ''}` : 'Aucun pour le moment'}
                                                    </div>
                                                </div>

                                                <span style={{
                                                    fontSize: '0.7rem',
                                                    color: 'var(--builder-text-muted)',
                                                    transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
                                                    transition: 'transform 0.2s',
                                                    display: 'inline-block',
                                                }}>▶</span>
                                            </div>

                                            {/* Expanded dropdown */}
                                            {isExpanded && (
                                                <div style={{
                                                    border: '1px solid var(--builder-border)',
                                                    borderTop: 'none',
                                                    borderRadius: '0 0 8px 8px',
                                                    padding: '6px',
                                                    background: '#fafbfc',
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                    gap: '4px',
                                                }}>
                                                    {matchingSections.map(s => renderSectionRow(s))}
                                                    {count === 0 && (
                                                        <div style={{ padding: '8px', textAlign: 'center', color: 'var(--builder-text-soft)', fontSize: '0.65rem' }}>
                                                            Aucun {item.label} pour le moment.
                                                        </div>
                                                    )}
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); handleAdd(item.type); }}
                                                        style={{
                                                            padding: '6px',
                                                            border: '1px dashed var(--builder-border)',
                                                            borderRadius: '6px',
                                                            background: 'transparent',
                                                            cursor: 'pointer',
                                                            fontSize: '0.7rem',
                                                            fontWeight: 600,
                                                            color: 'var(--builder-primary)',
                                                            textAlign: 'center',
                                                            transition: 'all 0.15s',
                                                        }}
                                                        onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--builder-primary-light)'; }}
                                                        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                                                    >
                                                        + Ajouter {item.label}
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                        </div>
                    ) : (
                        <div className="stack" style={{ gap: '6px' }}>
                            <div style={{ fontSize: '0.65rem', color: 'var(--builder-text-soft)', marginBottom: '8px', textAlign: 'center', padding: '0 10px' }}>
                                Ordre d'affichage de haut en bas sur le storefront. Utilisez les flèches ▲▼ pour réorganiser.
                            </div>
                            {(() => {
                                const layoutItems = sortedSections.filter(sec => !['THEME_SETTINGS', 'MODALS', 'HEADER_CONF', 'FOOTER_CONF'].includes(sec.type));
                                if (layoutItems.length === 0) {
                                    return (
                                        <div style={{ padding: '20px', textAlign: 'center', color: 'var(--builder-text-soft)', fontSize: '0.75rem' }}>
                                            Aucune section de mise en page ajoutée. Allez dans la Bibliothèque pour ajouter du contenu.
                                        </div>
                                    );
                                }
                                return layoutItems.map((s, idx) => (
                                    <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        <span style={{ fontSize: '0.6rem', color: '#94a3b8', fontWeight: 700, minWidth: '16px', textAlign: 'center' }}>{idx + 1}</span>
                                        <div style={{ flex: 1 }}>{renderSectionRow(s)}</div>
                                    </div>
                                ));
                            })()}
                        </div>
                    )}
                </div>
            )}
        </aside>
    );
};
