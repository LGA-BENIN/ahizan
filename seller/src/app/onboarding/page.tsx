import { OnboardingForm } from "./onboarding-form";
import { getMyVendorProfile } from "@/lib/vendure/actions";
import { redirect } from "next/navigation";
import { unstable_noStore as noStore } from 'next/cache';
import { getAuthToken } from "@/lib/auth";

export default async function OnboardingPage() {
    noStore();
    const token = await getAuthToken();

    // Si l'utilisateur n'est pas connecté, le renvoyer vers l'inscription SSO
    if (!token) {
        const ssoUrl = process.env.NEXT_PUBLIC_SSO_REGISTER_URL || 'https://auth.ahizan.com/register';
        const returnUrl = process.env.NEXT_PUBLIC_SELLER_URL ? `${process.env.NEXT_PUBLIC_SELLER_URL}/onboarding` : 'https://seller.ahizan.com/onboarding';
        redirect(`${ssoUrl}?redirectTo=${encodeURIComponent(returnUrl)}`);
    }

    const vendor = await getMyVendorProfile();

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
        <div className="max-w-2xl mx-auto py-10 px-4">
            <div className="mb-8 text-center">
                <h1 className="text-3xl font-black bg-gradient-to-r from-orange-500 to-red-600 bg-clip-text text-transparent uppercase tracking-wider">
                    Créez votre Boutique
                </h1>
                <p className="text-muted-foreground mt-2 font-medium">
                    Complétez les informations suivantes pour soumettre votre boutique à la validation.
                </p>
            </div>
            <OnboardingForm />
        </div>
    );
}
