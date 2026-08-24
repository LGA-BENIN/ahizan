import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
    GET_VENDORS, 
    GET_VENDOR_DETAIL, 
    UPDATE_VENDOR_STATUS, 
    UPDATE_VENDOR, 
    CREDIT_VENDOR_WALLET, 
    DEBIT_VENDOR_WALLET, 
    SET_VENDOR_ALLOW_NEGATIVE_BALANCE, 
    DELETE_VENDOR,
    CREATE_VENDOR
} from './queries';
import { print } from 'graphql';

// --- Types & Interfaces ---
interface Toast {
    id: string;
    message: string;
    type: 'success' | 'error' | 'info';
}

interface VendorFilterState {
    searchTerm: string;
    status: string;
    zone: string;
    type: string;
    minRating: number | '';
}

// --- GraphQL Fetcher ---
async function fetchGraphQL(query: any, variables?: any) {
    const apiUrl = '/admin-api';
    const queryString = typeof query === 'string' ? query : print(query);
    const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ query: queryString, variables }),
    });

    if (!response.ok) {
        const text = await response.text();
        throw new Error(`HTTP ${response.status}: ${text.substring(0, 200)}`);
    }

    const json = await response.json();
    if (json.errors) throw new Error(json.errors[0].message);
    return json.data;
}

