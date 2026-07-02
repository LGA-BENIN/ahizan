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
        <div className="min-h-screen flex flex-col bg-gradient-to-b from-[#0d213d]/5 via-white to-white dark:from-[#0d213d]/10 dark:via-background dark:to-background transition-colors duration-300">
            {/* Minimal brand header */}
            <header className="h-16 flex items-center justify-between px-6 md:px-10 bg-white dark:bg-[#0d213d] border-b border-gray-100 dark:border-gray-800 shadow-sm z-50">
                <div className="flex items-center gap-3">
                    <img 
                        src="/logo-ahizan-official.svg" 
                        alt="AHIZAN" 
                        className="h-8 w-auto object-contain dark:brightness-0 dark:invert" 
                    />
                    <span className="bg-[#E31E24]/10 text-[#E31E24] text-[10px] font-bold px-2 py-0.5 rounded-full border border-[#E31E24]/20 uppercase tracking-wider">
                        Portail Vendeur
                    </span>
                </div>
                <form action={logoutAction}>
                    <Button variant="ghost" size="sm" type="submit" className="text-gray-500 hover:text-[#E31E24] dark:text-gray-400 dark:hover:text-red-400 flex items-center gap-2 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-xl px-4 py-2 border border-transparent hover:border-red-100 transition-all duration-300">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                            <polyline points="16 17 21 12 16 7" />
                            <line x1="21" y1="12" x2="9" y2="12" />
                        </svg>
                        Se déconnecter
                    </Button>
                </form>
            </header>

            {/* Content Body */}
            <div className="flex-1 flex items-center justify-center p-6 md:p-12">
                <div className="max-w-md w-full bg-white dark:bg-[#0d213d]/40 rounded-3xl border border-gray-100 dark:border-gray-800/80 shadow-[0_15px_50px_rgba(0,0,0,0.03)] dark:shadow-[0_15px_50px_rgba(0,0,0,0.2)] p-8 md:p-10 text-center relative overflow-hidden">
                    {/* Visual Accent */}
                    <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-[#E31E24] to-orange-500"></div>

                    {/* Clock Icon */}
                    <div className="mx-auto bg-orange-50 dark:bg-orange-950/20 p-5 rounded-full w-fit mb-6 shadow-inner animate-pulse">
                        <Clock className="w-12 h-12 text-[#E31E24]" />
                    </div>

                    <h1 className="text-2xl md:text-3xl font-black text-gray-950 dark:text-white tracking-tight mb-4">
                        Demande en cours d'examen
                    </h1>

                    <p className="text-gray-600 dark:text-gray-300 mb-4 font-medium leading-relaxed">
                        Votre dossier d'inscription vendeur a bien été reçu et est actuellement en cours d'analyse par l'équipe d'administration.
                    </p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mb-8 leading-normal">
                        Vous recevrez une notification par e-mail dès la validation finale de votre espace. Cette opération prend habituellement entre <strong>24 et 48 heures</strong>.
                    </p>

                    <div className="bg-[#E31E24]/5 border border-[#E31E24]/10 dark:bg-[#E31E24]/10 dark:border-[#E31E24]/20 rounded-2xl p-4 text-xs text-[#E31E24] font-semibold flex items-center justify-center gap-2 shadow-sm">
                        💡 Pensez à vérifier votre boîte e-mail (et vos spams).
                    </div>
                </div>
            </div>
        </div>
    );
}
