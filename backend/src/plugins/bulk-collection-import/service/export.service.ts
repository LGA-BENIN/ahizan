import { Injectable } from '@nestjs/common';
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
      relations: ['translations', 'parent'],
    });

    return collections.map((collection: any) => {
      const frTrans = collection.translations?.find((t: any) => t.languageCode === 'fr') || collection.translations?.[0];
      const enTrans = collection.translations?.find((t: any) => t.languageCode === 'en');

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
      };
    });
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
