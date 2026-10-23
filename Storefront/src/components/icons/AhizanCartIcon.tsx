import React from 'react';

interface AhizanCartIconProps {
    className?: string;
    size?: number | string;
}

/**
 * Official Ahizan Cart Brand Icon (SVG vector / image)
 */
export function AhizanCartIcon({ className = "w-4 h-4", size }: AhizanCartIconProps) {
    const style = size ? { width: size, height: size } : undefined;
    return (
        <img
            src="/logo-ahizan-official.svg"
            alt="Ahizan"
            style={style}
            className={`object-contain select-none pointer-events-none shrink-0 ${className}`}
        />
    );
}
