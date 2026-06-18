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
    // Sticky logic has been moved to AhizanNavbar to allow specific sections to be sticky
    return (
        <>
            {children}
        </>
    );
}
