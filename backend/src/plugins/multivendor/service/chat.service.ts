import { Injectable } from '@nestjs/common';
import { TransactionalConnection, RequestContext, Customer, ID } from '@vendure/core';
import { ChatMessage } from '../entities/chat-message.entity';
import { Vendor } from '../entities/vendor.entity';

@Injectable()
export class ChatService {
    constructor(private connection: TransactionalConnection) {}

    /**
     * Send a message from a Customer to a Vendor
     */
    async sendMessageToVendor(
        ctx: RequestContext,
        customerUserId: ID,
        vendorId: ID,
        content: string
    ): Promise<ChatMessage> {
        const customer = await this.connection.getRepository(ctx, Customer).findOne({
            where: { user: { id: customerUserId } },
        });

        if (!customer) {
            throw new Error('Client introuvable pour l\'utilisateur connecté');
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

        return this.connection.getRepository(ctx, ChatMessage).save(chatMessage);
    }

    /**
     * Send a response from a Vendor to a Customer
     */
    async replyToCustomer(
        ctx: RequestContext,
        vendorUserId: ID,
        customerId: ID,
        content: string
    ): Promise<ChatMessage> {
        const vendor = await this.connection.getRepository(ctx, Vendor).findOne({
            where: { user: { id: vendorUserId } },
        });

        if (!vendor) {
            throw new Error('Vendeur introuvable pour l\'utilisateur connecté');
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

        return this.connection.getRepository(ctx, ChatMessage).save(chatMessage);
    }

    /**
     * Get chat history between a Customer and a Vendor (ordered by date)
     */
    async getChatHistoryWithVendor(
        ctx: RequestContext,
        customerUserId: ID,
        vendorId: ID
    ): Promise<ChatMessage[]> {
        const customer = await this.connection.getRepository(ctx, Customer).findOne({
            where: { user: { id: customerUserId } },
        });

        if (!customer) {
            return [];
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
     * Get all conversations for a Vendor
     */
    async getConversationsForVendor(ctx: RequestContext, vendorUserId: ID): Promise<any[]> {
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
            if (!msg.customer) continue;
            const customerId = String(msg.customer.id);
            if (!conversationMap.has(customerId)) {
                conversationMap.set(customerId, {
                    customer: msg.customer,
                    lastMessage: msg,
                });
            }
        }

        return Array.from(conversationMap.values());
    }

    /**
     * Get conversation history between a Vendor and a Customer
     */
    async getConversationHistoryWithCustomer(
        ctx: RequestContext,
        vendorUserId: ID,
        customerId: ID
    ): Promise<ChatMessage[]> {
        const vendor = await this.connection.getRepository(ctx, Vendor).findOne({
            where: { user: { id: vendorUserId } },
        });

        if (!vendor) {
            return [];
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
}
