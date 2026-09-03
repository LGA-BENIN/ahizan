import { graphql } from '@/graphql';

export const ProductCardFragment = graphql(`
    fragment ProductCard on SearchResult {
        productId
        productVariantId
        productName
        productVariantName
        slug
        productAsset {
            id
            preview
        }
        productVariantAsset {
            id
            preview
        }
        priceWithTax {
            __typename
            ... on PriceRange {
                min
                max
            }
            ... on SinglePrice {
                value
            }
        }
        currencyCode
        description
        collectionIds
        facetValueIds
        inStock
    }
`);

export const ActiveCustomerFragment = graphql(`
    fragment ActiveCustomer on Customer {
        id
        firstName
        lastName
        emailAddress
    }
`);
