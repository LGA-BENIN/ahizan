import { Args, Query, Resolver } from '@nestjs/graphql';
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

@Resolver()
export class CollectionFacetMapShopResolver {
    constructor(private connection: TransactionalConnection) {}

    /**
     * Get allowed facets for a specific collection (public)
     * Includes inherited facets from parent collections
     */
    @Query()
    @Allow(Permission.Public)
    async collectionAllowedFacets(
        @Ctx() ctx: RequestContext,
        @Args() args: { collectionId: ID },
    ): Promise<any | null> {
        const collectionRepo = this.connection.getRepository(ctx, Collection);
        const facetRepo = this.connection.getRepository(ctx, Facet);

        const coll = await collectionRepo.findOne({
            where: { id: args.collectionId as any },
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
     * Get seller dashboard config (public, for seller frontend)
     */
    @Query()
    @Allow(Permission.Public)
    async sellerDashboardConfig(): Promise<{ walletPageEnabled: boolean }> {
        return readSellerConfig();
    }
}
