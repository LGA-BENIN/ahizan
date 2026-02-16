import { gql } from 'graphql-tag';

const commonExtensions = gql`
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

    type PageSection implements Node {
        id: ID!
        createdAt: DateTime!
        updatedAt: DateTime!
        type: String!
        order: Int!
        isActive: Boolean!
        dataJson: String
    }

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
        order: Int
        isActive: Boolean
        dataJson: String
    }

    input UpdateSectionInput {
        id: ID!
        type: String
        order: Int
        isActive: Boolean
        dataJson: String
    }
`;

export const adminApiExtensions = gql`
    ${commonExtensions}

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
    }

    input PageListOptions {
        skip: Int
        take: Int
        sort: PageSort
        filter: PageFilter
    }

    input PageSort {
        createdAt: SortOrder
        slug: SortOrder
    }

    input PageFilter {
        slug: StringOperators
        title: StringOperators
    }

    type PageList implements PaginatedList {
        items: [Page!]!
        totalItems: Int!
    }
`;

export const shopApiExtensions = gql`
    ${commonExtensions}

    extend type Query {
        page(slug: String!): Page
    }
`;
