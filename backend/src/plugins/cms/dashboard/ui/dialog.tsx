import React from 'react';

interface DialogProps {
    open: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
    width?: string;
}

export function Dialog({ open, onClose, title, children, width = '400px' }: DialogProps) {
    if (!open) return null;

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center"
            style={{ background: 'rgba(0,0,0,0.4)' }}
            onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
            <div
                className="bg-white rounded-xl p-6 shadow-xl"
                style={{ width, maxWidth: '90vw' }}
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-base font-bold text-[var(--builder-text)]">{title}</h3>
                    <button
                        onClick={onClose}
                        className="text-[var(--builder-text-muted)] hover:text-[var(--builder-text)] text-lg leading-none"
                        aria-label="Fermer"
                    >
                        ✕
                    </button>
                </div>
                {children}
            </div>
        </div>
    );
}

export function DialogFooter({ children }: { children: React.ReactNode }) {
    return (
        <div className="flex gap-2 justify-end mt-4 pt-4 border-t border-[var(--builder-border)]">
            {children}
        </div>
    );
}
