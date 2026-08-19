import { Resolver, Query, Mutation, Args } from '@nestjs/graphql';
import { Ctx, RequestContext, Allow, Permission, ID } from '@vendure/core';
import { ChatService } from '../service/chat.service';
import { ChatMessage } from '../entities/chat-message.entity';

@Resolver()
export class ChatAdminResolver {
    constructor(private chatService: ChatService) {}

    @Query()
    @Allow(Permission.SuperAdmin)
    async adminConversations(@Ctx() ctx: RequestContext): Promise<any[]> {
        return this.chatService.getAdminConversations(ctx);
    }

    @Query()
    @Allow(Permission.SuperAdmin)
    async adminChatHistory(
        @Ctx() ctx: RequestContext,
        @Args('customerId') customerId: ID,
        @Args('vendorId') vendorId: ID
    ): Promise<ChatMessage[]> {
        return this.chatService.getAdminChatHistory(ctx, customerId, vendorId);
    }

    @Query()
    @Allow(Permission.SuperAdmin)
    async adminDirectChatHistory(
        @Ctx() ctx: RequestContext,
        @Args('targetId') targetId: ID,
        @Args('targetType') targetType: 'VENDOR' | 'CUSTOMER'
    ): Promise<ChatMessage[]> {
        return this.chatService.getAdminDirectChatHistory(ctx, targetId, targetType);
    }

    @Mutation()
    @Allow(Permission.SuperAdmin)
    async adminReplyToConversation(
        @Ctx() ctx: RequestContext,
        @Args('customerId') customerId: ID,
        @Args('vendorId') vendorId: ID,
        @Args('content') content: string
    ): Promise<ChatMessage> {
        return this.chatService.adminReplyToConversation(ctx, customerId, vendorId, content);
    }

    @Mutation()
    @Allow(Permission.SuperAdmin)
    async adminSendDirectMessage(
        @Ctx() ctx: RequestContext,
        @Args('targetId') targetId: ID,
        @Args('targetType') targetType: 'VENDOR' | 'CUSTOMER',
        @Args('content') content: string
    ): Promise<ChatMessage> {
        return this.chatService.adminSendDirectMessage(ctx, targetId, targetType, content);
    }

    @Mutation()
    @Allow(Permission.SuperAdmin)
    async deleteChatMessage(
        @Ctx() ctx: RequestContext,
        @Args('id') id: ID
    ): Promise<ChatMessage> {
        return this.chatService.deleteMessage(ctx, 'admin', id);
    }

    @Mutation()
    @Allow(Permission.SuperAdmin)
    async modifyChatMessage(
        @Ctx() ctx: RequestContext,
        @Args('id') id: ID,
        @Args('content') content: string
    ): Promise<ChatMessage> {
        return this.chatService.modifyMessage(ctx, 'admin', id, content);
    }

    @Mutation()
    @Allow(Permission.SuperAdmin)
    async markChatMessageAsSeen(
        @Ctx() ctx: RequestContext,
        @Args('id') id: ID
    ): Promise<ChatMessage> {
        return this.chatService.markAsSeen(ctx, id);
    }
}
