import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

const GET_PLATFORM_SETTINGS = `
    query GetPlatformSettings {
        platformSettings {
            id
            platformName
            defaultCommissionRate
            showVendorContact
            vendorContactFields
            defaultCurrencyCode
            defaultPhonePrefix
            emailVerificationRequired
            vendorAutoApproval
            placeholderEmailDomain
        }
    }
`;

const UPDATE_PLATFORM_SETTINGS = `
    mutation UpdatePlatformSettings($input: UpdatePlatformSettingsInput!) {
        updatePlatformSettings(input: $input) {
            id
            platformName
            defaultCommissionRate
            showVendorContact
            vendorContactFields
            defaultCurrencyCode
            defaultPhonePrefix
            emailVerificationRequired
            vendorAutoApproval
            placeholderEmailDomain
        }
    }
`;

async function fetchGraphQL(query: string, variables?: any) {
    const res = await fetch('/admin-api', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ query, variables }),
    });
    const json = await res.json();
    if (json.errors) throw new Error(json.errors[0].message);
    return json.data;
}

export function PlatformSettingsComponent() {
    const queryClient = useQueryClient();
    const [toasts, setToasts] = useState<any[]>([]);
    const [formData, setFormData] = useState<any>({
        platformName: 'Ahizan',
        defaultCommissionRate: 10,
        showVendorContact: false,
        vendorContactFields: { phone: true, email: false, whatsapp: true, facebook: false, instagram: false, website: false },
        defaultCurrencyCode: 'XOF',
        defaultPhonePrefix: '+229',
        emailVerificationRequired: false,
        vendorAutoApproval: false,
        placeholderEmailDomain: 'ahizan.com',
    });

    const addToast = (message: string, type: 'success' | 'error') => {
        const tid = Math.random().toString(36).substring(7);
        setToasts(prev => [...prev, { id: tid, message, type }]);
        setTimeout(() => setToasts(prev => prev.filter(t => t.id !== tid)), 3000);
    };

    const { data, isLoading } = useQuery({
        queryKey: ['platformSettings'],
        queryFn: () => fetchGraphQL(GET_PLATFORM_SETTINGS),
    });

    useEffect(() => {
        if (data?.platformSettings) {
            setFormData((prev: any) => ({ ...prev, ...data.platformSettings }));
        }
    }, [data]);

    const updateMutation = useMutation({
        mutationFn: (input: any) => fetchGraphQL(UPDATE_PLATFORM_SETTINGS, { input }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['platformSettings'] });
            addToast('Paramètres mis à jour avec succès', 'success');
        },
        onError: (err: any) => addToast(err.message, 'error'),
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const { id, ...input } = formData;
        updateMutation.mutate(input);
    };

    const contactFieldKeys = ['phone', 'email', 'whatsapp', 'facebook', 'instagram', 'website'];
    const contactFieldLabels: Record<string, string> = {
        phone: 'Téléphone', email: 'Email', whatsapp: 'WhatsApp',
        facebook: 'Facebook', instagram: 'Instagram', website: 'Site web',
    };

    if (isLoading) return <div style={{ padding: 24 }}>Chargement...</div>;

    return (
        <div style={{ padding: 24, maxWidth: 800 }}>
            {toasts.map(t => (
                <div key={t.id} style={{ padding: '8px 16px', marginBottom: 8, borderRadius: 4, background: t.type === 'success' ? '#dcfce7' : '#fee2e2', color: t.type === 'success' ? '#166534' : '#991b1b' }}>
                    {t.message}
                </div>
            ))}
            <h2 style={{ fontSize: 24, fontWeight: 'bold', marginBottom: 24 }}>⚙️ Paramètres Plateforme</h2>
            <form onSubmit={handleSubmit}>
                <div style={{ display: 'grid', gap: 16 }}>
                    <fieldset style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: 16 }}>
                        <legend style={{ fontWeight: 'bold', padding: '0 8px' }}>Informations générales</legend>
                        <label style={{ display: 'block', marginBottom: 8 }}>
                            <span style={{ display: 'block', fontWeight: 500, marginBottom: 4 }}>Nom de la plateforme</span>
                            <input type="text" value={formData.platformName} onChange={e => setFormData({ ...formData, platformName: e.target.value })} style={{ width: '100%', padding: '6px 10px', border: '1px solid #d1d5db', borderRadius: 4 }} />
                        </label>
                        <label style={{ display: 'block', marginBottom: 8 }}>
                            <span style={{ display: 'block', fontWeight: 500, marginBottom: 4 }}>Devise par défaut</span>
                            <input type="text" value={formData.defaultCurrencyCode} onChange={e => setFormData({ ...formData, defaultCurrencyCode: e.target.value })} style={{ width: '100%', padding: '6px 10px', border: '1px solid #d1d5db', borderRadius: 4 }} />
                        </label>
                        <label style={{ display: 'block', marginBottom: 8 }}>
                            <span style={{ display: 'block', fontWeight: 500, marginBottom: 4 }}>Indicatif téléphonique</span>
                            <input type="text" value={formData.defaultPhonePrefix} onChange={e => setFormData({ ...formData, defaultPhonePrefix: e.target.value })} style={{ width: '100%', padding: '6px 10px', border: '1px solid #d1d5db', borderRadius: 4 }} />
                        </label>
                        <label style={{ display: 'block', marginBottom: 8 }}>
                            <span style={{ display: 'block', fontWeight: 500, marginBottom: 4 }}>Domaine email placeholder</span>
                            <input type="text" value={formData.placeholderEmailDomain} onChange={e => setFormData({ ...formData, placeholderEmailDomain: e.target.value })} style={{ width: '100%', padding: '6px 10px', border: '1px solid #d1d5db', borderRadius: 4 }} />
                        </label>
                    </fieldset>

                    <fieldset style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: 16 }}>
                        <legend style={{ fontWeight: 'bold', padding: '0 8px' }}>Commission</legend>
                        <label style={{ display: 'block', marginBottom: 8 }}>
                            <span style={{ display: 'block', fontWeight: 500, marginBottom: 4 }}>Taux de commission par défaut (%)</span>
                            <input type="number" step="0.1" min="0" max="100" value={formData.defaultCommissionRate} onChange={e => setFormData({ ...formData, defaultCommissionRate: parseFloat(e.target.value) || 0 })} style={{ width: '100%', padding: '6px 10px', border: '1px solid #d1d5db', borderRadius: 4 }} />
                            <span style={{ fontSize: 12, color: '#6b7280' }}>Appliqué aux vendeurs sans taux personnalisé</span>
                        </label>
                    </fieldset>

                    <fieldset style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: 16 }}>
                        <legend style={{ fontWeight: 'bold', padding: '0 8px' }}>Contacts vendeur</legend>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                            <input type="checkbox" checked={formData.showVendorContact} onChange={e => setFormData({ ...formData, showVendorContact: e.target.checked })} />
                            <span style={{ fontWeight: 500 }}>Afficher les contacts vendeur sur le storefront</span>
                        </label>
                        {formData.showVendorContact && (
                            <div style={{ marginLeft: 24 }}>
                                {contactFieldKeys.map(key => (
                                    <label key={key} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                                        <input type="checkbox" checked={formData.vendorContactFields?.[key] ?? false} onChange={e => setFormData({ ...formData, vendorContactFields: { ...formData.vendorContactFields, [key]: e.target.checked } })} />
                                        <span>{contactFieldLabels[key]}</span>
                                    </label>
                                ))}
                            </div>
                        )}
                    </fieldset>

                    <fieldset style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: 16 }}>
                        <legend style={{ fontWeight: 'bold', padding: '0 8px' }}>Vendeurs</legend>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                            <input type="checkbox" checked={formData.vendorAutoApproval} onChange={e => setFormData({ ...formData, vendorAutoApproval: e.target.checked })} />
                            <span style={{ fontWeight: 500 }}>Approbation automatique des vendeurs</span>
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <input type="checkbox" checked={formData.emailVerificationRequired} onChange={e => setFormData({ ...formData, emailVerificationRequired: e.target.checked })} />
                            <span style={{ fontWeight: 500 }}>Vérification email obligatoire</span>
                        </label>
                    </fieldset>
                </div>

                <button type="submit" disabled={updateMutation.isPending} style={{ marginTop: 24, padding: '10px 24px', background: '#f97316', color: 'white', border: 'none', borderRadius: 6, fontWeight: 'bold', cursor: 'pointer', opacity: updateMutation.isPending ? 0.7 : 1 }}>
                    {updateMutation.isPending ? 'Enregistrement...' : 'Enregistrer'}
                </button>
            </form>
        </div>
    );
}
