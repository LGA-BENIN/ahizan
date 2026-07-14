const fetch = require('node-fetch');

async function testVendors() {
    const loginRes = await fetch('http://127.0.0.1:3000/admin-api', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            query: `mutation { login(username: "superadmin", password: "superadmin") { ... on CurrentUser { id } } }`
        })
    });
    const token = loginRes.headers.get('vendure-auth-token');
    const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
    };

    const vendorsData = [
        {
            name: "Dantokpa High-Tech Center",
            email: "contact@dantokpacenter.bj",
            password: "Password123!",
            phoneNumber: "+229 97 11 22 33",
            address: "Secteur Informatique, Marché Dantokpa, Cotonou",
            zone: "Cotonou - Akpakpa",
            description: "Spécialiste des PC portables professionnels à Dantokpa.",
            physicalMarketId: "1",
            marketIds: ["1"],
            locationId: "4"
        },
        {
            name: "Ganhi Cyber & Pro Laptops",
            email: "info@ganhipro.bj",
            password: "Password123!",
            phoneNumber: "+229 96 44 55 66",
            address: "Avenue Commerciale, Ganhi, Cotonou",
            zone: "Cotonou - Haie Vive",
            description: "Boutique high-tech spécialisée dans les ultrabooks.",
            physicalMarketId: "3",
            marketIds: ["3"],
            locationId: "11"
        },
        {
            name: "Cadjèhoun Laptops & Accessoires",
            email: "ventes@cadjehounpro.bj",
            password: "Password123!",
            phoneNumber: "+229 95 77 88 99",
            address: "Carrefour Cadjèhoun, Cotonou",
            zone: "Cotonou - Cadjèhoun",
            description: "Ordinateurs portables gaming et création numérique.",
            physicalMarketId: "4",
            marketIds: ["4"],
            locationId: "7"
        },
        {
            name: "Fidjrossè Informatique & Agla",
            email: "contact@fidjrossepro.bj",
            password: "Password123!",
            phoneNumber: "+229 91 22 33 44",
            address: "Route des Pêches, Fidjrossè, Cotonou",
            zone: "Cotonou - Fidjrossè",
            description: "Matériel informatique garanti et abordable.",
            physicalMarketId: "1",
            marketIds: ["1"],
            locationId: "6"
        }
    ];

    console.log('--- Test de création des 4 Vendeurs ---');
    for (const v of vendorsData) {
        const createMut = `mutation CreateVendor($input: CreateVendorInput!) {
            createVendor(input: $input) { id name }
        }`;
        const res = await fetch('http://127.0.0.1:3000/admin-api', {
            method: 'POST', headers, body: JSON.stringify({ query: createMut, variables: { input: v } })
        });
        const json = await res.json();
        if (json.errors) {
            console.error(`❌ Erreur sur ${v.name}:`, JSON.stringify(json.errors, null, 2));
        } else {
            const vendorId = json.data.createVendor.id;
            console.log(`✅ Vendeur créé avec succès : ${v.name} (ID: ${vendorId})`);
            // Approve
            const approveMut = `mutation Approve($id: ID!) {
                updateVendorStatus(id: $id, status: "APPROVED") { id status }
            }`;
            await fetch('http://127.0.0.1:3000/admin-api', {
                method: 'POST', headers, body: JSON.stringify({ query: approveMut, variables: { id: vendorId } })
            });
            console.log(`   -> Vendeur (ID: ${vendorId}) approuvé !`);
        }
    }
}
testVendors();
