import { graphql } from '@/graphql';

export const GetVariantVendorQuery = graphql(`
    query GetVariantVendor($variantId: ID!) {
        productVariant(id: $variantId) {
            id
            product {
                customFields {
                    vendor {
                        id
                    }
                }
            }
        }
    }
`);

export const GetActiveOrderQuery = graphql(`
    query GetActiveOrder {
        activeOrder {
            id
            code
            totalQuantity
            totalWithTax
            currencyCode
            lines {
                id
                productVariant {
                    id
                    name
                    product {
                        customFields {
                            vendor {
                                id
                            }
                        }
                    }
                }
                quantity
                linePriceWithTax
            }
        }
    }
`);

export const GetMyVendorProfileQuery = graphql(`
    query GetMyVendorProfile {
        myVendorProfile {
            id
            name
            status
            description
            rejectionReason
            logo {
                preview
            }
        }
    }
`);

export const GetMyVendorFullProfileQuery = graphql(`
    query GetMyVendorFullProfile {
        myVendorProfile {
            id
            name
            status
            description
            rejectionReason
            phoneNumber
            address
            zone
            deliveryInfo
            returnPolicy
            type
            website
            facebook
            instagram
            rccmNumber
            ifuNumber
            idCardNumber
        }
    }
`);

export const GetActiveChannelQuery = graphql(`
    query GetActiveChannel {
        activeChannel {
            id
            token
            defaultTaxZone {
                id
                name
            }
            defaultShippingZone {
                id
                name
            }
            defaultLanguageCode
            defaultCurrencyCode
            pricesIncludeTax
        }
    }
`);

export const GetAvailableCountriesQuery = graphql(`
    query GetAvailableCountries {
        availableCountries {
            id
            name
            code
        }
    }
`);

export const GetTopCollectionsQuery = graphql(`
    query GetTopCollections {
        collections(options: { take: 8, topLevelOnly: true }) {
            items {
                id
                name
                slug
                featuredAsset {
                    id
                    preview
                }
            }
        }
    }
`);

export const GetActiveCustomerQuery = graphql(`
    query GetActiveCustomer {
        activeCustomer {
            id
            firstName
            lastName
            emailAddress
            phoneNumber
        }
    }
`);
export const GetCustomerOrdersQuery = graphql(`
    query GetCustomerOrders($options: OrderListOptions) {
        activeCustomer {
            id
            orders(options: $options) {
                items {
                    id
                    code
                    state
                    createdAt
                    totalWithTax
                    currencyCode
                    lines {
                        id
                    }
                }
                totalItems
            }
        }
    }
`);
export const GetFacetsQuery = graphql(`
    query GetFacets($options: FacetListOptions) {
        facets(options: $options) {
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
`);

export const GetVendorProductQuery = graphql(`
    query GetVendorProduct($id: ID!) {
        product(id: $id) {
            id
            name
            description
            facetValues {
                id
                name
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
