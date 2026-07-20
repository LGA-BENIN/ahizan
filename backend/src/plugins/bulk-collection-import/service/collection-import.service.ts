import { Injectable } from '@nestjs/common';
import {
  RequestContext,
  CollectionService,
  LanguageCode,
  TransactionalConnection,
  ChannelService,
  Collection,
  AssetService,
} from '@vendure/core';
import { ConfigurableOperationInput } from '@vendure/common/lib/generated-types';
import { CollectionRow } from '../types/import-types';

@Injectable()
export class CollectionImportService {
  constructor(
    private collectionService: CollectionService,
    private connection: TransactionalConnection,
    private channelService: ChannelService,
    private assetService: AssetService,
  ) {}

  /**
   * Import collections from parsed Excel data.
   *
   * Robustness guarantees (fixes for previously observed bugs):
   *  - Every created collection is assigned to the current channel.
   *  - Parent relationships are set via `move()` (NOT `update({parentId})`,
   *    which Vendure silently ignores). Collections without a parent are
   *    explicitly moved under the root collection so none are ever orphaned.
   *  - Collections are populated with product variants by building
   *    CollectionFilters from `facetValueCodes` (facet-value-filter) and/or
   *    `variantIds` (variant-id-filter).
   *
   * @param facetValueCodeToId Map of facet value code -> facet value ID, used
   *   to translate the human-friendly `facetValueCodes` column into the IDs
   *   required by the facet-value-filter.
   */
  async importCollections(
    ctx: RequestContext,
    collections: CollectionRow[],
    facetValueCodeToId: Map<string, string> = new Map(),
    codeToIdMap: Map<string, string> = new Map(),
  ): Promise<{ created: number; updated: number; errors: string[] }> {
    const errors: string[] = [];
    let created = 0;
    let updated = 0;

    // Build a map of slug to collection ID for parent resolution
    const slugToIdMap = new Map<string, string>();

    // Resolve the root collection once so we can re-parent top-level collections
    const rootCollectionId = await this.getRootCollectionId(ctx);

    // Build a map of slug to parent slug to compute tree depth
    const parentMap = new Map<string, string>();
    for (const c of collections) {
      if (c.parentSlug) {
        parentMap.set(c.slug, c.parentSlug.trim());
      }
    }

    const getDepth = (slug: string): number => {
      let depth = 0;
      let current = slug;
      while (parentMap.has(current)) {
        const parent = parentMap.get(current);
        if (!parent || parent === current) break; // guard against cycles
        current = parent;
        depth++;
      }
      return depth;
    };

    // Sort collections by depth in ascending order
    // to ensure parents are always created/updated before their children
    const sortedCollections = [...collections].sort((a, b) => {
      return getDepth(a.slug) - getDepth(b.slug);
    });

    for (const collection of sortedCollections) {
      try {
        const filters = this.buildFilters(ctx, collection, facetValueCodeToId, errors);
        const inheritFilters = collection.inheritFilters
          ? collection.inheritFilters.toString().trim().toLowerCase() !== 'false'
          : true;
        const isPrivate = collection.isPrivate
          ? collection.isPrivate.toString().trim().toLowerCase() === 'true'
          : false;

        const translations = [
          {
            languageCode: LanguageCode.fr,
            name: collection.name,
            slug: collection.slug,
            description: collection.description || '',
          },
          ...(collection.nameEn
            ? [
                {
                  languageCode: LanguageCode.en,
                  name: collection.nameEn,
                  slug: collection.slug,
                  description: collection.descriptionEn || '',
                },
              ]
            : []),
        ];

        // Resolve the parent ID from memory first (since parent was processed first)
        let targetParentId: string | undefined;
        const parentSlug = collection.parentSlug?.trim();

        if (parentSlug) {
          targetParentId = slugToIdMap.get(parentSlug);
          if (!targetParentId) {
            // Parent not in this batch - try to resolve from the database
            const parent = await this.collectionService.findOneBySlug(ctx, parentSlug);
            targetParentId = parent ? String(parent.id) : undefined;
          }
        }

        // Default to root collection if parent slug not found or empty
        if (!targetParentId) {
          targetParentId = rootCollectionId;
        }

        // Check if collection already exists
        const existing = await this.collectionService.findOneBySlug(ctx, collection.slug);

        if (existing) {
          // Update existing collection
          const updateInput: any = {
            id: existing.id,
            isPrivate,
            inheritFilters,
            filters,
            translations,
            customFields: {
              allowedFacetIds: this.parseAllowedFacetCodes(collection.allowedFacetCodes, codeToIdMap),
            },
          };

          // Handle featured asset from URL
          if (collection.featuredAssetUrl) {
            const assetId = await this.createAssetFromUrl(ctx, collection.featuredAssetUrl);
            if (assetId) {
              updateInput.featuredAssetId = assetId;
            }
          }

          await this.collectionService.update(ctx, updateInput);

          // Ensure the collection is assigned to the current channel (idempotent)
          await this.channelService.assignToChannels(ctx, Collection, existing.id as any, [ctx.channelId]);

          slugToIdMap.set(collection.slug, String(existing.id));
          updated++;

          // Check if parent actually changed before calling move() to avoid TypeORM closure issues
          const parentRelation = await this.connection.getRepository(ctx, Collection).findOne({
            where: { id: existing.id },
            relations: ['parent'],
          });
          const currentParentId = parentRelation?.parent ? String(parentRelation.parent.id) : undefined;

          if (targetParentId && currentParentId !== targetParentId && String(existing.id) !== targetParentId) {
            try {
              const index = this.parsePosition(collection.position);
              await this.collectionService.move(ctx, {
                collectionId: existing.id as any,
                parentId: targetParentId as any,
                index,
              });
            } catch (error: any) {
              errors.push(`Failed to move collection "${collection.slug}" under parent: ${error.message}`);
            }
          }
        } else {
          // Create new collection
          const createInput: any = {
            parentId: targetParentId as any,
            isPrivate,
            inheritFilters,
            filters,
            translations,
            customFields: {
              allowedFacetIds: this.parseAllowedFacetCodes(collection.allowedFacetCodes, codeToIdMap),
            },
          };

          // Handle featured asset from URL
          if (collection.featuredAssetUrl) {
            const assetId = await this.createAssetFromUrl(ctx, collection.featuredAssetUrl);
            if (assetId) {
              createInput.featuredAssetId = assetId;
            }
          }

          const createdCollection = await this.collectionService.create(ctx, createInput);

          await this.channelService.assignToChannels(ctx, Collection, createdCollection.id as any, [ctx.channelId]);
          slugToIdMap.set(collection.slug, String(createdCollection.id));
          created++;
        }
      } catch (error: any) {
        errors.push(`Failed to import collection "${collection.slug}": ${error.message}`);
      }
    }

    return { created, updated, errors };
  }