// --- Toast Component ---
function ToastContainer({ toasts, removeToast }: { toasts: Toast[], removeToast: (id: string) => void }) {
    return (
        <div style={{ position: 'fixed', bottom: '24px', right: '24px', zIndex: 2000, display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {toasts.map((toast) => (
                <div key={toast.id} onClick={() => removeToast(toast.id)} style={{
                    padding: '12px 24px',
                    borderRadius: '8px',
                    background: toast.type === 'success' ? '#059669' : toast.type === 'error' ? '#dc2626' : '#2563eb',
                    color: 'white',
                    boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
                    cursor: 'pointer',
                    animation: 'slideUp 0.3s ease-out',
                    minWidth: '250px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                }}>
                    <span>{toast.message}</span>
                    <span style={{ fontSize: '12px', opacity: 0.8 }}>✕</span>
                </div>
            ))}
            <style>{`@keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }`}</style>
        </div>
    );
}

// Helper to format prices
const formatPrice = (amount: number) => {
    return new Intl.NumberFormat('fr-BJ', { style: 'currency', currency: 'XOF', minimumFractionDigits: 0 }).format(amount);
};

// --- Vendor Detail Modal ---
function VendorDetailModal({ isOpen, onClose, vendorId, addToast }: { isOpen: boolean; onClose: () => void; vendorId: string | null; addToast: (msg: string, type: 'success' | 'error' | 'info') => void }) {
    const queryClient = useQueryClient();
    const [commissionRate, setCommissionRate] = useState<string>('');
    const [walletAmount, setWalletAmount] = useState<string>('');
    const [walletNote, setWalletNote] = useState<string>('');

    const [isDeleteMode, setIsDeleteMode] = useState(false);
    const [deleteProducts, setDeleteProducts] = useState(false);
    const [deleteOrders, setDeleteOrders] = useState(false);
    const [confirmName, setConfirmName] = useState('');

    const [isProductsExpanded, setIsProductsExpanded] = useState(false);
    const [isOrdersExpanded, setIsOrdersExpanded] = useState(false);

    const { data, isLoading } = useQuery({
        queryKey: ['vendor', vendorId],
        queryFn: () => fetchGraphQL(GET_VENDOR_DETAIL, { id: vendorId }),
        enabled: !!vendorId && isOpen,
    });

    const deleteVendorMutation = useMutation({
        mutationFn: ({ deleteProducts, deleteOrders }: { deleteProducts: boolean; deleteOrders: boolean }) =>
            fetchGraphQL(DELETE_VENDOR, { id: vendorId, deleteProducts, deleteOrders }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['vendors'] });
            onClose();
            addToast('Le vendeur et toutes ses données associées ont été supprimés.', 'success');
        },
        onError: (err: any) => addToast(err.message || 'Échec de la suppression', 'error')
    });

    useEffect(() => {
        if (data?.vendor?.commissionRate !== undefined) {
            setCommissionRate(data.vendor.commissionRate.toString());
        }
    }, [data]);

    const updateStatusMutation = useMutation({
        mutationFn: ({ status, reason }: { status: string; reason?: string }) =>
            fetchGraphQL(UPDATE_VENDOR_STATUS, { id: vendorId, status, reason }),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['vendor', vendorId] });
            queryClient.invalidateQueries({ queryKey: ['vendors'] });
            addToast(`Vendor status updated to ${variables.status}`, 'success');
        },
        onError: () => addToast('Failed to update status', 'error')
    });

    const updateVendorMutation = useMutation({
        mutationFn: (input: any) => fetchGraphQL(UPDATE_VENDOR, { id: vendorId, input }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['vendor', vendorId] });
            addToast('Commission rate saved successfully', 'success');
        },
        onError: () => addToast('Failed to save commission', 'error')
    });

    const creditWalletMutation = useMutation({
        mutationFn: ({ amount, note }: { amount: number; note: string }) => fetchGraphQL(CREDIT_VENDOR_WALLET, { vendorId, amount, note }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['vendor', vendorId] });
            queryClient.invalidateQueries({ queryKey: ['vendors'] });
            setWalletAmount('');
            setWalletNote('');
            addToast('Wallet credited successfully', 'success');
        },
        onError: () => addToast('Failed to credit wallet', 'error')
    });

    const debitWalletMutation = useMutation({
        mutationFn: ({ amount, note }: { amount: number; note: string }) => fetchGraphQL(DEBIT_VENDOR_WALLET, { vendorId, amount, note }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['vendor', vendorId] });
            queryClient.invalidateQueries({ queryKey: ['vendors'] });
            setWalletAmount('');
            setWalletNote('');
            addToast('Wallet debited successfully', 'success');
        },
        onError: () => addToast('Failed to debit wallet', 'error')
    });

    const toggleOverdraftMutation = useMutation({
        mutationFn: (allow: boolean) => fetchGraphQL(SET_VENDOR_ALLOW_NEGATIVE_BALANCE, { vendorId, allow }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['vendor', vendorId] });
            queryClient.invalidateQueries({ queryKey: ['vendors'] });
            addToast('Overdraft setting updated', 'success');
        },
        onError: () => addToast('Failed to update overdraft setting', 'error')
    });

    if (!isOpen) return null;

    const vendor = data?.vendor;

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 1000, backdropFilter: 'blur(4px)'
        }} onClick={onClose}>
            <div style={{
                background: 'white', borderRadius: '16px', width: '90%', maxWidth: '850px', maxHeight: '90vh',
                overflowY: 'auto', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', position: 'relative'
            }} onClick={e => e.stopPropagation()}>
                {isLoading ? <div style={{ padding: '40px', textAlign: 'center' }}>Loading...</div> : vendor ? (
                    <>
                        <div style={{ padding: '24px', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, background: 'white', zIndex: 10 }}>
                            <h2 style={{ margin: 0 }}>Détails du Vendeur</h2>
                            <button onClick={onClose} style={{ border: 'none', background: '#f3f4f6', borderRadius: '50%', width: '32px', height: '32px', cursor: 'pointer' }}>✕</button>
                        </div>
                        <div style={{ padding: '32px' }}>
                            <div style={{ display: 'flex', gap: '24px', marginBottom: '24px' }}>
                                <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: '#eee', backgroundImage: vendor.logo ? `url(${vendor.logo.preview})` : undefined, backgroundSize: 'cover' }}></div>
                                <div>
                                    <h1 style={{ margin: '0 0 8px 0' }}>{vendor.name}</h1>
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        <span style={{ background: vendor.status === 'APPROVED' ? '#d1fae5' : '#fef9c3', color: vendor.status === 'APPROVED' ? '#065f46' : '#854d0e', padding: '2px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold' }}>{vendor.status}</span>
                                        <span style={{ background: '#e0e7ff', padding: '2px 8px', borderRadius: '4px', fontSize: '12px' }}>{vendor.zone || 'Pas de zone'}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Superadmin Controls */}
                            <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '24px' }}>
                                <h3 style={{ marginTop: 0, fontSize: '16px', marginBottom: '12px' }}>🛡️ Actions Administrateur</h3>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '12px', marginBottom: '8px', color: '#64748b', fontWeight: 'bold' }}>Statut du Vendeur</label>
                                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                            {vendor.status === 'PENDING' && (
                                                <>
                                                    <button onClick={() => updateStatusMutation.mutate({ status: 'APPROVED' })} style={{ background: '#22c55e', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>Approuver</button>
                                                    <button onClick={() => {
                                                        const reason = prompt("Saisir le motif de rejet :");
                                                        if (reason) updateStatusMutation.mutate({ status: 'REJECTED', reason });
                                                    }} style={{ background: '#ef4444', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>Rejeter</button>
                                                </>
                                            )}
                                            {vendor.status === 'APPROVED' && (
                                                <button onClick={() => {
                                                    const reason = prompt("Veuillez saisir le motif de la suspension du compte vendeur :");
                                                    if (reason && reason.trim()) {
                                                        updateStatusMutation.mutate({ status: 'SUSPENDED', reason: reason.trim() });
                                                    }
                                                }} style={{ background: '#f59e0b', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>Suspendre</button>
                                            )}
                                            {vendor.status === 'SUSPENDED' && <button onClick={() => updateStatusMutation.mutate({ status: 'APPROVED' })} style={{ background: '#22c55e', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>Réactiver</button>}
                                            {vendor.status === 'REJECTED' && (
                                                <button onClick={() => updateStatusMutation.mutate({ status: 'PENDING' })} style={{ background: '#eab308', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>Réévaluer</button>
                                            )}
                                        </div>
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '12px', marginBottom: '8px', color: '#64748b', fontWeight: 'bold' }}>Taux de Commission de la Plateforme</label>
                                        <div style={{ display: 'flex', gap: '8px' }}>
                                            <input type="number" min="0" max="100" value={commissionRate} onChange={e => setCommissionRate(e.target.value)} style={{ padding: '8px', border: '1px solid #cbd5e1', borderRadius: '6px', width: '80px' }} />
                                            <button onClick={() => updateVendorMutation.mutate({ commissionRate: Number(commissionRate) })} style={{ background: '#2563eb', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>Enregistrer</button>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Wallet Summary */}
                            <div style={{ background: '#f0fdf4', padding: '20px', borderRadius: '12px', border: '1px solid #bbf7d0', marginBottom: '24px' }}>
                                <h3 style={{ marginTop: 0, fontSize: '16px', color: '#166534', marginBottom: '12px' }}>💰 Solde & Portefeuille</h3>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '20px' }}>
                                    <div>
                                        <span style={{ fontSize: '12px', color: '#166534', fontWeight: 'bold' }}>Solde Prépayé Actuel</span>
                                        <div style={{ fontSize: '24px', fontWeight: 900, color: '#15803d', marginTop: '4px' }}>{formatPrice(vendor.walletBalance || 0)}</div>
                                        
                                        <div style={{ marginTop: '12px' }}>
                                            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px' }}>
                                                <input type="checkbox" checked={vendor.allowNegativeBalance} onChange={e => toggleOverdraftMutation.mutate(e.target.checked)} />
                                                <span>Autoriser solde négatif</span>
                                            </label>
                                        </div>
                                    </div>
                                    <div>
                                        <span style={{ fontSize: '12px', color: '#166534', fontWeight: 'bold' }}>Ajuster le solde</span>
                                        <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                                            <input type="number" placeholder="Montant (FCFA)" value={walletAmount} onChange={e => setWalletAmount(e.target.value)} style={{ padding: '8px', border: '1px solid #cbd5e1', borderRadius: '6px', width: '120px' }} />
                                            <input type="text" placeholder="Motif / Note" value={walletNote} onChange={e => setWalletNote(e.target.value)} style={{ padding: '8px', border: '1px solid #cbd5e1', borderRadius: '6px', flex: 1 }} />
                                        </div>
                                        <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                                            <button onClick={() => creditWalletMutation.mutate({ amount: Number(walletAmount), note: walletNote })} disabled={!walletAmount} style={{ background: '#16a34a', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}>+ Créditer</button>
                                            <button onClick={() => debitWalletMutation.mutate({ amount: Number(walletAmount), note: walletNote })} disabled={!walletAmount} style={{ background: '#dc2626', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}>- Débiter</button>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Detailed Profiles */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '24px' }}>
                                <div style={{ border: '1px solid #e5e7eb', padding: '16px', borderRadius: '12px' }}>
                                    <h4 style={{ margin: '0 0 12px 0', borderBottom: '1px solid #f3f4f6', paddingBottom: '6px' }}>📋 Documents Légaux</h4>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px' }}>
                                        <div><strong>RCCM :</strong> {vendor.rccmNumber || 'Non renseigné'}</div>
                                        {vendor.rccmFile && (
                                            <div style={{ marginTop: '2px' }}>
                                                <a href={vendor.rccmFile.source} target="_blank" rel="noreferrer" style={{ color: '#2563eb', textDecoration: 'underline', fontWeight: 'bold' }}>📄 Télécharger Document RCCM</a>
                                            </div>
                                        )}
                                        <div style={{ marginTop: '4px' }}><strong>IFU :</strong> {vendor.ifuNumber || 'Non renseigné'}</div>
                                        {vendor.ifuFile && (
                                            <div style={{ marginTop: '2px' }}>
                                                <a href={vendor.ifuFile.source} target="_blank" rel="noreferrer" style={{ color: '#2563eb', textDecoration: 'underline', fontWeight: 'bold' }}>📄 Télécharger Document IFU</a>
                                            </div>
                                        )}
                                        <div style={{ marginTop: '4px' }}><strong>ID Carte / CNI :</strong> {vendor.idCardNumber || 'Non renseigné'}</div>
                                        {vendor.idCardFile && (
                                            <div style={{ marginTop: '2px' }}>
                                                <a href={vendor.idCardFile.source} target="_blank" rel="noreferrer" style={{ color: '#2563eb', textDecoration: 'underline', fontWeight: 'bold' }}>📄 Télécharger Copie CNI</a>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div style={{ border: '1px solid #e5e7eb', padding: '16px', borderRadius: '12px' }}>
                                    <h4 style={{ margin: '0 0 12px 0', borderBottom: '1px solid #f3f4f6', paddingBottom: '6px' }}>📱 Contacts & Socials</h4>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px' }}>
                                        <div><strong>Email :</strong> {vendor.email}</div>
                                        <div><strong>Téléphone :</strong> {vendor.phoneNumber || '—'}</div>
                                        <div><strong>Adresse :</strong> {vendor.address || '—'}</div>
                                        <div><strong>Site Web :</strong> {vendor.website ? <a href={vendor.website} target="_blank" rel="noreferrer" style={{ color: '#2563eb' }}>{vendor.website}</a> : '—'}</div>
                                        <div><strong>Facebook :</strong> {vendor.facebook ? <a href={vendor.facebook} target="_blank" rel="noreferrer" style={{ color: '#2563eb' }}>Lien Facebook</a> : '—'}</div>
                                        <div><strong>Instagram :</strong> {vendor.instagram ? <a href={vendor.instagram} target="_blank" rel="noreferrer" style={{ color: '#2563eb' }}>Lien Instagram</a> : '—'}</div>
                                    </div>
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '24px' }}>
                                <div style={{ border: '1px solid #e5e7eb', padding: '16px', borderRadius: '12px' }}>
                                    <h4 style={{ margin: '0 0 12px 0', borderBottom: '1px solid #f3f4f6', paddingBottom: '6px' }}>💳 Réception des Règlements</h4>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px' }}>
                                        <div><strong>Méthode :</strong> {vendor.paymentMethod || 'Non renseignée'}</div>
                                        {vendor.paymentMethod === 'MOBILE_MONEY' ? (
                                            <>
                                                <div><strong>Opérateur Mobile Money :</strong> {vendor.mobileMoneyProvider || '—'}</div>
                                                <div><strong>Numéro Mobile Money :</strong> {vendor.mobileMoneyNumber || '—'}</div>
                                            </>
                                        ) : vendor.paymentMethod === 'BANK_TRANSFER' ? (
                                            <>
                                                <div><strong>Nom de la Banque :</strong> {vendor.bankName || '—'}</div>
                                                <div><strong>Numéro de compte :</strong> {vendor.bankAccountNumber || '—'}</div>
                                            </>
                                        ) : null}
                                    </div>
                                </div>

                                <div style={{ border: '1px solid #e5e7eb', padding: '16px', borderRadius: '12px' }}>
                                    <h4 style={{ margin: '0 0 12px 0', borderBottom: '1px solid #f3f4f6', paddingBottom: '6px' }}>📍 Géolocalisation</h4>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px' }}>
                                        <div><strong>Latitude :</strong> {vendor.latitude || '—'}</div>
                                        <div><strong>Longitude :</strong> {vendor.longitude || '—'}</div>
                                        {vendor.latitude && vendor.longitude && (
                                            <div style={{ marginTop: '4px' }}>
                                                <a href={`https://www.google.com/maps/search/?api=1&query=${vendor.latitude},${vendor.longitude}`} target="_blank" rel="noreferrer" style={{ color: '#2563eb', textDecoration: 'underline' }}>🗺️ Voir sur Google Maps</a>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Products List (Expandable) */}
                            <div style={{ marginTop: '32px', borderTop: '1px solid #e5e7eb', paddingTop: '24px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                                    <h3 style={{ margin: 0, fontSize: '18px' }}>
                                        📦 Produits du vendeur ({vendor.products?.length || 0})
                                    </h3>
                                    <button 
                                        onClick={() => setIsProductsExpanded(!isProductsExpanded)}
                                        style={{ padding: '6px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', background: 'white', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}
                                    >
                                        {isProductsExpanded ? '🔼 Réduire' : '🔽 Afficher tout'}
                                    </button>
                                </div>
                                {isProductsExpanded && (
                                    vendor.products && vendor.products.length > 0 ? (
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', maxHeight: '350px', overflowY: 'auto', paddingRight: '8px' }}>
                                            {vendor.products.map((prod: any) => (
                                                <div key={prod.id} style={{ display: 'flex', gap: '12px', padding: '10px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0', alignItems: 'center' }}>
                                                    <div style={{ width: '40px', height: '40px', background: '#eee', borderRadius: '4px', backgroundImage: prod.featuredAsset ? `url(${prod.featuredAsset.preview})` : undefined, backgroundSize: 'cover' }}></div>
                                                    <div style={{ flex: 1, minWidth: 0 }}>
                                                        <div style={{ fontWeight: 'bold', fontSize: '13px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{prod.name}</div>
                                                        <div style={{ fontSize: '12px', color: '#64748b' }}>
                                                            {prod.variants?.[0]?.price !== undefined ? `${prod.variants[0].price.toLocaleString()} FCFA` : 'N/A'}
                                                        </div>
                                                    </div>
                                                    <span style={{ fontSize: '10px', background: prod.enabled ? '#d1fae5' : '#fee2e2', color: prod.enabled ? '#065f46' : '#991b1b', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold' }}>
                                                        {prod.enabled ? 'Actif' : 'Inactif'}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <p style={{ color: '#64748b', fontSize: '14px', fontStyle: 'italic' }}>Aucun produit en ligne pour ce vendeur.</p>
                                    )
                                )}
                            </div>

                            {/* Orders List (Expandable) */}
                            <div style={{ marginTop: '24px', borderTop: '1px solid #e5e7eb', paddingTop: '24px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                                    <h3 style={{ margin: 0, fontSize: '18px' }}>
                                        📋 Commandes concernées ({vendor.orders?.length || 0})
                                    </h3>
                                    <button 
                                        onClick={() => setIsOrdersExpanded(!isOrdersExpanded)}
                                        style={{ padding: '6px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', background: 'white', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}
                                    >
                                        {isOrdersExpanded ? '🔼 Réduire' : '🔽 Afficher tout'}
                                    </button>
                                </div>
                                {isOrdersExpanded && (
                                    vendor.orders && vendor.orders.length > 0 ? (
                                        <div style={{ maxHeight: '350px', overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
                                                <thead>
                                                    <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                                                        <th style={{ padding: '10px' }}>Code</th>
                                                        <th style={{ padding: '10px' }}>Date</th>
                                                        <th style={{ padding: '10px' }}>Statut Global</th>
                                                        <th style={{ padding: '10px' }}>Statut Vendeur</th>
                                                        <th style={{ padding: '10px', textAlign: 'right' }}>Total</th>
                                                        <th style={{ padding: '10px', textAlign: 'right' }}>Comm.</th>
                                                        <th style={{ padding: '10px', textAlign: 'right' }}>Part Net</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {vendor.orders.map((o: any) => {
                                                        const comm = o.customFields?.commissionAmount || 0;
                                                        const net = o.totalWithTax - comm;
                                                        return (
                                                            <tr key={o.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                                                <td style={{ padding: '10px', fontWeight: 'bold', fontFamily: 'monospace' }}>#{o.code}</td>
                                                                <td style={{ padding: '10px', color: '#64748b' }}>{new Date(o.createdAt).toLocaleDateString()}</td>
                                                                <td style={{ padding: '10px' }}><span style={{ fontSize: '11px', padding: '2px 6px', background: '#e0f2fe', color: '#0369a1', borderRadius: '4px' }}>{o.state}</span></td>
                                                                <td style={{ padding: '10px' }}>
                                                                    <span style={{ 
                                                                        fontSize: '11px', padding: '2px 6px', borderRadius: '4px',
                                                                        background: o.customFields?.sellerStatus === 'confirmed' ? '#dcfce7' : o.customFields?.sellerStatus === 'refused' ? '#fee2e2' : '#f1f5f9',
                                                                        color: o.customFields?.sellerStatus === 'confirmed' ? '#166534' : o.customFields?.sellerStatus === 'refused' ? '#991b1b' : '#475569'
                                                                    }}>
                                                                        {o.customFields?.sellerStatus || 'pending'}
                                                                    </span>
                                                                </td>
                                                                <td style={{ padding: '10px', textAlign: 'right', fontWeight: 'bold' }}>{formatPrice(o.totalWithTax)}</td>
                                                                <td style={{ padding: '10px', textAlign: 'right', color: '#dc2626' }}>-{formatPrice(comm)}</td>
                                                                <td style={{ padding: '10px', textAlign: 'right', color: '#16a34a', fontWeight: 'bold' }}>{formatPrice(net)}</td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>
                                    ) : (
                                        <p style={{ color: '#64748b', fontSize: '14px', fontStyle: 'italic' }}>Aucune commande enregistrée pour ce vendeur.</p>
                                    )
                                )}
                            </div>

                            {/* Danger Zone */}
                            <div style={{ marginTop: '32px', borderTop: '1px solid #fee2e2', paddingTop: '24px', background: '#fff1f2', padding: '20px', borderRadius: '12px', border: '1px solid #fecaca' }}>
                                <h3 style={{ margin: '0 0 8px 0', fontSize: '16px', color: '#991b1b' }}>⚠️ Zone de Danger</h3>
                                <p style={{ margin: '0 0 16px 0', fontSize: '13px', color: '#7f1d1d' }}>Supprimer définitivement ce vendeur ainsi que tout son compte de la plateforme.</p>
                                
                                {!isDeleteMode ? (
                                    <button 
                                        onClick={() => setIsDeleteMode(true)} 
                                        style={{ 
                                            background: '#dc2626', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '6px', 
                                            cursor: 'pointer', fontWeight: 'bold', fontSize: '14px', transition: 'background-color 0.2s' 
                                        }}
                                        onMouseEnter={e => e.currentTarget.style.background = '#b91c1c'}
                                        onMouseLeave={e => e.currentTarget.style.background = '#dc2626'}
                                    >
                                        Supprimer le vendeur
                                    </button>
                                ) : (
                                    <div style={{ background: 'white', padding: '16px', borderRadius: '8px', border: '1px solid #fecaca' }}>
                                        <h4 style={{ margin: '0 0 12px 0', color: '#991b1b' }}>Confirmation de suppression</h4>
                                        
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '16px' }}>
                                            <label style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '13px', cursor: 'pointer' }}>
                                                <input type="checkbox" checked={deleteProducts} onChange={e => setDeleteProducts(e.target.checked)} style={{ marginTop: '4px' }} />
                                                <span>
                                                    <strong>Supprimer tous les produits</strong>
                                                    <br/><span style={{ color: '#64748b' }}>Si décoché, les produits seront détachés du vendeur mais conservés.</span>
                                                </span>
                                            </label>
                                            
                                            <label style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '13px', cursor: 'pointer' }}>
                                                <input type="checkbox" checked={deleteOrders} onChange={e => setDeleteOrders(e.target.checked)} style={{ marginTop: '4px' }} />
                                                <span>
                                                    <strong>Supprimer l'historique des commandes</strong>
                                                    <br/><span style={{ color: '#64748b' }}>Si décoché, les commandes seront conservées à des fins d'archives.</span>
                                                </span>
                                            </label>
                                        </div>

                                        <div style={{ marginBottom: '16px' }}>
                                            <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px', color: '#64748b' }}>
                                                Pour confirmer, tapez le nom du vendeur : <strong>{vendor.name}</strong>
                                            </label>
                                            <input 
                                                type="text" 
                                                value={confirmName} 
                                                onChange={e => setConfirmName(e.target.value)} 
                                                placeholder={vendor.name}
                                                style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                                            />
                                        </div>

                                        <div style={{ display: 'flex', gap: '12px' }}>
                                            <button 
                                                onClick={() => {
                                                    setIsDeleteMode(false);
                                                    setConfirmName('');
                                                    setDeleteProducts(false);
                                                    setDeleteOrders(false);
                                                }}
                                                style={{ padding: '8px 16px', borderRadius: '4px', border: '1px solid #cbd5e1', background: 'white', cursor: 'pointer' }}
                                            >
                                                Annuler
                                            </button>
                                            <button 
                                                disabled={confirmName !== vendor.name || deleteVendorMutation.isPending}
                                                onClick={() => deleteVendorMutation.mutate({ deleteProducts, deleteOrders })}
                                                style={{ 
                                                    background: confirmName === vendor.name ? '#dc2626' : '#fca5a5', 
                                                    color: 'white', border: 'none', padding: '8px 16px', borderRadius: '4px', 
                                                    cursor: confirmName === vendor.name ? 'pointer' : 'not-allowed', 
                                                    fontWeight: 'bold' 
                                                }}
                                            >
                                                {deleteVendorMutation.isPending ? 'Suppression...' : 'Confirmer la suppression'}
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </>
                ) : null}
            </div>
        </div>
    );
}

// --- Create & Edit Vendor Modal ---
function CreateEditVendorModal({ isOpen, onClose, vendorId, addToast }: { isOpen: boolean; onClose: () => void; vendorId: string | null; addToast: (msg: string, type: 'success' | 'error' | 'info') => void }) {
    const queryClient = useQueryClient();
    const isEdit = !!vendorId;

    const [form, setForm] = useState({
        name: '',
        firstName: '',
        lastName: '',
        email: '',
        phoneNumber: '',
        password: '',
        address: '',
        zone: '',
        description: '',
        commissionRate: 10,
        rccmNumber: '',
        ifuNumber: '',
        idCardNumber: '',
        website: '',
        facebook: '',
        instagram: '',
        paymentMethod: 'MOBILE_MONEY',
        mobileMoneyProvider: 'MTN',
        mobileMoneyNumber: '',
        bankName: '',
        bankAccountNumber: '',
        latitude: '',
        longitude: ''
    });

    const { data, isLoading } = useQuery({
        queryKey: ['vendor', vendorId],
        queryFn: () => fetchGraphQL(GET_VENDOR_DETAIL, { id: vendorId }),
        enabled: !!vendorId && isOpen,
    });

    useEffect(() => {
        if (data?.vendor) {
            const v = data.vendor;
            setForm({
                name: v.name || '',
                firstName: v.firstName || '',
                lastName: v.lastName || '',
                email: v.email || '',
                phoneNumber: v.phoneNumber || '',
                password: '',
                address: v.address || '',
                zone: v.zone || '',
                description: v.description || '',
                commissionRate: v.commissionRate || 10,
                rccmNumber: v.rccmNumber || '',
                ifuNumber: v.ifuNumber || '',
                idCardNumber: v.idCardNumber || '',
                website: v.website || '',
                facebook: v.facebook || '',
                instagram: v.instagram || '',
                paymentMethod: v.paymentMethod || 'MOBILE_MONEY',
                mobileMoneyProvider: v.mobileMoneyProvider || 'MTN',
                mobileMoneyNumber: v.mobileMoneyNumber || '',
                bankName: v.bankName || '',
                bankAccountNumber: v.bankAccountNumber || '',
                latitude: v.latitude ? String(v.latitude) : '',
                longitude: v.longitude ? String(v.longitude) : ''
            });
        } else if (!isEdit && isOpen) {
            setForm({
                name: '',
                firstName: '',
                lastName: '',
                email: '',
                phoneNumber: '',
                password: '',
                address: '',
                zone: '',
                description: '',
                commissionRate: 10,
                rccmNumber: '',
                ifuNumber: '',
                idCardNumber: '',
                website: '',
                facebook: '',
                instagram: '',
                paymentMethod: 'MOBILE_MONEY',
                mobileMoneyProvider: 'MTN',
                mobileMoneyNumber: '',
                bankName: '',
                bankAccountNumber: '',
                latitude: '',
                longitude: ''
            });
        }
    }, [data, vendorId, isOpen]);

    const mutation = useMutation({
        mutationFn: (input: any) => {
            if (isEdit) {
                return fetchGraphQL(UPDATE_VENDOR, { id: vendorId, input });
            } else {
                return fetchGraphQL(CREATE_VENDOR, { input });
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['vendors'] });
            if (isEdit) queryClient.invalidateQueries({ queryKey: ['vendor', vendorId] });
            addToast(isEdit ? 'Profil vendeur mis à jour !' : 'Nouveau vendeur créé avec succès !', 'success');
            onClose();
        },
        onError: (err: any) => addToast(err.message || 'Erreur lors du traitement', 'error')
    });

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const payload: any = { ...form };
        if (isEdit) {
            delete payload.password; // Do not send password field on edit
        }
        payload.latitude = (payload.latitude && String(payload.latitude).trim() !== '') ? Number(payload.latitude) : null;
        payload.longitude = (payload.longitude && String(payload.longitude).trim() !== '') ? Number(payload.longitude) : null;
        payload.commissionRate = Number(payload.commissionRate);
        mutation.mutate(payload);
    };

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 1050, backdropFilter: 'blur(4px)'
        }} onClick={onClose}>
            <div style={{
                background: 'white', borderRadius: '16px', width: '90%', maxWidth: '700px', maxHeight: '90vh',
                overflowY: 'auto', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', position: 'relative',
                padding: '24px'
            }} onClick={e => e.stopPropagation()}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e5e7eb', paddingBottom: '12px', marginBottom: '16px' }}>
                    <h3 style={{ margin: 0 }}>{isEdit ? 'Modifier le Vendeur' : 'Créer un Nouveau Vendeur'}</h3>
                    <button onClick={onClose} style={{ border: 'none', background: '#f3f4f6', borderRadius: '50%', width: '32px', height: '32px', cursor: 'pointer' }}>✕</button>
                </div>

                {isLoading && isEdit ? <div style={{ padding: '24px', textAlign: 'center' }}>Chargement...</div> : (
                    <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '16px' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                            <label style={{ display: 'block' }}>
                                <strong style={{ fontSize: '13px' }}>Nom de la Boutique *</strong>
                                <input required type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '6px', marginTop: '4px' }} />
                            </label>
                            <label style={{ display: 'block' }}>
                                <strong style={{ fontSize: '13px' }}>Adresse Email *</strong>
                                <input required type="email" disabled={isEdit} value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '6px', marginTop: '4px', background: isEdit ? '#f3f4f6' : 'white' }} />
                            </label>
                        </div>

                        {!isEdit && (
                            <label style={{ display: 'block' }}>
                                <strong style={{ fontSize: '13px' }}>Mot de Passe *</strong>
                                <input required type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '6px', marginTop: '4px' }} />
                            </label>
                        )}

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                            <label style={{ display: 'block' }}>
                                <strong style={{ fontSize: '13px' }}>Prénom Gérant</strong>
                                <input type="text" value={form.firstName} onChange={e => setForm({ ...form, firstName: e.target.value })} style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '6px', marginTop: '4px' }} />
                            </label>
                            <label style={{ display: 'block' }}>
                                <strong style={{ fontSize: '13px' }}>Nom Gérant</strong>
                                <input type="text" value={form.lastName} onChange={e => setForm({ ...form, lastName: e.target.value })} style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '6px', marginTop: '4px' }} />
                            </label>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                            <label style={{ display: 'block' }}>
                                <strong style={{ fontSize: '13px' }}>Téléphone</strong>
                                <input type="text" value={form.phoneNumber} onChange={e => setForm({ ...form, phoneNumber: e.target.value })} style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '6px', marginTop: '4px' }} />
                            </label>
                            <label style={{ display: 'block' }}>
                                <strong style={{ fontSize: '13px' }}>Taux de Commission (%)</strong>
                                <input type="number" min="0" max="100" value={form.commissionRate} onChange={e => setForm({ ...form, commissionRate: Number(e.target.value) })} style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '6px', marginTop: '4px' }} />
                            </label>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                            <label style={{ display: 'block' }}>
                                <strong style={{ fontSize: '13px' }}>Adresse Physique</strong>
                                <input type="text" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '6px', marginTop: '4px' }} />
                            </label>
                            <label style={{ display: 'block' }}>
                                <strong style={{ fontSize: '13px' }}>Zone de Livraison</strong>
                                <input type="text" placeholder="Ex: Cotonou - Calavi" value={form.zone} onChange={e => setForm({ ...form, zone: e.target.value })} style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '6px', marginTop: '4px' }} />
                            </label>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                            <label style={{ display: 'block' }}>
                                <strong style={{ fontSize: '13px' }}>RCCM Number</strong>
                                <input type="text" value={form.rccmNumber} onChange={e => setForm({ ...form, rccmNumber: e.target.value })} style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '6px', marginTop: '4px' }} />
                            </label>
                            <label style={{ display: 'block' }}>
                                <strong style={{ fontSize: '13px' }}>IFU Number</strong>
                                <input type="text" value={form.ifuNumber} onChange={e => setForm({ ...form, ifuNumber: e.target.value })} style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '6px', marginTop: '4px' }} />
                            </label>
                            <label style={{ display: 'block' }}>
                                <strong style={{ fontSize: '13px' }}>ID Card Number</strong>
                                <input type="text" value={form.idCardNumber} onChange={e => setForm({ ...form, idCardNumber: e.target.value })} style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '6px', marginTop: '4px' }} />
                            </label>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                            <label style={{ display: 'block' }}>
                                <strong style={{ fontSize: '13px' }}>Website</strong>
                                <input type="text" value={form.website} onChange={e => setForm({ ...form, website: e.target.value })} style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '6px', marginTop: '4px' }} />
                            </label>
                            <label style={{ display: 'block' }}>
                                <strong style={{ fontSize: '13px' }}>Facebook Link</strong>
                                <input type="text" value={form.facebook} onChange={e => setForm({ ...form, facebook: e.target.value })} style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '6px', marginTop: '4px' }} />
                            </label>
                            <label style={{ display: 'block' }}>
                                <strong style={{ fontSize: '13px' }}>Instagram Link</strong>
                                <input type="text" value={form.instagram} onChange={e => setForm({ ...form, instagram: e.target.value })} style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '6px', marginTop: '4px' }} />
                            </label>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                            <label style={{ display: 'block' }}>
                                <strong style={{ fontSize: '13px' }}>Latitude</strong>
                                <input type="text" placeholder="Ex: 6.365" value={form.latitude} onChange={e => setForm({ ...form, latitude: e.target.value })} style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '6px', marginTop: '4px' }} />
                            </label>
                            <label style={{ display: 'block' }}>
                                <strong style={{ fontSize: '13px' }}>Longitude</strong>
                                <input type="text" placeholder="Ex: 2.441" value={form.longitude} onChange={e => setForm({ ...form, longitude: e.target.value })} style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '6px', marginTop: '4px' }} />
                            </label>
                        </div>

                        <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: '12px' }}>
                            <h4 style={{ margin: '0 0 8px 0' }}>Configuration de Paiement</h4>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                <label style={{ display: 'block' }}>
                                    <strong style={{ fontSize: '13px' }}>Méthode de Paiement</strong>
                                    <select value={form.paymentMethod} onChange={e => setForm({ ...form, paymentMethod: e.target.value })} style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '6px', marginTop: '4px' }}>
                                        <option value="MOBILE_MONEY">Mobile Money</option>
                                        <option value="BANK_TRANSFER">Virement Bancaire</option>
                                        <option value="CASH">Espèces</option>
                                    </select>
                                </label>
                                {form.paymentMethod === 'MOBILE_MONEY' ? (
                                    <div style={{ display: 'flex', gap: '12px', flex: 1 }}>
                                        <label style={{ flex: 1, display: 'block' }}>
                                            <strong style={{ fontSize: '13px' }}>Opérateur</strong>
                                            <select value={form.mobileMoneyProvider} onChange={e => setForm({ ...form, mobileMoneyProvider: e.target.value })} style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '6px', marginTop: '4px' }}>
                                                <option value="MTN">MTN</option>
                                                <option value="MOOV">Moov</option>
                                                <option value="CELTIIS">Celtiis</option>
                                            </select>
                                        </label>
                                        <label style={{ flex: 2, display: 'block' }}>
                                            <strong style={{ fontSize: '13px' }}>Numéro Momo</strong>
                                            <input type="text" value={form.mobileMoneyNumber} onChange={e => setForm({ ...form, mobileMoneyNumber: e.target.value })} style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '6px', marginTop: '4px' }} />
                                        </label>
                                    </div>
                                ) : form.paymentMethod === 'BANK_TRANSFER' ? (
                                    <div style={{ display: 'flex', gap: '12px', flex: 1 }}>
                                        <label style={{ flex: 1, display: 'block' }}>
                                            <strong style={{ fontSize: '13px' }}>Banque</strong>
                                            <input type="text" value={form.bankName} onChange={e => setForm({ ...form, bankName: e.target.value })} style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '6px', marginTop: '4px' }} />
                                        </label>
                                        <label style={{ flex: 2, display: 'block' }}>
                                            <strong style={{ fontSize: '13px' }}>N° de compte / RIB</strong>
                                            <input type="text" value={form.bankAccountNumber} onChange={e => setForm({ ...form, bankAccountNumber: e.target.value })} style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '6px', marginTop: '4px' }} />
                                        </label>
                                    </div>
                                ) : null}
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', borderTop: '1px solid #e5e7eb', paddingTop: '16px', marginTop: '8px' }}>
                            <button type="button" onClick={onClose} style={{ padding: '10px 20px', borderRadius: '6px', border: '1px solid #cbd5e1', background: 'white', cursor: 'pointer' }}>Annuler</button>
                            <button type="submit" disabled={mutation.isPending} style={{ padding: '10px 20px', borderRadius: '6px', border: 'none', background: '#2563eb', color: 'white', fontWeight: 'bold', cursor: 'pointer' }}>
                                {mutation.isPending ? 'Enregistrement...' : 'Enregistrer'}
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
}

