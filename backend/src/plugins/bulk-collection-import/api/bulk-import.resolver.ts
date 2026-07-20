import { Injectable } from '@nestjs/common';
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { Ctx, RequestContext, Permission, Allow } from '@vendure/core';
import { ExcelParserService } from '../service/excel-parser.service';
import { ImportValidatorService } from '../service/import-validator.service';
import { CollectionImportService } from '../service/collection-import.service';
import { FacetImportService } from '../service/facet-import.service';
import { ExportService } from '../service/export.service';
import { ImportResult, ImportError } from '../types/import-types';

@Injectable()
@Resolver()
export class BulkImportResolver {
  constructor(
    private excelParser: ExcelParserService,
    private validator: ImportValidatorService,
    private collectionImport: CollectionImportService,
    private facetImport: FacetImportService,
    private exportService: ExportService,
  ) {}

  /**
   * Validate an Excel file before import
   */
  @Query()
  @Allow(Permission.SuperAdmin)
  async validateImportFile(
    @Ctx() ctx: RequestContext,
    @Args() args: { fileBase64: string; fileName: string },
  ): Promise<ImportResult> {
    try {
      const buffer = Buffer.from(args.fileBase64, 'base64');
      const { data, errors: parseErrors } = this.excelParser.parseExcelFile(buffer);

      const validationErrors = this.validator.validateData(data);
      const allErrors = [...parseErrors, ...validationErrors];

      return {
        success: allErrors.length === 0,
        message: allErrors.length === 0
          ? 'File is valid and ready for import'
          : `Found ${allErrors.length} validation error(s)`,
        collectionsCreated: 0,
        collectionsUpdated: 0,
        facetsCreated: 0,
        facetsUpdated: 0,
        facetValuesCreated: 0,
        facetValuesUpdated: 0,
        errors: allErrors,
      };
    } catch (error: any) {
      return {
        success: false,
        message: `Validation failed: ${error.message}`,
        collectionsCreated: 0,
        collectionsUpdated: 0,
        facetsCreated: 0,
        facetsUpdated: 0,
        facetValuesCreated: 0,
        facetValuesUpdated: 0,
        errors: [
          {
            row: 0,
            sheet: 'File',
            field: 'validation',
            message: error.message,
          },
        ],
      };
    }
  }

  /**
   * Export all collections and facets to Excel
   */
  @Query()
  @Allow(Permission.SuperAdmin)
  async exportCollectionsAndFacets(@Ctx() ctx: RequestContext): Promise<string> {
    try {
      return await this.exportService.exportToExcel(ctx);
    } catch (error: any) {
      throw new Error(`Export failed: ${error.message}`);
    }
  }

  /**
   * Import collections and facets from Excel file
   */
  @Mutation()
  @Allow(Permission.SuperAdmin)
  async importCollectionsAndFacets(
    @Ctx() ctx: RequestContext,
    @Args() args: { fileBase64: string; fileName: string },
  ): Promise<ImportResult> {
    try {
      const buffer = Buffer.from(args.fileBase64, 'base64');

      // Parse Excel file
      const { data, errors: parseErrors } = this.excelParser.parseExcelFile(buffer);
      
      if (parseErrors.length > 0) {
        return {
          success: false,
          message: 'Failed to parse Excel file',
          collectionsCreated: 0,
          collectionsUpdated: 0,
          facetsCreated: 0,
          facetsUpdated: 0,
          facetValuesCreated: 0,
          facetValuesUpdated: 0,
          errors: parseErrors,
        };
      }

      // Validate data - warnings only, don't block import
      const validationErrors = this.validator.validateData(data);
      console.log('[BulkImportResolver] Validation warnings:', validationErrors.length);

      // Import facets first (independent)
      const { facetsCreated, facetsUpdated, facetValuesCreated, facetValuesUpdated, errors: facetErrors, facetValueCodeToId, codeToIdMap } = 
        await this.facetImport.importFacets(ctx, data.facets, data.facetValues);

      // Import collections. The facet value code -> ID map lets collections
      // build facet-value-filters (to auto-populate variants) from value codes.
      const { created: collectionsCreated, updated: collectionsUpdated, errors: collectionErrors } = 
        await this.collectionImport.importCollections(ctx, data.collections, facetValueCodeToId, codeToIdMap);

      // Update collection-facet mappings based on allowedFacetCodes from Excel
      for (const collection of data.collections) {
        if (collection.allowedFacetCodes) {
          const facetCodes = collection.allowedFacetCodes
            .split(',')
            .map((code: string) => code.trim())
            .filter((code: string) => code !== '');

          if (facetCodes.length > 0) {
            const facetIds = facetCodes
              .map(code => codeToIdMap.get(code))
              .filter((id): id is string => id !== undefined);

            try {
              await this.collectionImport.updateCollectionFacets(ctx, collection.slug, facetIds);
            } catch (error: any) {
              collectionErrors.push(`Failed to update facets for collection "${collection.slug}": ${error.message}`);
            }
          }
        }
      }

      const allErrors = [...facetErrors, ...collectionErrors];

      return {
        success: allErrors.length === 0,
        message: allErrors.length === 0 
          ? `Successfully imported ${collectionsCreated} collections (created), ${collectionsUpdated} collections (updated), ${facetsCreated} facets (created), ${facetsUpdated} facets (updated), ${facetValuesCreated} facet values (created), and ${facetValuesUpdated} facet values (updated)`
          : `Import completed with ${allErrors.length} error(s)`,
        collectionsCreated,
        collectionsUpdated,
        facetsCreated,
        facetsUpdated,
        facetValuesCreated,
        facetValuesUpdated,
        errors: allErrors.map(err => ({
          row: 0,
          sheet: 'Import',
          field: 'error',
          message: err,
        })),
      };
    } catch (error: any) {
      return {
        success: false,
        message: `Import failed: ${error.message}`,
        collectionsCreated: 0,
        collectionsUpdated: 0,
        facetsCreated: 0,
        facetsUpdated: 0,
        facetValuesCreated: 0,
        facetValuesUpdated: 0,
        errors: [
          {
            row: 0,
            sheet: 'Import',
            field: 'error',
            message: error.message,
          },
        ],
      };
    }
  }

  /**
   * Extract buffer from uploaded file
   */
  private async getFileBuffer(file: any): Promise<Buffer> {
    console.log('[BulkImportResolver] File object keys:', Object.keys(file || {}));
    console.log('[BulkImportResolver] File object:', JSON.stringify(file, null, 2).substring(0, 500));

    if (file.buffer) {
      return file.buffer;
    }
    if (file.createReadStream) {
      const stream = file.createReadStream();
      const chunks: Buffer[] = [];
      return new Promise((resolve, reject) => {
        stream.on('data', (chunk: Buffer) => chunks.push(chunk));
        stream.on('end', () => resolve(Buffer.concat(chunks)));
        stream.on('error', reject);
      });
    }
    // Handle multipart upload where file might be a direct object
    if (file && typeof file === 'object') {
      // Try to extract from various possible structures
      if (file.file && file.file.buffer) {
        return file.file.buffer;
      }
      if (file.file && file.file.createReadStream) {
        const stream = file.file.createReadStream();
        const chunks: Buffer[] = [];
        return new Promise((resolve, reject) => {
          stream.on('data', (chunk: Buffer) => chunks.push(chunk));
          stream.on('end', () => resolve(Buffer.concat(chunks)));
          stream.on('error', reject);
        });
      }
    }
    throw new Error('Invalid file format');
  }
}
