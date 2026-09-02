import { graphql } from '@/graphql';

export const GetMyVendorProductsQuery = graphql(`
    query GetMyVendorProducts($options: ProductListOptions) {
        myVendorProducts(options: $options) {
            items {
                id
                createdAt
                name
                slug
                enabled
                customFields {
                    approvalStatus
                    rejectionReason
                }
                variants {
                    id
                    name
                    sku
                    price
                    priceWithTax
                    currencyCode
                    stockLevel
                    stockOnHand
                    options {
                        id
                        name
                        code
                    }
                    featuredAsset {
                        id
                        preview
                    }
                    customFields {
                        compareAtPrice
                        onPromotion
                        promotionalPrice
                        offerStatus
                        rejectionReason
                    }
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
            customFields {
                approvalStatus
                rejectionReason
                shortDescription
                weight
                width
                height
            }
            collections {
                id
                name
                slug
            }
            facetValues {
                id
                name
                facet {
                    id
                    name
                }
            }
            variants {
                id
                name
                sku
                price
                priceWithTax
                currencyCode
                stockLevel
                stockOnHand
                featuredAsset {
                    id
                    preview
                }
                options {
                    id
                    name
                    code
                }
                customFields {
                    compareAtPrice
                    onPromotion
                    promotionalPrice
                    offerStatus
                    rejectionReason
                    ean
                }
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

export const TagProductWithVariantOffersMutation = graphql(`
    mutation TagProductWithVariantOffers($input: TagProductWithVariantOffersInput!) {
        tagProductWithVariantOffers(input: $input) {
            id
            price
            stock
            sku
            onPromotion
            promotionalPrice
            deliveryTimeValue
            deliveryTimeUnit
            condition
            status
        }
    }
`);

export const UpdateMyVariantOffersMutation = graphql(`
    mutation UpdateMyVariantOffers($offers: [TagVariantOfferInput!]!) {
        updateMyVariantOffers(offers: $offers) {
            id
            price
            stock
            sku
            onPromotion
            promotionalPrice
            deliveryTimeValue
            deliveryTimeUnit
            condition
            status
        }
    }
`);

export const GetGlobalOptionGroupsQuery = graphql(`
    query GetGlobalOptionGroups {
        getGlobalOptionGroups {
            id
            code
            name
            options {
                id
                code
                name
            }
        }
    }
`);

