import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { Ctx, RequestContext, Transaction, Allow, Permission, ID, PaginatedList, AssetService, Asset, ChannelService, User, Channel, CollectionService, Collection, TransactionalConnection } from '@vendure/core';
import { DeletionResponse } from '@vendure/common/lib/generated-types';
import { CMSService } from '../service/cms.service';
import { Page } from '../entities/page.entity';
import { PageSection } from '../entities/section.entity';
import { PagePreset } from '../entities/page-preset.entity';
import { SiteSeason } from '../entities/site-season.entity';

@Resolver()
export class CMSAdminResolver {
    constructor(
        private cmsService: CMSService,
        private assetService: AssetService,
        private channelService: ChannelService,
        private collectionService: CollectionService,
        private connection: TransactionalConnection,
    ) { }

    @Mutation()
    @Transaction()
    @Allow(Permission.Public)
    async createCmsAsset(@Ctx() ctx: RequestContext, @Args('file') file: any): Promise<Asset> {
        const channel = await this.channelService.getDefaultChannel();
        const superAdminCtx = new RequestContext({
            channel,
            apiType: 'admin',
            isAuthorized: true,
            authorizedAsOwnerOnly: false,
        });

        // Check if file is a GIF - if so, skip Sharp processing to preserve animation
        const isGif = file.mimetype === 'image/gif' || file.filename?.toLowerCase().endsWith('.gif');

        if (isGif) {
            // For GIFs, we need to save the file directly without processing
            // This is a workaround to preserve GIF animation
            const fs = require('fs');
            const path = require('path');
            const assetsDir = path.join(__dirname, '../../../static/assets');
            const uniqueName = `${Date.now()}-${file.filename}`;
            const filePath = path.join(assetsDir, uniqueName);

            // Ensure directory exists
            if (!fs.existsSync(assetsDir)) {
                fs.mkdirSync(assetsDir, { recursive: true });
            }

            // Write file directly
            const buffer = await file.buffer;
            fs.writeFileSync(filePath, buffer);

            // Create asset record manually
            const asset = new Asset();
            asset.name = file.filename;
            asset.type = 'IMAGE' as any;
            asset.mimeType = 'image/gif';
            asset.source = `/assets/${uniqueName}`;
            asset.preview = `/assets/${uniqueName}`;
            asset.fileSize = buffer.length;
            asset.width = 0; // Will be 0 for unprocessed GIFs
            asset.height = 0;
            asset.focalPoint = { x: 0.5, y: 0.5 };

            const savedAsset = await this.connection.getRepository(superAdminCtx, Asset).save(asset);
            return savedAsset;
        }

        const res = await this.assetService.create(superAdminCtx, { file });
        if ((res as any).errorCode) {
            throw new Error((res as any).message || 'Asset upload failed');
        }
        return res as Asset;
    }

    @Query()
    @Allow(Permission.Public)
    async pages(@Ctx() ctx: RequestContext, @Args() args: any): Promise<PaginatedList<Page>> {
        return this.cmsService.findAll(ctx, args.options);
    }

    @Query()
    @Allow(Permission.Public)
    async page(@Ctx() ctx: RequestContext, @Args() args: { id: ID }): Promise<Page | null> {
        return this.cmsService.findOne(ctx, args.id);
    }

    @Mutation()
    @Transaction()
    @Allow(Permission.Public)
    async createPage(@Ctx() ctx: RequestContext, @Args('input') input: any): Promise<Page> {
        return this.cmsService.createPage(ctx, input);
    }

    @Mutation()
    @Transaction()
    @Allow(Permission.Public)
    async updatePage(@Ctx() ctx: RequestContext, @Args('input') input: any): Promise<Page> {
        return this.cmsService.updatePage(ctx, input);
    }

    @Mutation()
    @Transaction()
    @Allow(Permission.Public)
    async deletePage(@Ctx() ctx: RequestContext, @Args() args: { id: ID }): Promise<DeletionResponse> {
        return this.cmsService.deletePage(ctx, args.id);
    }

    @Mutation()
    @Transaction()
    @Allow(Permission.Public)
    async createSection(@Ctx() ctx: RequestContext, @Args('input') input: any): Promise<PageSection> {
        return this.cmsService.createSection(ctx, input);
    }