  /**
   * Resolve the ID of the root collection (the implicit top of the tree).
   */
  private async getRootCollectionId(ctx: RequestContext): Promise<string | undefined> {
    const collectionRepo = this.connection.getRepository(ctx, Collection);
    const root = await collectionRepo.findOne({ where: { isRoot: true } as any });
    return root ? String(root.id) : undefined;
  }

  /**
   * Build the CollectionFilters that populate a collection with product
   * variants. Supports both an explicit variant-id-filter and an automatic
   * facet-value-filter derived from facet value codes.
   */
  private buildFilters(
    ctx: RequestContext,
    collection: CollectionRow,
    facetValueCodeToId: Map<string, string>,
    errors: string[],
  ): ConfigurableOperationInput[] {
    const filters: ConfigurableOperationInput[] = [];

    // Explicit variant IDs -> variant-id-filter
    const variantIds = this.parseCsv(collection.variantIds);
    if (variantIds.length > 0) {
      filters.push({
        code: 'variant-id-filter',
        arguments: [{ name: 'variantIds', value: JSON.stringify(variantIds) }],
      });
    }

    // Facet value codes -> facet-value-filter
    const facetValueCodes = this.parseCsv(collection.facetValueCodes);
    if (facetValueCodes.length > 0) {
      const ids: string[] = [];
      for (const code of facetValueCodes) {
        const id = facetValueCodeToId.get(code) || facetValueCodeToId.get(code.toLowerCase());
        if (id) {
          ids.push(id);
        } else {
          errors.push(
            `Collection "${collection.slug}": facet value code "${code}" not found - skipped in filter`,
          );
        }
      }
      if (ids.length > 0) {
        filters.push({
          code: 'facet-value-filter',
          arguments: [
            { name: 'facetValueIds', value: JSON.stringify(ids) },
            { name: 'containsAny', value: 'true' },
            { name: 'combineWithAnd', value: 'false' },
          ],
        });
      }
    }

    return filters;
  }

