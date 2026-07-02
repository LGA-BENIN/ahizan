import { Injectable } from '@nestjs/common';
// @ts-ignore
import * as XLSX from 'xlsx';
import { Ctx, RequestContext, TransactionalConnection, Collection, Facet, FacetValue } from '@vendure/core';

@Injectable()
export class ExportService {
  constructor(private connection: TransactionalConnection) {}

  /**
   * Export all collections and facets to Excel file
   * Returns base64 encoded Excel file
   */
  async exportToExcel(ctx: RequestContext): Promise<string> {
    const workbook = XLSX.utils.book_new();

    // Export Collections
    const collectionsData = await this.exportCollections(ctx);
    const collectionsSheet = XLSX.utils.json_to_sheet(collectionsData);
    XLSX.utils.book_append_sheet(workbook, collectionsSheet, 'Collections');

    // Export Facets
    const facetsData = await this.exportFacets(ctx);
    const facetsSheet = XLSX.utils.json_to_sheet(facetsData);
    XLSX.utils.book_append_sheet(workbook, facetsSheet, 'Facets');

    // Export Facet Values
    const facetValuesData = await this.exportFacetValues(ctx);
    const facetValuesSheet = XLSX.utils.json_to_sheet(facetValuesData);
    XLSX.utils.book_append_sheet(workbook, facetValuesSheet, 'Facet Values');

    // Write to buffer
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    
    // Convert to base64
    return buffer.toString('base64');
  }

  private async exportCollections(ctx: RequestContext): Promise<any[]> {
    const collectionRepo = this.connection.getRepository(ctx, Collection);
    const collections = await collectionRepo.find({
      relations: ['translations', 'parent', 'featuredAsset'],
    });

    // Fetch all facet values upfront to build a code map
    const facetValueRepo = this.connection.getRepository(ctx, FacetValue);
    const allFacetValues = await facetValueRepo.find({ relations: ['facet'] });
    const facetValueIdToCode = new Map<string, string>();
    allFacetValues.forEach(fv => {
      facetValueIdToCode.set(String(fv.id), fv.code);
    });

    return collections.map((collection: any) => {
      const frTrans = collection.translations?.find((t: any) => t.languageCode === 'fr') || collection.translations?.[0];
      const enTrans = collection.translations?.find((t: any) => t.languageCode === 'en');

      const filters = (collection.filters || []) as any[];
      const variantFilter = filters.find(f => f.code === 'variant-id-filter');
      const variantIds = this.extractArgList(variantFilter, 'variantIds');
      
      const facetValueFilter = filters.find(f => f.code === 'facet-value-filter');
      const facetValueIds = this.extractArgList(facetValueFilter, 'facetValueIds');
      
      // Convert facet value IDs to codes using the pre-built map
      const facetValueCodes = facetValueIds
        .map(id => facetValueIdToCode.get(id))
        .filter((code): code is string => code !== undefined);

      return {
        name: frTrans?.name || collection.name || '',
        name_en: enTrans?.name || '',
        slug: collection.slug || '',
        parent_slug: collection.parent?.slug || '',
        description: frTrans?.description || '',
        description_en: enTrans?.description || '',
        featured_asset_url: collection.featuredAsset?.preview || '',
        position: collection.position || 0,
        allowed_facet_ids: (collection.customFields?.allowedFacetIds || []).join(','),
        facet_value_codes: facetValueCodes.join(','),
        variant_ids: variantIds.join(','),
        inherit_filters: collection.inheritFilters === false ? 'false' : 'true',
        is_private: collection.isPrivate ? 'true' : 'false',
      };
    });
  }

  /**
   * Extract a list-type argument value from a stored CollectionFilter operation.
   * The value is stored as a JSON-encoded string array, e.g. '["2","6"]'.
   */
  private extractArgList(filter: any, argName: string): string[] {
    if (!filter || !Array.isArray(filter.args)) return [];
    const arg = filter.args.find((a: any) => a.name === argName);
    if (!arg || arg.value == null) return [];
    try {
      const parsed = JSON.parse(arg.value);
      return Array.isArray(parsed) ? parsed.map((v: any) => String(v)) : [];
    } catch {
      return [];
    }
  }

  private async exportFacets(ctx: RequestContext): Promise<any[]> {
    const facetRepo = this.connection.getRepository(ctx, Facet);
    const facets = await facetRepo.find({
      relations: ['translations'],
    });

    return facets.map((facet: any) => {
      const frTrans = facet.translations?.find((t: any) => t.languageCode === 'fr') || facet.translations?.[0];
      const enTrans = facet.translations?.find((t: any) => t.languageCode === 'en');

      return {
        code: facet.code || '',
        name: frTrans?.name || facet.name || '',
        name_en: enTrans?.name || '',
        is_private: facet.isPrivate ? 'true' : 'false',
      };
    });
  }

  private async exportFacetValues(ctx: RequestContext): Promise<any[]> {
    const facetValueRepo = this.connection.getRepository(ctx, FacetValue);
    const facetValues = await facetValueRepo.find({
      relations: ['facet', 'translations'],
    });

    return facetValues.map((facetValue: any) => {
      const frTrans = facetValue.translations?.find((t: any) => t.languageCode === 'fr') || facetValue.translations?.[0];
      const enTrans = facetValue.translations?.find((t: any) => t.languageCode === 'en');

      return {
        facet_code: facetValue.facet?.code || '',
        code: facetValue.code || '',
        name: frTrans?.name || facetValue.name || '',
        name_en: enTrans?.name || '',
      };
    });
  }
}
