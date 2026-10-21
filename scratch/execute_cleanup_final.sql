BEGIN;

-- 1. Create temporary tables to hold IDs to preserve
CREATE TEMP TABLE preserved_vendors AS
SELECT id FROM vendor WHERE id IN (42, 43, 56);

CREATE TEMP TABLE preserved_channels AS
SELECT id FROM channel WHERE id IN (1, 15, 22, 29);

CREATE TEMP TABLE preserved_sellers AS
SELECT id FROM seller WHERE id IN (1, 15, 22, 30);

-- Products to preserve: any product having an offer from the 3 vendors OR created by them
-- Preserves ALL products (approved, pending, or draft) belonging to the 3 target vendors!
CREATE TEMP TABLE preserved_products AS
SELECT DISTINCT p.id 
FROM product p
WHERE p.id IN (
    SELECT pv."productId"
    FROM seller_offer so
    JOIN product_variant pv ON so."productVariantId" = pv.id
    WHERE so."vendorId" IN (SELECT id FROM preserved_vendors)
)
OR p."customFieldsVendorid" IN (SELECT id FROM preserved_vendors);

-- Products to delete: all other products (both active and soft-deleted)
CREATE TEMP TABLE products_to_delete AS
SELECT id FROM product WHERE id NOT IN (SELECT id FROM preserved_products);

-- Variants to delete: all variants under products_to_delete
CREATE TEMP TABLE variants_to_delete AS
SELECT id FROM product_variant WHERE "productId" IN (SELECT id FROM products_to_delete);

-- Vendors to delete
CREATE TEMP TABLE vendors_to_delete AS
SELECT id, "channelId", "sellerId", "userId" FROM vendor WHERE id NOT IN (SELECT id FROM preserved_vendors);

-- Channels to delete
CREATE TEMP TABLE channels_to_delete AS
SELECT id FROM channel WHERE id NOT IN (SELECT id FROM preserved_channels);

-- Sellers to delete
CREATE TEMP TABLE sellers_to_delete AS
SELECT id FROM seller WHERE id NOT IN (SELECT id FROM preserved_sellers);

-- A. DELETE OFFERS NOT BELONGING TO PRESERVED VENDORS
DELETE FROM seller_offer WHERE "vendorId" NOT IN (SELECT id FROM preserved_vendors);

-- B. DELETE SEARCH INDEX FOR DELETED PRODUCTS / VARIANTS / CHANNELS
DELETE FROM search_index_item WHERE "productId" IN (SELECT id FROM products_to_delete);
DELETE FROM search_index_item WHERE "productVariantId" IN (SELECT id FROM variants_to_delete);
DELETE FROM search_index_item WHERE "channelId" IN (SELECT id FROM channels_to_delete);

-- C. DELETE RELATIONS FOR VARIANTS TO DELETE
DELETE FROM collection_product_variants_product_variant WHERE "productVariantId" IN (SELECT id FROM variants_to_delete);
DELETE FROM product_variant_options_product_option WHERE "productVariantId" IN (SELECT id FROM variants_to_delete);
DELETE FROM product_variant_facet_values_facet_value WHERE "productVariantId" IN (SELECT id FROM variants_to_delete);
DELETE FROM product_variant_price WHERE "variantId" IN (SELECT id FROM variants_to_delete);
DELETE FROM product_variant_translation WHERE "baseId" IN (SELECT id FROM variants_to_delete);
DELETE FROM product_variant_asset WHERE "productVariantId" IN (SELECT id FROM variants_to_delete);
DELETE FROM product_variant_channels_channel WHERE "productVariantId" IN (SELECT id FROM variants_to_delete);
DELETE FROM stock_level WHERE "productVariantId" IN (SELECT id FROM variants_to_delete);
DELETE FROM stock_movement WHERE "productVariantId" IN (SELECT id FROM variants_to_delete);
DELETE FROM order_line WHERE "productVariantId" IN (SELECT id FROM variants_to_delete);

-- D. DELETE VARIANTS
DELETE FROM product_variant WHERE id IN (SELECT id FROM variants_to_delete);

-- E. DELETE RELATIONS FOR PRODUCTS TO DELETE
DELETE FROM product_translation WHERE "baseId" IN (SELECT id FROM products_to_delete);
DELETE FROM product_asset WHERE "productId" IN (SELECT id FROM products_to_delete);
DELETE FROM product_channels_channel WHERE "productId" IN (SELECT id FROM products_to_delete);
DELETE FROM product_facet_values_facet_value WHERE "productId" IN (SELECT id FROM products_to_delete);
DELETE FROM product_like WHERE "productId" IN (SELECT id FROM products_to_delete);
DELETE FROM product_option_groups_product_option_group WHERE "productId" IN (SELECT id FROM products_to_delete);

