import { Injectable } from '@nestjs/common';
import { TransactionalConnection, RequestContext, Customer, ID, EventBus } from '@vendure/core';
import { IsNull, In } from 'typeorm';
import { ChatMessage } from '../entities/chat-message.entity';
import { Vendor } from '../entities/vendor.entity';
import { ChatMessageEvent } from '../events/chat-message-event';

@Injectable()
export class ChatService {
    private typingStates = new Map<string, number>();
    private lastActiveStates = new Map<string, number>();

    updateLastActive(userId: string) {
        this.lastActiveStates.set(userId, Date.now());
    }

    async getUserOnlineStatus(ctx: RequestContext, targetId: string, targetType: string): Promise<string> {
        if (targetId === 'admin' || targetId === 'superadmin') {
            return this.getLastActiveString('admin');
        }
        
        if (targetType === 'VENDOR') {
            const vendor = await this.connection.getRepository(ctx, Vendor).findOne({
                where: { id: targetId },
                relations: ['user']
            });
            if (!vendor || !vendor.user) return 'Hors ligne';
            return this.getLastActiveString(vendor.user.id.toString());
        } else {
            const customer = await this.connection.getRepository(ctx, Customer).findOne({
                where: { id: targetId },
                relations: ['user']
            });
            if (!customer || !customer.user) return 'Hors ligne';
            return this.getLastActiveString(customer.user.id.toString());
        }
    }

    private getLastActiveString(userId: string): string {
        const lastActive = this.lastActiveStates.get(userId);
        if (!lastActive) return 'Hors ligne';
        const diffMs = Date.now() - lastActive;
        if (diffMs < 20000) {
            return 'En ligne';
        }
        const diffMins = Math.floor(diffMs / 60000);
        if (diffMins < 1) {
            return 'Hors ligne (il y a quelques secondes)';
        }
        if (diffMins < 60) {
            return `Hors ligne (il y a ${diffMins} min)`;
        }
        const diffHours = Math.floor(diffMins / 60);
        if (diffHours < 24) {
            return `Hors ligne (il y a ${diffHours} h)`;
        }
        const diffDays = Math.floor(diffHours / 24);
        return `Hors ligne (il y a ${diffDays} j)`;
    }

    constructor(
        private connection: TransactionalConnection,
        private eventBus: EventBus
    ) {}

    async sendMessageToVendor(
        ctx: RequestContext,
        customerUserId: ID,
        vendorId: ID,
        content: string
    ): Promise<ChatMessage> {
        this.updateLastActive(customerUserId.toString());
        const customer = await this.connection.getRepository(ctx, Customer).findOne({
            where: { user: { id: customerUserId } },
        });

        if (!customer) {
            throw new Error('Client introuvable pour l\'utilisateur connecté');
        }

        // Intercept message sent to Admin
        if (vendorId === 'admin' || vendorId === 'superadmin') {
            const chatMessage = new ChatMessage({
                customer,
                vendor: null as any,
                sender: 'CUSTOMER',
                content,
            });
            const savedMessage = await this.connection.getRepository(ctx, ChatMessage).save(chatMessage);
            this.eventBus.publish(new ChatMessageEvent(ctx, savedMessage));
            return savedMessage;
        }

        const vendor = await this.connection.getRepository(ctx, Vendor).findOne({
            where: { id: vendorId },
        });

        if (!vendor) {
            throw new Error('Boutique vendeur introuvable');
        }

        const chatMessage = new ChatMessage({
            customer,
            vendor,
            sender: 'CUSTOMER',
            content,
        });

        const savedMessage = await this.connection.getRepository(ctx, ChatMessage).save(chatMessage);
        this.eventBus.publish(new ChatMessageEvent(ctx, savedMessage));
        return savedMessage;
    }

