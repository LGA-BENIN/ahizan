"use client";

import { ReactNode, useState, useEffect } from "react";

export function HeaderWrapper({ 
    config, 
    children, 
    isPreview = false 
}: { 
    config?: any; 
    children: ReactNode; 
    isPreview?: boolean;
}) {
    const [isScrolled, setIsScrolled] = useState(false);

    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 20);
        };
        window.addEventListener("scroll", handleScroll, { passive: true });
        handleScroll();
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    const sticky = config?.sticky !== false;
    const stickyStyle = config?.stickyStyle || 'solid';
    const headerShadow = config?.headerShadow !== false;

    // Determine position class
    let positionClass = "";
    const topOffset = isPreview ? "top-[36px]" : "top-0";

    if (sticky && stickyStyle !== 'none') {
        if (stickyStyle === 'transparent-to-solid') {
            positionClass = isScrolled 
                ? `fixed ${topOffset} left-0 w-full z-50 transition-all duration-300` 
                : `absolute ${topOffset} left-0 w-full z-50 transition-all duration-300`;
        } else {
            // 'solid' or 'shrink'
            positionClass = `sticky ${topOffset} z-50 w-full`;
        }
    } else {
        positionClass = "relative w-full";
    }

    // Determine shadow
    const shadowClass = (headerShadow && (stickyStyle !== 'transparent-to-solid' || isScrolled)) 
        ? "shadow-sm" 
        : "";

    return (
        <div className={`${positionClass} ${shadowClass}`}>
            {children}
        </div>
    );
}
