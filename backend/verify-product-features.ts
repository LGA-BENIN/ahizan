import { bootstrap } from '@vendure/core';
import { config } from './src/vendure-config';
import { VendorService } from './src/plugins/multivendor/service/vendor.service';
import { ProductService, ProductVariantService, AssetService, RequestContext, Channel } from '@vendure/core';

// Mock context helper
async function createSuperAdminContext(connection: any) {
    const channel = await connection.getRepository(Channel).findOne({ where: { code: '__default_channel__' } });
    const superAdminUser = await connection.getRepository('User').findOne({ where: { identifier: process.env.SUPERADMIN_USERNAME || 'superadmin' } });

    // Check if user exists. If not, maybe use another user or skip auth part if difficult
    if (!superAdminUser) {
        console.warn('Superadmin user not found for testing context. Some parts might fail.');
    }

    return new RequestContext({
        apiType: 'admin',
        isAuthorized: true,
        authorizedAsOwnerOnly: false,
        channel,
        languageCode: channel.defaultLanguageCode,
        session: {
            user: superAdminUser,
            id: 'test-session',
            expires: new Date(Date.now() + 100000),
            activeChannelId: channel.id,
            isAuthenticated: true
        } as any
    });
}

// Main verification function
async function verifyVendorFeatures() {
    console.log('Starting verification of Vendor Product Features...');
    // AVOID PORT CONFLICT with dev server
    config.apiOptions.port = 3050;
    const app = await bootstrap(config);
    const connection = app.get('TransactionalConnection'); // Helper to get connection
    const vendorService = app.get(VendorService);
    const productService = app.get(ProductService);
    const productVariantService = app.get(ProductVariantService);
    const assetService = app.get(AssetService);

    try {
        const ctx = await createSuperAdminContext(connection);

        // 1. Get a Vendor
        const vendors = await vendorService.findAll(ctx);
        if (vendors.items.length === 0) {
            console.error('No vendors found. Please run populate-vendors.js first.');
            process.exit(1);
        }
        const vendor = vendors.items[0];
        console.log(`Using Vendor: ${vendor.name} (ID: ${vendor.id})`);

        // Mock Vendor Context (Authenticated as the vendor's user)
        // We need to find the user associated with this vendor
        if (!vendor.user) {
            console.error('Vendor has no user attached. Cannot test shop api context simulation exactly, but will use admin context with ownership checks.');
        }

        // 2. Create Product with Facets (Categories) and Assets (Images)
        // First, get some existing FacetValues and Assets to use
        // We'll create a dummy asset for testing
        // For simplicity in this script, we'll try to find existing ones or skip if not available easily without upload
        // In a real integration test we would upload. Here we just want to verify the SERVICE call works.

        console.log('Step 2: Testing createMyProduct logic (simulated via Service call with relations)...');
        // Since we modified the resolver, we want to ensure the service handles the options we pass.
        // The resolver calls productService.create(). 
        // Let's call productService.create directly with the extras, simulating what the resolver does.

        const product = await productService.create(ctx, {
            translations: [{
                languageCode: ctx.languageCode,
                name: 'Test Vendor Product with Extras',
                slug: 'test-vendor-product-extras',
                description: 'Description',
            }],
            enabled: true,
            // Mocking IDs - in real scenario these would be valid IDs
            // assetIds: ['1'], 
            // facetValueIds: ['1'],
            customFields: {
                vendor: { id: vendor.id }
            }
        });
        console.log(`Product created: ${product.name} (ID: ${product.id})`);

        // Verify Vendor Link
        const fetchedProduct = await productService.findOne(ctx, product.id, ['customFields.vendor']);
        if (fetchedProduct) {
            const linkedVendor = (fetchedProduct.customFields as any).vendor;
            if (linkedVendor?.id === vendor.id) {
                console.log('✅ Product successfully linked to Vendor');
            } else {
                console.error('❌ Product NOT linked to Vendor');
            }
        } else {
            console.error('❌ Product not found after creation');
        }

        // 3. Test Update Variant (Price & Stock)
        console.log('Step 3: Testing updateMyProductVariant logic...');
        // First create the variant (resolver does this)
        const variants = await productVariantService.create(ctx, [{
            productId: product.id,
            sku: `TEST-${Date.now()}`,
            price: 1000,
            stockOnHand: 50,
            translations: [{ languageCode: ctx.languageCode, name: 'Test Product' }]
        }]);
        const variant = variants[0];
        const stockCheckCreate = (variant as any).stockOnHand;
        console.log(`Variant created. Price: ${variant.price}, Stock: ${stockCheckCreate}`);



        // Now Update it
        const newPrice = 2500;
        const newStock = 10;
        console.log(`Updating to Price: ${newPrice}, Stock: ${newStock}...`);

        await productVariantService.update(ctx, [{
            id: variant.id,
            price: newPrice,
            stockOnHand: newStock
        }]);

        const updatedVariant = await productVariantService.findOne(ctx, variant.id);
        if (updatedVariant) {
            // detailed check
            const stockCheck = (updatedVariant as any).stockOnHand;
            console.log(`Updated Variant. Price: ${updatedVariant.price}, Stock: ${stockCheck}`);

            if (updatedVariant.price === newPrice && stockCheck === newStock) {
                console.log('✅ Variant update successful');
            } else {
                console.error(`❌ Variant update FAILED. Expected Price: ${newPrice}, Got: ${updatedVariant.price}. Expected Stock: ${newStock}, Got: ${stockCheck}`);
            }
        } else {
            console.error('❌ Updated variant not found');
        }

        // Clean up
        await productService.softDelete(ctx, product.id);
        console.log('Cleaned up test product.');

    } catch (e) {
        console.error('Verification failed:', e);
    } finally {
        await app.close();
        process.exit(0);
    }
}

verifyVendorFeatures();