    /**
     * Send a response from a Vendor to a Customer or Admin
     */
    async replyToCustomer(
        ctx: RequestContext,
        vendorUserId: ID,
        customerId: ID,
        content: string
    ): Promise<ChatMessage> {
        this.updateLastActive(vendorUserId.toString());
        const vendor = await this.connection.getRepository(ctx, Vendor).findOne({
            where: { user: { id: vendorUserId } },
        });

        if (!vendor) {
            throw new Error('Vendeur introuvable pour l\'utilisateur connecté');
        }

        // Intercept response sent to Admin
        if (customerId === 'admin' || customerId === 'superadmin') {
            const chatMessage = new ChatMessage({
                customer: null as any,
                vendor,
                sender: 'VENDOR',
                content,
            });
            const savedMessage = await this.connection.getRepository(ctx, ChatMessage).save(chatMessage);
            this.eventBus.publish(new ChatMessageEvent(ctx, savedMessage));
            return savedMessage;
        }

        const customer = await this.connection.getRepository(ctx, Customer).findOne({
            where: { id: customerId },
        });

        if (!customer) {
            throw new Error('Client destinataire introuvable');
        }

        const chatMessage = new ChatMessage({
            customer,
            vendor,
            sender: 'VENDOR',
            content,
        });

        const savedMessage = await this.connection.getRepository(ctx, ChatMessage).save(chatMessage);
        this.eventBus.publish(new ChatMessageEvent(ctx, savedMessage));
        return savedMessage;
    }

    /**
     * Get chat history between a Customer and a Vendor (ordered by date)
     */
    async getChatHistoryWithVendor(
        ctx: RequestContext,
        customerUserId: ID,
        vendorId: ID
    ): Promise<ChatMessage[]> {
        this.updateLastActive(customerUserId.toString());
        const customer = await this.connection.getRepository(ctx, Customer).findOne({
            where: { user: { id: customerUserId } },
        });

        if (!customer) {
            return [];
        }

        // Mark VENDOR and SUPERADMIN messages in this conversation as seen
        const unseen = await this.connection.getRepository(ctx, ChatMessage).find({
            where: {
                customer: { id: customer.id },
                vendor: (vendorId === 'admin' || vendorId === 'superadmin') ? IsNull() : { id: vendorId },
                sender: In(['VENDOR', 'SUPERADMIN']),
                seen: false
            }
        });
        if (unseen.length > 0) {
            for (const msg of unseen) {
                msg.seen = true;
                await this.connection.getRepository(ctx, ChatMessage).save(msg);
            }
        }

        // Return direct chat history with Admin
        if (vendorId === 'admin' || vendorId === 'superadmin') {
            return this.connection.getRepository(ctx, ChatMessage).find({
                where: {
                    customer: { id: customer.id },
                    vendor: IsNull(),
                },
                order: { createdAt: 'ASC' },
                relations: ['customer'],
            });
        }

        return this.connection.getRepository(ctx, ChatMessage).find({
            where: {
                customer: { id: customer.id },
                vendor: { id: vendorId },
            },
            order: { createdAt: 'ASC' },
            relations: ['customer', 'vendor'],
        });
    }

    /**
     * Get all conversations for a Vendor (including Admin conversation)
     */
    async getConversationsForVendor(ctx: RequestContext, vendorUserId: ID): Promise<any[]> {
        this.updateLastActive(vendorUserId.toString());

        const vendor = await this.connection.getRepository(ctx, Vendor).findOne({
            where: { user: { id: vendorUserId } },
        });

        if (!vendor) {
            return [];
        }

        const messages = await this.connection.getRepository(ctx, ChatMessage).find({
            where: { vendor: { id: vendor.id } },
            relations: ['customer', 'customer.user'],
            order: { createdAt: 'DESC' },
        });

        const conversationMap = new Map<string, any>();
        for (const msg of messages) {
            if (!msg.customer) {
                // Direct message between admin and vendor
                const customerId = 'admin';
                if (!conversationMap.has(customerId)) {
                    conversationMap.set(customerId, {
                        customer: {
                            id: 'admin',
                            firstName: 'Administrateur',
                            lastName: 'Ahizan',
                            emailAddress: 'admin@ahizan.com',
                        } as any,
                        lastMessage: msg,
                        unreadCount: 0
                    });
                }
            } else {
                const customerId = String(msg.customer.id);
                if (!conversationMap.has(customerId)) {
                    conversationMap.set(customerId, {
                        customer: msg.customer,
                        lastMessage: msg,
                        unreadCount: 0
                    });
                }
            }
        }

        const list = Array.from(conversationMap.values());
        for (const conv of list) {
            const isDirectAdmin = conv.customer.id === 'admin';
            conv.unreadCount = await this.connection.getRepository(ctx, ChatMessage).count({
                where: {
                    vendor: { id: vendor.id },
                    customer: isDirectAdmin ? IsNull() : { id: conv.customer.id },
                    sender: isDirectAdmin ? 'SUPERADMIN' : In(['CUSTOMER', 'SUPERADMIN']),
                    seen: false
                }
            });
        }

        return list;
    }

