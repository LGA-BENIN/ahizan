'use server';

import { query } from './api';
import { GetActiveCustomerQuery, GetMyVendorProfileQuery, GetMyVendorFullProfileQuery } from './queries';
import { getActiveChannelCached } from './cached';
import { cache } from "react";
import { readFragment } from "@/graphql";
import { ActiveCustomerFragment } from "@/lib/vendure/fragments";
import { getAuthToken } from "@/lib/auth";


export const getActiveCustomer = cache(async () => {
    const token = await getAuthToken();
    if (!token) return null;
    try {
        const result = await query(GetActiveCustomerQuery, undefined, {
            token
        });
        return readFragment(ActiveCustomerFragment, (result.data as any)?.activeCustomer);
    } catch (e) {
        console.error('[getActiveCustomer] Failed to fetch active customer:', e);
        return null;
    }
})

export const getMyVendorProfile = async () => {
    const token = await getAuthToken();
    if (!token) {
        return null;
    }
    try {
        const [{ data }, { data: customerData }] = await Promise.all([
            query(GetMyVendorFullProfileQuery, {}, {
                token,
                useAuthToken: true
            }) as Promise<any>,
            query(GetActiveCustomerQuery, {}, { token }).catch(() => ({ data: { activeCustomer: null } })) as Promise<any>
        ]);

        const profile = data?.myVendorProfile;
        if (profile && customerData?.activeCustomer) {
            profile.customer = customerData.activeCustomer;
        }
        return profile;
    } catch (error) {
        console.error('[getMyVendorProfile] Failed to fetch vendor profile:', error);
        return null;
    }
}

export const getActiveChannel = getActiveChannelCached;

const MY_VENDOR_LIKERS = `
    query MyVendorLikers($options: CustomerListOptions) {
        myVendorLikers(options: $options) {
            items {
                id
                createdAt
                firstName
                lastName
                emailAddress
            }
            totalItems
        }
    }
`;

const MY_CONVERSATIONS = `
    query MyConversations {
        myConversations {
            customer {
                id
                firstName
                lastName
                emailAddress
            }
            lastMessage {
                id
                createdAt
                sender
                content
            }
        }
    }
`;

const CONVERSATION_HISTORY_WITH_CUSTOMER = `
    query ConversationHistoryWithCustomer($customerId: ID!) {
        conversationHistoryWithCustomer(customerId: $customerId) {
            id
            createdAt
            sender
            content
        }
    }
`;

const REPLY_TO_CUSTOMER = `
    mutation ReplyToCustomer($customerId: ID!, $content: String!) {
        replyToCustomer(customerId: $customerId, content: $content) {
            id
            createdAt
            sender
            content
        }
    }
`;

/**
 * Get the list of customers who liked the vendor's shop
 */
export async function getVendorLikersAction(options?: any) {
    const token = await getAuthToken();
    if (!token) return { items: [], totalItems: 0 };
    
    try {
        const { data } = await query(MY_VENDOR_LIKERS, { options }, {
            token,
            useAuthToken: true
        });
        return data?.myVendorLikers || { items: [], totalItems: 0 };
    } catch (error) {
        console.error('[getVendorLikersAction] Error:', error);
        return { items: [], totalItems: 0 };
    }
}

/**
 * Get active conversations for the logged-in vendor
 */
export async function getConversationsAction() {
    const token = await getAuthToken();
    if (!token) return [];
    
    try {
        const { data } = await query(MY_CONVERSATIONS, {}, {
            token,
            useAuthToken: true
        });
        return data?.myConversations || [];
    } catch (error) {
        console.error('[getConversationsAction] Error:', error);
        return [];
    }
}

/**
 * Get conversation history with a specific customer
 */
export async function getConversationHistoryAction(customerId: string) {
    const token = await getAuthToken();
    if (!token) return [];
    
    try {
        const { data } = await query(CONVERSATION_HISTORY_WITH_CUSTOMER, { customerId }, {
            token,
            useAuthToken: true
        });
        return data?.conversationHistoryWithCustomer || [];
    } catch (error) {
        console.error('[getConversationHistoryAction] Error:', error);
        return [];
    }
}

/**
 * Send a reply message to a customer
 */
export async function replyToCustomerAction(customerId: string, content: string) {
    const token = await getAuthToken();
    if (!token) {
        return { success: false, error: 'Non authentifié' };
    }
    
    try {
        const { data } = await query(REPLY_TO_CUSTOMER, { customerId, content }, {
            token,
            useAuthToken: true
        });
        return { success: true, message: data?.replyToCustomer };
    } catch (error: any) {
        console.error('[replyToCustomerAction] Error:', error);
        return { success: false, error: error.message || 'Erreur lors de la réponse' };
    }
}

const MY_VENDOR_PRODUCTS_LIKES = `
    query MyVendorProductsLikes {
        myVendorProductsLikes {
            product {
                id
                name
                slug
                featuredAsset {
                    preview
                }
                variants {
                    id
                    price
                }
            }
            likesCount
        }
    }
`;

/**
 * Get statistics of product likes for the logged-in vendor
 */
export async function getVendorProductsLikesAction() {
    const token = await getAuthToken();
    if (!token) return [];
    
    try {
        const { data } = await query(MY_VENDOR_PRODUCTS_LIKES, {}, {
            token,
            useAuthToken: true
        });
        return data?.myVendorProductsLikes || [];
    } catch (error) {
        console.error('[getVendorProductsLikesAction] Error:', error);
        return [];
    }
}
