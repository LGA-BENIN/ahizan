import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { GET_SEASONS, CREATE_SEASON, UPDATE_SEASON, DELETE_SEASON } from '../queries';
import { fetchGraphQL, cls } from '../lib/utils';

const GET_SEASON_SCHEDULES = `query { seasonSchedules { id name startAt endAt priority isActive preset { id name } } }`;
const CREATE_SEASON_SCHEDULE = `mutation CreateSeasonSchedule($input: CreateSeasonScheduleInput!) { createSeasonSchedule(input: $input) { id name } }`;
const UPDATE_SEASON_SCHEDULE = `mutation UpdateSeasonSchedule($input: UpdateSeasonScheduleInput!) { updateSeasonSchedule(input: $input) { id name } }`;
const DELETE_SEASON_SCHEDULE = `mutation DeleteSeasonSchedule($id: ID!) { deleteSeasonSchedule(id: $id) { result } }`;

export function SeasonManager() {
    const queryClient = useQueryClient();
    const [isAdding, setIsAdding] = useState(false);
    const [editingSeason, setEditingSeason] = useState<any>(null);
    const [subTab, setSubTab] = useState<'seasons' | 'schedules'>('seasons');
    const [isAddingSchedule, setIsAddingSchedule] = useState(false);
    const [editingSchedule, setEditingSchedule] = useState<any>(null);

    const { data: seasonsData, isLoading } = useQuery({
        queryKey: ['seasons'],
        queryFn: () => fetchGraphQL(GET_SEASONS)
    });

    const createMutation = useMutation({
        mutationFn: (input: any) => fetchGraphQL(CREATE_SEASON, { input }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['seasons'] });
            setIsAdding(false);
        }
    });

    const updateMutation = useMutation({
        mutationFn: (input: any) => fetchGraphQL(UPDATE_SEASON, { input }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['seasons'] });
            setEditingSeason(null);
        }
    });

    const deleteMutation = useMutation({
        mutationFn: (id: string) => fetchGraphQL(DELETE_SEASON, { id }),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['seasons'] })
    });

    const seasons = seasonsData?.siteSeasons || [];

    // SeasonSchedule queries
    const { data: schedulesData, isLoading: loadingSchedules } = useQuery({
        queryKey: ['seasonSchedules'],
        queryFn: () => fetchGraphQL(GET_SEASON_SCHEDULES)
    });

    const createScheduleMutation = useMutation({
        mutationFn: (input: any) => fetchGraphQL(CREATE_SEASON_SCHEDULE, { input }),
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['seasonSchedules'] }); setIsAddingSchedule(false); }
    });

    const updateScheduleMutation = useMutation({
        mutationFn: (input: any) => fetchGraphQL(UPDATE_SEASON_SCHEDULE, { input }),
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['seasonSchedules'] }); setEditingSchedule(null); }
    });

    const deleteScheduleMutation = useMutation({
        mutationFn: (id: string) => fetchGraphQL(DELETE_SEASON_SCHEDULE, { id }),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['seasonSchedules'] })
    });

    const schedules = schedulesData?.seasonSchedules || [];

    if (isLoading) return <div>Chargement des saisons...</div>;

    return (
        <div style={{ padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <h2 style={{ fontSize: '24px', fontWeight: '800', margin: 0 }}>📅 Gestion des Saisons</h2>
                <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                        onClick={() => setSubTab('seasons')}
                        style={{ padding: '6px 14px', borderRadius: '6px', border: 'none', background: subTab === 'seasons' ? '#002f6c' : '#f1f5f9', color: subTab === 'seasons' ? '#fff' : '#64748b', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.75rem' }}
                    >Saisons</button>
                    <button
                        onClick={() => setSubTab('schedules')}
                        style={{ padding: '6px 14px', borderRadius: '6px', border: 'none', background: subTab === 'schedules' ? '#002f6c' : '#f1f5f9', color: subTab === 'schedules' ? '#fff' : '#64748b', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.75rem' }}
                    >Programmation</button>
                    <button 
                        onClick={() => subTab === 'seasons' ? setIsAdding(true) : setIsAddingSchedule(true)}
                        className={cls.btnPrimary}
                    >
                        + {subTab === 'seasons' ? 'Nouvelle Saison' : 'Nouvelle Programmation'}
                    </button>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '20px' }}>
                {subTab === 'seasons' && seasons.map((s: any) => (
                    <div key={s.id} className={cls.card} style={{ border: s.isActive ? '2px solid #059669' : '1px solid #e2e8f0' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '700' }}>{s.name}</h3>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <button onClick={() => setEditingSeason(s)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>✏️</button>
                                <button onClick={() => confirm('Supprimer ?') && deleteMutation.mutate(s.id)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>🗑️</button>
                            </div>
                        </div>
                        
                        <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '16px' }}>
                            <div>🗓️ {s.startDate ? new Date(s.startDate).toLocaleDateString() : 'N/A'} - {s.endDate ? new Date(s.endDate).toLocaleDateString() : 'N/A'}</div>
                            <div style={{ marginTop: '4px' }}>
                                <span className={cls.badge} style={{ background: s.isActive ? '#d1fae5' : '#f1f5f9', color: s.isActive ? '#065f46' : '#64748b' }}>
                                    {s.isActive ? 'Active' : 'Inactive'}
                                </span>
                                {s.preset && <span style={{ marginLeft: '8px' }}>📦 Preset: {s.preset.name}</span>}
                            </div>
                        </div>

                        <button 
                            onClick={() => updateMutation.mutate({ id: s.id, isActive: !s.isActive })}
                            style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0', background: s.isActive ? '#fff' : '#002f6c', color: s.isActive ? '#1e293b' : '#fff', fontWeight: 'bold', cursor: 'pointer' }}
                        >
                            {s.isActive ? 'Désactiver' : 'Activer'}
                        </button>
                    </div>
                ))}
            </div>

            {subTab === 'schedules' && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '20px' }}>
                    {loadingSchedules ? <div>Chargement...</div> : schedules.length === 0 ? <div style={{ color: '#64748b', textAlign: 'center', padding: '40px' }}>Aucune programmation configurée</div> : schedules.map((s: any) => (
                        <div key={s.id} className={cls.card} style={{ border: s.isActive ? '2px solid #059669' : '1px solid #e2e8f0' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '700' }}>{s.name}</h3>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <button onClick={() => setEditingSchedule(s)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>✏️</button>
                                    <button onClick={() => confirm('Supprimer ?') && deleteScheduleMutation.mutate(s.id)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>🗑️</button>
                                </div>
                            </div>
                            <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '16px' }}>
                                <div>🗓️ {s.startAt ? new Date(s.startAt).toLocaleDateString() : 'N/A'} - {s.endAt ? new Date(s.endAt).toLocaleDateString() : 'N/A'}</div>
                                <div style={{ marginTop: '4px', display: 'flex', gap: '8px', alignItems: 'center' }}>
                                    <span className={cls.badge} style={{ background: s.isActive ? '#d1fae5' : '#f1f5f9', color: s.isActive ? '#065f46' : '#64748b' }}>
                                        {s.isActive ? 'Active' : 'Inactive'}
                                    </span>
                                    <span style={{ background: '#fef3c7', color: '#92400e', padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold' }}>
                                        ⚡ Priorité: {s.priority}
                                    </span>
                                    {s.preset && <span>📦 {s.preset.name}</span>}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {(isAdding || editingSeason) && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
                    <div className={cls.card} style={{ width: '500px', padding: '32px' }}>
                        <h3 style={{ marginTop: 0 }}>{isAdding ? 'Nouvelle Saison' : 'Modifier Saison'}</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div>
                                <label className={cls.label}>Nom</label>
                                <input 
                                    className={cls.input} 
                                    defaultValue={editingSeason?.name || ''} 
                                    id="season-name"
                                />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                <div>
                                    <label className={cls.label}>Début</label>
                                    <input 
                                        type="date" 
                                        className={cls.input} 
                                        defaultValue={editingSeason?.startDate?.split('T')[0] || ''} 
                                        id="season-start"
                                    />
                                </div>
                                <div>
                                    <label className={cls.label}>Fin</label>
                                    <input 
                                        type="date" 
                                        className={cls.input} 
                                        defaultValue={editingSeason?.endDate?.split('T')[0] || ''} 
                                        id="season-end"
                                    />
                                </div>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
                                <button onClick={() => { setIsAdding(false); setEditingSeason(null); }} className={cls.btnSecondary}>Annuler</button>
                                <button 
                                    onClick={() => {
                                        const name = (document.getElementById('season-name') as HTMLInputElement).value;
                                        const startDate = (document.getElementById('season-start') as HTMLInputElement).value;
                                        const endDate = (document.getElementById('season-end') as HTMLInputElement).value;
                                        if (isAdding) {
                                            createMutation.mutate({ name, startDate, endDate, isActive: false });
                                        } else {
                                            updateMutation.mutate({ id: editingSeason.id, name, startDate, endDate });
                                        }
                                    }}
                                    className={cls.btnPrimary}
                                >
                                    Enregistrer
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {(isAddingSchedule || editingSchedule) && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
                    <div className={cls.card} style={{ width: '500px', padding: '32px' }}>
                        <h3 style={{ marginTop: 0 }}>{isAddingSchedule ? 'Nouvelle Programmation' : 'Modifier Programmation'}</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div>
                                <label className={cls.label}>Nom</label>
                                <input className={cls.input} defaultValue={editingSchedule?.name || ''} id="schedule-name" />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                <div>
                                    <label className={cls.label}>Début</label>
                                    <input type="datetime-local" className={cls.input} defaultValue={editingSchedule?.startAt?.slice(0, 16) || ''} id="schedule-start" />
                                </div>
                                <div>
                                    <label className={cls.label}>Fin</label>
                                    <input type="datetime-local" className={cls.input} defaultValue={editingSchedule?.endAt?.slice(0, 16) || ''} id="schedule-end" />
                                </div>
                            </div>
                            <div>
                                <label className={cls.label}>Priorité (plus élevé = gagne en cas de conflit)</label>
                                <input type="number" className={cls.input} defaultValue={editingSchedule?.priority ?? 0} id="schedule-priority" min={0} />
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
                                <button onClick={() => { setIsAddingSchedule(false); setEditingSchedule(null); }} className={cls.btnSecondary}>Annuler</button>
                                <button
                                    onClick={() => {
                                        const name = (document.getElementById('schedule-name') as HTMLInputElement).value;
                                        const startAt = (document.getElementById('schedule-start') as HTMLInputElement).value;
                                        const endAt = (document.getElementById('schedule-end') as HTMLInputElement).value;
                                        const priority = parseInt((document.getElementById('schedule-priority') as HTMLInputElement).value) || 0;
                                        if (isAddingSchedule) {
                                            createScheduleMutation.mutate({ name, startAt: startAt || null, endAt: endAt || null, priority });
                                        } else {
                                            updateScheduleMutation.mutate({ id: editingSchedule.id, name, startAt: startAt || null, endAt: endAt || null, priority });
                                        }
                                    }}
                                    className={cls.btnPrimary}
                                >
                                    Enregistrer
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
