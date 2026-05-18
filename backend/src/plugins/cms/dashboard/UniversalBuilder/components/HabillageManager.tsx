import React, { useState, useEffect } from 'react';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { Select } from '../../ui/select';
import { Textarea } from '../../ui/textarea';
import { Dialog, DialogFooter } from '../../ui/dialog';
import { Badge } from '../../ui/badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../ui/table';

import { fetchGraphQL } from '../../lib/utils';

const FETCH_HABILLAGES = `query { habillages { id name description thumbnail isBuiltIn isDefault isBackup status createdAt updatedAt } }`;
const FETCH_SEASONS = `query { siteSeasons { id name startDate endDate isActive preset { id name } configJson } }`;
const FETCH_PAGES = `query { pages { items { id slug title } } }`;

const UPDATE_PRESET = `mutation UpdatePreset($input: UpdatePresetInput!) { updatePreset(input: $input) { id name } }`;
const DELETE_HABILLAGE = `mutation DeleteHabillage($id: ID!) { deleteHabillage(id: $id) { result } }`;
const SET_HABILLAGE_DEFAULT = `mutation SetHabillageDefault($presetId: ID!) { setHabillageDefault(presetId: $presetId) { id isDefault } }`;
const UNSET_HABILLAGE_DEFAULT = `mutation UnsetHabillageDefault($presetId: ID!) { unsetHabillageDefault(presetId: $presetId) { id isDefault } }`;
const PUBLISH_HABILLAGE = `mutation PublishHabillage($presetId: ID!, $pageId: ID!) { publishHabillage(presetId: $presetId, pageId: $pageId) { id } }`;
const CREATE_INSTANT_HABILLAGE = `mutation CreateInstantHabillage($name: String!) { createInstantHabillage(name: $name) { id name } }`;

const CREATE_SEASON = `mutation CreateSeason($input: CreateSeasonInput!) { createSeason(input: $input) { id name } }`;
const UPDATE_SEASON = `mutation UpdateSeason($input: UpdateSeasonInput!) { updateSeason(input: $input) { id name } }`;
const DELETE_SEASON = `mutation DeleteSeason($id: ID!) { deleteSeason(id: $id) { result } }`;

const ARCHIVE_PRESET = `mutation ArchivePreset($presetId: ID!) { archivePreset(presetId: $presetId) { id status } }`;
const RESTORE_PRESET = `mutation RestorePresetVersion($presetId: ID!) { restorePresetVersion(presetId: $presetId) { id status } }`;

async function gql(query: string, variables?: any) {
    return fetchGraphQL(query, variables);
}

