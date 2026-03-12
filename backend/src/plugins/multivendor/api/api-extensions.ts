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
        description: String
        logo: Asset
        coverImage: Asset
        zone: String
        deliveryInfo: String
        returnPolicy: String
        rating: Float
        ratingCount: Int
        type: String
        verificationStatus: Boolean
        commissionRate: Float
        rejectionReason: String
        products: [Product!]
        user: User

        # Legal & Identity
        rccmNumber: String
        ifuNumber: String
        idCardNumber: String

        # Social & Web
        website: String
        facebook: String
        instagram: String

        dynamicDetails: JSON

        # Wallet
        walletBalance: Int
        allowNegativeBalance: Boolean
    }

    input CreateVendorInput {
        name: String
        firstName: String
        lastName: String
        email: String
        password: String
        phoneNumber: String
        address: String
        description: String
        logoId: ID
        coverImageId: ID
        zone: String
        deliveryInfo: String
        returnPolicy: String
        rating: Float
        ratingCount: Int
        type: String

        # New Fields
        rccmNumber: String
        rccmFile: Upload
        ifuNumber: String
        ifuFile: Upload
        idCardNumber: String
        idCardFile: Upload
        website: String
        facebook: String
        instagram: String
        
        dynamicDetails: JSON
    }

    input UpdateVendorInput {
        name: String
        firstName: String
        lastName: String
        email: String
        phoneNumber: String
        address: String
        description: String
        logoId: ID
        coverImageId: ID
        zone: String
        deliveryInfo: String
        returnPolicy: String
        rating: Float
        ratingCount: Int
        type: String
        commissionRate: Float
        status: String
        rejectionReason: String

        # New Fields
        rccmNumber: String
        rccmFile: Upload
        ifuNumber: String
        ifuFile: Upload
        idCardNumber: String
        idCardFile: Upload
        website: String
        facebook: String
        instagram: String
        
        dynamicDetails: JSON
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
        rating: SortOrder
        commissionRate: SortOrder
    }

    input VendorListFilter {
        name: StringOperators
        status: StringOperators
        zone: StringOperators
        email: StringOperators
        phoneNumber: StringOperators
        type: StringOperators
        createdAt: DateOperators
        rating: NumberOperators
        commissionRate: NumberOperators
    }

    type VendorList implements PaginatedList {
        items: [Vendor!]!
        totalItems: Int!
    }

    input CreateVendorProductInput {
        name: String!
        description: String!
        price: Int!
        stock: Int!
        facetValueIds: [ID!]
        assetIds: [ID!]
        featuredAssetId: ID
    }

    input UpdateVendorProductInput {
        name: String
        description: String
        facetValueIds: [ID!]
        assetIds: [ID!]
        featuredAssetId: ID
        enabled: Boolean
    }

    input UpdateVendorProductVariantInput {
        id: ID!
        price: Int
        stock: Int
    }

    input CreateVendorFacetValueInput {
        name: String!
        facetId: ID!
    }
`;

export const shopApiExtensions = `
    extend type Query {
        vendor(id: ID!): Vendor
        vendors(options: VendorListOptions): VendorList!
        myVendorProfile: Vendor
        myVendorOrders(options: OrderListOptions): OrderList!
        myVendorProducts(options: ProductListOptions): ProductList!
        myVendorProduct(id: ID!): Product
    }

    extend type Mutation {
        testPublicAccess: Boolean!
        applyToBecomeVendor(input: CreateVendorInput!): Vendor!
        updateMyVendorProfile(input: UpdateVendorInput!): Vendor!
        updateMyOrderStatus(orderId: ID!, status: String!): TransitionOrderToStateResult!
        uploadVendorFile(file: Upload!): Asset!
        
        createMyProduct(input: CreateVendorProductInput!): Product!
        updateMyProduct(id: ID!, input: UpdateVendorProductInput!): Product!
        updateMyProductVariant(input: UpdateVendorProductVariantInput!): ProductVariant!
        createVendorFacetValue(input: CreateVendorFacetValueInput!): FacetValue!
        deleteMyProduct(id: ID!): DeletionResponse!
    }
`;

export const adminApiExtensions = `
    extend type Query {
        vendors(options: VendorListOptions): VendorList!
        vendor(id: ID!): Vendor
        adminVendorProducts(options: ProductListOptions): ProductList!
        myVendorProfile: Vendor
        myVendorProducts(options: ProductListOptions): ProductList!
        myVendorOrders(options: OrderListOptions): OrderList!
        myVendorProduct(id: ID!): Product
    }

    extend type Mutation {
        updateVendorStatus(id: ID!, status: String!, reason: String): Vendor!
        createVendor(input: CreateVendorInput!): Vendor!
        updateVendor(id: ID!, input: UpdateVendorInput!): Vendor!
        updateMyVendorProfile(input: UpdateVendorInput!): Vendor!
        updateMyOrderStatus(orderId: ID!, status: String!): TransitionOrderToStateResult!

        # Wallet Management (Super-Admin only)
        creditVendorWallet(vendorId: ID!, amount: Int!, note: String): Vendor!
        debitVendorWallet(vendorId: ID!, amount: Int!, note: String): Vendor!
        setVendorAllowNegativeBalance(vendorId: ID!, allow: Boolean!): Vendor!

        # Product Management (Required by VendorShopResolver)
        createMyProduct(input: CreateVendorProductInput!): Product!
        updateMyProduct(id: ID!, input: UpdateVendorProductInput!): Product!
        updateMyProductVariant(input: UpdateVendorProductVariantInput!): ProductVariant!
        createVendorFacetValue(input: CreateVendorFacetValueInput!): FacetValue!
        deleteMyProduct(id: ID!): DeletionResponse!
        uploadVendorFile(file: Upload!): Asset!
    }
`;
