'use server';

import { rawQuery } from '@/lib/vendure/raw-api';

const TOGGLE_LIKE_PRODUCT = `
    mutation ToggleLikeProduct($id: ID!) {
        toggleLikeProduct(id: $id)
    }
`;

const TOGGLE_LIKE_VENDOR = `
    mutation ToggleLikeVendor($id: ID!) {
        toggleLikeVendor(id: $id)
    }
`;

const IS_PRODUCT_LIKED = `
    query IsProductLiked($id: ID!) {
        isProductLiked(id: $id)
    }
`;

const IS_VENDOR_LIKED = `
    query IsVendorLiked($id: ID!) {
        isVendorLiked(id: $id)
    }
`;

/**
 * Toggle like state on a product
 */
export async function toggleProductLikeAction(productId: string) {
    try {
        const data = await rawQuery(TOGGLE_LIKE_PRODUCT, {
            useAuthToken: true,
            variables: { id: productId },
        });
        return { success: true, liked: data.toggleLikeProduct };
    } catch (e: any) {
        const errorMessage = e.message || '';
        // If unauthorized/unauthenticated error is detected in GraphQL errors
        if (errorMessage.toLowerCase().includes('authorized') || errorMessage.toLowerCase().includes('authenticated')) {
            return { success: false, authenticated: false };
        }
        return { success: false, error: errorMessage || 'Erreur lors de la mise à jour du favori' };
    }
}

/**
 * Toggle like state on a vendor boutique
 */
export async function toggleVendorLikeAction(vendorId: string) {
    try {
        const data = await rawQuery(TOGGLE_LIKE_VENDOR, {
            useAuthToken: true,
            variables: { id: vendorId },
        });
        return { success: true, liked: data.toggleLikeVendor };
    } catch (e: any) {
        const errorMessage = e.message || '';
        if (errorMessage.toLowerCase().includes('authorized') || errorMessage.toLowerCase().includes('authenticated')) {
            return { success: false, authenticated: false };
        }
        return { success: false, error: errorMessage || 'Erreur lors de la mise à jour de l\'abonnement' };
    }
}

/**
 * Check if a product is liked by the current user
 */
export async function checkProductLikeStatus(productId: string): Promise<boolean> {
    try {
        const data = await rawQuery(IS_PRODUCT_LIKED, {
            useAuthToken: true,
            variables: { id: productId },
        });
        return !!data.isProductLiked;
    } catch {
        return false;
    }
}

/**
 * Check if a vendor is liked by the current user
 */
export async function checkVendorLikeStatus(vendorId: string): Promise<boolean> {
    try {
        const data = await rawQuery(IS_VENDOR_LIKED, {
            useAuthToken: true,
            variables: { id: vendorId },
        });
        return !!data.isVendorLiked;
    } catch {
        return false;
    }
}

const SEND_CHAT_MESSAGE_TO_VENDOR = `
    mutation SendChatMessageToVendor($vendorId: ID!, $content: String!) {
        sendChatMessageToVendor(vendorId: $vendorId, content: $content) {
            id
            createdAt
            sender
            content
        }
    }
`;

const MY_CHAT_HISTORY_WITH_VENDOR = `
    query MyChatHistoryWithVendor($vendorId: ID!) {
        myChatHistoryWithVendor(vendorId: $vendorId) {
            id
            createdAt
            sender
            content
        }
    }
`;

/**
 * Send a chat message to a vendor
 */
export async function sendChatMessageAction(vendorId: string, content: string) {
    try {
        const data = await rawQuery(SEND_CHAT_MESSAGE_TO_VENDOR, {
            useAuthToken: true,
            variables: { vendorId, content },
        });
        return { success: true, message: data.sendChatMessageToVendor };
    } catch (e: any) {
        const errorMessage = e.message || '';
        if (errorMessage.toLowerCase().includes('authorized') || errorMessage.toLowerCase().includes('authenticated')) {
            return { success: false, authenticated: false };
        }
        return { success: false, error: errorMessage || 'Erreur lors de l\'envoi du message' };
    }
}

/**
 * Get chat history with a vendor
 */
export async function getChatHistoryAction(vendorId: string) {
    try {
        const data = await rawQuery(MY_CHAT_HISTORY_WITH_VENDOR, {
            useAuthToken: true,
            variables: { vendorId },
        });
        return { success: true, history: data.myChatHistoryWithVendor || [] };
    } catch (e: any) {
        const errorMessage = e.message || '';
        if (errorMessage.toLowerCase().includes('authorized') || errorMessage.toLowerCase().includes('authenticated')) {
            return { success: false, authenticated: false };
        }
        return { success: false, error: errorMessage || 'Erreur lors de la récupération des messages' };
    }
}

const MY_LIKED_PRODUCTS = `
    query MyLikedProducts($options: ProductListOptions) {
        myLikedProducts(options: $options) {
            items {
                id
                name
                slug
                featuredAsset {
                    id
                    preview
                }
                variants {
                    id
                    priceWithTax
                    stockLevel
                }
            }
            totalItems
        }
    }
`;

/**
 * Get all products liked by the authenticated customer
 */
export async function getMyLikedProductsAction(options?: any) {
    try {
        const data = await rawQuery(MY_LIKED_PRODUCTS, {
            useAuthToken: true,
            variables: { options: options || {} },
        });
        return { 
            success: true, 
            products: data.myLikedProducts?.items || [], 
            totalItems: data.myLikedProducts?.totalItems || 0 
        };
    } catch (e: any) {
        const errorMessage = e.message || '';
        if (errorMessage.toLowerCase().includes('authorized') || errorMessage.toLowerCase().includes('authenticated')) {
            return { success: false, authenticated: false };
        }
        return { success: false, error: errorMessage || 'Erreur lors de la récupération des favoris' };
    }
}

const MY_CUSTOMER_CONVERSATIONS = `
    query MyCustomerConversations {
        myCustomerConversations {
            vendor {
                id
                name
                logo {
                    preview
                }
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

export async function getMyConversationsAction() {
    try {
        const data = await rawQuery(MY_CUSTOMER_CONVERSATIONS, {
            useAuthToken: true,
        });
        return { success: true, conversations: data.myCustomerConversations || [] };
    } catch (e: any) {
        const errorMessage = e.message || '';
        if (errorMessage.toLowerCase().includes('authorized') || errorMessage.toLowerCase().includes('authenticated')) {
            return { success: false, authenticated: false };
        }
        return { success: false, error: errorMessage || 'Erreur lors de la récupération des conversations' };
    }
}

