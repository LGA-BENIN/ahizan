const http = require('http');

function graphqlRequest(query, variables = {}, authHeader = null) {
    return new Promise((resolve, reject) => {
        const body = JSON.stringify({ query, variables });
        const req = http.request('http://127.0.0.1:3000/shop-api', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(body),
                ...(authHeader ? { Authorization: authHeader } : {}),
            },
        }, res => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(data);
                    resolve({ status: res.statusCode, headers: res.headers, setCookie: res.headers['set-cookie'], data: parsed });
                } catch (e) {
                    reject(e);
                }
            });
        });
        req.on('error', reject);
        req.write(body);
        req.end();
    });
}

async function main() {
    console.log('--- Step 1: Add Item to Order (Variant 48 / Product 53 - Vendor 31, User 15) ---');
    const addResult = await graphqlRequest(`
        mutation AddItem {
            addItemToOrder(productVariantId: "48", quantity: 1) {
                ... on Order {
                    id
                    code
                    state
                    lines { id productVariant { id name } quantity }
                }
                ... on ErrorResult {
                    errorCode
                    message
                }
            }
        }
    `);
    console.log('AddItem Result:', JSON.stringify(addResult.data, null, 2));

    const token = addResult.headers['vendure-auth-token'];
    const authHeader = token ? `Bearer ${token}` : null;

    console.log('\n--- Step 2: Set Shipping Address ---');
    const addrResult = await graphqlRequest(`
        mutation SetAddress {
            setOrderShippingAddress(input: {
                fullName: "Test Buyer",
                streetLine1: "Rue 100",
                city: "Cotonou",
                countryCode: "BJ",
                phoneNumber: "+22990000000"
            }) {
                ... on Order { id code state }
                ... on ErrorResult { errorCode message }
            }
        }
    `, {}, authHeader);
    console.log('Addr Result:', JSON.stringify(addrResult.data, null, 2));

    console.log('\n--- Step 3: Set Customer ---');
    const custResult = await graphqlRequest(`
        mutation SetCustomer {
            setCustomerForOrder(input: {
                firstName: "Test",
                lastName: "Buyer",
                emailAddress: "testbuyer@ahizan.com"
            }) {
                ... on Order { id code state }
                ... on ErrorResult { errorCode message }
            }
        }
    `, {}, authHeader);
    console.log('Customer Result:', JSON.stringify(custResult.data, null, 2));

    console.log('\n--- Step 4: Set Shipping Method ---');
    const shipMethods = await graphqlRequest(`
        query GetShipMethods {
            eligibleShippingMethods { id code name }
        }
    `, {}, authHeader);
    console.log('Shipping Methods:', JSON.stringify(shipMethods.data, null, 2));
    const shipIds = shipMethods.data?.data?.eligibleShippingMethods?.map(m => m.id) || ["1"];

    const setShip = await graphqlRequest(`
        mutation SetShip($ids: [ID!]!) {
            setOrderShippingMethod(shippingMethodId: $ids) {
                ... on Order { id code state }
                ... on ErrorResult { errorCode message }
            }
        }
    `, { ids: shipIds }, authHeader);
    console.log('Set Shipping Method Result:', JSON.stringify(setShip.data, null, 2));

    console.log('\n--- Step 5: Transition to ArrangingPayment ---');
    const stateResult = await graphqlRequest(`
        mutation Transition {
            transitionOrderToState(state: "ArrangingPayment") {
                ... on Order { id code state }
                ... on ErrorResult { errorCode message }
            }
        }
    `, {}, authHeader);
    console.log('Transition Result:', JSON.stringify(stateResult.data, null, 2));

    console.log('\n--- Step 6: Add Payment ---');
    const paymentMethods = await graphqlRequest(`
        query GetPayMethods {
            eligiblePaymentMethods { id code name }
        }
    `, {}, authHeader);
    console.log('Payment Methods:', JSON.stringify(paymentMethods.data, null, 2));
    const payCode = paymentMethods.data?.data?.eligiblePaymentMethods?.[0]?.code || "gratuit";

    const payResult = await graphqlRequest(`
        mutation AddPayment($code: String!) {
            addPaymentToOrder(input: { method: $code, metadata: {} }) {
                ... on Order { id code state totalWithTax }
                ... on ErrorResult { errorCode message }
            }
        }
    `, { code: payCode }, authHeader);
    console.log('Add Payment Result:', JSON.stringify(payResult.data, null, 2));
}

main().catch(console.error);
