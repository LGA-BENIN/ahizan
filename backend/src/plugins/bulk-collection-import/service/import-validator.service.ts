import { ParsedExcelData, CollectionRow, FacetRow, FacetValueRow, ImportError } from '../types/import-types';

export class ImportValidatorService {
  /**
   * Validate parsed Excel data before import
   * Returns warnings instead of blocking errors - invalid rows will be skipped
   */
  validateData(data: ParsedExcelData): ImportError[] {
    const errors: ImportError[] = [];

    // Validate collections - only log warnings for invalid rows
    data.collections.forEach((collection, index) => {
      const row = index + 2;
      const collectionErrors = this.validateCollection(collection, row);
      // Only add as warnings (not blocking)
      if (collectionErrors.length > 0) {
        errors.push(...collectionErrors);
      }
    });

    // Validate facets - only log warnings for invalid rows
    data.facets.forEach((facet, index) => {
      const row = index + 2;
      const facetErrors = this.validateFacet(facet, row);
      if (facetErrors.length > 0) {
        errors.push(...facetErrors);
      }
    });

    // Validate facet values - only log warnings for invalid rows
    data.facetValues.forEach((facetValue, index) => {
      const row = index + 2;
      const facetValueErrors = this.validateFacetValue(facetValue, row, data.facets);
      if (facetValueErrors.length > 0) {
        errors.push(...facetValueErrors);
      }
    });

    // Validate parent-child relationships - these are still errors
    errors.push(...this.validateParentChildRelationships(data.collections));

    // Validate facet code references - these are still errors
    errors.push(...this.validateFacetCodeReferences(data.collections, data.facets));

    return errors;
  }

  private validateCollection(collection: CollectionRow, row: number): ImportError[] {
    const errors: ImportError[] = [];

    if (!collection.name || collection.name.trim() === '') {
      errors.push({
        row,
        sheet: 'Collections',
        field: 'name',
        message: 'Collection name is required',
      });
    }

    if (!collection.slug || collection.slug.trim() === '') {
      errors.push({
        row,
        sheet: 'Collections',
        field: 'slug',
        message: 'Collection slug is required',
      });
    }

    // Validate slug format
    if (collection.slug && !/^[a-z0-9-]+$/.test(collection.slug)) {
      errors.push({
        row,
        sheet: 'Collections',
        field: 'slug',
        message: 'Slug must contain only lowercase letters, numbers, and hyphens',
      });
    }

    // Validate allowedFacetIds format if provided
    if (collection.allowedFacetIds) {
      const facetIds = collection.allowedFacetIds.split(',').map(id => id.trim());
      const invalidIds = facetIds.filter(id => id && isNaN(Number(id)));
      if (invalidIds.length > 0) {
        errors.push({
          row,
          sheet: 'Collections',
          field: 'allowedFacetIds',
          message: `Invalid facet IDs: ${invalidIds.join(', ')}. Must be comma-separated numbers.`,
        });
      }
    }

    return errors;
  }

  private validateFacet(facet: FacetRow, row: number): ImportError[] {
    const errors: ImportError[] = [];

    if (!facet.code || facet.code.trim() === '') {
      errors.push({
        row,
        sheet: 'Facets',
        field: 'code',
        message: 'Facet code is required',
      });
    }

    if (!facet.name || facet.name.trim() === '') {
      errors.push({
        row,
        sheet: 'Facets',
        field: 'name',
        message: 'Facet name is required',
      });
    }

    // Validate code format
    if (facet.code && !/^[a-z0-9-]+$/.test(facet.code)) {
      errors.push({
        row,
        sheet: 'Facets',
        field: 'code',
        message: 'Code must contain only lowercase letters, numbers, and hyphens',
      });
    }

    // Validate isPrivate format
    if (facet.isPrivate && facet.isPrivate !== 'true' && facet.isPrivate !== 'false') {
      errors.push({
        row,
        sheet: 'Facets',
        field: 'isPrivate',
        message: 'isPrivate must be "true" or "false"',
      });
    }

    return errors;
  }

  private validateFacetValue(facetValue: FacetValueRow, row: number, facets: FacetRow[]): ImportError[] {
    const errors: ImportError[] = [];

    if (!facetValue.facetCode || facetValue.facetCode.trim() === '') {
      errors.push({
        row,
        sheet: 'Facet Values',
        field: 'facetCode',
        message: 'Facet code is required',
      });
    }

    if (!facetValue.code || facetValue.code.trim() === '') {
      errors.push({
        row,
        sheet: 'Facet Values',
        field: 'code',
        message: 'Value code is required',
      });
    }

    if (!facetValue.name || facetValue.name.trim() === '') {
      errors.push({
        row,
        sheet: 'Facet Values',
        field: 'name',
        message: 'Value name is required',
      });
    }

    // Validate code format
    if (facetValue.code && !/^[a-z0-9-]+$/.test(facetValue.code)) {
      errors.push({
        row,
        sheet: 'Facet Values',
        field: 'code',
        message: 'Code must contain only lowercase letters, numbers, and hyphens',
      });
    }

    // Validate facetCode exists in facets
    if (facetValue.facetCode) {
      const facetExists = facets.some(f => f.code === facetValue.facetCode);
      if (!facetExists) {
        errors.push({
          row,
          sheet: 'Facet Values',
          field: 'facetCode',
          message: `Facet code "${facetValue.facetCode}" not found in Facets sheet`,
        });
      }
    }

    return errors;
  }

  private validateParentChildRelationships(collections: CollectionRow[]): ImportError[] {
    const errors: ImportError[] = [];
    const slugs = new Set(collections.map(c => c.slug));

    collections.forEach((collection, index) => {
      const row = index + 2;

      if (collection.parentSlug) {
        if (!slugs.has(collection.parentSlug)) {
          errors.push({
            row,
            sheet: 'Collections',
            field: 'parentSlug',
            message: `Parent collection with slug "${collection.parentSlug}" not found`,
          });
        }

        // Check for circular reference
        if (collection.parentSlug === collection.slug) {
          errors.push({
            row,
            sheet: 'Collections',
            field: 'parentSlug',
            message: 'Collection cannot be its own parent',
          });
        }
      }
    });

    return errors;
  }

  private validateFacetCodeReferences(collections: CollectionRow[], facets: FacetRow[]): ImportError[] {
    const errors: ImportError[] = [];
    const facetCodes = new Set(facets.map(f => f.code));

    collections.forEach((collection, index) => {
      const row = index + 2;

      if (collection.allowedFacetIds) {
        // This validation checks if facet IDs are numeric
        // We'll validate actual IDs after facets are created
        const facetIds = collection.allowedFacetIds.split(',').map(id => id.trim());
        const invalidIds = facetIds.filter(id => id && isNaN(Number(id)));
        if (invalidIds.length > 0) {
          errors.push({
            row,
            sheet: 'Collections',
            field: 'allowedFacetIds',
            message: `Invalid facet IDs format: ${invalidIds.join(', ')}`,
          });
        }
      }
    });

    return errors;
  }
}
