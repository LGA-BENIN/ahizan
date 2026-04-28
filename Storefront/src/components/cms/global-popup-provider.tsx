import { PopupManager as ClientPopupManager, ModalConfig } from './popup-manager';
import { getBannerApiUrl } from '@/lib/vendure/api-utils';

/**
 * Server Component that fetches popups from the Banner Manager and passes them to the Client Component.
 * This aligns with the "Builder" section in the backend.
 */
export async function GlobalPopupProvider() {
    try {
        // Fetch our General Config which contains the modals
        const res = await fetch(getBannerApiUrl('general-config'), { 
            cache: 'no-store' 
        });
        
        if (!res.ok) {
            console.warn(`[GlobalPopupProvider] Failed to fetch general-config: ${res.status}`);
            return null;
        }

        const generalConfig = await res.json();
        
        // Extract modals array
        const modals: ModalConfig[] = generalConfig.modals || [];
        
        // Filter to only include enabled modals
        const activePopups = modals.filter(m => m.enabled && m.value);

        if (activePopups.length === 0) {
            // Check for legacy single modal if no multi-modals
            if (generalConfig.modal?.enabled && generalConfig.modal?.value) {
                return <ClientPopupManager popups={[generalConfig.modal]} />;
            }
            return null;
        }

        return <ClientPopupManager popups={activePopups} />;
    } catch (e) {
        console.error("Failed to load global popups from banner-manager:", e);
        return null;
    }
}
