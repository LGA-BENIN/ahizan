import { query } from './src/lib/vendure/api';
import { GetProductDetailQuery } from './src/lib/vendure/queries';
import 'dotenv/config';

async function test() {
    console.log('Testing product fetch for "hahahaproductokay"...');
    try {
        const result = await query(GetProductDetailQuery, { slug: 'hahahaproductokay' });
        console.log('Result:', JSON.stringify(result, null, 2));
        if (result.data.product) {
            console.log('Product FOUND:', result.data.product.name);
        } else {
            console.log('Product NOT FOUND');
        }
    } catch (e) {
        console.error('Error fetching product:', e);
    }
}

test();
