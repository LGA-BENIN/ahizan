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
        // If unauthorized or error, we might want to redirect to sign-in
        // but let's be careful not to loop if it's just a temporary failure.
        redirectPath = '/sign-in';
    }

    if (redirectPath) {
        redirect(redirectPath);
    }

    return <PendingContent />;
}
