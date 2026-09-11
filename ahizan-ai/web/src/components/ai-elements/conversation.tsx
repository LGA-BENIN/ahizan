import React from 'react';

interface ConversationProps {
  children: React.ReactNode;
  className?: string;
}

export function Conversation({ children, className = '' }: ConversationProps) {
  return (
    <div className={`flex-1 overflow-y-auto px-3 py-4 md:px-6 md:py-6 flex justify-center w-full ${className}`}>
      <div className="w-full max-w-4xl flex flex-col gap-4 md:gap-6">
        {children}
      </div>
    </div>
  );
}
