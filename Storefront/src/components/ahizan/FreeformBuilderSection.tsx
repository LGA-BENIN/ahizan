import React from 'react';

// A simple mapping from our Craft.js components to standard React elements
const renderNode = (nodeId: string, nodes: any): React.ReactNode => {
    const node = nodes[nodeId];
    if (!node) return null;

    const { type, props } = node;
    const name = type.resolvedName || type.name || (typeof type === 'string' ? type : 'div');

    // Resolve children
    const childNodes = node.nodes && node.nodes.length > 0
        ? node.nodes.map((childId: string) => renderNode(childId, nodes))
        : null;

    const customClass = `craft-node-${nodeId}`;

    if (name === 'FreeformRoot') {
        const hasCustomMinHeight = props.minHeight && props.minHeight !== '800px' && props.minHeight !== '500px';
        
        let maxChildBottom = 0;
        if (node.nodes) {
            node.nodes.forEach((childId: string) => {
                const child = nodes[childId];
                if (child && child.props && child.props.position === 'absolute') {
                    const top = parseInt(child.props.mobileTop || child.props.top) || 0;
                    const height = parseInt(child.props.mobileHeight || child.props.height) || 50; 
                    if (top + height > maxChildBottom) {
                        maxChildBottom = top + height;
                    }
                }
            });
        }

        const calculatedMinHeight = maxChildBottom > 0 ? `${maxChildBottom + 40}px` : 'auto';

        return (
            <div
                key={nodeId}
                className={customClass}
                style={{
                    width: '100%',
                    minHeight: hasCustomMinHeight ? props.minHeight : calculatedMinHeight,
                    backgroundColor: props.bgColor || '#ffffff',
                    position: 'relative',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    boxSizing: 'border-box'
                }}
            >
                {childNodes}
            </div>
        );
    }

    if (name === 'ContainerNode') {
        return (
            <div
                key={nodeId}
                className={customClass}
                style={{
                    width: props.width || '100%',
                    maxWidth: '100%',
                    height: props.height || 'auto',
                    position: props.position || 'relative',
                    top: props.top || 'auto',
                    left: props.left || 'auto',
                    right: props.right || 'auto',
                    bottom: props.bottom || 'auto',
                    zIndex: props.zIndex || 1,
                    display: 'flex',
                    flexDirection: props.flexDirection || 'column',
                    alignItems: props.alignItems || 'flex-start',
                    justifyContent: props.justifyContent || 'flex-start',
                    padding: props.padding || '16px',
                    margin: props.margin || '0px',
                    backgroundColor: props.backgroundColor || 'transparent',
                    border: `${props.borderWidth || '0px'} solid ${props.borderColor || '#000000'}`,
                    borderRadius: props.borderRadius || '0px',
                    boxSizing: 'border-box'
                }}
            >
                {childNodes}
            </div>
        );
    }

    if (name === 'TextNode') {
        return (
            <div
                key={nodeId}
                className={customClass}
                style={{
                    fontSize: props.fontSize || '16px',
                    textAlign: props.textAlign || 'left',
                    color: props.color || '#333333',
                    fontWeight: props.fontWeight || 'normal',
                    margin: props.margin || '0px',
                    width: props.width || '100%',
                    maxWidth: '100%',
                    height: props.height || 'auto',
                    position: props.position || 'relative',
                    top: props.top || 'auto',
                    left: props.left || 'auto',
                    right: props.right || 'auto',
                    bottom: props.bottom || 'auto',
                    zIndex: props.zIndex || 1,
                }}
            >
                {props.text}
            </div>
        );
    }

    if (name === 'ImageNode') {
        return (
            <div
                key={nodeId}
                className={customClass}
                style={{
                    width: props.width || '300px',
                    maxWidth: '100%',
                    height: props.height || 'auto',
                    margin: props.margin || '0px',
                    position: props.position || 'relative',
                    top: props.top || 'auto',
                    left: props.left || 'auto',
                    right: props.right || 'auto',
                    bottom: props.bottom || 'auto',
                    zIndex: props.zIndex || 1,
                    display: 'inline-block'
                }}
            >
                {props.src && (
                    <img
                        src={props.src}
                        alt=""
                        style={{
                            width: '100%',
                            height: '100%',
                            objectFit: props.objectFit || 'cover',
                            borderRadius: props.borderRadius || '0px',
                            display: 'block'
                        }}
                    />
                )}
            </div>
        );
    }

    if (name === 'ButtonNode') {
        return (
            <div key={nodeId} className={customClass} style={{ 
                display: 'inline-block', 
                margin: props.margin || '0px',
                position: props.position || 'relative',
                top: props.top || 'auto',
                left: props.left || 'auto',
                right: props.right || 'auto',
                bottom: props.bottom || 'auto',
                zIndex: props.zIndex || 1,
                width: props.width || 'auto',
                maxWidth: '100%',
                height: props.height || 'auto'
            }}>
                <a
                    href={props.link || '#'}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '100%',
                        height: '100%',
                        boxSizing: 'border-box',
                        backgroundColor: props.bgColor || '#000000',
                        color: props.color || '#ffffff',
                        padding: props.padding || '12px 24px',
                        borderRadius: props.borderRadius || '6px',
                        fontSize: props.fontSize || '16px',
                        textDecoration: 'none',
                        fontWeight: 'bold',
                        cursor: 'pointer'
                    }}
                >
                    {props.text}
                </a>
            </div>
        );
    }

    // Fallback wrapper for standard HTML elements if any
    if (typeof name === 'string') {
        return React.createElement(name, { key: nodeId, className: customClass, ...props }, childNodes);
    }

    return null;
};

