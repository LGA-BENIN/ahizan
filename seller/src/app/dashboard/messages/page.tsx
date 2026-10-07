import React from 'react';
import { getConversationsAction } from '@/lib/vendure/actions';
import { MessagesClient } from './messages-client';

export const metadata = {
    title: 'Messagerie | Seller Hub',
    description: 'Échangez en direct avec vos clients et répondez à leurs questions.',
};

export default async function MessagesPage() {
    const initialConversations = await getConversationsAction();
    
    return (
        <div className="flex-1 space-y-2 sm:space-y-4 p-2 sm:p-4 md:p-8 pt-2 sm:pt-6 h-[calc(100vh-70px)] md:h-[calc(100vh-80px)] flex flex-col">
            <MessagesClient initialConversations={initialConversations} />
        </div>
    );
}
