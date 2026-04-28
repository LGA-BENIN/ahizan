import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

export function Input({ className = '', ...props }: InputProps) {
    return (
        <input
            className={`w-full rounded-md border border-[var(--builder-border)] bg-white px-3 py-2 text-sm text-[var(--builder-text)] placeholder:text-[var(--builder-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--builder-primary)] focus:border-transparent disabled:opacity-50 ${className}`}
            {...props}
        />
    );
}