    @Mutation()
    @Transaction()
    @Allow(Permission.Public)
    async updateSection(@Ctx() ctx: RequestContext, @Args('input') input: any): Promise<PageSection> {
        return this.cmsService.updateSection(ctx, input);
    }

    @Mutation()
    @Transaction()
    @Allow(Permission.Public)
    async deleteSection(@Ctx() ctx: RequestContext, @Args() args: { id: ID }): Promise<DeletionResponse> {
        return this.cmsService.deleteSection(ctx, args.id);
    }

    @Mutation()
    @Transaction()
    @Allow(Permission.Public)
    async initializeHomePage(@Ctx() ctx: RequestContext, @Args() args: { pageId: ID }): Promise<Page | null> {
        return this.cmsService.initializeHomePage(ctx, args.pageId);
    }

    @Query()
        async pagePresets(@Ctx() ctx: RequestContext): Promise<PagePreset[]> {
        return this.cmsService.findAllPresets(ctx);
    }

    @Mutation()
    @Transaction()
        async createPreset(@Ctx() ctx: RequestContext, @Args('input') input: any): Promise<PagePreset> {
        return this.cmsService.createPreset(ctx, input);
    }

    @Mutation()
    @Transaction()
        async updatePreset(@Ctx() ctx: RequestContext, @Args('input') input: any): Promise<PagePreset> {
        return this.cmsService.updatePreset(ctx, input);
    }

    @Mutation()
    @Transaction()
        async deletePreset(@Ctx() ctx: RequestContext, @Args() args: { id: ID }): Promise<DeletionResponse> {
        return this.cmsService.deletePreset(ctx, args.id);
    }

    @Mutation()
    @Transaction()
        async applyPreset(@Ctx() ctx: RequestContext, @Args() args: { presetId: ID, pageId: ID }): Promise<Page | null> {
        return this.cmsService.applyPreset(ctx, args.presetId, args.pageId);
    }

    @Mutation()
    @Transaction()
        async savePageAsPreset(@Ctx() ctx: RequestContext, @Args() args: { pageId: ID, name: string, description?: string }): Promise<PagePreset> {
        return this.cmsService.savePageAsPreset(ctx, args.pageId, args.name, args.description);
    }

    @Query()
        async previewPreset(@Ctx() ctx: RequestContext, @Args() args: { presetId: ID }): Promise<Page | null> {
        return this.cmsService.previewPreset(ctx, args.presetId);
    }

    @Query()
        async siteSeasons(@Ctx() ctx: RequestContext): Promise<SiteSeason[]> {
        return this.cmsService.findAllSeasons(ctx);
    }

    @Mutation()
    @Transaction()
        async createSeason(@Ctx() ctx: RequestContext, @Args('input') input: any): Promise<SiteSeason> {
        return this.cmsService.createSeason(ctx, input);
    }

    @Mutation()
    @Transaction()
        async updateSeason(@Ctx() ctx: RequestContext, @Args('input') input: any): Promise<SiteSeason> {
        return this.cmsService.updateSeason(ctx, input);
    }

    @Mutation()
    @Transaction()
        async deleteSeason(@Ctx() ctx: RequestContext, @Args() args: { id: ID }): Promise<DeletionResponse> {
        return this.cmsService.deleteSeason(ctx, args.id);
    }

    @Query()
    @Allow(Permission.Public)
    async cmsFacetValues(@Ctx() ctx: RequestContext): Promise<any[]> {
        const { FacetValue } = await import('@vendure/core');
        const connection = (this.cmsService as any).connection;
        const facets = await connection.getRepository(ctx, FacetValue).find({
            relations: ['facet']
        });
        
        // Translate and map to public JSON
        return facets.map((f: any) => ({
            id: f.id,
            name: f.name || f.code, // Fallback to code if name is undefined (translations)
            code: f.code,
            facet: {
                name: f.facet?.name || f.facet?.code,
                code: f.facet?.code
            }
        }));
    }

