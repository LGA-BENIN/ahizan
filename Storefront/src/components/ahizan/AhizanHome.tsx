"use client";

import { useState, useEffect } from "react";
import { HeroSection } from "./HeroSection";
import { HomeModal } from "./HomeModal";
import { BodySectionRenderer } from "./BodySectionRenderer";
import { SectionCodeWrapper } from "./SectionCodeWrapper";
import { CmsSection } from "@/lib/vendure/cms-queries";
import { getShopApiUrl } from "@/lib/vendure/api-utils";
import { LocalPersonalizedProducts } from "../cms/LocalPersonalizedProducts";

export function AhizanHome({ sections }: { sections: CmsSection[] }) {
    const [siteCategories, setSiteCategories] = useState<any[]>([]);

    useEffect(() => {
        const fetchCategories = async () => {
            const gqlQuery = `
                query GetCmsCollectionsTree {
                    cmsCollectionsTree {
                        id
                        name
                        slug
                        featuredAsset { id source }
                        children { id name slug featuredAsset { id source } }
                    }
                }
            `;
            try {
                const shopApiUrl = getShopApiUrl();
                const res = await fetch(shopApiUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ query: gqlQuery })
                });

                const contentType = res.headers.get("content-type");
                if (!contentType || !contentType.includes("application/json")) {
                    console.error('API returned non-JSON response:', contentType);
                    return;
                }

                const data = await res.json();
                const tree = data.data?.cmsCollectionsTree || [];

                if (tree && Array.isArray(tree)) {
                    // Keep tree structure so Hero sidebar can show sub-collections on hover
                    setSiteCategories(tree.map((coll: any) => ({
                        id: coll.id,
                        name: coll.name,
                        slug: coll.slug,
                        icon: coll.featuredAsset?.source || null,
                        children: (coll.children || []).map((ch: any) => ({
                            id: ch.id,
                            name: ch.name,
                            slug: ch.slug,
                            icon: ch.featuredAsset?.source || null,
                        }))
                    })));
                }
            } catch (err) {
                console.error('Error fetching categories:', err);
            }
        };
        fetchCategories();
    }, []);

    // Filter and sort active sections for rendering
    const activeSections = sections
        .filter(s => s.isActive)
        .filter(s => {
            // Skip orphan/placeholder CUSTOM sections (e.g. "Hello Ahizan" card)
            if (s.type === 'CUSTOM') {
                const html = (s.data?.htmlContent || s.data?.customHtml || s.data?.html || '').toLowerCase();
                if (html.includes('hello ahizan') || html.trim() === '') return false;
            }

            // Safely remove the "Acheter par catégorie" section as requested
            if (s.type === 'CATEGORIES' && s.data?.title === 'Acheter par catégorie') {
                return false;
            }
            
            return true;
        })
        .sort((a, b) => (a.order || 0) - (b.order || 0));

    // Ensure sections render strictly by the backend order
    const orderedSections = activeSections;

    // Common promo config used as fallback for some components (e.g. Hero's category sidebar)
    // Merge QUICK_LINKS data with CATEGORIES data (for collectionMedia images and heroIcons)
    const quickLinksData = sections.find(s => s.type === 'QUICK_LINKS')?.data || {};
    const categoriesData = sections.find(s => s.type === 'CATEGORIES')?.data || {};
    const globalPromoConfig = {
        ...categoriesData,
        ...quickLinksData,
        // Merge collectionMedia from both, categories takes precedence for images
        collectionMedia: { ...(categoriesData.collectionMedia || {}), ...(quickLinksData.collectionMedia || {}) },
        // heroIcons come from CATEGORIES section
        heroIcons: { ...(categoriesData.heroIcons || {}) },
    };

    return (
        <div className="pb-10">
            {orderedSections.map((section, index) => {
                const config = section.data || {};

                // HERO has special props (promoConfig + siteCategories)
                if (section.type === 'HERO') {
                    const hasLocalProductsSection = sections.some(s => s.type === 'LOCAL_PRODUCTS' && s.isActive);
                    return (
                        <SectionCodeWrapper key={section.id || index} config={config} sectionId={section.id}>
                            <div className="max-w-[1440px] mx-auto w-full px-3 sm:px-4 md:px-8 lg:px-12 pt-2 md:pt-4">
                                <HeroSection
                                    heroConfig={config}
                                    promoConfig={globalPromoConfig}
                                    siteCategories={siteCategories}
                                />
                            </div>
                            {!hasLocalProductsSection && <LocalPersonalizedProducts />}
                        </SectionCodeWrapper>
                    );
                }

                // All body/content sections go through the strict renderer (returns null when empty)
                return (
                    <SectionCodeWrapper key={section.id || index} config={config} sectionId={section.id}>
                        <BodySectionRenderer
                            section={section}
                            siteCategories={siteCategories}
                            globalPromoConfig={globalPromoConfig}
                            allSections={orderedSections}
                        />
                    </SectionCodeWrapper>
                );
            })}

            {/* Render active modals that may not be in the main visible section list */}
            {sections
                .filter(s => s.type === 'MODALS' && s.isActive && !orderedSections.includes(s))
                .map((s, idx) => (
                    <HomeModal key={`extra-modal-${idx}`} config={s.data} />
                ))}
        </div>
    );
}
