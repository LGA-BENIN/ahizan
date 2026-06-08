export const EXPORT_COLLECTIONS_AND_FACETS = `
  query ExportCollectionsAndFacets {
    exportCollectionsAndFacets
  }
`;

export const IMPORT_COLLECTIONS_AND_FACETS = `
  mutation ImportCollectionsAndFacets($file: Upload!) {
    importCollectionsAndFacets(file: $file) {
      success
      message
      collectionsCreated
      collectionsUpdated
      facetsCreated
      facetsUpdated
      facetValuesCreated
      facetValuesUpdated
      errors {
        row
        sheet
        field
        message
      }
    }
  }
`;
