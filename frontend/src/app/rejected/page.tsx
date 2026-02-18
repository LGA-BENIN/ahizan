import { Button } from "@/components/ui/button";
import { XCircle } from "lucide-react";
import Link from "next/link";
import { logoutAction } from "@/app/sign-in/actions";
import { query } from "@/lib/vendure/api";
import { GetMyVendorProfileQuery } from "@/lib/vendure/queries";

export default async function RejectedPage() {
    // Fetch rejection reason server-side (auth token is available server-side)
    let rejectionReason: string | null = null;
    try {
        const { data } = await query(GetMyVendorProfileQuery, {}, { useAuthToken: true });
        rejectionReason = data.myVendorProfile?.rejectionReason || null;
    } catch (e) {
        console.error("Failed to fetch vendor profile", e);
    }

    return (
        <div className="min-h-screen flex flex-col bg-gradient-to-br from-red-50 to-orange-50">
            {/* Minimal header */}
            <header className="h-16 flex items-center justify-between px-6 bg-white border-b shadow-sm">
                <span className="text-xl font-bold bg-gradient-to-r from-orange-500 to-red-600 bg-clip-text text-transparent">
                    AHIZAN
                </span>
                <form action={logoutAction}>
                    <Button variant="ghost" size="sm" type="submit" className="text-gray-500 hover:text-red-600">
                        Se déconnecter
                    </Button>
                </form>
            </header>

            {/* Content */}
            <div className="flex-1 flex items-center justify-center p-6">
                <div className="max-w-md w-full text-center">
                    <div className="mx-auto bg-red-100 p-5 rounded-full w-fit mb-6 shadow-inner">
                        <XCircle className="w-12 h-12 text-red-600" />
                    </div>

                    <h1 className="text-2xl font-bold text-red-800 mb-3">
                        Inscription Refusée
                    </h1>

                    <p className="text-gray-600 mb-6">
                        Malheureusement, votre demande d'inscription n'a pas été approuvée.
                    </p>

                    {rejectionReason && (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-left mb-6">
                            <h4 className="font-semibold text-red-900 mb-1 text-sm">Motif du refus :</h4>
                            <p className="text-red-800 text-sm">{rejectionReason}</p>
                        </div>
                    )}

                    <p className="text-sm text-gray-500 mb-6">
                        Vous pouvez corriger les informations et soumettre une nouvelle demande.
                    </p>

                    <div className="flex flex-col gap-3">
                        <Link href="/resubmit">
                            <Button className="w-full bg-red-600 hover:bg-red-700 text-white">
                                Corriger et renvoyer la demande
                            </Button>
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
