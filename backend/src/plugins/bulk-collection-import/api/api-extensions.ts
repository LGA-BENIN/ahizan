import { gql } from 'graphql-tag';

export const adminApiExtensions = gql`
  type ImportError {
    row: Int!
    sheet: String!
    field: String!
    message: String!
  }

  type ImportResult {
    success: Boolean!
    message: String!
    collectionsCreated: Int!
    collectionsUpdated: Int!
    facetsCreated: Int!
    facetsUpdated: Int!
    facetValuesCreated: Int!
    facetValuesUpdated: Int!
    errors: [ImportError!]!
  }

  extend type Mutation {
    importCollectionsAndFacets(fileBase64: String!, fileName: String!): ImportResult!
  }

  extend type Query {
    validateImportFile(fileBase64: String!, fileName: String!): ImportResult!
    exportCollectionsAndFacets: String!  # Returns base64 encoded Excel file
  }
`;
