"use client";

import { useState, useEffect } from "react";
import { HeroSection } from "./HeroSection";
import { HomeModal } from "./HomeModal";
import { BodySectionRenderer } from "./BodySectionRenderer";
import { SectionCodeWrapper } from "./SectionCodeWrapper";
import { CmsSection } from "@/lib/vendure/cms-queries";

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
                        featuredAsset { id preview }
                        children { id name slug featuredAsset { id preview } }
                    }
                }
            `;
            try {
                const shopApiUrl = process.env.NEXT_PUBLIC_VENDURE_SHOP_API_URL || 'http://127.0.0.1:3000/shop-api';
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
                        icon: coll.featuredAsset?.preview || null,
                        children: (coll.children || []).map((ch: any) => ({
                            id: ch.id,
                            name: ch.name,
                            slug: ch.slug,
                            icon: ch.featuredAsset?.preview || null,
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
            return true;
        })
        .sort((a, b) => (a.order || 0) - (b.order || 0));

    // Fixed render order: HERO → CATEGORIES/CATEGORY_GRID → everything else (prevents CATEGORIES drifting to middle)
    const heroSections = activeSections.filter(s => s.type === 'HERO');
    const categorySections = activeSections.filter(s => s.type === 'CATEGORIES' || s.type === 'CATEGORY_GRID');
    const otherSections = activeSections.filter(s => s.type !== 'HERO' && s.type !== 'CATEGORIES' && s.type !== 'CATEGORY_GRID');
    const orderedSections = [...heroSections, ...categorySections, ...otherSections];

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
                    return (
                        <SectionCodeWrapper key={section.id || index} config={config} sectionId={section.id}>
                            <div className="max-w-[1440px] mx-auto w-full px-3 sm:px-4 md:px-8 lg:px-12 pt-2 md:pt-4">
                                <HeroSection
                                    heroConfig={config}
                                    promoConfig={globalPromoConfig}
                                    siteCategories={siteCategories}
                                />
                            </div>
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
