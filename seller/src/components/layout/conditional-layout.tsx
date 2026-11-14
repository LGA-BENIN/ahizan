'use client';

import { usePathname } from 'next/navigation';

export function ConditionalLayout({ 
    children, 
    navbar, 
    footer 
}: { 
    children: React.ReactNode; 
    navbar: React.ReactNode; 
    footer: React.ReactNode; 
}) {
    const pathname = usePathname();
    const isStandalone = pathname === '/' ||
                      pathname?.startsWith('/dashboard') || 
                      pathname?.startsWith('/pending') || 
                      pathname?.startsWith('/rejected') ||
                      pathname?.startsWith('/sign-in') ||
                      pathname?.startsWith('/register') ||
                      pathname?.startsWith('/forgot-password') ||
                      pathname?.startsWith('/reset-password') ||
                      pathname?.startsWith('/verify') ||
                      pathname?.startsWith('/verify-pending') ||
                      pathname?.startsWith('/resubmit') ||
                      pathname?.startsWith('/onboarding');

    if (isStandalone) {
        return <>{children}</>;
    }

    return (
        <>
            {navbar}
            {children}
            {footer}
        </>
    );
}
