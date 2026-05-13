import { redirect } from "next/navigation";
import { getMyVendorProfile } from "@/lib/vendure/actions";
import RejectedContent from "./RejectedContent";
import { unstable_noStore as noStore } from 'next/cache';

export default async function RejectedPage() {
    noStore();
    let profile: any = null;
    let redirectPath: string | null = null;

    try {
        profile = await getMyVendorProfile();
        const status = profile?.status;

        if (status === 'APPROVED') {
            redirectPath = '/dashboard';
        } else if (status === 'PENDING') {
            redirectPath = '/pending';
        }
    } catch (e: any) {
        console.error("Rejected page check failed:", e.message);
        // Fallback: ne pas rediriger pendant le build
        if (typeof window === 'undefined' && process.env.NODE_ENV === 'production') {
            console.log('Build time - skipping redirect');
            return <RejectedContent initialReason={null} />;
        }
        redirectPath = '/sign-in';
    }

    if (redirectPath) {
        redirect(redirectPath);
    }

    return <RejectedContent initialReason={profile?.rejectionReason || null} />;
}
