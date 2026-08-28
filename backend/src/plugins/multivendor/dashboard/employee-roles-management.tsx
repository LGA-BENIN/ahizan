import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// --- GraphQL Queries & Mutations ---
const GET_ROLES_AND_EMPLOYEES = `
    query GetRolesAndEmployees {
        roles(options: { take: 100 }) {
            items {
                id
                code
                description
                permissions
            }
            totalItems
        }
        administrators(options: { take: 100 }) {
            items {
                id
                firstName
                lastName
                emailAddress
                user {
                    id
                    roles {
                        id
                        code
                        description
                    }
                }
            }
            totalItems
        }
    }
`;

const UPDATE_ADMINISTRATOR_ROLES = `
    mutation UpdateAdministratorRoles($input: UpdateAdministratorInput!) {
        updateAdministrator(input: $input) {
            id
            firstName
            lastName
            emailAddress
            user {
                id
                roles {
                    id
                    code
                    description
                }
            }
        }
    }
`;

const CREATE_ADMINISTRATOR = `
    mutation CreateAdministrator($input: CreateAdministratorInput!) {
        createAdministrator(input: $input) {
            id
            firstName
            lastName
            emailAddress
        }
    }
`;

const CREATE_ROLE = `
    mutation CreateRole($input: CreateRoleInput!) {
        createRole(input: $input) {
            id
            code
            description
            permissions
        }
    }
`;

const DELETE_ADMINISTRATOR = `
    mutation DeleteAdministrator($id: ID!) {
        deleteAdministrator(id: $id) {
            result
            message
        }
    }
`;

// Helper GraphQL fetcher
async function fetchGraphQL(query: string, variables?: any) {
    const response = await fetch('/admin-api', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ query, variables }),
    });

    if (!response.ok) {
        const text = await response.text();
        throw new Error(`HTTP ${response.status}: ${text.substring(0, 200)}`);
    }

    const json = await response.json();
    if (json.errors) throw new Error(json.errors[0].message);
    return json.data;
}

// Built-in fine-grained roles metadata for rich display
const ROLE_METADATA: Record<string, { icon: string; title: string; category: string; description: string; color: string }> = {
    'catalogue-manager': {
        icon: '📦',
        title: 'Gestionnaire du Catalogue',
        category: 'Catalogue',
        description: 'Supervision globale, validation finale et publication des fiches produits sur le marketplace.',
        color: '#2563eb'
    },
    'catalogue-operator': {
        icon: '✏️',
        title: 'Opérateur Catalogue',
        category: 'Catalogue',
        description: 'Normalisation IA, enrichissement des caractéristiques, correction des données et rédaction.',
        color: '#0284c7'
    },
    'seller-manager': {
        icon: '🏪',
        title: 'Gestionnaire des Vendeurs',
        category: 'Vendeurs',
        description: 'Modération des demandes d\'inscriptions vendeurs, gestion des profils et suspension de boutiques.',
        color: '#7c3aed'
    },
    'order-manager': {
        icon: '🛒',
        title: 'Gestionnaire des Commandes',
        category: 'Ventes',
        description: 'Suivi global des commandes marketplace, annulations et réassignation des lignes d\'ordres.',
        color: '#059669'
    },
    'customer-support': {
        icon: '💬',
        title: 'Support Client & Modération',
        category: 'Support',
        description: 'Suivi des discussions vendeurs/clients, résolution des litiges et tickets d\'assistance.',
        color: '#d97706'
    },
    'logistics-manager': {
        icon: '🚚',
        title: 'Responsable Logistique',
        category: 'Logistique',
        description: 'Configuration des zones de livraison, gestion des hubs et attribution des transporteurs.',
        color: '#dc2626'
    },
    'hub-operator': {
        icon: '🏢',
        title: 'Opérateur de Hub Relais',
        category: 'Logistique',
        description: 'Réception des colis vendeurs en point relais et validation du scan de départ.',
        color: '#475569'
    },
    'finance-manager': {
        icon: '💰',
        title: 'Responsable Financier',
        category: 'Finance',
        description: 'Validation des demandes de retrait des vendeurs et configuration des taux de commission.',
        color: '#166534'
    },
    'finance-operator': {
        icon: '💳',
        title: 'Opérateur Financier',
        category: 'Finance',
        description: 'Exécution des virements Mobile Money/Banque et saisie des pièces comptables.',
        color: '#0d9488'
    },
    'quality-manager': {
        icon: '🛡️',
        title: 'Responsable Qualité & Conformité',
        category: 'Qualité',
        description: 'Contrôle des critères de contrefaçon, suspension des vendeurs non conformes et audits FQS.',
        color: '#b91c1c'
    },
    'analyst': {
        icon: '📊',
        title: 'Analyste Données & Reporting',
        category: 'Reporting',
        description: 'Accès en lecture seule aux tableaux de bord analytiques, ventes globales et statistiques.',
        color: '#4f46e5'
    }
};

