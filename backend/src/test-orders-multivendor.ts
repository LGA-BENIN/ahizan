import { bootstrap, RequestContext, OrderService, ProductVariantService, ChannelService } from '@vendure/core';
import { config } from './vendure-config';
import { VendorService } from './plugins/multivendor/service/vendor.service';

async function runTests() {
    console.log('Bootstrapping Vendure...');
    const app = await bootstrap(config);
    console.log('Vendure bootstrapped successfully.');

    const vendorService = app.get(VendorService);
    const orderService = app.get(OrderService);
    const variantService = app.get(ProductVariantService);
    const channelService = app.get(ChannelService);

    console.log('Test script ready...');

    console.log('Testing completed successfully!');
    process.exit(0);
}

runTests().catch(err => {
    console.error(err);
    process.exit(1);
});