    @Query()
    @Allow(Permission.Public)
    async cmsCollectionsTree(@Ctx() ctx: RequestContext): Promise<any[]> {
        try {
            // Use TransactionalConnection directly (same pattern as CMSService and bootstrap diagnostic)
            const connection = (this.cmsService as any).connection;
            const { Collection: CollectionEntity } = await import('@vendure/core');
            const collections = await connection.getRepository(ctx, CollectionEntity).find({
                relations: ['featuredAsset', 'parent', 'translations'],
            });

            console.log(`[cmsCollectionsTree admin] Found ${collections.length} total collections`);

            const getName = (coll: any): string => {
                // Vendure v3: name/slug are on translations, not directly on the entity
                if (coll.name) return coll.name;
                const trans = coll.translations || [];
                const frTrans = trans.find((t: any) => t.languageCode === 'fr') || trans[0];
                return frTrans?.name || coll.slug || '';
            };
            const getSlug = (coll: any): string => {
                if (coll.slug) return coll.slug;
                const trans = coll.translations || [];
                const frTrans = trans.find((t: any) => t.languageCode === 'fr') || trans[0];
                return frTrans?.slug || '';
            };

            // Filter out root/technical collections (Vendure creates a root collection with no real name)
            const filteredIds = new Set<string>();
            const realCollections = collections.filter((c: any) => {
                const name = getName(c);
                const isRoot = !name || name.startsWith('_root_') || name === '__root_collection__';
                if (isRoot) filteredIds.add(c.id);
                return !isRoot;
            });

            console.log(`[cmsCollectionsTree admin] After filtering root collections: ${realCollections.length} collections`);

            // Log each collection for debugging
            realCollections.forEach((c: any) => {
                console.log(`[cmsCollectionsTree admin] Collection: id=${c.id}, name=${getName(c)}, slug=${getSlug(c)}, parentId=${c.parentId}`);
            });

            // Collections whose parent was filtered out become top-level
            const topLevel = realCollections.filter((c: any) => {
                return !c.parentId || c.parentId === c.id || filteredIds.has(c.parentId);
            });
            console.log(`[cmsCollectionsTree admin] Top-level collections: ${topLevel.length}`);

            const buildNode = (coll: any): any => {
                const children = realCollections.filter((c: any) => c.parentId === coll.id && c.id !== coll.id);
                return {
                    id: coll.id,
                    name: getName(coll),
                    slug: getSlug(coll),
                    featuredAsset: coll.featuredAsset || null,
                    children: children.map(buildNode),
                };
            };
            const result = topLevel.map(buildNode);
            console.log(`[cmsCollectionsTree admin] Returning ${result.length} collection nodes`);
            return result;
        } catch (error) {
            console.error('[cmsCollectionsTree admin] Error:', error);
            return [];
        }
    }

    // --- Draft System ---

    @Query()
        async getActiveDraft(@Ctx() ctx: RequestContext): Promise<PagePreset | null> {
        return this.cmsService.getActiveDraft(ctx);
    }

    @Mutation()
    @Transaction()
        async createDraftFromPreset(@Ctx() ctx: RequestContext, @Args() args: { presetId: ID }): Promise<PagePreset> {
        return this.cmsService.createDraftFromPreset(ctx, args.presetId);
    }

    @Mutation()
    @Transaction()
        async createDraftFromCurrentPage(@Ctx() ctx: RequestContext, @Args() args: { pageId: ID }): Promise<PagePreset> {
        return this.cmsService.createDraftFromCurrentPage(ctx, args.pageId);
    }

    @Mutation()
    @Transaction()
        async updateDraftSection(@Ctx() ctx: RequestContext, @Args() args: { draftId: ID, sectionType: string, sectionDataJson: string }): Promise<PagePreset> {
        return this.cmsService.updateDraftSection(ctx, args.draftId, args.sectionType, args.sectionDataJson);
    }

    @Mutation()
    @Transaction()
        async publishDraft(@Ctx() ctx: RequestContext, @Args() args: { draftId: ID, pageId: ID }): Promise<Page | null> {
        return this.cmsService.publishDraft(ctx, args.draftId, args.pageId);
    }

    @Mutation()
    @Transaction()
        async createPresetFromDraft(@Ctx() ctx: RequestContext, @Args() args: { draftId: ID, name: string, description?: string }): Promise<PagePreset> {
        return this.cmsService.createPresetFromDraft(ctx, args.draftId, args.name, args.description);
    }

    @Mutation()
    @Transaction()
        async updatePresetFromDraft(@Ctx() ctx: RequestContext, @Args() args: { draftId: ID, presetId: ID }): Promise<PagePreset> {
        return this.cmsService.updatePresetFromDraft(ctx, args.draftId, args.presetId);
    }

