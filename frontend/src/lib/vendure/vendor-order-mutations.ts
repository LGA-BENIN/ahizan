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
                updatedAt
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
