export const GET_COLLECTION_FACET_MAPPINGS = `
    query GetCollectionFacetMappings {
        collectionFacetMappings {
            collectionId
            collectionName
            allowedFacetIds
            ownFacetIds
            inheritedFacetIds
            allowedFacets {
                id
                name
                values {
                    id
                    name
                }
            }
            children {
                collectionId
                collectionName
                allowedFacetIds
                ownFacetIds
                inheritedFacetIds
                allowedFacets {
                    id
                    name
                    values {
                        id
                        name
                    }
                }
                children {
                    collectionId
                    collectionName
                    allowedFacetIds
                    ownFacetIds
                    inheritedFacetIds
                }
                hasChildren
            }
            hasChildren
        }
    }
`;

export const SET_COLLECTION_ALLOWED_FACETS = `
    mutation SetCollectionAllowedFacets($collectionId: ID!, $facetIds: [ID!]!) {
        setCollectionAllowedFacets(collectionId: $collectionId, facetIds: $facetIds) {
            collectionId
            collectionName
            allowedFacetIds
            ownFacetIds
            inheritedFacetIds
            allowedFacets {
                id
                name
                values {
                    id
                    name
                }
            }
            children {
                collectionId
                collectionName
                allowedFacetIds
                ownFacetIds
                inheritedFacetIds
            }
            hasChildren
        }
    }
`;

export const SET_COLLECTION_ALLOWED_FACETS_BULK = `
    mutation SetCollectionAllowedFacetsBulk($collectionIds: [ID!]!, $facetIds: [ID!]!) {
        setCollectionAllowedFacetsBulk(collectionIds: $collectionIds, facetIds: $facetIds) {
            collectionId
            collectionName
            allowedFacetIds
            ownFacetIds
            inheritedFacetIds
            allowedFacets {
                id
                name
                values {
                    id
                    name
                }
            }
        }
    }
`;

export const GET_ALL_FACETS = `
    query GetAllFacets {
        allMappingFacets {
            id
            name
            values {
                id
                name
            }
        }
    }
`;

export const GET_SELLER_DASHBOARD_CONFIG = `
    query GetSellerDashboardConfig {
        sellerDashboardConfig {
            walletPageEnabled
        }
    }
`;

export const UPDATE_SELLER_DASHBOARD_CONFIG = `
    mutation UpdateSellerDashboardConfig($walletPageEnabled: Boolean!) {
        updateSellerDashboardConfig(walletPageEnabled: $walletPageEnabled) {
            walletPageEnabled
        }
    }
`;

export const GET_COLLECTION_OPTION_GROUP_MAPPINGS = `
    query GetCollectionOptionGroupMappings {
        collectionOptionGroupMappings {
            collectionId
            collectionName
            allowedOptionGroupIds
            ownOptionGroupIds
            inheritedOptionGroupIds
            allowedOptionGroups {
                id
                code
                name
                optionsCount
            }
            children {
                collectionId
                collectionName
                allowedOptionGroupIds
                ownOptionGroupIds
                inheritedOptionGroupIds
                allowedOptionGroups {
                    id
                    code
                    name
                    optionsCount
                }
                children {
                    collectionId
                    collectionName
                    allowedOptionGroupIds
                    ownOptionGroupIds
                    inheritedOptionGroupIds
                }
                hasChildren
            }
            hasChildren
        }
    }
`;

export const SET_COLLECTION_ALLOWED_OPTION_GROUPS = `
    mutation SetCollectionAllowedOptionGroups($collectionId: ID!, $optionGroupIds: [ID!]!) {
        setCollectionAllowedOptionGroups(collectionId: $collectionId, optionGroupIds: $optionGroupIds) {
            collectionId
            collectionName
            allowedOptionGroupIds
            ownOptionGroupIds
            inheritedOptionGroupIds
            allowedOptionGroups {
                id
                code
                name
                optionsCount
            }
            children {
                collectionId
                collectionName
                allowedOptionGroupIds
                ownOptionGroupIds
                inheritedOptionGroupIds
            }
            hasChildren
        }
    }
`;

export const SET_COLLECTION_ALLOWED_OPTION_GROUPS_BULK = `
    mutation SetCollectionAllowedOptionGroupsBulk($collectionIds: [ID!]!, $optionGroupIds: [ID!]!) {
        setCollectionAllowedOptionGroupsBulk(collectionIds: $collectionIds, optionGroupIds: $optionGroupIds) {
            collectionId
            collectionName
            allowedOptionGroupIds
            ownOptionGroupIds
            inheritedOptionGroupIds
            allowedOptionGroups {
                id
                code
                name
                optionsCount
            }
        }
    }
`;

export const GET_ALL_OPTION_GROUPS = `
    query GetAllOptionGroups {
        allMappingOptionGroups {
            id
            code
            name
            optionsCount
        }
    }
`;