    @Mutation()
    @Transaction()
        async archivePreset(@Ctx() ctx: RequestContext, @Args() args: { presetId: ID }): Promise<PagePreset> {
        return this.cmsService.archivePreset(ctx, args.presetId);
    }

    @Mutation()
    @Transaction()
        async restorePresetVersion(@Ctx() ctx: RequestContext, @Args() args: { presetId: ID }): Promise<PagePreset> {
        return this.cmsService.restorePresetVersion(ctx, args.presetId);
    }

    // --- SeasonSchedule ---

    @Query()
        async seasonSchedules(@Ctx() ctx: RequestContext): Promise<any[]> {
        return this.cmsService.findAllSeasonSchedules(ctx);
    }

    @Mutation()
    @Transaction()
        async createSeasonSchedule(@Ctx() ctx: RequestContext, @Args('input') input: any): Promise<any> {
        return this.cmsService.createSeasonSchedule(ctx, input);
    }

    @Mutation()
    @Transaction()
        async updateSeasonSchedule(@Ctx() ctx: RequestContext, @Args('input') input: any): Promise<any> {
        return this.cmsService.updateSeasonSchedule(ctx, input);
    }

    @Mutation()
    @Transaction()
        async deleteSeasonSchedule(@Ctx() ctx: RequestContext, @Args() args: { id: ID }): Promise<DeletionResponse> {
        return this.cmsService.deleteSeasonSchedule(ctx, args.id);
    }

    // --- Habillage System ---

    @Query()
    async activeHabillage(@Ctx() ctx: RequestContext): Promise<PagePreset | null> {
        return this.cmsService.getActiveHabillage(ctx);
    }

    @Query()
    async habillages(@Ctx() ctx: RequestContext, @Args() args: { status?: string, isBackup?: boolean }): Promise<PagePreset[]> {
        return this.cmsService.findHabillages(ctx, args.status, args.isBackup);
    }

    @Mutation()
    @Transaction()
    async createInstantHabillage(@Ctx() ctx: RequestContext, @Args() args: { name: string }): Promise<PagePreset> {
        return this.cmsService.createInstantHabillage(ctx, args.name);
    }

    @Mutation()
    @Transaction()
    async openHabillage(@Ctx() ctx: RequestContext, @Args() args: { presetId: ID }): Promise<PagePreset> {
        return this.cmsService.openHabillage(ctx, args.presetId);
    }

    @Mutation()
    @Transaction()
    async setHabillageDefault(@Ctx() ctx: RequestContext, @Args() args: { presetId: ID }): Promise<PagePreset> {
        return this.cmsService.setHabillageDefault(ctx, args.presetId);
    }

    @Mutation()
    @Transaction()
    async unsetHabillageDefault(@Ctx() ctx: RequestContext, @Args() args: { presetId: ID }): Promise<PagePreset> {
        return this.cmsService.unsetHabillageDefault(ctx, args.presetId);
    }

    @Mutation()
    @Transaction()
    async undoHabillage(@Ctx() ctx: RequestContext, @Args() args: { presetId: ID }): Promise<PagePreset> {
        return this.cmsService.undoHabillage(ctx, args.presetId);
    }

    @Mutation()
    @Transaction()
    async redoHabillage(@Ctx() ctx: RequestContext, @Args() args: { presetId: ID }): Promise<PagePreset> {
        return this.cmsService.redoHabillage(ctx, args.presetId);
    }

    @Mutation()
    @Transaction()
    async autoSaveHabillage(@Ctx() ctx: RequestContext, @Args() args: { presetId: ID, sectionsJson: string }): Promise<PagePreset> {
        return this.cmsService.autoSaveHabillage(ctx, args.presetId, args.sectionsJson);
    }

    @Mutation()
    @Transaction()
    async publishHabillage(@Ctx() ctx: RequestContext, @Args() args: { presetId: ID, pageId: ID }): Promise<Page> {
        return this.cmsService.publishHabillage(ctx, args.presetId, args.pageId);
    }

    @Mutation()
    @Transaction()
    async deleteHabillage(@Ctx() ctx: RequestContext, @Args() args: { id: ID }): Promise<DeletionResponse> {
        return this.cmsService.deleteHabillage(ctx, args.id);
    }

    @Mutation()
    @Transaction()
    @Allow(Permission.Public)
    async updateMarket(@Ctx() ctx: RequestContext, @Args('input') input: any): Promise<any> {
        return this.cmsService.updateMarket(ctx, input);
    }

