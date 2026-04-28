import React from 'react';

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {}

export function Select({ className = '', children, ...props }: SelectProps) {
    return (
        <select
            className={`w-full rounded-md border border-[var(--builder-border)] bg-white px-3 py-2 text-sm text-[var(--builder-text)] focus:outline-none focus:ring-2 focus:ring-[var(--builder-primary)] focus:border-transparent disabled:opacity-50 ${className}`}
            {...props}
        >
            {children}
        </select>
    );
}
