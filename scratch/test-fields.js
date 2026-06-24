const VENDURE_API_URL = 'http://localhost:3000/shop-api';

const queryIntrospectionVariant = `
    query {
        __type(name: "ProductVariant") {
            fields {
                name
                type {
                    name
                    kind
                }
            }
        }
    }
`;

const queryIntrospectionProduct = `
    query {
        __type(name: "Product") {
            fields {
                name
                type {
                    name
                    kind
                }
            }
        }
    }
`;

async function runIntrospection() {
    try {
        // 1. Inspecter ProductVariant
        const resVariant = await fetch(VENDURE_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'vendure-token': '__default_channel__'
            },
            body: JSON.stringify({ query: queryIntrospectionVariant })
        });
        const jsonVariant = await resVariant.json();
        const fieldsVariant = jsonVariant.data?.__type?.fields || [];
        console.log('--- CHAMPS DE PRODUCTVARIANT ---');
        console.log(fieldsVariant.map(f => f.name).join(', '));

        // 2. Inspecter Product
        const resProduct = await fetch(VENDURE_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'vendure-token': '__default_channel__'
            },
            body: JSON.stringify({ query: queryIntrospectionProduct })
        });
        const jsonProduct = await resProduct.json();
        const fieldsProduct = jsonProduct.data?.__type?.fields || [];
        console.log('\n--- CHAMPS DE PRODUCT ---');
        console.log(fieldsProduct.map(f => f.name).join(', '));
        
    } catch (e) {
        console.error('Erreur :', e.message);
    }
}

runIntrospection();
