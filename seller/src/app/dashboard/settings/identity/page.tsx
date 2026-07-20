import { query } from "@/lib/vendure/api";
import { GetMyVendorProfileQuery } from "@/lib/vendure/queries";
import { getAuthToken } from "@/lib/auth";
import { VendorProfileForm } from "../vendor-profile-form";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default async function IdentitySettingsPage() {
    const token = await getAuthToken();
    const { data } = await query(GetMyVendorProfileQuery, {}, { token }).catch((err) => {
        console.error('[IdentitySettingsPage] Failed to fetch profile:', err);
        return { data: null };
    });
    const vendor = (data as any)?.myVendorProfile;

    return (
        <div className="space-y-8">
            <div className="flex items-center gap-4">
                <Link href="/dashboard/settings">
                    <Button variant="ghost" size="icon" className="rounded-full bg-muted/50 hover:bg-muted">
                         <ChevronLeft className="h-4 w-4" />
                    </Button>
                </Link>
                <h1 className="text-3xl font-serif font-bold">Identité de la boutique</h1>
            </div>

            <VendorProfileForm
                initialName={vendor?.name || ''}
                title="Informations générales"
                description="Modifiez le nom et les informations publiques de votre boutique AHIZAN."
            />
        </div>
    );
}
