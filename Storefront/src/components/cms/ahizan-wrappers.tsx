"use client";

import React, { useEffect, useState } from "react";
import { HeroSection } from "@/components/ahizan/HeroSection";
import { QuickLinks } from "@/components/ahizan/QuickLinks";
import { FlashSaleSection } from "@/components/ahizan/FlashSaleSection";
import { getShopApiUrl } from "@/lib/vendure/api-utils";

// Cache categories globally so all wrappers share it instead of fetching multiple times
let cachedCategories: any[] | null = null;

function useAhizanCategories() {
    const [categories, setCategories] = useState<any[]>(cachedCategories || []);

    useEffect(() => {
        if (cachedCategories) return;

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

        fetch(getShopApiUrl(), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query: gqlQuery })
        })
        .then(res => res.json())
        .then(data => {
            const tree = data.data?.cmsCollectionsTree || [];
            if (tree.length > 0) {
                // Flatten tree for UI
                const flat: any[] = [];
                const flatten = (nodes: any[]) => {
                    for (const node of nodes) {
                        flat.push(node);
                        if (node.children && node.children.length > 0) {
                            flatten(node.children);
                        }
                    }
                };
                flatten(tree);
                
                const cats = flat.map((coll: any) => ({
                    id: coll.id,
                    name: coll.name,
                    slug: coll.slug
                }));
                cachedCategories = cats;
                setCategories(cats);
            }
        })
        .catch(err => console.error('Error fetching Ahizan categories:', err));
    }, []);

    return categories;
}

// 1. HERO WRAPPER
// Map CMS HERO data seamlessly to Ahizan HeroSection
export function AhizanHeroWrapper(props: any) {
    const categories = useAhizanCategories();
    // The CMS saves HERO config directly at the root of `data`. 
    // Ahizan Hero expects `heroConfig` and `promoConfig`.
    // It uses promoConfig.collectionMedia for category icons.
    return (
        <div className="pt-2 md:pt-4">
            <HeroSection 
                heroConfig={props} 
                promoConfig={props} 
                siteCategories={categories} 
            />
        </div>
    );
}

// 2. QUICKLINKS WRAPPER
// Ahizan QuickLinks expects `promoConfig`.
export function AhizanQuickLinksWrapper(props: any) {
    return (
        <div className="mt-1 md:mt-2">
            <QuickLinks 
                promoConfig={props} 
            />
        </div>
    );
}

// 3. FLASH SALE WRAPPER
// Ahizan FlashSaleSection expects `config` as a single active flash instance.
// The CMS saves an array under `flashVersions`, or directly if it's a single instance.
export function AhizanFlashSaleWrapper(props: any) {
    let activeFlash = props;
    if (props.flashVersions && Array.isArray(props.flashVersions)) {
        activeFlash = props.flashVersions.find((v: any) => v.isActive) || props.flashVersions[0];
    }
    
    if (!activeFlash) return null;

    return (
        <div className="px-2 md:px-6">
            <FlashSaleSection config={activeFlash} />
        </div>
    );
}
