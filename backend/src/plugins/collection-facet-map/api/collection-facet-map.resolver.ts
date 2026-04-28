import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { Ctx, RequestContext, TransactionalConnection, Collection, Facet, Permission, Allow, ID } from '@vendure/core';

@Resolver()
export class CollectionFacetMapResolver {
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
            relations: ['translations'],
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

        // Filter out root collections
        const filtered = collections.filter((c: any) => {
            const name = getName(c);
            return name && !name.startsWith('_root_') && name !== '__root_collection__';
        });

        return filtered.map((coll: any) => {
            const allowedFacetIds: string[] = (coll as any).customFields?.allowedFacetIds || [];
            const allowedFacets = allFacets.filter((f: any) => allowedFacetIds.includes(String(f.id)));
            return {
                collectionId: String(coll.id),
                collectionName: getName(coll),
                allowedFacetIds,
                allowedFacets,
            };
        });
    }

    /**
     * Get allowed facets for a specific collection (public on shop-api, admin on admin-api)
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
            relations: ['translations'],
        });

        if (!coll) return null;

        const allowedFacetIds: string[] = (coll as any).customFields?.allowedFacetIds || [];
        const allFacets = await facetRepo.find({
            relations: ['values', 'translations'],
        });
        const allowedFacets = allFacets.filter((f: any) => allowedFacetIds.includes(String(f.id)));

        const getName = (c: any): string => {
            if (c.name) return c.name;
            const trans = c.translations || [];
            const frTrans = trans.find((t: any) => t.languageCode === 'fr') || trans[0];
            return frTrans?.name || c.slug || '';
        };

        return {
            collectionId: String(coll.id),
            collectionName: getName(coll),
            allowedFacetIds,
            allowedFacets,
        };
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
        const collectionRepo = this.connection.getRepository(ctx, Collection);

        const coll = await collectionRepo.findOne({
            where: { id: args.collectionId as any },
            relations: ['translations'],
        });

        if (!coll) {
            throw new Error(`Collection with id ${args.collectionId} not found`);
        }

        // Update the custom field
        (coll as any).customFields = (coll as any).customFields || {};
        (coll as any).customFields.allowedFacetIds = args.facetIds;

        await collectionRepo.save(coll);

        // Return updated mapping
        return this.collectionAllowedFacets(ctx, { collectionId: args.collectionId });
    }
}
