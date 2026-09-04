import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { GET_BREVO_SETTINGS, UPDATE_BREVO_SETTINGS, TEST_SMTP_CONNECTION, TEST_SMTP_CONNECTION_DIRECT, GET_VAPID_PUBLIC_KEY, SUBSCRIBE_TO_PUSH } from '../queries';

function urlBase64ToUint8Array(base64String: string) {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}

function WebPushDeviceCard({ addToast }: { addToast: (msg: string, type: 'success' | 'error') => void }) {
    const [pushStatus, setPushStatus] = useState<'granted' | 'denied' | 'default' | 'unsupported' | 'subscribing'>('default');
    const [isSubscribed, setIsSubscribed] = useState(false);

    useEffect(() => {
        if (!('Notification' in window) || !('serviceWorker' in navigator)) {
            setPushStatus('unsupported');
            return;
        }
        setPushStatus(Notification.permission as any);
        checkSubscription();
    }, []);

    const checkSubscription = async () => {
        if (!('serviceWorker' in navigator)) return;
        try {
            const reg = await navigator.serviceWorker.getRegistration();
            if (reg) {
                const sub = await reg.pushManager.getSubscription();
                if (sub) {
                    setIsSubscribed(true);
                }
            }
        } catch (e) {
            console.error('Check subscription error:', e);
        }
    };

    const handleEnablePush = async () => {
        if (!('Notification' in window) || !('serviceWorker' in navigator)) {
            addToast("Les notifications Web Push ne sont pas supportées sur ce navigateur.", "error");
            return;
        }

        try {
            setPushStatus('subscribing');
            const permission = await Notification.requestPermission();
            setPushStatus(permission as any);

            if (permission !== 'granted') {
                addToast("Permission refusée. Vous ne recevrez pas les notifications sur cet appareil.", "error");
                return;
            }

            // 1. Fetch VAPID key
            const vapidData = await fetchGraphQL(GET_VAPID_PUBLIC_KEY);
            const vapidPublicKey = vapidData?.vapidPublicKey;
            if (!vapidPublicKey) {
                throw new Error("Clé VAPID publique introuvable sur le serveur.");
            }

            // 2. Register Service Worker for push handling
            const swUrl = '/notifications/sw.js';
            const reg = await navigator.serviceWorker.register(swUrl, { scope: '/' });
            await navigator.serviceWorker.ready;

            // 3. Subscribe with PushManager
            const sub = await reg.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
            });

            const subJson = sub.toJSON();
            const endpoint = subJson.endpoint || '';
            const p256dh = subJson.keys?.p256dh || '';
            const auth = subJson.keys?.auth || '';

            // 4. Register with backend
            await fetchGraphQL(SUBSCRIBE_TO_PUSH, {
                endpoint,
                p256dh,
                auth,
                userAgent: navigator.userAgent
            });

            setIsSubscribed(true);
            addToast("Notifications Web Push activées avec succès sur cet appareil !", "success");
        } catch (err: any) {
            console.error('Push activation failed:', err);
            addToast(`Échec d'activation Push : ${err.message}`, "error");
        }
    };

    return (
        <div style={{ background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: '12px', padding: '20px', marginBottom: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                    <h3 style={{ margin: '0 0 4px 0', fontSize: '16px', color: '#0369a1', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span>📲 Notifications Web Push sur votre appareil</span>
                        {isSubscribed && <span style={{ background: '#dcfce7', color: '#15803d', fontSize: '11px', padding: '2px 8px', borderRadius: '999px', fontWeight: 700 }}>Actif & Abonné</span>}
                    </h3>
                    <p style={{ margin: 0, fontSize: '13px', color: '#0e7490' }}>
                        Recevez des alertes instantanées sur cet ordinateur/téléphone dès qu'une nouvelle commande est effectuée.
                    </p>
                </div>
                <button
                    onClick={handleEnablePush}
                    disabled={isSubscribed}
                    style={{
                        background: isSubscribed ? '#10b981' : '#0284c7',
                        color: 'white',
                        border: 'none',
                        padding: '10px 18px',
                        borderRadius: '8px',
                        fontWeight: 700,
                        fontSize: '13px',
                        cursor: isSubscribed ? 'default' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                    }}
                >
                    {isSubscribed ? '✓ Notification activée sur cet appareil' : '🔔 Activer les notifications sur cet appareil'}
                </button>
            </div>
        </div>
    );
}

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
    const isDevNode = window.location.port === '5173' || window.location.port === '5174';
    const apiUrl = isDevNode ? 'http://localhost:3000/admin-api' : '/admin-api';

    const token = getAuthToken();
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const response = await fetch(apiUrl, {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify({ query: query?.loc?.source?.body || query, variables }),
    });

    const text = await response.text();
    let json;
    try {
        json = JSON.parse(text);
    } catch (err) {
        throw new Error(`Erreur Serveur (HTTP ${response.status}): La réponse n'est pas au format attendu. Détail: ${text.substring(0, 150)}...`);
    }

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
        emailMethod: 'smtp',
        smtpHost: '',
        smtpPort: 587,
        smtpUser: '',
        smtpPassword: '',
        fromEmail: '',
        fromName: '',
        channelsConfig: {
            OrderConfirmed: { ...defaultChannelConfig },
            PaymentFailed: { ...defaultChannelConfig },
            ShippingUpdate: { ...defaultChannelConfig },
            NewOrderVendor: { ...defaultChannelConfig },
            VendorRegistration: { ...defaultChannelConfig },
            SellerAccountVerification: { ...defaultChannelConfig },
            VendorApproved: { ...defaultChannelConfig },
            VendorRejected: { ...defaultChannelConfig },
            ProductApproved: { ...defaultChannelConfig },
            ProductRejected: { ...defaultChannelConfig },
            FundsReleased: { ...defaultChannelConfig },
            PayoutCompleted: { ...defaultChannelConfig },
            PayoutRejected: { ...defaultChannelConfig },
            PasswordReset: { ...defaultChannelConfig },
            StockAlert: { ...defaultChannelConfig },
            BuyerRegistration: { ...defaultChannelConfig },
            GuestOrderConfirmed: { ...defaultChannelConfig },
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
            const savedChannels = data.brevoSettings.channelsConfig || {};
            setFormData((prev: any) => ({
                ...prev,
                brevoApiKey: data.brevoSettings.brevoApiKey || '',
                defaultPhonePrefix: data.brevoSettings.defaultPhonePrefix || '+229',
                emailMethod: data.brevoSettings.emailMethod || 'smtp',
                smtpHost: data.brevoSettings.smtpHost || '',
                smtpPort: data.brevoSettings.smtpPort || 587,
                smtpUser: data.brevoSettings.smtpUser || '',
                smtpPassword: data.brevoSettings.smtpPassword || '',
                fromEmail: data.brevoSettings.fromEmail || '',
                fromName: data.brevoSettings.fromName || '',
                channelsConfig: {
                    ...prev.channelsConfig,
                    ...savedChannels,
                    // If SellerAccountVerification is not explicitly saved, fallback to VendorRegistration
                    SellerAccountVerification: savedChannels.SellerAccountVerification || savedChannels.VendorRegistration || prev.channelsConfig.VendorRegistration
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

    const [testEmail, setTestEmail] = useState('');
    const [isTesting, setIsTesting] = useState(false);

    const testSmtpMutation = useMutation({
        mutationFn: (payload: any) => fetchGraphQL(TEST_SMTP_CONNECTION_DIRECT, payload),
        onSuccess: () => {
            setIsTesting(false);
            addToast('E-mail de test envoyé avec succès ! Vérifiez votre boîte.', 'success');
        },
        onError: (err: any) => {
            setIsTesting(false);
            addToast(`Échec du test : ${err.message}`, 'error');
        }
    });

    const handleTest = () => {
        if (!testEmail) {
            addToast("Veuillez saisir une adresse e-mail pour le test.", "error");
            return;
        }
        setIsTesting(true);
        testSmtpMutation.mutate({
            email: testEmail,
            emailMethod: formData.emailMethod || 'smtp',
            smtpHost: formData.smtpHost || '',
            smtpPort: parseInt(formData.smtpPort) || 587,
            smtpUser: formData.smtpUser || '',
            smtpPassword: formData.smtpPassword || '',
            brevoApiKey: formData.brevoApiKey || '',
            fromEmail: formData.fromEmail || '',
            fromName: formData.fromName || 'AHIZAN'
        });
    };

    const handleSave = () => {
        const finalChannelsConfig = { ...formData.channelsConfig };
        if (finalChannelsConfig.VendorRegistration) {
            finalChannelsConfig.SellerAccountVerification = { ...finalChannelsConfig.VendorRegistration };
        }

        const payload = {
            brevoApiKey: formData.brevoApiKey,
            defaultPhonePrefix: formData.defaultPhonePrefix,
            emailMethod: formData.emailMethod,
            smtpHost: formData.smtpHost,
            smtpPort: parseInt(formData.smtpPort) || 587,
            smtpUser: formData.smtpUser,
            smtpPassword: formData.smtpPassword,
            fromEmail: formData.fromEmail,
            fromName: formData.fromName,
            channelsConfig: finalChannelsConfig
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

            // Keep SellerAccountVerification synced with VendorRegistration
            if (eventName === 'VendorRegistration') {
                newConfig.SellerAccountVerification = { ...newConfig.VendorRegistration };
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

            <WebPushDeviceCard addToast={addToast} />

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
                <h2 style={{ fontSize: '18px', marginBottom: '16px', borderBottom: '1px solid #e5e7eb', paddingBottom: '12px' }}>Configuration E-mail (Envoi)</h2>

                <div style={{ marginBottom: '20px' }}>
                    <label style={labelStyle}>Méthode d'envoi des E-mails</label>
                    <select
                        value={formData.emailMethod}
                        onChange={e => handleGlobalChange('emailMethod', e.target.value)}
                        style={{ ...selectStyle, width: '100%', maxWidth: '300px', display: 'block', marginTop: '4px' }}
                    >
                        <option value="smtp">Serveur SMTP Externe (Recommandé)</option>
                        <option value="api">Brevo REST API (Utilise la clé API Globale)</option>
                    </select>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: '24px', marginBottom: '20px' }}>
                    <div>
                        <label style={labelStyle}>Nom d'Expéditeur</label>
                        <input
                            type="text"
                            placeholder="AHIZAN"
                            value={formData.fromName}
                            onChange={e => handleGlobalChange('fromName', e.target.value)}
                            style={inputStyle}
                        />
                    </div>
                    <div>
                        <label style={labelStyle}>E-mail d'Expéditeur (From)</label>
                        <input
                            type="email"
                            placeholder="noreply@ahizan.com"
                            value={formData.fromEmail}
                            onChange={e => handleGlobalChange('fromEmail', e.target.value)}
                            style={inputStyle}
                        />
                    </div>
                </div>

                {formData.emailMethod === 'smtp' && (
                    <div style={{ background: '#f3f4f6', padding: '16px', borderRadius: '8px', border: '1px solid #d1d5db' }}>
                        <h3 style={{ fontSize: '14px', margin: '0 0 16px 0', color: '#374151' }}>Paramètres du Serveur SMTP</h3>
                        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 2fr) minmax(0, 1fr)', gap: '16px', marginBottom: '16px' }}>
                            <div>
                                <label style={labelStyle}>Hôte SMTP (Host)</label>
                                <input
                                    type="text"
                                    placeholder="smtp-relay.brevo.com"
                                    value={formData.smtpHost}
                                    onChange={e => handleGlobalChange('smtpHost', e.target.value)}
                                    style={inputStyle}
                                />
                            </div>
                            <div>
                                <label style={labelStyle}>Port (ex: 587)</label>
                                <input
                                    type="number"
                                    placeholder="587"
                                    value={formData.smtpPort}
                                    onChange={e => handleGlobalChange('smtpPort', e.target.value)}
                                    style={inputStyle}
                                />
                            </div>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: '16px' }}>
                            <div>
                                <label style={labelStyle}>Utilisateur SMTP (Login)</label>
                                <input
                                    type="text"
                                    placeholder="votre-email@domaine.com"
                                    value={formData.smtpUser}
                                    onChange={e => handleGlobalChange('smtpUser', e.target.value)}
                                    style={inputStyle}
                                />
                            </div>
                            <div>
                                <label style={labelStyle}>Mot de passe SMTP</label>
                                <input
                                    type="password"
                                    placeholder="Mot de passe ou Clé SMTP master"
                                    value={formData.smtpPassword}
                                    onChange={e => handleGlobalChange('smtpPassword', e.target.value)}
                                    style={inputStyle}
                                />
                            </div>
                        </div>
                    </div>
                )}

                <div style={{ marginTop: '20px', borderTop: '1px solid #e5e7eb', paddingTop: '16px', display: 'flex', gap: '16px', alignItems: 'flex-end' }}>
                    <div style={{ flex: 1 }}>
                        <label style={labelStyle}>✉️ Tester la configuration saisie ci-dessus (Test direct)</label>
                        <input
                            type="email"
                            placeholder="destinataire-test@domaine.com"
                            value={testEmail}
                            onChange={e => setTestEmail(e.target.value)}
                            style={{ ...inputStyle, marginTop: '4px' }}
                        />
                    </div>
                    <button
                        onClick={handleTest}
                        disabled={isTesting}
                        style={{
                            background: '#059669',
                            color: 'white',
                            border: 'none',
                            padding: '10px 20px',
                            borderRadius: '6px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            opacity: isTesting ? 0.6 : 1,
                            whiteSpace: 'nowrap',
                            height: '42px'
                        }}
                    >
                        {isTesting ? 'Envoi...' : 'Envoyer un e-mail de test'}
                    </button>
                </div>
            </div>

            <div style={cardStyle}>
                <h2 style={{ fontSize: '18px', marginBottom: '16px', borderBottom: '1px solid #e5e7eb', paddingBottom: '12px' }}>Acheteurs : Parcours Commande et Inscription</h2>
                <EventConfigBlock title="Inscription Acheteur (Bienvenue & Confirmation)" eventName="BuyerRegistration" variables="{{ firstName }}, {{ lastName }}, {{ email }}, {{ verificationToken }}, {{ verificationLink }}" />
                <EventConfigBlock title="Confirmation de Commande (Client Inscrit)" eventName="OrderConfirmed" variables="{{ orderCode }}, {{ firstName }}" />
                <EventConfigBlock title="Confirmation de Commande (Client Non Inscrit / Invité)" eventName="GuestOrderConfirmed" variables="{{ orderCode }}, {{ firstName }}, {{ email }}, {{ signupUrl }}" />
                <EventConfigBlock title="Mise à jour Livraison (Expédiée / Livrée)" eventName="ShippingUpdate" variables="{{ orderCode }}, {{ status }}" />
                <EventConfigBlock title="Échec du Paiement" eventName="PaymentFailed" variables="{{ orderCode }}" />
            </div>

            <div style={cardStyle}>
                <h2 style={{ fontSize: '18px', marginBottom: '16px', borderBottom: '1px solid #e5e7eb', paddingBottom: '12px' }}>Vendeurs : Événements Boutique & Compte</h2>
                <EventConfigBlock title="Nouvelle Commande (Notification de Vente)" eventName="NewOrderVendor" variables="{{ orderCode }}, {{ businessName }}, {{ vendorTotal }}, {{ itemsList }}" />
                <EventConfigBlock title="Inscription Vendeur Reçue (En Attente)" eventName="VendorRegistration" variables="{{ businessName }}, {{ email }}, {{ name }}, {{ verificationToken }}, {{ verificationLink }}" />
                <EventConfigBlock title="Boutique Approuvée / Activée" eventName="VendorApproved" variables="{{ businessName }}, {{ email }}, {{ name }}" />
                <EventConfigBlock title="Boutique Rejetée" eventName="VendorRejected" variables="{{ businessName }}, {{ rejectionReason }}, {{ email }}, {{ name }}" />
                <EventConfigBlock title="Réinitialisation de Mot de Passe" eventName="PasswordReset" variables="{{ passwordResetToken }}, {{ identifier }}, {{ resetLink }}" />
            </div>

            <div style={cardStyle}>
                <h2 style={{ fontSize: '18px', marginBottom: '16px', borderBottom: '1px solid #e5e7eb', paddingBottom: '12px' }}>Vendeurs : Catalogue & Produits</h2>
                <EventConfigBlock title="Produit Validé & Publié au Catalogue" eventName="ProductApproved" variables="{{ businessName }}, {{ productName }}, {{ productUrl }}" />
                <EventConfigBlock title="Produit Rejeté / Corrections Demandées" eventName="ProductRejected" variables="{{ businessName }}, {{ productName }}, {{ rejectionReason }}" />
                <EventConfigBlock title="Alerte de Stock Faible (<5 pièces)" eventName="StockAlert" variables="{{ productName }}, {{ stockOnHand }}" />
            </div>

            <div style={cardStyle}>
                <h2 style={{ fontSize: '18px', marginBottom: '16px', borderBottom: '1px solid #e5e7eb', paddingBottom: '12px' }}>Vendeurs : Finances, Portefeuille & Retraits</h2>
                <EventConfigBlock title="Fonds Libérés sur le Portefeuille Vendeur" eventName="FundsReleased" variables="{{ businessName }}, {{ orderCode }}, {{ amount }}, {{ walletBalance }}" />
                <EventConfigBlock title="Virement / Retrait Effectué avec Succès" eventName="PayoutCompleted" variables="{{ businessName }}, {{ amount }}, {{ paymentMethod }}, {{ transactionRef }}" />
                <EventConfigBlock title="Demande de Retrait Rejetée" eventName="PayoutRejected" variables="{{ businessName }}, {{ amount }}, {{ rejectionReason }}" />
            </div>

        </div>
    );
}

export default NotificationsSettingsComponent;
