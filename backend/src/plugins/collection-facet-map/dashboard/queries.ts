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
        facets {
            items {
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
