import { gql } from 'graphql-tag';

export const commonApiExtensions = gql`
    type GeoZone implements Node {
        id: ID!
        createdAt: DateTime!
        updatedAt: DateTime!
        name: String!
        slug: String!
        code: String
        type: String!
        status: String!
        centerLatitude: Float
        centerLongitude: Float
        radiusMeters: Int
        boundary: JSON
        isActive: Boolean!
        image: String
        banner: String
        icon: String
        parent: GeoZone
        children: [GeoZone!]!
    }

    type Market implements Node {
        id: ID!
        createdAt: DateTime!
        updatedAt: DateTime!
        name: String!
        slug: String!
        description: String
        image: String
        icon: String
        centerLatitude: Float
        centerLongitude: Float
        radiusMeters: Int
        allowedFacetIds: [String!]
        geoZone: GeoZone
        openingHours: JSON
        stats: JSON
    }

    type DeliveryZone implements Node {
        id: ID!
        createdAt: DateTime!
        updatedAt: DateTime!
        ownerId: String
        name: String
        price: Int!
        type: String!
        centerLatitude: Float
        centerLongitude: Float
        radiusMeters: Int
        geoZone: GeoZone
        isActive: Boolean!
    }

    input CreateGeoZoneInput {
        name: String!
        slug: String!
        code: String
        type: String!
        status: String
        centerLatitude: Float
        centerLongitude: Float
        radiusMeters: Int
        parentId: ID
        seoTitle: String
        seoDescription: String
        seoUrl: String
        image: String
        banner: String
        icon: String
        boundary: JSON
    }

    input UpdateGeoZoneInput {
        name: String
        slug: String
        code: String
        type: String
        status: String
        centerLatitude: Float
        centerLongitude: Float
        radiusMeters: Int
        parentId: ID
        seoTitle: String
        seoDescription: String
        seoUrl: String
        image: String
        banner: String
        icon: String
        boundary: JSON
    }

    input CreateMarketInput {
        name: String!
        slug: String!
        description: String
        image: String
        icon: String
        centerLatitude: Float
        centerLongitude: Float
        radiusMeters: Int
        allowedFacetIds: [String!]
        geoZoneId: ID
        openingHours: JSON
    }

    input UpdateMarketInput {
        name: String
        slug: String
        description: String
        image: String
        icon: String
        centerLatitude: Float
        centerLongitude: Float
        radiusMeters: Int
        allowedFacetIds: [String!]
        geoZoneId: ID
        openingHours: JSON
    }

    input CreateDeliveryZoneInput {
        ownerId: String
        name: String
        price: Int!
        type: String
        centerLatitude: Float
        centerLongitude: Float
        radiusMeters: Int
        polygonCoordinates: JSON
        geoZoneId: ID
        isActive: Boolean
    }

    input UpdateDeliveryZoneInput {
        ownerId: String
        name: String
        price: Int
        type: String
        centerLatitude: Float
        centerLongitude: Float
        radiusMeters: Int
        polygonCoordinates: JSON
        isActive: Boolean
        geoZoneId: ID
    }
`;

export const shopApiExtensions = gql`
    extend type Query {
        geoZones(parentId: ID, topLevelOnly: Boolean, parentName: String, type: String): [GeoZone!]!
        geoZone(id: ID, slug: String): GeoZone
        geoZoneBySlug(slug: String!): GeoZone
        markets(geoZoneId: ID): [Market!]!
        market(id: ID, slug: String): Market
        deliveryZones(ownerId: String): [DeliveryZone!]!
        productsInGeoZone(geoZoneId: ID!, limit: Int, offset: Int): [Product!]!
        reverseGeocode(latitude: Float!, longitude: Float!): [GeoZone!]!
    }
`;

export const adminApiExtensions = gql`
    extend type Query {
        geoZones(parentId: ID, topLevelOnly: Boolean, parentName: String, type: String): [GeoZone!]!
        geoZone(id: ID, slug: String): GeoZone
        geoZoneBySlug(slug: String!): GeoZone
        markets(geoZoneId: ID): [Market!]!
        market(id: ID, slug: String): Market
        deliveryZones(ownerId: String): [DeliveryZone!]!
        productsInGeoZone(geoZoneId: ID!, limit: Int, offset: Int): [Product!]!
        reverseGeocode(latitude: Float!, longitude: Float!): [GeoZone!]!
    }

    extend type Mutation {
        createGeoZone(input: CreateGeoZoneInput!): GeoZone!
        updateGeoZone(id: ID!, input: UpdateGeoZoneInput!): GeoZone!
        deleteGeoZone(id: ID!): DeletionResponse!

        createMarket(input: CreateMarketInput!): Market!
        updateMarket(id: ID!, input: UpdateMarketInput!): Market!
        deleteMarket(id: ID!): DeletionResponse!

        createDeliveryZone(input: CreateDeliveryZoneInput!): DeliveryZone!
        updateDeliveryZone(id: ID!, input: UpdateDeliveryZoneInput!): DeliveryZone!
        deleteDeliveryZone(id: ID!): DeletionResponse!

        importBoundaryFromOSM(zoneId: ID!, query: String!): GeoZone!
        importMassiveData(base64Content: String!, format: String!, type: String!): JSON!
    }
`;