  /**
   * Parse a position value (string or number) into a non-negative integer.
   */
  private parsePosition(position?: number | string): number {
    const n = Number(position);
    return Number.isFinite(n) && n >= 0 ? Math.floor(n) : 0;
  }

  /**
   * Parse a comma-separated string into a trimmed, non-empty list.
   */
  private parseCsv(value?: string): string[] {
    if (!value) return [];
    return value
      .toString()
      .split(',')
      .map(v => v.trim())
      .filter(v => v !== '');
  }

  /**
   * Parse allowed facet codes from string using codeToIdMap
   */
  private parseAllowedFacetCodes(
    codesStr?: string,
    codeToIdMap: Map<string, string> = new Map(),
  ): string[] {
    return this.parseCsv(codesStr)
      .map(code => codeToIdMap.get(code))
      .filter((id): id is string => id !== undefined);
  }

  /**
   * Update allowedFacetIds for a collection
   * This updates the customFields without schema changes
   */
  async updateCollectionFacets(
    ctx: RequestContext,
    collectionSlug: string,
    facetIds: string[],
  ): Promise<void> {
    const collection = await this.collectionService.findOneBySlug(ctx, collectionSlug);
    if (!collection) {
      throw new Error(`Collection "${collectionSlug}" not found`);
    }

    const collectionRepo = this.connection.getRepository(ctx, 'Collection');
    await collectionRepo.update(collection.id, {
      customFields: {
        allowedFacetIds: facetIds,
      },
    } as any);
  }

  /**
   * Download an image from a URL and create an asset
   */
  private async createAssetFromUrl(ctx: RequestContext, url: string): Promise<string | null> {
    if (!url || url.trim() === '') return null;

    try {
      console.log(`[BulkImport] Attempting to download image from: ${url}`);
      
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        },
      });
      
      if (!response.ok) {
        console.error(`[BulkImport] Failed to download image from ${url}: HTTP ${response.status} ${response.statusText}`);
        return null;
      }

      const buffer = await response.arrayBuffer();
      const fileName = url.split('/').pop()?.split('?')[0] || 'image.jpg';
      const mimeType = response.headers.get('content-type') || 'image/jpeg';

      console.log(`[BulkImport] Downloaded ${buffer.byteLength} bytes from ${url}, MIME type: ${mimeType}`);

      // Create a proper file-like object with createReadStream method
      const { Readable } = require('stream');
      const file = {
        filename: fileName,
        mimetype: mimeType,
        buffer: Buffer.from(buffer),
        createReadStream: () => Readable.from(Buffer.from(buffer)),
      } as any;

      const asset = await this.assetService.create(ctx, { file });
      if ((asset as any).errorCode) {
        console.error(`[BulkImport] Failed to create asset from ${url}: ${(asset as any).message}`);
        return null;
      }

      console.log(`[BulkImport] Successfully created asset from ${url}, ID: ${(asset as any).id}`);
      return (asset as any).id;
    } catch (error: any) {
      console.error(`[BulkImport] Error creating asset from URL ${url}: ${error.message}`);
      console.error(`[BulkImport] Error details:`, error);
      return null;
    }
  }
}
