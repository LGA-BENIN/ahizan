const fetch = require('node-fetch');

async function checkVendors() {
    console.log('🔍 Checking vendors in database via GraphQL API...\n');

    const query = `
        query {
            vendors(options: { take: 100 }) {
                totalItems
                items {
                    id
                    name
                    status
                    zone
                    rating
                    ratingCount
                    type
                    email
                }
            }
        }
    `;

    try {
        const response = await fetch('http://localhost:3000/admin-api', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ query }),
        });

        const result = await response.json();

        if (result.errors) {
            console.error('❌ GraphQL Errors:', JSON.stringify(result.errors, null, 2));
            return;
        }

        const vendors = result.data?.vendors;

        if (!vendors) {
            console.error('❌ No vendors data returned');
            return;
        }

        console.log(`✅ Total vendors in database: ${vendors.totalItems}\n`);

        if (vendors.items.length === 0) {
            console.log('⚠️  No vendors found. Run "node populate-vendors.js" to create them.\n');
        } else {
            console.log('📋 Vendors List:\n');
            vendors.items.forEach((v, index) => {
                console.log(`${index + 1}. ${v.name}`);
                console.log(`   ID: ${v.id}`);
                console.log(`   Status: ${v.status}`);
                console.log(`   Zone: ${v.zone || 'N/A'}`);
                console.log(`   Rating: ${v.rating || 0} (${v.ratingCount || 0} reviews)`);
                console.log(`   Type: ${v.type}`);
                console.log(`   Email: ${v.email}`);
                console.log('');
            });
        }
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

checkVendors();
