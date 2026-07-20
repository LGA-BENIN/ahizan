import { getMyVendorProfile, getAvailableLocationsAction } from "@/lib/vendure/actions";
import { AccountSettingsForm } from './account-settings-form';

/* Force hot-reload of settings form v5 */
export default async function SettingsPage() {
    const [vendor, locations] = await Promise.all([
        getMyVendorProfile(),
        getAvailableLocationsAction()
    ]);

    return (
        <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">
            <section className="space-y-6">
                <div className="flex flex-col gap-1">
                    <h2 className="text-4xl font-serif font-bold text-foreground">Paramètres du compte</h2>
                    <p className="text-muted-foreground">Gérez les informations de votre boutique et la sécurité de votre accès.</p>
                </div>
                
                <AccountSettingsForm 
                    vendor={vendor} 
                    initialMarkets={locations.markets} 
                    initialNeighborhoods={locations.neighborhoods} 
                />
            </section>
        </div>
    );
}
