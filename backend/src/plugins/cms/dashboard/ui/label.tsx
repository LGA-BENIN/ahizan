import React from 'react';

interface LabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {}

export function Label({ className = '', ...props }: LabelProps) {
    return (
        <label
            className={`text-xs font-semibold text-[var(--builder-text)] mb-1 block ${className}`}
            {...props}
        />
    );
}
