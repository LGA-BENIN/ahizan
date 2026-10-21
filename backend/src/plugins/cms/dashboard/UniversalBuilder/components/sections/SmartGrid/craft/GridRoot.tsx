import React, { createContext, useState, useEffect, useRef } from 'react';
import { useNode, useEditor } from '@craftjs/core';
import { MediaUploadField } from '../../MediaUploadField';
import { fetchGraphQL } from '../../../../../lib/utils';
import { GridItem } from './GridItem';

export const GridGlobalContext = createContext<any>({});

const FETCH_COLLECTIONS = `query { cmsCollectionsTree { id name slug featuredAsset { id preview } children { id name slug featuredAsset { id preview } } } }`;

const CatalogSearchField = ({ onSelect }: { onSelect: (data: { title: string, url: string, image: string }) => void }) => {
    const [type, setType] = useState<'product' | 'collection'>('product');
    const [term, setTerm] = useState('');
    const [results, setResults] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);
    const [allCollections, setAllCollections] = useState<any[]>([]);

    useEffect(() => {
        fetchGraphQL(FETCH_COLLECTIONS).then(data => {
            const tree = data?.cmsCollectionsTree || [];
            const flat: any[] = [];
            const flatten = (nodes: any[]) => {
                for (const node of nodes) {
                    flat.push(node);
                    if (node.children && node.children.length > 0) flatten(node.children);
                }
            };
            flatten(tree);
            setAllCollections(flat);
        }).catch(err => console.error("Error fetching collections", err));
    }, []);

    useEffect(() => {
        const handleClickOutside = (event: any) => {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        if (!term.trim() || term.length < 2) {
            setResults([]);
            return;
        }

        const timer = setTimeout(async () => {
            setLoading(true);
            try {
                if (type === 'product') {
                    const origin = window.location.origin.includes(':5173') || window.location.origin.includes(':5174') || window.location.origin.includes(':4200')
                        ? window.location.origin.replace(/:(5173|5174|4200)/, ':3000')
                        : window.location.origin;
                    const resProducts = await fetch(`${origin}/shop-api`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            query: `query GetProducts($term: String!) {
                                products(options: { filter: { name: { contains: $term } }, take: 15 }) {
                                    items { id name slug featuredAsset { preview } }
                                }
                            }`,
                            variables: { term }
                        })
                    });
                    const prodResult = await resProducts.json();
                    const items = prodResult.data?.products?.items || [];
                    setResults(items.map((i: any) => ({
                        id: i.id,
                        name: i.name,
                        slug: i.slug,
                        preview: i.featuredAsset?.preview
                    })));
                } else {
                    const filtered = allCollections.filter(c => c.name.toLowerCase().includes(term.toLowerCase())).slice(0, 10);
                    setResults(filtered.map((c: any) => ({
                        id: c.id,
                        name: c.name,
                        slug: c.slug,
                        preview: c.featuredAsset?.preview
                    })));
                }
                setIsOpen(true);
            } catch (e) {
                console.error("Search error:", e);
            }
            setLoading(false);
        }, 400);

        return () => clearTimeout(timer);
    }, [term, type, allCollections]);

    return (
        <div ref={wrapperRef} style={{ position: 'relative', marginTop: '8px' }}>
            <label className="label-pro">Ajout rapide via catalogue</label>
            <div style={{ display: 'flex', gap: '6px', marginBottom: '6px' }}>
                <select 
                    className="input-pro" 
                    style={{ width: '100px', fontSize: '11px' }} 
                    value={type} 
                    onChange={e => { setType(e.target.value as any); setTerm(''); setResults([]); }}
                >
                    <option value="product">Produit</option>
                    <option value="collection">Rayon</option>
                </select>
                <input 
                    type="text" 
                    className="input-pro" 
                    style={{ flex: 1, minWidth: 0, fontSize: '12px' }} 
                    placeholder="Tapez un nom..." 
                    value={term}
                    onChange={e => { setTerm(e.target.value); setIsOpen(true); }}
                    onFocus={() => { if (results.length > 0) setIsOpen(true); }}
                />
            </div>
            {loading && <div style={{ fontSize: '11px', color: '#64748b', textAlign: 'center' }}>Recherche en cours...</div>}
            
            {isOpen && results.length > 0 && (
                <div style={{
                    position: 'absolute', top: '100%', left: 0, right: 0, 
                    backgroundColor: '#fff', border: '1px solid #e2e8f0', 
                    borderRadius: '6px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)',
                    maxHeight: '200px', overflowY: 'auto', zIndex: 100
                }}>
                    {results.map(item => (
                        <div 
                            key={item.id}
                            style={{ padding: '6px 10px', borderBottom: '1px solid #f1f5f9', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
                            onClick={() => {
                                onSelect({
                                    title: item.name,
                                    url: `/${type}/${item.slug}`,
                                    image: item.preview || ''
                                });
                                setIsOpen(false);
                                setTerm('');
                            }}
                            onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f8fafc'}
                            onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                        >
                            {item.preview ? (
                                <img src={item.preview} style={{ width: '28px', height: '28px', objectFit: 'cover', borderRadius: '4px', flexShrink: 0 }} alt="" />
                            ) : (
                                <div style={{ width: '28px', height: '28px', backgroundColor: '#f1f5f9', borderRadius: '4px', flexShrink: 0 }} />
                            )}
                            <div style={{ fontSize: '12px', color: '#0f172a', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {item.name}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export interface GridRootProps {
    columnsDesktop: number;
    columnsTablet: number;
    columnsMobile: number;
    gapX: number;
    gapY: number;
    paddingTop: number;
    paddingBottom: number;
    paddingLeft: number;
    paddingRight: number;
    bgColor: string;
    bgImage: string;
    bgGradient?: string;
    sectionAnimation: 'none' | 'fade-in' | 'fade-up' | 'zoom-in';
    contentLayout: 'image-above-text' | 'image-below-text' | 'image-left-text-right' | 'text-left-image-right' | 'image-overlay' | 'image-on-shape';
    globalInsideTextPosition?: 'center' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'top-center' | 'bottom-center' | 'middle-left' | 'middle-right';
    gridAlignment: 'left' | 'center' | 'right';
    
    globalTitle: string;
    globalTitleSize: string;
    globalTitleColor: string;
    sectionHeaderAlign?: 'left' | 'center' | 'right' | 'between';
    sectionHeaderCtaEnabled?: boolean;
    sectionHeaderCtaText?: string;
    sectionHeaderCtaUrl?: string;
    sectionHeaderCtaStyle?: 'solid' | 'outline' | 'link';

    scrollMode: 'grid' | 'carousel';
    carouselArrows: 'none' | 'simple' | 'circle' | 'square';
    
    autoplay: boolean;
    autoplaySpeed: number;
    autoplayDirection: 'left' | 'right';
    
    globalShape: 'circle' | 'square' | 'rounded-square' | 'rectangle' | 'rounded-rectangle' | 'custom';
    globalImageBorderRadius?: string;
    globalImageWidth: string;
    globalImageHeight: string;
    globalImageFitMode?: 'fit' | 'manual';
    globalImageFit?: 'contain' | 'cover' | 'fill';
    globalImagePosX?: number;
    globalImagePosY?: number;
    globalAnimEntrance: 'none' | 'fade-in' | 'fade-up' | 'zoom-in';
    globalAnimHover: 'none' | 'scale' | 'lift' | 'glow';
    
    globalItemAlignment: 'left' | 'center' | 'right';
    globalItemTitleSize: string;
    globalItemTitleWeight: string;
    globalItemTitleColor?: string;
    globalItemTitleTransform?: 'none' | 'uppercase' | 'capitalize' | 'lowercase';
    globalItemDescSize: string;
    globalItemDescWeight: string;
    globalItemDescColor?: string;
    globalItemDescLines?: number;
    globalTextPadding?: number;
    globalTextGap?: number;

    globalCardBorderWidth?: number;
    globalCardBorderColor?: string;
    globalCardBorderRadius?: string;
    globalCardBgColor?: string;
    globalCardHoverBgColor?: string;

    globalShowCta?: boolean;
    globalCtaText?: string;
    globalCtaStyle?: 'solid' | 'outline' | 'link';

    children?: React.ReactNode;
}

export const GridRoot = ({
    columnsDesktop = 4,
    columnsTablet = 2,
    columnsMobile = 1,
    gapX = 16,
    gapY = 16,
    paddingTop = 0,
    paddingBottom = 0,
    paddingLeft = 0,
    paddingRight = 0,
    bgColor = 'transparent',
    bgImage = '',
    bgGradient = '',
    sectionAnimation = 'none',
    contentLayout = 'image-above-text',
    globalInsideTextPosition = 'center',
    gridAlignment = 'center',
    globalTitle = '',
    globalTitleSize = '24px',
    globalTitleColor = '#0f172a',
    sectionHeaderAlign = 'center',
    sectionHeaderCtaEnabled = false,
    sectionHeaderCtaText = 'Voir Tout',
    sectionHeaderCtaUrl = '#',
    sectionHeaderCtaStyle = 'solid',
    scrollMode = 'grid',
    carouselArrows = 'circle',
    autoplay = false,
    autoplaySpeed = 3000,
    autoplayDirection = 'right',
    globalShape = 'circle',
    globalImageBorderRadius = '',
    globalImageWidth = '120px',
    globalImageHeight = '120px',
    globalImageFitMode = 'fit',
    globalImageFit = 'contain',
    globalImagePosX = 0,
    globalImagePosY = 0,
    globalAnimEntrance = 'none',
    globalAnimHover = 'scale',
    globalItemAlignment = 'center',
    globalItemTitleSize = '16px',
    globalItemTitleWeight = 'bold',
    globalItemTitleColor = '#0f172a',
    globalItemTitleTransform = 'none',
    globalItemDescSize = '14px',
    globalItemDescWeight = 'normal',
    globalItemDescColor = '#64748b',
    globalItemDescLines = 2,
    globalTextPadding = 16,
    globalTextGap = 6,
    globalCardBorderWidth = 0,
    globalCardBorderColor = 'transparent',
    globalCardBorderRadius = '12px',
    globalCardBgColor = 'transparent',
    globalCardHoverBgColor = 'transparent',
    globalShowCta = false,
    globalCtaText = 'Découvrir',
    globalCtaStyle = 'solid',
    children
}: GridRootProps) => {
    const { connectors: { connect, drag } } = useNode();
    const isCarousel = scrollMode === 'carousel';

    const getAlignment = () => {
        switch (gridAlignment) {
            case 'left': return 'start';
            case 'right': return 'end';
            case 'center':
            default: return 'center';
        }
    };

    const headerAlign = sectionHeaderAlign || 'center';
    let headerFlexAlign = 'center';
    let headerJustify = 'center';
    let headerTextAlign = 'center';

    if (headerAlign === 'left') {
        headerFlexAlign = 'flex-start';
        headerJustify = 'flex-start';
        headerTextAlign = 'left';
    } else if (headerAlign === 'right') {
        headerFlexAlign = 'flex-end';
        headerJustify = 'flex-end';
        headerTextAlign = 'right';
    } else if (headerAlign === 'between') {
        headerFlexAlign = 'center';
        headerJustify = 'space-between';
        headerTextAlign = 'left';
    }

    const contextValue = {
        columnsDesktop,
        columnsTablet,
        columnsMobile,
        gapX,
        gapY,
        contentLayout,
        globalInsideTextPosition,
        globalShape,
        globalImageBorderRadius,
        globalImageWidth,
        globalImageHeight,
        globalImageFitMode,
        globalImageFit,
        globalImagePosX,
        globalImagePosY,
        globalAnimEntrance,
        globalAnimHover,
        globalItemAlignment,
        globalItemTitleSize,
        globalItemTitleWeight,
        globalItemTitleColor,
        globalItemTitleTransform,
        globalItemDescSize,
        globalItemDescWeight,
        globalItemDescColor,
        globalItemDescLines,
        globalTextPadding,
        globalTextGap,
        globalCardBorderWidth,
        globalCardBorderColor,
        globalCardBorderRadius,
        globalCardBgColor,
        globalCardHoverBgColor,
        globalShowCta,
        globalCtaText,
        globalCtaStyle,
        isCarousel
    };

    return (
        <GridGlobalContext.Provider value={contextValue}>
            <div
                ref={(ref: any) => connect(drag(ref))}
                style={{
                    paddingTop: `${paddingTop}px`,
                    paddingBottom: `${paddingBottom}px`,
                    paddingLeft: `${paddingLeft}px`,
                    paddingRight: `${paddingRight}px`,
                    backgroundColor: bgColor,
                    backgroundImage: bgGradient || (bgImage ? `url(${bgImage})` : undefined),
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    width: '100%',
                    boxSizing: 'border-box',
                    minHeight: '160px',
                    position: 'relative'
                }}
            >
                {(globalTitle || sectionHeaderCtaEnabled) && (
                    <div style={{
                        display: 'flex',
                        flexDirection: headerAlign === 'between' ? 'row' : 'column',
                        alignItems: headerFlexAlign as any,
                        justifyContent: headerJustify as any,
                        textAlign: headerTextAlign as any,
                        gap: '12px',
                        marginBottom: '20px',
                        width: '100%'
                    }}>
                        {globalTitle && (
                            <h2 style={{ 
                                fontSize: globalTitleSize, 
                                color: globalTitleColor, 
                                margin: 0,
                                fontWeight: 'bold'
                            }}>
                                {globalTitle}
                            </h2>
                        )}

                        {sectionHeaderCtaEnabled && (
                            <div>
                                {sectionHeaderCtaStyle === 'solid' && (
                                    <span style={{
                                        display: 'inline-block',
                                        padding: '6px 14px',
                                        backgroundColor: '#2563eb',
                                        color: '#ffffff',
                                        fontSize: '12px',
                                        fontWeight: 'bold',
                                        borderRadius: '6px',
                                    }}>
                                        {sectionHeaderCtaText}
                                    </span>
                                )}
                                {sectionHeaderCtaStyle === 'outline' && (
                                    <span style={{
                                        display: 'inline-block',
                                        padding: '5px 13px',
                                        border: '1.5px solid #2563eb',
                                        color: '#2563eb',
                                        fontSize: '12px',
                                        fontWeight: 'bold',
                                        borderRadius: '6px',
                                    }}>
                                        {sectionHeaderCtaText}
                                    </span>
                                )}
                                {sectionHeaderCtaStyle === 'link' && (
                                    <span style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '4px',
                                        color: '#2563eb',
                                        fontSize: '12px',
                                        fontWeight: 'bold',
                                    }}>
                                        {sectionHeaderCtaText} ➔
                                    </span>
                                )}
                            </div>
                        )}
                    </div>
                )}

                <div style={{ position: 'relative' }}>
                    {isCarousel && carouselArrows !== 'none' && (
                        <div style={{
                            position: 'absolute', top: '50%', left: '-12px', right: '-12px', 
                            display: 'flex', justifyContent: 'space-between', transform: 'translateY(-50%)',
                            pointerEvents: 'none', zIndex: 10
                        }}>
                            <div style={{
                                width: '32px', height: '32px',
                                borderRadius: carouselArrows === 'circle' ? '50%' : '4px',
                                background: '#fff',
                                boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                color: '#334155', fontWeight: 'bold', fontSize: '12px'
                            }}>❮</div>
                            <div style={{
                                width: '32px', height: '32px',
                                borderRadius: carouselArrows === 'circle' ? '50%' : '4px',
                                background: '#fff',
                                boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                color: '#334155', fontWeight: 'bold', fontSize: '12px'
                            }}>❯</div>
                        </div>
                    )}

                    <div
                        style={{
                            display: isCarousel ? 'flex' : 'grid',
                            overflowX: isCarousel ? 'auto' : 'visible',
                            gap: `${gapY}px ${gapX}px`,
                            gridTemplateColumns: isCarousel ? undefined : `repeat(${columnsDesktop}, minmax(0, 1fr))`,
                            gridAutoRows: isCarousel ? undefined : 'minmax(min-content, max-content)',
                            justifyItems: isCarousel ? undefined : getAlignment(),
                            width: '100%',
                            boxSizing: 'border-box'
                        }}
                    >
                        {children}
                    </div>
                </div>
            </div>
        </GridGlobalContext.Provider>
    );
};

const ColorField = ({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) => (
    <div>
        <label className="label-pro">{label}</label>
        <div className="color-row" style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
            <input type="color" className="color-swatch" value={value || '#000000'} onChange={(e) => onChange(e.target.value)} style={{ width: '28px', height: '28px', padding: '0', border: '1px solid #cbd5e1', borderRadius: '4px', cursor: 'pointer' }} />
            <input className="input-pro" value={value || ''} onChange={(e) => onChange(e.target.value)} style={{ flex: 1, fontSize: '11px' }} />
        </div>
    </div>
);

const AccordionSection = ({ 
    title, 
    icon, 
    children, 
    isOpen, 
    onToggle 
}: { 
    title: string; 
    icon: string; 
    children: React.ReactNode; 
    isOpen?: boolean; 
    onToggle?: () => void; 
}) => {
    const [localOpen, setLocalOpen] = useState(true);
    const open = isOpen !== undefined ? isOpen : localOpen;
    const toggle = onToggle ? onToggle : () => setLocalOpen(!localOpen);

    return (
        <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', marginBottom: '8px', overflow: 'hidden', background: '#ffffff', boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}>
            <button
                type="button"
                onClick={toggle}
                style={{
                    width: '100%',
                    padding: '10px 14px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    background: open ? '#f8fafc' : '#ffffff',
                    border: 'none',
                    borderBottom: open ? '1px solid #e2e8f0' : 'none',
                    cursor: 'pointer',
                    fontSize: '12px',
                    fontWeight: 700,
                    color: '#0f172a',
                    textAlign: 'left'
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '14px' }}>{icon}</span>
                    <span>{title}</span>
                </div>
                <span style={{ fontSize: '11px', color: '#64748b', transform: open ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>▼</span>
            </button>
            {open && (
                <div style={{ padding: '14px', background: '#ffffff' }}>
                    {children}
                </div>
            )}
        </div>
    );
};

export const GridRootSettings = () => {
    const { id } = useNode();
    const { actions, query } = useEditor();
    const { setProp, props } = useNode((node) => ({
        props: node.data.props as GridRootProps
    }));

    // Accordion multi-open state
    const [openSections, setOpenSections] = useState<{ [key: string]: boolean }>({
        'grid-format': true,
        'layout': true,
        'section-appearance': true,
        'section-header': false,
        'card-management': true,
    });

    const toggleSection = (sectionId: string) => {
        setOpenSections(prev => ({ ...prev, [sectionId]: !prev[sectionId] }));
    };

    const addManualCard = () => {
        const nodeTree = query.parseReactElement(
            <GridItem 
                titleText="Nouvelle Carte"
                linkUrl="/"
                imageUrl=""
                bgColor="transparent"
                descText=""
                borderWidth={0}
                borderColor="transparent"
                overlayEnabled={false}
                overlayColor="#000000"
                overlayOpacity={0.4}
                titleColor="#0f172a"
                descColor="#64748b"
                hoverBgColor="transparent"
                linkNewTab={false}
            />
        ).toNodeTree();
        actions.addNodeTree(nodeTree, id);
    };

    const addEntityCard = (data: { title: string, url: string, image: string }) => {
        const nodeTree = query.parseReactElement(
            <GridItem 
                titleText={data.title}
                linkUrl={data.url}
                imageUrl={data.image}
                bgColor="transparent"
                descText=""
                borderWidth={0}
                borderColor="transparent"
                overlayEnabled={false}
                overlayColor="#000000"
                overlayOpacity={0.4}
                titleColor="#0f172a"
                descColor="#64748b"
                hoverBgColor="transparent"
                linkNewTab={false}
            />
        ).toNodeTree();
        actions.addNodeTree(nodeTree, id);
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', paddingBottom: '30px' }}>
            
            {/* 1. STRUCTURE & COLONNES */}
            <AccordionSection 
                title="Structure Grille & Carrousel" 
                icon="📐" 
                isOpen={openSections['grid-format']}
                onToggle={() => toggleSection('grid-format')}
            >
                <div className="grid-2" style={{ marginBottom: '10px' }}>
                    <div>
                        <label className="label-pro">Mode d'affichage</label>
                        <select className="input-pro" value={props.scrollMode} onChange={(e) => setProp((p: any) => p.scrollMode = e.target.value)}>
                            <option value="grid">Grille Standard</option>
                            <option value="carousel">Carrousel Horizontal</option>
                        </select>
                    </div>
                    <div>
                        <label className="label-pro">Colonnes Desktop</label>
                        <input className="input-pro" type="number" min={1} max={12} value={props.columnsDesktop} onChange={(e) => setProp((p: any) => p.columnsDesktop = parseInt(e.target.value) || 1)} />
                    </div>
                </div>

                <div className="grid-2" style={{ marginBottom: '10px' }}>
                    <div>
                        <label className="label-pro">Colonnes Tablette</label>
                        <input className="input-pro" type="number" min={1} max={6} value={props.columnsTablet || 2} onChange={(e) => setProp((p: any) => p.columnsTablet = parseInt(e.target.value) || 2)} />
                    </div>
                    <div>
                        <label className="label-pro">Colonnes Mobile</label>
                        <select 
                            className="input-pro" 
                            value={props.columnsMobile || 'auto'} 
                            onChange={(e) => setProp((p: any) => p.columnsMobile = e.target.value === 'auto' ? 'auto' : (parseFloat(e.target.value) || 'auto'))}
                        >
                            <option value="auto">✨ Automatique (recommandé)</option>
                            <option value="1.4">1 et demi (1.4 - 1.5 cartes)</option>
                            <option value="2.4">2 et demi (2.4 - 2.5 cartes)</option>
                            <option value="3.5">3 et demi (3.5 - Catégories)</option>
                            <option value="1">1 colonne fixe</option>
                            <option value="2">2 colonnes fixes</option>
                            <option value="3">3 colonnes fixes</option>
                            <option value="4">4 colonnes fixes</option>
                        </select>
                    </div>
                </div>

                <div className="grid-2">
                    <div>
                        <label className="label-pro">Espacement X (px)</label>
                        <input className="input-pro" type="number" min={0} value={props.gapX} onChange={(e) => setProp((p: any) => p.gapX = parseInt(e.target.value) || 0)} />
                    </div>
                    <div>
                        <label className="label-pro">Espacement Y (px)</label>
                        <input className="input-pro" type="number" min={0} value={props.gapY} onChange={(e) => setProp((p: any) => p.gapY = parseInt(e.target.value) || 0)} />
                    </div>
                </div>

                {props.scrollMode === 'carousel' && (
                    <div style={{ marginTop: '10px', padding: '10px', background: '#eff6ff', borderRadius: '6px', border: '1px solid #bfdbfe' }}>
                        <div className="grid-2" style={{ marginBottom: '6px' }}>
                            <div>
                                <label className="label-pro">Style des flèches</label>
                                <select className="input-pro" value={props.carouselArrows} onChange={(e) => setProp((p: any) => p.carouselArrows = e.target.value)}>
                                    <option value="none">Aucune (Tactile)</option>
                                    <option value="circle">Boutons ronds</option>
                                    <option value="square">Boutons carrés</option>
                                    <option value="simple">Flèches simples</option>
                                </select>
                            </div>
                            <div>
                                <label style={{ fontSize: '11px', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 'bold', marginTop: '20px' }}>
                                    <input type="checkbox" checked={props.autoplay || false} onChange={(e) => setProp((p: any) => p.autoplay = e.target.checked)} />
                                    Autoplay Défilement
                                </label>
                            </div>
                        </div>

                        {props.autoplay && (
                            <div className="grid-2" style={{ marginTop: '8px' }}>
                                <div>
                                    <label className="label-pro">Vitesse (ms)</label>
                                    <input className="input-pro" type="number" min={500} step={500} value={props.autoplaySpeed || 3000} onChange={(e) => setProp((p: any) => p.autoplaySpeed = parseInt(e.target.value) || 3000)} />
                                </div>
                                <div>
                                    <label className="label-pro">Sens de défilement</label>
                                    <select className="input-pro" value={props.autoplayDirection || 'right'} onChange={(e) => setProp((p: any) => p.autoplayDirection = e.target.value)}>
                                        <option value="right">Vers la droite ➔</option>
                                        <option value="left">Vers la gauche ↵</option>
                                    </select>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </AccordionSection>

            {/* 2. DISPOSITION & FORMES */}
            <AccordionSection 
                title="Disposition & Forme des Cartes" 
                icon="🖼️" 
                isOpen={openSections['layout']}
                onToggle={() => toggleSection('layout')}
            >
                <div style={{ marginBottom: '10px' }}>
                    <label className="label-pro">Disposition globale Image / Texte</label>
                    <select
                        className="input-pro"
                        value={props.contentLayout}
                        onChange={(e) => setProp((p: any) => p.contentLayout = e.target.value)}
                    >
                        <option value="image-above-text">⬆️ Image au-dessus (Texte en-dessous)</option>
                        <option value="image-below-text">⬇️ Image en-dessous (Texte au-dessus)</option>
                        <option value="image-left-text-right">⬅️ Image à gauche (Texte à droite)</option>
                        <option value="text-left-image-right">➡️ Image à droite (Texte à gauche)</option>
                        <option value="image-overlay">🖼️ Texte DANS l'image (Superposition)</option>
                        <option value="image-on-shape">🎨 Image sur Forme (Effet 3D)</option>
                    </select>
                </div>

                {props.contentLayout === 'image-overlay' && (
                    <div style={{ marginBottom: '12px', background: '#f8fafc', padding: '10px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                        <label className="label-pro">📍 Position par défaut du texte dans l'image</label>
                        <select
                            className="input-pro"
                            value={props.globalInsideTextPosition || 'center'}
                            onChange={(e) => setProp((p: any) => p.globalInsideTextPosition = e.target.value)}
                        >
                            <option value="center">Centre</option>
                            <option value="top-left">Haut Gauche</option>
                            <option value="top-center">Haut Centre</option>
                            <option value="top-right">Haut Droite</option>
                            <option value="middle-left">Milieu Gauche</option>
                            <option value="middle-right">Milieu Droite</option>
                            <option value="bottom-left">Bas Gauche</option>
                            <option value="bottom-center">Bas Centre</option>
                            <option value="bottom-right">Bas Droite</option>
                        </select>
                    </div>
                )}

                <div className="grid-2" style={{ marginBottom: '10px' }}>
                    <div>
                        <label className="label-pro">Forme des images</label>
                        <select className="input-pro" value={props.globalShape} onChange={(e) => setProp((p: any) => p.globalShape = e.target.value)}>
                            <option value="circle">⭕ Cercle</option>
                            <option value="rounded-square">⏹️ Carré Arrondi</option>
                            <option value="square">🔲 Carré Droit</option>
                            <option value="rectangle">▭ Rectangle (16:9)</option>
                            <option value="rounded-rectangle">📱 Rectangle Arrondi</option>
                            <option value="custom">⚙️ Personnalisé</option>
                        </select>
                    </div>
                    <div>
                        <label className="label-pro">Arrondi personnalisé (ex: 16px)</label>
                        <input 
                            className="input-pro" 
                            type="text" 
                            placeholder="ex: 16px" 
                            value={props.globalImageBorderRadius || ''} 
                            onChange={(e) => setProp((p: any) => p.globalImageBorderRadius = e.target.value)} 
                        />
                    </div>
                </div>

                <div className="grid-2" style={{ marginBottom: '10px' }}>
                    <div>
                        <label className="label-pro">Mode Ajustement</label>
                        <select
                            className="input-pro"
                            value={props.globalImageFitMode || 'fit'}
                            onChange={(e) => setProp((p: any) => p.globalImageFitMode = e.target.value as any)}
                        >
                            <option value="fit">📐 Ajuster dans le cadre (Box)</option>
                            <option value="manual">📏 Dimensions Manuelles (px / %)</option>
                        </select>
                    </div>
                    <div>
                        <label className="label-pro">Cadrage global (Fit)</label>
                        <select
                            className="input-pro"
                            value={props.globalImageFit || 'contain'}
                            onChange={(e) => setProp((p: any) => p.globalImageFit = e.target.value as any)}
                        >
                            <option value="contain">Contain (Complet)</option>
                            <option value="cover">Cover (Plein cadre)</option>
                            <option value="fill">Fill (Étirer)</option>
                        </select>
                    </div>
                </div>

                {props.globalImageFitMode === 'manual' && (
                    <div className="grid-2" style={{ marginBottom: '10px' }}>
                        <div>
                            <label className="label-pro">Largeur Forcée (ex: 120px)</label>
                            <input className="input-pro" type="text" placeholder="120px" value={props.globalImageWidth} onChange={(e) => setProp((p: any) => p.globalImageWidth = e.target.value)} />
                        </div>
                        <div>
                            <label className="label-pro">Hauteur Forcée (ex: 120px)</label>
                            <input className="input-pro" type="text" placeholder="120px" value={props.globalImageHeight} onChange={(e) => setProp((p: any) => p.globalImageHeight = e.target.value)} />
                        </div>
                    </div>
                )}

                <div className="grid-2">
                    <div>
                        <label className="label-pro">Alignement Texte</label>
                        <select className="input-pro" value={props.globalItemAlignment} onChange={(e) => setProp((p: any) => p.globalItemAlignment = e.target.value)}>
                            <option value="center">Centré</option>
                            <option value="left">À Gauche</option>
                            <option value="right">À Droite</option>
                        </select>
                    </div>
                    <div>
                        <label className="label-pro">Survol (Hover)</label>
                        <select className="input-pro" value={props.globalAnimHover} onChange={(e) => setProp((p: any) => p.globalAnimHover = e.target.value)}>
                            <option value="scale">Zoom (Scale)</option>
                            <option value="lift">Élévation (Lift)</option>
                            <option value="glow">Lueur (Glow)</option>
                            <option value="none">Aucune</option>
                        </select>
                    </div>
                </div>
            </AccordionSection>

            {/* 3. STYLE & FOND DE LA SECTION */}
            <AccordionSection 
                title="Style & Fond de la Section" 
                icon="🎨" 
                isOpen={openSections['section-appearance']}
                onToggle={() => toggleSection('section-appearance')}
            >
                <div className="grid-2" style={{ marginBottom: '10px' }}>
                    <ColorField label="Fond Section" value={props.bgColor} onChange={(v) => setProp((p: any) => p.bgColor = v)} />
                    <ColorField label="Fond Cartes" value={props.globalCardBgColor || 'transparent'} onChange={(v) => setProp((p: any) => p.globalCardBgColor = v)} />
                </div>

                <div className="grid-2" style={{ marginBottom: '10px' }}>
                    <div>
                        <label className="label-pro">Bordure Cartes (px)</label>
                        <input className="input-pro" type="number" min={0} value={props.globalCardBorderWidth || 0} onChange={(e) => setProp((p: any) => p.globalCardBorderWidth = parseInt(e.target.value) || 0)} />
                    </div>
                    <ColorField label="Couleur Bordure" value={props.globalCardBorderColor || '#e2e8f0'} onChange={(v) => setProp((p: any) => p.globalCardBorderColor = v)} />
                </div>

                <div style={{ marginBottom: '10px' }}>
                    <label className="label-pro">Arrondi des Cartes (Border Radius)</label>
                    <input className="input-pro" type="text" placeholder="12px" value={props.globalCardBorderRadius || '12px'} onChange={(e) => setProp((p: any) => p.globalCardBorderRadius = e.target.value)} />
                </div>

                <div className="grid-2">
                    <div>
                        <label className="label-pro">Padding Haut (px)</label>
                        <input className="input-pro" type="number" min={0} value={props.paddingTop} onChange={(e) => setProp((p: any) => p.paddingTop = parseInt(e.target.value) || 0)} />
                    </div>
                    <div>
                        <label className="label-pro">Padding Bas (px)</label>
                        <input className="input-pro" type="number" min={0} value={props.paddingBottom} onChange={(e) => setProp((p: any) => p.paddingBottom = parseInt(e.target.value) || 0)} />
                    </div>
                </div>
            </AccordionSection>

            {/* 4. EN-TÊTE & TITRE DE SECTION */}
            <AccordionSection 
                title="En-tête & Titre de Section" 
                icon="🏷️" 
                isOpen={openSections['section-header']}
                onToggle={() => toggleSection('section-header')}
            >
                <div style={{ marginBottom: '10px' }}>
                    <label className="label-pro">Titre de la section (Optionnel)</label>
                    <input className="input-pro" type="text" placeholder="ex: Nos Meilleurs Produits" value={props.globalTitle} onChange={(e) => setProp((p: any) => p.globalTitle = e.target.value)} />
                </div>

                <div className="grid-2" style={{ marginBottom: '10px' }}>
                    <ColorField label="Couleur Titre" value={props.globalTitleColor} onChange={(v) => setProp((p: any) => p.globalTitleColor = v)} />
                    <div>
                        <label className="label-pro">Alignement</label>
                        <select className="input-pro" value={props.sectionHeaderAlign || 'center'} onChange={(e) => setProp((p: any) => p.sectionHeaderAlign = e.target.value as any)}>
                            <option value="center">Centré</option>
                            <option value="left">Gauche</option>
                            <option value="between">Titre Gauche / CTA Droite</option>
                        </select>
                    </div>
                </div>

                <label style={{ fontSize: '11px', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 'bold', cursor: 'pointer' }}>
                    <input type="checkbox" checked={props.sectionHeaderCtaEnabled || false} onChange={(e) => setProp((p: any) => p.sectionHeaderCtaEnabled = e.target.checked)} />
                    Bouton "Voir Tout" en haut
                </label>

                {props.sectionHeaderCtaEnabled && (
                    <div className="grid-2" style={{ marginTop: '8px' }}>
                        <div>
                            <label className="label-pro">Texte CTA</label>
                            <input className="input-pro" type="text" value={props.sectionHeaderCtaText || 'Voir Tout'} onChange={(e) => setProp((p: any) => p.sectionHeaderCtaText = e.target.value)} />
                        </div>
                        <div>
                            <label className="label-pro">Lien URL</label>
                            <input className="input-pro" type="text" placeholder="/collection/all" value={props.sectionHeaderCtaUrl || '#'} onChange={(e) => setProp((p: any) => p.sectionHeaderCtaUrl = e.target.value)} />
                        </div>
                    </div>
                )}
            </AccordionSection>

            {/* 5. GESTION DES CARTES */}
            <AccordionSection 
                title="Ajouter des Cartes" 
                icon="📥" 
                isOpen={openSections['card-management']}
                onToggle={() => toggleSection('card-management')}
            >
                <button 
                    onClick={addManualCard}
                    style={{ 
                        width: '100%', padding: '8px 14px', background: '#2563eb', 
                        color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', 
                        fontWeight: 'bold', fontSize: '12px' 
                    }}
                >
                    ➕ Ajouter une Carte Vierge
                </button>

                <CatalogSearchField onSelect={addEntityCard} />
            </AccordionSection>

        </div>
    );
};

GridRoot.craft = {
    props: {
        columnsDesktop: 4,
        columnsTablet: 2,
        columnsMobile: 1,
        gapX: 16,
        gapY: 16,
        paddingTop: 0,
        paddingBottom: 0,
        paddingLeft: 0,
        paddingRight: 0,
        bgColor: 'transparent',
        bgImage: '',
        bgGradient: '',
        contentSource: 'manual',
        selectedCollections: [],
        sectionAnimation: 'none',
        contentLayout: 'image-above-text',
        gridAlignment: 'center',
        globalTitle: '',
        globalTitleSize: '24px',
        globalTitleColor: '#0f172a',
        sectionHeaderAlign: 'center',
        sectionHeaderCtaEnabled: false,
        sectionHeaderCtaText: 'Voir Tout',
        sectionHeaderCtaUrl: '#',
        sectionHeaderCtaStyle: 'solid',
        scrollMode: 'grid',
        carouselArrows: 'circle',
        globalShape: 'circle',
        globalImageBorderRadius: '',
        globalImageWidth: '120px',
        globalImageHeight: '120px',
        globalImageFitMode: 'fit',
        globalImageFit: 'contain',
        globalImagePosX: 0,
        globalImagePosY: 0,
        globalAnimEntrance: 'none',
        globalAnimHover: 'scale',
        globalItemAlignment: 'center',
        globalItemTitleSize: '16px',
        globalItemTitleWeight: 'bold',
        globalItemTitleColor: '#0f172a',
        globalItemTitleTransform: 'none',
        globalItemDescSize: '14px',
        globalItemDescWeight: 'normal',
        globalItemDescColor: '#64748b',
        globalItemDescLines: 2,
        globalTextPadding: 16,
        globalTextGap: 6,
        globalCardBorderWidth: 0,
        globalCardBorderColor: 'transparent',
        globalCardBorderRadius: '12px',
        globalCardBgColor: 'transparent',
        globalCardHoverBgColor: 'transparent',
        globalShowCta: false,
        globalCtaText: 'Découvrir',
        globalCtaStyle: 'solid',
        autoplay: false,
        autoplaySpeed: 3000,
        autoplayDirection: 'right',
    },
    related: {
        settings: GridRootSettings
    },
    rules: {
        canDrag: () => false,
    }
};
