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
        suspensionReason: String
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

        # Geolocation & Markets
        latitude: Float
        longitude: Float
        location: GeoZone
        physicalMarket: Market
        markets: [Market!]
    }

    type EmailRolesResult {
        exists: Boolean!
        hasClientRole: Boolean!
        hasVendorRole: Boolean!
        isVerified: Boolean!
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

        # Geolocation & Markets Input
        latitude: Float
        longitude: Float
        locationId: ID
        physicalMarketId: ID
        marketIds: [ID!]
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

        # Geolocation & Markets Input
        latitude: Float
        longitude: Float
        locationId: ID
        physicalMarketId: ID
        marketIds: [ID!]
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
        shortDescription: String
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
        shortDescription: String
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
        deliveryBaseFee: Int!
        deliveryFeePerKm: Int!
        commissionMode: String!
        collectionCommissionRates: JSON
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
        deliveryBaseFee: Int
        deliveryFeePerKm: Int
        commissionMode: String
        collectionCommissionRates: JSON
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



    # ── Chat & Message ──
    type ChatMessage {
        id: ID!
        createdAt: DateTime!
        updatedAt: DateTime!
        vendor: Vendor
        customer: Customer
        sender: String!
        content: String!
        deleted: Boolean!
        modified: Boolean!
        seen: Boolean!
    }

    type Conversation {
        customer: Customer!
        lastMessage: ChatMessage!
        unreadCount: Int!
    }

    type CustomerConversation {
        vendor: Vendor!
        lastMessage: ChatMessage!
        unreadCount: Int!
    }

    type AdminConversation {
        customer: Customer
        vendor: Vendor
        lastMessage: ChatMessage!
    }

    type ProductLikesStats {
        product: Product!
        likesCount: Int!
    }

    type PlatformPublicStats {
        visitorsCount: Int!
        ordersCount: Int!
        vendorsCount: Int!
        productsCount: Int!
    }

    type WithdrawalRequest {
        id: ID!
        createdAt: DateTime!
        updatedAt: DateTime!
        vendor: Vendor!
        amount: Int!
        status: String!
        mobileMoneyNumber: String
        rejectionReason: String
        transferReference: String
    }
`;

export const shopApiExtensions = `
    extend type ProductVariant {
        stockOnHand: Int
    }

    # ── Unified account system ──

    extend type Query {
        publicPlatformStats: PlatformPublicStats!
        vendor(id: ID!): Vendor
        vendors(options: VendorListOptions, latitude: Float, longitude: Float, marketId: ID, locationId: ID): VendorList!
        myVendorProfile: Vendor
        myVendorOrders(options: OrderListOptions): OrderList!
        myVendorProducts(options: ProductListOptions): ProductList!
        myVendorProduct(id: ID!): Product
        platformSettings: PlatformSettings
        whatsappNumber: String
        orderStatuses: [OrderStatus!]!
        vendorOrderStatuses: [OrderStatus!]!
        myWithdrawals: [WithdrawalRequest!]!


        # Email role checking (public — no auth required)
        checkEmailRoles(email: String!): EmailRolesResult!

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
        myCustomerConversations: [CustomerConversation!]!
        conversationHistoryWithCustomer(customerId: ID!): [ChatMessage!]!
        isTyping(targetId: ID!, targetType: String!): Boolean!
        userOnlineStatus(targetId: ID!, targetType: String!): String!
    }

    extend type Mutation {
        testPublicAccess: Boolean!
        applyToBecomeVendor(input: CreateVendorInput!): Vendor!
        updateMyVendorProfile(input: UpdateVendorInput!): Vendor!
        updateMyOrderStatus(orderId: ID!, status: String!): TransitionOrderToStateResult!
        updateMyOrderSellerStatus(orderId: ID!, statusCode: String!): Boolean!
        updateMyOrderLineSellerStatus(lineId: ID!, statusCode: String!): Boolean!
        continueOrderWithoutReassigning(orderId: ID!, lineId: ID): Boolean!
        acceptOrderWithoutCancelledVendor(orderId: ID!, vendorId: ID!): Boolean!
        cancelCustomerOrder(orderId: ID!): Boolean!
        uploadVendorFile(file: Upload!): Asset!
        
        createMyProduct(input: CreateVendorProductInput!): Product!
        updateMyProduct(id: ID!, input: UpdateVendorProductInput!): Product!
        updateMyProductVariant(input: UpdateVendorProductVariantInput!): ProductVariant!
        deleteMyProduct(id: ID!): DeletionResponse!

        # Unified account: add roles to existing accounts
        addVendorRoleToExistingClient: Vendor!
        addClientRoleToExistingVendor: Boolean!
        requestVendorWithdrawal(amount: Int!): Boolean!

        # Likes system mutations (Shop API)
        toggleLikeVendor(id: ID!): Boolean!
        toggleLikeProduct(id: ID!): Boolean!

        # Chat system mutations (Shop API)
        sendChatMessageToVendor(vendorId: ID!, content: String!): ChatMessage!
        replyToCustomer(customerId: ID!, content: String!): ChatMessage!
        deleteChatMessage(id: ID!): ChatMessage!
        modifyChatMessage(id: ID!, content: String!): ChatMessage!
        markChatMessageAsSeen(id: ID!): ChatMessage!
        setTyping(targetId: ID!, targetType: String!, typing: Boolean!): Boolean!
    }
`;


export const adminApiExtensions = `
    extend type Query {
        publicPlatformStats: PlatformPublicStats!
        vendors(options: VendorListOptions, latitude: Float, longitude: Float, marketId: ID, locationId: ID): VendorList!
        vendor(id: ID!): Vendor
        adminVendorProducts(options: ProductListOptions): ProductList!
        myVendorProfile: Vendor
        myVendorProducts(options: ProductListOptions): ProductList!
        myVendorOrders(options: OrderListOptions): OrderList!
        myVendorProduct(id: ID!): Product
        platformSettings: PlatformSettings
        orderStatuses: [OrderStatus!]!
        withdrawalRequests: [WithdrawalRequest!]!

        # Email role checking (public — no auth required)
        checkEmailRoles(email: String!): EmailRolesResult!

        # Superadmin Chat Monitoring
        adminConversations: [AdminConversation!]!
        adminChatHistory(customerId: ID!, vendorId: ID!): [ChatMessage!]!
        adminDirectChatHistory(targetId: ID!, targetType: String!): [ChatMessage!]!


    }

    extend type Mutation {
        updateVendorStatus(id: ID!, status: String!, reason: String): Vendor!
        createVendor(input: CreateVendorInput!): Vendor!
        updateVendor(id: ID!, input: UpdateVendorInput!): Vendor!
        deleteVendor(id: ID!, deleteProducts: Boolean!, deleteOrders: Boolean!): Boolean!
        updateMyVendorProfile(input: UpdateVendorInput!): Vendor!
        updateMyOrderStatus(orderId: ID!, status: String!): TransitionOrderToStateResult!
        continueOrderWithoutReassigning(orderId: ID!, lineId: ID): Boolean!
        cancelCustomerOrder(orderId: ID!): Boolean!

        # Unified account: add roles to existing accounts
        addVendorRoleToExistingClient: Vendor!
        addClientRoleToExistingVendor: Boolean!

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



        # Product Management (Required by VendorShopResolver)
        createMyProduct(input: CreateVendorProductInput!): Product!
        updateMyProduct(id: ID!, input: UpdateVendorProductInput!): Product!
        updateMyProductVariant(input: UpdateVendorProductVariantInput!): ProductVariant!
        deleteMyProduct(id: ID!): DeletionResponse!
        uploadVendorFile(file: Upload!): Asset!
        
        # Order Management (Admin status updates & Reassignment)
        updateOrderAdminStatus(orderId: ID!, status: String!, vendorId: ID): Boolean!
        updateOrderSellerStatus(orderId: ID!, status: String!, vendorId: ID): Boolean!
        updateOrderVendorPaymentStatus(orderId: ID!, isPaid: Boolean!, vendorId: ID): Boolean!
        acceptOrderWithoutCancelledVendor(orderId: ID!, vendorId: ID!): Boolean!
        reassignVendorSubOrder(orderId: ID!, oldVendorId: ID!, newVendorId: ID!): Boolean!
        reassignOrderLineToProduct(orderId: ID!, lineId: ID!, newProductId: ID, newProductName: String, newPrice: Float!, newVendorId: ID!): Boolean!
        deleteVendorOrder(orderId: ID!): Boolean!
        approveWithdrawalRequest(id: ID!): Boolean!
        rejectWithdrawalRequest(id: ID!, reason: String): Boolean!
        deleteOrderAdmin(id: ID!): Boolean!

        # Superadmin Chat Monitoring Mutations
        adminReplyToConversation(customerId: ID!, vendorId: ID!, content: String!): ChatMessage!
        adminSendDirectMessage(targetId: ID!, targetType: String!, content: String!): ChatMessage!
        deleteChatMessage(id: ID!): ChatMessage!
        modifyChatMessage(id: ID!, content: String!): ChatMessage!
        markChatMessageAsSeen(id: ID!): ChatMessage!
    }
`;
