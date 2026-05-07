import React from 'react';

const variants = {
    default: 'bg-[var(--builder-primary)] text-white hover:opacity-90',
    destructive: 'bg-red-600 text-white hover:bg-red-700',
    outline: 'border border-[var(--builder-border)] bg-white text-[var(--builder-text)] hover:bg-gray-50',
    ghost: 'bg-transparent text-[var(--builder-text)] hover:bg-gray-100',
};

const sizes = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base',
    icon: 'p-2',
};

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: keyof typeof variants;
    size?: keyof typeof sizes;
}

export function Button({ variant = 'default', size = 'md', className = '', children, ...props }: ButtonProps) {
    return (
        <button
            className={`inline-flex items-center justify-center gap-2 rounded-md font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--builder-primary)] focus:ring-offset-1 disabled:opacity-50 disabled:pointer-events-none ${variants[variant]} ${sizes[size]} ${className}`}
            {...props}
        >
            {children}
        </button>
    );
}
