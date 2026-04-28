import React from 'react';

const variants = {
    default: 'bg-[var(--builder-primary)] text-white',
    secondary: 'bg-gray-100 text-gray-700',
    destructive: 'bg-red-100 text-red-700',
    outline: 'border border-[var(--builder-border)] text-[var(--builder-text)]',
    success: 'bg-green-100 text-green-700',
};

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
    variant?: keyof typeof variants;
}

export function Badge({ variant = 'default', className = '', children, ...props }: BadgeProps) {
    return (
        <span
            className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold transition-colors ${variants[variant]} ${className}`}
            {...props}
        >
            {children}
        </span>
    );
}
