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
        followersCount: Int
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

        # Payment Reception
        paymentMethod: String
        mobileMoneyProvider: String
        mobileMoneyNumber: String
        bankName: String
        bankAccountNumber: String

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
        logo: Upload
        coverImage: Upload
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
        logo: Upload
        coverImage: Upload
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

        # Payment Reception
        paymentMethod: String
        mobileMoneyProvider: String
        mobileMoneyNumber: String
        bankName: String
        bankAccountNumber: String
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
        collectionIds: [ID!]
        facetValueIds: [ID!]
        assetIds: [ID!]
        featuredAssetId: ID
        onPromotion: Boolean
        promotionalPrice: Int
    }

    input UpdateVendorProductInput {
        name: String
        description: String
        collectionIds: [ID!]
        facetValueIds: [ID!]
        assetIds: [ID!]
        featuredAssetId: ID
        enabled: Boolean
        onPromotion: Boolean
        promotionalPrice: Int
    }

    input UpdateVendorProductVariantInput {
        id: ID!
        price: Int
        stock: Int
        onPromotion: Boolean
        promotionalPrice: Int
    }


    # ── PlatformSettings ──
    type PlatformSettings {
        id: ID!
        platformName: String!
        defaultCommissionRate: Float!
        showVendorContact: Boolean!
        vendorContactFields: JSON
        defaultCurrencyCode: String!
        defaultPhonePrefix: String!
        emailVerificationRequired: Boolean!
        vendorAutoApproval: Boolean!
        placeholderEmailDomain: String!
    }

    input UpdatePlatformSettingsInput {
        platformName: String
        defaultCommissionRate: Float
        showVendorContact: Boolean
        vendorContactFields: JSON
        defaultCurrencyCode: String
        defaultPhonePrefix: String
        emailVerificationRequired: Boolean
        vendorAutoApproval: Boolean
        placeholderEmailDomain: String
    }

    # ── OrderStatus (custom marketplace statuses) ──
    type OrderStatus {
        id: ID!
        code: String!
        label: String!
        color: String!
        order: Int!
        vendorCanSet: Boolean!
        isFinal: Boolean!
        enabled: Boolean!
    }

    input CreateOrderStatusInput {
        code: String!
        label: String!
        color: String
        order: Int
        vendorCanSet: Boolean
        isFinal: Boolean
        enabled: Boolean
    }

    input UpdateOrderStatusInput {
        code: String
        label: String
        color: String
        order: Int
        vendorCanSet: Boolean
        isFinal: Boolean
        enabled: Boolean
    }

    # ── DeliveryZone ──
    type DeliveryZone {
        id: ID!
        name: String!
        code: String!
        price: Int!
        enabled: Boolean!
        order: Int!
    }

    input CreateDeliveryZoneInput {
        name: String!
        code: String!
        price: Int!
        enabled: Boolean
        order: Int
    }

    input UpdateDeliveryZoneInput {
        name: String
        code: String
        price: Int
        enabled: Boolean
        order: Int
    }

    # ── Chat & Message ──
    type ChatMessage {
        id: ID!
        createdAt: DateTime!
        updatedAt: DateTime!
        vendor: Vendor!
        customer: Customer!
        sender: String!
        content: String!
    }

    type Conversation {
        customer: Customer!
        lastMessage: ChatMessage!
    }

    type ProductLikesStats {
        product: Product!
        likesCount: Int!
    }
