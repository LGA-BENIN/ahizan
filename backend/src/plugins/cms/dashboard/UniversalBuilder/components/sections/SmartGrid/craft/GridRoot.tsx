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
        <div ref={wrapperRef} style={{ position: 'relative', marginBottom: '1rem' }}>
            <label className="label-pro">Rechercher & Ajouter un produit/collection</label>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                <select 
                    className="input-pro" 
                    style={{ width: '110px' }} 
                    value={type} 
                    onChange={e => { setType(e.target.value as any); setTerm(''); setResults([]); }}
                >
                    <option value="product">Produit</option>
                    <option value="collection">Collection</option>
                </select>
                <input 
                    type="text" 
                    className="input-pro" 
                    style={{ flex: 1, minWidth: 0 }} 
                    placeholder="Tapez un nom..." 
                    value={term}
                    onChange={e => { setTerm(e.target.value); setIsOpen(true); }}
                    onFocus={() => { if (results.length > 0) setIsOpen(true); }}
                />
            </div>
            {loading && <div style={{ fontSize: '12px', color: '#64748b', textAlign: 'center' }}>Recherche en cours...</div>}
            
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
                            style={{ padding: '8px 12px', borderBottom: '1px solid #f1f5f9', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
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
                                <img src={item.preview} style={{ width: '32px', height: '32px', objectFit: 'cover', borderRadius: '4px', flexShrink: 0 }} alt="" />
                            ) : (
                                <div style={{ width: '32px', height: '32px', backgroundColor: '#f1f5f9', borderRadius: '4px', flexShrink: 0 }} />
                            )}
                            <div style={{ fontSize: '13px', color: '#0f172a', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
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
    autoplay = false,
    autoplaySpeed = 3000,
    autoplayDirection = 'right',
    children
}: GridRootProps) => {
    const { connectors: { connect, drag } } = useNode();

    let bgStyle = bgColor;
    if (bgGradient) {
        bgStyle = bgGradient;
    } else if (bgImage) {
        bgStyle = `url(${bgImage}) center/cover no-repeat ${bgColor}`;
    }

    const getAlignment = () => {
        if (gridAlignment === 'left') return 'flex-start';
        if (gridAlignment === 'right') return 'flex-end';
        return 'center';
    };

    const isCarousel = scrollMode === 'carousel';

    const headerAlign = sectionHeaderAlign || 'center';
    let headerFlexAlign = 'center';
    let headerJustify = 'center';
    let headerTextAlign = 'center';

    if (headerAlign === 'left') { headerFlexAlign = 'flex-start'; headerJustify = 'flex-start'; headerTextAlign = 'left'; }
    if (headerAlign === 'right') { headerFlexAlign = 'flex-end'; headerJustify = 'flex-end'; headerTextAlign = 'right'; }
    if (headerAlign === 'between') { headerFlexAlign = 'center'; headerJustify = 'space-between'; headerTextAlign = 'left'; }

    return (
        <GridGlobalContext.Provider value={{
            globalShape, globalImageBorderRadius, globalImageWidth, globalImageHeight, globalImageFitMode, globalImageFit,
            globalImagePosX, globalImagePosY, globalAnimEntrance, globalAnimHover,
            globalItemAlignment, globalItemTitleSize, globalItemTitleWeight, globalItemTitleColor, globalItemTitleTransform,
            globalItemDescSize, globalItemDescWeight, globalItemDescColor, globalItemDescLines,
            globalCardBorderWidth, globalCardBorderColor, globalCardBorderRadius, globalCardBgColor, globalCardHoverBgColor,
            globalContentLayout: contentLayout,
            globalInsideTextPosition,
            globalTextPadding,
            globalTextGap,
            globalShowCta,
            globalCtaText,
            globalCtaStyle,
            isCarousel,
            columnsDesktop,
            gapX
        }}>
            <div
                ref={(ref: any) => connect(drag(ref))}
                style={{
                    background: bgStyle,
                    padding: `${paddingTop}px ${paddingRight}px ${paddingBottom}px ${paddingLeft}px`,
                    width: '100%',
                    position: 'relative',
                    boxSizing: 'border-box',
                    minHeight: '100px',
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
                        marginBottom: '24px',
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
                                        padding: '8px 18px',
                                        backgroundColor: 'var(--builder-primary, #3b82f6)',
                                        color: '#ffffff',
                                        fontSize: '13px',
                                        fontWeight: 'bold',
                                        borderRadius: '6px',
                                    }}>
                                        {sectionHeaderCtaText}
                                    </span>
                                )}
                                {sectionHeaderCtaStyle === 'outline' && (
                                    <span style={{
                                        display: 'inline-block',
                                        padding: '7px 17px',
                                        border: '1.5px solid var(--builder-primary, #3b82f6)',
                                        color: 'var(--builder-primary, #3b82f6)',
                                        fontSize: '13px',
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
                                        color: 'var(--builder-primary, #3b82f6)',
                                        fontSize: '14px',
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
                            position: 'absolute', top: '50%', left: '-16px', right: '-16px', 
                            display: 'flex', justifyContent: 'space-between', transform: 'translateY(-50%)',
                            pointerEvents: 'none', zIndex: 10
                        }}>
                            <div style={{
                                width: carouselArrows === 'circle' ? '40px' : carouselArrows === 'square' ? '40px' : 'auto',
                                height: carouselArrows === 'circle' ? '40px' : carouselArrows === 'square' ? '40px' : 'auto',
                                borderRadius: carouselArrows === 'circle' ? '50%' : '4px',
                                background: carouselArrows !== 'simple' ? '#fff' : 'transparent',
                                boxShadow: carouselArrows !== 'simple' ? '0 2px 4px rgba(0,0,0,0.1)' : 'none',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                color: '#334155', fontWeight: 'bold'
                            }}>❮</div>
                            <div style={{
                                width: carouselArrows === 'circle' ? '40px' : carouselArrows === 'square' ? '40px' : 'auto',
                                height: carouselArrows === 'circle' ? '40px' : carouselArrows === 'square' ? '40px' : 'auto',
                                borderRadius: carouselArrows === 'circle' ? '50%' : '4px',
                                background: carouselArrows !== 'simple' ? '#fff' : 'transparent',
                                boxShadow: carouselArrows !== 'simple' ? '0 2px 4px rgba(0,0,0,0.1)' : 'none',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                color: '#334155', fontWeight: 'bold'
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
        <div className="color-row" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <input type="color" className="color-swatch" value={value || '#000000'} onChange={(e) => onChange(e.target.value)} style={{ width: '32px', height: '32px', padding: '0', border: '1px solid #cbd5e1', borderRadius: '4px', cursor: 'pointer' }} />
            <input className="input-pro" value={value || ''} onChange={(e) => onChange(e.target.value)} style={{ flex: 1 }} />
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
    const [localOpen, setLocalOpen] = useState(false);
    const open = isOpen !== undefined ? isOpen : localOpen;
    const toggle = onToggle ? onToggle : () => setLocalOpen(!localOpen);

    return (
        <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', marginBottom: '10px', overflow: 'hidden', background: '#fff', boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>
            <button
                type="button"
                onClick={toggle}
                style={{
                    width: '100%',
                    padding: '12px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    background: open ? '#f8fafc' : '#fff',
                    border: 'none',
                    borderBottom: open ? '1px solid #e2e8f0' : 'none',
                    cursor: 'pointer',
                    fontSize: '13px',
                    fontWeight: 700,
                    color: '#0f172a',
                    textAlign: 'left'
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '15px' }}>{icon}</span>
                    <span>{title}</span>
                </div>
                <span style={{ fontSize: '12px', color: '#64748b', transform: open ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>▼</span>
            </button>
            {open && (
                <div style={{ padding: '16px' }}>
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

    // Accordion single-open state: only 1 section open at a time
    const [openSectionId, setOpenSectionId] = useState<string>('layout');

    const toggleSection = (sectionId: string) => {
        setOpenSectionId(prev => prev === sectionId ? '' : sectionId);
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
        <div style={{ padding: '16px', maxHeight: '100%', overflowY: 'auto' }}>
            
            {/* 1. DISPOSITION DES IMAGES & DU TEXTE */}
            <AccordionSection 
                title="Position & Intégration Image / Texte" 
                icon="🖼️" 
                isOpen={openSectionId === 'layout'}
                onToggle={() => toggleSection('layout')}
            >
                <div style={{ marginBottom: '14px' }}>
                    <label className="label-pro" style={{ fontWeight: 'bold' }}>Placement de l'image par rapport au texte</label>
                    <select
                        className="input-pro"
                        value={props.contentLayout}
                        onChange={(e) => setProp((p: any) => p.contentLayout = e.target.value)}
                    >
                        <option value="image-above-text">⬆️ Image au-dessus (Texte sous l'image)</option>
                        <option value="image-below-text">⬇️ Image en-dessous (Texte au-dessus)</option>
                        <option value="image-left-text-right">⬅️ Image à gauche (Texte à droite)</option>
                        <option value="text-left-image-right">➡️ Image à droite (Texte à gauche)</option>
                        <option value="image-overlay">🖼️ Texte DANS l'image (Superposition / Overlay)</option>
                        <option value="image-on-shape">🎨 Image sur Forme (Effet 3D / Dépassant)</option>
                    </select>
                </div>

                {props.contentLayout === 'image-overlay' && (
                    <div style={{ marginBottom: '14px', background: '#f8fafc', padding: '10px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                        <label className="label-pro">📍 Position du texte dans l'image</label>
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

                <div className="grid-2" style={{ marginBottom: '12px' }}>
                    <div>
                        <label className="label-pro">Forme du cadre / Image</label>
                        <select className="input-pro" value={props.globalShape} onChange={(e) => setProp((p: any) => p.globalShape = e.target.value)}>
                            <option value="circle">⭕ Cercle</option>
                            <option value="square">🔲 Carré</option>
                            <option value="rounded-square">⏹️ Carré Arrondi</option>
                            <option value="rectangle">▭ Rectangle (16:9)</option>
                            <option value="rounded-rectangle">📱 Rectangle Arrondi</option>
                            <option value="custom">⚙️ Personnalisé</option>
                        </select>
                    </div>
                    <div>
                        <label className="label-pro">Niveau d'arrondi (ex: 16px, 50%)</label>
                        <input 
                            className="input-pro" 
                            type="text" 
                            placeholder="ex: 16px" 
                            value={props.globalImageBorderRadius || ''} 
                            onChange={(e) => setProp((p: any) => p.globalImageBorderRadius = e.target.value)} 
                        />
                    </div>
                </div>

                <div className="grid-2" style={{ marginBottom: '12px' }}>
                    <div>
                        <label className="label-pro">Mode Ajustement Image</label>
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
                        <label className="label-pro">Remplissage (Fit)</label>
                        <select
                            className="input-pro"
                            value={props.globalImageFit || 'contain'}
                            onChange={(e) => setProp((p: any) => p.globalImageFit = e.target.value as any)}
                        >
                            <option value="contain">Contain (Conserver tout le visuel)</option>
                            <option value="cover">Cover (Remplir tout le bloc)</option>
                            <option value="fill">Fill (Étirer)</option>
                        </select>
                    </div>
                </div>

                {props.globalImageFitMode === 'manual' && (
                    <div className="grid-2" style={{ marginBottom: '12px' }}>
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
                        <label className="label-pro">Décalage X Image : {props.globalImagePosX || 0}%</label>
                        <input 
                            className="range-pro" 
                            type="range" min="-100" max="100" step="1" 
                            value={props.globalImagePosX || 0} 
                            onChange={(e) => setProp((p: any) => p.globalImagePosX = parseInt(e.target.value) || 0)} 
                        />
                    </div>
                    <div>
                        <label className="label-pro">Décalage Y Image : {props.globalImagePosY || 0}%</label>
                        <input 
                            className="range-pro" 
                            type="range" min="-100" max="100" step="1" 
                            value={props.globalImagePosY || 0} 
                            onChange={(e) => setProp((p: any) => p.globalImagePosY = parseInt(e.target.value) || 0)} 
                        />
                    </div>
                </div>
            </AccordionSection>

            {/* 2. TITRE DE SECTION ET BOUTON CTA EN HAUT */}
            <AccordionSection 
                title="Titre de Section & Alignement Header" 
                icon="🏷️"
                isOpen={openSectionId === 'section-header'}
                onToggle={() => toggleSection('section-header')}
            >
                <div style={{ marginBottom: '12px' }}>
                    <label className="label-pro">Titre principal de la section</label>
                    <input className="input-pro" type="text" placeholder="ex: Nos Catégories En Vedette" value={props.globalTitle} onChange={(e) => setProp((p: any) => p.globalTitle = e.target.value)} />
                </div>
                
                <div className="grid-2" style={{ marginBottom: '12px' }}>
                    <div>
                        <label className="label-pro">Alignement Titre & CTA Header</label>
                        <select className="input-pro" value={props.sectionHeaderAlign || 'center'} onChange={(e) => setProp((p: any) => p.sectionHeaderAlign = e.target.value as any)}>
                            <option value="center">Centre (Centré au-dessus)</option>
                            <option value="left">Gauche (Aligné à gauche)</option>
                            <option value="right">Droite (Aligné à droite)</option>
                            <option value="between">Titre Gauche ↔ CTA Droite (Séparé)</option>
                        </select>
                    </div>
                    <div>
                        <label className="label-pro">Taille Titre Section</label>
                        <input className="input-pro" type="text" value={props.globalTitleSize} onChange={(e) => setProp((p: any) => p.globalTitleSize = e.target.value)} />
                    </div>
                </div>

                <div style={{ marginBottom: '12px' }}>
                    <ColorField label="Couleur Titre Section" value={props.globalTitleColor} onChange={(v) => setProp((p: any) => p.globalTitleColor = v)} />
                </div>

                <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '10px' }}>
                    <label style={{ fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold', marginBottom: '8px' }}>
                        <input type="checkbox" checked={props.sectionHeaderCtaEnabled || false} onChange={(e) => setProp((p: any) => p.sectionHeaderCtaEnabled = e.target.checked)} />
                        Afficher un bouton CTA en haut de section
                    </label>

                    {props.sectionHeaderCtaEnabled && (
                        <>
                            <div className="grid-2" style={{ marginBottom: '12px' }}>
                                <div>
                                    <label className="label-pro">Texte du bouton Header</label>
                                    <input className="input-pro" type="text" value={props.sectionHeaderCtaText || 'Voir Tout'} onChange={(e) => setProp((p: any) => p.sectionHeaderCtaText = e.target.value)} />
                                </div>
                                <div>
                                    <label className="label-pro">URL / Lien Cible</label>
                                    <input className="input-pro" type="text" placeholder="/collection/..." value={props.sectionHeaderCtaUrl || '#'} onChange={(e) => setProp((p: any) => p.sectionHeaderCtaUrl = e.target.value)} />
                                </div>
                            </div>
                            <div>
                                <label className="label-pro">Style du bouton</label>
                                <select className="input-pro" value={props.sectionHeaderCtaStyle || 'solid'} onChange={(e) => setProp((p: any) => p.sectionHeaderCtaStyle = e.target.value as any)}>
                                    <option value="solid">Bouton Rempli (Solid)</option>
                                    <option value="outline">Bouton Contour (Outline)</option>
                                    <option value="link">Lien Texte ➔</option>
                                </select>
                            </div>
                        </>
                    )}
                </div>
            </AccordionSection>

            {/* 3. CONTOUR ET APPARENCE DES CARTES */}
            <AccordionSection 
                title="Contour & Arrière-Plan des Cartes" 
                icon="🎨"
                isOpen={openSectionId === 'card-appearance'}
                onToggle={() => toggleSection('card-appearance')}
            >
                <div className="grid-2" style={{ marginBottom: '12px' }}>
                    <div>
                        <label className="label-pro">Épaisseur Bordure (px)</label>
                        <input 
                            className="input-pro" 
                            type="number" min={0} max={20} 
                            value={props.globalCardBorderWidth !== undefined ? props.globalCardBorderWidth : 0} 
                            onChange={(e) => setProp((p: any) => p.globalCardBorderWidth = parseInt(e.target.value) || 0)} 
                        />
                    </div>
                    <ColorField 
                        label="Couleur Bordure" 
                        value={props.globalCardBorderColor || '#e2e8f0'} 
                        onChange={(v) => setProp((p: any) => p.globalCardBorderColor = v)} 
                    />
                </div>

                <div style={{ marginBottom: '12px' }}>
                    <label className="label-pro">Arrondi des Cartes (Border Radius)</label>
                    <input 
                        className="input-pro" 
                        type="text" placeholder="12px" 
                        value={props.globalCardBorderRadius || '12px'} 
                        onChange={(e) => setProp((p: any) => p.globalCardBorderRadius = e.target.value)} 
                    />
                </div>

                <div className="grid-2" style={{ marginBottom: '12px' }}>
                    <ColorField 
                        label="Fond de la Carte" 
                        value={props.globalCardBgColor || 'transparent'} 
                        onChange={(v) => setProp((p: any) => p.globalCardBgColor = v)} 
                    />
                    <ColorField 
                        label="Fond au Survol" 
                        value={props.globalCardHoverBgColor || 'transparent'} 
                        onChange={(v) => setProp((p: any) => p.globalCardHoverBgColor = v)} 
                    />
                </div>

                <div>
                    <label className="label-pro">Animation au survol des cartes</label>
                    <select className="input-pro" value={props.globalAnimHover} onChange={(e) => setProp((p: any) => p.globalAnimHover = e.target.value)}>
                        <option value="none">Aucune</option>
                        <option value="scale">Scale (Agrandissement)</option>
                        <option value="lift">Lift (Élévation)</option>
                        <option value="glow">Glow (Luminescence)</option>
                    </select>
                </div>
            </AccordionSection>

            {/* 4. TYPOGRAPHIE & COULEURS DU TEXTE */}
            <AccordionSection 
                title="Textes & Typographie (Titres & Descriptions)" 
                icon="📝"
                isOpen={openSectionId === 'typography'}
                onToggle={() => toggleSection('typography')}
            >
                <div style={{ padding: '10px', background: '#f8fafc', borderRadius: '6px', marginBottom: '12px', border: '1px solid #e2e8f0' }}>
                    <h4 style={{ margin: '0 0 8px', fontSize: '12px', color: '#334155', fontWeight: 'bold' }}>Titre Principal de la Carte</h4>
                    <div className="grid-2" style={{ marginBottom: '8px' }}>
                        <div>
                            <label className="label-pro">Taille (ex: 16px)</label>
                            <input className="input-pro" type="text" value={props.globalItemTitleSize} onChange={(e) => setProp((p: any) => p.globalItemTitleSize = e.target.value)} />
                        </div>
                        <div>
                            <label className="label-pro">Graisse / Épaisseur</label>
                            <select className="input-pro" value={props.globalItemTitleWeight} onChange={(e) => setProp((p: any) => p.globalItemTitleWeight = e.target.value)}>
                                <option value="normal">Normal (400)</option>
                                <option value="medium">Moyen (500)</option>
                                <option value="semibold">Semi-Gras (600)</option>
                                <option value="bold">Gras (700)</option>
                                <option value="900">Très Gras / Black (900)</option>
                            </select>
                        </div>
                    </div>
                    <div className="grid-2">
                        <ColorField label="Couleur du Titre" value={props.globalItemTitleColor || '#0f172a'} onChange={(v) => setProp((p: any) => p.globalItemTitleColor = v)} />
                        <div>
                            <label className="label-pro">Casse du Titre</label>
                            <select className="input-pro" value={props.globalItemTitleTransform || 'none'} onChange={(e) => setProp((p: any) => p.globalItemTitleTransform = e.target.value)}>
                                <option value="none">Normal</option>
                                <option value="uppercase">MAJUSCULES</option>
                                <option value="capitalize">Capitaliser</option>
                                <option value="lowercase">minuscules</option>
                            </select>
                        </div>
                    </div>
                </div>

                <div style={{ padding: '10px', background: '#f8fafc', borderRadius: '6px', marginBottom: '12px', border: '1px solid #e2e8f0' }}>
                    <h4 style={{ margin: '0 0 8px', fontSize: '12px', color: '#334155', fontWeight: 'bold' }}>Description de la Carte</h4>
                    <div className="grid-2" style={{ marginBottom: '8px' }}>
                        <div>
                            <label className="label-pro">Taille (ex: 14px)</label>
                            <input className="input-pro" type="text" value={props.globalItemDescSize} onChange={(e) => setProp((p: any) => p.globalItemDescSize = e.target.value)} />
                        </div>
                        <div>
                            <label className="label-pro">Graisse / Épaisseur</label>
                            <select className="input-pro" value={props.globalItemDescWeight} onChange={(e) => setProp((p: any) => p.globalItemDescWeight = e.target.value)}>
                                <option value="normal">Normal</option>
                                <option value="medium">Moyen (500)</option>
                                <option value="bold">Gras</option>
                            </select>
                        </div>
                    </div>
                    <div className="grid-2">
                        <ColorField label="Couleur Description" value={props.globalItemDescColor || '#64748b'} onChange={(v) => setProp((p: any) => p.globalItemDescColor = v)} />
                        <div>
                            <label className="label-pro">Nombre max de lignes</label>
                            <select className="input-pro" value={props.globalItemDescLines !== undefined ? props.globalItemDescLines : 2} onChange={(e) => setProp((p: any) => p.globalItemDescLines = parseInt(e.target.value) || 0)}>
                                <option value={0}>Illimité</option>
                                <option value={1}>1 Ligne</option>
                                <option value={2}>2 Lignes</option>
                                <option value={3}>3 Lignes</option>
                            </select>
                        </div>
                    </div>
                </div>

                <div className="grid-2">
                    <div>
                        <label className="label-pro">Alignement du Texte</label>
                        <select className="input-pro" value={props.globalItemAlignment} onChange={(e) => setProp((p: any) => p.globalItemAlignment = e.target.value)}>
                            <option value="left">Gauche</option>
                            <option value="center">Centre</option>
                            <option value="right">Droite</option>
                        </select>
                    </div>
                    <div>
                        <label className="label-pro">Espace Titre-Description (px)</label>
                        <input className="input-pro" type="number" min={0} value={props.globalTextGap !== undefined ? props.globalTextGap : 6} onChange={(e) => setProp((p: any) => p.globalTextGap = parseInt(e.target.value) || 0)} />
                    </div>
                </div>
            </AccordionSection>

            {/* 5. MODE D'AFFICHAGE & DEFILEMENT */}
            <AccordionSection 
                title="Format de la Grille & Carrousel" 
                icon="📐"
                isOpen={openSectionId === 'grid-format'}
                onToggle={() => toggleSection('grid-format')}
            >
                <div className="grid-2" style={{ marginBottom: '12px' }}>
                    <div>
                        <label className="label-pro">Mode de Défilement</label>
                        <select className="input-pro" value={props.scrollMode} onChange={(e) => setProp((p: any) => p.scrollMode = e.target.value)}>
                            <option value="grid">Grille Responsive (Haut/Bas)</option>
                            <option value="carousel">Carrousel Horizontal (Défilant)</option>
                        </select>
                    </div>
                    <div>
                        <label className="label-pro">Colonnes PC (Desktop)</label>
                        <input className="input-pro" type="number" min={1} max={12} value={props.columnsDesktop} onChange={(e) => setProp((p: any) => p.columnsDesktop = parseInt(e.target.value) || 1)} />
                    </div>
                </div>

                {props.scrollMode === 'carousel' && (
                    <div style={{ padding: '10px', background: '#eff6ff', borderRadius: '6px', marginBottom: '12px', border: '1px solid #bfdbfe' }}>
                        <div className="grid-2" style={{ marginBottom: '8px' }}>
                            <div>
                                <label className="label-pro">Style des flèches</label>
                                <select className="input-pro" value={props.carouselArrows} onChange={(e) => setProp((p: any) => p.carouselArrows = e.target.value)}>
                                    <option value="none">Aucune (Tactile)</option>
                                    <option value="simple">Flèches simples</option>
                                    <option value="circle">Boutons ronds</option>
                                    <option value="square">Boutons carrés</option>
                                </select>
                            </div>
                            <div>
                                <label style={{ fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold', marginTop: '22px' }}>
                                    <input type="checkbox" checked={props.autoplay || false} onChange={(e) => setProp((p: any) => p.autoplay = e.target.checked)} />
                                    Autoplay
                                </label>
                            </div>
                        </div>

                        {props.autoplay && (
                            <div className="grid-2">
                                <div>
                                    <label className="label-pro">Vitesse (ms)</label>
                                    <input className="input-pro" type="number" min={500} step={500} value={props.autoplaySpeed || 3000} onChange={(e) => setProp((p: any) => p.autoplaySpeed = parseInt(e.target.value) || 3000)} />
                                </div>
                                <div>
                                    <label className="label-pro">Sens</label>
                                    <select className="input-pro" value={props.autoplayDirection || 'right'} onChange={(e) => setProp((p: any) => p.autoplayDirection = e.target.value)}>
                                        <option value="right">Vers la droite ➔</option>
                                        <option value="left">Vers la gauche ↵</option>
                                    </select>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                <div className="grid-2">
                    <div>
                        <label className="label-pro">Espacement X (Gap Horizontal)</label>
                        <input className="input-pro" type="number" min={0} value={props.gapX} onChange={(e) => setProp((p: any) => p.gapX = parseInt(e.target.value) || 0)} />
                    </div>
                    <div>
                        <label className="label-pro">Espacement Y (Gap Vertical)</label>
                        <input className="input-pro" type="number" min={0} value={props.gapY} onChange={(e) => setProp((p: any) => p.gapY = parseInt(e.target.value) || 0)} />
                    </div>
                </div>
            </AccordionSection>

            {/* 6. GESTION ET AJOUT DE CARTES */}
            <AccordionSection 
                title="Gestion & Ajout de Cartes" 
                icon="📥"
                isOpen={openSectionId === 'card-management'}
                onToggle={() => toggleSection('card-management')}
            >
                <button 
                    onClick={addManualCard}
                    style={{ 
                        width: '100%', padding: '10px 16px', background: 'var(--builder-primary)', 
                        color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', 
                        fontWeight: 'bold', marginBottom: '12px', fontSize: '13px' 
                    }}
                >
                    ➕ Ajouter une Carte Personnalisée
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
