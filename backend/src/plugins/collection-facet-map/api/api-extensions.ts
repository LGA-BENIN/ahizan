import { gql } from 'graphql-tag';

export const adminApiExtensions = gql`
    extend type Collection {
        allowedFacetIds: [String!]
    }

    extend input CreateCollectionInput {
        allowedFacetIds: [String!]
    }

    extend input UpdateCollectionInput {
        allowedFacetIds: [String!]
    }

    extend type Mutation {
        setCollectionAllowedFacets(collectionId: ID!, facetIds: [ID!]!): CollectionFacetMapping!
        updateSellerDashboardConfig(walletPageEnabled: Boolean!): SellerDashboardConfig!
    }

    type CollectionFacetMapping {
        collectionId: ID!
        collectionName: String!
        allowedFacetIds: [ID!]!
        ownFacetIds: [ID!]!
        inheritedFacetIds: [ID!]!
        allowedFacets: [Facet!]!
    }

    type SellerDashboardConfig {
        walletPageEnabled: Boolean!
    }

    extend type Query {
        collectionFacetMappings: [CollectionFacetMapping!]!
        collectionAllowedFacets(collectionId: ID!): CollectionFacetMapping
        sellerDashboardConfig: SellerDashboardConfig!
    }
`;

export const shopApiExtensions = gql`
    extend type Collection {
        allowedFacetIds: [String!]
    }

    extend type Query {
        collectionAllowedFacets(collectionId: ID!): CollectionFacetMapping
        sellerDashboardConfig: SellerDashboardConfig!
    }

    type CollectionFacetMapping {
        collectionId: ID!
        collectionName: String!
        allowedFacetIds: [ID!]!
        ownFacetIds: [ID!]!
        inheritedFacetIds: [ID!]!
        allowedFacets: [Facet!]!
    }

    type SellerDashboardConfig {
        walletPageEnabled: Boolean!
    }
`;
