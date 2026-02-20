
import { gql } from 'graphql-tag';

export const GET_VENDORS = gql`
    query GetVendors($options: VendorListOptions) {
        vendors(options: $options) {
            items {
                id
                createdAt
                name
                status
                zone
                rating
            }
            totalItems
        }
    }
`;

export const GET_VENDOR_DETAIL = gql`
    query GetVendorDetail($id: ID!) {
        vendor(id: $id) {
            id
            createdAt
            updatedAt
            name
            status
            email
            phoneNumber
            address
            description
            zone
            deliveryInfo
            returnPolicy
            commissionRate
            rating
            ratingCount
            type
            verificationStatus
            logo {
                id
                preview
                source
            }
            coverImage {
                id
                preview
                source
            }
        }
    }
`;

export const UPDATE_VENDOR = gql`
    mutation UpdateVendor($id: ID!, $input: UpdateVendorInput!) {
        updateVendor(id: $id, input: $input) {
            id
            name
            commissionRate
            updatedAt
        }
    }
`;

export const UPDATE_VENDOR_STATUS = gql`
    mutation UpdateVendorStatus($id: ID!, $status: String!, $reason: String) {
        updateVendorStatus(id: $id, status: $status, reason: $reason) {
            id
            status
        }
    }
`;

export const GET_PRODUCTS = gql`
    query GetPublicProducts($options: ProductListOptions) {
        publicProducts(options: $options) {
            items {
                id
                createdAt
                updatedAt
                name
                slug
                enabled
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
                featuredAsset {
                    id
                    preview
                }
                variants {
                    id
                    price
                    currencyCode
                    stockLevel
                }
            }
            totalItems
        }
    }
`;
