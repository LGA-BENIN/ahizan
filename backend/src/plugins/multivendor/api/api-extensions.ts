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
        orders: [Order!]
        user: User
        seller: Seller
        channel: Channel
        channelToken: String

        # Legal & Identity
        rccmNumber: String
        rccmFile: Asset
        ifuNumber: String
        ifuFile: Asset
        idCardNumber: String
        idCardFile: Asset

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

    type Settlement implements Node {
        id: ID!
        createdAt: DateTime!
        updatedAt: DateTime!
        vendor: Vendor!
        order: Order!
        grossAmount: Int!
        commissionAmount: Int!
        commissionRate: Float!
        shippingFeeShare: Int!
        penaltyAmount: Int!
        netAmount: Int!
        status: String!
        releaseDate: DateTime
    }

    type Payout implements Node {
        id: ID!
        createdAt: DateTime!
        updatedAt: DateTime!
        vendor: Vendor!
        amount: Int!
        currencyCode: String!
        paymentMethod: String!
        destinationProvider: String
        destinationAccount: String
        status: String!
        initiatedBy: User
        approvedBy: User
        approvedAt: DateTime
        transactionReference: String
        rejectionReason: String
        failureReason: String
    }

    type DeliveryMission implements Node {
        id: ID!
        createdAt: DateTime!
        updatedAt: DateTime!
        order: Order!
        vendor: Vendor
        type: String!
        status: String!
        driverName: String
        driverPhone: String
        pickupAddress: String
        deliveryAddress: String
        otpCode: String
        otpVerifiedAt: DateTime
    }

    type DeliveryVerificationResult {
        success: Boolean!
        message: String!
    }

    type HubArrivalResult {
        isFullyConsolidated: Boolean!
    }

    type FinalDispatchResult {
        mission: DeliveryMission!
        otpCode: String!
    }

    type VendorBalanceResult {
        availableBalance: Int!
        heldBalance: Int!
    }

    type EmailRolesResult {
        exists: Boolean!
        hasClientRole: Boolean!
        hasVendorRole: Boolean!
        isVerified: Boolean!
    }

    # ── Global Option Groups (for variant configurator) ──
    type GlobalOptionValue {
        id: ID!
        code: String!
        name: String!
    }

    type GlobalOptionGroup {
        id: ID!
        code: String!
        name: String!
        options: [GlobalOptionValue!]!
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
        commissionRate: Float

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

    input CreateVendorOptionInput {
        name: String!
        code: String!
    }

    input CreateVendorOptionGroupInput {
        name: String!
        code: String!
        options: [CreateVendorOptionInput!]!
    }

    input CreateVendorVariantInput {
        id: ID
        name: String
        sku: String
        price: Int!
        stock: Int!
        onPromotion: Boolean
        promotionalPrice: Int
        optionCodes: [String!]
        featuredAssetId: ID
    }

    input CreateVendorProductInput {
        name: String!
        description: String!
        shortDescription: String
        slug: String
        price: Int!
        stock: Int!
        collectionIds: [ID!]
        facetValueIds: [ID!]
        assetIds: [ID!]
        featuredAssetId: ID
        enabled: Boolean
        sku: String
        weight: Float
        width: Float
        height: Float
        onPromotion: Boolean
        promotionalPrice: Int
        optionGroups: [CreateVendorOptionGroupInput!]
        variants: [CreateVendorVariantInput!]
        deliveryTimeValue: Int
        deliveryTimeUnit: String
        condition: String
    }

    input UpdateVendorProductInput {
        name: String
        slug: String
        description: String
        shortDescription: String
        collectionIds: [ID!]
        facetValueIds: [ID!]
        assetIds: [ID!]
        featuredAssetId: ID
        enabled: Boolean
        sku: String
        weight: Float
        width: Float
        height: Float
        onPromotion: Boolean
        promotionalPrice: Int
        optionGroups: [CreateVendorOptionGroupInput!]
        variants: [CreateVendorVariantInput!]
        deliveryTimeValue: Int
        deliveryTimeUnit: String
        condition: String
    }

    input UpdateVendorProductVariantInput {
        id: ID!
        price: Int
        stock: Int
        sku: String
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

    type DailySalesPoint {
        date: String!
        rawDate: String!
        revenue: Float!
        ordersCount: Int!
    }

    type VendorDashboardStats {
        totalRevenue: Float!
        monthlyRevenue: Float!
        revenueGrowth: Float!
        totalOrdersCount: Int!
        monthlyOrdersCount: Int!
        ordersGrowth: Float!
        totalProductsCount: Int!
        pendingShipmentCount: Int!
        lowStockCount: Int!
        totalLikesCount: Int!
        currencyCode: String!
        chartData: [DailySalesPoint!]!
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
        reason: String
        transferReference: String
    }

    type VendorFulfillmentResult {
        id: ID!
        state: String!
        trackingCode: String
        method: String
    }

    type VendorWalletStats {
        totalSales: Float!
        platformCommission: Float!
        netEarnings: Float!
        availableBalance: Float!
        pendingBalance: Float!
        totalWithdrawn: Float!
        pendingWithdrawalAmount: Float!
        currencyCode: String!
    }

    enum ProductCondition {
        NEW
        USED
    }

    enum DeliveryTimeUnit {
        HOURS
        DAYS
    }

    type SellerOffer implements Node {
        id: ID!
        createdAt: DateTime!
        updatedAt: DateTime!
        vendor: Vendor!
        productVariant: ProductVariant!
        price: Int!
        stock: Int!
        sku: String
        deliveryTimeValue: Int!
        deliveryTimeUnit: DeliveryTimeUnit!
        condition: ProductCondition!
        onPromotion: Boolean
        promotionalPrice: Int
        featuredAssetId: ID
        status: String
        rejectionReason: String
    }

    input CreateSellerOfferInput {
        productVariantId: ID!
        price: Int!
        stock: Int!
        sku: String
        deliveryTimeValue: Int
        deliveryTimeUnit: DeliveryTimeUnit
        condition: ProductCondition
        onPromotion: Boolean
        promotionalPrice: Int
        featuredAssetId: ID
        status: String
        rejectionReason: String
    }

    input UpdateSellerOfferInput {
        productVariantId: ID!
        price: Int
        stock: Int
        sku: String
        deliveryTimeValue: Int
        deliveryTimeUnit: DeliveryTimeUnit
        condition: ProductCondition
        onPromotion: Boolean
        promotionalPrice: Int
        featuredAssetId: ID
        status: String
        rejectionReason: String
    }

    input TagVariantOfferInput {
        variantId: ID
        productVariantId: ID
        optionIds: [ID!]
        optionCodes: [String!]
        optionNames: [String!]
        name: String
        sku: String
        price: Int!
        stock: Int!
        onPromotion: Boolean
        promotionalPrice: Int
        featuredAssetId: ID
        deliveryTimeValue: Int
        deliveryTimeUnit: DeliveryTimeUnit
        condition: ProductCondition
    }

    input TagProductWithVariantOffersInput {
        productId: ID!
        optionGroups: [CreateVendorOptionGroupInput!]
        offers: [TagVariantOfferInput!]!
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
        myVendorOrder(id: ID!): Order
        myVendorProducts(options: ProductListOptions): ProductList!
        myVendorProduct(id: ID!): Product
        platformSettings: PlatformSettings
        whatsappNumber: String
        orderStatuses: [OrderStatus!]!
        vendorOrderStatuses: [OrderStatus!]!
        myWithdrawals: [WithdrawalRequest!]!
        myVendorDashboardStats: VendorDashboardStats!
        myVendorWalletStats: VendorWalletStats!


        # Global option groups (for variant configurator in seller portal)
        getGlobalOptionGroups: [GlobalOptionGroup!]!

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
        sellerOffersForVariant(variantId: ID!): [SellerOffer!]!
        sellerOffersForProduct(productId: ID!): [SellerOffer!]!
        mySellerOffers: [SellerOffer!]!
        searchOfficialProducts(term: String, take: Int, skip: Int): ProductList!
        vendorSettlements(vendorId: ID!): [Settlement!]!
        vendorAvailableBalance(vendorId: ID!): VendorBalanceResult!
    }

    extend type Mutation {
        testPublicAccess: Boolean!
        applyToBecomeVendor(input: CreateVendorInput!): Vendor!
        updateMyVendorProfile(input: UpdateVendorInput!): Vendor!
        updateMyOrderStatus(orderId: ID!, status: String!): TransitionOrderToStateResult!
        fulfillMyVendorOrder(orderId: ID!, trackingCode: String, carrier: String): VendorFulfillmentResult!
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

        # Logistics Hub & Delivery with OTP Mutations
        markReadyForPickup(orderId: ID!, vendorId: ID!): DeliveryMission!
        recordHubArrival(orderId: ID!, vendorId: ID): HubArrivalResult!
        dispatchForFinalDelivery(orderId: ID!, driverName: String!, driverPhone: String!): FinalDispatchResult!
        verifyDeliveryOtp(orderCode: String!, otpCode: String!): DeliveryVerificationResult!

        # Settlements & Payouts Mutations (4-Eyes)
        requestPayout(vendorId: ID!, amount: Int!, paymentMethod: String, provider: String, accountNumber: String): Payout!
        approvePayout(payoutId: ID!): Payout!

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
        createOrUpdateSellerOffer(input: CreateSellerOfferInput!): SellerOffer!
        deleteSellerOffer(variantId: ID!): Boolean!
        tagProductWithVariantOffers(input: TagProductWithVariantOffersInput!): [SellerOffer!]!
        updateMyVariantOffers(offers: [TagVariantOfferInput!]!): [SellerOffer!]!
        normalizeProductWithAI(id: ID!): Product!
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
        myVendorOrder(id: ID!): Order
        myVendorProduct(id: ID!): Product
        platformSettings: PlatformSettings
        orderStatuses: [OrderStatus!]!
        withdrawalRequests: [WithdrawalRequest!]!
        myVendorDashboardStats: VendorDashboardStats!
        myVendorWalletStats: VendorWalletStats!

        # Email role checking (public — no auth required)
        checkEmailRoles(email: String!): EmailRolesResult!

        # Superadmin Chat Monitoring
        adminConversations: [AdminConversation!]!
        adminChatHistory(customerId: ID!, vendorId: ID!): [ChatMessage!]!
        adminDirectChatHistory(targetId: ID!, targetType: String!): [ChatMessage!]!
        sellerOffersForVariant(variantId: ID!): [SellerOffer!]!
        sellerOffersForProduct(productId: ID!): [SellerOffer!]!
        mySellerOffers: [SellerOffer!]!
        getGlobalOptionGroups: [GlobalOptionGroup!]!
        searchOfficialProducts(term: String, take: Int, skip: Int): ProductList!
        vendorSettlements(vendorId: ID!): [Settlement!]!
        vendorAvailableBalance(vendorId: ID!): VendorBalanceResult!
    }

    extend type Mutation {
        updateVendorStatus(id: ID!, status: String!, reason: String): Vendor!
        createVendor(input: CreateVendorInput!): Vendor!
        updateVendor(id: ID!, input: UpdateVendorInput!): Vendor!
        deleteVendor(id: ID!, deleteProducts: Boolean!, deleteOrders: Boolean!): Boolean!
        updateMyVendorProfile(input: UpdateVendorInput!): Vendor!
        updateMyOrderStatus(orderId: ID!, status: String!): TransitionOrderToStateResult!
        fulfillMyVendorOrder(orderId: ID!, trackingCode: String, carrier: String): VendorFulfillmentResult!
        continueOrderWithoutReassigning(orderId: ID!, lineId: ID): Boolean!
        cancelCustomerOrder(orderId: ID!): Boolean!

        # Logistics Hub & Delivery with OTP Mutations (Admin)
        markReadyForPickup(orderId: ID!, vendorId: ID!): DeliveryMission!
        recordHubArrival(orderId: ID!, vendorId: ID): HubArrivalResult!
        dispatchForFinalDelivery(orderId: ID!, driverName: String!, driverPhone: String!): FinalDispatchResult!
        verifyDeliveryOtp(orderCode: String!, otpCode: String!): DeliveryVerificationResult!

        # Settlements & Payouts Mutations (Admin - 4-Eyes)
        requestPayout(vendorId: ID!, amount: Int!, paymentMethod: String, provider: String, accountNumber: String): Payout!
        approvePayout(payoutId: ID!): Payout!

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
        
        # Superadmin Product Management
        adminCreateProduct(input: CreateVendorProductInput!, vendorId: ID!): Product!
        adminUpdateProduct(id: ID!, input: UpdateVendorProductInput!, vendorId: ID): Product!
        adminUpdateProductVariant(input: UpdateVendorProductVariantInput!): ProductVariant!
        adminReviewProduct(
            id: ID!
            status: String!
            rejectionReason: String
            convertToOfficialCatalog: Boolean
            name: String
            slug: String
            shortDescription: String
            description: String
            officialSku: String
            ean: String
            collectionIds: [ID!]
            facetValueIds: [ID!]
            approveVendorOffer: Boolean
        ): Product!
        adminReviewSellerOffer(id: ID!, status: String!, rejectionReason: String): SellerOffer!
        reassignVariantToProduct(variantId: ID!, targetProductId: ID!, approveOffer: Boolean): ProductVariant!
        createOfficialProductFromVariant(
            variantId: ID!
            name: String!
            slug: String
            shortDescription: String
            description: String
            officialSku: String
            ean: String
            collectionIds: [ID!]
            facetValueIds: [ID!]
            approveOffer: Boolean
        ): Product!
        
        # Order Management (Admin status updates & Reassignment)
        updateOrderAdminStatus(orderId: ID!, status: String!, vendorId: ID): Boolean!
        updateOrderSellerStatus(orderId: ID!, status: String!, vendorId: ID): Boolean!
        updateOrderVendorPaymentStatus(orderId: ID!, isPaid: Boolean!, vendorId: ID): Boolean!
        acceptOrderWithoutCancelledVendor(orderId: ID!, vendorId: ID!): Boolean!
        reassignVendorSubOrder(orderId: ID!, oldVendorId: ID!, newVendorId: ID!): Boolean!
        reassignOrderLineToProduct(orderId: ID!, lineId: ID!, newProductId: ID, newProductName: String, newPrice: Float!, newVendorId: ID!): Boolean!
        deleteVendorOrder(orderId: ID!): Boolean!
        approveWithdrawalRequest(id: ID!): Boolean!
        secondApproveWithdrawalRequest(id: ID!): Boolean!
        rejectWithdrawalRequest(id: ID!, reason: String): Boolean!
        deleteOrderAdmin(id: ID!): Boolean!

        # Superadmin Chat Monitoring Mutations
        adminReplyToConversation(customerId: ID!, vendorId: ID!, content: String!): ChatMessage!
        adminSendDirectMessage(targetId: ID!, targetType: String!, content: String!): ChatMessage!
        deleteChatMessage(id: ID!): ChatMessage!
        modifyChatMessage(id: ID!, content: String!): ChatMessage!
        markChatMessageAsSeen(id: ID!): ChatMessage!
        createOrUpdateSellerOffer(input: CreateSellerOfferInput!): SellerOffer!
        deleteSellerOffer(variantId: ID!): Boolean!
        tagProductWithVariantOffers(input: TagProductWithVariantOffersInput!): [SellerOffer!]!
        updateMyVariantOffers(offers: [TagVariantOfferInput!]!): [SellerOffer!]!
        normalizeProductWithAI(id: ID!): Product!
    }
`;
