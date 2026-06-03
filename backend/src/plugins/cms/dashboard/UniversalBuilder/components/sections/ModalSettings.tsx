import React, { useState, useEffect } from 'react';
import { FileUploadField } from './FileUploadField';
import { useAutoSave } from '../useAutoSave';

interface ModalSettingsProps {
    data: any;
    onSave: (newData: any) => void;
}

export const ModalSettings = ({ data, onSave }: ModalSettingsProps) => {
    const [config, setConfig] = useState(data);
    useAutoSave(config, onSave);
    const modals = config.modals || [];

    useEffect(() => { setConfig(data); }, [data]);

    const handleUpdate = (newModals: any[]) => setConfig({ ...config, modals: newModals });

    const addModal = () => handleUpdate([...modals, {
        enabled: true, type: 'image', value: '', link: '', delay: 2, duration: 0, isClosable: true,
        position: 'center', size: 'md', overlayColor: 'rgba(0,0,0,0.5)', overlayBlur: 0,
        borderRadius: '16px', animation: 'fade', showOnce: true, triggerType: 'timer',
        bgColor: '#ffffff', textColor: '#1e293b', padding: '0px',
        title: '', buttonText: '', buttonLink: '', buttonColor: '#2563eb'
    }]);

    const removeModal = (i: number) => handleUpdate(modals.filter((_: any, idx: number) => idx !== i));
    const updateField = (i: number, field: string, value: any) => handleUpdate(modals.map((m: any, idx: number) => idx === i ? { ...m, [field]: value } : m));

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
        <div className="stack-lg" style={{ width: '100%', maxWidth: '900px', height: '100%', maxHeight: 'calc(100vh - 200px)', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>📢 Gestionnaire de fenêtres surgissantes</h3>
                    <p style={{ margin: '4px 0 0', fontSize: '0.75rem', color: 'var(--builder-text-muted)' }}>{modals.length} fenêtre(s) configurée(s)</p>
                </div>
                <button className="btn-pro btn-pro-primary" onClick={addModal}>+ Ajouter une fenêtre</button>
            </div>

            {modals.length === 0 && (
                <div style={{ padding: '3rem', textAlign: 'center', border: '1px dashed var(--builder-border)', borderRadius: '12px', color: 'var(--builder-text-muted)' }}>
                    Aucune fenêtre pour le moment. Cliquez sur "Ajouter une fenêtre" pour créer un popup.
                </div>
            )}

            {modals.map((m: any, idx: number) => (
                <div key={idx} className="settings-card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', paddingBottom: '0.75rem', borderBottom: '1px solid var(--builder-border)' }}>
                        <div style={{ fontWeight: 700, fontSize: '0.8rem' }}>Fenêtre #{idx + 1}</div>
                        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                            <label style={{ fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                                <input type="checkbox" checked={m.enabled} onChange={(e) => updateField(idx, 'enabled', e.target.checked)} />
                                {m.enabled ? '● Active' : '○ Inactive'}
                            </label>
                            <button className="btn-pro btn-pro-danger" style={{ padding: '4px 10px', fontSize: '0.65rem' }} onClick={() => removeModal(idx)}>Supprimer</button>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="grid-2" style={{ marginBottom: '1rem' }}>
                        <div>
                            <label className="label-pro">Type de contenu</label>
                            <select className="input-pro" value={m.type} onChange={(e) => updateField(idx, 'type', e.target.value)}>
                                <option value="image">📷 Image promotionnelle</option>
                                <option value="text">✍️ Texte enrichi / HTML</option>
                                <option value="video">🎥 Vidéo</option>
                                <option value="newsletter">📧 Formulaire Newsletter</option>
                            </select>
                        </div>
                        <div>
                            <label className="label-pro">Titre (Optionnel)</label>
                            <input className="input-pro" value={m.title || ''} onChange={(e) => updateField(idx, 'title', e.target.value)} placeholder="Titre promo..." />
                        </div>
                    </div>

                    {m.type === 'image' && (
                        <div style={{ marginBottom: '1rem' }}>
                            <FileUploadField label="Image promotionnelle" value={m.value} onChange={(v) => updateField(idx, 'value', v)} accept="image/*,image/gif" />
                            <div style={{ marginTop: '0.5rem' }}>
                                <label className="label-pro">URL de redirection (destination du clic)</label>
                                <input className="input-pro" value={m.link || ''} onChange={(e) => updateField(idx, 'link', e.target.value)} placeholder="https://..." />
                            </div>
                        </div>
                    )}
                    {m.type === 'text' && (
                        <div style={{ marginBottom: '1rem' }}>
                            <label className="label-pro">Contenu (HTML supporté)</label>
                            <textarea className="input-pro" style={{ minHeight: '100px' }} value={m.value} onChange={(e) => updateField(idx, 'value', e.target.value)} />
                        </div>
                    )}
                    {m.type === 'video' && (
                        <div style={{ marginBottom: '1rem' }}>
                            <FileUploadField label="Vidéo (MP4 / URL YouTube)" value={m.value} onChange={(v) => updateField(idx, 'value', v)} accept="video/mp4,video/webm" />
                        </div>
                    )}

                    {/* Button */}
                    <div className="grid-3" style={{ marginBottom: '1rem' }}>
                        <div><label className="label-pro">Texte du bouton</label><input className="input-pro" value={m.buttonText || ''} onChange={(e) => updateField(idx, 'buttonText', e.target.value)} placeholder="Laisser vide = pas de bouton" /></div>
                        <div><label className="label-pro">Lien du bouton</label><input className="input-pro" value={m.buttonLink || ''} onChange={(e) => updateField(idx, 'buttonLink', e.target.value)} /></div>
                        <ColorField label="Couleur du bouton" value={m.buttonColor || '#2563eb'} onChange={(v) => updateField(idx, 'buttonColor', v)} />
                    </div>

                    {/* Appearance */}
                    <div style={{ padding: '1rem', background: 'var(--builder-panel-bg)', borderRadius: '8px', marginBottom: '1rem' }}>
                        <div style={{ fontWeight: 700, fontSize: '0.7rem', color: 'var(--builder-text-muted)', marginBottom: '0.75rem', textTransform: 'uppercase' }}>Apparence</div>
                        <div className="grid-3">
                            <ColorField label="Arrière-plan" value={m.bgColor || '#ffffff'} onChange={(v) => updateField(idx, 'bgColor', v)} />
                            <ColorField label="Couleur du texte" value={m.textColor || '#1e293b'} onChange={(v) => updateField(idx, 'textColor', v)} />
                            <div>
                                <label className="label-pro">Taille</label>
                                <select className="input-pro" value={m.size || 'md'} onChange={(e) => updateField(idx, 'size', e.target.value)}>
                                    <option value="sm">Petite (400px)</option>
                                    <option value="md">Moyenne (560px)</option>
                                    <option value="lg">Grande (720px)</option>
                                    <option value="xl">XL (900px)</option>
                                    <option value="fullscreen">Plein écran</option>
                                </select>
                            </div>
                        </div>
                        <div className="grid-3" style={{ marginTop: '1rem' }}>
                            <div>
                                <label className="label-pro">Position</label>
                                <select className="input-pro" value={m.position || 'center'} onChange={(e) => updateField(idx, 'position', e.target.value)}>
                                    <option value="center">Centré</option>
                                    <option value="bottom">Panneau inférieur</option>
                                    <option value="top">Barre supérieure</option>
                                    <option value="bottom-right">En bas à droite</option>
                                </select>
                            </div>
                            <div>
                                <label className="label-pro">Animation</label>
                                <select className="input-pro" value={m.animation || 'fade'} onChange={(e) => updateField(idx, 'animation', e.target.value)}>
                                    <option value="fade">Fondu</option>
                                    <option value="zoom">Zoom</option>
                                    <option value="slide-up">Glissement vers le haut</option>
                                    <option value="slide-down">Glissement vers le bas</option>
                                </select>
                            </div>
                            <div>
                                <label className="label-pro">Rayon des angles</label>
                                <select className="input-pro" value={m.borderRadius || '16px'} onChange={(e) => updateField(idx, 'borderRadius', e.target.value)}>
                                    <option value="0px">Anguleux</option>
                                    <option value="8px">Petit</option>
                                    <option value="16px">Moyen</option>
                                    <option value="24px">Grand</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Timing */}
                    <div style={{ padding: '1rem', background: 'var(--builder-panel-bg)', borderRadius: '8px' }}>
                        <div style={{ fontWeight: 700, fontSize: '0.7rem', color: 'var(--builder-text-muted)', marginBottom: '0.75rem', textTransform: 'uppercase' }}>Planification et déclencheur</div>
                        <div className="grid-3">
                            <div>
                                <label className="label-pro">Déclencheur</label>
                                <select className="input-pro" value={m.triggerType || 'timer'} onChange={(e) => updateField(idx, 'triggerType', e.target.value)}>
                                    <option value="timer">Après un délai</option>
                                    <option value="scroll">Au défilement (%)</option>
                                    <option value="exit">Intention de sortie</option>
                                    <option value="immediate">Immédiatement</option>
                                </select>
                            </div>
                            <div>
                                <label className="label-pro">Délai (secondes)</label>
                                <input type="number" className="input-pro" value={m.delay} onChange={(e) => updateField(idx, 'delay', parseInt(e.target.value) || 0)} />
                            </div>
                            <div>
                                <label className="label-pro">Fermeture auto (sec)</label>
                                <input type="number" className="input-pro" value={m.duration} onChange={(e) => updateField(idx, 'duration', parseInt(e.target.value) || 0)} />
                                <div style={{ fontSize: '0.6rem', color: 'var(--builder-text-soft)', marginTop: '3px' }}>0 = fermeture manuelle uniquement</div>
                            </div>
                        </div>
                        <div className="grid-2" style={{ marginTop: '1rem' }}>
                            <div className="toggle-row"><label><input type="checkbox" checked={m.isClosable} onChange={(e) => updateField(idx, 'isClosable', e.target.checked)} /> L'utilisateur peut fermer</label></div>
                            <div className="toggle-row"><label><input type="checkbox" checked={m.showOnce} onChange={(e) => updateField(idx, 'showOnce', e.target.checked)} /> Afficher une seule fois par session</label></div>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
};
