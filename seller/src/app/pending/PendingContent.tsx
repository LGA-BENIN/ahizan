'use client';

import { useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Clock } from "lucide-react";
import { useRouter } from 'next/navigation';
import { logoutAction } from "@/app/sign-in/actions";
import { getMyVendorProfile } from "@/lib/vendure/actions";

export default function PendingContent() {
    const router = useRouter();

    useEffect(() => {
        const checkStatus = async () => {
            try {
                const profile = await getMyVendorProfile();
                const status = profile?.status;

                if (status === 'APPROVED') {
                    router.push('/dashboard');
                } else if (status === 'REJECTED') {
                    router.push('/rejected');
                }
            } catch (e) {
                console.error("Failed to check vendor status", e);
            }
        };

        // Check every 30 seconds
        const interval = setInterval(checkStatus, 30000);
        return () => clearInterval(interval);
    }, [router]);

    return (
        <div className="min-h-screen flex flex-col bg-gradient-to-br from-yellow-50 to-orange-50">
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
                    <div className="mx-auto bg-yellow-100 p-5 rounded-full w-fit mb-6 shadow-inner">
                        <Clock className="w-12 h-12 text-yellow-600" />
                    </div>

                    <h1 className="text-2xl font-bold text-gray-900 mb-3">
                        Demande en cours de traitement
                    </h1>

                    <p className="text-gray-600 mb-2">
                        Votre demande d'inscription est actuellement en cours d'examen par nos administrateurs.
                    </p>
                    <p className="text-sm text-gray-500 mb-8">
                        Vous serez notifié par email dès que votre compte sera validé.
                        Cette procédure prend généralement <strong>24 à 48 heures</strong>.
                    </p>

                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-sm text-yellow-800">
                        💡 Assurez-vous que votre boîte email est accessible pour recevoir la notification.
                    </div>
                </div>
            </div>
        </div>
    );
}
