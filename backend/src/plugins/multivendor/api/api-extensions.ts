import { gql } from 'graphql-tag';

export const commonApiExtensions = `
    type Vendor implements Node {
        id: ID!
        createdAt: DateTime!
        updatedAt: DateTime!
        name: String!
        status: String!
        email: String
        phoneNumber: String
        address: String
    }

    input CreateVendorInput {
        name: String!
        email: String!
        phoneNumber: String
        address: String
    }
`;

export const shopApiExtensions = `
    extend type Mutation {
        applyToBecomeVendor(input: CreateVendorInput!): Vendor!
    }
`;

export const adminApiExtensions = `
    extend type Query {
        vendors(options: VendorListOptions): VendorList!
        vendor(id: ID!): Vendor
    }

    extend type Mutation {
        updateVendorStatus(id: ID!, status: String!): Vendor!
        createVendor(input: CreateVendorInput!): Vendor!
    }

    input VendorListOptions {
        skip: Int
        take: Int
        sort: VendorListSort
        filter: VendorListFilter
    }

    input VendorListSort {
        createdAt: SortOrder
        name: SortOrder
    }

    input VendorListFilter {
        name: StringOperators
        status: StringOperators
    }

    type VendorList implements PaginatedList {
        items: [Vendor!]!
        totalItems: Int!
    }
`;