    @Mutation()
    @Transaction()
    @Allow(Permission.Public)
    async updateGeographicLocation(@Ctx() ctx: RequestContext, @Args('input') input: any): Promise<any> {
        return this.cmsService.updateGeographicLocation(ctx, input);
    }
}

@Resolver()
export class CMSShopResolver {
    constructor(
        private cmsService: CMSService,
        private collectionService: CollectionService,
    ) { }

    @Query()
    @Allow(Permission.Public)
    async page(@Ctx() ctx: RequestContext, @Args() args: { id?: ID, slug?: string }): Promise<Page | null> {
        if (args.id) {
            return this.cmsService.findOne(ctx, args.id);
        }
        return this.cmsService.findOneBySlug(ctx, args.slug || '');
    }

    @Query()
    @Allow(Permission.Public)
    async activeSeason(@Ctx() ctx: RequestContext): Promise<SiteSeason | null> {
        return this.cmsService.getActiveSeason(ctx);
    }

    @Query()
    @Allow(Permission.Public)
    async previewPreset(@Ctx() ctx: RequestContext, @Args() args: { presetId: ID }): Promise<Page | null> {
        return this.cmsService.previewPreset(ctx, args.presetId);
    }

    @Query()
    @Allow(Permission.Public)
    async previewHabillage(@Ctx() ctx: RequestContext, @Args() args: { presetId: ID }): Promise<any> {
        return this.cmsService.previewHabillage(ctx, args.presetId);
    }

    @Query()
    @Allow(Permission.Public)
    async cmsFacetValues(@Ctx() ctx: RequestContext): Promise<any[]> {
        const { FacetValue } = await import('@vendure/core');
        const connection = (this.cmsService as any).connection;
        const facets = await connection.getRepository(ctx, FacetValue).find({
            relations: ['facet']
        });
        
        return facets.map((f: any) => ({
            id: f.id,
            name: f.name || f.code,
            code: f.code,
            facet: {
                name: f.facet?.name || f.facet?.code,
                code: f.facet?.code
            }
        }));
    }

    @Query()
    @Allow(Permission.Public)
    async cmsCollectionsTree(@Ctx() ctx: RequestContext): Promise<any[]> {
        try {
            // Use TransactionalConnection directly (same pattern as CMSService and bootstrap diagnostic)
            const connection = (this.cmsService as any).connection;
            const { Collection: CollectionEntity } = await import('@vendure/core');
            const collections = await connection.getRepository(ctx, CollectionEntity).find({
                relations: ['featuredAsset', 'parent', 'translations'],
            });
            console.log(`[cmsCollectionsTree shop] Found ${collections.length} collections`);

            const getName = (coll: any): string => {
                // Vendure v3: name/slug are on translations, not directly on the entity
                if (coll.name) return coll.name;
                const trans = coll.translations || [];
                const frTrans = trans.find((t: any) => t.languageCode === 'fr') || trans[0];
                return frTrans?.name || coll.slug || '';
            };
            const getSlug = (coll: any): string => {
                if (coll.slug) return coll.slug;
                const trans = coll.translations || [];
                const frTrans = trans.find((t: any) => t.languageCode === 'fr') || trans[0];
                return frTrans?.slug || '';
            };

            // Filter out root/technical collections (Vendure creates a root collection with no real name)
            const filteredIds = new Set<string>();
            const realCollections = collections.filter((c: any) => {
                const name = getName(c);
                const isRoot = !name || name.startsWith('_root_') || name === '__root_collection__';
                if (isRoot) filteredIds.add(c.id);
                return !isRoot;
            });

            // Collections whose parent was filtered out become top-level
            const topLevel = realCollections.filter((c: any) => {
                return !c.parentId || c.parentId === c.id || filteredIds.has(c.parentId);
            });
            const buildNode = (coll: any): any => {
                const children = realCollections.filter((c: any) => c.parentId === coll.id && c.id !== coll.id);
                return {
                    id: coll.id,
                    name: getName(coll),
                    slug: getSlug(coll),
                    featuredAsset: coll.featuredAsset || null,
                    children: children.map(buildNode),
                };
            };
            const result = topLevel.map(buildNode);
            console.log(`[cmsCollectionsTree shop] Returning ${result.length} top-level nodes`);
            return result;
        } catch (error) {
            return [];
        }
    }
}
