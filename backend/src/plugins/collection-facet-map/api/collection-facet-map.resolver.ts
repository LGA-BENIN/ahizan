import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { Ctx, RequestContext, TransactionalConnection, Collection, Facet, Permission, Allow, ID, TranslatorService } from '@vendure/core';
import * as fs from 'fs';
import * as path from 'path';

const CONFIG_FILE = path.join(process.cwd(), 'static', 'seller-dashboard-config.json');

function readSellerConfig(): { walletPageEnabled: boolean } {
    try {
        if (fs.existsSync(CONFIG_FILE)) {
            return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8'));
        }
    } catch { /* ignore */ }
    return { walletPageEnabled: true };
}

function writeSellerConfig(config: { walletPageEnabled: boolean }) {
    const dir = path.dirname(CONFIG_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf-8');
}

@Resolver()
export class CollectionFacetMapAdminResolver {
    constructor(
        private connection: TransactionalConnection,
        private translator: TranslatorService,
    ) {}

    /**
     * Fetch all facets and ensure their (and their values') translatable
     * `name` fields are populated for the current request language.
     * Returns plain objects with guaranteed non-null names to satisfy the
     * non-nullable GraphQL Facet.name / FacetValue.name fields.
     */
    private async getTranslatedFacets(ctx: RequestContext): Promise<any[]> {
        const facetRepo = this.connection.getRepository(ctx, Facet);
        const allFacets = await facetRepo.find({
            relations: ['values', 'values.translations', 'translations'],
        });

        return allFacets.map((facet: any) => {
            const translatedFacet: any = this.translator.translate(facet, ctx, ['values']);
            const facetName =
                translatedFacet.name ||
                facet.translations?.[0]?.name ||
                facet.code ||
                `facet-${facet.id}`;
            const values = (translatedFacet.values || []).map((v: any) => {
                const valueName =
                    v.name ||
                    v.translations?.[0]?.name ||
                    v.code ||
                    `value-${v.id}`;
                return { ...v, id: v.id, name: valueName, code: v.code };
            });
            return { ...translatedFacet, id: facet.id, name: facetName, code: facet.code, values };
        });
    }

    /**
     * Get all facets with guaranteed non-null names (admin only).
     * Replaces the native `facets` query in the dashboard, which fails when
     * any FacetValue has a null/missing translation.
     */
    @Query()
    @Allow(Permission.SuperAdmin)
    async allMappingFacets(@Ctx() ctx: RequestContext): Promise<any[]> {
        return this.getTranslatedFacets(ctx);
    }

    /**
     * Get all collection→facet mappings (admin only)
     */
    @Query()
    @Allow(Permission.SuperAdmin)
    async collectionFacetMappings(@Ctx() ctx: RequestContext): Promise<any[]> {
        const collectionRepo = this.connection.getRepository(ctx, Collection);

        const collections = await collectionRepo.find({
            relations: ['translations', 'parent'],
        });

        const allFacets = await this.getTranslatedFacets(ctx);

        const getName = (coll: any): string => {
            if (coll.name) return coll.name;
            const trans = coll.translations || [];
            const frTrans = trans.find((t: any) => t.languageCode === 'fr') || trans[0];
            return frTrans?.name || coll.slug || '';
        };

        // Build a map for quick parent lookup
        const collMap = new Map<string, any>();
        for (const c of collections) {
            collMap.set(String(c.id), c);
        }

        // Resolve inherited facet IDs by walking up the parent chain
        const resolveInheritedFacetIds = (coll: any): string[] => {
            try {
                const ownIds: string[] = (coll as any).customFields?.allowedFacetIds || [];
                const parentColl = coll.parent;
                if (parentColl && parentColl.id) {
                    const parentFull = collMap.get(String(parentColl.id));
                    if (parentFull) {
                        const parentIds = resolveInheritedFacetIds(parentFull);
                        // Merge: own IDs + inherited IDs (deduplicated)
                        const combined = [...new Set([...parentIds, ...ownIds])];
                        return combined;
                    }
                }
                return ownIds;
            } catch (error: any) {
                // If there's any error parsing customFields, return empty array
                console.warn(`Error resolving facet IDs for collection ${coll.id}:`, error.message);
                return [];
            }
        };

        // Filter out root collections - but keep all others
        const filtered = collections.filter((c: any) => {
            const name = getName(c);
            return name && name !== '__root_collection__' && !name.startsWith('_root_');
        });

        // Set of valid (non-root) collection ids for parent resolution
        const filteredIds = new Set(filtered.map((c: any) => String(c.id)));

        // Resolve the effective parent id: collections whose parent is the
        // Vendure root (filtered out) or null are treated as top-level (null).
        const getEffectiveParentId = (c: any): string | null => {
            if (c.parent && filteredIds.has(String(c.parent.id))) {
                return String(c.parent.id);
            }
            return null;
        };

        // Build hierarchical tree structure
        const buildTree = (parentId: string | null = null): any[] => {
            return filtered
                .filter((c: any) => getEffectiveParentId(c) === parentId)
                .map((coll: any) => {
                    let ownFacetIds: string[] = [];
                    try {
                        ownFacetIds = (coll as any).customFields?.allowedFacetIds || [];
                    } catch (e) {
                        ownFacetIds = [];
                    }
                    
                    const inheritedFacetIds = resolveInheritedFacetIds(coll);
                    const allowedFacets = allFacets.filter((f: any) => inheritedFacetIds.includes(String(f.id)));
                    
                    return {
                        collectionId: String(coll.id),
                        collectionName: getName(coll),
                        allowedFacetIds: inheritedFacetIds,
                        ownFacetIds,
                        inheritedFacetIds: inheritedFacetIds.filter(id => !ownFacetIds.includes(id)),
                        allowedFacets,
                        children: buildTree(String(coll.id)),
                        hasChildren: filtered.some((c: any) => getEffectiveParentId(c) === String(coll.id)),
                    };
                });
        };

        return buildTree();
    }

    /**
     * Get allowed facets for a specific collection (admin-api)
     */
    @Query()
    @Allow(Permission.SuperAdmin)
    async collectionAllowedFacets(
        @Ctx() ctx: RequestContext,
        @Args() args: { collectionId: ID },
    ): Promise<any | null> {
        return this.getCollectionAllowedFacets(ctx, String(args.collectionId));
    }

    /**
     * Set allowed facets for a collection (admin only)
     */
    @Mutation()
    @Allow(Permission.SuperAdmin)
    async setCollectionAllowedFacets(
        @Ctx() ctx: RequestContext,
        @Args() args: { collectionId: ID; facetIds: [ID] },
    ): Promise<any> {
        const collectionId = String(args.collectionId);
        const facetIds = args.facetIds.map(String);
        const collectionRepo = this.connection.getRepository(ctx, Collection);

        // Use repo.update() with customFields — same pattern as multivendor plugin
        await collectionRepo.update(collectionId as any, {
            customFields: {
                allowedFacetIds: facetIds,
            },
        } as any);

        // Return updated mapping
        return this.getCollectionAllowedFacets(ctx, collectionId);
    }

    /**
     * Set allowed facets for multiple collections (bulk operation)
     */
    @Mutation()
    @Allow(Permission.SuperAdmin)
    async setCollectionAllowedFacetsBulk(
        @Ctx() ctx: RequestContext,
        @Args() args: { collectionIds: [ID]; facetIds: [ID] },
    ): Promise<any[]> {
        const collectionIds = args.collectionIds.map(String);
        const facetIds = args.facetIds.map(String);
        const collectionRepo = this.connection.getRepository(ctx, Collection);

        // Update all specified collections
        for (const collectionId of collectionIds) {
            await collectionRepo.update(collectionId as any, {
                customFields: {
                    allowedFacetIds: facetIds,
                },
            } as any);
        }

        // Return updated mappings for all affected collections
        const results = [];
        for (const collectionId of collectionIds) {
            const result = await this.getCollectionAllowedFacets(ctx, collectionId);
            if (result) results.push(result);
        }
        return results;
    }

    private async getCollectionAllowedFacets(ctx: RequestContext, collectionId: string): Promise<any | null> {
        const collectionRepo = this.connection.getRepository(ctx, Collection);

        const coll = await collectionRepo.findOne({
            where: { id: collectionId as any },
            relations: ['translations', 'parent'],
        });

        if (!coll) return null;

        // Walk up parent chain to collect inherited facets
        const allCollections = await collectionRepo.find({
            relations: ['translations', 'parent'],
        });
        const collMap = new Map<string, any>();
        for (const c of allCollections) {
            collMap.set(String(c.id), c);
        }

        const resolveInheritedFacetIds = (c: any): string[] => {
            const ownIds: string[] = (c as any).customFields?.allowedFacetIds || [];
            const parentColl = c.parent;
            if (parentColl && parentColl.id) {
                const parentFull = collMap.get(String(parentColl.id));
                if (parentFull) {
                    const parentIds = resolveInheritedFacetIds(parentFull);
                    return [...new Set([...parentIds, ...ownIds])];
                }
            }
            return ownIds;
        };

        const ownFacetIds: string[] = (coll as any).customFields?.allowedFacetIds || [];
        const inheritedFacetIds = resolveInheritedFacetIds(coll);

        const allFacets = await this.getTranslatedFacets(ctx);

        const allowedFacets = allFacets.filter((f: any) => inheritedFacetIds.includes(String(f.id)));

        const getName = (c: any): string => {
            if (c.name) return c.name;
            const trans = c.translations || [];
            const frTrans = trans.find((t: any) => t.languageCode === 'fr') || trans[0];
            return frTrans?.name || c.slug || '';
        };

        // Get children for this collection
        const children = allCollections.filter((c: any) => {
            const collParentId = c.parent ? String(c.parent.id) : null;
            return collParentId === String(coll.id);
        }).map((child: any) => {
            const childOwnIds: string[] = (child as any).customFields?.allowedFacetIds || [];
            const childInheritedIds = resolveInheritedFacetIds(child);
            return {
                collectionId: String(child.id),
                collectionName: getName(child),
                allowedFacetIds: childInheritedIds,
                ownFacetIds: childOwnIds,
                inheritedFacetIds: childInheritedIds.filter(id => !childOwnIds.includes(id)),
            };
        });

        return {
            collectionId: String(coll.id),
            collectionName: getName(coll),
            allowedFacetIds: inheritedFacetIds,
            ownFacetIds,
            inheritedFacetIds: inheritedFacetIds.filter(id => !ownFacetIds.includes(id)),
            allowedFacets,
            children,
            hasChildren: children.length > 0,
        };
    }

    /**
     * Get seller dashboard config (admin-api)
     */
    @Query()
    @Allow(Permission.SuperAdmin)
    async sellerDashboardConfig(): Promise<{ walletPageEnabled: boolean }> {
        return readSellerConfig();
    }

    /**
     * Update seller dashboard config (admin only)
     */
    @Mutation()
    @Allow(Permission.SuperAdmin)
    async updateSellerDashboardConfig(
        @Args() args: { walletPageEnabled: boolean },
    ): Promise<{ walletPageEnabled: boolean }> {
        const config = readSellerConfig();
        config.walletPageEnabled = args.walletPageEnabled;
        writeSellerConfig(config);
        return config;
    }
}