// --- Main List Component ---
export function VendorListComponent() {
    const [selectedVendorId, setSelectedVendorId] = useState<string | null>(null);
    const [editVendorId, setEditVendorId] = useState<string | null>(null);
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [page, setPage] = useState(1);
    const pageSize = 10;
    const [toasts, setToasts] = useState<Toast[]>([]);

    // Filters
    const [filters, setFilters] = useState<VendorFilterState>({
        searchTerm: '',
        status: '',
        zone: '',
        type: '',
        minRating: ''
    });

    const addToast = (message: string, type: 'success' | 'error' | 'info') => {
        const id = Math.random().toString(36).substring(7);
        setToasts(prev => [...prev, { id, message, type }]);
        setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3000);
    };

    // Construct GraphQL variables dynamically
    const queryVariables = {
        options: {
            take: pageSize,
            skip: (page - 1) * pageSize,
            sort: { createdAt: 'DESC' },
            filter: {} as any
        }
    };

    if (filters.status) queryVariables.options.filter.status = { eq: filters.status };
    if (filters.zone) queryVariables.options.filter.zone = { contains: filters.zone };
    if (filters.type) queryVariables.options.filter.type = { eq: filters.type };
    if (filters.minRating !== '') queryVariables.options.filter.rating = { gte: Number(filters.minRating) };

    if (filters.searchTerm) {
        if (filters.searchTerm.includes('@')) {
            queryVariables.options.filter.email = { contains: filters.searchTerm };
        } else if (filters.searchTerm.match(/^[0-9\+\-\s]+$/)) {
            queryVariables.options.filter.phoneNumber = { contains: filters.searchTerm };
        } else {
            queryVariables.options.filter.name = { contains: filters.searchTerm };
        }
    }

    const { data, isLoading, error } = useQuery({
        queryKey: ['vendors', page, filters],
        queryFn: () => fetchGraphQL(GET_VENDORS, queryVariables),
    });

    const { items = [], totalItems = 0 } = data?.vendors || {};
    const totalPages = Math.ceil(totalItems / pageSize);

    return (
        <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto', fontFamily: 'system-ui, sans-serif' }}>
            <ToastContainer toasts={toasts} removeToast={(id) => setToasts(prev => prev.filter(t => t.id !== id))} />
            
            <VendorDetailModal isOpen={!!selectedVendorId} vendorId={selectedVendorId} onClose={() => setSelectedVendorId(null)} addToast={addToast} />
            <CreateEditVendorModal isOpen={!!editVendorId} vendorId={editVendorId} onClose={() => setEditVendorId(null)} addToast={addToast} />
            <CreateEditVendorModal isOpen={isCreateOpen} vendorId={null} onClose={() => setIsCreateOpen(false)} addToast={addToast} />

            <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h1 style={{ fontSize: '28px', color: '#1f2937', marginBottom: '4px', fontWeight: 800 }}>Gestion des Vendeurs</h1>
                    <p style={{ color: '#6b7280' }}>Gérez les boutiques, approbations, documents, coordonnées géographiques et finances.</p>
                </div>
                <button 
                    onClick={() => setIsCreateOpen(true)}
                    style={{ background: '#2563eb', color: 'white', border: 'none', padding: '12px 24px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px', transition: 'background 0.2s' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#1d4ed8'}
                    onMouseLeave={e => e.currentTarget.style.background = '#2563eb'}
                >
                    + Créer un Vendeur
                </button>
            </div>

            {/* Filter Bar */}
            <div style={{ background: 'white', padding: '20px', borderRadius: '12px', border: '1px solid #e5e7eb', marginBottom: '24px', display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'end' }}>
                <div style={{ flex: '1 1 300px' }}>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>Recherche (Nom, Email, Tél)</label>
                    <input
                        type="text"
                        placeholder="Rechercher..."
                        value={filters.searchTerm}
                        onChange={e => setFilters(prev => ({ ...prev, searchTerm: e.target.value }))}
                        style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #d1d5db' }}
                    />
                </div>
                <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>Statut</label>
                    <select
                        value={filters.status}
                        onChange={e => setFilters(prev => ({ ...prev, status: e.target.value }))}
                        style={{ padding: '8px', borderRadius: '6px', border: '1px solid #d1d5db', minWidth: '140px' }}
                    >
                        <option value="">Tous les statuts</option>
                        <option value="PENDING">En attente</option>
                        <option value="APPROVED">Approuvé</option>
                        <option value="SUSPENDED">Suspendu</option>
                    </select>
                </div>
                <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>Type</label>
                    <select
                        value={filters.type}
                        onChange={e => setFilters(prev => ({ ...prev, type: e.target.value }))}
                        style={{ padding: '8px', borderRadius: '6px', border: '1px solid #d1d5db', minWidth: '140px' }}
                    >
                        <option value="">Tous les types</option>
                        <option value="INDIVIDUAL">Particulier</option>
                        <option value="SHOP">Boutique physique</option>
                        <option value="ENTERPRISE">Entreprise</option>
                    </select>
                </div>
                <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>Zone</label>
                    <input
                        type="text"
                        placeholder="Filtrer par zone"
                        value={filters.zone}
                        onChange={e => setFilters(prev => ({ ...prev, zone: e.target.value }))}
                        style={{ padding: '8px', borderRadius: '6px', border: '1px solid #d1d5db' }}
                    />
                </div>
                <div>
                    <button
                        onClick={() => setFilters({ searchTerm: '', status: '', zone: '', type: '', minRating: '' })}
                        style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid #d1d5db', background: 'white', color: '#666', cursor: 'pointer' }}
                    >
                        Réinitialiser
                    </button>
                </div>
            </div>

            {/* Loading State */}
            {isLoading && <div style={{ textAlign: 'center', padding: '40px' }}>Chargement des vendeurs...</div>}

            {/* Error State */}
            {error && <div style={{ padding: '20px', background: '#fee2e2', color: '#b91c1c', borderRadius: '8px' }}>Erreur: {(error as Error).message}</div>}

            {/* Vendor Grid */}
            {!isLoading && !error && (
                <>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '24px', marginBottom: '24px' }}>
                        {items.length > 0 ? items.map((vendor: any) => (
                            <div key={vendor.id} style={{
                                background: 'white', borderRadius: '12px', border: '1px solid #e5e7eb', padding: '24px', transition: 'box-shadow 0.2s', position: 'relative'
                            }}
                                onMouseEnter={e => e.currentTarget.style.boxShadow = '0 10px 15px -3px rgba(0,0,0,0.1)'}
                                onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
                                    <h3 style={{ margin: 0, fontSize: '18px', color: '#111827', fontWeight: 700 }}>{vendor.name}</h3>
                                    <span style={{
                                        fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '10px', textTransform: 'uppercase',
                                        background: vendor.status === 'APPROVED' ? '#dcfce7' : vendor.status === 'PENDING' ? '#fef9c3' : '#fee2e2',
                                        color: vendor.status === 'APPROVED' ? '#166534' : vendor.status === 'PENDING' ? '#854d0e' : '#991b1b'
                                    }}>{vendor.status}</span>
                                </div>
                                <div style={{ fontSize: '14px', color: '#6b7280', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                    <div>📍 {vendor.zone || 'Pas de zone'}</div>
                                    <div>💰 Solde: <strong>{formatPrice(vendor.walletBalance || 0)}</strong></div>
                                    <div>⭐ Note: {vendor.rating} / 5</div>
                                    <div style={{ fontSize: '12px', marginTop: '6px' }}>📅 Inscrit le {new Date(vendor.createdAt).toLocaleDateString()}</div>
                                </div>

                                <div style={{ display: 'flex', gap: '8px', marginTop: '16px', borderTop: '1px solid #f3f4f6', paddingTop: '12px' }}>
                                    <button 
                                        onClick={() => setSelectedVendorId(vendor.id)}
                                        style={{ flex: 1, padding: '6px 12px', fontSize: '12px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#f8fafc', cursor: 'pointer', fontWeight: 'bold' }}
                                    >👁️ Détails & Financier</button>
                                    <button 
                                        onClick={() => setEditVendorId(vendor.id)}
                                        style={{ padding: '6px 12px', fontSize: '12px', borderRadius: '6px', border: '1px solid #bfdbfe', background: '#eff6ff', color: '#1d4ed8', cursor: 'pointer', fontWeight: 'bold' }}
                                    >✏️ Modifier</button>
                                </div>
                            </div>
                        )) : (
                            <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '40px', color: '#9ca3af' }}>Aucun vendeur trouvé.</div>
                        )}
                    </div>

                    {/* Pagination */}
                    {totalItems > 0 && (
                        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '16px' }}>
                            <button
                                disabled={page === 1}
                                onClick={() => setPage(p => p - 1)}
                                style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid #e5e7eb', background: page === 1 ? '#f3f4f6' : 'white', cursor: page === 1 ? 'not-allowed' : 'pointer' }}
                            >
                                Précédent
                            </button>
                            <span style={{ color: '#4b5563' }}>Page {page} sur {totalPages}</span>
                            <button
                                disabled={page === totalPages}
                                onClick={() => setPage(p => p + 1)}
                                style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid #e5e7eb', background: page === totalPages ? '#f3f4f6' : 'white', cursor: page === totalPages ? 'not-allowed' : 'pointer' }}
                            >
                                Suivant
                            </button>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
