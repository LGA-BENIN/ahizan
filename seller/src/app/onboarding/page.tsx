import { OnboardingForm } from "./onboarding-form";
import { getMyVendorProfile, getActiveCustomer } from "@/lib/vendure/actions";
import { redirect } from "next/navigation";
import { unstable_noStore as noStore } from 'next/cache';
import { getAuthToken } from "@/lib/auth";
import { logoutAction } from "@/app/sign-in/actions";

export default async function OnboardingPage({
    searchParams
}: {
    searchParams: Promise<{ notice?: string }>;
}) {
    noStore();
    const resolvedSearchParams = await searchParams;
    const token = await getAuthToken();

    // Si l'utilisateur n'est pas connecté, le renvoyer vers l'inscription SSO
    if (!token) {
        const ssoUrl = process.env.NEXT_PUBLIC_SSO_REGISTER_URL || 'https://auth.ahizan.com/register';
        const returnUrl = process.env.NEXT_PUBLIC_SELLER_URL ? `${process.env.NEXT_PUBLIC_SELLER_URL}/onboarding` : 'https://seller.ahizan.com/onboarding';
        redirect(`${ssoUrl}?redirectTo=${encodeURIComponent(returnUrl)}`);
    }

    const [vendor, customer] = await Promise.all([
        getMyVendorProfile(),
        getActiveCustomer()
    ]);

    // Si l'utilisateur a déjà un profil vendeur, le rediriger selon son statut
    if (vendor) {
        if (vendor.status === 'PENDING') {
            redirect('/pending');
        } else if (vendor.status === 'REJECTED') {
            redirect('/rejected');
        } else {
            redirect('/dashboard');
        }
    }

    // Sinon, afficher le formulaire d'onboarding
    return (
        <div className="max-w-3xl mx-auto py-8 px-4">
            <div className="mb-8">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <img 
                            src="/logo-ahizan-official.svg" 
                            alt="AHIZAN Logo" 
                            className="h-10 w-auto object-contain" 
                        />
                        <span className="bg-[#E31E24]/10 text-[#E31E24] text-xs font-bold px-2.5 py-1 rounded-full border border-[#E31E24]/20">
                            Portail Vendeur
                        </span>
                    </div>
                    <form action={logoutAction}>
                        <button
                            type="submit"
                            className="flex items-center gap-2 text-xs font-semibold text-gray-600 hover:text-red-600 transition-colors border border-gray-200 rounded-xl px-3.5 py-2 hover:bg-red-50 hover:border-red-200 shadow-sm"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                                <polyline points="16 17 21 12 16 7" />
                                <line x1="21" y1="12" x2="9" y2="12" />
                            </svg>
                            Changer de compte
                        </button>
                    </form>
                </div>
                <div className="text-center bg-gradient-to-b from-red-50/50 to-transparent p-6 rounded-3xl border border-red-100/60 mb-6">
                    <h1 className="text-3xl md:text-4xl font-black text-gray-900 tracking-tight">
                        Devenez Marchand sur <span className="bg-gradient-to-r from-[#E31E24] to-orange-500 bg-clip-text text-transparent">AHIZAN</span>
                    </h1>
                    <p className="text-gray-600 mt-2 font-medium max-w-lg mx-auto text-sm md:text-base">
                        Rejoignez notre écosystème e-commerce d'excellence. Complétez votre profil marchand pour commencer à vendre auprès de milliers de clients.
                    </p>
                </div>
            </div>
            <OnboardingForm customer={customer} isRecognized={resolvedSearchParams?.notice === 'recognized'} />
        </div>
    );
}
