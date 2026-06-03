import React, { useState } from 'react';
import { useEditor } from '../hooks/EditorContext';

interface SidebarProps {
  sections: any[];
  onRefetch: () => void;
  onCreate: (type: string) => void;
  onDelete: (id: string) => void;
  onMove: (id: string, currentOrder: number, direction: 'up' | 'down') => void;
  onToggle: (id: string, isActive: boolean) => void;
  onMoveGroup: (sectionType: string, direction: 'up' | 'down') => void;
}

/** 
 * Defines the storefront component roadmap.
 * "singleton" types appear as a single clickable row (clicking opens its editor).
 * "multi" types show a dropdown of all instances of that type; the superadmin
 * can have 4 flash campaigns, 2 promo banners, etc.
 */
const ZONE_MAP = [
    {
        zone: 'Général',
        items: [
            { type: 'THEME_SETTINGS', icon: '⚙️', label: 'Thème et Image de marque', mode: 'singleton' },
            { type: 'MODALS', icon: '📢', label: 'Modales Pop-up', mode: 'singleton' },
        ]
    },
    {
        zone: 'En-tête',
        items: [
            { type: 'HEADER_CONF', icon: '🧭', label: 'En-tête et TopBar', mode: 'singleton' },
        ]
    },
    {
        zone: 'Impact',
        items: [
            { type: 'HERO', icon: '🎬', label: 'Slider Hero', mode: 'singleton' },
        ]
    },
    {
        zone: 'Corps',
        items: [
            { type: 'FLASH_DEALS', icon: '⚡', label: 'Campagnes Flash', mode: 'multi' },
            { type: 'QUICK_LINKS', icon: '🏷️', label: 'Liens Rapides et Bannières', mode: 'multi' },
            { type: 'CATEGORIES', icon: '', label: 'Catégories', mode: 'multi' },
            { type: 'PRODUCT_GRID', icon: '🛒', label: 'Grille de Produits', mode: 'multi' },
            { type: 'TABBED_PRODUCT_GRID', icon: '📑', label: 'Grille avec Onglets', mode: 'multi' },
        ]
    },
    {
        zone: 'Contenu',
        items: [
            { type: 'BLOG_POSTS', icon: '📖', label: 'Articles de Blog', mode: 'multi' },
            { type: 'TESTIMONIALS', icon: '💬', label: 'Témoignages', mode: 'multi' },
            { type: 'NEWSLETTER', icon: '✉️', label: 'Newsletter', mode: 'multi' },
            { type: 'CTA_VENDOR', icon: '🏪', label: 'CTA Vendeur', mode: 'multi' },
        ]
    },
    {
        zone: 'Pied de page',
        items: [
            { type: 'FOOTER_CONF', icon: '🦶', label: 'Pied de page global', mode: 'singleton' },
            { type: 'FEATURES', icon: '✅', label: 'Barre d\'avantages', mode: 'multi' },
        ]
    },
    {
        zone: 'Avancé',
        items: [
            { type: 'CUSTOM', icon: '🛠️', label: 'Code HTML personnalisé', mode: 'multi' },
        ]
    },
];

