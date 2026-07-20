import React from 'react';
import { useNode } from '@craftjs/core';

export const FreeformRoot = ({ children, bgColor = '#ffffff', minHeight = '800px' }: any) => {
    const { connectors: { connect, drag } } = useNode();

    return (
        <div
            ref={(ref: any) => connect(drag(ref))}
            style={{
                width: '100%',
                minHeight,
                backgroundColor: bgColor,
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
                boxSizing: 'border-box'
            }}
        >
            {children}
        </div>
    );
};

export const FreeformRootSettings = () => {
    const { setProp, bgColor, minHeight } = useNode((node) => ({
        bgColor: node.data.props.bgColor,
        minHeight: node.data.props.minHeight,
    }));

    return (
        <div className="stack-lg" style={{ padding: '16px' }}>
            <div className="settings-card">
                <div className="settings-card-header">⚙️ Configuration de la Page</div>
                <div>
                    <label className="label-pro">Couleur de fond</label>
                    <input type="color" className="input-pro" style={{ height: '40px', padding: 0 }} value={bgColor || '#ffffff'} onChange={(e) => setProp((p: any) => p.bgColor = e.target.value)} />
                </div>
                <div style={{ marginTop: '1rem' }}>
                    <label className="label-pro">Hauteur Minimum</label>
                    <input type="text" className="input-pro" value={minHeight || '800px'} onChange={(e) => setProp((p: any) => p.minHeight = e.target.value)} />
                </div>
            </div>
        </div>
    );
};

FreeformRoot.craft = {
    props: {
        bgColor: '#ffffff',
        minHeight: '800px'
    },
    related: {
        settings: FreeformRootSettings
    },
    rules: {
        canDrag: () => false,
    }
};