-- F. DELETE PRODUCTS
DELETE FROM product WHERE id IN (SELECT id FROM products_to_delete);

-- G. CLEANUP ORDERS & REFERENCES FOR VENDORS TO DELETE
UPDATE "order" SET "customFieldsVendorid" = NULL WHERE "customFieldsVendorid" IN (SELECT id FROM vendors_to_delete);
UPDATE "order_line" SET "customFieldsAssignedvendorid" = NULL WHERE "customFieldsAssignedvendorid" IN (SELECT id FROM vendors_to_delete);
DELETE FROM withdrawal_request WHERE "vendorId" IN (SELECT id FROM vendors_to_delete);
DELETE FROM chat_message WHERE "vendorId" IN (SELECT id FROM vendors_to_delete);
DELETE FROM dispute WHERE "vendorId" IN (SELECT id FROM vendors_to_delete);
DELETE FROM payout WHERE "vendorId" IN (SELECT id FROM vendors_to_delete);
DELETE FROM settlement WHERE "vendorId" IN (SELECT id FROM vendors_to_delete);
DELETE FROM registration_response WHERE "vendorId" IN (SELECT id FROM vendors_to_delete);
DELETE FROM vendor_like WHERE "vendorId" IN (SELECT id FROM vendors_to_delete);
DELETE FROM vendor_markets_market WHERE "vendorId" IN (SELECT id FROM vendors_to_delete);
UPDATE delivery_mission SET "vendorId" = NULL WHERE "vendorId" IN (SELECT id FROM vendors_to_delete);

-- H. CLEANUP STOCK LOCATIONS
DELETE FROM stock_location WHERE "customFieldsVendorid" IN (SELECT id FROM vendors_to_delete) OR ("customFieldsVendorid" IS NULL AND id NOT IN (1, 3, 10, 17));

-- I. REMOVE VENDOR ROLE FROM OLD VENDOR USERS
DELETE FROM user_roles_role 
WHERE "userId" IN (SELECT "userId" FROM vendors_to_delete WHERE "userId" IS NOT NULL)
  AND "roleId" = (SELECT id FROM role WHERE code = 'vendor');

-- J. DELETE VENDORS
DELETE FROM vendor WHERE id IN (SELECT id FROM vendors_to_delete);

-- K. CLEANUP CHANNELS TO DELETE
DELETE FROM product_channels_channel WHERE "channelId" IN (SELECT id FROM channels_to_delete);
DELETE FROM product_variant_channels_channel WHERE "channelId" IN (SELECT id FROM channels_to_delete);
DELETE FROM collection_channels_channel WHERE "channelId" IN (SELECT id FROM channels_to_delete);
DELETE FROM facet_channels_channel WHERE "channelId" IN (SELECT id FROM channels_to_delete);
DELETE FROM facet_value_channels_channel WHERE "channelId" IN (SELECT id FROM channels_to_delete);
DELETE FROM product_option_channels_channel WHERE "channelId" IN (SELECT id FROM channels_to_delete);
DELETE FROM product_option_group_channels_channel WHERE "channelId" IN (SELECT id FROM channels_to_delete);
DELETE FROM asset_channels_channel WHERE "channelId" IN (SELECT id FROM channels_to_delete);
DELETE FROM customer_channels_channel WHERE "channelId" IN (SELECT id FROM channels_to_delete);
DELETE FROM order_channels_channel WHERE "channelId" IN (SELECT id FROM channels_to_delete);
DELETE FROM role_channels_channel WHERE "channelId" IN (SELECT id FROM channels_to_delete);
DELETE FROM shipping_method_channels_channel WHERE "channelId" IN (SELECT id FROM channels_to_delete);
DELETE FROM payment_method_channels_channel WHERE "channelId" IN (SELECT id FROM channels_to_delete);
DELETE FROM stock_location_channels_channel WHERE "channelId" IN (SELECT id FROM channels_to_delete);
DELETE FROM promotion_channels_channel WHERE "channelId" IN (SELECT id FROM channels_to_delete);
DELETE FROM session WHERE "activeChannelId" IN (SELECT id FROM channels_to_delete);
UPDATE order_line SET "sellerChannelId" = NULL WHERE "sellerChannelId" IN (SELECT id FROM channels_to_delete);
DELETE FROM channel WHERE id IN (SELECT id FROM channels_to_delete);

-- L. CLEANUP SELLERS TO DELETE
DELETE FROM seller_translation WHERE "baseId" IN (SELECT id FROM sellers_to_delete);
DELETE FROM seller WHERE id IN (SELECT id FROM sellers_to_delete);

COMMIT;
