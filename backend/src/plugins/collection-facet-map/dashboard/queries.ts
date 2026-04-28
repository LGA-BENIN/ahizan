import { gql } from 'graphql-tag';

export const GET_COLLECTION_FACET_MAPPINGS = gql`
    query GetCollectionFacetMappings {
        collectionFacetMappings {
            collectionId
            collectionName
            allowedFacetIds
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

export const SET_COLLECTION_ALLOWED_FACETS = gql`
    mutation SetCollectionAllowedFacets($collectionId: ID!, $facetIds: [ID!]!) {
        setCollectionAllowedFacets(collectionId: $collectionId, facetIds: $facetIds) {
            collectionId
            collectionName
            allowedFacetIds
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

export const GET_ALL_FACETS = gql`
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
