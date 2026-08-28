const fetch = require('node-fetch');

async function seed() {
    console.log('--- Démarrage du script de peuplement PC & Multivendeur ---');
    try {
        // 1. Connexion Superadmin
        const loginRes = await fetch('http://127.0.0.1:3000/admin-api', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                query: `mutation { login(username: "superadmin", password: "superadmin") { ... on CurrentUser { id } } }`
            })
        });
        const token = loginRes.headers.get('vendure-auth-token');
        if (!token) {
            throw new Error('Impossible de récupérer le token administrateur.');
        }
        console.log('✅ Connecté avec succès au serveur Vendure.');

        const headers = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        };

        async function queryAdmin(query, variables = {}) {
            const r = await fetch('http://127.0.0.1:3000/admin-api', {
                method: 'POST',
                headers,
                body: JSON.stringify({ query, variables })
            });
            const json = await r.json();
            if (json.errors) {
                console.error('GraphQL Error:', JSON.stringify(json.errors, null, 2));
            }
            return json.data;
        }

        // 2. Création et validation des 4 vendeurs PC
        const vendorsData = [
            {
                name: "Dantokpa Tech Store",
                email: "contact@dantokpatech.bj",
                password: "Password123!",
                phoneNumber: "+229 97 11 22 33",
                address: "Secteur Informatique, Marché Dantokpa, Cotonou",
                zone: "Cotonou - Akpakpa",
                description: "Spécialiste des PC portables professionnels et stations de travail à Dantokpa.",
                physicalMarketId: "1", // Marché Dantokpa
                marketIds: ["1"],
                locationId: "4" // Akpakpa Dodomè
            },
            {
                name: "Ganhi Cyber & PC",
                email: "info@ganhicyber.bj",
                password: "Password123!",
                phoneNumber: "+229 96 44 55 66",
                address: "Avenue Commerciale, Ganhi, Cotonou",
                zone: "Cotonou - Haie Vive",
                description: "Boutique high-tech spécialisée dans les ultrabooks et accessoires Apple/PC.",
                physicalMarketId: "3", // Marché Moderne de Ganhi
                marketIds: ["3"],
                locationId: "11" // Haie Vive
            },
            {
                name: "Cadjèhoun Laptops Hub",
                email: "ventes@cadjehounlaptops.bj",
                password: "Password123!",
                phoneNumber: "+229 95 77 88 99",
                address: "Carrefour Cadjèhoun, Cotonou",
                zone: "Cotonou - Cadjèhoun",
                description: "Ordinateurs portables gaming, création numérique et bureautique haut de gamme.",
                physicalMarketId: "4", // Marché de Cadjèhoun
                marketIds: ["4"],
                locationId: "7" // Cadjèhoun
            },
            {
                name: "Fidjrossè Informatique Pro",
                email: "contact@fidjrossepc.bj",
                password: "Password123!",
                phoneNumber: "+229 91 22 33 44",
                address: "Route des Pêches, Fidjrossè, Cotonou",
                zone: "Cotonou - Fidjrossè",
                description: "Matériel informatique garanti pour étudiants, professionnels et entreprises.",
                physicalMarketId: "1", // Marché Dantokpa
                marketIds: ["1"],
                locationId: "6" // Fidjrossè
            }
        ];

        console.log('\n🏪 Création et validation des vendeurs...');
        const createdVendors = [];

        for (const v of vendorsData) {
            const createMut = `mutation CreateVendor($input: CreateVendorInput!) {
                createVendor(input: $input) { id name }
            }`;
            const resV = await queryAdmin(createMut, { input: v });
            if (resV?.createVendor?.id) {
                const vendorId = resV.createVendor.id;
                // Approuver le vendeur
                const approveMut = `mutation Approve($id: ID!) {
                    updateVendorStatus(id: $id, status: "APPROVED") { id status }
                }`;
                await queryAdmin(approveMut, { id: vendorId });
                console.log(`   + Vendeur créé et approuvé : ${v.name} (ID: ${vendorId}, Marché ID: ${v.physicalMarketId}, Quartier ID: ${v.locationId})`);
                createdVendors.push({ id: vendorId, name: v.name });
            } else {
                console.warn(`   ! Erreur lors de la création de ${v.name}`);
            }
        }

        // 3. Liste de 52 produits PC / Laptops (13 par vendeur)
        const productsList = [
            // Vendeur 0: Dantokpa Tech Store (13 produits)
            { title: "HP EliteBook 840 G8 Core i5 11e Gén", price: 320000, desc: "Ultraportable professionnel 14 pouces, 16 Go RAM, 512 Go SSD NVMe, Écran FHD IPS, Windows 11 Pro." },
            { title: "Lenovo ThinkPad T14s Gen 2 Ryzen 7 PRO", price: 380000, desc: "Poids plume et robustesse militaire, AMD Ryzen 7 PRO 5850U, 16 Go RAM, 512 Go SSD, clavier rétroéclairé." },
            { title: "Dell Latitude 7420 Core i7 11e Gén", price: 395000, desc: "Finition fibre de carbone, Intel Core i7-1185G7, 16 Go RAM, 512 Go SSD, autonomie longue durée." },
            { title: "HP ProBook 450 G8 Core i5", price: 265000, desc: "Portable polyvalent 15.6 pouces avec pavé numérique, Intel Core i5, 8 Go RAM, 256 Go SSD rapide." },
            { title: "Lenovo ThinkPad X1 Carbon Gen 9 Core i7", price: 490000, desc: "L'excellence professionnelle ultralégère (1.13 kg), Écran 14 pouces 16:10 WUXGA, 16 Go RAM, 512 Go SSD." },
            { title: "Dell Vostro 3510 Core i5 11e Gén", price: 245000, desc: "Idéal pour la bureautique intensive et la comptabilité, écran 15.6 FHD anti-reflet, 8 Go RAM, 512 Go SSD." },
            { title: "HP EliteBook 830 G7 Core i5 10e Gén", price: 250000, desc: "Compact 13.3 pouces tout aluminium, 16 Go RAM DDR4, 256 Go SSD, sécurité biométrique intégrée." },
            { title: "Lenovo ThinkPad E15 Gen 3 AMD Ryzen 5", price: 275000, desc: "Écran 15.6 pouces FHD, processeur Ryzen 5 5500U 6 cœurs, 8 Go RAM, 512 Go SSD, châssis aluminium." },
            { title: "Dell Latitude 5420 Core i5 11e Gén", price: 290000, desc: "Fiabilité entreprise, Wi-Fi 6, connectique complète avec Thunderbolt 4, 16 Go RAM, 256 Go SSD." },
            { title: "HP ZBook Firefly 14 G8 Workstation", price: 460000, desc: "Station de travail mobile légère, Intel Core i7, carte graphique dédiée NVIDIA T500, 16 Go RAM, 512 Go SSD." },
            { title: "Lenovo ThinkPad P14s Workstation Core i7", price: 470000, desc: "Conçu pour l'ingénierie et la modélisation 3D, écran certifié couleur, 16 Go RAM, 1 To SSD." },
            { title: "Dell Precision 3560 Workstation Core i7", price: 480000, desc: "Performances graphiques certifiées ISV, processeur Intel Core i7, 16 Go RAM, 512 Go SSD." },
            { title: "HP 250 G8 Notebook PC Core i3", price: 185000, desc: "L'essentiel pour les étudiants et tâches bureautiques quotidiennes, 8 Go RAM, 256 Go SSD rapide." },

            // Vendeur 1: Ganhi Cyber & PC (13 produits)
            { title: "Apple MacBook Pro 14 M1 Pro 16Go", price: 790000, desc: "Écran Liquid Retina XDR exceptionnel, Puce Apple M1 Pro 8 cœurs, 16 Go Mémoire unifiée, 512 Go SSD." },
            { title: "Apple MacBook Air M2 13.6 Minuit", price: 680000, desc: "Design ultra-fin et silencieux sans ventilateur, Puce Apple M2, 8 Go Mémoire unifiée, 256 Go SSD." },
            { title: "Asus ZenBook 14 OLED Core i7 12e Gén", price: 540000, desc: "Écran OLED 2.8K 90Hz époustouflant, Intel Core i7-1260P, 16 Go LPDDR5, 512 Go SSD PCIe 4.0." },
            { title: "Dell XPS 13 9310 Core i7 Écran Tactile", price: 560000, desc: "Écran InfinityEdge presque sans bordures, châssis aluminium usiné, Core i7, 16 Go RAM, 512 Go SSD." },
            { title: "HP Spectre x360 14 Convertible Core i7", price: 580000, desc: "Portable 2-en-1 convertible en tablette, écran tactile OLED avec stylet inclus, 16 Go RAM, 1 To SSD." },
            { title: "Microsoft Surface Laptop 4 Ryzen 5 Écran Tactile", price: 420000, desc: "Design minimaliste et clavier ultra-confortable, finition Alcantara, écran PixelSense 13.5 tactile, 8 Go RAM, 256 Go." },
            { title: "Apple MacBook Pro 16 M2 Pro 16Go 1To", price: 980000, desc: "Pour les créateurs vidéo et musiciens professionnels, Puce M2 Pro, batterie gigantesque, 1 To SSD." },
            { title: "Apple MacBook Air M1 2020 Gris Sidéral", price: 450000, desc: "Le meilleur rapport qualité/prix de l'écosystème Apple, Puce M1, 8 Go RAM, 256 Go SSD, autonomie 18h." },
            { title: "Asus ZenBook Duo 14 Double Écran Tactile", price: 620000, desc: "Révolutionnaire avec ScreenPad Plus inclinable, parfait pour le multitâche visuel, Core i7, 16 Go RAM, 512 Go SSD." },
            { title: "MSI Prestige 14 Evo Core i7 11e Gén Blanc", price: 440000, desc: "Élégance pure en blanc pur, certifié Intel Evo, 1.29 kg, 16 Go RAM, 512 Go SSD." },
            { title: "HP ENVY 13 x360 Ryzen 5 Convertible", price: 385000, desc: "Polyvalent 2-en-1 tactile, châssis tout métal, AMD Ryzen 5 5600U, 8 Go RAM, 512 Go SSD." },
            { title: "Samsung Galaxy Book Pro 360 Écran AMOLED", price: 510000, desc: "Épaisseur incroyable et écran AMOLED lumineux, S-Pen fourni, Intel Core i7, 16 Go RAM, 512 Go SSD." },
            { title: "Asus VivoBook 15 OLED Core i5 11e Gén", price: 330000, desc: "Découvrez les couleurs vibrantes de la technologie OLED à prix accessible, 8 Go RAM, 512 Go SSD." },

            // Vendeur 2: Cadjèhoun Laptops Hub (13 produits)
            { title: "Lenovo Legion 5 Gaming Ryzen 7 RTX 3060", price: 610000, desc: "Puissance de jeu brute, AMD Ryzen 7 5800H, NVIDIA GeForce RTX 3060 6Go, Écran 15.6 165Hz, 16 Go RAM, 512 Go SSD." },
            { title: "Asus ROG Zephyrus G14 Ryzen 9 RTX 3060", price: 650000, desc: "Le gaming au format 14 pouces compact avec affichage AniMe Matrix au dos, Ryzen 9, 16 Go RAM, 1 To SSD." },
            { title: "Acer Predator Helios 300 Core i7 RTX 3060", price: 630000, desc: "Refroidissement Aeroblade 3D, Écran FHD 144Hz, Intel Core i7 11800H, 16 Go RAM DDR4, 512 Go SSD." },
            { title: "HP Omen 16 Gaming Core i7 RTX 3070", price: 720000, desc: "Grand écran 16.1 pouces QHD 165Hz, carte graphique surpuissante RTX 3070 8Go, 16 Go RAM, 1 To SSD." },
            { title: "Asus TUF Gaming A15 Ryzen 7 RTX 3050", price: 480000, desc: "Robustesse certifiée MIL-STD-810H, écran 144Hz fluidité garantie, AMD Ryzen 7 4800H, 16 Go RAM, 512 Go SSD." },
            { title: "MSI GF63 Thin Core i5 GTX 1650", price: 360000, desc: "PC portable gamer léger et accessible, Intel Core i5 10e Gén, NVIDIA GTX 1650 4Go, 8 Go RAM, 512 Go SSD." },
            { title: "Gigabyte AORUS 15G Core i7 RTX 3070 32Go", price: 760000, desc: "Clavier mécanique à commutateurs OMRON intégrés, écran 240Hz pour l'eSport, Core i7, 32 Go RAM, 1 To SSD." },
            { title: "Razer Blade 15 Base Core i7 RTX 3060", price: 690000, desc: "Châssis monobloc en aluminium CNC noir mat, éclairage Chroma RGB, Core i7, 16 Go RAM, 512 Go SSD." },
            { title: "Asus ROG Strix G15 Ryzen 9 RTX 3070", price: 740000, desc: "Barre lumineuse LED sur le contour, refroidissement métal liquide, Ryzen 9 5900HX, 16 Go RAM, 1 To SSD." },
            { title: "Acer Nitro 5 Gaming Core i5 RTX 3050", price: 440000, desc: "L'entrée parfaite dans le monde du PC Gaming moderne avec DLSS, Core i5 11400H, 16 Go RAM, 512 Go SSD." },
            { title: "Lenovo IdeaPad Gaming 3 AMD Ryzen 5", price: 395000, desc: "Conception discrète et efficace pour jeu et travail, Ryzen 5 5600H, GTX 1650, 8 Go RAM, 512 Go SSD." },
            { title: "Lenovo IdeaPad 5 Pro 16 Pouces Ryzen 5", price: 430000, desc: "Grand écran 16:10 2.5K 120Hz idéal pour le montage et le code, Ryzen 5 5600H, 16 Go RAM, 512 Go SSD." },
            { title: "HP Pavilion Gaming 15 Ryzen 5 GTX 1650", price: 380000, desc: "Design audacieux avec accents verts, double système de ventilation, 8 Go RAM, 512 Go SSD." },

            // Vendeur 3: Fidjrossè Informatique Pro (13 produits)
            { title: "Acer Swift 3 AMD Ryzen 5 5600U", price: 310000, desc: "Châssis entièrement métallique argenté de 1.2 kg, autonomie jusqu'à 12.5 heures, 16 Go RAM, 512 Go SSD." },
            { title: "Lenovo V15 G2 AMD Ryzen 3 5300U", price: 195000, desc: "Portable économique fiable avec bords fins, idéal pour bureautique, cours et navigation, 8 Go RAM, 256 Go SSD." },
            { title: "Asus ExpertBook B1 Core i5 11e Gén", price: 285000, desc: "Conçu pour les PME avec connectique VGA, HDMI, RJ45 complète, puce TPM 2.0, 8 Go RAM, 512 Go SSD." },
            { title: "Acer Extensa 15 Core i3 11e Gén", price: 180000, desc: "Grand écran confort 15.6 FHD, clavier complet, processeur Intel Core i3 rapide, 8 Go RAM, 256 Go SSD." },
            { title: "MSI Modern 14 AMD Ryzen 5 5500U Gris", price: 295000, desc: "Élégant, léger (1.3 kg) et résistant, parfait pour les déplacements fréquents, 8 Go RAM, 512 Go SSD." },
            { title: "HP Elite x2 G4 Tablette 2-en-1 Core i5", price: 350000, desc: "Tablette détachable professionnelle avec clavier magnétique et béquille intégrée, 16 Go RAM, 256 Go SSD." },
            { title: "Lenovo ThinkPad L13 Yoga Gen 2 Convertible", price: 370000, desc: "Charnière 360 degrés, stylet ThinkPad Pen Pro rechargeable logé dans le châssis, Core i5, 16 Go RAM, 512 Go." },
            { title: "Dell Latitude 7320 2-en-1 Core i7 Tactile", price: 440000, desc: "Format ultracompact 13.3 tactile verre Gorilla Glass, Intel Core i7 11e Gén, 16 Go RAM, 512 Go SSD." },
            { title: "HP Pavilion 15 Core i5 11e Gén Argent", price: 290000, desc: "Système audio Bang & Olufsen, charge rapide 50% en 45 minutes, 16 Go RAM, 512 Go SSD." },
            { title: "Lenovo Yoga 7i 14 pouces Core i5", price: 410000, desc: "Châssis en aluminium anodisé lisse avec bords arrondis ergonomiques, écran tactile HDR, 16 Go RAM, 512 Go." },
            { title: "Dell Inspiron 15 5510 Core i7 11e Gén", price: 365000, desc: "Capot en aluminium, capteur d'empreintes digitales sur le bouton d'alimentation, 16 Go RAM, 512 Go SSD." },
            { title: "Acer Aspire 5 Core i5 11e Gén Écran IPS", price: 270000, desc: "Le classique polyvalent par excellence, carte Wi-Fi 6 AX intégrée, 8 Go RAM, 512 Go SSD NVMe." },
            { title: "Lenovo IdeaPad 3 15ALC6 AMD Ryzen 5", price: 260000, desc: "Cache de confidentialité mécanique pour webcam, refroidissement intelligent, 8 Go RAM, 512 Go SSD." }
        ];

        console.log(`\n💻 Création de ${productsList.length} produits PC et affectation aux vendeurs...`);
        const createdVariantIds = [];

        for (let i = 0; i < productsList.length; i++) {
            const p = productsList[i];
            const vendorIndex = Math.floor(i / 13); // 13 produits par vendeur
            const vendor = createdVendors[vendorIndex] || createdVendors[0] || { id: "1", name: "Défaut" };

            // A. Créer le Product
            const slug = p.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
            const prodInput = {
                enabled: true,
                translations: [
                    {
                        languageCode: "fr",
                        name: p.title,
                        slug: `${slug}-${Date.now().toString().slice(-4)}`,
                        description: p.desc
                    }
                ],
                customFields: {
                    vendorId: vendor.id,
                    approvalStatus: "approved"
                }
            };

            const mutProd = `mutation CreateProd($input: CreateProductInput!) {
                createProduct(input: $input) { ... on Product { id name } }
            }`;
            const resP = await queryAdmin(mutProd, { input: prodInput });
            const prodId = resP?.createProduct?.id;

            if (prodId) {
                // B. Créer la variante de produit (ProductVariant)
                const varInput = [
                    {
                        productId: prodId,
                        sku: `PC-${2026}-${String(i + 1).padStart(3, '0')}`,
                        price: p.price,
                        taxCategoryId: "1",
                        stockOnHand: 40 + Math.floor(Math.random() * 60),
                        translations: [
                            {
                                languageCode: "fr",
                                name: p.title
                            }
                        ]
                    }
                ];

                const mutVar = `mutation CreateVar($input: [CreateProductVariantInput!]!) {
                    createProductVariants(input: $input) {
                        ... on ProductVariant { id sku price }
                    }
                }`;
                const resV = await queryAdmin(mutVar, { input: varInput });
                const varId = resV?.createProductVariants?.[0]?.id;
                if (varId) {
                    createdVariantIds.push(String(varId));
                    if ((i + 1) % 10 === 0 || i === productsList.length - 1) {
                        console.log(`   + [${i + 1}/${productsList.length}] Créé : ${p.title} (Variante ID: ${varId}, Vendeur: ${vendor.name})`);
                    }
                } else {
                    console.warn(`   ! Erreur variante pour ${p.title}`, resV);
                }
            } else {
                console.warn(`   ! Erreur produit pour ${p.title}`);
            }
        }

        // 4. Mise à jour de la collection PC (ID "4") et Laptops (ID "188")
        console.log(`\n📂 Ajout des ${createdVariantIds.length} variantes aux collections PC (ID 4) et Laptops (ID 188)...`);

        // Récupérer les IDs existants de la collection 4
        const col4Res = await queryAdmin(`query { collection(id: "4") { filters { code args { name value } } } }`);
        const existingValStr = col4Res?.collection?.filters?.[0]?.args?.find(a => a.name === 'variantIds')?.value || '["1","4","5","8","10","13","16","11"]';
        let existingIds = [];
        try { existingIds = JSON.parse(existingValStr); } catch (e) { existingIds = ["1","4","5","8","10","13","16","11"]; }

        const allPcIds = Array.from(new Set([...existingIds, ...createdVariantIds]));

        const updateCol4Mut = `mutation UpCol4($input: UpdateCollectionInput!) {
            updateCollection(input: $input) { id name }
        }`;
        await queryAdmin(updateCol4Mut, {
            input: {
                id: "4",
                filters: [
                    {
                        code: "variant-id-filter",
                        arguments: [
                            {
                                name: "variantIds",
                                value: JSON.stringify(allPcIds)
                            }
                        ]
                    }
                ]
            }
        });
        console.log(`   ✅ Collection PC (ID 4) mise à jour avec ${allPcIds.length} produits au total !`);

        // Mettre à jour la collection Laptops (ID 188)
        await queryAdmin(updateCol4Mut, {
            input: {
                id: "188",
                filters: [
                    {
                        code: "variant-id-filter",
                        arguments: [
                            {
                                name: "variantIds",
                                value: JSON.stringify(createdVariantIds)
                            }
                        ]
                    }
                ]
            }
        });
        console.log(`   ✅ Collection Laptops (ID 188) mise à jour avec ${createdVariantIds.length} produits !`);

        console.log('\n🎉 PEUPLEMENT TERMINÉ AVEC SUCCÈS ! Les produits sont indexés et prêts pour vos tests de proximité, marchés et quartiers.');

    } catch (error) {
        console.error('Erreur fatale dans le script de peuplement:', error);
    }
}

seed();
