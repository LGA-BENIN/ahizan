import React, { useState, useEffect } from 'react';
import { Label } from '../../../ui/label';
import { Select } from '../../../ui/select';
import { Input } from '../../../ui/input';
import { useAutoSave } from '../useAutoSave';

interface ProductReviewsSettingsProps {
    data: any;
    onSave: (newData: any) => void;
}

export const ProductReviewsSettings = ({ data, onSave }: ProductReviewsSettingsProps) => {
    const [config, setConfig] = useState(data);
    useAutoSave(config, onSave);

    useEffect(() => {
        const defaults = {
            showReviews: true,
            title: 'Avis clients',
            maxReviews: 10,
            sortBy: 'recent',
            showRatingSummary: true,
            showReviewForm: true,
            allowPhotos: false,
            moderationEnabled: true,
            emptyMessage: 'Aucun avis pour le moment. Soyez le premier à donner votre avis !',
        };
        setConfig({ ...defaults, ...data });
    }, [data]);

    const handleChange = (field: string, value: any) => setConfig({ ...config, [field]: value });

    return (
        <div className="stack-lg" style={{ width: "100%", height: "100%", maxHeight: "calc(100vh - 200px)", overflowY: "auto" }}>
            <div className="settings-card">
                <div className="settings-card-header">⭐ Section Avis Clients</div>
                <div className="toggle-row">
                    <label><input type="checkbox" checked={config.showReviews} onChange={(e) => handleChange('showReviews', e.target.checked)} /> Activer la section avis</label>
                </div>
            </div>

            {config.showReviews && (
                <>
                    <div className="settings-card">
                        <div className="settings-card-header">📝 Configuration</div>
                        <div className="grid-2">
                            <div>
                                <Label htmlFor="pr-title">Titre de la section</Label>
                                <Input id="pr-title" value={config.title} onChange={(e) => handleChange('title', e.target.value)} />
                            </div>
                            <div>
                                <Label htmlFor="pr-max">Nombre d'avis à afficher</Label>
                                <Select id="pr-max" value={config.maxReviews} onChange={(e) => handleChange('maxReviews', parseInt(e.target.value))}>
                                    <option value={3}>3 avis</option>
                                    <option value={5}>5 avis</option>
                                    <option value={10}>10 avis</option>
                                    <option value={20}>20 avis</option>
                                    <option value={0}>Tous</option>
                                </Select>
                            </div>
                        </div>
                        <div className="mt-4">
                            <Label htmlFor="pr-sort">Tri par défaut</Label>
                            <Select id="pr-sort" value={config.sortBy} onChange={(e) => handleChange('sortBy', e.target.value)}>
                                <option value="recent">Plus récents</option>
                                <option value="rating-high">Mieux notés</option>
                                <option value="rating-low">Moins bien notés</option>
                                <option value="helpful">Les plus utiles</option>
                            </Select>
                        </div>
                    </div>

                    <div className="settings-card">
                        <div className="settings-card-header">⚙️ Options</div>
                        <div className="grid-2">
                            <div className="toggle-row"><label><input type="checkbox" checked={config.showRatingSummary} onChange={(e) => handleChange('showRatingSummary', e.target.checked)} /> Résumé des notes (barre de progression)</label></div>
                            <div className="toggle-row"><label><input type="checkbox" checked={config.showReviewForm} onChange={(e) => handleChange('showReviewForm', e.target.checked)} /> Formulaire d'ajout d'avis</label></div>
                        </div>
                        <div className="grid-2 mt-2">
                            <div className="toggle-row"><label><input type="checkbox" checked={config.allowPhotos} onChange={(e) => handleChange('allowPhotos', e.target.checked)} /> Permettre les photos dans les avis</label></div>
                            <div className="toggle-row"><label><input type="checkbox" checked={config.moderationEnabled} onChange={(e) => handleChange('moderationEnabled', e.target.checked)} /> Modération activée</label></div>
                        </div>
                    </div>

                    <div className="settings-card">
                        <div className="settings-card-header">📭 État vide</div>
                        <div>
                            <Label htmlFor="pr-empty">Message quand aucun avis</Label>
                            <Input id="pr-empty" value={config.emptyMessage} onChange={(e) => handleChange('emptyMessage', e.target.value)} />
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};
