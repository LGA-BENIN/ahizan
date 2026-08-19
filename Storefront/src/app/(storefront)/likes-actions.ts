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
        const errorMessage = e?.message || '';
        const isAuthError = !errorMessage || 
            errorMessage.toLowerCase().includes('authorized') || 
            errorMessage.toLowerCase().includes('authenticated') ||
            errorMessage.toLowerCase().includes('forbidden') ||
            errorMessage.toLowerCase().includes('customer profile not found') ||
            errorMessage.toLowerCase().includes('unauthorized');

        if (isAuthError) {
            return { success: false, authenticated: false, error: 'UNAUTHORIZED' };
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
        const errorMessage = e?.message || '';
        const isAuthError = !errorMessage || 
            errorMessage.toLowerCase().includes('authorized') || 
            errorMessage.toLowerCase().includes('authenticated') ||
            errorMessage.toLowerCase().includes('forbidden') ||
            errorMessage.toLowerCase().includes('customer profile not found') ||
            errorMessage.toLowerCase().includes('unauthorized');

        if (isAuthError) {
            return { success: false, authenticated: false, error: 'UNAUTHORIZED' };
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
            deleted
            modified
            seen
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
                deleted
                modified
                seen
            }
            unreadCount
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

const DELETE_CHAT_MESSAGE = `
    mutation DeleteChatMessage($id: ID!) {
        deleteChatMessage(id: $id) {
            id
            deleted
            content
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

export async function deleteChatMessageAction(id: string) {
    try {
        const data = await rawQuery(DELETE_CHAT_MESSAGE, {
            useAuthToken: true,
            variables: { id },
        });
        return { success: true, message: data.deleteChatMessage };
    } catch (e: any) {
        return { success: false, error: e.message || 'Erreur lors de la suppression du message' };
    }
}

export async function modifyChatMessageAction(id: string, content: string) {
    try {
        const data = await rawQuery(MODIFY_CHAT_MESSAGE, {
            useAuthToken: true,
            variables: { id, content },
        });
        return { success: true, message: data.modifyChatMessage };
    } catch (e: any) {
        return { success: false, error: e.message || 'Erreur lors de la modification du message' };
    }
}

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

export async function setTypingAction(targetId: string, targetType: string, typing: boolean) {
    try {
        const data = await rawQuery(SET_TYPING, {
            useAuthToken: true,
            variables: { targetId, targetType, typing },
        });
        return { success: true, typing: data.setTyping };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

export async function isTypingAction(targetId: string, targetType: string) {
    try {
        const data = await rawQuery(IS_TYPING, {
            useAuthToken: true,
            variables: { targetId, targetType },
        });
        return { success: true, isTyping: data.isTyping };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

const USER_ONLINE_STATUS = `
    query UserOnlineStatus($targetId: ID!, $targetType: String!) {
        userOnlineStatus(targetId: $targetId, targetType: $targetType)
    }
`;

export async function userOnlineStatusAction(targetId: string, targetType: string) {
    try {
        const data = await rawQuery(USER_ONLINE_STATUS, {
            useAuthToken: true,
            variables: { targetId, targetType },
        });
        return { success: true, status: data.userOnlineStatus };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

