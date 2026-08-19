import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// --- GraphQL Fetcher ---
async function fetchGraphQL(query: string, variables?: any) {
    const apiUrl = '/admin-api';
    const response = await fetch(apiUrl, {
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

// --- GraphQL Operations ---
const GET_ADMIN_CONVERSATIONS = `
  query GetAdminConversations {
    adminConversations {
      customer {
        id
        firstName
        lastName
        emailAddress
      }
      vendor {
        id
        name
      }
      lastMessage {
        id
        createdAt
        sender
        content
        deleted
        modified
        seen
      }
    }
  }
`;

const GET_ADMIN_CHAT_HISTORY = `
  query GetAdminChatHistory($customerId: ID!, $vendorId: ID!) {
    adminChatHistory(customerId: $customerId, vendorId: $vendorId) {
      id
      createdAt
      sender
      content
      deleted
      modified
      seen
    }
  }
`;

const ADMIN_REPLY_TO_CONVERSATION = `
  mutation AdminReplyToConversation($customerId: ID!, $vendorId: ID!, $content: String!) {
    adminReplyToConversation(customerId: $customerId, vendorId: $vendorId, content: $content) {
      id
      createdAt
      sender
      content
      deleted
      modified
      seen
    }
  }
`;

const GET_VENDORS_LIST = `
  query GetVendorsList {
    vendors(options: { take: 100 }) {
      items {
        id
        name
        email
      }
    }
  }
`;

const GET_CUSTOMERS_LIST = `
  query GetCustomersList {
    customers(options: { take: 100 }) {
      items {
        id
        firstName
        lastName
        emailAddress
      }
    }
  }
`;

const GET_ADMIN_DIRECT_CHAT_HISTORY = `
  query GetAdminDirectChatHistory($targetId: ID!, $targetType: String!) {
    adminDirectChatHistory(targetId: $targetId, targetType: $targetType) {
      id
      createdAt
      sender
      content
      deleted
      modified
      seen
    }
  }
`;

const ADMIN_SEND_DIRECT_MESSAGE = `
  mutation AdminSendDirectMessage($targetId: ID!, $targetType: String!, $content: String!) {
    adminSendDirectMessage(targetId: $targetId, targetType: $targetType, content: $content) {
      id
      createdAt
      sender
      content
      deleted
      modified
      seen
    }
  }
`;

const DELETE_CHAT_MESSAGE = `
  mutation DeleteChatMessage($id: ID!) {
    deleteChatMessage(id: $id) {
      id
      deleted
    }
  }
`;

const MODIFY_CHAT_MESSAGE = `
  mutation ModifyChatMessage($id: ID!, $content: String!) {
    modifyChatMessage(id: $id, content: $content) {
      id
      content
      modified
    }
  }
`;

const SET_TYPING = `
  mutation SetTyping($targetId: ID!, $targetType: String!, $typing: Boolean!) {
    setTyping(targetId: $targetId, targetType: $targetType, typing: $typing)
  }
`;

const IS_TYPING = `
  query IsTyping($targetId: ID!, $targetType: String!) {
    isTyping(targetId: $targetId, targetType: $targetType)
  }
`;

export function SuivreDiscussionsComponent() {
    const queryClient = useQueryClient();
    const [activeTab, setActiveTab] = useState<'monitoring' | 'vendors' | 'customers'>('monitoring');
    const [selectedItem, setSelectedItem] = useState<any>(null); // For active chat
    const [messageText, setMessageText] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editValue, setEditValue] = useState('');
    const [isOtherPartyTyping, setIsOtherPartyTyping] = useState(false);
    
    const sentTypingRef = useRef<boolean>(false);
    const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to bottom of chat
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    // 1. Fetch Conversations for Monitoring
    const { data: monitoredData, isLoading: loadingMonitored, refetch: refetchMonitored } = useQuery({
        queryKey: ['adminConversations'],
        queryFn: () => fetchGraphQL(GET_ADMIN_CONVERSATIONS),
        enabled: activeTab === 'monitoring',
        refetchInterval: 5000, // Poll every 5s for real-time
    });

    // 2. Fetch Vendors list
    const { data: vendorsData, isLoading: loadingVendors } = useQuery({
        queryKey: ['adminVendorsList'],
        queryFn: () => fetchGraphQL(GET_VENDORS_LIST),
        enabled: activeTab === 'vendors',
    });

    // 3. Fetch Customers list
    const { data: customersData, isLoading: loadingCustomers } = useQuery({
        queryKey: ['adminCustomersList'],
        queryFn: () => fetchGraphQL(GET_CUSTOMERS_LIST),
        enabled: activeTab === 'customers',
    });

    // 4. Fetch active conversation messages
    const isDirect = activeTab !== 'monitoring';
    const activeChatKey = selectedItem ? `${activeTab}_${selectedItem.id || (selectedItem.customer?.id + '_' + selectedItem.vendor?.id)}` : '';

    const { data: chatHistoryData, isLoading: loadingHistory, refetch: refetchHistory } = useQuery({
        queryKey: ['chatHistory', activeChatKey],
        queryFn: () => {
            if (activeTab === 'monitoring') {
                return fetchGraphQL(GET_ADMIN_CHAT_HISTORY, {
                    customerId: selectedItem.customer.id,
                    vendorId: selectedItem.vendor.id,
                });
            } else {
                return fetchGraphQL(GET_ADMIN_DIRECT_CHAT_HISTORY, {
                    targetId: selectedItem.id,
                    targetType: activeTab === 'vendors' ? 'VENDOR' : 'CUSTOMER',
                });
            }
        },
        enabled: !!selectedItem,
        refetchInterval: 3000, // Poll active chat every 3s
    });

    useEffect(() => {
        scrollToBottom();
    }, [chatHistoryData]);

    // Send message mutation
    const sendMessageMutation = useMutation({
        mutationFn: (text: string) => {
            if (activeTab === 'monitoring') {
                return fetchGraphQL(ADMIN_REPLY_TO_CONVERSATION, {
                    customerId: selectedItem.customer.id,
                    vendorId: selectedItem.vendor.id,
                    content: text,
                });
            } else {
                return fetchGraphQL(ADMIN_SEND_DIRECT_MESSAGE, {
                    targetId: selectedItem.id,
                    targetType: activeTab === 'vendors' ? 'VENDOR' : 'CUSTOMER',
                    content: text,
                });
            }
        },
        onSuccess: () => {
            setMessageText('');
            refetchHistory();
            if (activeTab === 'monitoring') refetchMonitored();
        },
    });

    const handleDeleteMessage = async (messageId: string) => {
        if (!window.confirm("Voulez-vous supprimer ce message ?")) return;
        try {
            await fetchGraphQL(DELETE_CHAT_MESSAGE, { id: messageId });
            refetchHistory();
        } catch (error: any) {
            alert("Erreur: " + error.message);
        }
    };

    const handleEditMessage = async (messageId: string, newContent: string) => {
        if (!newContent.trim()) return;
        try {
            await fetchGraphQL(MODIFY_CHAT_MESSAGE, { id: messageId, content: newContent });
            setEditingId(null);
            setEditValue('');
            refetchHistory();
        } catch (error: any) {
            alert("Erreur: " + error.message);
        }
    };

    useEffect(() => {
        if (!selectedItem) {
            setIsOtherPartyTyping(false);
            return;
        }
        const interval = setInterval(async () => {
            if (activeTab === 'vendors') {
                const res = await fetchGraphQL(IS_TYPING, { targetId: selectedItem.id, targetType: 'VENDOR' });
                setIsOtherPartyTyping(res.isTyping || false);
            } else if (activeTab === 'customers') {
                const res = await fetchGraphQL(IS_TYPING, { targetId: selectedItem.id, targetType: 'CUSTOMER' });
                setIsOtherPartyTyping(res.isTyping || false);
            } else {
                const customerRes = await fetchGraphQL(IS_TYPING, { targetId: selectedItem.customer.id, targetType: 'CUSTOMER' });
                const vendorRes = await fetchGraphQL(IS_TYPING, { targetId: selectedItem.vendor.id, targetType: 'VENDOR' });
                setIsOtherPartyTyping(customerRes.isTyping || vendorRes.isTyping || false);
            }
        }, 4000);
        return () => clearInterval(interval);
    }, [selectedItem, activeTab]);

    useEffect(() => {
        if (!selectedItem) return;
        const targetId = activeTab === 'monitoring' ? selectedItem.vendor.id : selectedItem.id;
        const targetType = 'SUPERADMIN';

        if (messageText.trim().length > 0) {
            if (!sentTypingRef.current) {
                sentTypingRef.current = true;
                fetchGraphQL(SET_TYPING, { targetId, targetType, typing: true });
            }
            if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
            typingTimeoutRef.current = setTimeout(() => {
                sentTypingRef.current = false;
                fetchGraphQL(SET_TYPING, { targetId, targetType, typing: false });
            }, 3000);
        } else {
            if (sentTypingRef.current) {
                sentTypingRef.current = false;
                fetchGraphQL(SET_TYPING, { targetId, targetType, typing: false });
            }
        }
    }, [messageText, selectedItem]);

    const handleSendMessage = (e: React.FormEvent) => {
        e.preventDefault();
        if (!messageText.trim() || sendMessageMutation.isPending) return;
        sendMessageMutation.mutate(messageText.trim());
    };

    // Filter lists
    const conversations = monitoredData?.adminConversations || [];
    const vendors = vendorsData?.vendors?.items || [];
    const customers = customersData?.customers?.items || [];

    const filteredItems = () => {
        if (activeTab === 'monitoring') {
            return conversations.filter((c: any) => {
                const search = searchQuery.toLowerCase();
                const clientName = `${c.customer?.firstName} ${c.customer?.lastName}`.toLowerCase();
                const vendorName = (c.vendor?.name || '').toLowerCase();
                return clientName.includes(search) || vendorName.includes(search);
            });
        } else if (activeTab === 'vendors') {
            return vendors.filter((v: any) => v.name.toLowerCase().includes(searchQuery.toLowerCase()));
        } else {
            return customers.filter((c: any) => {
                const name = `${c.firstName} ${c.lastName}`.toLowerCase();
                return name.includes(searchQuery.toLowerCase());
            });
        }
    };

    const messages = activeTab === 'monitoring'
        ? (chatHistoryData?.adminChatHistory || [])
        : (chatHistoryData?.adminDirectChatHistory || []);

    return (
        <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', height: 'calc(100vh - 120px)', boxSizing: 'border-box', fontFamily: 'sans-serif' }}>
            <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '16px', color: '#1e293b' }}>
                💬 Suivre les discussions
            </h2>

            {/* Navigation Tabs */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px' }}>
                <button
                    onClick={() => { setActiveTab('monitoring'); setSelectedItem(null); setSearchQuery(''); }}
                    style={{
                        padding: '8px 16px',
                        borderRadius: '6px',
                        border: 'none',
                        background: activeTab === 'monitoring' ? '#f97316' : 'transparent',
                        color: activeTab === 'monitoring' ? 'white' : '#64748b',
                        fontWeight: 'bold',
                        cursor: 'pointer',
                        transition: '0.2s',
                    }}
                >
                    👁️ Interventions (Clients ↔ Vendeurs)
                </button>
                <button
                    onClick={() => { setActiveTab('vendors'); setSelectedItem(null); setSearchQuery(''); }}
                    style={{
                        padding: '8px 16px',
                        borderRadius: '6px',
                        border: 'none',
                        background: activeTab === 'vendors' ? '#f97316' : 'transparent',
                        color: activeTab === 'vendors' ? 'white' : '#64748b',
                        fontWeight: 'bold',
                        cursor: 'pointer',
                        transition: '0.2s',
                    }}
                >
                    🏪 Chat avec les Vendeurs
                </button>
                <button
                    onClick={() => { setActiveTab('customers'); setSelectedItem(null); setSearchQuery(''); }}
                    style={{
                        padding: '8px 16px',
                        borderRadius: '6px',
                        border: 'none',
                        background: activeTab === 'customers' ? '#f97316' : 'transparent',
                        color: activeTab === 'customers' ? 'white' : '#64748b',
                        fontWeight: 'bold',
                        cursor: 'pointer',
                        transition: '0.2s',
                    }}
                >
                    👤 Chat avec les Clients
                </button>
            </div>

            {/* Main Layout Area */}
            <div style={{ display: 'flex', flex: 1, gap: '20px', minHeight: 0 }}>
                {/* Left Panel: List */}
                <div style={{ width: '320px', display: 'flex', flexDirection: 'column', background: 'white', borderRadius: '8px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                    <div style={{ padding: '12px', borderBottom: '1px solid #e2e8f0' }}>
                        <input
                            type="text"
                            placeholder="Rechercher..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            style={{
                                width: '100%',
                                padding: '8px 12px',
                                border: '1px solid #cbd5e1',
                                borderRadius: '6px',
                                boxSizing: 'border-box',
                            }}
                        />
                    </div>

                    <div style={{ flex: 1, overflowY: 'auto' }}>
                        {activeTab === 'monitoring' && loadingMonitored && <div style={{ padding: '20px', textAlign: 'center', color: '#64748b' }}>Chargement...</div>}
                        {activeTab === 'vendors' && loadingVendors && <div style={{ padding: '20px', textAlign: 'center', color: '#64748b' }}>Chargement...</div>}
                        {activeTab === 'customers' && loadingCustomers && <div style={{ padding: '20px', textAlign: 'center', color: '#64748b' }}>Chargement...</div>}

                        {!loadingMonitored && !loadingVendors && !loadingCustomers && filteredItems().length === 0 && (
                            <div style={{ padding: '20px', textAlign: 'center', color: '#94a3b8' }}>Aucun élément found.</div>
                        )}

                        {filteredItems().map((item: any, index: number) => {
                            const isSelected = selectedItem && (
                                activeTab === 'monitoring'
                                    ? (selectedItem.customer?.id === item.customer?.id && selectedItem.vendor?.id === item.vendor?.id)
                                    : (selectedItem.id === item.id)
                            );

                            return (
                                <div
                                    key={index}
                                    onClick={() => setSelectedItem(item)}
                                    style={{
                                        padding: '12px 16px',
                                        borderBottom: '1px solid #f1f5f9',
                                        cursor: 'pointer',
                                        background: isSelected ? '#fff7ed' : 'transparent',
                                        borderLeft: isSelected ? '4px solid #f97316' : '4px solid transparent',
                                        transition: '0.2s',
                                    }}
                                >
                                    {activeTab === 'monitoring' ? (
                                        <>
                                            <div style={{ fontWeight: 'bold', color: '#334155', fontSize: '13px' }}>
                                                {item.customer?.firstName} {item.customer?.lastName}
                                            </div>
                                            <div style={{ fontSize: '11px', color: '#f97316', marginTop: '2px', fontWeight: 600 }}>
                                                Boutique: {item.vendor?.name}
                                            </div>
                                            {item.lastMessage && (
                                                <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                    {item.lastMessage.sender === 'SUPERADMIN' ? 'Admin: ' : ''}{item.lastMessage.content}
                                                </div>
                                            )}
                                        </>
                                    ) : (
                                        <>
                                            <div style={{ fontWeight: 'bold', color: '#334155', fontSize: '13px' }}>
                                                {activeTab === 'vendors' ? item.name : `${item.firstName} ${item.lastName}`}
                                            </div>
                                            <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                                                {activeTab === 'vendors' ? item.email : item.emailAddress}
                                            </div>
                                        </>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Right Panel: Chat Stream */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'white', borderRadius: '8px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                    {selectedItem ? (
                        <>
                            {/* Chat Header */}
                            <div style={{ padding: '16px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>
                                <div style={{ fontWeight: 'bold', fontSize: '15px', color: '#1e293b' }}>
                                    {activeTab === 'monitoring' ? (
                                        <>
                                            Intervention : {selectedItem.customer?.firstName} {selectedItem.customer?.lastName} ↔ {selectedItem.vendor?.name}
                                        </>
                                    ) : (
                                        <>
                                            Discussion Directe avec {activeTab === 'vendors' ? selectedItem.name : `${selectedItem.firstName} ${selectedItem.lastName}`}
                                        </>
                                    )}
                                </div>
                                <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>
                                    {activeTab === 'monitoring' ? 'Vous pouvez lire et intervenir dans cette conversation.' : 'Discussion privée en tant que Superadmin.'}
                                </div>
                            </div>

                            {/* Chat Messages */}
                            <div style={{ flex: 1, overflowY: 'auto', padding: '16px', background: '#f1f5f9' }}>
                                {loadingHistory && <div style={{ textAlign: 'center', color: '#64748b', padding: '20px' }}>Chargement de l'historique...</div>}

                                {!loadingHistory && messages.map((msg: any) => {
                                    const isAdmin = msg.sender === 'SUPERADMIN';
                                    const isVendorMsg = msg.sender === 'VENDOR';
                                    const isEditing = editingId === msg.id;
                                    
                                    const lastAdminMsg = [...messages].reverse().find(m => m.sender === 'SUPERADMIN');
                                    const isLatestAdminMsg = lastAdminMsg?.id === msg.id;

                                    let justify: 'flex-end' | 'flex-start' = 'flex-start';
                                    let bg = '#ffffff';
                                    let color = '#1e293b';
                                    let senderLabel = '';

                                    if (isAdmin) {
                                        justify = 'flex-end';
                                        bg = '#ffedd5';
                                        color = '#7c2d12';
                                        senderLabel = 'Super-Admin';
                                    } else if (isVendorMsg) {
                                        bg = '#dbeafe';
                                        color = '#1e40af';
                                        senderLabel = 'Vendeur';
                                    } else {
                                        bg = '#e2e8f0';
                                        color = '#334155';
                                        senderLabel = 'Client';
                                    }

                                    return (
                                        <div key={msg.id} style={{ display: 'flex', justifyContent: justify, marginBottom: '14px' }}>
                                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: isAdmin ? 'flex-end' : 'flex-start', maxWidth: '70%' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                    {isAdmin && !msg.deleted && (
                                                        <div style={{ display: 'flex', gap: '2px' }}>
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    setEditingId(msg.id);
                                                                    setEditValue(msg.content);
                                                                }}
                                                                style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '11px', color: '#64748b' }}
                                                                title="Modifier"
                                                            >
                                                                ✏️
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => handleDeleteMessage(msg.id)}
                                                                style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '11px', color: '#64748b' }}
                                                                title="Supprimer"
                                                            >
                                                                🗑️
                                                            </button>
                                                        </div>
                                                    )}
                                                    <div style={{ background: bg, color: color, padding: '10px 14px', borderRadius: '12px', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                                                        <div style={{ fontSize: '9px', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '4px', opacity: 0.8 }}>
                                                            {senderLabel} • {new Date(msg.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                                                            {msg.modified && !msg.deleted && <span style={{ fontStyle: 'italic', marginLeft: '6px', textTransform: 'lowercase', opacity: 0.7 }}>(modifié)</span>}
                                                        </div>
                                                        {msg.deleted ? (
                                                            <div style={{ fontSize: '13px', fontStyle: 'italic', color: '#94a3b8' }}>
                                                                🚫 Ce message a été supprimé
                                                            </div>
                                                        ) : isEditing ? (
                                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', width: '220px' }}>
                                                                <input
                                                                    type="text"
                                                                    value={editValue}
                                                                    onChange={(e) => setEditValue(e.target.value)}
                                                                    style={{ padding: '4px 8px', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '12px', outline: 'none' }}
                                                                    autoFocus
                                                                />
                                                                <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => setEditingId(null)}
                                                                        style={{ fontSize: '10px', background: 'transparent', border: 'none', cursor: 'pointer', color: '#64748b' }}
                                                                    >
                                                                        Annuler
                                                                    </button>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => handleEditMessage(msg.id, editValue)}
                                                                        style={{ fontSize: '10px', background: '#f97316', color: 'white', border: 'none', padding: '2px 6px', borderRadius: '4px', cursor: 'pointer' }}
                                                                    >
                                                                        Sauver
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <div style={{ fontSize: '13px', lineHeight: '1.4', wordBreak: 'break-word', whiteSpace: 'pre-wrap' }}>
                                                                {msg.content}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                                {isAdmin && isLatestAdminMsg && (
                                                    <div style={{ fontSize: '9px', color: '#64748b', marginTop: '2px', fontWeight: 'bold' }}>
                                                        {msg.seen ? '✓✓ Vu' : '✓ Envoyé'}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                                {isOtherPartyTyping && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#64748b', fontSize: '11px', padding: '4px 8px', fontWeight: 'bold', animation: 'pulse 1.5s infinite' }}>
                                        <span style={{ display: 'inline-block', width: '6px', height: '6px', borderRadius: '50%', background: '#f97316' }}></span>
                                        <span>L'autre personne écrit...</span>
                                    </div>
                                )}
                                <div ref={messagesEndRef} />
                            </div>

                            {/* Chat Input Form */}
                            <form onSubmit={handleSendMessage} style={{ display: 'flex', padding: '12px', borderTop: '1px solid #e2e8f0' }}>
                                <input
                                    type="text"
                                    placeholder="Écrire votre réponse..."
                                    value={messageText}
                                    onChange={(e) => setMessageText(e.target.value)}
                                    style={{
                                        flex: 1,
                                        padding: '10px 14px',
                                        border: '1px solid #cbd5e1',
                                        borderRadius: '6px',
                                        fontSize: '13px',
                                        marginRight: '8px',
                                    }}
                                />
                                <button
                                    type="submit"
                                    disabled={sendMessageMutation.isPending || !messageText.trim()}
                                    style={{
                                        padding: '10px 20px',
                                        background: '#f97316',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '6px',
                                        fontWeight: 'bold',
                                        fontSize: '13px',
                                        cursor: 'pointer',
                                        opacity: (!messageText.trim() || sendMessageMutation.isPending) ? 0.6 : 1,
                                    }}
                                >
                                    Envoyer
                                </button>
                            </form>
                        </>
                    ) : (
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', padding: '40px' }}>
                            <span style={{ fontSize: '48px', marginBottom: '16px' }}>💬</span>
                            <span style={{ fontWeight: 'bold' }}>Sélectionnez une discussion dans la liste de gauche pour commencer.</span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
