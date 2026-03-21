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
        scheduledStart: DateTime
        scheduledEnd: DateTime
    }

    type PagePreset implements Node {
        id: ID!
        createdAt: DateTime!
        updatedAt: DateTime!
        name: String!
        description: String
        thumbnail: String
        sectionsJson: String!
        isBuiltIn: Boolean!
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
        scheduledStart: DateTime
        scheduledEnd: DateTime
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
        scheduledStart: DateTime
        scheduledEnd: DateTime
    }

    input CreatePresetInput {
        name: String!
        description: String
        thumbnail: String
        sectionsJson: String!
    }

    input UpdatePresetInput {
        id: ID!
        name: String
        description: String
        thumbnail: String
        sectionsJson: String
    }

    extend type Query {
        pages(options: PageListOptions): PageList!
        page(id: ID!): Page
        pagePresets: [PagePreset!]!
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
        createPreset(input: CreatePresetInput!): PagePreset!
        updatePreset(input: UpdatePresetInput!): PagePreset!
        deletePreset(id: ID!): DeletionResponse!
        applyPreset(presetId: ID!, pageId: ID!): Page!
        savePageAsPreset(pageId: ID!, name: String!, description: String): PagePreset!
    }
`;

export const shopApiExtensions = gql`
    ${commonApiExtensions}

    extend type Query {
        page(slug: String!): Page
    }
`;
