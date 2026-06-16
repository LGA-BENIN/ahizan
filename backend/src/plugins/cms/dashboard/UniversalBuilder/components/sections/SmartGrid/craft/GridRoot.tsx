import React, { createContext, useState, useEffect } from 'react';
import { useNode, useEditor } from '@craftjs/core';
import { MediaUploadField } from '../../MediaUploadField';
import { fetchGraphQL } from '../../../../../lib/utils';
import { GridItem } from './GridItem';

export const GridGlobalContext = createContext<any>({});

async function fetchCollectionsFromAdminApi() {
    try {
        const data = await fetchGraphQL(`query { cmsCollectionsTree { id name slug featuredAsset { id preview } children { id name slug featuredAsset { id preview } } } }`);
        const tree = data?.cmsCollectionsTree || [];
        const flat: any[] = [];
        const flatten = (nodes: any[]) => {
            for (const node of nodes) {
                flat.push(node);
                if (node.children && node.children.length > 0) flatten(node.children);
            }
        };
        flatten(tree);
        return flat;
    } catch (err) {
        console.error('Error fetching collections:', err);
        return [];
    }
}

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
    bgGradient: string;
    sectionAnimation: 'none' | 'fade-in' | 'fade-up' | 'zoom-in';
    contentLayout: 'image-above-text' | 'image-below-text';
    gridAlignment: 'left' | 'center' | 'right';
    
    // NEW PROPS
    globalTitle: string;
    globalTitleSize: string;
    globalTitleColor: string;
    scrollMode: 'grid' | 'carousel';
    carouselArrows: 'none' | 'simple' | 'circle' | 'square';
    
    globalShape: 'circle' | 'square' | 'rounded-square' | 'rectangle' | 'rounded-rectangle';
    globalImageWidth: string;
    globalImageHeight: string;
    globalAnimEntrance: 'none' | 'fade-in' | 'fade-up' | 'zoom-in';
    globalAnimHover: 'none' | 'scale' | 'lift' | 'glow';
    
    globalItemAlignment: 'left' | 'center' | 'right';
    globalItemTitleSize: string;
    globalItemTitleWeight: string;
    globalItemDescSize: string;
    globalItemDescWeight: string;

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
    gridAlignment = 'center',
    globalTitle = '',
    globalTitleSize = '24px',
    globalTitleColor = '#0f172a',
    scrollMode = 'grid',
    carouselArrows = 'circle',
    globalShape = 'circle',
    globalImageWidth = '120px',
    globalImageHeight = '120px',
    globalAnimEntrance = 'none',
    globalAnimHover = 'scale',
    globalItemAlignment = 'center',
    globalItemTitleSize = '16px',
    globalItemTitleWeight = 'bold',
    globalItemDescSize = '14px',
    globalItemDescWeight = 'normal',
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

    return (
        <GridGlobalContext.Provider value={{
            globalShape, globalImageWidth, globalImageHeight, globalAnimEntrance, globalAnimHover,
            globalItemAlignment, globalItemTitleSize, globalItemTitleWeight, globalItemDescSize, globalItemDescWeight,
            globalContentLayout: contentLayout,
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
                {globalTitle && (
                    <h2 style={{ 
                        textAlign: 'center', 
                        fontSize: globalTitleSize, 
                        color: globalTitleColor, 
                        marginBottom: '24px',
                        marginTop: 0,
                        fontWeight: 'bold'
                    }}>
                        {globalTitle}
                    </h2>
                )}

                <div style={{ position: 'relative' }}>
                    {isCarousel && carouselArrows !== 'none' && (
                        <div style={{
                            position: 'absolute', top: '50%', left: '-16px', right: '-16px', 
                            display: 'flex', justifyContent: 'space-between', transform: 'translateY(-50%)',
                            pointerEvents: 'none', zIndex: 10
                        }}>
                            {/* Placeholder Arrows for CMS Preview */}
                            <div style={{
                                width: carouselArrows === 'circle' ? '40px' : carouselArrows === 'square' ? '40px' : 'auto',
                                height: carouselArrows === 'circle' ? '40px' : carouselArrows === 'square' ? '40px' : 'auto',
                                borderRadius: carouselArrows === 'circle' ? '50%' : '4px',
                                background: carouselArrows !== 'simple' ? '#fff' : 'transparent',
                                boxShadow: carouselArrows !== 'simple' ? '0 2px 4px rgba(0,0,0,0.1)' : 'none',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: '20px', color: '#333'
                            }}>❮</div>
                            <div style={{
                                width: carouselArrows === 'circle' ? '40px' : carouselArrows === 'square' ? '40px' : 'auto',
                                height: carouselArrows === 'circle' ? '40px' : carouselArrows === 'square' ? '40px' : 'auto',
                                borderRadius: carouselArrows === 'circle' ? '50%' : '4px',
                                background: carouselArrows !== 'simple' ? '#fff' : 'transparent',
                                boxShadow: carouselArrows !== 'simple' ? '0 2px 4px rgba(0,0,0,0.1)' : 'none',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: '20px', color: '#333'
                            }}>❯</div>
                        </div>
                    )}

                    <div style={{
                        display: isCarousel ? 'flex' : 'grid',
                        flexWrap: isCarousel ? 'nowrap' : 'wrap',
                        gridTemplateColumns: !isCarousel ? `repeat(${columnsDesktop}, minmax(0, 1fr))` : undefined,
                        overflowX: isCarousel ? 'auto' : 'visible',
                        columnGap: `${gapX}px`,
                        rowGap: `${gapY}px`,
                        justifyItems: !isCarousel ? getAlignment() : undefined,
                        paddingBottom: isCarousel ? '16px' : '0', // For scrollbar
                        scrollSnapType: isCarousel ? 'x mandatory' : 'none',
                        width: '100%',
                    }}>
                        {React.Children.count(children) > 0 ? (
                            children
                        ) : (
                            <div style={{
                                gridColumn: '1 / -1',
                                padding: '40px',
                                textAlign: 'center',
                                background: 'rgba(255,255,255,0.8)',
                                borderRadius: '8px',
                                border: '2px dashed #cbd5e1',
                                width: '100%'
                            }}>
                                <h3 style={{ margin: 0, color: '#334155' }}>La Grille est Vide</h3>
                                <p style={{ margin: '8px 0 0', color: '#64748b', fontSize: '14px' }}>
                                    Utilisez le panneau de Paramètres pour ajouter des Collections ou des Cartes Manuelles.
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </GridGlobalContext.Provider>
    );
};

const ColorField = ({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) => (
    <div>
        <label className="label-pro">{label}</label>
        <div className="color-row">
            <input type="color" className="color-swatch" value={value || '#000000'} onChange={(e) => onChange(e.target.value)} />
            <input className="input-pro" value={value || ''} onChange={(e) => onChange(e.target.value)} />
        </div>
    </div>
);

export const GridRootSettings = () => {
    const { id } = useNode();
    const { actions, query } = useEditor();
    const { setProp, props } = useNode((node) => ({
        props: node.data.props as GridRootProps
    }));

    const [availableCollections, setAvailableCollections] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchCollectionsFromAdminApi().then(cols => {
            setAvailableCollections(cols);
            setLoading(false);
        });
    }, []);

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

    const addCollectionCard = (col: any) => {
        const nodeTree = query.parseReactElement(
            <GridItem 
                titleText={col.name}
                linkUrl={`/collection/${col.slug}`}
                imageUrl={col.featuredAsset?.preview || ''}
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
        <div className="stack-lg" style={{ padding: '16px', maxHeight: '100%', overflowY: 'auto' }}>
            
            <div className="settings-card">
                <div className="settings-card-header">📝 Titre Global</div>
                <div>
                    <label className="label-pro">Texte du titre</label>
                    <input className="input-pro" type="text" placeholder="Laissez vide pour aucun titre" value={props.globalTitle} onChange={(e) => setProp((p: any) => p.globalTitle = e.target.value)} />
                </div>
                <div className="grid-2" style={{ marginTop: '1rem' }}>
                    <ColorField label="Couleur" value={props.globalTitleColor} onChange={(v) => setProp((p: any) => p.globalTitleColor = v)} />
                    <div>
                        <label className="label-pro">Taille (ex: 32px)</label>
                        <input className="input-pro" type="text" value={props.globalTitleSize} onChange={(e) => setProp((p: any) => p.globalTitleSize = e.target.value)} />
                    </div>
                </div>
            </div>

            <div className="settings-card">
                <div className="settings-card-header">⚙️ Mode d'Affichage (Grille vs Carrousel)</div>
                <div className="grid-2">
                    <div>
                        <label className="label-pro">Mode de Défilement</label>
                        <select className="input-pro" value={props.scrollMode} onChange={(e) => setProp((p: any) => p.scrollMode = e.target.value)}>
                            <option value="grid">Grille (Haut/Bas)</option>
                            <option value="carousel">Carrousel (Gauche/Droite)</option>
                        </select>
                    </div>
                    {props.scrollMode === 'carousel' && (
                        <div>
                            <label className="label-pro">Style des flèches</label>
                            <select className="input-pro" value={props.carouselArrows} onChange={(e) => setProp((p: any) => p.carouselArrows = e.target.value)}>
                                <option value="none">Aucune (Scroll tactile)</option>
                                <option value="simple">Flèches simples</option>
                                <option value="circle">Boutons ronds</option>
                                <option value="square">Boutons carrés</option>
                            </select>
                        </div>
                    )}
                </div>
            </div>

            <div className="settings-card">
                <div className="settings-card-header">🌍 Attributs Globaux des Éléments</div>
                <p style={{ fontSize: '11px', color: '#64748b', marginBottom: '12px' }}>Toutes les cartes partageront ces attributs.</p>
                
                <div className="grid-2">
                    <div>
                        <label className="label-pro">Forme Générale</label>
                        <select className="input-pro" value={props.globalShape} onChange={(e) => setProp((p: any) => p.globalShape = e.target.value)}>
                            <option value="circle">Cercle</option>
                            <option value="square">Carré</option>
                            <option value="rounded-square">Carré arrondi</option>
                            <option value="rectangle">Rectangle (16:9)</option>
                            <option value="rounded-rectangle">Rectangle arrondi (16:9)</option>
                        </select>
                    </div>
                    <div>
                        <label className="label-pro">Animation de Survol</label>
                        <select className="input-pro" value={props.globalAnimHover} onChange={(e) => setProp((p: any) => p.globalAnimHover = e.target.value)}>
                            <option value="none">Aucun</option>
                            <option value="scale">Agrandissement</option>
                            <option value="lift">Élévation</option>
                            <option value="glow">Luminescence</option>
                        </select>
                    </div>
                </div>

                <div className="grid-2" style={{ marginTop: '1rem' }}>
                    <div>
                        <label className="label-pro">Largeur Image Forcée</label>
                        <input className="input-pro" type="text" placeholder="ex: 120px" value={props.globalImageWidth} onChange={(e) => setProp((p: any) => p.globalImageWidth = e.target.value)} />
                    </div>
                    <div>
                        <label className="label-pro">Hauteur Image Forcée</label>
                        <input className="input-pro" type="text" placeholder="ex: 120px" value={props.globalImageHeight} onChange={(e) => setProp((p: any) => p.globalImageHeight = e.target.value)} />
                    </div>
                </div>
            </div>

            <div className="settings-card">
                <div className="settings-card-header">📥 Ajouter des Cartes</div>
                
                <button 
                    onClick={addManualCard}
                    style={{ width: '100%', padding: '10px', background: 'var(--builder-primary)', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', marginBottom: '1rem' }}
                >
                    + Ajouter une Carte Vierge
                </button>

                <label className="label-pro">Ajouter une Collection (Cliquez pour insérer)</label>
                {loading ? (
                    <div style={{ fontSize: '12px', color: '#64748b' }}>Chargement...</div>
                ) : availableCollections.length === 0 ? (
                    <div style={{ fontSize: '12px', color: '#ef4444' }}>Aucune collection trouvée.</div>
                ) : (
                    <div style={{ maxHeight: '200px', overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: '4px', padding: '4px', background: '#fff', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        {availableCollections.map(col => {
                            return (
                                <button 
                                    key={col.slug} 
                                    onClick={() => addCollectionCard(col)}
                                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: '8px', fontSize: '13px', padding: '6px 8px', cursor: 'pointer', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '4px', textAlign: 'left', transition: 'background 0.2s' }}
                                    onMouseOver={(e) => e.currentTarget.style.background = '#e2e8f0'}
                                    onMouseOut={(e) => e.currentTarget.style.background = '#f8fafc'}
                                >
                                    <span style={{ fontSize: '16px' }}>+</span>
                                    {col.name}
                                </button>
                            );
                        })}
                    </div>
                )}
            </div>

            <div className="settings-card">
                <div className="settings-card-header">⚙️ Configuration du Contenu (Textes des Cartes)</div>
                <p style={{ fontSize: '11px', color: '#64748b', marginBottom: '12px' }}>Ces réglages s'appliquent à toutes les cartes (collections et manuelles).</p>
                <div className="grid-2">
                    <div>
                        <label className="label-pro">Disposition globale</label>
                        <select
                            className="input-pro"
                            value={props.contentLayout}
                            onChange={(e) => setProp((p: any) => p.contentLayout = e.target.value)}
                        >
                            <option value="image-above-text">Image au-dessus du texte</option>
                            <option value="image-below-text">Image en-dessous du texte</option>
                            <option value="image-left-text-right">Image à gauche (Liste)</option>
                            <option value="text-left-image-right">Image à droite (Liste)</option>
                        </select>
                    </div>
                    <div>
                        <label className="label-pro">Alignement du Texte</label>
                        <select className="input-pro" value={props.globalItemAlignment} onChange={(e) => setProp((p: any) => p.globalItemAlignment = e.target.value)}>
                            <option value="left">Gauche</option>
                            <option value="center">Centre</option>
                            <option value="right">Droite</option>
                        </select>
                    </div>
                </div>

                <div className="grid-2" style={{ marginTop: '1rem' }}>
                    <div>
                        <label className="label-pro">Taille Titre (ex: 16px)</label>
                        <input className="input-pro" type="text" value={props.globalItemTitleSize} onChange={(e) => setProp((p: any) => p.globalItemTitleSize = e.target.value)} />
                    </div>
                    <div>
                        <label className="label-pro">Graisse Titre</label>
                        <select className="input-pro" value={props.globalItemTitleWeight} onChange={(e) => setProp((p: any) => p.globalItemTitleWeight = e.target.value)}>
                            <option value="normal">Normal</option>
                            <option value="bold">Gras</option>
                            <option value="900">Très Gras (Black)</option>
                        </select>
                    </div>
                </div>

                <div className="grid-2" style={{ marginTop: '1rem' }}>
                    <div>
                        <label className="label-pro">Taille Description</label>
                        <input className="input-pro" type="text" value={props.globalItemDescSize} onChange={(e) => setProp((p: any) => p.globalItemDescSize = e.target.value)} />
                    </div>
                    <div>
                        <label className="label-pro">Graisse Description</label>
                        <select className="input-pro" value={props.globalItemDescWeight} onChange={(e) => setProp((p: any) => p.globalItemDescWeight = e.target.value)}>
                            <option value="normal">Normal</option>
                            <option value="bold">Gras</option>
                        </select>
                    </div>
                </div>
            </div>

            <div className="settings-card">
                <div className="settings-card-header">⚙️ Configuration du Contenu (Section)</div>
                <div style={{ marginTop: '1rem' }}>
                    <label className="label-pro">Alignement interne de la grille</label>
                    <select
                        className="input-pro"
                        value={props.gridAlignment}
                        onChange={(e) => setProp((p: any) => p.gridAlignment = e.target.value)}
                    >
                        <option value="left">Gauche</option>
                        <option value="center">Centre</option>
                        <option value="right">Droite</option>
                    </select>
                </div>

                <div style={{ marginTop: '1rem' }}>
                    <label className="label-pro">Animation d'Entrée de la Section</label>
                    <select
                        className="input-pro"
                        value={props.sectionAnimation}
                        onChange={(e) => setProp((p: any) => p.sectionAnimation = e.target.value)}
                    >
                        <option value="none">Aucune</option>
                        <option value="fade-in">Fondu (Fade In)</option>
                        <option value="fade-up">Glissement haut (Fade Up)</option>
                        <option value="zoom-in">Zoom (Zoom In)</option>
                    </select>
                </div>
            </div>

            <div className="settings-card">
                <div className="settings-card-header">📱 Colonnes (Responsive)</div>
                <div className="grid-3">
                    <div>
                        <label className="label-pro">Desktop</label>
                        <input className="input-pro" type="number" min={1} max={12} value={props.columnsDesktop} onChange={(e) => setProp((p: any) => p.columnsDesktop = parseInt(e.target.value) || 1)} />
                    </div>
                    <div>
                        <label className="label-pro">Tablette</label>
                        <input className="input-pro" type="number" min={1} max={12} value={props.columnsTablet} onChange={(e) => setProp((p: any) => p.columnsTablet = parseInt(e.target.value) || 1)} />
                    </div>
                    <div>
                        <label className="label-pro">Mobile</label>
                        <input className="input-pro" type="number" min={1} max={12} value={props.columnsMobile} onChange={(e) => setProp((p: any) => p.columnsMobile = parseInt(e.target.value) || 1)} />
                    </div>
                </div>
            </div>

            <div className="settings-card">
                <div className="settings-card-header">📏 Espacements (Gap & Padding)</div>
                <div className="grid-2">
                    <div>
                        <label className="label-pro">Espace Horizontal (Gap X)</label>
                        <input className="input-pro" type="number" min={0} value={props.gapX} onChange={(e) => setProp((p: any) => p.gapX = parseInt(e.target.value) || 0)} />
                    </div>
                    <div>
                        <label className="label-pro">Espace Vertical (Gap Y)</label>
                        <input className="input-pro" type="number" min={0} value={props.gapY} onChange={(e) => setProp((p: any) => p.gapY = parseInt(e.target.value) || 0)} />
                    </div>
                </div>
                
                <div className="grid-2" style={{ marginTop: '1rem' }}>
                    <div><label className="label-pro">Padding Haut (px)</label><input className="input-pro" type="number" value={props.paddingTop} onChange={(e) => setProp((p: any) => p.paddingTop = parseInt(e.target.value) || 0)} /></div>
                    <div><label className="label-pro">Padding Bas (px)</label><input className="input-pro" type="number" value={props.paddingBottom} onChange={(e) => setProp((p: any) => p.paddingBottom = parseInt(e.target.value) || 0)} /></div>
                    <div><label className="label-pro">Padding Gauche (px)</label><input className="input-pro" type="number" value={props.paddingLeft} onChange={(e) => setProp((p: any) => p.paddingLeft = parseInt(e.target.value) || 0)} /></div>
                    <div><label className="label-pro">Padding Droite (px)</label><input className="input-pro" type="number" value={props.paddingRight} onChange={(e) => setProp((p: any) => p.paddingRight = parseInt(e.target.value) || 0)} /></div>
                </div>
            </div>

            <div className="settings-card">
                <div className="settings-card-header">🎨 Arrière-plan de la section</div>
                <ColorField label="Couleur de fond" value={props.bgColor} onChange={(v) => setProp((p: any) => p.bgColor = v)} />
                
                <div style={{ marginTop: '1rem' }}>
                    <MediaUploadField 
                        label="Image de fond (URL)"
                        value={props.bgImage}
                        onChange={(url) => setProp((p: any) => p.bgImage = url)}
                    />
                </div>

                <div style={{ marginTop: '1rem' }}>
                    <label className="label-pro">Dégradé CSS personnalisé</label>
                    <input className="input-pro" type="text" value={props.bgGradient} onChange={(e) => setProp((p: any) => p.bgGradient = e.target.value)} placeholder="ex: linear-gradient(to right, #ff0000, #0000ff)" />
                </div>
            </div>

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
        scrollMode: 'grid',
        carouselArrows: 'circle',
        globalShape: 'circle',
        globalImageWidth: '120px',
        globalImageHeight: '120px',
        globalAnimEntrance: 'none',
        globalAnimHover: 'scale',
        globalItemAlignment: 'center',
        globalItemTitleSize: '16px',
        globalItemTitleWeight: 'bold',
        globalItemDescSize: '14px',
        globalItemDescWeight: 'normal',
    },
    related: {
        settings: GridRootSettings
    },
    rules: {
        canDrag: () => false,
    }
};
