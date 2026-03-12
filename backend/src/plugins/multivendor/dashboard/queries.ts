
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
                walletBalance
                allowNegativeBalance
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
            walletBalance
            allowNegativeBalance
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

export const CREDIT_VENDOR_WALLET = gql`
    mutation CreditVendorWallet($vendorId: ID!, $amount: Int!, $note: String) {
        creditVendorWallet(vendorId: $vendorId, amount: $amount, note: $note) {
            id
            walletBalance
        }
    }
`;

export const DEBIT_VENDOR_WALLET = gql`
    mutation DebitVendorWallet($vendorId: ID!, $amount: Int!, $note: String) {
        debitVendorWallet(vendorId: $vendorId, amount: $amount, note: $note) {
            id
            walletBalance
        }
    }
`;

export const SET_VENDOR_ALLOW_NEGATIVE_BALANCE = gql`
    mutation SetVendorAllowNegativeBalance($vendorId: ID!, $allow: Boolean!) {
        setVendorAllowNegativeBalance(vendorId: $vendorId, allow: $allow) {
            id
            allowNegativeBalance
        }
    }
`;
