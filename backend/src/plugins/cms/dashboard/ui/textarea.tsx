import React from 'react';

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

export function Textarea({ className = '', ...props }: TextareaProps) {
    return (
        <textarea
            className={`w-full rounded-md border border-[var(--builder-border)] bg-white px-3 py-2 text-sm text-[var(--builder-text)] placeholder:text-[var(--builder-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--builder-primary)] focus:border-transparent disabled:opacity-50 resize-y ${className}`}
            {...props}
        />
    );
}
