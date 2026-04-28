import React from 'react';

export function Table({ className = '', children, ...props }: React.TableHTMLAttributes<HTMLTableElement>) {
    return (
        <div className="w-full overflow-auto">
            <table className={`w-full text-sm ${className}`} {...props}>{children}</table>
        </div>
    );
}

export function TableHeader({ className = '', children, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) {
    return <thead className={`border-b-2 border-[var(--builder-border)] ${className}`} {...props}>{children}</thead>;
}

export function TableBody({ className = '', children, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) {
    return <tbody className={className} {...props}>{children}</tbody>;
}

export function TableRow({ className = '', children, ...props }: React.HTMLAttributes<HTMLTableRowElement>) {
    return <tr className={`border-b border-[var(--builder-border)] hover:bg-gray-50/50 transition-colors ${className}`} {...props}>{children}</tr>;
}

export function TableHead({ className = '', children, ...props }: React.ThHTMLAttributes<HTMLTableCellElement>) {
    return <th className={`text-left px-3 py-2 text-xs font-bold text-[var(--builder-text-muted)] uppercase tracking-wider ${className}`} {...props}>{children}</th>;
}

export function TableCell({ className = '', children, ...props }: React.TdHTMLAttributes<HTMLTableCellElement>) {
    return <td className={`px-3 py-2 text-sm text-[var(--builder-text)] ${className}`} {...props}>{children}</td>;
}
