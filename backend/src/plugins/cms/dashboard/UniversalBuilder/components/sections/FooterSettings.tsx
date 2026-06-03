import React, { useState, useEffect } from 'react';
import { useAutoSave } from '../useAutoSave';

interface FooterSettingsProps {
    data: any;
    onSave: (newData: any) => void;
}

export const FooterSettings = ({ data, onSave }: FooterSettingsProps) => {
    const [config, setConfig] = useState(data);
    useAutoSave(config, onSave);

    useEffect(() => {
        const defaults = {
            about: "AHIZAN est votre marketplace de confiance pour le shopping en ligne au Bénin.",
            copyrightText: `© ${new Date().getFullYear()} AHIZAN. Tous droits réservés.`,
            bgColor: '#0f172a',
            textColor: '#94a3b8',
            headingColor: '#ffffff',
            borderColor: '#1e293b',
            accentColor: '#3b82f6',
            fontSize: '14px',
            padding: '48px',
            columnsLayout: '4',
            facebook: '', instagram: '', twitter: '', youtube: '', linkedin: '', tiktok: '', whatsapp: '', pinterest: '', telegram: '',
            appStoreUrl: '', playStoreUrl: '',
            showNewsletter: true,
            newsletterTitle: 'NOUVEAU SUR AHIZAN ?',
            newsletterSubtitle: 'Inscrivez-vous pour recevoir nos offres.',
            newsletterBtnText: "S'inscrire",
            newsletterBtnColor: '#e31837',
            linkGroups: [],
            paymentMethods: ['Mobile Money', 'Cash', 'Visa'],
            showPaymentIcons: true,
            bottomBarBg: '#020617',
            bottomBarText: '#64748b',
            showBackToTop: true
        };
        setConfig({ ...defaults, ...data });
    }, [data]);

    const handleChange = (f: string, v: any) => setConfig({ ...config, [f]: v });

    const addLinkGroup = () => handleChange('linkGroups', [...(config.linkGroups || []), { title: 'New Group', links: [{ label: 'Link', link: '/' }] }]);
    const updateGroupTitle = (i: number, t: string) => { const l = [...config.linkGroups]; l[i].title = t; handleChange('linkGroups', l); };
    const removeGroup = (i: number) => handleChange('linkGroups', config.linkGroups.filter((_: any, idx: number) => idx !== i));
    const addLinkToGroup = (gi: number) => { const l = [...config.linkGroups]; l[gi].links.push({ label: 'New', link: '/' }); handleChange('linkGroups', l); };
    const updateLinkInGroup = (gi: number, li: number, k: string, v: any) => { const l = [...config.linkGroups]; l[gi].links[li] = { ...l[gi].links[li], [k]: v }; handleChange('linkGroups', l); };
    const removeLinkFromGroup = (gi: number, li: number) => { const l = [...config.linkGroups]; l[gi].links.splice(li, 1); handleChange('linkGroups', l); };

    const ColorField = ({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) => (
        <div>
            <label className="label-pro">{label}</label>
            <div className="color-row">
                <input type="color" className="color-swatch" value={value || '#000000'} onChange={(e) => onChange(e.target.value)} />
                <input className="input-pro" value={value || ''} onChange={(e) => onChange(e.target.value)} />
            </div>
        </div>
    );

    return (
        <div className="stack-lg" style={{ width: '100%', maxWidth: '860px', height: '100%', maxHeight: 'calc(100vh - 200px)', overflowY: 'auto' }}>

            <div className="settings-card">
                <div className="settings-card-header">🦶 Image du pied de page</div>
                <div><label className="label-pro">Texte "À propos"</label><textarea className="input-pro" value={config.about} onChange={(e) => handleChange('about', e.target.value)} /></div>
                <div style={{ marginTop: '1rem' }}><label className="label-pro">Droit d'auteur (Copyright)</label><input className="input-pro" value={config.copyrightText} onChange={(e) => handleChange('copyrightText', e.target.value)} /></div>
            </div>

            <div className="settings-card">
                <div className="settings-card-header">🎨 Apparence du pied de page</div>
                <div className="grid-3">
                    <ColorField label="Arrière-plan" value={config.bgColor} onChange={(v) => handleChange('bgColor', v)} />
                    <ColorField label="Couleur du texte" value={config.textColor} onChange={(v) => handleChange('textColor', v)} />
                    <ColorField label="Couleur des titres" value={config.headingColor} onChange={(v) => handleChange('headingColor', v)} />
                </div>
                <div className="grid-3" style={{ marginTop: '1rem' }}>
                    <ColorField label="Couleur de bordure" value={config.borderColor} onChange={(v) => handleChange('borderColor', v)} />
                    <ColorField label="Accent des liens" value={config.accentColor} onChange={(v) => handleChange('accentColor', v)} />
                    <div>
                        <label className="label-pro">Colonnes</label>
                        <select className="input-pro" value={config.columnsLayout} onChange={(e) => handleChange('columnsLayout', e.target.value)}>
                            <option value="3">3 Colonnes</option>
                            <option value="4">4 Colonnes</option>
                            <option value="5">5 Colonnes</option>
                        </select>
                    </div>
                </div>
                <div className="grid-2" style={{ marginTop: '1rem' }}>
                    <div>
                        <label className="label-pro">Taille de police</label>
                        <select className="input-pro" value={config.fontSize} onChange={(e) => handleChange('fontSize', e.target.value)}>
                            <option value="12px">12px</option><option value="13px">13px</option><option value="14px">14px</option><option value="15px">15px</option>
                        </select>
                    </div>
                    <div>
                        <label className="label-pro">Espacement (Padding)</label>
                        <select className="input-pro" value={config.padding} onChange={(e) => handleChange('padding', e.target.value)}>
                            <option value="32px">Petit</option><option value="48px">Standard</option><option value="64px">Grand</option><option value="80px">XL</option>
                        </select>
                    </div>
                </div>
            </div>

            <div className="settings-card">
                <div className="settings-card-header">📱 Réseaux sociaux</div>
                <div className="grid-3">
                    {['whatsapp', 'facebook', 'instagram', 'tiktok', 'youtube', 'twitter', 'linkedin', 'pinterest', 'telegram'].map(s => (
                        <div key={s}><label className="label-pro" style={{ textTransform: 'capitalize' }}>{s}</label><input className="input-pro" value={(config as any)[s]} onChange={(e) => handleChange(s, e.target.value)} placeholder={`${s} URL`} /></div>
                    ))}
                </div>
                <div className="grid-2" style={{ marginTop: '1rem' }}>
                    <div><label className="label-pro">App Store URL</label><input className="input-pro" value={config.appStoreUrl} onChange={(e) => handleChange('appStoreUrl', e.target.value)} /></div>
                    <div><label className="label-pro">Play Store URL</label><input className="input-pro" value={config.playStoreUrl} onChange={(e) => handleChange('playStoreUrl', e.target.value)} /></div>
                </div>
            </div>

            <div className="settings-card">
                <div className="settings-card-header">📧 Newsletter</div>
                <div className="toggle-row"><label><input type="checkbox" checked={config.showNewsletter} onChange={(e) => handleChange('showNewsletter', e.target.checked)} /> Activer la section Newsletter</label></div>
                {config.showNewsletter && (
                    <div className="grid-2" style={{ marginTop: '1rem' }}>
                        <div><label className="label-pro">Titre</label><input className="input-pro" value={config.newsletterTitle} onChange={(e) => handleChange('newsletterTitle', e.target.value)} /></div>
                        <div><label className="label-pro">Sous-titre</label><input className="input-pro" value={config.newsletterSubtitle} onChange={(e) => handleChange('newsletterSubtitle', e.target.value)} /></div>
                        <div><label className="label-pro">Texte du bouton</label><input className="input-pro" value={config.newsletterBtnText} onChange={(e) => handleChange('newsletterBtnText', e.target.value)} /></div>
                        <ColorField label="Couleur du bouton" value={config.newsletterBtnColor} onChange={(v) => handleChange('newsletterBtnColor', v)} />
                    </div>
                )}
            </div>

            <div className="settings-card">
                <div className="settings-card-header" style={{ justifyContent: 'space-between' }}>
                    <span>🔗 Groupes de liens</span>
                    <button className="btn-pro" style={{ fontSize: '0.65rem', padding: '3px 8px' }} onClick={addLinkGroup}>+ Groupe</button>
                </div>
                <div className="stack">
                    {(config.linkGroups || []).map((group: any, gIdx: number) => (
                        <div key={gIdx} style={{ padding: '1rem', border: '1px solid var(--builder-border)', borderRadius: '8px' }}>
                            <div style={{ display: 'flex', gap: '8px', marginBottom: '0.75rem' }}>
                                <input className="input-pro" style={{ fontWeight: 700 }} value={group.title} onChange={(e) => updateGroupTitle(gIdx, e.target.value)} />
                                <button className="btn-pro btn-pro-danger" style={{ fontSize: '0.6rem', padding: '2px 6px', whiteSpace: 'nowrap' }} onClick={() => removeGroup(gIdx)}>✕</button>
                            </div>
                            <div className="stack">
                                {group.links.map((link: any, lIdx: number) => (
                                    <div key={lIdx} style={{ display: 'flex', gap: '6px' }}>
                                        <input className="input-pro" style={{ flex: 1 }} value={link.label} onChange={(e) => updateLinkInGroup(gIdx, lIdx, 'label', e.target.value)} />
                                        <input className="input-pro" style={{ flex: 2 }} value={link.link} onChange={(e) => updateLinkInGroup(gIdx, lIdx, 'link', e.target.value)} />
                                        <button onClick={() => removeLinkFromGroup(gIdx, lIdx)} style={{ border: 'none', color: '#ef4444', background: 'none', cursor: 'pointer' }}>✕</button>
                                    </div>
                                ))}
                                <button className="btn-pro" style={{ fontSize: '0.6rem', padding: '3px 8px', alignSelf: 'flex-start' }} onClick={() => addLinkToGroup(gIdx)}>+ Lien</button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="settings-card">
                <div className="settings-card-header">💳 Paiement et Confiance</div>
                <div className="toggle-row"><label><input type="checkbox" checked={config.showPaymentIcons} onChange={(e) => handleChange('showPaymentIcons', e.target.checked)} /> Afficher les icônes de paiement</label></div>
                <div style={{ marginTop: '1rem' }}><label className="label-pro">Méthodes (séparées par des virgules)</label><input className="input-pro" value={(config.paymentMethods || []).join(', ')} onChange={(e) => handleChange('paymentMethods', e.target.value.split(',').map((s: string) => s.trim()))} /></div>
                <div className="grid-2" style={{ marginTop: '1rem' }}>
                    <ColorField label="Fond barre du bas" value={config.bottomBarBg} onChange={(v) => handleChange('bottomBarBg', v)} />
                    <ColorField label="Texte barre du bas" value={config.bottomBarText} onChange={(v) => handleChange('bottomBarText', v)} />
                </div>
            </div>
        </div>
    );
};