export const Sidebar = ({ sections, onRefetch, onCreate, onDelete, onMove, onToggle, onMoveGroup }: SidebarProps) => {
    const { selectedSection, setSelectedSection, setMode } = useEditor();
    // Track which "multi" groups have their dropdown expanded
    const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
    // Track sidebar collapse state
    const [isCollapsed, setIsCollapsed] = useState(false);

    const sortedSections = [...sections].sort((a, b) => a.order - b.order);

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
        const globalIndex = sortedSections.findIndex(sec => sec.id === s.id);
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
                        disabled={globalIndex === 0}
                        onClick={(e) => { e.stopPropagation(); onMove(s.id, s.order, 'up'); }}
                        style={{ background: 'none', border: 'none', cursor: globalIndex === 0 ? 'default' : 'pointer', opacity: globalIndex === 0 ? 0.3 : 1, fontSize: '0.6rem', color: 'var(--builder-text-muted)', padding: '0 2px', lineHeight: 1 }}
                    >▲</button>
                    <button
                        disabled={globalIndex === sortedSections.length - 1}
                        onClick={(e) => { e.stopPropagation(); onMove(s.id, s.order, 'down'); }}
                        style={{ background: 'none', border: 'none', cursor: globalIndex === sortedSections.length - 1 ? 'default' : 'pointer', opacity: globalIndex === sortedSections.length - 1 ? 0.3 : 1, fontSize: '0.6rem', color: 'var(--builder-text-muted)', padding: '0 2px', lineHeight: 1 }}
                    >▼</button>
                </div>
                <div style={{ flex: 1, overflow: 'hidden' }}>
                    <div style={{
                        fontWeight: 600,
                        whiteSpace: 'nowrap',
                        textOverflow: 'ellipsis',
                        overflow: 'hidden',
                    }}>
                        {s.title || s.type}
                    </div>
                    <div style={{ fontSize: '0.6rem', color: s.isActive ? 'var(--builder-success)' : 'var(--builder-text-soft)', fontWeight: 600 }}>
                        {s.isActive ? '● Actif' : '○ Inactif'}
                    </div>
                </div>
                {/* Activation Toggle */}
                <button 
                    onClick={(e) => { e.stopPropagation(); onToggle(s.id, !s.isActive); }} 
                    title={s.isActive ? "Désactiver" : "Activer"}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', display: 'flex', color: s.isActive ? 'var(--builder-primary)' : '#94a3b8' }}
                >
                    {s.isActive ? '👁️' : '🕶️'}
                </button>
                {isSelected && <span style={{ color: 'var(--builder-primary)', fontSize: '0.65rem' }}>→</span>}
                <button
                    onClick={(e) => { e.stopPropagation(); onDelete(s.id); }}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', fontSize: '0.7rem', padding: '2px', marginLeft: 'auto' }}
                    title="Supprimer la section"
                >✕</button>
            </div>
        );
    };

    return (
        <aside className="builder-sidebar" style={{ display: 'flex', flexDirection: 'column', width: isCollapsed ? '40px' : 'auto', transition: 'width 0.3s ease' }}>
            {/* Header */}
            <div style={{
                padding: isCollapsed ? '12px 8px' : '12px 14px',
                borderBottom: '1px solid var(--builder-border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: isCollapsed ? 'center' : 'space-between'
            }}>
                {!isCollapsed && (
                    <div style={{ fontWeight: 700, fontSize: '0.7rem', color: 'var(--builder-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Composants ({sections.length})
                    </div>
                )}
                <button
                    onClick={() => setIsCollapsed(!isCollapsed)}
                    style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        padding: '4px',
                        fontSize: '1.2rem',
                        color: 'var(--builder-text-muted)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}
                    title={isCollapsed ? 'Développer' : 'Réduire'}
                >
                    {isCollapsed ? '☰' : '✕'}
                </button>
            </div>

            {/* Component List */}
            {!isCollapsed && (
                <div style={{ flex: 1, overflowY: 'auto', padding: '10px' }}>
                <div className="stack-lg">
                    {ZONE_MAP.map((zone) => (
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
                                                {/* Group Move Arrows - only for Body/Content zones with sections (NOT Impact/Hero) */}
                                                {canMoveGroup && (zone.zone === 'Body' || zone.zone === 'Content') && (
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1px', marginRight: '4px' }} onClick={(e) => e.stopPropagation()}>
                                                        <button
                                                            onClick={() => onMoveGroup(item.type, 'up')}
                                                            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.55rem', color: 'var(--builder-text-muted)', padding: '0 2px', lineHeight: 1 }}
                                                            title="Déplacer tout le groupe vers le haut"
                                                        >▲</button>
                                                        <button
                                                            onClick={() => onMoveGroup(item.type, 'down')}
                                                            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.55rem', color: 'var(--builder-text-muted)', padding: '0 2px', lineHeight: 1 }}
                                                            title="Déplacer tout le groupe vers le bas"
                                                        >▼</button>
                                                    </div>
                                                )}
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
            </div>
            )}
        </aside>
    );
};
