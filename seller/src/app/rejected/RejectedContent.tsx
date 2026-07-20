'use client';

import { useEffect, useState } from 'react';
import { Button } from "@/components/ui/button";
import { XCircle } from "lucide-react";
import Link from "next/link";
import { useRouter } from 'next/navigation';
import { logoutAction } from "@/app/sign-in/actions";
import { getMyVendorProfile } from "@/lib/vendure/actions";

interface RejectedContentProps {
    initialReason: string | null;
}

export default function RejectedContent({ initialReason }: RejectedContentProps) {
    const router = useRouter();
    const [rejectionReason, setRejectionReason] = useState<string | null>(initialReason);

    useEffect(() => {
        const checkStatus = async () => {
            try {
                const profile = await getMyVendorProfile();
                const status = profile?.status;
                const reason = profile?.rejectionReason;

                setRejectionReason(reason || null);

                if (status === 'APPROVED') {
                    router.push('/dashboard');
                } else if (status === 'PENDING') {
                    router.push('/pending');
                }
            } catch (e) {
                console.error("Failed to check vendor status", e);
            }
        };

        const interval = setInterval(checkStatus, 30000);
        return () => clearInterval(interval);
    }, [router]);

    return (
        <div className="min-h-screen flex flex-col bg-gradient-to-b from-red-50/20 via-white to-white dark:from-red-950/10 dark:via-background dark:to-background transition-colors duration-300">
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
                    <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-red-600 to-[#E31E24]"></div>

                    {/* Red XCircle Icon */}
                    <div className="mx-auto bg-red-50 dark:bg-red-950/20 p-5 rounded-full w-fit mb-6 shadow-inner animate-pulse">
                        <XCircle className="w-12 h-12 text-[#E31E24]" />
                    </div>

                    <h1 className="text-2xl md:text-3xl font-black text-red-700 dark:text-red-400 tracking-tight mb-4">
                        Inscription Refusée
                    </h1>

                    <p className="text-gray-600 dark:text-gray-300 mb-6 font-medium leading-relaxed">
                        Malheureusement, votre demande d'adhésion au réseau de marchands Ahizan n'a pas pu être approuvée en l'état.
                    </p>

                    {rejectionReason && (
                        <div className="bg-red-50 border border-red-200 dark:bg-red-950/20 dark:border-red-900/30 rounded-2xl p-5 text-left mb-6 shadow-sm">
                            <h4 className="font-bold text-red-900 dark:text-red-400 mb-2 text-xs uppercase tracking-wider flex items-center gap-1.5">
                                <span className="material-symbols-outlined text-[16px]">info</span>
                                Motif du refus :
                            </h4>
                            <p className="text-red-800 dark:text-red-300 text-sm leading-relaxed font-medium">{rejectionReason}</p>
                        </div>
                    )}

                    <p className="text-xs text-gray-400 dark:text-gray-500 mb-6">
                        Vous pouvez corriger vos informations d'inscription et soumettre une nouvelle demande d'examen.
                    </p>

                    <div className="flex flex-col gap-3">
                        <Link href="/resubmit" className="block w-full">
                            <Button className="w-full bg-gradient-to-r from-[#E31E24] to-orange-500 hover:scale-[1.02] active:scale-[0.98] transition-all text-white font-bold rounded-2xl py-3.5 shadow-md hover:shadow-lg">
                                Corriger et renvoyer la demande
                            </Button>
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