    /**
     * Get conversation history between a Vendor and a Customer
     */
    async getConversationHistoryWithCustomer(
        ctx: RequestContext,
        vendorUserId: ID,
        customerId: ID
    ): Promise<ChatMessage[]> {
        this.updateLastActive(vendorUserId.toString());
        const vendor = await this.connection.getRepository(ctx, Vendor).findOne({
            where: { user: { id: vendorUserId } },
        });

        if (!vendor) {
            return [];
        }

        // Mark CUSTOMER and SUPERADMIN messages in this conversation as seen
        const unseen = await this.connection.getRepository(ctx, ChatMessage).find({
            where: {
                vendor: { id: vendor.id },
                customer: (customerId === 'admin' || customerId === 'superadmin') ? IsNull() : { id: customerId },
                sender: In(['CUSTOMER', 'SUPERADMIN']),
                seen: false
            }
        });
        if (unseen.length > 0) {
            for (const msg of unseen) {
                msg.seen = true;
                await this.connection.getRepository(ctx, ChatMessage).save(msg);
            }
        }

        // Return direct chat history with Admin
        if (customerId === 'admin' || customerId === 'superadmin') {
            return this.connection.getRepository(ctx, ChatMessage).find({
                where: {
                    vendor: { id: vendor.id },
                    customer: IsNull(),
                },
                order: { createdAt: 'ASC' },
                relations: ['vendor'],
            });
        }

        return this.connection.getRepository(ctx, ChatMessage).find({
            where: {
                vendor: { id: vendor.id },
                customer: { id: customerId },
            },
            order: { createdAt: 'ASC' },
            relations: ['customer', 'vendor'],
        });
    }

    /**
     * Get all conversations for a Customer (including Admin conversation)
     */
    async getConversationsForCustomer(ctx: RequestContext, customerUserId: ID): Promise<any[]> {
        this.updateLastActive(customerUserId.toString());

        const customer = await this.connection.getRepository(ctx, Customer).findOne({
            where: { user: { id: customerUserId } },
        });

        if (!customer) {
            return [];
        }

        const messages = await this.connection.getRepository(ctx, ChatMessage).find({
            where: { customer: { id: customer.id } },
            relations: ['vendor', 'vendor.logo'],
            order: { createdAt: 'DESC' },
        });

        const conversationMap = new Map<string, any>();
        for (const msg of messages) {
            if (!msg.vendor) {
                // Direct message between admin and client
                const vendorId = 'admin';
                if (!conversationMap.has(vendorId)) {
                    conversationMap.set(vendorId, {
                        vendor: {
                            id: 'admin',
                            name: 'Administrateur Ahizan',
                        } as any,
                        lastMessage: msg,
                        unreadCount: 0
                    });
                }
            } else {
                const vendorId = String(msg.vendor.id);
                if (!conversationMap.has(vendorId)) {
                    conversationMap.set(vendorId, {
                        vendor: msg.vendor,
                        lastMessage: msg,
                        unreadCount: 0
                    });
                }
            }
        }

        const list = Array.from(conversationMap.values());
        for (const conv of list) {
            const isDirectAdmin = conv.vendor.id === 'admin';
            conv.unreadCount = await this.connection.getRepository(ctx, ChatMessage).count({
                where: {
                    customer: { id: customer.id },
                    vendor: isDirectAdmin ? IsNull() : { id: conv.vendor.id },
                    sender: isDirectAdmin ? 'SUPERADMIN' : In(['VENDOR', 'SUPERADMIN']),
                    seen: false
                }
            });
        }

        return list;
    }

    // ─────────────────────────────────────────────────────────────
    // SUPERADMIN MONITORING SERVICES
    // ─────────────────────────────────────────────────────────────

