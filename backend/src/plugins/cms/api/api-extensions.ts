import { gql } from 'graphql-tag';

export const commonApiExtensions = gql`
    type PageSection implements Node {
        id: ID!
        createdAt: DateTime!
        updatedAt: DateTime!
        type: String!
        title: String!
        description: String!
        layout: String!
        order: Int!
        isActive: Boolean!
        dataJson: String
    }

    type Page implements Node {
        id: ID!
        createdAt: DateTime!
        updatedAt: DateTime!
        slug: String!
        title: String!
        type: String!
        isActive: Boolean!
        sections: [PageSection!]!
    }

    type PageList implements PaginatedList {
        items: [Page!]!
        totalItems: Int!
    }

    input PageListOptions {
        skip: Int
        take: Int
        sort: PageSort
        filter: PageFilter
    }

    input PageSort {
        id: SortOrder
        createdAt: SortOrder
        updatedAt: SortOrder
        slug: SortOrder
        title: SortOrder
    }

    input PageFilter {
        slug: StringOperators
        title: StringOperators
    }
`;

export const adminApiExtensions = gql`
    ${commonApiExtensions}

    input CreatePageInput {
        slug: String!
        title: String!
        type: String
        isActive: Boolean
    }

    input UpdatePageInput {
        id: ID!
        slug: String
        title: String
        type: String
        isActive: Boolean
    }

    input CreateSectionInput {
        pageId: ID!
        type: String!
        title: String
        description: String
        layout: String
        order: Int
        isActive: Boolean
        dataJson: String
    }

    input UpdateSectionInput {
        id: ID!
        type: String
        title: String
        description: String
        layout: String
        order: Int
        isActive: Boolean
        dataJson: String
    }

    extend type Query {
        pages(options: PageListOptions): PageList!
        page(id: ID!): Page
    }

    extend type Mutation {
        createPage(input: CreatePageInput!): Page!
        updatePage(input: UpdatePageInput!): Page!
        deletePage(id: ID!): DeletionResponse!
        createSection(input: CreateSectionInput!): PageSection!
        updateSection(input: UpdateSectionInput!): PageSection!
        deleteSection(id: ID!): DeletionResponse!
        initializeHomePage(pageId: ID!): Page
        createCmsAsset(file: Upload!): Asset!
    }
`;

export const shopApiExtensions = gql`
    ${commonApiExtensions}

    extend type Query {
        page(slug: String!): Page
    }
`;
