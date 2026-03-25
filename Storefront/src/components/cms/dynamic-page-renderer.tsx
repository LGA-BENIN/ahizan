import React from 'react';
import { CmsSection } from '@/lib/vendure/cms-queries';
import { getSectionComponent } from './section-registry';

interface DynamicPageRendererProps {
    sections: CmsSection[];
    fallback?: React.ReactNode;
}

const EXCLUDED_TYPES = ['POPUP', 'THEME_SETTINGS', 'TOP_BAR', 'HEADER_CONF', 'FOOTER_CONF'];

function isSectionScheduledNow(section: any): boolean {
    const now = Date.now();
    if (section.scheduledStart) {
        const start = new Date(section.scheduledStart).getTime();
        if (now < start) return false;
    }
    if (section.scheduledEnd) {
        const end = new Date(section.scheduledEnd).getTime();
        if (now > end) return false;
    }
    return true;
}

/**
 * Prend une liste de sections CMS et les convertit dynamiquement
 * en composants React correspondants via le registre.
 * Filtre par isActive, scheduling (scheduledStart/End), et exclut les sections globales.
 */
export function DynamicPageRenderer({ sections, fallback }: DynamicPageRendererProps) {
    if (!sections || sections.length === 0) {
        return <>{fallback}</>;
    }

    const activeSections = [...sections]
        .filter(section => section.isActive)
        .filter(section => !EXCLUDED_TYPES.includes(section.type))
        .filter(isSectionScheduledNow)
        .sort((a, b) => a.order - b.order);

    if (activeSections.length === 0) {
        return <>{fallback}</>;
    }

    return (
        <div className="flex flex-col w-full">
            {activeSections.map((section) => {
                const Component = getSectionComponent(section.type);

                if (!Component) {
                    console.warn(`[CMS] Aucun composant pour le type: '${section.type}'`);
                    return null;
                }

                return (
                    <Component
                        key={section.id}
                        title={section.title}
                        description={section.description}
                        layout={section.layout}
                        {...(section.data || {})}
                    />
                );
            })}
        </div>
    );
}
