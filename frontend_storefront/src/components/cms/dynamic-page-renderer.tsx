import React from 'react';
import { CmsSection } from '@/lib/vendure/cms-queries';
import { getSectionComponent } from './section-registry';

interface DynamicPageRendererProps {
    sections: CmsSection[];
    fallback?: React.ReactNode;
}

/**
 * Prend une liste de sections CMS et les convertit dynamiquement 
 * en composants React correspondants via le registre.
 */
export function DynamicPageRenderer({ sections, fallback }: DynamicPageRendererProps) {
    if (!sections || sections.length === 0) {
        return <>{fallback}</>;
    }

    // On ne garde que les sections actives et on les trie par 'order'
    // (normalement le backend le fait déjà, mais sécurité supplémentaire)
    const activeSections = [...sections]
        .filter(section => section.isActive)
        // Les sections pour popup ne sont pas affichées de manière linéaire
        .filter(section => section.type !== 'POPUP')
        .sort((a, b) => a.order - b.order);

    if (activeSections.length === 0) {
        return <>{fallback}</>;
    }

    return (
        <div className="flex flex-col w-full">
            {activeSections.map((section) => {
                const Component = getSectionComponent(section.type);

                if (!Component) {
                    console.warn(`Aucun composant React trouvé pour le type de section CMS: '${section.type}'`);
                    return null;
                }

                // On injecte les données extraites du JSON backend dans les props du composant
                return (
                    <Component
                        key={section.id}
                        {...(section.data || {})}
                    />
                );
            })}
        </div>
    );
}