    /**
     * Get all monitored client-seller conversations (both relations are not null)
     */
    async getAdminConversations(ctx: RequestContext): Promise<any[]> {
        this.updateLastActive('admin');
        const messages = await this.connection.getRepository(ctx, ChatMessage).find({
            relations: ['customer', 'customer.user', 'vendor', 'vendor.logo'],
            order: { createdAt: 'DESC' },
        });

        const conversationMap = new Map<string, any>();
        for (const msg of messages) {
            if (msg.customer && msg.vendor) {
                const key = `${msg.customer.id}_${msg.vendor.id}`;
                if (!conversationMap.has(key)) {
                    conversationMap.set(key, {
                        customer: msg.customer,
                        vendor: msg.vendor,
                        lastMessage: msg,
                    });
                }
            }
        }

        return Array.from(conversationMap.values());
    }

    /**
     * Get chat history of a monitored conversation (client-seller), including admin messages
     */
    async getAdminChatHistory(
        ctx: RequestContext,
        customerId: ID,
        vendorId: ID
    ): Promise<ChatMessage[]> {
        this.updateLastActive('admin');
        return this.connection.getRepository(ctx, ChatMessage).find({
            where: {
                customer: { id: customerId },
                vendor: { id: vendorId },
            },
            order: { createdAt: 'ASC' },
            relations: ['customer', 'vendor'],
        });
    }

    /**
     * Get direct chat history between Admin and a Seller or a Client
     */
    async getAdminDirectChatHistory(
        ctx: RequestContext,
        targetId: ID,
        targetType: 'VENDOR' | 'CUSTOMER'
    ): Promise<ChatMessage[]> {
        this.updateLastActive('admin');
        if (targetType === 'VENDOR') {
            const unseen = await this.connection.getRepository(ctx, ChatMessage).find({
                where: {
                    vendor: { id: targetId },
                    customer: IsNull(),
                    sender: 'VENDOR',
                    seen: false
                }
            });
            for (const msg of unseen) {
                msg.seen = true;
                await this.connection.getRepository(ctx, ChatMessage).save(msg);
            }

            return this.connection.getRepository(ctx, ChatMessage).find({
                where: {
                    vendor: { id: targetId },
                    customer: IsNull(),
                },
                order: { createdAt: 'ASC' },
                relations: ['vendor'],
            });
        } else {
            const unseen = await this.connection.getRepository(ctx, ChatMessage).find({
                where: {
                    customer: { id: targetId },
                    vendor: IsNull(),
                    sender: 'CUSTOMER',
                    seen: false
                }
            });
            for (const msg of unseen) {
                msg.seen = true;
                await this.connection.getRepository(ctx, ChatMessage).save(msg);
            }

            return this.connection.getRepository(ctx, ChatMessage).find({
                where: {
                    customer: { id: targetId },
                    vendor: IsNull(),
                },
                order: { createdAt: 'ASC' },
                relations: ['customer'],
            });
        }
    }

    /**
     * Superadmin responds to a monitored client-seller conversation
     */
    async adminReplyToConversation(
        ctx: RequestContext,
        customerId: ID,
        vendorId: ID,
        content: string
    ): Promise<ChatMessage> {
        this.updateLastActive('admin');
        const customer = await this.connection.getRepository(ctx, Customer).findOne({
            where: { id: customerId },
        });
        const vendor = await this.connection.getRepository(ctx, Vendor).findOne({
            where: { id: vendorId },
        });

        if (!customer || !vendor) {
            throw new Error('Client ou vendeur introuvable');
        }

        const chatMessage = new ChatMessage({
            customer,
            vendor,
            sender: 'SUPERADMIN',
            content,
        });

        const savedMessage = await this.connection.getRepository(ctx, ChatMessage).save(chatMessage);
        this.eventBus.publish(new ChatMessageEvent(ctx, savedMessage));
        return savedMessage;
    }

    /**
     * Superadmin sends a direct message to a Seller or a Client
     */
    async adminSendDirectMessage(
        ctx: RequestContext,
        targetId: ID,
        targetType: 'VENDOR' | 'CUSTOMER',
        content: string
    ): Promise<ChatMessage> {
        this.updateLastActive('admin');
        if (targetType === 'VENDOR') {
            const vendor = await this.connection.getRepository(ctx, Vendor).findOne({
                where: { id: targetId },
            });
            if (!vendor) {
                throw new Error('Vendeur introuvable');
            }
            const chatMessage = new ChatMessage({
                customer: null as any,
                vendor,
                sender: 'SUPERADMIN',
                content,
            });
            const savedMessage = await this.connection.getRepository(ctx, ChatMessage).save(chatMessage);
            this.eventBus.publish(new ChatMessageEvent(ctx, savedMessage));
            return savedMessage;
        } else {
            const customer = await this.connection.getRepository(ctx, Customer).findOne({
                where: { id: targetId },
            });
            if (!customer) {
                throw new Error('Client introuvable');
            }
            const chatMessage = new ChatMessage({
                customer,
                vendor: null as any,
                sender: 'SUPERADMIN',
                content,
            });
            const savedMessage = await this.connection.getRepository(ctx, ChatMessage).save(chatMessage);
            this.eventBus.publish(new ChatMessageEvent(ctx, savedMessage));
            return savedMessage;
        }
    }

