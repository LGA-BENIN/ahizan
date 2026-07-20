import { graphql } from '@/graphql';

export const GetMyVendorOrdersQuery = graphql(`
    query GetMyVendorOrders($options: OrderListOptions) {
        myVendorOrders(options: $options) {
            items {
                id
                code
                state
                totalWithTax
                currencyCode
                createdAt
                updatedAt
                customFields {
                    sellerStatus
                    adminStatus
                }
                customer {
                    firstName
                    lastName
                    emailAddress
                    phoneNumber
                }
                lines {
                    id
                    productVariant {
                        name
                    }
                    quantity
                    linePriceWithTax
                }
            }
            totalItems
        }
    }
`);

export const GetMyVendorOrderDetailQuery = graphql(`
    query GetMyVendorOrderDetail($options: OrderListOptions) {
        myVendorOrders(options: $options) {
            items {
                id
                code
                state
                createdAt
                updatedAt
                totalWithTax
                subTotalWithTax
                shippingWithTax
                currencyCode
                customFields {
                    sellerStatus
                    adminStatus
                }
                customer {
                    id
                    firstName
                    lastName
                    emailAddress
                    phoneNumber
                }
                shippingAddress {
                    fullName
                    streetLine1
                    streetLine2
                    city
                    province
                    postalCode
                    country
                    phoneNumber
                }
                lines {
                    id
                    quantity
                    unitPriceWithTax
                    linePriceWithTax
                    productVariant {
                        id
                        name
                        sku
                        featuredAsset {
                            preview
                        }
                    }
                }
            }
            totalItems
        }
    }
`);

export const UpdateMyOrderStatusMutation = graphql(`
    mutation UpdateMyOrderStatus($orderId: ID!, $status: String!) {
        updateMyOrderStatus(orderId: $orderId, status: $status) {
            ... on Order {
                id
                state
            }
            ... on OrderStateTransitionError {
                errorCode
                message
                transitionError
                fromState
                toState
            }
        }
    }
`);
