import { graphql } from '@/graphql';
import { ActiveCustomerFragment, ProductCardFragment } from './fragments';

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
            state
            totalQuantity
            subTotal
            subTotalWithTax
            shipping
            shippingWithTax
            total
            totalWithTax
            currencyCode
            couponCodes
            discounts {
                description
                amountWithTax
            }
            lines {
                id
                productVariant {
                    id
                    name
                    sku
                    product {
                        id
                        name
                        slug
                        featuredAsset {
                            id
                            preview
                        }
                    }
                }
                unitPriceWithTax
                quantity
                linePriceWithTax
            }
        }
    }
`);

export const GetActiveOrderForCheckoutQuery = graphql(`
    query GetActiveOrderForCheckout {
        activeOrder {
            id
            code
            state
            totalQuantity
            subTotal
            subTotalWithTax
            shipping
            shippingWithTax
            total
            totalWithTax
            currencyCode
            couponCodes
            customer {
                id
                firstName
                lastName
                emailAddress
                phoneNumber
            }
            shippingAddress {
                fullName
                company
                streetLine1
                streetLine2
                city
                province
                postalCode
                country
                phoneNumber
            }
            billingAddress {
                fullName
                company
                streetLine1
                streetLine2
                city
                province
                postalCode
                country
                phoneNumber
            }
            shippingLines {
                shippingMethod {
                    id
                    name
                    description
                }
                priceWithTax
            }
            discounts {
                description
                amountWithTax
            }
            lines {
                id
                productVariant {
                    id
                    name
                    sku
                    product {
                        id
                        name
                        slug
                        featuredAsset {
                            id
                            preview
                        }
                    }
                }
                unitPriceWithTax
                quantity
                linePriceWithTax
            }
        }
    }
`);

export const GetCustomerAddressesQuery = graphql(`
    query GetCustomerAddresses {
        activeCustomer {
            id
            addresses {
                id
                fullName
                company
                streetLine1
                streetLine2
                city
                province
                postalCode
                country {
                    id
                    code
                    name
                }
                phoneNumber
                defaultShippingAddress
                defaultBillingAddress
            }
        }
    }
`);

export const GetEligibleShippingMethodsQuery = graphql(`
    query GetEligibleShippingMethods {
        eligibleShippingMethods {
            id
            name
            code
            description
            priceWithTax
        }
    }
`);

export const GetEligiblePaymentMethodsQuery = graphql(`
    query GetEligiblePaymentMethods {
        eligiblePaymentMethods {
            id
            name
            code
            description
            isEligible
            eligibilityMessage
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
            ...ActiveCustomer
        }
    }
`, [ActiveCustomerFragment]);
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
export const GetCollectionsTreeQuery = graphql(`
    query GetCollectionsTree {
        cmsCollectionsTree {
            id
            name
            slug
            featuredAsset {
                id
                preview
            }
            children {
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

export const GetCollectionAllowedFacetsQuery = graphql(`
    query GetCollectionAllowedFacets($collectionId: ID!) {
        collectionAllowedFacets(collectionId: $collectionId) {
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
`);

export const GetVendorProductQuery = graphql(`
    query GetVendorProduct($id: ID!) {
        product(id: $id) {
            id
            name
            description
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

export const GetProductDetailQuery = graphql(`
    query GetProductDetail($slug: String!) {
        product(slug: $slug) {
            id
            name
            description
            slug
            collections {
                id
                slug
                parent {
                    id
                }
            }
            featuredAsset {
                id
                preview
            }
            assets {
                id
                preview
            }
            variants {
                id
                name
                sku
                priceWithTax
                stockLevel
                options {
                    id
                    code
                    name
                    groupId
                    group {
                        id
                        code
                        name
                    }
                }
            }
            optionGroups {
                id
                code
                name
                options {
                    id
                    code
                    name
                }
            }
            customFields {
                vendor {
                    id
                    name
                    status
                    zone
                    logo {
                        preview
                    }
                }
            }
        }
    }
`);

export const GetOrderDetailQuery = graphql(`
    query GetOrderDetail($code: String!) {
        orderByCode(code: $code) {
            id
            code
            state
            createdAt
            totalWithTax
            currencyCode
            subTotalWithTax
            shippingWithTax
            customer {
                id
            }
            shippingAddress {
                fullName
                company
                streetLine1
                streetLine2
                city
                province
                postalCode
                country
                phoneNumber
            }
            billingAddress {
                fullName
                company
                streetLine1
                streetLine2
                city
                province
                postalCode
                country
                phoneNumber
            }
            payments {
                id
                method
                amount
                state
                transactionId
            }
            shippingLines {
                shippingMethod {
                    id
                    name
                    description
                }
                priceWithTax
            }
            discounts {
                description
                amountWithTax
            }
            lines {
                id
                quantity
                linePriceWithTax
                unitPriceWithTax
                productVariant {
                    id
                    name
                    sku
                    product {
                        id
                        name
                        slug
                        featuredAsset {
                            preview
                        }
                        customFields {
                            vendor {
                                id
                                name
                                phoneNumber
                                zone
                            }
                        }
                    }
                }
            }
        }
    }
`);

export const GetRegistrationFieldsQuery = `
    query GetRegistrationFields {
        registrationFields {
            id
            name
            label
            type
            options {
                label
                value
            }
            required
            order
            enabled
            description
            placeholder
        }
    }
`;
