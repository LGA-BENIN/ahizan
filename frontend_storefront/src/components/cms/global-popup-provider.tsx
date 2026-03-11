import { getPageContent, PopupData } from '@/lib/vendure/cms-queries';
import { PopupManager as ClientPopupManager } from './popup-manager';

/**
 * Server Component that fetches popups from the CMS and passes them to the Client Component.
 * The CMS page slug 'popups' is reserved for managing active system popups.
 */
export async function GlobalPopupProvider() {
    try {
        const popupPage = await getPageContent('popups');

        if (!popupPage || !popupPage.sections || popupPage.sections.length === 0) {
            return null;
        }

        // Filter sections to only include active POPUP types and extract their data
        const activePopups: PopupData[] = (popupPage.sections || [])
            .filter(section => section.isActive && section.type === 'POPUP' && section.data)
            .map(section => section.data as PopupData);

        if (activePopups.length === 0) {
            return null;
        }

        return <ClientPopupManager popups={activePopups} />;
    } catch (e) {
        console.error("Failed to load global popups:", e);
        return null;
    }
}
