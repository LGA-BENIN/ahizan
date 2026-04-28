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
                collections {
                    id
                    name
                    slug
                }
            }
            totalItems
        }
    }
`);

export const GetMyVendorProductQuery = graphql(`
    query GetMyVendorProduct($id: ID!) {
        myVendorProduct(id: $id) {
            id
            name
            description
            slug
            enabled
            collections {
                id
                name
                slug
            }
            variants {
                id
                price
                stockLevel
            }
            assets {
                id
                preview
            }
            featuredAsset {
                id
                preview
            }
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
export const UpdateMyProductMutation = graphql(`
    mutation UpdateMyProduct($id: ID!, $input: UpdateVendorProductInput!) {
        updateMyProduct(id: $id, input: $input) {
            id
            name
            description
            collections {
                id
                name
            }
            assets {
                id
                preview
            }
            featuredAsset {
                id
                preview
            }
        }
    }
`);

export const UpdateMyProductVariantMutation = graphql(`
    mutation UpdateMyProductVariant($input: UpdateVendorProductVariantInput!) {
        updateMyProductVariant(input: $input) {
            id
            price
            stockLevel
        }
    }
`);


export const UploadVendorFileMutation = graphql(`
    mutation UploadVendorFile($file: Upload!) {
        uploadVendorFile(file: $file) {
            id
            preview
        }
    }
`);