export function EmployeeRolesManagementComponent() {
    const queryClient = useQueryClient();
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedRoleFilter, setSelectedRoleFilter] = useState('');

    // Modal states
    const [isCreateEmployeeOpen, setIsCreateEmployeeOpen] = useState(false);
    const [isCreateRoleOpen, setIsCreateRoleOpen] = useState(false);
    const [editingEmployee, setEditingEmployee] = useState<any>(null);

    // Form states
    const [employeeForm, setEmployeeForm] = useState({
        firstName: '',
        lastName: '',
        emailAddress: '',
        password: '',
        roleIds: [] as string[]
    });

    const [roleForm, setRoleForm] = useState({
        code: '',
        description: '',
        permissions: ['ReadCatalog', 'ReadOrder', 'ReadCustomer']
    });

    // Fetch Roles and Administrators
    const { data, isLoading, error } = useQuery({
        queryKey: ['rolesAndEmployees'],
        queryFn: () => fetchGraphQL(GET_ROLES_AND_EMPLOYEES)
    });

    const roles = data?.roles?.items || [];
    const administrators = data?.administrators?.items || [];

    // Filter employees
    const filteredEmployees = administrators.filter((admin: any) => {
        const fullName = `${admin.firstName} ${admin.lastName} ${admin.emailAddress}`.toLowerCase();
        const matchesSearch = fullName.includes(searchTerm.toLowerCase());
        const userRoleCodes = admin.user?.roles?.map((r: any) => r.code) || [];
        const matchesRole = !selectedRoleFilter || userRoleCodes.includes(selectedRoleFilter);
        return matchesSearch && matchesRole;
    });

    // Mutations
    const updateRolesMutation = useMutation({
        mutationFn: ({ adminId, roleIds, firstName, lastName, emailAddress }: any) =>
            fetchGraphQL(UPDATE_ADMINISTRATOR_ROLES, {
                input: {
                    id: adminId,
                    firstName,
                    lastName,
                    emailAddress,
                    roleIds
                }
            }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['rolesAndEmployees'] });
            setEditingEmployee(null);
            alert('Rôles mis à jour avec succès !');
        },
        onError: (err: any) => {
            alert('Erreur lors de la mise à jour : ' + err.message);
        }
    });

    const createAdminMutation = useMutation({
        mutationFn: (variables: any) => fetchGraphQL(CREATE_ADMINISTRATOR, {
            input: {
                firstName: variables.firstName,
                lastName: variables.lastName,
                emailAddress: variables.emailAddress,
                password: variables.password,
                roleIds: variables.roleIds
            }
        }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['rolesAndEmployees'] });
            setIsCreateEmployeeOpen(false);
            setEmployeeForm({ firstName: '', lastName: '', emailAddress: '', password: '', roleIds: [] });
            alert('Compte employé créé avec succès !');
        },
        onError: (err: any) => {
            alert('Erreur de création : ' + err.message);
        }
    });

    const createRoleMutation = useMutation({
        mutationFn: (variables: any) => fetchGraphQL(CREATE_ROLE, {
            input: {
                code: variables.code.toLowerCase().replace(/\s+/g, '-'),
                description: variables.description,
                permissions: variables.permissions
            }
        }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['rolesAndEmployees'] });
            setIsCreateRoleOpen(false);
            setRoleForm({ code: '', description: '', permissions: ['ReadCatalog', 'ReadOrder'] });
            alert('Nouveau rôle créé avec succès !');
        },
        onError: (err: any) => {
            alert('Erreur lors de la création du rôle : ' + err.message);
        }
    });

    const deleteAdminMutation = useMutation({
        mutationFn: (id: string) => fetchGraphQL(DELETE_ADMINISTRATOR, { id }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['rolesAndEmployees'] });
            alert('Compte employé supprimé avec succès.');
        },
        onError: (err: any) => {
            alert('Erreur de suppression : ' + err.message);
        }
    });

    const handleToggleRoleForEmployee = (admin: any, roleId: string) => {
        const currentRoleIds = admin.user?.roles?.map((r: any) => r.id) || [];
        const newRoleIds = currentRoleIds.includes(roleId)
            ? currentRoleIds.filter((id: string) => id !== roleId)
            : [...currentRoleIds, roleId];

        updateRolesMutation.mutate({
            adminId: admin.id,
            firstName: admin.firstName,
            lastName: admin.lastName,
            emailAddress: admin.emailAddress,
            roleIds: newRoleIds
        });
    };

    return (
        <div style={{ padding: '28px', maxWidth: '1480px', margin: '0 auto', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
            
            {/* Header */}
            <div style={{ marginBottom: '28px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h1 style={{ fontSize: '28px', fontWeight: 800, color: '#0f172a', margin: 0, letterSpacing: '-0.02em' }}>
                        🛡️ Gestion des Rôles & Employés Back-office
                    </h1>
                    <p style={{ color: '#64748b', marginTop: '4px', fontSize: '14px' }}>
                        Configurez les autorisations d'accès fines (RBAC) et attribuez les rôles métier aux comptes employés du back-office.
                    </p>
                </div>
                <div style={{ display: 'flex', gap: '12px' }}>
                    <button
                        onClick={() => setIsCreateRoleOpen(true)}
                        style={{ background: '#ffffff', color: '#0f172a', border: '1px solid #cbd5e1', padding: '10px 18px', borderRadius: '10px', fontWeight: 700, fontSize: '13px', cursor: 'pointer' }}
                    >
                        + Créer un Rôle Sur Mesure
                    </button>
                    <button
                        onClick={() => setIsCreateEmployeeOpen(true)}
                        style={{ background: '#2563eb', color: '#ffffff', border: 'none', padding: '10px 20px', borderRadius: '10px', fontWeight: 800, fontSize: '13px', cursor: 'pointer', boxShadow: '0 4px 6px -1px rgba(37, 99, 235, 0.3)' }}
                    >
                        + Nouvel Employé
                    </button>
                </div>
            </div>

            {/* Quick Stats Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '28px' }}>
                <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '18px' }}>
                    <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Comptes Employés</span>
                    <div style={{ fontSize: '28px', fontWeight: 900, color: '#0f172a', marginTop: '4px' }}>{administrators.length}</div>
                </div>
                <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '18px' }}>
                    <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Rôles Métier Disponibles</span>
                    <div style={{ fontSize: '28px', fontWeight: 900, color: '#2563eb', marginTop: '4px' }}>{roles.length}</div>
                </div>
                <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '18px' }}>
                    <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Opérateurs Catalogue</span>
                    <div style={{ fontSize: '28px', fontWeight: 900, color: '#0284c7', marginTop: '4px' }}>
                        {administrators.filter((a: any) => a.user?.roles?.some((r: any) => r.code.includes('catalogue'))).length}
                    </div>
                </div>
                <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '18px' }}>
                    <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Superviseurs & Managers</span>
                    <div style={{ fontSize: '28px', fontWeight: 900, color: '#059669', marginTop: '4px' }}>
                        {administrators.filter((a: any) => a.user?.roles?.some((r: any) => r.code.includes('manager'))).length}
                    </div>
                </div>
            </div>

            {/* SECTION 1: ROLES OVERVIEW MATRIX */}
            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '24px', marginBottom: '28px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a', margin: '0 0 16px 0' }}>
                    📋 Répertoire des Rôles Métier Funs & Permissions
                </h2>
                
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
                    {roles.map((role: any) => {
                        const meta = ROLE_METADATA[role.code] || {
                            icon: '🛡️',
                            title: role.code,
                            category: 'Général',
                            description: role.description || 'Rôle personnalisé du système.',
                            color: '#475569'
                        };
                        const assignedCount = administrators.filter((a: any) => a.user?.roles?.some((r: any) => r.id === role.id)).length;

                        return (
                            <div key={role.id} style={{ background: '#f8fafc', border: `1px solid #e2e8f0`, borderLeft: `4px solid ${meta.color}`, borderRadius: '12px', padding: '16px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <span style={{ fontSize: '20px' }}>{meta.icon}</span>
                                        <div>
                                            <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 800, color: '#0f172a' }}>{meta.title}</h3>
                                            <span style={{ fontSize: '10px', color: '#64748b', fontFamily: 'monospace' }}>Code: {role.code}</span>
                                        </div>
                                    </div>
                                    <span style={{ fontSize: '11px', fontWeight: 800, background: '#e2e8f0', color: '#334155', padding: '2px 8px', borderRadius: '9999px' }}>
                                        {assignedCount} employé(s)
                                    </span>
                                </div>
                                <p style={{ fontSize: '12px', color: '#475569', margin: '0 0 12px 0', minHeight: '36px' }}>
                                    {meta.description}
                                </p>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                                    {(role.permissions || []).slice(0, 4).map((perm: string) => (
                                        <span key={perm} style={{ fontSize: '9px', fontWeight: 700, background: '#ffffff', border: '1px solid #cbd5e1', color: '#334155', padding: '2px 6px', borderRadius: '4px' }}>
                                            {perm}
                                        </span>
                                    ))}
                                    {(role.permissions || []).length > 4 && (
                                        <span style={{ fontSize: '9px', fontWeight: 700, background: '#ffffff', color: '#64748b', padding: '2px 6px' }}>
                                            +{(role.permissions || []).length - 4} autres
                                        </span>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* SECTION 2: EMPLOYEES DIRECTORY & ROLE ALLOCATION TABLE */}
            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '16px' }}>
                    <div>
                        <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                            👥 Annuaire des Employés & Attribution Rapide des Rôles
                        </h2>
                        <p style={{ fontSize: '13px', color: '#64748b', margin: '2px 0 0 0' }}>
                            Cochez les rôles directement pour affecter ou révoquer des accès en temps réel.
                        </p>
                    </div>

                    {/* Search & Filter */}
                    <div style={{ display: 'flex', gap: '12px' }}>
                        <input
                            type="text"
                            placeholder="Rechercher un employé..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', width: '220px' }}
                        />
                        <select
                            value={selectedRoleFilter}
                            onChange={(e) => setSelectedRoleFilter(e.target.value)}
                            style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', background: 'white' }}
                        >
                            <option value="">Tous les rôles</option>
                            {roles.map((r: any) => (
                                <option key={r.id} value={r.code}>{r.code}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {isLoading ? (
                    <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>Chargement de l'annuaire des employés...</div>
                ) : error ? (
                    <div style={{ color: '#dc2626', padding: '20px' }}>Erreur: {(error as Error).message}</div>
                ) : (
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                            <thead>
                                <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', color: '#475569', fontWeight: 700 }}>
                                    <th style={{ padding: '12px 16px' }}>Employé / Compte</th>
                                    <th style={{ padding: '12px 16px' }}>Rôles Actuels</th>
                                    <th style={{ padding: '12px 16px' }}>Attribution Rapide des Rôles</th>
                                    <th style={{ padding: '12px 16px', textAlign: 'right' }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredEmployees.length === 0 ? (
                                    <tr>
                                        <td colSpan={4} style={{ padding: '30px', textAlign: 'center', color: '#64748b', fontStyle: 'italic' }}>
                                            Aucun employé trouvé.
                                        </td>
                                    </tr>
                                ) : (
                                    filteredEmployees.map((admin: any) => {
                                        const adminRoleIds = admin.user?.roles?.map((r: any) => r.id) || [];
                                        const adminRoleCodes = admin.user?.roles?.map((r: any) => r.code) || [];

                                        return (
                                            <tr key={admin.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                                <td style={{ padding: '14px 16px' }}>
                                                    <div style={{ fontWeight: 800, color: '#0f172a' }}>{admin.firstName} {admin.lastName}</div>
                                                    <div style={{ fontSize: '12px', color: '#64748b' }}>{admin.emailAddress}</div>
                                                </td>
                                                <td style={{ padding: '14px 16px' }}>
                                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                                                        {adminRoleCodes.map((code: string) => {
                                                            const meta = ROLE_METADATA[code];
                                                            return (
                                                                <span key={code} style={{
                                                                    fontSize: '11px', fontWeight: 800, padding: '3px 8px', borderRadius: '6px',
                                                                    background: meta?.color ? `${meta.color}15` : '#e2e8f0',
                                                                    color: meta?.color || '#334155',
                                                                    border: `1px solid ${meta?.color ? `${meta.color}40` : '#cbd5e1'}`
                                                                }}>
                                                                    {meta?.icon || '🛡️'} {meta?.title || code}
                                                                </span>
                                                            );
                                                        })}
                                                    </div>
                                                </td>
                                                <td style={{ padding: '14px 16px' }}>
                                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', maxWidth: '500px' }}>
                                                        {roles.map((role: any) => {
                                                            const isAssigned = adminRoleIds.includes(role.id);
                                                            return (
                                                                <label key={role.id} style={{
                                                                    display: 'inline-flex', alignItems: 'center', gap: '4px', cursor: 'pointer',
                                                                    fontSize: '11px', padding: '3px 8px', borderRadius: '6px',
                                                                    background: isAssigned ? '#dbeafe' : '#f8fafc',
                                                                    border: `1px solid ${isAssigned ? '#93c5fd' : '#e2e8f0'}`,
                                                                    fontWeight: isAssigned ? 800 : 500,
                                                                    color: isAssigned ? '#1e40af' : '#64748b'
                                                                }}>
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={isAssigned}
                                                                        onChange={() => handleToggleRoleForEmployee(admin, role.id)}
                                                                        style={{ width: '12px', height: '12px', cursor: 'pointer' }}
                                                                    />
                                                                    <span>{role.code}</span>
                                                                </label>
                                                            );
                                                        })}
                                                    </div>
                                                </td>
                                                <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                                                    <button
                                                        onClick={() => {
                                                            if (confirm(`Supprimer le compte employé ${admin.firstName} ${admin.lastName} ?`)) {
                                                                deleteAdminMutation.mutate(admin.id);
                                                            }
                                                        }}
                                                        style={{ background: '#fee2e2', color: '#991b1b', border: 'none', padding: '6px 12px', borderRadius: '6px', fontWeight: 700, fontSize: '11px', cursor: 'pointer' }}
                                                    >
                                                        Supprimer
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* CREATE EMPLOYEE MODAL */}
            {isCreateEmployeeOpen && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
                    <div style={{ background: 'white', padding: '28px', borderRadius: '16px', width: '480px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }}>
                        <h3 style={{ marginTop: 0, fontSize: '18px', fontWeight: 800, color: '#0f172a' }}>➕ Créer un Compte Employé Back-office</h3>
                        <form onSubmit={(e) => { e.preventDefault(); createAdminMutation.mutate(employeeForm); }} style={{ display: 'grid', gap: '14px', marginTop: '16px' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                <div>
                                    <label style={{ fontSize: '12px', fontWeight: 700 }}>Prénom *</label>
                                    <input required type="text" value={employeeForm.firstName} onChange={e => setEmployeeForm({ ...employeeForm, firstName: e.target.value })} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', marginTop: '4px' }} />
                                </div>
                                <div>
                                    <label style={{ fontSize: '12px', fontWeight: 700 }}>Nom *</label>
                                    <input required type="text" value={employeeForm.lastName} onChange={e => setEmployeeForm({ ...employeeForm, lastName: e.target.value })} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', marginTop: '4px' }} />
                                </div>
                            </div>
                            <div>
                                <label style={{ fontSize: '12px', fontWeight: 700 }}>Adresse Email *</label>
                                <input required type="email" value={employeeForm.emailAddress} onChange={e => setEmployeeForm({ ...employeeForm, emailAddress: e.target.value })} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', marginTop: '4px' }} />
                            </div>
                            <div>
                                <label style={{ fontSize: '12px', fontWeight: 700 }}>Mot de passe initial *</label>
                                <input required type="password" value={employeeForm.password} onChange={e => setEmployeeForm({ ...employeeForm, password: e.target.value })} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', marginTop: '4px' }} />
                            </div>
                            <div>
                                <label style={{ fontSize: '12px', fontWeight: 700, display: 'block', marginBottom: '6px' }}>Sélectionner les Rôles de l'Employé</label>
                                <div style={{ maxHeight: '140px', overflowY: 'auto', border: '1px solid #cbd5e1', padding: '8px', borderRadius: '6px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                    {roles.map((r: any) => (
                                        <label key={r.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', cursor: 'pointer' }}>
                                            <input
                                                type="checkbox"
                                                checked={employeeForm.roleIds.includes(r.id)}
                                                onChange={(e) => {
                                                    const checked = e.target.checked;
                                                    setEmployeeForm(prev => ({
                                                        ...prev,
                                                        roleIds: checked ? [...prev.roleIds, r.id] : prev.roleIds.filter(id => id !== r.id)
                                                    }));
                                                }}
                                            />
                                            <strong style={{ color: '#0f172a' }}>{r.code}</strong> — <span style={{ color: '#64748b' }}>{r.description || 'Rôle'}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '12px' }}>
                                <button type="button" onClick={() => setIsCreateEmployeeOpen(false)} style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #cbd5e1', background: 'white', cursor: 'pointer' }}>Annuler</button>
                                <button type="submit" disabled={createAdminMutation.isPending} style={{ padding: '8px 20px', borderRadius: '8px', border: 'none', background: '#2563eb', color: 'white', fontWeight: 800, cursor: 'pointer' }}>
                                    {createAdminMutation.isPending ? 'Création...' : 'Créer le Compte'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* CREATE CUSTOM ROLE MODAL */}
            {isCreateRoleOpen && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
                    <div style={{ background: 'white', padding: '28px', borderRadius: '16px', width: '500px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }}>
                        <h3 style={{ marginTop: 0, fontSize: '18px', fontWeight: 800, color: '#0f172a' }}>🛡️ Créer un Rôle Métier Sur Mesure</h3>
                        <form onSubmit={(e) => { e.preventDefault(); createRoleMutation.mutate(roleForm); }} style={{ display: 'grid', gap: '14px', marginTop: '16px' }}>
                            <div>
                                <label style={{ fontSize: '12px', fontWeight: 700 }}>Code du Rôle (ex: agent-qualite) *</label>
                                <input required type="text" value={roleForm.code} onChange={e => setRoleForm({ ...roleForm, code: e.target.value })} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', marginTop: '4px' }} />
                            </div>
                            <div>
                                <label style={{ fontSize: '12px', fontWeight: 700 }}>Description des responsabilités *</label>
                                <input required type="text" value={roleForm.description} onChange={e => setRoleForm({ ...roleForm, description: e.target.value })} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', marginTop: '4px' }} />
                            </div>
                            <div>
                                <label style={{ fontSize: '12px', fontWeight: 700, display: 'block', marginBottom: '6px' }}>Permissions système Vendure</label>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', maxHeight: '140px', overflowY: 'auto', border: '1px solid #cbd5e1', padding: '8px', borderRadius: '6px' }}>
                                    {['ReadCatalog', 'UpdateCatalog', 'CreateCatalog', 'DeleteCatalog', 'ReadOrder', 'UpdateOrder', 'ReadCustomer', 'UpdateCustomer', 'ReadSeller', 'UpdateSeller'].map((perm) => (
                                        <label key={perm} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', cursor: 'pointer' }}>
                                            <input
                                                type="checkbox"
                                                checked={roleForm.permissions.includes(perm)}
                                                onChange={(e) => {
                                                    const checked = e.target.checked;
                                                    setRoleForm(prev => ({
                                                        ...prev,
                                                        permissions: checked ? [...prev.permissions, perm] : prev.permissions.filter(p => p !== perm)
                                                    }));
                                                }}
                                            />
                                            <span>{perm}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '12px' }}>
                                <button type="button" onClick={() => setIsCreateRoleOpen(false)} style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #cbd5e1', background: 'white', cursor: 'pointer' }}>Annuler</button>
                                <button type="submit" disabled={createRoleMutation.isPending} style={{ padding: '8px 20px', borderRadius: '8px', border: 'none', background: '#059669', color: 'white', fontWeight: 800, cursor: 'pointer' }}>
                                    {createRoleMutation.isPending ? 'Enregistrement...' : 'Créer le Rôle'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

        </div>
    );
}
