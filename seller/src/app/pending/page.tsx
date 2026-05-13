import { redirect } from "next/navigation";
import { getMyVendorProfile } from "@/lib/vendure/actions";
import PendingContent from "./PendingContent";
import { unstable_noStore as noStore } from 'next/cache';

export default async function PendingPage() {
    noStore();
    let profile: any = null;
    let redirectPath: string | null = null;

    try {
        const token = await import('@/lib/auth').then(m => m.getAuthToken());
        if (!token) {
            console.log("No token found on Pending page, redirecting to sign-in.");
            redirectPath = '/sign-in';
        } else {
            profile = await getMyVendorProfile();
            const status = profile?.status;

            if (status === 'APPROVED') {
                redirectPath = '/dashboard';
            } else if (status === 'REJECTED') {
                redirectPath = '/rejected';
            }
        }
    } catch (e: any) {
        console.error("Pending page check failed:", e.message);
        // Fallback: ne pas rediriger pendant le build
        if (typeof window === 'undefined' && process.env.NODE_ENV === 'production') {
            console.log('Build time - skipping redirect');
            return <PendingContent />;
        }
        redirectPath = '/sign-in';
    }

    if (redirectPath) {
        redirect(redirectPath);
    }

    return <PendingContent />;
}
