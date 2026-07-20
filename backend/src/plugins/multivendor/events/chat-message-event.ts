import { RequestContext, VendureEvent } from '@vendure/core';
import { ChatMessage } from '../entities/chat-message.entity';

export class ChatMessageEvent extends VendureEvent {
    constructor(
        public ctx: RequestContext,
        public message: ChatMessage
    ) {
        super();
    }
}
