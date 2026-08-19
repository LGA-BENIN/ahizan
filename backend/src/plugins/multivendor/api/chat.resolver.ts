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

    @Query()
    @Allow(Permission.Authenticated)
    async myCustomerConversations(
        @Ctx() ctx: RequestContext
    ): Promise<any[]> {
        if (!ctx.activeUserId) {
            return [];
        }
        return this.chatService.getConversationsForCustomer(ctx, ctx.activeUserId);
    }

    @Mutation()
    @Allow(Permission.Authenticated)
    async deleteChatMessage(
        @Ctx() ctx: RequestContext,
        @Args('id') id: ID
    ): Promise<ChatMessage> {
        if (!ctx.activeUserId) {
            throw new Error('Non autorisé');
        }
        return this.chatService.deleteMessage(ctx, ctx.activeUserId, id);
    }

    @Mutation()
    @Allow(Permission.Authenticated)
    async modifyChatMessage(
        @Ctx() ctx: RequestContext,
        @Args('id') id: ID,
        @Args('content') content: string
    ): Promise<ChatMessage> {
        if (!ctx.activeUserId) {
            throw new Error('Non autorisé');
        }
        return this.chatService.modifyMessage(ctx, ctx.activeUserId, id, content);
    }

    @Mutation()
    @Allow(Permission.Authenticated)
    async markChatMessageAsSeen(
        @Ctx() ctx: RequestContext,
        @Args('id') id: ID
    ): Promise<ChatMessage> {
        if (!ctx.activeUserId) {
            throw new Error('Non autorisé');
        }
        return this.chatService.markAsSeen(ctx, id);
    }

    @Query()
    @Allow(Permission.Authenticated)
    async isTyping(
        @Ctx() ctx: RequestContext,
        @Args('targetId') targetId: ID,
        @Args('targetType') targetType: string
    ): Promise<boolean> {
        return this.chatService.isTyping(String(targetId), targetType);
    }

    @Mutation()
    @Allow(Permission.Authenticated)
    async setTyping(
        @Ctx() ctx: RequestContext,
        @Args('targetId') targetId: ID,
        @Args('targetType') targetType: string,
        @Args('typing') typing: boolean
    ): Promise<boolean> {
        return this.chatService.setTyping(String(targetId), targetType, typing);
    }

    @Query()
    @Allow(Permission.Authenticated)
    async userOnlineStatus(
        @Ctx() ctx: RequestContext,
        @Args('targetId') targetId: ID,
        @Args('targetType') targetType: string
    ): Promise<string> {
        return this.chatService.getUserOnlineStatus(ctx, String(targetId), targetType);
    }
}
