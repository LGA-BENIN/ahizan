import { redirect } from "next/navigation";
import { getMyVendorProfile } from "@/lib/vendure/actions";
import SuspendedContent from "./SuspendedContent";
import { unstable_noStore as noStore } from 'next/cache';

export default async function SuspendedPage() {
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
        } else if (status === 'REJECTED') {
            redirectPath = '/rejected';
        }
    } catch (e: any) {
        console.error("Suspended page check failed:", e.message);
        redirectPath = '/sign-in';
    }

    if (redirectPath) {
        redirect(redirectPath);
    }

    return <SuspendedContent initialReason={profile?.suspensionReason || null} />;
}
