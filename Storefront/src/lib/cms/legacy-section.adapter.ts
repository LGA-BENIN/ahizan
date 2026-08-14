import { CmsSection } from '@/lib/vendure/cms-queries';

/**
 * Adaptateur de Rétrocompatibilité Totale (LegacySectionAdapter).
 * Traduit à la volée les anciennes sections du CMS vers le format unifié déclaratif EMS
 * (PRODUCT_COLLECTION et CATEGORY_COLLECTION) afin d'assurer zéro rupture de service.
 */
export function adaptLegacySection(section: CmsSection): CmsSection {
    if (!section || !section.type) return section;

    const data = section.data || {};
    const rawType = String(section.type).toUpperCase().trim();

    // Map section type aliases for builder, html, rich text, and flash deals
    let type = rawType;

    if (['CUSTOM', 'CUSTOM_HTML', 'HTML', 'HTML_CODE', 'CODE', 'CUSTOM_CODE', 'MARKET_CODE', 'NEIGHBORHOOD_CODE', 'CUSTOM_SECTION', 'CUSTOM_CONTENT'].includes(rawType)) {
        type = 'CUSTOM_HTML';
    } else if (['RICH_TEXT', 'TIPTAP', 'TIPTAP_EDITOR', 'TEXT', 'DOCUMENT'].includes(rawType)) {
        type = 'RICH_TEXT';
    } else if (['SMART_VISUAL_GRID', 'SMART_GRID', 'GRID_BUILDER', 'CRAFT_GRID'].includes(rawType)) {
        type = 'SMART_VISUAL_GRID';
    } else if (['FREEFORM_BUILDER', 'FREEFORM', 'CRAFT', 'CRAFT_BUILDER', 'BUILDER', 'CANVAS', 'DRAG_AND_DROP'].includes(rawType)) {
        type = 'FREEFORM_BUILDER';
    } else if (['FLASH_DEALS', 'FLASH_SALE', 'FLASH_SALE_SECTION', 'FLASH_CAMPAIGN'].includes(rawType)) {
        type = 'FLASH_DEALS';
    }

    switch (type) {
        case 'FLASH_SALE':
        case 'FLASH_DEALS': {
            // Extraction de la version de vente flash active
            let activeVersion: any = null;
            if (data.flashVersions && Array.isArray(data.flashVersions)) {
                activeVersion = data.flashVersions.find((v: any) => v.isActive) || data.flashVersions[0];
            } else {
                activeVersion = data;
            }

            return {
                ...section,
                type: 'FLASH_DEALS',
                data: {
                    ...data,
                    ...(activeVersion || {}),
                    experienceStrategy: 'FLASH_SALE',
                    title: activeVersion?.title || data.title || section.title || 'Ventes Flash',
                    subtitle: activeVersion?.subtitle || data.subtitle || section.description || 'Offres limitées dans le temps',
                    isUnlimited: activeVersion?.isUnlimited ?? data.isUnlimited ?? false,
                    endTime: activeVersion?.endTime || activeVersion?.countdownEnd || data.endTime || data.countdownEnd,
                    countdownEnd: activeVersion?.endTime || activeVersion?.countdownEnd || data.endTime || data.countdownEnd,
                    manualProductIds: activeVersion?.manualProductIds || data.manualProductIds || [],
                    selectionType: activeVersion?.selectionType || data.selectionType || 'FILTER',
                    filterCriteria: activeVersion?.filterCriteria || data.filterCriteria || { collectionIds: [], take: 12 },
                    bgColor: activeVersion?.bgColor || data.bgColor,
                    accentColor: activeVersion?.accentColor || data.accentColor,
                    textColor: activeVersion?.textColor || data.textColor,
                    badgeBgColor: activeVersion?.badgeBgColor || data.badgeBgColor,
                    badgeText: activeVersion?.badgeText || data.badgeText,
                    icon: activeVersion?.icon || data.icon,
                    discountPercentage: activeVersion?.discountPercentage ?? data.discountPercentage,
                    applyFakePromotion: activeVersion?.applyFakePromotion ?? data.applyFakePromotion,
                    headerStyle: activeVersion?.headerStyle || data.headerStyle,
                    layout: data.layout || 'carousel',
                    columns: data.columns || 5,
                    cardStyle: data.cardStyle || 'standard'
                }
            };
        }

        case 'LOCAL_PRODUCTS': {
            return {
                ...section,
                type: 'PRODUCT_COLLECTION',
                data: {
                    ...data,
                    experienceStrategy: 'LOCAL_DISCOVERY',
                    title: data.title || section.title || 'Produits près de chez vous',
                    subtitle: data.subtitle || section.description || 'Découvrez les offres des vendeurs de votre quartier',
                    layout: data.layout || 'carousel',
                    columns: data.columns || 4,
                    cardStyle: data.cardStyle || 'standard'
                }
            };
        }

        case 'PRODUCT_GRID':
        case 'TABBED_PRODUCT_GRID':
        case 'DYNAMIC_PRODUCT_GRID': {
            return {
                ...section,
                type: 'PRODUCT_COLLECTION',
                data: {
                    ...data,
                    experienceStrategy: data.experienceStrategy || 'CATALOG',
                    title: data.title || section.title || 'Sélection de produits',
                    subtitle: data.subtitle || section.description,
                    layout: data.layout || 'carousel',
                    columns: data.columns || 4,
                    cardStyle: data.cardStyle || 'standard',
                    tabs: data.tabs || (data.collectionSlug ? [{
                        id: 'tab-default',
                        label: data.title || 'Produits',
                        filterType: data.filterType || 'LATEST',
                        collectionSlug: data.collectionSlug,
                        take: data.take || 8
                    }] : [])
                }
            };
        }

        case 'CATEGORIES':
        case 'CATEGORY_GRID': {
            return {
                ...section,
                type: 'CATEGORY_COLLECTION',
                data: {
                    ...data,
                    title: data.title || section.title || 'Acheter par catégorie',
                    subtitle: data.subtitle || section.description,
                    layout: data.layout || 'carousel',
                    columnsDesktop: data.columnsDesktop || data.columns || 6,
                    columnsMobile: data.columnsMobile || 2,
                    limit: data.limit || data.take || 12,
                    cardStyle: data.cardStyle || 'standard',
                    imageShape: data.imageShape || 'rounded'
                }
            };
        }

        default:
            return section;
    }
}
