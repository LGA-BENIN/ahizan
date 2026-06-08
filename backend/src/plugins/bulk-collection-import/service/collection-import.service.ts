import { Injectable } from '@nestjs/common';
import { Ctx, RequestContext, CollectionService, LanguageCode, TransactionalConnection } from '@vendure/core';
import { CollectionRow } from '../types/import-types';

@Injectable()
export class CollectionImportService {
  constructor(
    private collectionService: CollectionService,
    private connection: TransactionalConnection,
  ) {}

  /**
   * Import collections from parsed Excel data
   * Uses Vendure's CollectionService to create/update collections without schema changes
   * Updates existing items instead of skipping them
   */
  async importCollections(
    ctx: RequestContext,
    collections: CollectionRow[],
  ): Promise<{ created: number; updated: number; errors: string[] }> {
    const errors: string[] = [];
    let created = 0;
    let updated = 0;

    // Build a map of slug to collection ID for parent resolution
    const slugToIdMap = new Map<string, string>();

    // First pass: create or update all collections without parents
    for (const collection of collections) {
      try {
        // Check if collection already exists
        const existing = await this.collectionService.findOneBySlug(ctx, collection.slug);
        
        if (existing) {
          // Update existing collection
          await this.collectionService.update(ctx, {
            id: existing.id,
            translations: [
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
            ],
            customFields: {
              allowedFacetIds: this.parseAllowedFacetIds(collection.allowedFacetIds),
            },
          });

          slugToIdMap.set(collection.slug, String(existing.id));
          updated++;
        } else {
          // Create new collection
          const createdCollection = await this.collectionService.create(ctx, {
            translations: [
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
            ],
            filters: [], // Required by CreateCollectionInput
            customFields: {
              allowedFacetIds: this.parseAllowedFacetIds(collection.allowedFacetIds),
            },
          });

          slugToIdMap.set(collection.slug, String(createdCollection.id));
          created++;
        }
      } catch (error: any) {
        errors.push(`Failed to import collection "${collection.slug}": ${error.message}`);
      }
    }

    // Second pass: update parent relationships
    for (const collection of collections) {
      // Treat empty string as no parent
      if (collection.parentSlug && collection.parentSlug.trim() !== '' && slugToIdMap.has(collection.parentSlug)) {
        try {
          const parentId = slugToIdMap.get(collection.parentSlug);
          const collectionId = slugToIdMap.get(collection.slug);

          if (collectionId && parentId) {
            await this.collectionService.update(ctx, {
              id: collectionId,
              parentId: parentId as any,
            });
          }
        } catch (error: any) {
          errors.push(`Failed to set parent for collection "${collection.slug}": ${error.message}`);
        }
      }
    }

    return { created, updated, errors };
  }

  /**
   * Parse comma-separated facet IDs from string
   */
  private parseAllowedFacetIds(facetIdsStr?: string): string[] {
    if (!facetIdsStr) return [];
    return facetIdsStr
      .split(',')
      .map(id => id.trim())
      .filter(id => id !== '');
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
}
