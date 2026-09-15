import { gql } from 'graphql-tag';

export const adminApiExtensions = gql`
    extend type Collection {
        allowedFacetIds: [String!]
        allowedOptionGroupIds: [String!]
    }

    extend input CreateCollectionInput {
        allowedFacetIds: [String!]
        allowedOptionGroupIds: [String!]
    }

    extend input UpdateCollectionInput {
        allowedFacetIds: [String!]
        allowedOptionGroupIds: [String!]
    }

    extend type Mutation {
        setCollectionAllowedFacets(collectionId: ID!, facetIds: [ID!]!): CollectionFacetMapping!
        setCollectionAllowedFacetsBulk(collectionIds: [ID!]!, facetIds: [ID!]!): [CollectionFacetMapping!]!
        setCollectionAllowedOptionGroups(collectionId: ID!, optionGroupIds: [ID!]!): CollectionOptionGroupMapping!
        setCollectionAllowedOptionGroupsBulk(collectionIds: [ID!]!, optionGroupIds: [ID!]!): [CollectionOptionGroupMapping!]!
        updateSellerDashboardConfig(walletPageEnabled: Boolean!): SellerDashboardConfig!
    }

    type CollectionFacetMapping {
        collectionId: ID!
        collectionName: String!
        allowedFacetIds: [ID!]!
        ownFacetIds: [ID!]!
        inheritedFacetIds: [ID!]!
        allowedFacets: [Facet!]!
        children: [CollectionFacetMapping!]!
        hasChildren: Boolean!
    }

    type OptionGroupSummary {
        id: ID!
        code: String!
        name: String!
        optionsCount: Int!
    }

    type CollectionOptionGroupMapping {
        collectionId: ID!
        collectionName: String!
        allowedOptionGroupIds: [ID!]!
        ownOptionGroupIds: [ID!]!
        inheritedOptionGroupIds: [ID!]!
        allowedOptionGroups: [OptionGroupSummary!]!
        children: [CollectionOptionGroupMapping!]!
        hasChildren: Boolean!
    }

    type SellerDashboardConfig {
        walletPageEnabled: Boolean!
    }

    extend type Query {
        collectionFacetMappings: [CollectionFacetMapping!]!
        collectionAllowedFacets(collectionId: ID!): CollectionFacetMapping
        allMappingFacets: [Facet!]!
        collectionOptionGroupMappings: [CollectionOptionGroupMapping!]!
        collectionAllowedOptionGroups(collectionId: ID!): CollectionOptionGroupMapping
        allMappingOptionGroups: [OptionGroupSummary!]!
        sellerDashboardConfig: SellerDashboardConfig!
    }
`;

export const shopApiExtensions = gql`
    extend type Collection {
        allowedFacetIds: [String!]
        allowedOptionGroupIds: [String!]
    }

    extend type Query {
        collectionAllowedFacets(collectionId: ID!): CollectionFacetMapping
        collectionAllowedOptionGroups(collectionId: ID!): CollectionOptionGroupMapping
        sellerDashboardConfig: SellerDashboardConfig!
    }

    type OptionGroupSummary {
        id: ID!
        code: String!
        name: String!
        optionsCount: Int!
    }

    type CollectionFacetMapping {
        collectionId: ID!
        collectionName: String!
        allowedFacetIds: [ID!]!
        ownFacetIds: [ID!]!
        inheritedFacetIds: [ID!]!
        allowedFacets: [Facet!]!
    }

    type CollectionOptionGroupMapping {
        collectionId: ID!
        collectionName: String!
        allowedOptionGroupIds: [ID!]!
        ownOptionGroupIds: [ID!]!
        inheritedOptionGroupIds: [ID!]!
        allowedOptionGroups: [OptionGroupSummary!]!
    }

    type SellerDashboardConfig {
        walletPageEnabled: Boolean!
    }
`;

