import { DashboardLayout } from "@/components/dashboard/dashboard-layout";
import { Suspense } from "react";
import { getMyVendorProfile } from "@/lib/vendure/actions";
import { redirect } from "next/navigation";
import { unstable_noStore as noStore } from 'next/cache';

const VENDURE_API_URL = process.env.VENDURE_SHOP_API_URL || process.env.NEXT_PUBLIC_VENDURE_SHOP_API_URL || 'http://localhost:3000/shop-api';

async function getSellerDashboardConfig(): Promise<{ walletPageEnabled: boolean }> {
    try {
        const res = await fetch(VENDURE_API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                query: `query { sellerDashboardConfig { walletPageEnabled } }`,
            }),
            next: { revalidate: 30 },
        });
        const json = await res.json();
        return json.data?.sellerDashboardConfig || { walletPageEnabled: true };
    } catch {
        return { walletPageEnabled: true };
    }
}

function DashboardLoading() {
    return (
        <div className="flex items-center justify-center h-screen bg-background">
            <div className="flex items-center justify-center" style={{ width: '260px', height: '260px', position: 'relative' }}>
                {/* Circle spinner around the logo */}
                <svg className="preloader-circle-spinner" viewBox="0 0 100 100" style={{
                    position: 'absolute',
                    width: '100%',
                    height: '100%',
                    top: 0,
                    left: 0,
                    pointerEvents: 'none',
                    transformOrigin: 'center center',
                    animation: 'preloader-spin 1.2s linear infinite',
                    opacity: 0.3
                }}>
                    <circle 
                        cx="50" 
                        cy="50" 
                        r="46" 
                        fill="none" 
                        stroke="#E31E24" 
                        strokeWidth="0.6" 
                        strokeDasharray="132 12"
                        strokeLinecap="round"
                    />
                </svg>
                {/* Wrapper for robust animations */}
                <div style={{
                    width: '70%',
                    height: '70%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transformOrigin: 'center center',
                    position: 'relative',
                    zIndex: 10,
                    animation: 'fallback-pulse 1.6s ease-in-out infinite'
                }}>
                    <img 
                        src="/logo-ahizan-official.svg" 
                        alt="Ahizan Logo" 
                        style={{ 
                            width: '100%', 
                            height: '100%'
                        }} 
                    />
                </div>
                <style dangerouslySetInnerHTML={{ __html: `
                    @keyframes fallback-pulse {
                        0% { transform: scale(1); opacity: 0.9; }
                        50% { transform: scale(1.03); opacity: 1; filter: drop-shadow(0 0 12px rgba(227, 30, 36, 0.2)); }
                        100% { transform: scale(1); opacity: 0.9; }
                    }
                    @keyframes preloader-spin {
                        0% { transform: rotate(0deg); }
                        100% { transform: rotate(360deg); }
                    }
                ` }} />
            </div>
        </div>
    );
}

export default async function Layout({ children }: { children: React.ReactNode }) {
    noStore();
    
    return (
        <Suspense fallback={<DashboardLoading />}>
            <DashboardContentWrapper>
                {children}
            </DashboardContentWrapper>
        </Suspense>
    );
}

async function DashboardContentWrapper({ children }: { children: React.ReactNode }) {
    const [vendor, dashboardConfig] = await Promise.all([
        getMyVendorProfile(),
        getSellerDashboardConfig(),
    ]);

    if (!vendor) {
        redirect('/onboarding');
    }

    return (
        <DashboardLayout vendor={vendor} dashboardConfig={dashboardConfig}>
            <DashboardProtection profile={vendor} />
            {children}
        </DashboardLayout>
    );
}

async function DashboardProtection({ profile }: { profile: any }) {
    const status = profile?.status;

    if (status === 'PENDING') {
        redirect('/pending');
    } else if (status === 'REJECTED') {
        redirect('/rejected');
    }
    
    return null;
}
