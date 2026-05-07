import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { Ctx, RequestContext, TransactionalConnection, Collection, Facet, Permission, Allow, ID } from '@vendure/core';
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
    constructor(private connection: TransactionalConnection) {}

    /**
     * Get all collection→facet mappings (admin only)
     */
    @Query()
    @Allow(Permission.SuperAdmin)
    async collectionFacetMappings(@Ctx() ctx: RequestContext): Promise<any[]> {
        const collectionRepo = this.connection.getRepository(ctx, Collection);
        const facetRepo = this.connection.getRepository(ctx, Facet);

        const collections = await collectionRepo.find({
            relations: ['translations', 'parent'],
        });

        const allFacets = await facetRepo.find({
            relations: ['values', 'translations'],
        });

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
        };

        // Filter out root collections
        const filtered = collections.filter((c: any) => {
            const name = getName(c);
            return name && !name.startsWith('_root_') && name !== '__root_collection__';
        });

        return filtered.map((coll: any) => {
            const ownFacetIds: string[] = (coll as any).customFields?.allowedFacetIds || [];
            const inheritedFacetIds = resolveInheritedFacetIds(coll);
            const allowedFacets = allFacets.filter((f: any) => inheritedFacetIds.includes(String(f.id)));
            return {
                collectionId: String(coll.id),
                collectionName: getName(coll),
                allowedFacetIds: inheritedFacetIds,
                ownFacetIds,
                inheritedFacetIds: inheritedFacetIds.filter(id => !ownFacetIds.includes(id)),
                allowedFacets,
            };
        });
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

    private async getCollectionAllowedFacets(ctx: RequestContext, collectionId: string): Promise<any | null> {
        const collectionRepo = this.connection.getRepository(ctx, Collection);
        const facetRepo = this.connection.getRepository(ctx, Facet);

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

        const allFacets = await facetRepo.find({
            relations: ['values', 'translations'],
        });
        const allowedFacets = allFacets.filter((f: any) => inheritedFacetIds.includes(String(f.id)));

        const getName = (c: any): string => {
            if (c.name) return c.name;
            const trans = c.translations || [];
            const frTrans = trans.find((t: any) => t.languageCode === 'fr') || trans[0];
            return frTrans?.name || c.slug || '';
        };

        return {
            collectionId: String(coll.id),
            collectionName: getName(coll),
            allowedFacetIds: inheritedFacetIds,
            ownFacetIds,
            inheritedFacetIds: inheritedFacetIds.filter(id => !ownFacetIds.includes(id)),
            allowedFacets,
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
