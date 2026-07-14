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
        isDefault: Boolean!
        isDraft: Boolean!
        isBackup: Boolean!
        draftOwnerId: ID
        draftSessionId: String
        status: String!
        version: Int!
        publishedAt: DateTime
        previousPresetId: ID
        sourcePresetId: ID
        changeHistory: String
        historyPointer: Int!
    }

    type SeasonSchedule implements Node {
        id: ID!
        createdAt: DateTime!
        updatedAt: DateTime!
        name: String!
        startAt: DateTime
        endAt: DateTime
        priority: Int!
        isActive: Boolean!
        preset: PagePreset
    }

    type HabillagePreviewSection {
        id: String!
        type: String!
        title: String
        description: String
        layout: String
        order: Int!
        isActive: Boolean!
        pageSlug: String
        dataJson: String
    }

    type HabillagePreview {
        id: ID!
        name: String!
        isDefault: Boolean!
        isBackup: Boolean!
        sections: [HabillagePreviewSection!]!
    }

    type SiteSeason implements Node {
        id: ID!
        createdAt: DateTime!
        updatedAt: DateTime!
        name: String!
        startDate: DateTime
        endDate: DateTime
        isActive: Boolean!
        preset: PagePreset
        configJson: String
    }

    type Page implements Node {
        id: ID!
        createdAt: DateTime!
        updatedAt: DateTime!
        slug: String!
        title: String!
        metaDescription: String
        metaTitle: String
        metaKeywords: String
        ogImage: String
        image: String
        icon: String
        type: String!
        isActive: Boolean!
        sections: [PageSection!]!
        activePreset: PagePreset
    }

    type CollectionTreeNode {
        id: ID!
        name: String!
        slug: String!
        featuredAsset: Asset
        children: [CollectionTreeNode!]!
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

    input UpdateMarketInput {
        id: ID!
        name: String
        slug: String
        description: String
        image: String
        icon: String
        centerLatitude: Float
        centerLongitude: Float
        radiusMeters: Int
    }

    input UpdateGeographicLocationInput {
        id: ID!
        name: String
        image: String
        icon: String
        centerLatitude: Float
        centerLongitude: Float
        radiusMeters: Int
    }

    input CreatePageInput {
        slug: String!
        title: String!
        metaDescription: String
        metaTitle: String
        metaKeywords: String
        ogImage: String
        image: String
        icon: String
        type: String
        isActive: Boolean
    }

    input UpdatePageInput {
        id: ID!
        slug: String
        title: String
        metaDescription: String
        metaTitle: String
        metaKeywords: String
        ogImage: String
        image: String
        icon: String
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
        isDraft: Boolean
        isBackup: Boolean
        draftOwnerId: ID
        draftSessionId: String
        status: String
        sourcePresetId: ID
    }

    input UpdatePresetInput {
        id: ID!
        name: String
        description: String
        thumbnail: String
        sectionsJson: String
        isDraft: Boolean
        isBackup: Boolean
        isDefault: Boolean
        draftOwnerId: ID
        draftSessionId: String
        status: String
        changeHistory: String
        historyPointer: Int
    }

    input CreateSeasonScheduleInput {
        name: String!
        startAt: DateTime
        endAt: DateTime
        priority: Int
        presetId: ID
    }

    input UpdateSeasonScheduleInput {
        id: ID!
        name: String
        startAt: DateTime
        endAt: DateTime
        priority: Int
        presetId: ID
    }

    input CreateSeasonInput {
        name: String!
        startDate: DateTime
        endDate: DateTime
        isActive: Boolean
        presetId: ID
        configJson: String
    }

    input UpdateSeasonInput {
        id: ID!
        name: String
        startDate: DateTime
        endDate: DateTime
        isActive: Boolean
        presetId: ID
        configJson: String
    }

    extend type Query {
        pages(options: PageListOptions): PageList!
        page(id: ID!): Page
        pagePresets: [PagePreset!]!
        previewPreset(presetId: ID!): Page
        siteSeasons: [SiteSeason!]!
        seasonSchedules: [SeasonSchedule!]!
        getActiveDraft: PagePreset
        cmsFacetValues: [JSON!]!
        cmsCollectionsTree: [CollectionTreeNode!]!
        # Habillage system
        activeHabillage: PagePreset
        habillages(status: String, isBackup: Boolean): [PagePreset!]!
    }

    extend type Mutation {
        updateMarket(input: UpdateMarketInput!): Market!
        updateGeographicLocation(input: UpdateGeographicLocationInput!): GeographicLocation!
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
        createSeason(input: CreateSeasonInput!): SiteSeason!
        updateSeason(input: UpdateSeasonInput!): SiteSeason!
        deleteSeason(id: ID!): DeletionResponse!
        # Draft system
        createDraftFromPreset(presetId: ID!): PagePreset!
        createDraftFromCurrentPage(pageId: ID!): PagePreset!
        updateDraftSection(draftId: ID!, sectionType: String!, sectionDataJson: String!): PagePreset!
        publishDraft(draftId: ID!, pageId: ID!): Page!
        createPresetFromDraft(draftId: ID!, name: String!, description: String): PagePreset!
        updatePresetFromDraft(draftId: ID!, presetId: ID!): PagePreset!
        archivePreset(presetId: ID!): PagePreset!
        restorePresetVersion(presetId: ID!): PagePreset!
        # Habillage system
        createInstantHabillage(name: String!): PagePreset!
        openHabillage(presetId: ID!): PagePreset!
        setHabillageDefault(presetId: ID!): PagePreset!
        unsetHabillageDefault(presetId: ID!): PagePreset!
        undoHabillage(presetId: ID!): PagePreset!
        redoHabillage(presetId: ID!): PagePreset!
        autoSaveHabillage(presetId: ID!, sectionsJson: String!): PagePreset!
        publishHabillage(presetId: ID!, pageId: ID!): Page!
        deleteHabillage(id: ID!): DeletionResponse!
        # SeasonSchedule
        createSeasonSchedule(input: CreateSeasonScheduleInput!): SeasonSchedule!
        updateSeasonSchedule(input: UpdateSeasonScheduleInput!): SeasonSchedule!
        deleteSeasonSchedule(id: ID!): DeletionResponse!
    }
`;

export const shopApiExtensions = gql`
    ${commonApiExtensions}

    extend type Query {
        page(slug: String!): Page
        previewPreset(presetId: ID!): Page
        previewHabillage(presetId: ID!): HabillagePreview
        activeSeason: SiteSeason
        cmsFacetValues: [JSON!]!
        cmsCollectionsTree: [CollectionTreeNode!]!
    }
`;
