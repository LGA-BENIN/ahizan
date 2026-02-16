import { graphql } from '@/graphql';

export const GetMyVendorProductsQuery = graphql(`
    query GetMyVendorProducts($options: ProductListOptions) {
        myVendorProducts(options: $options) {
            items {
                id
                name
                slug
                enabled
                variants {
                    id
                    price
                    priceWithTax
                    stockLevel
                }
                featuredAsset {
                    preview
                }
            }
            totalItems
        }
    }
`);

export const CreateMyProductMutation = graphql(`
    mutation CreateMyProduct($input: CreateVendorProductInput!) {
        createMyProduct(input: $input) {
            id
            name
            slug
            enabled
        }
    }
`);

export const DeleteMyProductMutation = graphql(`
    mutation DeleteMyProduct($id: ID!) {
        deleteMyProduct(id: $id) {
            result
            message
        }
    }
`);
