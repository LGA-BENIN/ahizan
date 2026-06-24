import { Resolver, Query, Mutation, Args } from '@nestjs/graphql';
import { Ctx, RequestContext, Allow, Permission, ID } from '@vendure/core';
import { ChatService } from '../service/chat.service';
import { ChatMessage } from '../entities/chat-message.entity';

@Resolver()
export class ChatResolver {
    constructor(private chatService: ChatService) {}

    @Mutation()
    @Allow(Permission.Authenticated)
    async sendChatMessageToVendor(
        @Ctx() ctx: RequestContext,
        @Args('vendorId') vendorId: ID,
        @Args('content') content: string
    ): Promise<ChatMessage> {
        if (!ctx.activeUserId) {
            throw new Error('Non autorisé');
        }
        return this.chatService.sendMessageToVendor(ctx, ctx.activeUserId, vendorId, content);
    }

    @Mutation()
    @Allow(Permission.Authenticated)
    async replyToCustomer(
        @Ctx() ctx: RequestContext,
        @Args('customerId') customerId: ID,
        @Args('content') content: string
    ): Promise<ChatMessage> {
        if (!ctx.activeUserId) {
            throw new Error('Non autorisé');
        }
        return this.chatService.replyToCustomer(ctx, ctx.activeUserId, customerId, content);
    }

    @Query()
    @Allow(Permission.Authenticated)
    async myChatHistoryWithVendor(
        @Ctx() ctx: RequestContext,
        @Args('vendorId') vendorId: ID
    ): Promise<ChatMessage[]> {
        if (!ctx.activeUserId) {
            return [];
        }
        return this.chatService.getChatHistoryWithVendor(ctx, ctx.activeUserId, vendorId);
    }

    @Query()
    @Allow(Permission.Authenticated)
    async myConversations(
        @Ctx() ctx: RequestContext
    ): Promise<any[]> {
        if (!ctx.activeUserId) {
            return [];
        }
        return this.chatService.getConversationsForVendor(ctx, ctx.activeUserId);
    }

    @Query()
    @Allow(Permission.Authenticated)
    async conversationHistoryWithCustomer(
        @Ctx() ctx: RequestContext,
        @Args('customerId') customerId: ID
    ): Promise<ChatMessage[]> {
        if (!ctx.activeUserId) {
            return [];
        }
        return this.chatService.getConversationHistoryWithCustomer(ctx, ctx.activeUserId, customerId);
    }
}