const generateCSS = (nodes: any): string => {
    let css = `
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { transform: translateY(50px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        @keyframes slideLeft { from { transform: translateX(50px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
        @keyframes slideRight { from { transform: translateX(-50px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
        @keyframes zoomIn { from { transform: scale(0.8); opacity: 0; } to { transform: scale(1); opacity: 1; } }
        @keyframes bounce { 0%, 20%, 50%, 80%, 100% {transform: translateY(0);} 40% {transform: translateY(-30px);} 60% {transform: translateY(-15px);} }
    `;

    Object.keys(nodes).forEach(nodeId => {
        const props = nodes[nodeId].props || {};
        const isMobileHidden = props.hideOnMobile;
        const isDesktopHidden = props.hideOnDesktop;
        
        let desktopCSS = `.craft-node-${nodeId} { `;
        let mobileCSS = `.craft-node-${nodeId} { `;
        let hasMobileProps = false;

        if (isDesktopHidden) desktopCSS += `display: none !important; `;
        
        if (isMobileHidden) {
            mobileCSS += `display: none !important; `;
            hasMobileProps = true;
        } else {
            if (props.mobileTop) { mobileCSS += `top: ${props.mobileTop} !important; `; hasMobileProps = true; }
            if (props.mobileLeft) { mobileCSS += `left: ${props.mobileLeft} !important; `; hasMobileProps = true; }
            if (props.mobileWidth) { mobileCSS += `width: ${props.mobileWidth} !important; `; hasMobileProps = true; }
            if (props.mobileHeight) { mobileCSS += `height: ${props.mobileHeight} !important; `; hasMobileProps = true; }
        }

        desktopCSS += `} `;
        mobileCSS += `} `;

        css += desktopCSS;
        if (hasMobileProps) {
            css += `@media (max-width: 768px) { ${mobileCSS} } `;
        }
        
        if (props.animationType && props.animationType !== 'none') {
            const delay = props.animationDelay || '0s';
            const duration = props.animationDuration || '0.5s';
            const animMap: any = {
                'fade-in': 'fadeIn',
                'slide-up': 'slideUp',
                'slide-left': 'slideLeft',
                'slide-right': 'slideRight',
                'zoom-in': 'zoomIn',
                'bounce': 'bounce'
            };
            const animName = animMap[props.animationType] || 'none';
            css += `.craft-node-${nodeId} { animation: ${animName} ${duration} ease-out ${delay} both; } `;
        }
    });

    return css;
}

export const FreeformBuilderSection = ({ config }: { config: any }) => {
    let craftState = null;
    try {
        if (config && config.ROOT) {
            craftState = config;
        } else {
            craftState = typeof config.dataJson === 'string' ? JSON.parse(config.dataJson) : config.dataJson;
        }
    } catch (e) {
        console.error('Failed to parse FreeformBuilder data', e);
    }

    if (!craftState || !craftState.ROOT) {
        return null;
    }

    const customCSS = generateCSS(craftState);

    return (
        <section className="freeform-builder-section" style={{ width: '100%', overflow: 'hidden' }}>
            <style dangerouslySetInnerHTML={{ __html: customCSS }} />
            {renderNode('ROOT', craftState)}
        </section>
    );
};
