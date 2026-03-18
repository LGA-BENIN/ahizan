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
        redirectPath = '/sign-in';
    }

    if (redirectPath) {
        redirect(redirectPath);
    }

    return <RejectedContent initialReason={profile?.rejectionReason || null} />;
}
