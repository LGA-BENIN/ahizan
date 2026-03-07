import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { GET_BREVO_SETTINGS, UPDATE_BREVO_SETTINGS } from '../queries';

function getAuthToken(): string | null {
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.includes('vendure-auth-token') || key.includes('authToken') || key.includes('token'))) {
            const val = localStorage.getItem(key);
            if (val && !val.startsWith('{')) return val;
        }
    }
    return null;
}

async function fetchGraphQL(query: any, variables?: any) {
    const apiUrl = '/admin-api';
    const token = getAuthToken();
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const response = await fetch(apiUrl, {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify({ query: query.loc.source.body, variables }),
    });
    const json = await response.json();
    if (json.errors) throw new Error(json.errors[0].message);
    return json.data;
}

export function NotificationsSettingsComponent() {
    const queryClient = useQueryClient();
    const [toasts, setToasts] = useState<any[]>([]);

    const defaultChannelConfig = {
        enabled: false,
        channel: 'NONE', // 'NONE', 'SMS', 'EMAIL', 'BOTH'
        smsTemplate: '',
        emailSubject: '',
        emailTemplate: '',
    };

    const [formData, setFormData] = useState<any>({
        brevoApiKey: '',
        defaultPhonePrefix: '+229',
        channelsConfig: {
            OrderConfirmed: { ...defaultChannelConfig },
            PaymentFailed: { ...defaultChannelConfig },
            ShippingUpdate: { ...defaultChannelConfig },
            NewOrderVendor: { ...defaultChannelConfig },
            VendorRegistration: { ...defaultChannelConfig },
            VendorApproved: { ...defaultChannelConfig },
            StockAlert: { ...defaultChannelConfig },
        }
    });

    const addToast = (message: string, type: 'success' | 'error') => {
        const tid = Math.random().toString(36).substring(7);
        setToasts(prev => [...prev, { id: tid, message, type }]);
        setTimeout(() => setToasts(prev => prev.filter(t => t.id !== tid)), 3000);
    };

    const { data, isLoading } = useQuery({
        queryKey: ['brevoSettings'],
        queryFn: () => fetchGraphQL(GET_BREVO_SETTINGS),
    });

    useEffect(() => {
        if (data?.brevoSettings) {
            setFormData((prev: any) => ({
                ...prev,
                brevoApiKey: data.brevoSettings.brevoApiKey || '',
                defaultPhonePrefix: data.brevoSettings.defaultPhonePrefix || '+229',
                channelsConfig: {
                    ...prev.channelsConfig,
                    ...(data.brevoSettings.channelsConfig || {})
                }
            }));
        }
    }, [data]);

    const updateSettingsMutation = useMutation({
        mutationFn: (input: any) => fetchGraphQL(UPDATE_BREVO_SETTINGS, { input }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['brevoSettings'] });
            addToast('Paramètres mis à jour avec succès', 'success');
        },
        onError: (err: any) => addToast(err.message, 'error')
    });

    const handleSave = () => {
        const payload = {
            brevoApiKey: formData.brevoApiKey,
            defaultPhonePrefix: formData.defaultPhonePrefix,
            channelsConfig: formData.channelsConfig
        };
        updateSettingsMutation.mutate(payload);
    };

    const handleGlobalChange = (field: string, value: any) => {
        setFormData((prev: any) => ({ ...prev, [field]: value }));
    };

    const handleConfigChange = (eventName: string, field: string, value: any) => {
        setFormData((prev: any) => {
            const newConfig = { ...prev.channelsConfig };
            if (!newConfig[eventName]) newConfig[eventName] = { ...defaultChannelConfig };

            newConfig[eventName][field] = value;

            // Auto-enable if channel is not NONE
            if (field === 'channel') {
                newConfig[eventName].enabled = value !== 'NONE';
            }

            return { ...prev, channelsConfig: newConfig };
        });
    };

    if (isLoading) return <div style={{ padding: '40px', textAlign: 'center' }}>Chargement des réglages...</div>;

    const inputStyle = { width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #d1d5db', marginTop: '4px', fontSize: '14px' };
    const labelStyle = { display: 'block', fontSize: '13px', fontWeight: 600, color: '#4b5563', marginBottom: '4px' };
    const selectStyle = { padding: '8px 12px', borderRadius: '6px', border: '1px solid #d1d5db', background: 'white', fontWeight: 600, fontSize: '14px', cursor: 'pointer' };
    const cardStyle = { background: 'white', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '24px', marginBottom: '24px' };
    const blockStyle = { marginBottom: '20px', padding: '16px', background: '#f9fafb', borderRadius: '8px', border: '1px solid #e5e7eb' };

    const EventConfigBlock = ({ title, eventName, variables }: { title: string, eventName: string, variables: string }) => {
        const config = formData.channelsConfig[eventName] || defaultChannelConfig;
        const channel = config.channel || 'NONE';

        return (
            <div style={blockStyle}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <div style={{ fontWeight: 600, fontSize: '15px' }}>{title}</div>
                    <select value={channel} onChange={(e) => handleConfigChange(eventName, 'channel', e.target.value)} style={selectStyle}>
                        <option value="NONE">⛔ Désactivé</option>
                        <option value="SMS">📱 SMS uniquement</option>
                        <option value="EMAIL">📧 E-mail uniquement</option>
                        <option value="BOTH">📱 + 📧 SMS & E-mail</option>
                    </select>
                </div>

                {channel !== 'NONE' && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: '16px' }}>
                        {(channel === 'SMS' || channel === 'BOTH') && (
                            <div style={{ padding: '12px', borderLeft: '3px solid #10b981', background: 'white' }}>
                                <label style={labelStyle}>Texte du SMS (Variables: {variables})</label>
                                <textarea rows={2} value={config.smsTemplate || ''} onChange={e => handleConfigChange(eventName, 'smsTemplate', e.target.value)} style={{ ...inputStyle, resize: 'vertical' }} placeholder="Votre commande a été confirmée..." />
                            </div>
                        )}
                        {(channel === 'EMAIL' || channel === 'BOTH') && (
                            <div style={{ padding: '12px', borderLeft: '3px solid #3b82f6', background: 'white' }}>
                                <label style={labelStyle}>Sujet de l'E-mail (Variables: {variables})</label>
                                <input type="text" value={config.emailSubject || ''} onChange={e => handleConfigChange(eventName, 'emailSubject', e.target.value)} style={{ ...inputStyle, marginBottom: '12px' }} placeholder="Sujet de votre commande" />

                                <label style={labelStyle}>Corps de l'E-mail (HTML supporté)</label>
                                <textarea rows={4} value={config.emailTemplate || ''} onChange={e => handleConfigChange(eventName, 'emailTemplate', e.target.value)} style={{ ...inputStyle, resize: 'vertical' }} placeholder="<p>Bonjour {{ firstName }}, votre commande est validée...</p>" />
                            </div>
                        )}
                    </div>
                )}
            </div>
        );
    };

    return (
        <div style={{ padding: '24px', maxWidth: '1000px', margin: '0 auto', fontFamily: 'system-ui, sans-serif', color: '#111827' }}>
            <div style={{ position: 'fixed', bottom: '24px', right: '24px', zIndex: 2000, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {toasts.map(t => (
                    <div key={t.id} style={{ padding: '12px 24px', borderRadius: '8px', background: t.type === 'success' ? '#059669' : '#dc2626', color: 'white', fontSize: '14px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
                        {t.message}
                    </div>
                ))}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <div>
                    <h1 style={{ fontSize: '24px', margin: 0, fontWeight: 700 }}>Notifications Multi-Canal (Brevo)</h1>
                    <p style={{ margin: '4px 0 0 0', color: '#6b7280', fontSize: '14px' }}>Configurez vos identifiants Brevo et personnalisez les SMS/E-mails par événement.</p>
                </div>
                <button
                    onClick={handleSave}
                    style={{ background: '#1d4ed8', color: 'white', border: 'none', padding: '10px 24px', borderRadius: '6px', fontWeight: 600, cursor: 'pointer' }}
                >
                    {updateSettingsMutation.isPending ? 'Sauvegarde...' : 'Enregistrer'}
                </button>
            </div>

            <div style={cardStyle}>
                <h2 style={{ fontSize: '18px', marginBottom: '16px', borderBottom: '1px solid #e5e7eb', paddingBottom: '12px' }}>Configuration API Globale</h2>
                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 2fr) minmax(0, 1fr)', gap: '24px' }}>
                    <div>
                        <label style={labelStyle}>Clé API Brevo (v3)</label>
                        <input
                            type="password"
                            placeholder="xkeysib-..."
                            value={formData.brevoApiKey}
                            onChange={e => handleGlobalChange('brevoApiKey', e.target.value)}
                            style={inputStyle}
                        />
                        <p style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>Indispensable pour l'envoi des SMS et des E-mails dynamiques.</p>
                    </div>
                    <div>
                        <label style={labelStyle}>Préfixe Tél par Défaut</label>
                        <input
                            type="text"
                            placeholder="+229"
                            value={formData.defaultPhonePrefix}
                            onChange={e => handleGlobalChange('defaultPhonePrefix', e.target.value)}
                            style={inputStyle}
                        />
                        <p style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>Ex: +229 pour le Bénin.</p>
                    </div>
                </div>
            </div>

            <div style={cardStyle}>
                <h2 style={{ fontSize: '18px', marginBottom: '16px', borderBottom: '1px solid #e5e7eb', paddingBottom: '12px' }}>Acheteurs : Parcours Commande</h2>
                <EventConfigBlock title="Confirmation de Commande" eventName="OrderConfirmed" variables="{{ orderCode }}, {{ firstName }}" />
                <EventConfigBlock title="Mise à jour Livraison (Expédiée / Livrée)" eventName="ShippingUpdate" variables="{{ orderCode }}, {{ status }}" />
                <EventConfigBlock title="Échec du Paiement" eventName="PaymentFailed" variables="{{ orderCode }}" />
            </div>

            <div style={cardStyle}>
                <h2 style={{ fontSize: '18px', marginBottom: '16px', borderBottom: '1px solid #e5e7eb', paddingBottom: '12px' }}>Vendeurs : Événements Boutique</h2>
                <EventConfigBlock title="Nouvelle Commande (Notification de Vente)" eventName="NewOrderVendor" variables="{{ orderCode }}" />
                <EventConfigBlock title="Inscription Vendeur Reçue" eventName="VendorRegistration" variables="" />
                <EventConfigBlock title="Boutique Approuvée / Activée" eventName="VendorApproved" variables="" />
                <EventConfigBlock title="Alerte de Stock Faible (&lt;5 pièces)" eventName="StockAlert" variables="{{ productName }}, {{ stockOnHand }}" />
            </div>

        </div>
    );
}

export default NotificationsSettingsComponent;
