export interface CollectionRow {
  name: string;
  nameEn?: string;
  slug: string;
  parentSlug?: string;
  description?: string;
  descriptionEn?: string;
  featuredAssetUrl?: string;
  position?: number;
  allowedFacetIds?: string;
  /** Comma-separated facet value codes used to auto-populate the collection via a facet-value-filter */
  facetValueCodes?: string;
  /** Comma-separated product variant IDs used to populate the collection via the variant-id-filter */
  variantIds?: string;
  /** "true"/"false" - whether to inherit parent collection filters (default true) */
  inheritFilters?: string;
  /** "true"/"false" - whether the collection is private (default false) */
  isPrivate?: string;
}

export interface FacetRow {
  code: string;
  name: string;
  nameEn?: string;
  isPrivate?: string;
}

export interface FacetValueRow {
  facetCode: string;
  code: string;
  name: string;
  nameEn?: string;
}

export interface ParsedExcelData {
  collections: CollectionRow[];
  facets: FacetRow[];
  facetValues: FacetValueRow[];
}

export interface ImportError {
  row: number;
  sheet: string;
  field: string;
  message: string;
}

export interface ImportResult {
  success: boolean;
  message: string;
  collectionsCreated: number;
  collectionsUpdated: number;
  facetsCreated: number;
  facetsUpdated: number;
  facetValuesCreated: number;
  facetValuesUpdated: number;
  errors: ImportError[];
}