`;

export const shopApiExtensions = `
    extend type ProductVariant {
        stockOnHand: Int
    }

    extend type Query {
        vendor(id: ID!): Vendor
        vendors(options: VendorListOptions): VendorList!
        myVendorProfile: Vendor
        myVendorOrders(options: OrderListOptions): OrderList!
        myVendorProducts(options: ProductListOptions): ProductList!
        myVendorProduct(id: ID!): Product
        platformSettings: PlatformSettings
        orderStatuses: [OrderStatus!]!
        vendorOrderStatuses: [OrderStatus!]!
        deliveryZones: [DeliveryZone!]!

        # Likes system queries (Shop API)
        isVendorLiked(id: ID!): Boolean!
        isProductLiked(id: ID!): Boolean!
        myLikedVendors(options: VendorListOptions): VendorList!
        myLikedProducts(options: ProductListOptions): ProductList!
        
        # Vendor dashboard queries (Shop API side)
        myVendorLikesCount: Int!
        myVendorLikers(options: CustomerListOptions): CustomerList!
        myVendorProductsLikes: [ProductLikesStats!]!

        # Chat system queries (Shop API)
        myChatHistoryWithVendor(vendorId: ID!): [ChatMessage!]!
        myConversations: [Conversation!]!
        conversationHistoryWithCustomer(customerId: ID!): [ChatMessage!]!
    }

    extend type Mutation {
        testPublicAccess: Boolean!
        applyToBecomeVendor(input: CreateVendorInput!): Vendor!
        updateMyVendorProfile(input: UpdateVendorInput!): Vendor!
        updateMyOrderStatus(orderId: ID!, status: String!): TransitionOrderToStateResult!
        updateMyOrderSellerStatus(orderId: ID!, statusCode: String!): Boolean!
        uploadVendorFile(file: Upload!): Asset!
        
        createMyProduct(input: CreateVendorProductInput!): Product!
        updateMyProduct(id: ID!, input: UpdateVendorProductInput!): Product!
        updateMyProductVariant(input: UpdateVendorProductVariantInput!): ProductVariant!
        deleteMyProduct(id: ID!): DeletionResponse!

        # Likes system mutations (Shop API)
        toggleLikeVendor(id: ID!): Boolean!
        toggleLikeProduct(id: ID!): Boolean!

        # Chat system mutations (Shop API)
        sendChatMessageToVendor(vendorId: ID!, content: String!): ChatMessage!
        replyToCustomer(customerId: ID!, content: String!): ChatMessage!
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
        platformSettings: PlatformSettings
        orderStatuses: [OrderStatus!]!
        deliveryZones: [DeliveryZone!]!
    }

    extend type Mutation {
        updateVendorStatus(id: ID!, status: String!, reason: String): Vendor!
        createVendor(input: CreateVendorInput!): Vendor!
        updateVendor(id: ID!, input: UpdateVendorInput!): Vendor!
        deleteVendor(id: ID!, deleteProducts: Boolean!, deleteOrders: Boolean!): Boolean!
        updateMyVendorProfile(input: UpdateVendorInput!): Vendor!
        updateMyOrderStatus(orderId: ID!, status: String!): TransitionOrderToStateResult!

        # Wallet Management (Super-Admin only)
        creditVendorWallet(vendorId: ID!, amount: Int!, note: String): Vendor!
        debitVendorWallet(vendorId: ID!, amount: Int!, note: String): Vendor!
        setVendorAllowNegativeBalance(vendorId: ID!, allow: Boolean!): Vendor!

        # Platform Settings (Super-Admin only)
        updatePlatformSettings(input: UpdatePlatformSettingsInput!): PlatformSettings!

        # Order Statuses (Super-Admin only)
        createOrderStatus(input: CreateOrderStatusInput!): OrderStatus!
        updateOrderStatus(id: ID!, input: UpdateOrderStatusInput!): OrderStatus!
        deleteOrderStatus(id: ID!): Boolean!

        # Delivery Zones (Super-Admin only)
        createDeliveryZone(input: CreateDeliveryZoneInput!): DeliveryZone!
        updateDeliveryZone(id: ID!, input: UpdateDeliveryZoneInput!): DeliveryZone!
        deleteDeliveryZone(id: ID!): Boolean!

        # Product Management (Required by VendorShopResolver)
        createMyProduct(input: CreateVendorProductInput!): Product!
        updateMyProduct(id: ID!, input: UpdateVendorProductInput!): Product!
        updateMyProductVariant(input: UpdateVendorProductVariantInput!): ProductVariant!
        deleteMyProduct(id: ID!): DeletionResponse!
        uploadVendorFile(file: Upload!): Asset!
        
        # Order Management (Admin status updates)
        updateOrderAdminStatus(orderId: ID!, status: String!): Boolean!
        updateOrderSellerStatus(orderId: ID!, status: String!): Boolean!
    }
`;