    async deleteMessage(ctx: RequestContext, userIdOrType: ID | 'admin', messageId: ID): Promise<ChatMessage> {
        const message = await this.connection.getRepository(ctx, ChatMessage).findOne({
            where: { id: messageId },
            relations: ['customer', 'customer.user', 'vendor', 'vendor.user'],
        });

        if (!message) {
            throw new Error('Message introuvable');
        }

        let isAuthorized = false;
        if (userIdOrType === 'admin') {
            if (message.sender === 'SUPERADMIN') {
                isAuthorized = true;
            }
        } else {
            if (message.sender === 'VENDOR' && message.vendor?.user?.id === userIdOrType) {
                isAuthorized = true;
            } else if (message.sender === 'CUSTOMER' && message.customer?.user?.id === userIdOrType) {
                isAuthorized = true;
            }
        }

        if (!isAuthorized) {
            throw new Error('Vous n\'êtes pas autorisé à supprimer ce message');
        }

        message.deleted = true;
        message.content = 'Ce message a été supprimé';
        const saved = await this.connection.getRepository(ctx, ChatMessage).save(message);
        this.eventBus.publish(new ChatMessageEvent(ctx, saved));
        return saved;
    }

    async modifyMessage(ctx: RequestContext, userIdOrType: ID | 'admin', messageId: ID, newContent: string): Promise<ChatMessage> {
        const message = await this.connection.getRepository(ctx, ChatMessage).findOne({
            where: { id: messageId },
            relations: ['customer', 'customer.user', 'vendor', 'vendor.user'],
        });

        if (!message) {
            throw new Error('Message introuvable');
        }

        let isAuthorized = false;
        if (userIdOrType === 'admin') {
            if (message.sender === 'SUPERADMIN') {
                isAuthorized = true;
            }
        } else {
            if (message.sender === 'VENDOR' && message.vendor?.user?.id === userIdOrType) {
                if (message.seen) {
                    throw new Error('Impossible de modifier un message déjà vu par le destinataire');
                }
                isAuthorized = true;
            } else if (message.sender === 'CUSTOMER' && message.customer?.user?.id === userIdOrType) {
                if (message.seen) {
                    throw new Error('Impossible de modifier un message déjà vu par le destinataire');
                }
                isAuthorized = true;
            }
        }

        if (!isAuthorized) {
            throw new Error('Vous n\'êtes pas autorisé à modifier ce message');
        }

        message.content = newContent;
        message.modified = true;
        const saved = await this.connection.getRepository(ctx, ChatMessage).save(message);
        this.eventBus.publish(new ChatMessageEvent(ctx, saved));
        return saved;
    }

    async markAsSeen(ctx: RequestContext, messageId: ID): Promise<ChatMessage> {
        const message = await this.connection.getRepository(ctx, ChatMessage).findOne({
            where: { id: messageId },
        });

        if (!message) {
            throw new Error('Message introuvable');
        }

        message.seen = true;
        const saved = await this.connection.getRepository(ctx, ChatMessage).save(message);
        this.eventBus.publish(new ChatMessageEvent(ctx, saved));
        return saved;
    }

    setTyping(targetId: string, senderType: string, typing: boolean): boolean {
        const key = `${targetId}_${senderType}`;
        if (typing) {
            this.typingStates.set(key, Date.now());
        } else {
            this.typingStates.delete(key);
        }
        return true;
    }

    isTyping(targetId: string, targetType: string): boolean {
        const key = `${targetId}_${targetType}`;
        const lastActive = this.typingStates.get(key);
        if (!lastActive) return false;
        if (Date.now() - lastActive > 4000) {
            this.typingStates.delete(key);
            return false;
        }
        return true;
    }
}
