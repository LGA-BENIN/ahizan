import { getMyVendorProfile } from "@/lib/vendure/actions";
import { AccountSettingsForm } from './account-settings-form';

export default async function SettingsPage() {
    const vendor = await getMyVendorProfile();

    return (
        <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">
            <section className="space-y-6">
                <div className="flex flex-col gap-1">
                    <h2 className="text-4xl font-serif font-bold text-foreground">Paramètres du compte</h2>
                    <p className="text-muted-foreground">Gérez les informations de votre boutique et la sécurité de votre accès.</p>
                </div>
                
                <AccountSettingsForm vendor={vendor} />
            </section>
        </div>
    );
}