export const HabillageManager = ({ onOpenInEditor }: { onOpenInEditor?: (presetId: string) => void }) => {
    const [tab, setTab] = useState<'habillages' | 'seasons'>('habillages');
    const [habillages, setHabillages] = useState<any[]>([]);
    const [seasons, setSeasons] = useState<any[]>([]);
    const [pages, setPages] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // Edit modal state
    const [editing, setEditing] = useState<any | null>(null);
    const [editName, setEditName] = useState('');
    const [editDesc, setEditDesc] = useState('');
    const [editThumb, setEditThumb] = useState('');

    // Season edit
    const [editingSeason, setEditingSeason] = useState<any | null>(null);
    const [seasonName, setSeasonName] = useState('');
    const [seasonStart, setSeasonStart] = useState('');
    const [seasonEnd, setSeasonEnd] = useState('');
    const [seasonPresetId, setSeasonPresetId] = useState('');
    const [seasonActive, setSeasonActive] = useState(false);

    const loadData = async () => {
        setLoading(true);
        setError('');
        try {
            const [habillageData, seasonData, pageData] = await Promise.all([
                gql(FETCH_HABILLAGES),
                gql(FETCH_SEASONS),
                gql(FETCH_PAGES),
            ]);
            setHabillages(habillageData.habillages || []);
            setSeasons(seasonData.siteSeasons || []);
            setPages(pageData.pages?.items || []);
        } catch (e: any) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadData(); }, []);

    const homePage = pages.find((p: any) => p.slug === 'home');

    // Categorize habillages
    const activeHabillage = habillages.find((h: any) => h.isDefault) || null;
    const allHabillages = habillages.filter((h: any) => !h.isBackup);
    const backupHabillages = habillages.filter((h: any) => h.isBackup);

    // --- Habillage Actions ---
    const handleCreateInstant = async () => {
        const name = prompt('Nom du nouvel habillage :');
        if (!name) return;
        try {
            await gql(CREATE_INSTANT_HABILLAGE, { name });
            await loadData();
        } catch (e: any) { alert('Erreur: ' + e.message); }
    };

    const handlePublish = async (presetId: string) => {
        if (!homePage) return alert('Page "home" introuvable');
        if (!confirm('Publier cet habillage ? Il remplacera la version actuelle du site.')) return;
        try {
            await gql(PUBLISH_HABILLAGE, { presetId, pageId: homePage.id });
            alert('Habillage publié avec succès !');
            await loadData();
        } catch (e: any) { alert('Erreur: ' + e.message); }
    };

    const handleDelete = async (id: string, isDefault: boolean) => {
        if (!confirm('Supprimer cet habillage définitivement ?')) return;
        try {
            await gql(DELETE_HABILLAGE, { id });
            await loadData();
        } catch (e: any) { alert('Erreur: ' + e.message); }
    };

    const handleSetDefault = async (presetId: string) => {
        if (!confirm('Définir cet habillage comme défaut ? Il sera l\'habillage de secours après les saisons.')) return;
        try {
            await gql(SET_HABILLAGE_DEFAULT, { presetId });
            await loadData();
        } catch (e: any) { alert('Erreur: ' + e.message); }
    };

    const handleUnsetDefault = async (presetId: string) => {
        if (!confirm('Retirer le statut par défaut ?')) return;
        try {
            await gql(UNSET_HABILLAGE_DEFAULT, { presetId });
            await loadData();
        } catch (e: any) { alert('Erreur: ' + e.message); }
    };

    const handleEdit = (preset: any) => {
        setEditing(preset);
        setEditName(preset.name);
        setEditDesc(preset.description || '');
        setEditThumb(preset.thumbnail || '');
    };

    const handleSaveEdit = async () => {
        if (!editing) return;
        try {
            await gql(UPDATE_PRESET, { input: { id: editing.id, name: editName, description: editDesc, thumbnail: editThumb } });
            setEditing(null);
            await loadData();
        } catch (e: any) { alert('Erreur: ' + e.message); }
    };

    const handleArchive = async (presetId: string) => {
        if (!confirm('Archiver cet habillage ?')) return;
        try {
            await gql(ARCHIVE_PRESET, { presetId });
            await loadData();
        } catch (e: any) { alert('Erreur: ' + e.message); }
    };

    const handleRestore = async (presetId: string) => {
        try {
            await gql(RESTORE_PRESET, { presetId });
            await loadData();
        } catch (e: any) { alert('Erreur: ' + e.message); }
    };

    // --- Season Actions ---
    const handleEditSeason = (season?: any) => {
        if (season) {
            setEditingSeason(season);
            setSeasonName(season.name);
            setSeasonStart(season.startDate ? new Date(season.startDate).toISOString().slice(0, 16) : '');
            setSeasonEnd(season.endDate ? new Date(season.endDate).toISOString().slice(0, 16) : '');
            setSeasonPresetId(season.preset?.id || '');
            setSeasonActive(season.isActive);
        } else {
            setEditingSeason({});
            setSeasonName('');
            setSeasonStart('');
            setSeasonEnd('');
            setSeasonPresetId('');
            setSeasonActive(false);
        }
    };

    const handleSaveSeason = async () => {
        try {
            const input: any = { name: seasonName, startDate: seasonStart || null, endDate: seasonEnd || null, isActive: seasonActive, presetId: seasonPresetId || null };
            if (editingSeason?.id) {
                input.id = editingSeason.id;
                await gql(UPDATE_SEASON, { input });
            } else {
                await gql(CREATE_SEASON, { input });
            }
            setEditingSeason(null);
            await loadData();
        } catch (e: any) { alert('Erreur: ' + e.message); }
    };

    const handleDeleteSeason = async (id: string) => {
        if (!confirm('Supprimer cette saison ?')) return;
        try {
            await gql(DELETE_SEASON, { id });
            await loadData();
        } catch (e: any) { alert('Erreur: ' + e.message); }
    };

    // Render a habillage card
    const renderHabillageCard = (h: any) => (
        <div key={h.id} className={`border rounded-xl p-3.5 ${h.isDefault ? 'border-emerald-400 bg-emerald-50' : h.isBackup ? 'border-amber-300 bg-amber-50' : 'border-[var(--builder-border)] bg-white'}`}>
            <div className="flex justify-between items-center mb-1.5">
                <span className="font-bold text-sm">{h.name}</span>
                <div className="flex gap-1">
                    {h.isDefault && <Badge variant="default" className="text-[9px] bg-emerald-600">DÉFAUT</Badge>}
                    {h.isBackup && <Badge variant="secondary" className="text-[9px] bg-amber-100 text-amber-700">BACKUP</Badge>}
                    {h.isBuiltIn && <Badge variant="secondary" className="text-[9px]">INTÉGRÉ</Badge>}
                    {h.status === 'archived' && <Badge variant="secondary" className="text-[9px]">ARCHIVÉ</Badge>}
                </div>
            </div>
            {h.description && <p className="text-xs text-[var(--builder-text-muted)] mt-1 mb-2">{h.description}</p>}
            {h.thumbnail && <img src={h.thumbnail} alt={h.name} className="w-full h-20 object-cover rounded-md mb-2" />}
            <div className="flex gap-1.5 flex-wrap">
                {onOpenInEditor && (
                    <Button size="sm" onClick={() => onOpenInEditor(h.id)}>📝 Ouvrir</Button>
                )}
                <Button size="sm" onClick={() => handlePublish(h.id)}>✅ Publier</Button>
                <Button variant="outline" size="sm" onClick={() => handleEdit(h)}>✏️</Button>
                {!h.isDefault ? (
                    <Button variant="outline" size="sm" onClick={() => handleSetDefault(h.id)} title="Définir comme défaut">
                        🏆
                    </Button>
                ) : (
                    <Button variant="outline" size="sm" onClick={() => handleUnsetDefault(h.id)} title="Retirer le statut défaut">
                        🏳️
                    </Button>
                )}
                {h.status === 'archived' ? (
                    <Button variant="outline" size="sm" onClick={() => handleRestore(h.id)}>♻️</Button>
                ) : (
                    <Button variant="destructive" size="sm" onClick={() => handleDelete(h.id, h.isDefault)}>🗑️</Button>
                )}
            </div>
        </div>
    );

    return (
        <div className="p-5 max-w-[900px] mx-auto">
            <h2 className="text-xl font-extrabold mb-4">🎨 Habillages & Saisons</h2>

            {/* Tab Switcher */}
            <div className="flex gap-2 mb-5">
                <Button
                    variant={tab === 'habillages' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setTab('habillages')}
                >
                    🏪 Habillages ({habillages.length})
                </Button>
                <Button
                    variant={tab === 'seasons' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setTab('seasons')}
                >
                    📅 Saisons ({seasons.length})
                </Button>
            </div>

            {error && <div className="text-red-500 mb-3 text-sm">❌ {error}</div>}

            {/* HABILLAGES TAB */}
            {tab === 'habillages' && (
                <div>
                    <div className="flex justify-between mb-3">
                        <span className="text-xs text-[var(--builder-text-muted)]">Gérez les habillages de votre boutique</span>
                        <Button size="sm" onClick={handleCreateInstant}>
                            ✨ Créer un habillage instantané
                        </Button>
                    </div>

                    {loading ? (
                        <div className="text-center py-10 text-[var(--builder-text-muted)]">Chargement...</div>
                    ) : (
                        <div className="space-y-6">
                            {/* Section 1: Habillage Actif */}
                            <section>
                                <h3 className="text-sm font-extrabold text-emerald-700 mb-2 flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                                    Habillage Actif
                                </h3>
                                {activeHabillage ? (
                                    <div className="grid grid-cols-[repeat(auto-fill,minmax(250px,1fr))] gap-3">
                                        {renderHabillageCard(activeHabillage)}
                                    </div>
                                ) : (
                                    <div className="text-center py-6 border-2 border-dashed border-amber-300 rounded-xl bg-amber-50 text-amber-700 text-sm">
                                        ⚠️ Aucun habillage par défaut défini. Définissez un habillage comme défaut pour le fallback.
                                    </div>
                                )}
                            </section>

                            {/* Section 2: Tous les Habillages */}
                            <section>
                                <h3 className="text-sm font-extrabold text-slate-700 mb-2 flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-blue-500 inline-block" />
                                    Tous les Habillages
                                    <span className="text-[10px] font-normal text-slate-400">(hors backups)</span>
                                </h3>
                                {allHabillages.length === 0 ? (
                                    <div className="text-center py-6 border-2 border-dashed border-slate-200 rounded-xl text-slate-400 text-sm">
                                        Aucun habillage. Créez-en un pour commencer.
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-[repeat(auto-fill,minmax(250px,1fr))] gap-3">
                                        {allHabillages.map(renderHabillageCard)}
                                    </div>
                                )}
                            </section>

                            {/* Section 3: Habillages Backup */}
                            <section>
                                <h3 className="text-sm font-extrabold text-amber-700 mb-2 flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />
                                    Habillages Backup
                                    <span className="text-[10px] font-normal text-amber-400">({backupHabillages.length})</span>
                                </h3>
                                {backupHabillages.length === 0 ? (
                                    <div className="text-center py-4 border-2 border-dashed border-amber-200 rounded-xl text-amber-400 text-xs">
                                        Aucun backup. Les backups sont créés automatiquement lors de la publication.
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-[repeat(auto-fill,minmax(250px,1fr))] gap-3">
                                        {backupHabillages.map(renderHabillageCard)}
                                    </div>
                                )}
                            </section>
                        </div>
                    )}
                </div>
            )}

            {/* SEASONS TAB */}
            {tab === 'seasons' && (
                <div>
                    <div className="flex justify-between mb-3">
                        <span className="text-xs text-[var(--builder-text-muted)]">Programmez des changements automatiques d'habillage</span>
                        <Button size="sm" onClick={() => handleEditSeason()}>
                            + Nouvelle saison
                        </Button>
                    </div>

                    {loading ? (
                        <div className="text-center py-10 text-[var(--builder-text-muted)]">Chargement...</div>
                    ) : seasons.length === 0 ? (
                        <div className="text-center py-10 text-[var(--builder-text-muted)] text-sm">Aucune saison configurée</div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Nom</TableHead>
                                    <TableHead>Début</TableHead>
                                    <TableHead>Fin</TableHead>
                                    <TableHead>Habillage</TableHead>
                                    <TableHead>Statut</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {seasons.map((s: any) => (
                                    <TableRow key={s.id}>
                                        <TableCell className="font-semibold">{s.name}</TableCell>
                                        <TableCell>{s.startDate ? new Date(s.startDate).toLocaleDateString('fr-FR') : '—'}</TableCell>
                                        <TableCell>{s.endDate ? new Date(s.endDate).toLocaleDateString('fr-FR') : '—'}</TableCell>
                                        <TableCell>{s.preset?.name || '—'}</TableCell>
                                        <TableCell>
                                            <Badge variant={s.isActive ? 'success' : 'secondary'}>
                                                {s.isActive ? 'ACTIF' : 'INACTIF'}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button variant="outline" size="sm" onClick={() => handleEditSeason(s)} className="mr-1">✏️</Button>
                                            <Button variant="destructive" size="sm" onClick={() => handleDeleteSeason(s.id)}>🗑️</Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </div>
            )}

            {/* EDIT PRESET MODAL */}
            <Dialog open={!!editing} onClose={() => setEditing(null)} title="✏️ Modifier l'habillage">
                <div className="space-y-3">
                    <div>
                        <Label htmlFor="edit-name">Nom</Label>
                        <Input id="edit-name" value={editName} onChange={(e) => setEditName(e.target.value)} />
                    </div>
                    <div>
                        <Label htmlFor="edit-desc">Description</Label>
                        <Textarea id="edit-desc" value={editDesc} onChange={(e) => setEditDesc(e.target.value)} rows={3} />
                    </div>
                    <div>
                        <Label htmlFor="edit-thumb">Vignette (URL)</Label>
                        <Input id="edit-thumb" value={editThumb} onChange={(e) => setEditThumb(e.target.value)} />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setEditing(null)}>Annuler</Button>
                    <Button onClick={handleSaveEdit}>💾 Enregistrer</Button>
                </DialogFooter>
            </Dialog>

            {/* EDIT SEASON MODAL */}
            <Dialog open={!!editingSeason} onClose={() => setEditingSeason(null)} title={editingSeason?.id ? '✏️ Modifier la saison' : '➕ Nouvelle saison'} width="440px">
                <div className="space-y-3">
                    <div>
                        <Label htmlFor="season-name">Nom</Label>
                        <Input id="season-name" value={seasonName} onChange={(e) => setSeasonName(e.target.value)} placeholder="ex: Black Friday, Noël..." />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <Label htmlFor="season-start">Date de début</Label>
                            <Input id="season-start" type="datetime-local" value={seasonStart} onChange={(e) => setSeasonStart(e.target.value)} />
                        </div>
                        <div>
                            <Label htmlFor="season-end">Date de fin</Label>
                            <Input id="season-end" type="datetime-local" value={seasonEnd} onChange={(e) => setSeasonEnd(e.target.value)} />
                        </div>
                    </div>
                    <div>
                        <Label htmlFor="season-preset">Habillage associé</Label>
                        <Select id="season-preset" value={seasonPresetId} onChange={(e) => setSeasonPresetId(e.target.value)}>
                            <option value="">— Aucun —</option>
                            {allHabillages.map((p: any) => (
                                <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                        </Select>
                    </div>
                    <label className="text-sm flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={seasonActive} onChange={(e) => setSeasonActive(e.target.checked)} className="rounded" />
                        Activer immédiatement
                    </label>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setEditingSeason(null)}>Annuler</Button>
                    <Button onClick={handleSaveSeason}>💾 Enregistrer</Button>
                </DialogFooter>
            </Dialog>
        </div>
    );
};
