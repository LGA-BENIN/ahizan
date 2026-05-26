"use client";

import { createContext, useContext, useState, ReactNode, useEffect } from "react";
import { usePathname } from "next/navigation";

interface MobileMenuContextType {
    mobileMenuOpen: boolean;
    setMobileMenuOpen: (open: boolean) => void;
    expandedMobileCat: any;
    setExpandedMobileCat: (cat: any) => void;
    logoUrl?: string;
    setLogoUrl: (url: string) => void;
    promoConfig?: any;
    setPromoConfig: (config: any) => void;
}

const MobileMenuContext = createContext<MobileMenuContextType | undefined>(undefined);

export function MobileMenuProvider({ children }: { children: ReactNode }) {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [expandedMobileCat, setExpandedMobileCat] = useState<any>(null);
    const [logoUrl, setLogoUrl] = useState<string>("");
    const [promoConfig, setPromoConfig] = useState<any>(null);
    const pathname = usePathname();

    // Close mobile menu when navigating to a different page
    useEffect(() => {
        setMobileMenuOpen(false);
        setExpandedMobileCat(null);
    }, [pathname]);

    return (
        <MobileMenuContext.Provider value={{ mobileMenuOpen, setMobileMenuOpen, expandedMobileCat, setExpandedMobileCat, logoUrl, setLogoUrl, promoConfig, setPromoConfig }}>
            {children}
        </MobileMenuContext.Provider>
    );
}

export function useMobileMenu() {
    const context = useContext(MobileMenuContext);
    if (context === undefined) {
        throw new Error("useMobileMenu must be used within a MobileMenuProvider");
    }
    return context;
}

export function MobileMenuHeader({ children }: { children: ReactNode }) {
    const { mobileMenuOpen } = useMobileMenu();
    // Hide header on mobile when menu is open
    return <div className={`${mobileMenuOpen ? 'hidden lg:block' : ''}`}>{children}</div>;
}
