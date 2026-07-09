import { Args, Query, Resolver } from '@nestjs/graphql';
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

@Resolver()
export class CollectionFacetMapShopResolver {
    constructor(
        private connection: TransactionalConnection,
        private translator: TranslatorService,
    ) {}

    /**
     * Fetch all facets with their translatable `name` fields populated for the
     * current request language. Returns plain objects with guaranteed non-null
     * names to satisfy the non-nullable GraphQL Facet.name / FacetValue.name fields.
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

        const coll = await collectionRepo.findOne({
            where: { id: args.collectionId as any },
            relations: ['translations', 'parent'],
        });

        if (!coll) return null;
        console.log('[ShopResolver] coll.id:', coll.id, 'customFields:', (coll as any).customFields);

        // Walk up parent chain to collect inherited facets
        const allCollections = await collectionRepo.find({
            relations: ['translations', 'parent'],
        });
        const collMap = new Map<string, any>();
        for (const c of allCollections) {
            collMap.set(String(c.id), c);
        }

        const resolveInheritedFacetIds = (c: any, visited = new Set<string>()): string[] => {
            if (!c || visited.has(String(c.id))) {
                return [];
            }
            visited.add(String(c.id));
            const ownIds: string[] = (c as any).customFields?.allowedFacetIds || [];
            const parentColl = c.parent;
            if (parentColl && parentColl.id) {
                const parentFull = collMap.get(String(parentColl.id));
                if (parentFull) {
                    const parentIds = resolveInheritedFacetIds(parentFull, visited);
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
