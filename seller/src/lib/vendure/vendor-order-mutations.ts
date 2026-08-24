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
                    paymentStatus
                    commissionAmount
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
                    customFields {
                        sellerStatus
                    }
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
                    customFields {
                        sellerStatus
                    }
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

export const UpdateMyOrderLineStatusMutation = graphql(`
    mutation UpdateMyOrderLineStatus($lineId: ID!, $statusCode: String!) {
        updateMyOrderLineSellerStatus(lineId: $lineId, statusCode: $statusCode)
    }
`);

export const GetMyVendorOrderQuery = `
    query GetMyVendorOrder($id: ID!) {
        myVendorOrder(id: $id) {
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
                paymentStatus
                commissionAmount
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
            fulfillments {
                id
                state
                method
                trackingCode
                createdAt
            }
            lines {
                id
                quantity
                unitPriceWithTax
                linePriceWithTax
                customFields {
                    sellerStatus
                }
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
    }
`;

export const FulfillMyVendorOrderMutation = `
    mutation FulfillMyVendorOrder($orderId: ID!, $trackingCode: String, $carrier: String) {
        fulfillMyVendorOrder(orderId: $orderId, trackingCode: $trackingCode, carrier: $carrier) {
            id
            state
            trackingCode
            method
        }
    }
`;

export const GetMyVendorWalletStatsQuery = `
    query GetMyVendorWalletStats {
        myVendorWalletStats {
            totalSales
            platformCommission
            netEarnings
            availableBalance
            pendingBalance
            totalWithdrawn
            pendingWithdrawalAmount
            currencyCode
        }
    }
`;
