import { gql } from '@vendure/core';

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
        setCollectionAllowedFacets(collectionId: ID!, facetIds: [ID!]!): Collection!
    }

    type CollectionFacetMapping {
        collectionId: ID!
        collectionName: String!
        allowedFacetIds: [ID!]!
        allowedFacets: [Facet!]!
    }

    extend type Query {
        collectionFacetMappings: [CollectionFacetMapping!]!
        collectionAllowedFacets(collectionId: ID!): CollectionFacetMapping
    }
`;

export const shopApiExtensions = gql`
    extend type Collection {
        allowedFacetIds: [String!]
    }

    extend type Query {
        collectionAllowedFacets(collectionId: ID!): CollectionFacetMapping
    }

    type CollectionFacetMapping {
        collectionId: ID!
        collectionName: String!
        allowedFacetIds: [ID!]!
        allowedFacets: [Facet!]!
    }
`;
