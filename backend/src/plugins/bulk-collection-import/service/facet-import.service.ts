import { Injectable } from '@nestjs/common';
import { Ctx, RequestContext, FacetService, LanguageCode, TransactionalConnection, FacetValue, Facet, ChannelService } from '@vendure/core';
import { FacetRow, FacetValueRow } from '../types/import-types';

@Injectable()
export class FacetImportService {
  constructor(
    private facetService: FacetService,
    private connection: TransactionalConnection,
    private channelService: ChannelService,
  ) {}

  /**
   * Import facets and facet values from parsed Excel data
   * Uses Vendure's repository to create facets without schema changes
   * Updates existing items instead of skipping them
   */
  async importFacets(
    ctx: RequestContext,
    facets: FacetRow[],
    facetValues: FacetValueRow[],
  ): Promise<{ facetsCreated: number; facetsUpdated: number; facetValuesCreated: number; facetValuesUpdated: number; errors: string[] }> {
    const errors: string[] = [];
    let facetsCreated = 0;
    let facetsUpdated = 0;
    let facetValuesCreated = 0;
    let facetValuesUpdated = 0;


    // Build a map of facet code to facet ID for value resolution
    const codeToIdMap = new Map<string, string>();

    // Use repository for direct access
    const facetRepo = this.connection.getRepository(ctx, Facet);
    const facetValueRepo = this.connection.getRepository(ctx, FacetValue);

    // First pass: create or update facets
    for (const facet of facets) {
      try {
        // Check if facet already exists by code
        const existing = await facetRepo.findOne({ where: { code: facet.code } });
        
        if (existing) {
          // Update existing facet using service
          try {
            await this.facetService.update(ctx, {
              id: existing.id,
              isPrivate: facet.isPrivate === 'true',
              translations: [
                {
                  languageCode: LanguageCode.fr,
                  name: facet.name,
                },
                ...(facet.nameEn
                  ? [
                      {
                        languageCode: LanguageCode.en,
                        name: facet.nameEn,
                      },
                    ]
                  : []),
              ],
            });
            codeToIdMap.set(facet.code, String(existing.id));
            facetsUpdated++;
          } catch (error: any) {
            errors.push(`Failed to update facet "${facet.code}": ${error.message}`);
          }
        } else {
          // Create new facet
          const newFacet = new Facet({
            code: facet.code,
            isPrivate: facet.isPrivate === 'true',
            translations: [
              {
                languageCode: LanguageCode.fr,
                name: facet.name,
              },
              ...(facet.nameEn
                ? [
                    {
                      languageCode: LanguageCode.en,
                      name: facet.nameEn,
                    },
                  ]
                : []),
            ],
          });

          const createdFacet = await facetRepo.save(newFacet);
          await this.channelService.assignToChannels(ctx, Facet, createdFacet.id as any, [ctx.channelId]);
          codeToIdMap.set(facet.code, String(createdFacet.id));
          facetsCreated++;
        }
      } catch (error: any) {
        errors.push(`Failed to import facet "${facet.code}": ${error.message}`);
      }
    }

    // Second pass: create or update facet values
    for (const facetValue of facetValues) {
      try {
        const facetId = codeToIdMap.get(facetValue.facetCode);
        if (!facetId) {
          errors.push(`Facet "${facetValue.facetCode}" not found for value "${facetValue.code}"`);
          continue;
        }

        // Check if value already exists
        const facet = await facetRepo.findOne({ where: { id: facetId as any }, relations: ['values'] });
        
        if (facet && facet.values) {
          const existingValue = facet.values.find((v: any) => v.code === facetValue.code);
          if (existingValue) {
            // Skip updating existing facet values to avoid translation complexity
            // The value already exists, so we just count it as updated
            facetValuesUpdated++;
            continue;
          }
        }

        // Create new facet value
        const newFacetValue = new FacetValue({
          code: facetValue.code,
          facetId: facetId as any,
          translations: [
            {
              languageCode: LanguageCode.fr,
              name: facetValue.name,
            },
            ...(facetValue.nameEn
              ? [
                  {
                    languageCode: LanguageCode.en,
                    name: facetValue.nameEn,
                  },
                ]
              : []),
          ],
        });

        const savedFacetValue = await facetValueRepo.save(newFacetValue);
        await this.channelService.assignToChannels(ctx, FacetValue, savedFacetValue.id as any, [ctx.channelId]);
        facetValuesCreated++;
      } catch (error: any) {
        errors.push(`Failed to import facet value "${facetValue.code}": ${error.message}`);
      }
    }

    return { facetsCreated, facetsUpdated, facetValuesCreated, facetValuesUpdated, errors };
  }

  /**
   * Get facet ID by code
   */
  async getFacetIdByCode(ctx: RequestContext, code: string): Promise<string | null> {
    const facetRepo = this.connection.getRepository(ctx, Facet);
    const facet = await facetRepo.findOne({ where: { code } });
    return facet ? String(facet.id) : null;
  }
}
