import { DataSource } from 'typeorm';
// @ts-ignore
import * as bcrypt from 'bcrypt';
import 'dotenv/config';

const dataSource = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST || '127.0.0.1',
    port: +(process.env.DB_PORT || 5432),
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 'vendure',
    schema: process.env.DB_SCHEMA || 'public',
});

function slugify(text: string): string {
    return text
        .toString()
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/\s+/g, '-')
        .replace(/[^\w\-]+/g, '')
        .replace(/\-\-+/g, '-')
        .replace(/^-+/, '')
        .replace(/-+$/, '');
}

interface VendorDef {
    email: string;
    name: string;
    description: string;
    address: string;
    zoneName: string;
    locationId: number; // geo_zone ID
    physicalMarketId: number; // market ID
    latitude: number;
    longitude: number;
    rating: number;
    ratingCount: number;
}

const VENDORS: VendorDef[] = [
    // 5 Vendeurs à Cotonou (locationId: 18)
    {
        email: 'vendeurtestahizan1@gmail.com',
        name: 'Dantokpa Épicerie & Vivres',
        description: 'Vente en gros et détail de vivres frais, épices béninoises et produits du terroir directement depuis le Grand Marché Dantokpa.',
        address: 'Allée centrale, Secteur Vivres, Marché Dantokpa, Cotonou',
        zoneName: 'Cotonou - Dantokpa',
        locationId: 18,
        physicalMarketId: 1, // Marché Dantokpa
        latitude: 6.3712,
        longitude: 2.4345,
        rating: 4.8,
        ratingCount: 34
    },
    {
        email: 'vendeurtestahizan2@gmail.com',
        name: 'PK3 Mode & Wax Bénin',
        description: 'Boutique spécialisée en pagnes de haute qualité (Vlisco, Woodin, Uniwax) et prêt-à-porter africain sur mesure.',
        address: 'Hall 2, Boutique B12, Marché Moderne de PK3, Cotonou',
        zoneName: 'Cotonou - PK3',
        locationId: 18,
        physicalMarketId: 2, // Marché Moderne de PK3
        latitude: 6.3680,
        longitude: 2.4510,
        rating: 4.9,
        ratingCount: 52
    },
    {
        email: 'vendeurtestahizan3@gmail.com',
        name: 'Ganhi Tech & Électro',
        description: 'Distributeur d\'équipements électroniques, smartphones, ordinateurs et accessoires connectés garantis.',
        address: 'Rue du Commerce, Proche Marché Moderne de Ganhi, Cotonou',
        zoneName: 'Cotonou - Ganhi',
        locationId: 18,
        physicalMarketId: 3, // Marché Moderne de Ganhi
        latitude: 6.3556,
        longitude: 2.4289,
        rating: 4.7,
        ratingCount: 89
    },
    {
        email: 'vendeurtestahizan4@gmail.com',
        name: 'Cadjèhoun Bio Cosmétique',
        description: 'Soins naturels, beurres purs de karité, savons artisanaux et cosmétiques bio fabriqués au Bénin.',
        address: 'Boutique 15, Marché de Cadjèhoun, Cotonou',
        zoneName: 'Cotonou - Cadjèhoun',
        locationId: 18,
        physicalMarketId: 4, // Marché de Cadjèhoun
        latitude: 6.3610,
        longitude: 2.3950,
        rating: 4.9,
        ratingCount: 41
    },
    {
        email: 'vendeurtestahizan5@gmail.com',
        name: 'Missèbo Chaussures & Cuir',
        description: 'Maroquinerie d\'art, chaussures en cuir artisanal, sacs et ceintures façonnés à la main.',
        address: 'Zone Maroquinerie, Marché Missèbo, Cotonou',
        zoneName: 'Cotonou - Missèbo',
        locationId: 18,
        physicalMarketId: 12, // Marché Missèbo
        latitude: 6.3695,
        longitude: 2.4300,
        rating: 4.6,
        ratingCount: 28
    },

    // 5 Vendeurs à Porto-Novo (locationId: 2)
    {
        email: 'vendeurtestahizan6@gmail.com',
        name: 'Ouando Saveurs & Épices',
        description: 'Le meilleur des produits vivriers, légumes, piments et huiles traditionnelles de la vallée de l\'Ouémé.',
        address: 'Secteur Agro, Marché de Ouando, Porto-Novo',
        zoneName: 'Porto-Novo - Ouando',
        locationId: 2,
        physicalMarketId: 14, // Marché de Ouando
        latitude: 6.5120,
        longitude: 2.6150,
        rating: 4.8,
        ratingCount: 39
    },
    {
        email: 'vendeurtestahizan7@gmail.com',
        name: 'Ahouangbo Électronique',
        description: 'Spécialiste de la téléphonie mobile, accessoires, montres connectées et matériel audio à Porto-Novo.',
        address: 'Avenue Principale, Marché d\'Ahouangbo, Porto-Novo',
        zoneName: 'Porto-Novo - Ahouangbo',
        locationId: 2,
        physicalMarketId: 15, // Marché d'Ahouangbo
        latitude: 6.4950,
        longitude: 2.6280,
        rating: 4.7,
        ratingCount: 45
    },
    {
        email: 'vendeurtestahizan8@gmail.com',
        name: 'Grand Marché Attakè Tissus',
        description: 'Vente de pagnes traditionnels tissés (Kente, Kanvô) et tissus de cérémonie de Porto-Novo.',
        address: 'Allée des Tisserands, Grand Marché de Porto-Novo (Attakè)',
        zoneName: 'Porto-Novo - Attakè',
        locationId: 2,
        physicalMarketId: 23, // Grand Marché de Porto-Novo (Attakè)
        latitude: 6.4880,
        longitude: 2.6320,
        rating: 4.9,
        ratingCount: 63
    },
    {
        email: 'vendeurtestahizan9@gmail.com',
        name: 'Djassin Maison & Confort',
        description: 'Ustensiles de cuisine, petit électroménager et articles pour la maison au meilleur prix.',
        address: 'Zone Bazar, Marché de Djassin, Porto-Novo',
        zoneName: 'Porto-Novo - Djassin',
        locationId: 2,
        physicalMarketId: 16, // Marché de Djassin
        latitude: 6.4910,
        longitude: 2.6190,
        rating: 4.5,
        ratingCount: 22
    },
    {
        email: 'vendeurtestahizan10@gmail.com',
        name: 'Tokpota Beauté Naturelle',
        description: 'Huiles végétales pures, savons gommants, produits capillaires et soins pour toute la famille.',
        address: 'Boutique 08, Marché de Tokpota, Porto-Novo',
        zoneName: 'Porto-Novo - Tokpota',
        locationId: 2,
        physicalMarketId: 25, // Marché de Tokpota
        latitude: 6.5200,
        longitude: 2.6250,
        rating: 4.8,
        ratingCount: 31
    },

    // 5 Vendeurs à Abomey-Calavi (locationId: 3)
    {
        email: 'vendeurtestahizan11@gmail.com',
        name: 'Calavi Kpota High-Tech',
        description: 'Vente et réparation de smartphones, tablettes, écouteurs sans fil et matériel informatique.',
        address: 'Face Entrée Principale, Grand Marché de Calavi Kpota, Abomey-Calavi',
        zoneName: 'Abomey-Calavi - Kpota',
        locationId: 3,
        physicalMarketId: 28, // Grand Marché de Calavi Kpota
        latitude: 6.4520,
        longitude: 2.3550,
        rating: 4.8,
        ratingCount: 77
    },
    {
        email: 'vendeurtestahizan12@gmail.com',
        name: 'Arconville Karité & Soins',
        description: 'Producteur et artisan de soins corporels bio, karité d\'Atacora et parfums d\'ambiance naturels.',
        address: 'Boutique A04, Marché d\'Arconville, Abomey-Calavi',
        zoneName: 'Abomey-Calavi - Arconville',
        locationId: 3,
        physicalMarketId: 31, // Marché d'Arconville
        latitude: 6.4460,
        longitude: 2.3480,
        rating: 4.9,
        ratingCount: 56
    },
    {
        email: 'vendeurtestahizan13@gmail.com',
        name: 'Godomey Frais & Terroir',
        description: 'Produits vivriers frais, poissons du lac, tubercules et légumes sélectionnés chaque matin.',
        address: 'Secteur Vivres, Marché de Godomey, Abomey-Calavi',
        zoneName: 'Abomey-Calavi - Godomey',
        locationId: 3,
        physicalMarketId: 17, // Marché de Godomey
        latitude: 6.3980,
        longitude: 2.3380,
        rating: 4.7,
        ratingCount: 33
    },
    {
        email: 'vendeurtestahizan14@gmail.com',
        name: 'Zogbadjè Campus Gadgets',
        description: 'Accessoires étudiants, bureautique, chargeurs rapides, lampes solaires et gadgets innovants.',
        address: 'Proche Entrée UAC, Marché de Zogbadjè, Abomey-Calavi',
        zoneName: 'Abomey-Calavi - Zogbadjè',
        locationId: 3,
        physicalMarketId: 20, // Marché de Zogbadjè
        latitude: 6.4180,
        longitude: 2.3420,
        rating: 4.6,
        ratingCount: 49
    },
    {
        email: 'vendeurtestahizan15@gmail.com',
        name: 'Tankpè Maison & Déco',
        description: 'Électroménager solaire, ventilateurs, décoration intérieure et articles de cuisine pratiques.',
        address: 'Carrefour Tankpè, Marché de Tankpè, Abomey-Calavi',
        zoneName: 'Abomey-Calavi - Tankpè',
        locationId: 3,
        physicalMarketId: 29, // Marché de Tankpè
        latitude: 6.4600,
        longitude: 2.3320,
        rating: 4.8,
        ratingCount: 29
    }
];

interface ProductSeedDef {
    name: string;
    description: string;
    categorySlug?: string;
    primaryVendorIndex: number; // 0 to 14
    additionalVendorIndices: number[]; // competing sellers
    optionGroupId: number; // existing option group ID
    variants: {
        optionId: number;
        skuSuffix: string;
        nameSuffix: string;
        price: number; // in XOF
        stock: number;
    }[];
}

// 100 Realistic Beninese Products using existing Option Groups
const PRODUCTS: ProductSeedDef[] = [
    // ----------------------------------------------------
    // CATÉGORIE 1 : AGRO-ALIMENTAIRE & ÉPICERIE (20 PRODUITS)
    // ----------------------------------------------------
    {
        name: 'Gari Sohoui Fin de Savalou',
        description: 'Gari blanc très fin et croustillant, issu du meilleur manioc de Savalou. Idéal pour délayage ou accompagnement.',
        primaryVendorIndex: 0, // Dantokpa
        additionalVendorIndices: [5, 12], // Ouando, Godomey
        optionGroupId: 55, // Poids
        variants: [
            { optionId: 188, skuSuffix: '1KG', nameSuffix: '1 kg', price: 1000, stock: 150 },
            { optionId: 189, skuSuffix: '2KG', nameSuffix: '2 kg', price: 1900, stock: 100 },
            { optionId: 244, skuSuffix: '5KG', nameSuffix: '5 kg', price: 4500, stock: 60 }
        ]
    },
    {
        name: 'Huile Rouge de Palme Artisanale d\'Adjohoun',
        description: 'Huile de palme pure sans additif, couleur rouge vif naturelle et goût authentique pour sauces traditionnelles.',
        primaryVendorIndex: 5, // Ouando Porto-Novo
        additionalVendorIndices: [0, 12], // Dantokpa, Godomey
        optionGroupId: 54, // Volume
        variants: [
            { optionId: 187, skuSuffix: '250ML', nameSuffix: '250 ml', price: 600, stock: 80 },
            { optionId: 212, skuSuffix: '70CL', nameSuffix: '70 cl', price: 1400, stock: 120 },
            { optionId: 243, skuSuffix: '1L', nameSuffix: '1 L', price: 1900, stock: 100 }
        ]
    },
    {
        name: 'Piment Rouge Sec Pilonné Pur',
        description: 'Piment rouge parfumé et très piquant, soigneusement séché au soleil et moulu sans mélange.',
        primaryVendorIndex: 0, // Dantokpa
        additionalVendorIndices: [5], // Ouando
        optionGroupId: 55, // Poids
        variants: [
            { optionId: 191, skuSuffix: '100G', nameSuffix: '100 g', price: 500, stock: 200 },
            { optionId: 192, skuSuffix: '250G', nameSuffix: '250 g', price: 1100, stock: 150 },
            { optionId: 193, skuSuffix: '500G', nameSuffix: '500 g', price: 2000, stock: 90 }
        ]
    },
    {
        name: 'Noix de Cajou Grillées et Salées de Tchaourou',
        description: 'Noix d\'anacarde entières du Bénin, délicatement dorées au four avec une touche subtile de sel marin.',
        primaryVendorIndex: 0, // Dantokpa
        additionalVendorIndices: [13], // Zogbadje
        optionGroupId: 55, // Poids
        variants: [
            { optionId: 191, skuSuffix: '100G', nameSuffix: '100 g', price: 1000, stock: 120 },
            { optionId: 192, skuSuffix: '250G', nameSuffix: '250 g', price: 2300, stock: 90 },
            { optionId: 193, skuSuffix: '500G', nameSuffix: '500 g', price: 4200, stock: 60 }
        ]
    },
    {
        name: 'Jus d\'Ananas Pain de Sucre Pur d\'Allada',
        description: '100% pur jus d\'ananas sans eau ajoutée ni sucre artificiel, pressé à froid à Allada.',
        primaryVendorIndex: 12, // Godomey
        additionalVendorIndices: [0, 5], // Dantokpa, Ouando
        optionGroupId: 54, // Volume
        variants: [
            { optionId: 187, skuSuffix: '250ML', nameSuffix: '250 ml', price: 400, stock: 180 },
            { optionId: 212, skuSuffix: '70CL', nameSuffix: '70 cl', price: 900, stock: 140 },
            { optionId: 243, skuSuffix: '1L', nameSuffix: '1 L', price: 1200, stock: 110 }
        ]
    },
    {
        name: 'Miel Sauvage Pur de la Forêt de l\'Atacora',
        description: 'Miel naturel récolté traditionnellement dans les forêts protégées du nord du Bénin. Riche en nutriments.',
        primaryVendorIndex: 3, // Cadjehoun Bio
        additionalVendorIndices: [11, 9], // Arconville, Tokpota
        optionGroupId: 54, // Volume
        variants: [
            { optionId: 187, skuSuffix: '250ML', nameSuffix: '250 ml', price: 2500, stock: 75 },
            { optionId: 212, skuSuffix: '70CL', nameSuffix: '70 cl', price: 5000, stock: 50 },
            { optionId: 243, skuSuffix: '1L', nameSuffix: '1 L', price: 7000, stock: 40 }
        ]
    },
    {
        name: 'Farine de Manioc Lafoun Traditionnelle',
        description: 'Farine de manioc fermentée selon la tradition yoruba pour la préparation de pâte blanche élastique.',
        primaryVendorIndex: 5, // Ouando
        additionalVendorIndices: [0], // Dantokpa
        optionGroupId: 55, // Poids
        variants: [
            { optionId: 188, skuSuffix: '1KG', nameSuffix: '1 kg', price: 800, stock: 120 },
            { optionId: 189, skuSuffix: '2KG', nameSuffix: '2 kg', price: 1500, stock: 80 },
            { optionId: 244, skuSuffix: '5KG', nameSuffix: '5 kg', price: 3500, stock: 50 }
        ]
    },
    {
        name: 'Chips de Banane Plantain Sucrées Croustillantes',
        description: 'Plantain mûr tranché finement et frit dans de l\'huile végétale propre. Sans conservateur.',
        primaryVendorIndex: 12, // Godomey
        additionalVendorIndices: [13], // Zogbadje
        optionGroupId: 55, // Poids
        variants: [
            { optionId: 191, skuSuffix: '100G', nameSuffix: '100 g', price: 400, stock: 200 },
            { optionId: 192, skuSuffix: '250G', nameSuffix: '250 g', price: 900, stock: 130 }
        ]
    },
    {
        name: 'Huile d\'Arachide Pure d\'Abomey',
        description: 'Huile d\'arachide pressée artisanalement, limpide et parfumée pour vos cuissons et fritures.',
        primaryVendorIndex: 0, // Dantokpa
        additionalVendorIndices: [5], // Ouando
        optionGroupId: 54, // Volume
        variants: [
            { optionId: 212, skuSuffix: '70CL', nameSuffix: '70 cl', price: 1600, stock: 90 },
            { optionId: 243, skuSuffix: '1L', nameSuffix: '1 L', price: 2200, stock: 80 }
        ]
    },
    {
        name: 'Café Robusta Torréfié en Grains du Bénin',
        description: 'Grains de café robusta d\'Agonlin torréfiés avec soin. Arômes corsés et notes chocolatées.',
        primaryVendorIndex: 3, // Cadjehoun
        additionalVendorIndices: [6], // Ahouangbo
        optionGroupId: 55, // Poids
        variants: [
            { optionId: 192, skuSuffix: '250G', nameSuffix: '250 g', price: 2000, stock: 60 },
            { optionId: 193, skuSuffix: '500G', nameSuffix: '500 g', price: 3800, stock: 45 }
        ]
    },
    {
        name: 'Infusion Citronnelle et Kinkeliba Séchés Bio',
        description: 'Mélange détox traditionnel béninois pour tisanes digestives et rafraîchissantes matin et soir.',
        primaryVendorIndex: 3, // Cadjehoun
        additionalVendorIndices: [11], // Arconville
        optionGroupId: 55, // Poids
        variants: [
            { optionId: 191, skuSuffix: '100G', nameSuffix: '100 g', price: 1200, stock: 100 },
            { optionId: 192, skuSuffix: '250G', nameSuffix: '250 g', price: 2600, stock: 70 }
        ]
    },
    {
        name: 'Sucre Roux Brut Non Raffiné',
        description: 'Sucre de canne complet aux notes caramélisées pour desserts, bouillies et boissons chaudes.',
        primaryVendorIndex: 0, // Dantokpa
        additionalVendorIndices: [12], // Godomey
        optionGroupId: 55, // Poids
        variants: [
            { optionId: 188, skuSuffix: '1KG', nameSuffix: '1 kg', price: 900, stock: 150 },
            { optionId: 189, skuSuffix: '2KG', nameSuffix: '2 kg', price: 1700, stock: 90 }
        ]
    },
    {
        name: 'Épice Yebessessi Assaisonnement Viande & Poisson',
        description: 'Mélange d\'épices traditionnelles moulues pour assaisonner marinades, grillades et sauces.',
        primaryVendorIndex: 0, // Dantokpa
        additionalVendorIndices: [5], // Ouando
        optionGroupId: 55, // Poids
        variants: [
            { optionId: 191, skuSuffix: '100G', nameSuffix: '100 g', price: 600, stock: 180 },
            { optionId: 192, skuSuffix: '250G', nameSuffix: '250 g', price: 1400, stock: 110 }
        ]
    },
    {
        name: 'Poisson Séché Capitaine Fumé du Lac Nokoué',
        description: 'Capitaine pêché localement et fumé au feu de bois selon le savoir-faire des pêcheurs Toffin.',
        primaryVendorIndex: 5, // Ouando
        additionalVendorIndices: [0, 12], // Dantokpa, Godomey
        optionGroupId: 55, // Poids
        variants: [
            { optionId: 193, skuSuffix: '500G', nameSuffix: '500 g', price: 3500, stock: 70 },
            { optionId: 188, skuSuffix: '1KG', nameSuffix: '1 kg', price: 6800, stock: 50 }
        ]
    },
    {
        name: 'Crevettes Séchées Décortiquées de Grand-Popo',
        description: 'Petites crevettes séchées salées parfaites pour rehausser le goût des sauces gombo et légumes.',
        primaryVendorIndex: 0, // Dantokpa
        additionalVendorIndices: [5], // Ouando
        optionGroupId: 55, // Poids
        variants: [
            { optionId: 192, skuSuffix: '250G', nameSuffix: '250 g', price: 3000, stock: 85 },
            { optionId: 193, skuSuffix: '500G', nameSuffix: '500 g', price: 5800, stock: 50 }
        ]
    },
    {
        name: 'Pâte d\'Arachide Pure sans Sucre d\'Abomey-Calavi',
        description: 'Pâte d\'arachide onctueuse broyée à la meule traditionnelle, idéale pour sauces arachide et goûters.',
        primaryVendorIndex: 12, // Godomey
        additionalVendorIndices: [0], // Dantokpa
        optionGroupId: 55, // Poids
        variants: [
            { optionId: 193, skuSuffix: '500G', nameSuffix: '500 g', price: 1400, stock: 100 },
            { optionId: 188, skuSuffix: '1KG', nameSuffix: '1 kg', price: 2600, stock: 70 }
        ]
    },
    {
        name: 'Poudre Pure de Pulpe de Baobab Bio',
        description: 'Poudre de pain de singe 100% naturelle riche en vitamine C et calcium pour jus et smoothies toniques.',
        primaryVendorIndex: 3, // Cadjehoun
        additionalVendorIndices: [11], // Arconville
        optionGroupId: 55, // Poids
        variants: [
            { optionId: 192, skuSuffix: '250G', nameSuffix: '250 g', price: 1800, stock: 90 },
            { optionId: 193, skuSuffix: '500G', nameSuffix: '500 g', price: 3400, stock: 60 }
        ]
    },
    {
        name: 'Farine de Maïs Blanc Tamisée Extra Fine',
        description: 'Farine de maïs local séché et moulu finement pour la pâte de maïs béninoise et bouillies légères.',
        primaryVendorIndex: 0, // Dantokpa
        additionalVendorIndices: [5, 12], // Ouando, Godomey
        optionGroupId: 55, // Poids
        variants: [
            { optionId: 188, skuSuffix: '1KG', nameSuffix: '1 kg', price: 600, stock: 200 },
            { optionId: 244, skuSuffix: '5KG', nameSuffix: '5 kg', price: 2800, stock: 80 }
        ]
    },
    {
        name: 'Attiéké de Manioc Frais Prêt à Cuire',
        description: 'Semoule de manioc cuite à la vapeur, texture légère et aérée pour accompagner vos poissons braisés.',
        primaryVendorIndex: 12, // Godomey
        additionalVendorIndices: [0], // Dantokpa
        optionGroupId: 55, // Poids
        variants: [
            { optionId: 193, skuSuffix: '500G', nameSuffix: '500 g', price: 700, stock: 130 },
            { optionId: 188, skuSuffix: '1KG', nameSuffix: '1 kg', price: 1300, stock: 95 }
        ]
    },
    {
        name: 'Klui-Klui Galettes d\'Arachide d\'Agonlin',
        description: 'Galettes d\'arachide frites croustillantes et légèrement pimentées, le snack authentique du Bénin.',
        primaryVendorIndex: 0, // Dantokpa
        additionalVendorIndices: [13], // Zogbadje
        optionGroupId: 55, // Poids
        variants: [
            { optionId: 191, skuSuffix: '100G', nameSuffix: '100 g', price: 350, stock: 250 },
            { optionId: 192, skuSuffix: '250G', nameSuffix: '250 g', price: 800, stock: 160 }
        ]
    },

    // ----------------------------------------------------
    // CATÉGORIE 2 : MODE, WAX & PRÊT-À-PORTER (20 PRODUITS)
    // ----------------------------------------------------
    {
        name: 'Pagne Wax Véritable Super Hollandais (6 Yards)',
        description: 'Le tissu de référence africain aux motifs éclatants et tenue incomparable. 100% coton de qualité supérieure.',
        primaryVendorIndex: 1, // PK3 Mode
        additionalVendorIndices: [7], // Porto-Novo Attake
        optionGroupId: 40, // Couleur
        variants: [
            { optionId: 124, skuSuffix: 'BLEU', nameSuffix: 'Bleu', price: 45000, stock: 25 },
            { optionId: 125, skuSuffix: 'ROUGE', nameSuffix: 'Rouge', price: 45000, stock: 20 },
            { optionId: 126, skuSuffix: 'VERT', nameSuffix: 'Vert', price: 45000, stock: 18 },
            { optionId: 127, skuSuffix: 'JAUNE', nameSuffix: 'Jaune', price: 45000, stock: 15 }
        ]
    },
    {
        name: 'Pagne Woodin Élégance Africaine (6 Yards)',
        description: 'Tissu Woodin imprimé moderne, souple et agréable au toucher pour robes et tenues de fête.',
        primaryVendorIndex: 7, // Porto-Novo Attake
        additionalVendorIndices: [1], // PK3 Mode
        optionGroupId: 40, // Couleur
        variants: [
            { optionId: 128, skuSuffix: 'NOIR', nameSuffix: 'Noir', price: 28000, stock: 30 },
            { optionId: 129, skuSuffix: 'BLANC', nameSuffix: 'Blanc', price: 28000, stock: 25 },
            { optionId: 216, skuSuffix: 'OR', nameSuffix: 'Or', price: 30000, stock: 20 }
        ]
    },
    {
        name: 'Tunique Homme Africaine en Coton Glacé Brodé',
        description: 'Tunique élégante pour homme avec broderies raffinées au col et sur la poitrine. Finitions impeccables.',
        primaryVendorIndex: 1, // PK3 Mode
        additionalVendorIndices: [7], // Porto-Novo Attake
        optionGroupId: 41, // Taille
        variants: [
            { optionId: 133, skuSuffix: 'M', nameSuffix: 'M', price: 18000, stock: 20 },
            { optionId: 134, skuSuffix: 'L', nameSuffix: 'L', price: 18000, stock: 35 },
            { optionId: 135, skuSuffix: 'XL', nameSuffix: 'XL', price: 19000, stock: 25 },
            { optionId: 136, skuSuffix: 'XXL', nameSuffix: 'XXL', price: 20000, stock: 15 }
        ]
    },
    {
        name: 'Robe Longue Moderne en Pagne Wax Ajustée',
        description: 'Robe de soirée élégante avec découpes modernes sublimant les motifs traditionnels du wax.',
        primaryVendorIndex: 1, // PK3 Mode
        additionalVendorIndices: [7], // Porto-Novo Attake
        optionGroupId: 41, // Taille
        variants: [
            { optionId: 132, skuSuffix: 'S', nameSuffix: 'S', price: 22000, stock: 15 },
            { optionId: 133, skuSuffix: 'M', nameSuffix: 'M', price: 22000, stock: 25 },
            { optionId: 134, skuSuffix: 'L', nameSuffix: 'L', price: 22000, stock: 20 },
            { optionId: 135, skuSuffix: 'XL', nameSuffix: 'XL', price: 23000, stock: 10 }
        ]
    },
    {
        name: 'Chemise Homme Casual Motifs Wax et Lin',
        description: 'Chemise légère à manches courtes combinant tissu lin uni et poches/cols en motifs wax tendance.',
        primaryVendorIndex: 1, // PK3 Mode
        additionalVendorIndices: [13], // Zogbadje Campus
        optionGroupId: 41, // Taille
        variants: [
            { optionId: 133, skuSuffix: 'M', nameSuffix: 'M', price: 12000, stock: 30 },
            { optionId: 134, skuSuffix: 'L', nameSuffix: 'L', price: 12000, stock: 40 },
            { optionId: 135, skuSuffix: 'XL', nameSuffix: 'XL', price: 13000, stock: 25 }
        ]
    },
    {
        name: 'Boubou Africain Grand Bazin Riche Brodé Or',
        description: 'Boubou d\'apparat 3 pièces en bazin riche brillant avec broderies royales fil d\'or.',
        primaryVendorIndex: 7, // Porto-Novo Attake
        additionalVendorIndices: [1], // PK3 Mode
        optionGroupId: 40, // Couleur
        variants: [
            { optionId: 129, skuSuffix: 'BLANC', nameSuffix: 'Blanc', price: 65000, stock: 12 },
            { optionId: 124, skuSuffix: 'BLEU', nameSuffix: 'Bleu', price: 65000, stock: 10 },
            { optionId: 128, skuSuffix: 'NOIR', nameSuffix: 'Noir', price: 65000, stock: 8 }
        ]
    },
    {
        name: 'Sandales Cuir Artisanales Homme de Bohicon',
        description: 'Sandales robustes faites main en cuir véritable tanné au Bénin. Semelle antidérapante confortable.',
        primaryVendorIndex: 4, // Missebo Cuir
        additionalVendorIndices: [7], // Porto-Novo
        optionGroupId: 52, // Pointure
        variants: [
            { optionId: 211, skuSuffix: '39', nameSuffix: '39', price: 8500, stock: 20 },
            { optionId: 209, skuSuffix: '41', nameSuffix: '41', price: 8500, stock: 30 },
            { optionId: 200, skuSuffix: '42', nameSuffix: '42', price: 8500, stock: 35 },
            { optionId: 199, skuSuffix: '43', nameSuffix: '43', price: 8500, stock: 25 }
        ]
    },
    {
        name: 'Mocassins Cuir Véritable Cousu Main',
        description: 'Mocassins ville élégants et souples en cuir pleine fleur. Idéal pour le bureau et les cérémonies.',
        primaryVendorIndex: 4, // Missebo Cuir
        additionalVendorIndices: [10], // Calavi Kpota
        optionGroupId: 52, // Pointure
        variants: [
            { optionId: 209, skuSuffix: '41', nameSuffix: '41', price: 22000, stock: 15 },
            { optionId: 200, skuSuffix: '42', nameSuffix: '42', price: 22000, stock: 20 },
            { optionId: 199, skuSuffix: '43', nameSuffix: '43', price: 22000, stock: 18 }
        ]
    },
    {
        name: 'Sandales Femme Talons Compensés Tressés',
        description: 'Sandales chics pour femme avec bride ajustable et finitions en cuir et raphia.',
        primaryVendorIndex: 4, // Missebo Cuir
        additionalVendorIndices: [1], // PK3 Mode
        optionGroupId: 52, // Pointure
        variants: [
            { optionId: 196, skuSuffix: '36', nameSuffix: '36', price: 14000, stock: 15 },
            { optionId: 197, skuSuffix: '37', nameSuffix: '37', price: 14000, stock: 22 },
            { optionId: 198, skuSuffix: '38', nameSuffix: '38', price: 14000, stock: 25 },
            { optionId: 211, skuSuffix: '39', nameSuffix: '39', price: 14000, stock: 18 }
        ]
    },
    {
        name: 'Sac à Main Cuir et Finitions Pagne Africain',
        description: 'Sac à main artisanal unique alliant la noblesse du cuir pleine fleur et les couleurs vibrantes du wax.',
        primaryVendorIndex: 4, // Missebo Cuir
        additionalVendorIndices: [1, 7], // PK3, Porto-Novo
        optionGroupId: 40, // Couleur
        variants: [
            { optionId: 128, skuSuffix: 'NOIR', nameSuffix: 'Noir', price: 18000, stock: 15 },
            { optionId: 166, skuSuffix: 'MARRON', nameSuffix: 'Marron', price: 18000, stock: 18 },
            { optionId: 125, skuSuffix: 'ROUGE', nameSuffix: 'Rouge', price: 18000, stock: 12 }
        ]
    },
    {
        name: 'Ceinture Homme Réversible Cuir Véritable',
        description: 'Ceinture robuste avec boucle métallique pivotante en acier brossé. Deux faces élégantes.',
        primaryVendorIndex: 4, // Missebo Cuir
        additionalVendorIndices: [10], // Calavi
        optionGroupId: 56, // Matière
        variants: [
            { optionId: 202, skuSuffix: 'CUIR', nameSuffix: 'Cuir', price: 7000, stock: 40 },
            { optionId: 204, skuSuffix: 'ACIER', nameSuffix: 'Acier', price: 9000, stock: 25 }
        ]
    },
    {
        name: 'Foulard Gele Cérémonie en Soie et Satin',
        description: 'Foulard de tête traditionnel rigide et scintillant pour mariages, baptêmes et fêtes.',
        primaryVendorIndex: 1, // PK3 Mode
        additionalVendorIndices: [7], // Porto-Novo
        optionGroupId: 40, // Couleur
        variants: [
            { optionId: 216, skuSuffix: 'OR', nameSuffix: 'Or', price: 8000, stock: 25 },
            { optionId: 215, skuSuffix: 'ARGENT', nameSuffix: 'Argent', price: 8000, stock: 20 },
            { optionId: 130, skuSuffix: 'ROSE', nameSuffix: 'Rose', price: 8000, stock: 22 }
        ]
    },
    {
        name: 'Polo Homme Coton Maille Piquée Bénin 229',
        description: 'Polo décontracté respirant avec petit logo discret brodé aux couleurs du drapeau national.',
        primaryVendorIndex: 13, // Zogbadje Campus
        additionalVendorIndices: [1], // PK3
        optionGroupId: 41, // Taille
        variants: [
            { optionId: 133, skuSuffix: 'M', nameSuffix: 'M', price: 7500, stock: 35 },
            { optionId: 134, skuSuffix: 'L', nameSuffix: 'L', price: 7500, stock: 50 },
            { optionId: 135, skuSuffix: 'XL', nameSuffix: 'XL', price: 8000, stock: 30 }
        ]
    },
    {
        name: 'T-Shirt Coton Bio Écologique Imprimé Cotonou',
        description: 'T-shirt streetwear en coton peigné très doux et coupe moderne unisexe.',
        primaryVendorIndex: 13, // Zogbadje Campus
        additionalVendorIndices: [1], // PK3
        optionGroupId: 41, // Taille
        variants: [
            { optionId: 132, skuSuffix: 'S', nameSuffix: 'S', price: 5000, stock: 40 },
            { optionId: 133, skuSuffix: 'M', nameSuffix: 'M', price: 5000, stock: 60 },
            { optionId: 134, skuSuffix: 'L', nameSuffix: 'L', price: 5000, stock: 55 },
            { optionId: 135, skuSuffix: 'XL', nameSuffix: 'XL', price: 5500, stock: 30 }
        ]
    },
    {
        name: 'Casquette Broderie Bénin Visière Courbée',
        description: 'Casquette stylée avec fermeture arrière réglable et tissu coton résistant au soleil.',
        primaryVendorIndex: 13, // Zogbadje Campus
        additionalVendorIndices: [2], // Ganhi Tech
        optionGroupId: 40, // Couleur
        variants: [
            { optionId: 128, skuSuffix: 'NOIR', nameSuffix: 'Noir', price: 4500, stock: 50 },
            { optionId: 129, skuSuffix: 'BLANC', nameSuffix: 'Blanc', price: 4500, stock: 40 }
        ]
    },
    {
        name: 'Ensemble Kaba Africain Ample Deux Pièces',
        description: 'Ensemble traditionnel fluide et aéré en pagne wax pour un confort quotidien maximal.',
        primaryVendorIndex: 7, // Porto-Novo Attake
        additionalVendorIndices: [1], // PK3
        optionGroupId: 41, // Taille
        variants: [
            { optionId: 133, skuSuffix: 'M', nameSuffix: 'M', price: 16000, stock: 20 },
            { optionId: 134, skuSuffix: 'L', nameSuffix: 'L', price: 16000, stock: 30 },
            { optionId: 135, skuSuffix: 'XL', nameSuffix: 'XL', price: 17000, stock: 25 },
            { optionId: 136, skuSuffix: 'XXL', nameSuffix: 'XXL', price: 18000, stock: 15 }
        ]
    },
    {
        name: 'Jupe Évasée Taille Haute en Wax Hollandais',
        description: 'Jupe à poches latérales et taille élastiquée mettant en valeur la silhouette.',
        primaryVendorIndex: 1, // PK3 Mode
        additionalVendorIndices: [7], // Porto-Novo
        optionGroupId: 41, // Taille
        variants: [
            { optionId: 132, skuSuffix: 'S', nameSuffix: 'S', price: 11000, stock: 20 },
            { optionId: 133, skuSuffix: 'M', nameSuffix: 'M', price: 11000, stock: 30 },
            { optionId: 134, skuSuffix: 'L', nameSuffix: 'L', price: 11000, stock: 25 }
        ]
    },
    {
        name: 'Babouches Homme Traditionnelles en Cuir Tressé',
        description: 'Babouches légères et confortables au style royal pour les réceptions et sorties traditionnelles.',
        primaryVendorIndex: 4, // Missebo Cuir
        additionalVendorIndices: [7], // Porto-Novo
        optionGroupId: 52, // Pointure
        variants: [
            { optionId: 209, skuSuffix: '41', nameSuffix: '41', price: 9500, stock: 20 },
            { optionId: 200, skuSuffix: '42', nameSuffix: '42', price: 9500, stock: 25 },
            { optionId: 199, skuSuffix: '43', nameSuffix: '43', price: 9500, stock: 20 }
        ]
    },
    {
        name: 'Pantalon Chino Homme Coupe Ajustée Stretch',
        description: 'Pantalon en coton sergé extensible pour un look moderne et soigné au travail.',
        primaryVendorIndex: 1, // PK3 Mode
        additionalVendorIndices: [13], // Zogbadje
        optionGroupId: 41, // Taille
        variants: [
            { optionId: 133, skuSuffix: 'M', nameSuffix: 'M', price: 13500, stock: 25 },
            { optionId: 134, skuSuffix: 'L', nameSuffix: 'L', price: 13500, stock: 35 },
            { optionId: 135, skuSuffix: 'XL', nameSuffix: 'XL', price: 14000, stock: 20 }
        ]
    },
    {
        name: 'Robe Droite Professionnelle Prêt-à-porter',
        description: 'Robe de bureau élégante avec col classique et discrètes touches de pagne aux manches.',
        primaryVendorIndex: 1, // PK3 Mode
        additionalVendorIndices: [7], // Porto-Novo
        optionGroupId: 41, // Taille
        variants: [
            { optionId: 132, skuSuffix: 'S', nameSuffix: 'S', price: 19000, stock: 15 },
            { optionId: 133, skuSuffix: 'M', nameSuffix: 'M', price: 19000, stock: 25 },
            { optionId: 134, skuSuffix: 'L', nameSuffix: 'L', price: 19000, stock: 20 }
        ]
    },

    // ----------------------------------------------------
    // CATÉGORIE 3 : HIGH-TECH, TÉLÉPHONIE & AUDIO (20 PRODUITS)
    // ----------------------------------------------------
    {
        name: 'Smartphone Tecno Camon 30 Pro 5G',
        description: 'Écran AMOLED 120Hz, triple capteur photo 50MP OIS Sony, processeur Dimensity ultra rapide et charge 70W.',
        primaryVendorIndex: 2, // Ganhi Tech Cotonou
        additionalVendorIndices: [6, 10], // Ahouangbo Porto-Novo, Calavi Kpota
        optionGroupId: 53, // Capacité
        variants: [
            { optionId: 167, skuSuffix: '128GB', nameSuffix: '128 Go', price: 165000, stock: 15 },
            { optionId: 168, skuSuffix: '256GB', nameSuffix: '256 Go', price: 195000, stock: 20 }
        ]
    },
    {
        name: 'Smartphone Infinix Note 40 Pro 4G/5G',
        description: 'Écran incurvé 3D 120Hz, charge magnétique sans fil 20W, caméra 108MP et haut-parleurs stéréo JBL.',
        primaryVendorIndex: 10, // Calavi Kpota
        additionalVendorIndices: [2, 6], // Ganhi Tech, Ahouangbo
        optionGroupId: 53, // Capacité
        variants: [
            { optionId: 168, skuSuffix: '256GB', nameSuffix: '256 Go', price: 175000, stock: 25 },
            { optionId: 169, skuSuffix: '512GB', nameSuffix: '512 Go', price: 215000, stock: 15 }
        ]
    },
    {
        name: 'Smartphone Samsung Galaxy A25 5G',
        description: 'Écran Super AMOLED 120Hz, quadruple appareil photo 50MP, autonomie 5000mAh et 4 ans de mises à jour Android.',
        primaryVendorIndex: 2, // Ganhi Tech
        additionalVendorIndices: [10], // Calavi Kpota
        optionGroupId: 53, // Capacité
        variants: [
            { optionId: 167, skuSuffix: '128GB', nameSuffix: '128 Go', price: 145000, stock: 20 },
            { optionId: 168, skuSuffix: '256GB', nameSuffix: '256 Go', price: 170000, stock: 18 }
        ]
    },
    {
        name: 'iPhone 13 128GB Reconditionné État Neuf',
        description: 'Puce A15 Bionic ultra-puissante, double appareil photo avancé avec mode Cinématique et écran Super Retina XDR.',
        primaryVendorIndex: 2, // Ganhi Tech
        additionalVendorIndices: [6, 10], // Porto-Novo, Calavi
        optionGroupId: 40, // Couleur
        variants: [
            { optionId: 128, skuSuffix: 'NOIR', nameSuffix: 'Noir', price: 340000, stock: 10 },
            { optionId: 129, skuSuffix: 'BLANC', nameSuffix: 'Blanc', price: 340000, stock: 8 },
            { optionId: 124, skuSuffix: 'BLEU', nameSuffix: 'Bleu', price: 340000, stock: 7 }
        ]
    },
    {
        name: 'Écouteurs Sans Fil TWS avec Réduction Active de Bruit',
        description: 'Son haute fidélité stéréo, Bluetooth 5.3, autonomie de 30h avec boîtier et réduction de bruit active ANC.',
        primaryVendorIndex: 6, // Ahouangbo Porto-Novo
        additionalVendorIndices: [2, 13], // Ganhi, Zogbadje
        optionGroupId: 40, // Couleur
        variants: [
            { optionId: 128, skuSuffix: 'NOIR', nameSuffix: 'Noir', price: 18000, stock: 45 },
            { optionId: 129, skuSuffix: 'BLANC', nameSuffix: 'Blanc', price: 18000, stock: 40 }
        ]
    },
    {
        name: 'Batterie Externe Powerbank 20 000 mAh 22.5W',
        description: 'Charge rapide pour smartphones et tablettes, affichage numérique LED du pourcentage et 3 sorties USB.',
        primaryVendorIndex: 13, // Zogbadje Campus
        additionalVendorIndices: [2, 6], // Ganhi, Porto-Novo
        optionGroupId: 40, // Couleur
        variants: [
            { optionId: 128, skuSuffix: 'NOIR', nameSuffix: 'Noir', price: 14000, stock: 60 },
            { optionId: 129, skuSuffix: 'BLANC', nameSuffix: 'Blanc', price: 14000, stock: 40 }
        ]
    },
    {
        name: 'Montre Connectée Smartwatch Écran AMOLED HD',
        description: 'Suivi de la fréquence cardiaque, SpO2, sommeil, plus de 100 modes sportifs et appels Bluetooth étanches IP68.',
        primaryVendorIndex: 6, // Ahouangbo Porto-Novo
        additionalVendorIndices: [2, 10], // Ganhi, Calavi
        optionGroupId: 40, // Couleur
        variants: [
            { optionId: 128, skuSuffix: 'NOIR', nameSuffix: 'Noir', price: 25000, stock: 30 },
            { optionId: 215, skuSuffix: 'ARGENT', nameSuffix: 'Argent', price: 25000, stock: 25 },
            { optionId: 216, skuSuffix: 'OR', nameSuffix: 'Or', price: 27000, stock: 15 }
        ]
    },
    {
        name: 'Câble USB-C vers USB-C Tressé Charge Rapide 65W',
        description: 'Cordon en nylon tressé indéchirable supportant la charge rapide Power Delivery pour ordinateurs et téléphones.',
        primaryVendorIndex: 13, // Zogbadje Campus
        additionalVendorIndices: [2], // Ganhi
        optionGroupId: 40, // Couleur
        variants: [
            { optionId: 128, skuSuffix: 'NOIR', nameSuffix: 'Noir', price: 3500, stock: 80 },
            { optionId: 125, skuSuffix: 'ROUGE', nameSuffix: 'Rouge', price: 3500, stock: 60 }
        ]
    },
    {
        name: 'Chargeur Mural Secteur Rapide 33W Double Port',
        description: 'Technologie GaN compacte avec un port USB-C Power Delivery et un port USB-A Quick Charge 3.0.',
        primaryVendorIndex: 2, // Ganhi Tech
        additionalVendorIndices: [10], // Calavi
        optionGroupId: 40, // Couleur
        variants: [
            { optionId: 129, skuSuffix: 'BLANC', nameSuffix: 'Blanc', price: 8500, stock: 50 },
            { optionId: 128, skuSuffix: 'NOIR', nameSuffix: 'Noir', price: 8500, stock: 40 }
        ]
    },
    {
        name: 'Enceinte Bluetooth Portable Waterproof Bass Boost',
        description: 'Son puissant 360°, résistance à l\'eau IPX7 pour piscine et plage, autonomie 12 heures et jeux de lumières LED.',
        primaryVendorIndex: 6, // Ahouangbo Porto-Novo
        additionalVendorIndices: [2, 13], // Ganhi, Zogbadje
        optionGroupId: 40, // Couleur
        variants: [
            { optionId: 128, skuSuffix: 'NOIR', nameSuffix: 'Noir', price: 22000, stock: 35 },
            { optionId: 124, skuSuffix: 'BLEU', nameSuffix: 'Bleu', price: 22000, stock: 25 },
            { optionId: 125, skuSuffix: 'ROUGE', nameSuffix: 'Rouge', price: 22000, stock: 20 }
        ]
    },
    {
        name: 'Clé USB 3.2 Double Connecteur Type-A et Type-C',
        description: 'Transferts ultra-rapides jusqu\'à 150 Mo/s pour libérer de l\'espace sur votre smartphone et PC.',
        primaryVendorIndex: 10, // Calavi Kpota
        additionalVendorIndices: [13], // Zogbadje
        optionGroupId: 53, // Capacité
        variants: [
            { optionId: 201, skuSuffix: '32GB', nameSuffix: '32 Go', price: 5000, stock: 70 },
            { optionId: 190, skuSuffix: '64GB', nameSuffix: '64 Go', price: 8000, stock: 60 },
            { optionId: 167, skuSuffix: '128GB', nameSuffix: '128 Go', price: 13000, stock: 45 }
        ]
    },
    {
        name: 'Carte Mémoire MicroSD Haute Vitesse Classe 10',
        description: 'Vitesse de lecture jusqu\'à 100 Mo/s, idéale pour vidéos 4K UHD et enregistrement caméra de surveillance.',
        primaryVendorIndex: 2, // Ganhi Tech
        additionalVendorIndices: [6, 10], // Porto-Novo, Calavi
        optionGroupId: 53, // Capacité
        variants: [
            { optionId: 190, skuSuffix: '64GB', nameSuffix: '64 Go', price: 6500, stock: 50 },
            { optionId: 167, skuSuffix: '128GB', nameSuffix: '128 Go', price: 11000, stock: 40 },
            { optionId: 168, skuSuffix: '256GB', nameSuffix: '256 Go', price: 19000, stock: 25 }
        ]
    },
    {
        name: 'Support Smartphone pour Voiture avec Fixation Grille',
        description: 'Maintien automatique sécurisé par gravité avec bras rotatif 360° et protection silicone anti-rayures.',
        primaryVendorIndex: 2, // Ganhi Tech
        additionalVendorIndices: [13], // Zogbadje
        optionGroupId: 56, // Matière
        variants: [
            { optionId: 207, skuSuffix: 'PLASTIQUE', nameSuffix: 'Plastique', price: 4000, stock: 60 },
            { optionId: 204, skuSuffix: 'ACIER', nameSuffix: 'Acier', price: 6500, stock: 40 }
        ]
    },
    {
        name: 'Kit Ring Light LED 10 Pouces avec Trépied Ajustable',
        description: '3 modes d\'éclairage (Chaud, Neutre, Froid) avec télécommande Bluetooth pour créateurs de contenu et visios.',
        primaryVendorIndex: 13, // Zogbadje Campus
        additionalVendorIndices: [10], // Calavi
        optionGroupId: 56, // Matière
        variants: [
            { optionId: 204, skuSuffix: 'ACIER', nameSuffix: 'Acier', price: 15000, stock: 35 },
            { optionId: 207, skuSuffix: 'PLASTIQUE', nameSuffix: 'Plastique', price: 11000, stock: 45 }
        ]
    },
    {
        name: 'Casque Audio Sans Fil Bluetooth Hi-Fi Bass',
        description: 'Coussinets circum-auriculaires ultra confortables à mémoire de forme, micro intégré et 40h d\'autonomie.',
        primaryVendorIndex: 2, // Ganhi Tech
        additionalVendorIndices: [6], // Porto-Novo
        optionGroupId: 40, // Couleur
        variants: [
            { optionId: 128, skuSuffix: 'NOIR', nameSuffix: 'Noir', price: 26000, stock: 25 },
            { optionId: 181, skuSuffix: 'GRIS', nameSuffix: 'Gris', price: 26000, stock: 20 }
        ]
    },
    {
        name: 'Bloc Multiprise 4 Prises avec 3 Ports USB et Switch',
        description: 'Protection contre les surtensions électriques avec câble épais de 2 mètres et sécurité enfant.',
        primaryVendorIndex: 8, // Djassin Porto-Novo
        additionalVendorIndices: [14], // Tankpe Calavi
        optionGroupId: 56, // Matière
        variants: [
            { optionId: 207, skuSuffix: 'PLASTIQUE', nameSuffix: 'Plastique', price: 7500, stock: 50 }
        ]
    },
    {
        name: 'Souris Sans Fil Ergonomique et Silencieuse',
        description: 'Connexion 2.4GHz et Bluetooth, capteur optique précis 1600 DPI avec clics totalement silencieux.',
        primaryVendorIndex: 10, // Calavi Kpota
        additionalVendorIndices: [13], // Zogbadje
        optionGroupId: 40, // Couleur
        variants: [
            { optionId: 128, skuSuffix: 'NOIR', nameSuffix: 'Noir', price: 6000, stock: 45 },
            { optionId: 181, skuSuffix: 'GRIS', nameSuffix: 'Gris', price: 6000, stock: 30 }
        ]
    },
    {
        name: 'Clavier Bluetooth Multi-Dispositifs Compact',
        description: 'Touches ciseaux réactives et silencieuses, compatible Windows, Mac, Android et iOS jusqu\'à 3 appareils.',
        primaryVendorIndex: 10, // Calavi Kpota
        additionalVendorIndices: [2], // Ganhi
        optionGroupId: 40, // Couleur
        variants: [
            { optionId: 128, skuSuffix: 'NOIR', nameSuffix: 'Noir', price: 16000, stock: 25 },
            { optionId: 129, skuSuffix: 'BLANC', nameSuffix: 'Blanc', price: 16000, stock: 20 }
        ]
    },
    {
        name: 'Lampe de Bureau LED Rechargeable avec Pince',
        description: 'Bras flexible 360°, contrôle tactile de la luminosité et batterie rechargeable intégrée via USB.',
        primaryVendorIndex: 13, // Zogbadje Campus
        additionalVendorIndices: [8], // Djassin
        optionGroupId: 40, // Couleur
        variants: [
            { optionId: 129, skuSuffix: 'BLANC', nameSuffix: 'Blanc', price: 8000, stock: 40 },
            { optionId: 128, skuSuffix: 'NOIR', nameSuffix: 'Noir', price: 8000, stock: 35 }
        ]
    },
    {
        name: 'Écouteurs Filaire Intra-Auriculaires Jack 3.5mm Hi-Res',
        description: 'Corps en métal avec micro haute définition et télécommande sur cordon pour appels clairs.',
        primaryVendorIndex: 6, // Ahouangbo Porto-Novo
        additionalVendorIndices: [13], // Zogbadje
        optionGroupId: 40, // Couleur
        variants: [
            { optionId: 128, skuSuffix: 'NOIR', nameSuffix: 'Noir', price: 3000, stock: 90 },
            { optionId: 129, skuSuffix: 'BLANC', nameSuffix: 'Blanc', price: 3000, stock: 70 }
        ]
    },

    // ----------------------------------------------------
    // CATÉGORIE 4 : MAISON, ÉLECTROMÉNAGER & CUISINE (20 PRODUITS)
    // ----------------------------------------------------
    {
        name: 'Ventilateur Rechargeable Solaire 16 Pouces avec Lampe',
        description: 'Autonomie jusqu\'à 10 heures sur batterie, port USB pour charger téléphones, télécommande et panneau solaire inclus.',
        primaryVendorIndex: 14, // Tankpe Calavi
        additionalVendorIndices: [8, 2], // Djassin, Ganhi
        optionGroupId: 40, // Couleur
        variants: [
            { optionId: 128, skuSuffix: 'NOIR', nameSuffix: 'Noir', price: 38000, stock: 30 },
            { optionId: 129, skuSuffix: 'BLANC', nameSuffix: 'Blanc', price: 38000, stock: 25 }
        ]
    },
    {
        name: 'Mixeur Blender 2 en 1 avec Moulin à Épices Inox',
        description: 'Moteur puissant 800W avec lames en acier inoxydable pour smoothies, pâtes et broyage de graines sèches.',
        primaryVendorIndex: 8, // Djassin Porto-Novo
        additionalVendorIndices: [14], // Tankpe Calavi
        optionGroupId: 56, // Matière
        variants: [
            { optionId: 204, skuSuffix: 'ACIER', nameSuffix: 'Acier', price: 24000, stock: 35 },
            { optionId: 207, skuSuffix: 'PLASTIQUE', nameSuffix: 'Plastique', price: 18000, stock: 25 }
        ]
    },
    {
        name: 'Bouilloire Électrique Sans Fil 1.8L Arrêt Automatique',
        description: 'Chauffe ultra-rapide avec corps en acier inoxydable brossé et socle rotatif à 360° sécurisé.',
        primaryVendorIndex: 8, // Djassin Porto-Novo
        additionalVendorIndices: [14, 13], // Tankpe, Zogbadje
        optionGroupId: 56, // Matière
        variants: [
            { optionId: 204, skuSuffix: 'ACIER', nameSuffix: 'Acier', price: 9500, stock: 50 },
            { optionId: 207, skuSuffix: 'PLASTIQUE', nameSuffix: 'Plastique', price: 7000, stock: 40 }
        ]
    },
    {
        name: 'Cuiseur de Riz Automatique 2.2L avec Panier Vapeur',
        description: 'Cuisson parfaite et maintien au chaud automatique. Bol antiadhésif amovible facile à nettoyer.',
        primaryVendorIndex: 14, // Tankpe Calavi
        additionalVendorIndices: [8], // Djassin
        optionGroupId: 56, // Matière
        variants: [
            { optionId: 204, skuSuffix: 'ACIER', nameSuffix: 'Acier', price: 21000, stock: 30 },
            { optionId: 207, skuSuffix: 'PLASTIQUE', nameSuffix: 'Plastique', price: 16500, stock: 25 }
        ]
    },
    {
        name: 'Fer à Repasser à Vapeur avec Semelle Céramique',
        description: 'Fonction pressing puissant anti-goutte et détartrage automatique pour éliminer tous les plis tenaces.',
        primaryVendorIndex: 8, // Djassin Porto-Novo
        additionalVendorIndices: [14], // Tankpe
        optionGroupId: 40, // Couleur
        variants: [
            { optionId: 124, skuSuffix: 'BLEU', nameSuffix: 'Bleu', price: 12500, stock: 40 },
            { optionId: 125, skuSuffix: 'ROUGE', nameSuffix: 'Rouge', price: 12500, stock: 30 }
        ]
    },
    {
        name: 'Friteuse Sans Huile Air Fryer Grande Capacité 5.5L',
        description: 'Cuisinez croustillant avec 85% d\'huile en moins grâce à la circulation d\'air chaud 360° et 8 programmes préenregistrés.',
        primaryVendorIndex: 14, // Tankpe Calavi
        additionalVendorIndices: [8], // Djassin
        optionGroupId: 40, // Couleur
        variants: [
            { optionId: 128, skuSuffix: 'NOIR', nameSuffix: 'Noir', price: 45000, stock: 20 }
        ]
    },
    {
        name: 'Moulin Électrique à Café et Épices Broyeur Inox',
        description: 'Broyage ultra-rapide en 15 secondes pour café, poivre, piment sec et graines de courge.',
        primaryVendorIndex: 8, // Djassin Porto-Novo
        additionalVendorIndices: [0], // Dantokpa
        optionGroupId: 56, // Matière
        variants: [
            { optionId: 204, skuSuffix: 'ACIER', nameSuffix: 'Acier', price: 11000, stock: 45 }
        ]
    },
    {
        name: 'Presse-Agrumes Électrique Inox Deux Cônes',
        description: 'Extraction maximale de jus d\'orange et de pamplemousse avec système anti-goutte et rotation alternée.',
        primaryVendorIndex: 14, // Tankpe Calavi
        additionalVendorIndices: [8], // Djassin
        optionGroupId: 56, // Matière
        variants: [
            { optionId: 204, skuSuffix: 'ACIER', nameSuffix: 'Acier', price: 13500, stock: 30 }
        ]
    },
    {
        name: 'Carafe Filtrante Purificatrice d\'Eau 3.5L',
        description: 'Filtre le chlore, les impuretés et le calcaire pour une eau pure et saine au goût agréable.',
        primaryVendorIndex: 8, // Djassin Porto-Novo
        additionalVendorIndices: [14], // Tankpe
        optionGroupId: 54, // Volume
        variants: [
            { optionId: 243, skuSuffix: '1L', nameSuffix: '1 L', price: 15000, stock: 35 }
        ]
    },
    {
        name: 'Balance de Cuisine Électronique Précise 1g / 10kg',
        description: 'Affichage LCD rétroéclairé avec fonction tare et conversion automatique des unités g/ml/oz.',
        primaryVendorIndex: 8, // Djassin Porto-Novo
        additionalVendorIndices: [13], // Zogbadje
        optionGroupId: 40, // Couleur
        variants: [
            { optionId: 129, skuSuffix: 'BLANC', nameSuffix: 'Blanc', price: 6500, stock: 55 },
            { optionId: 215, skuSuffix: 'ARGENT', nameSuffix: 'Argent', price: 7500, stock: 40 }
        ]
    },
    {
        name: 'Poêle Antiadhésive Revêtement Granit 28cm Tous Feux',
        description: 'Poêle robuste sans PFOA résistante aux rayures avec manche ergonomique effet bois doux.',
        primaryVendorIndex: 14, // Tankpe Calavi
        additionalVendorIndices: [8], // Djassin
        optionGroupId: 56, // Matière
        variants: [
            { optionId: 204, skuSuffix: 'ACIER', nameSuffix: 'Acier', price: 12000, stock: 40 }
        ]
    },
    {
        name: 'Batterie de Cuisine 3 Casseroles Inox Triple Fond',
        description: 'Set professionnel en acier inoxydable avec couvercles en verre trempé et graduation intérieure.',
        primaryVendorIndex: 8, // Djassin Porto-Novo
        additionalVendorIndices: [14], // Tankpe
        optionGroupId: 56, // Matière
        variants: [
            { optionId: 204, skuSuffix: 'ACIER', nameSuffix: 'Acier', price: 32000, stock: 25 }
        ]
    },
    {
        name: 'Bouteille Gourde Isotherme Double Paroi 750ml Inox',
        description: 'Garde les boissons froides pendant 24h et chaudes pendant 12h sans condensation extérieure.',
        primaryVendorIndex: 13, // Zogbadje Campus
        additionalVendorIndices: [8], // Djassin
        optionGroupId: 40, // Couleur
        variants: [
            { optionId: 128, skuSuffix: 'NOIR', nameSuffix: 'Noir', price: 6500, stock: 60 },
            { optionId: 124, skuSuffix: 'BLEU', nameSuffix: 'Bleu', price: 6500, stock: 45 },
            { optionId: 215, skuSuffix: 'ARGENT', nameSuffix: 'Argent', price: 6500, stock: 40 }
        ]
    },
    {
        name: 'Pompe Distributrice d\'Eau Automatique Rechargeable USB',
        description: 'S\'adapte sur toutes les bonbonnes d\'eau de 5L à 20L pour un service d\'eau rapide par simple pression.',
        primaryVendorIndex: 14, // Tankpe Calavi
        additionalVendorIndices: [8], // Djassin
        optionGroupId: 40, // Couleur
        variants: [
            { optionId: 129, skuSuffix: 'BLANC', nameSuffix: 'Blanc', price: 5000, stock: 70 },
            { optionId: 128, skuSuffix: 'NOIR', nameSuffix: 'Noir', price: 5000, stock: 50 }
        ]
    },
    {
        name: 'Projecteur Solaire LED Extérieur avec Détecteur',
        description: 'Éclairage puissant autonome 100W sans facture électrique, résistant aux fortes pluies IP65.',
        primaryVendorIndex: 14, // Tankpe Calavi
        additionalVendorIndices: [2], // Ganhi
        optionGroupId: 40, // Couleur
        variants: [
            { optionId: 128, skuSuffix: 'NOIR', nameSuffix: 'Noir', price: 22000, stock: 35 }
        ]
    },
    {
        name: 'Moustiquaire Imprégnée Grande Taille 2 Places',
        description: 'Maille fine et aérée offrant une protection totale et durable contre les moustiques pour nuits sereines.',
        primaryVendorIndex: 8, // Djassin Porto-Novo
        additionalVendorIndices: [14], // Tankpe
        optionGroupId: 40, // Couleur
        variants: [
            { optionId: 129, skuSuffix: 'BLANC', nameSuffix: 'Blanc', price: 7000, stock: 80 },
            { optionId: 124, skuSuffix: 'BLEU', nameSuffix: 'Bleu', price: 7000, stock: 60 }
        ]
    },
    {
        name: 'Diffuseur d\'Huiles Essentielles Aromathérapie LED',
        description: 'Humidificateur silencieux à ultrasons créant une brume parfumée apaisante avec 7 couleurs changeantes.',
        primaryVendorIndex: 11, // Arconville Beauté
        additionalVendorIndices: [3], // Cadjehoun
        optionGroupId: 56, // Matière
        variants: [
            { optionId: 208, skuSuffix: 'BOIS', nameSuffix: 'Bois', price: 14000, stock: 30 },
            { optionId: 207, skuSuffix: 'PLASTIQUE', nameSuffix: 'Plastique', price: 10000, stock: 40 }
        ]
    },
    {
        name: 'Horloge Murale Design Moderne Mouvement Silencieux',
        description: 'Grand cadran élégant avec chiffres bien lisibles sans tic-tac gênant pour chambre et salon.',
        primaryVendorIndex: 14, // Tankpe Calavi
        additionalVendorIndices: [8], // Djassin
        optionGroupId: 40, // Couleur
        variants: [
            { optionId: 128, skuSuffix: 'NOIR', nameSuffix: 'Noir', price: 9000, stock: 30 },
            { optionId: 216, skuSuffix: 'OR', nameSuffix: 'Or', price: 11000, stock: 25 },
            { optionId: 215, skuSuffix: 'ARGENT', nameSuffix: 'Argent', price: 10000, stock: 20 }
        ]
    },
    {
        name: 'Tapis de Salon Moelleux Antidérapant 150x200cm',
        description: 'Tapis ultra doux toucher velours avec sous-couche antidérapante lavable pour embellir votre séjour.',
        primaryVendorIndex: 14, // Tankpe Calavi
        additionalVendorIndices: [8], // Djassin
        optionGroupId: 40, // Couleur
        variants: [
            { optionId: 181, skuSuffix: 'GRIS', nameSuffix: 'Gris', price: 28000, stock: 20 },
            { optionId: 186, skuSuffix: 'BEIGE', nameSuffix: 'Beige', price: 28000, stock: 25 },
            { optionId: 166, skuSuffix: 'MARRON', nameSuffix: 'Marron', price: 28000, stock: 15 }
        ]
    },
    {
        name: 'Lampe Torche Solaire LED Ultra Puissante Longue Portée',
        description: 'Faisceau longue distance 500m avec 4 modes d\'éclairage et batterie rechargeable solaire/USB.',
        primaryVendorIndex: 14, // Tankpe Calavi
        additionalVendorIndices: [8, 13], // Djassin, Zogbadje
        optionGroupId: 40, // Couleur
        variants: [
            { optionId: 128, skuSuffix: 'NOIR', nameSuffix: 'Noir', price: 7500, stock: 60 },
            { optionId: 127, skuSuffix: 'JAUNE', nameSuffix: 'Jaune', price: 7500, stock: 40 }
        ]
    },

    // ----------------------------------------------------
    // CATÉGORIE 5 : BEAUTÉ, COSMÉTIQUE & SOINS (20 PRODUITS)
    // ----------------------------------------------------
    {
        name: 'Beurre de Karité Brut Non Raffiné 100% Pur Bénin',
        description: 'Véritable beurre de karité de Natitingou obtenu par pression artisanale. Nourrit intensément peaux et cheveux secs.',
        primaryVendorIndex: 3, // Cadjehoun Bio
        additionalVendorIndices: [9, 11], // Tokpota Porto-Novo, Arconville Calavi
        optionGroupId: 55, // Poids
        variants: [
            { optionId: 192, skuSuffix: '250G', nameSuffix: '250 g', price: 1500, stock: 120 },
            { optionId: 193, skuSuffix: '500G', nameSuffix: '500 g', price: 2800, stock: 90 },
            { optionId: 188, skuSuffix: '1KG', nameSuffix: '1 kg', price: 5000, stock: 65 }
        ]
    },
    {
        name: 'Savon Noir Africain Traditionnel Végétal',
        description: 'Savon ancestral purifiant aux cendres de cabosses de cacao et huiles végétales. Traite l\'acné et clarifie le teint.',
        primaryVendorIndex: 11, // Arconville Calavi
        additionalVendorIndices: [3, 9], // Cadjehoun, Tokpota
        optionGroupId: 55, // Poids
        variants: [
            { optionId: 191, skuSuffix: '100G', nameSuffix: '100 g', price: 600, stock: 150 },
            { optionId: 192, skuSuffix: '250G', nameSuffix: '250 g', price: 1300, stock: 100 },
            { optionId: 193, skuSuffix: '500G', nameSuffix: '500 g', price: 2400, stock: 70 }
        ]
    },
    {
        name: 'Huile de Coco Vierge Première Pression à Froid',
        description: 'Huile de coco extra vierge non blanchie ni désodorisée au parfum gourmand pour soins capillaires et corporels.',
        primaryVendorIndex: 9, // Tokpota Porto-Novo
        additionalVendorIndices: [3, 11], // Cadjehoun, Arconville
        optionGroupId: 54, // Volume
        variants: [
            { optionId: 164, skuSuffix: '100ML', nameSuffix: '100 ml', price: 1200, stock: 100 },
            { optionId: 187, skuSuffix: '250ML', nameSuffix: '250 ml', price: 2600, stock: 80 },
            { optionId: 243, skuSuffix: '1L', nameSuffix: '1 L', price: 8000, stock: 40 }
        ]
    },
    {
        name: 'Huile d\'Avocat Pure Régénérante et Fortifiante',
        description: 'Huile riche en vitamines A, D et E pour stimuler la pousse des cheveux et adoucir les peaux très sèches.',
        primaryVendorIndex: 3, // Cadjehoun Bio
        additionalVendorIndices: [11], // Arconville
        optionGroupId: 54, // Volume
        variants: [
            { optionId: 195, skuSuffix: '50ML', nameSuffix: '50 ml', price: 2000, stock: 80 },
            { optionId: 164, skuSuffix: '100ML', nameSuffix: '100 ml', price: 3600, stock: 60 }
        ]
    },
    {
        name: 'Crème Hydratante Corps & Mains au Karité et Aloe Vera',
        description: 'Formule fluide et non grasse qui pénètre instantanément pour laisser la peau douce et parfumée toute la journée.',
        primaryVendorIndex: 11, // Arconville Calavi
        additionalVendorIndices: [3, 9], // Cadjehoun, Tokpota
        optionGroupId: 54, // Volume
        variants: [
            { optionId: 165, skuSuffix: '200ML', nameSuffix: '200 ml', price: 3500, stock: 75 },
            { optionId: 187, skuSuffix: '250ML', nameSuffix: '250 ml', price: 4200, stock: 60 }
        ]
    },
    {
        name: 'Shampoing Fortifiant au Chébé et Huile de Ricin',
        description: 'Nettoie en douceur sans agresser le cuir chevelu tout en réduisant la casse et en favorisant la pousse.',
        primaryVendorIndex: 9, // Tokpota Porto-Novo
        additionalVendorIndices: [11], // Arconville
        optionGroupId: 54, // Volume
        variants: [
            { optionId: 187, skuSuffix: '250ML', nameSuffix: '250 ml', price: 3000, stock: 80 },
            { optionId: 243, skuSuffix: '1L', nameSuffix: '1 L', price: 9500, stock: 35 }
        ]
    },
    {
        name: 'Masque Capillaire Nutrition Intense au Karité et Miel',
        description: 'Soin profond réparateur pour cheveux crépus, frisés et défrisés abîmés par les colorations.',
        primaryVendorIndex: 3, // Cadjehoun Bio
        additionalVendorIndices: [9], // Tokpota
        optionGroupId: 54, // Volume
        variants: [
            { optionId: 165, skuSuffix: '200ML', nameSuffix: '200 ml', price: 4000, stock: 70 },
            { optionId: 187, skuSuffix: '250ML', nameSuffix: '250 ml', price: 4800, stock: 50 }
        ]
    },
    {
        name: 'Sérum Visage Éclat Anti-Taches à la Vitamine C',
        description: 'Atténue les taches brunes, unifie le teint et redonne de l\'éclat aux peaux ternes en quelques semaines.',
        primaryVendorIndex: 11, // Arconville Calavi
        additionalVendorIndices: [3], // Cadjehoun
        optionGroupId: 54, // Volume
        variants: [
            { optionId: 194, skuSuffix: '30ML', nameSuffix: '30 ml', price: 6500, stock: 60 },
            { optionId: 195, skuSuffix: '50ML', nameSuffix: '50 ml', price: 9500, stock: 45 }
        ]
    },
    {
        name: 'Eau Florale de Rose Pure Tonifiante et Apaisante',
        description: 'Lotion tonique naturelle pour resserrer les pores et rafraîchir le visage matin et soir après le démaquillage.',
        primaryVendorIndex: 3, // Cadjehoun Bio
        additionalVendorIndices: [11], // Arconville
        optionGroupId: 54, // Volume
        variants: [
            { optionId: 164, skuSuffix: '100ML', nameSuffix: '100 ml', price: 2800, stock: 85 },
            { optionId: 165, skuSuffix: '200ML', nameSuffix: '200 ml', price: 4800, stock: 55 }
        ]
    },
    {
        name: 'Gommage Corps Exfoliant au Café et Sucre Roux',
        description: 'Élimine les cellules mortes, stimule la circulation sanguine et laisse la peau ultra satinée.',
        primaryVendorIndex: 11, // Arconville Calavi
        additionalVendorIndices: [9], // Tokpota
        optionGroupId: 55, // Poids
        variants: [
            { optionId: 192, skuSuffix: '250G', nameSuffix: '250 g', price: 3500, stock: 70 },
            { optionId: 193, skuSuffix: '500G', nameSuffix: '500 g', price: 6000, stock: 45 }
        ]
    },
    {
        name: 'Baume à Lèvres Ultra-Nourrissant Cire d\'Abeille et Karité',
        description: 'Répare instantanément les lèvres sèches et gercées avec un fini discret et protecteur longue durée.',
        primaryVendorIndex: 3, // Cadjehoun Bio
        additionalVendorIndices: [11, 13], // Arconville, Zogbadje
        optionGroupId: 56, // Matière
        variants: [
            { optionId: 207, skuSuffix: 'PLASTIQUE', nameSuffix: 'Plastique', price: 1200, stock: 120 }
        ]
    },
    {
        name: 'Gel Douche Énergisant au Gingembre et Citronnelle',
        description: 'Mousse onctueuse au parfum tonifiant pour réveiller le corps et laisser une sensation de fraîcheur immédiate.',
        primaryVendorIndex: 9, // Tokpota Porto-Novo
        additionalVendorIndices: [3], // Cadjehoun
        optionGroupId: 54, // Volume
        variants: [
            { optionId: 187, skuSuffix: '250ML', nameSuffix: '250 ml', price: 2500, stock: 90 },
            { optionId: 243, skuSuffix: '1L', nameSuffix: '1 L', price: 7500, stock: 40 }
        ]
    },
    {
        name: 'Huile Essentielle Pure d\'Eucalyptus Globulus',
        description: 'Purifiante et décongestionnante pour assainir l\'air intérieur et dégager les voies respiratoires.',
        primaryVendorIndex: 3, // Cadjehoun Bio
        additionalVendorIndices: [11], // Arconville
        optionGroupId: 54, // Volume
        variants: [
            { optionId: 194, skuSuffix: '30ML', nameSuffix: '30 ml', price: 3200, stock: 65 },
            { optionId: 195, skuSuffix: '50ML', nameSuffix: '50 ml', price: 4800, stock: 40 }
        ]
    },
    {
        name: 'Poudre de Chébé Traditionnelle Authentique',
        description: 'Secret de beauté pour des cheveux très longs et forts. Retient l\'hydratation et prévient les pointes fourchues.',
        primaryVendorIndex: 9, // Tokpota Porto-Novo
        additionalVendorIndices: [11], // Arconville
        optionGroupId: 55, // Poids
        variants: [
            { optionId: 191, skuSuffix: '100G', nameSuffix: '100 g', price: 2500, stock: 90 },
            { optionId: 192, skuSuffix: '250G', nameSuffix: '250 g', price: 5500, stock: 55 }
        ]
    },
    {
        name: 'Savon Clarifiant au Curcuma et Miel d\'Atacora',
        description: 'Savon illuminateur doux pour atténuer les cicatrices et redonner un éclat naturel et sans bouton.',
        primaryVendorIndex: 11, // Arconville Calavi
        additionalVendorIndices: [3], // Cadjehoun
        optionGroupId: 55, // Poids
        variants: [
            { optionId: 191, skuSuffix: '100G', nameSuffix: '100 g', price: 900, stock: 140 },
            { optionId: 192, skuSuffix: '250G', nameSuffix: '250 g', price: 2000, stock: 85 }
        ]
    },
    {
        name: 'Lait Corporel Unifiant Naturel à l\'Extrait de Carotte',
        description: 'Nourrit en profondeur et donne une jolie teinte dorée naturelle sans aucun agent blanchissant agressif.',
        primaryVendorIndex: 9, // Tokpota Porto-Novo
        additionalVendorIndices: [11], // Arconville
        optionGroupId: 54, // Volume
        variants: [
            { optionId: 187, skuSuffix: '250ML', nameSuffix: '250 ml', price: 4500, stock: 70 },
            { optionId: 243, skuSuffix: '1L', nameSuffix: '1 L', price: 14000, stock: 35 }
        ]
    },
    {
        name: 'Déodorant Solide Naturel sans Sels d\'Aluminium',
        description: 'À base de beurre de karité, d\'huile de coco et de bicarbonate doux. Neutralise les odeurs pendant 24h.',
        primaryVendorIndex: 3, // Cadjehoun Bio
        additionalVendorIndices: [11], // Arconville
        optionGroupId: 54, // Volume
        variants: [
            { optionId: 195, skuSuffix: '50ML', nameSuffix: '50 ml', price: 2200, stock: 90 },
            { optionId: 164, skuSuffix: '100ML', nameSuffix: '100 ml', price: 3800, stock: 60 }
        ]
    },
    {
        name: 'Huile Pure de Baobab Régénérante Peaux Sèches',
        description: 'Huile précieuse anti-âge riche en omégas 3, 6 et 9 qui redonne élasticité et souplesse à l\'épiderme.',
        primaryVendorIndex: 11, // Arconville Calavi
        additionalVendorIndices: [3], // Cadjehoun
        optionGroupId: 54, // Volume
        variants: [
            { optionId: 195, skuSuffix: '50ML', nameSuffix: '50 ml', price: 3500, stock: 75 },
            { optionId: 164, skuSuffix: '100ML', nameSuffix: '100 ml', price: 6200, stock: 45 }
        ]
    },
    {
        name: 'Crème Solaire Haute Protection Invisible SPF 50',
        description: 'Protection solaire large spectre sans traces blanches ni film gras, spécialement formulée pour peaux mélanodermes.',
        primaryVendorIndex: 3, // Cadjehoun Bio
        additionalVendorIndices: [11], // Arconville
        optionGroupId: 54, // Volume
        variants: [
            { optionId: 195, skuSuffix: '50ML', nameSuffix: '50 ml', price: 7500, stock: 60 },
            { optionId: 164, skuSuffix: '100ML', nameSuffix: '100 ml', price: 12000, stock: 40 }
        ]
    },
    {
        name: 'Eau de Parfum Artisanale Fragrance Ambrée & Épicée',
        description: 'Création parfumée haut de gamme mêlant notes de vanille de Madagascar, bois de oud et cannelle.',
        primaryVendorIndex: 11, // Arconville Calavi
        additionalVendorIndices: [3, 9], // Cadjehoun, Tokpota
        optionGroupId: 54, // Volume
        variants: [
            { optionId: 195, skuSuffix: '50ML', nameSuffix: '50 ml', price: 18000, stock: 40 },
            { optionId: 164, skuSuffix: '100ML', nameSuffix: '100 ml', price: 32000, stock: 25 }
        ]
    }
];

async function seed() {
    console.log('🚀 Starting Ahizan Marketplace 15 Vendors & 100 Products Seeder...');
    await dataSource.initialize();
    console.log('🔌 Connected to PostgreSQL Database.');

    const queryRunner = dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
        // 1. Fetch Default Channel
        const channelResult = await queryRunner.query(
            `SELECT id FROM channel WHERE code = '__default_channel__' LIMIT 1;`
        );
        const defaultChannelId = channelResult.length > 0 ? channelResult[0].id : 1;
        console.log(`📦 Default Channel ID: ${defaultChannelId}`);

        // 2. Fetch Customer Role & Vendor Role
        const roles = await queryRunner.query(`SELECT id, code FROM role;`);
        const customerRole = roles.find((r: any) => r.code === '__customer_role__') || roles[0];
        const vendorRole = roles.find((r: any) => r.code === 'vendor') || roles[0];

        // 3. Hash common password 'ahizan123'
        const passwordHash = await bcrypt.hash('ahizan123', 12);
        console.log(`🔑 Password 'ahizan123' hashed successfully.`);

        // 4. Create or Update 15 Vendors
        console.log(`\n🏪 --- Processing 15 Vendors ---`);
        const vendorDbIds: number[] = [];

        for (let i = 0; i < VENDORS.length; i++) {
            const v = VENDORS[i];
            
            // Check if User exists
            let userResult = await queryRunner.query(
                `SELECT u.id FROM "user" u 
                 JOIN authentication_method am ON am."userId" = u.id 
                 WHERE am.identifier = $1 LIMIT 1;`,
                [v.email]
            );

            let userId: number;
            if (userResult.length > 0) {
                userId = userResult[0].id;
                console.log(`  🔄 User already exists: ${v.email} (User ID: ${userId})`);
                // Update password hash just in case
                await queryRunner.query(
                    `UPDATE authentication_method SET "passwordHash" = $1 WHERE "userId" = $2;`,
                    [passwordHash, userId]
                );
            } else {
                // Insert User
                const newUser = await queryRunner.query(
                    `INSERT INTO "user" ("createdAt", "updatedAt", "identifier", "verified")
                     VALUES (NOW(), NOW(), $1, true) RETURNING id;`,
                    [v.email]
                );
                userId = newUser[0].id;

                // Insert Native Authentication Method
                await queryRunner.query(
                    `INSERT INTO authentication_method ("createdAt", "updatedAt", "identifier", "passwordHash", "userId", "type")
                     VALUES (NOW(), NOW(), $1, $2, $3, 'NativeAuthenticationMethod');`,
                    [v.email, passwordHash, userId]
                );

                // Assign Roles (__customer_role__ and vendor)
                await queryRunner.query(
                    `INSERT INTO user_roles_role ("userId", "roleId") VALUES ($1, $2) ON CONFLICT DO NOTHING;`,
                    [userId, customerRole.id]
                );
                await queryRunner.query(
                    `INSERT INTO user_roles_role ("userId", "roleId") VALUES ($1, $2) ON CONFLICT DO NOTHING;`,
                    [userId, vendorRole.id]
                );

                // Create Customer profile
                const newCustomer = await queryRunner.query(
                    `INSERT INTO customer ("createdAt", "updatedAt", "emailAddress", "firstName", "lastName", "phoneNumber", "userId")
                     VALUES (NOW(), NOW(), $1, $2, 'Vendeur Ahizan', $3, $4) RETURNING id;`,
                    [v.email, v.name.split(' ')[0], '+229 97 00 00 ' + String(i + 1).padStart(2, '0'), userId]
                );

                // Link Customer to Default Channel
                await queryRunner.query(
                    `INSERT INTO customer_channels_channel ("customerId", "channelId") VALUES ($1, $2) ON CONFLICT DO NOTHING;`,
                    [newCustomer[0].id, defaultChannelId]
                );

                console.log(`  ✨ Created User & Customer: ${v.email} (User ID: ${userId})`);
            }

            // Check if Vendor entity exists
            let vendorResult = await queryRunner.query(
                `SELECT id FROM vendor WHERE email = $1 OR "userId" = $2 LIMIT 1;`,
                [v.email, userId]
            );

            let vendorId: number;
            if (vendorResult.length > 0) {
                vendorId = vendorResult[0].id;
                // Update Vendor details
                await queryRunner.query(
                    `UPDATE vendor SET 
                        "name" = $1, "description" = $2, "address" = $3, "zone" = $4,
                        "locationId" = $5, "physicalMarketId" = $6, "latitude" = $7, "longitude" = $8,
                        "rating" = $9, "ratingCount" = $10, "status" = 'APPROVED', "verificationStatus" = true,
                        "phoneNumber" = $11, "updatedAt" = NOW()
                     WHERE id = $12;`,
                    [v.name, v.description, v.address, v.zoneName, v.locationId, v.physicalMarketId, v.latitude, v.longitude, v.rating, v.ratingCount, '+229 97 00 00 ' + String(i + 1).padStart(2, '0'), vendorId]
                );
                console.log(`  🔄 Updated Vendor: ${v.name} (Vendor ID: ${vendorId})`);
            } else {
                const newVendor = await queryRunner.query(
                    `INSERT INTO vendor (
                        "createdAt", "updatedAt", "name", "description", "status", "phoneNumber",
                        "address", "zone", "email", "rating", "ratingCount", "verificationStatus",
                        "commissionRate", "type", "latitude", "longitude", "userId", "locationId", "physicalMarketId"
                     ) VALUES (
                        NOW(), NOW(), $1, $2, 'APPROVED', $3,
                        $4, $5, $6, $7, $8, true,
                        0.05, 'SHOP', $9, $10, $11, $12, $13
                     ) RETURNING id;`,
                    [
                        v.name, v.description, '+229 97 00 00 ' + String(i + 1).padStart(2, '0'),
                        v.address, v.zoneName, v.email, v.rating, v.ratingCount,
                        v.latitude, v.longitude, userId, v.locationId, v.physicalMarketId
                    ]
                );
                vendorId = newVendor[0].id;
                console.log(`  ✨ Created Vendor: ${v.name} (Vendor ID: ${vendorId})`);
            }

            vendorDbIds.push(vendorId);
        }

        // 5. Create 100 Products, Variants, Option Links & Seller Offers
        console.log(`\n📦 --- Inserting 100 Products, Variants & Multi-Seller Offers ---`);

        let totalProductsCreated = 0;
        let totalVariantsCreated = 0;
        let totalOffersCreated = 0;

        for (let pIdx = 0; pIdx < PRODUCTS.length; pIdx++) {
            const p = PRODUCTS[pIdx];
            const primaryVendorId = vendorDbIds[p.primaryVendorIndex];
            const baseSlug = slugify(p.name);

            // Check if product with slug already exists
            let existingProd = await queryRunner.query(
                `SELECT pt."baseId" as id FROM product_translation pt WHERE pt.slug = $1 LIMIT 1;`,
                [baseSlug]
            );

            let productId: number;
            if (existingProd.length > 0) {
                productId = existingProd[0].id;
                console.log(`  🔄 Product already exists [${pIdx + 1}/100]: ${p.name} (ID: ${productId})`);
            } else {
                // 1. Insert Master Product
                const newProd = await queryRunner.query(
                    `INSERT INTO product (
                        "createdAt", "updatedAt", "enabled", "customFieldsVendorid", "customFieldsApprovalstatus"
                     ) VALUES (NOW(), NOW(), true, $1, 'approved') RETURNING id;`,
                    [primaryVendorId]
                );
                productId = newProd[0].id;

                // 2. Insert Product Translation (FR)
                await queryRunner.query(
                    `INSERT INTO product_translation (
                        "createdAt", "updatedAt", "languageCode", "name", "slug", "description", "baseId"
                     ) VALUES (NOW(), NOW(), 'fr', $1, $2, $3, $4);`,
                    [p.name, baseSlug, p.description, productId]
                );

                // 3. Link Product to Default Channel
                await queryRunner.query(
                    `INSERT INTO product_channels_channel ("productId", "channelId") VALUES ($1, $2) ON CONFLICT DO NOTHING;`,
                    [productId, defaultChannelId]
                );

                // 4. Link Product to Option Group
                await queryRunner.query(
                    `INSERT INTO product_option_groups_product_option_group ("productId", "productOptionGroupId")
                     VALUES ($1, $2) ON CONFLICT DO NOTHING;`,
                    [productId, p.optionGroupId]
                );

                totalProductsCreated++;
            }

            // 2. Insert Product Variants for each option
            for (let vIdx = 0; vIdx < p.variants.length; vIdx++) {
                const varDef = p.variants[vIdx];
                const sku = `AHZ-${String(pIdx + 1).padStart(3, '0')}-${varDef.skuSuffix}`;
                const variantName = `${p.name} - ${varDef.nameSuffix}`;

                let existingVariant = await queryRunner.query(
                    `SELECT id FROM product_variant WHERE sku = $1 LIMIT 1;`,
                    [sku]
                );

                let variantId: number;
                if (existingVariant.length > 0) {
                    variantId = existingVariant[0].id;
                } else {
                    // Create Variant
                    const newVariant = await queryRunner.query(
                        `INSERT INTO product_variant (
                            "createdAt", "updatedAt", "enabled", "sku", "outOfStockThreshold",
                            "useGlobalOutOfStockThreshold", "trackInventory", "productId",
                            "customFieldsOfferstatus", "customFieldsCondition"
                         ) VALUES (
                            NOW(), NOW(), true, $1, 0,
                            true, 'TRUE', $2,
                            'approved', 'NEW'
                         ) RETURNING id;`,
                        [sku, productId]
                    );
                    variantId = newVariant[0].id;

                    // Variant Translation (FR)
                    await queryRunner.query(
                        `INSERT INTO product_variant_translation (
                            "createdAt", "updatedAt", "languageCode", "name", "baseId"
                         ) VALUES (NOW(), NOW(), 'fr', $1, $2);`,
                        [variantName, variantId]
                    );

                    // Variant Price in Channel (in standard XOF integer)
                    await queryRunner.query(
                        `INSERT INTO product_variant_price (
                            "createdAt", "updatedAt", "currencyCode", "channelId", "price", "variantId"
                         ) VALUES (NOW(), NOW(), 'XOF', $1, $2, $3);`,
                        [defaultChannelId, varDef.price, variantId]
                    );

                    // Insert Stock Level (Default Stock Location = 1)
                    await queryRunner.query(
                        `INSERT INTO stock_level ("createdAt", "updatedAt", "stockOnHand", "stockAllocated", "productVariantId", "stockLocationId")
                         VALUES (NOW(), NOW(), $1, 0, $2, 1) ON CONFLICT DO NOTHING;`,
                        [varDef.stock || 100, variantId]
                    );

                    // Link Variant to Channel
                    await queryRunner.query(
                        `INSERT INTO product_variant_channels_channel ("productVariantId", "channelId")
                         VALUES ($1, $2) ON CONFLICT DO NOTHING;`,
                        [variantId, defaultChannelId]
                    );

                    // Link Variant to Product Option
                    await queryRunner.query(
                        `INSERT INTO product_variant_options_product_option ("productVariantId", "productOptionId")
                         VALUES ($1, $2) ON CONFLICT DO NOTHING;`,
                        [variantId, varDef.optionId]
                    );

                    totalVariantsCreated++;
                }

                // 3. Create Seller Offers
                // Primary Vendor Offer
                const primaryOfferCheck = await queryRunner.query(
                    `SELECT id FROM seller_offer WHERE "vendorId" = $1 AND "productVariantId" = $2 LIMIT 1;`,
                    [primaryVendorId, variantId]
                );

                if (primaryOfferCheck.length === 0) {
                    await queryRunner.query(
                        `INSERT INTO seller_offer (
                            "createdAt", "updatedAt", "price", "stock", "sku",
                            "deliveryTimeValue", "deliveryTimeUnit", "condition", "onPromotion",
                            "status", "vendorId", "productVariantId"
                         ) VALUES (
                            NOW(), NOW(), $1, $2, $3,
                            2, 'HOURS', 'NEW', false,
                            'approved', $4, $5
                         );`,
                        [varDef.price, varDef.stock, sku, primaryVendorId, variantId]
                    );
                    totalOffersCreated++;
                }

                // Additional Competing Vendor Offers (Shared multi-vendor catalog)
                for (const addVendorIdx of p.additionalVendorIndices) {
                    const competitorVendorId = vendorDbIds[addVendorIdx];
                    const compOfferCheck = await queryRunner.query(
                        `SELECT id FROM seller_offer WHERE "vendorId" = $1 AND "productVariantId" = $2 LIMIT 1;`,
                        [competitorVendorId, variantId]
                    );

                    if (compOfferCheck.length === 0) {
                        // Slightly vary price (+/- 2% to 5%) and delivery for competing sellers
                        const priceVariance = (addVendorIdx % 2 === 0) ? -Math.round(varDef.price * 0.03) : Math.round(varDef.price * 0.02);
                        const compPrice = Math.max(500, varDef.price + priceVariance);
                        const compStock = Math.floor(varDef.stock * 0.7);

                        await queryRunner.query(
                            `INSERT INTO seller_offer (
                                "createdAt", "updatedAt", "price", "stock", "sku",
                                "deliveryTimeValue", "deliveryTimeUnit", "condition", "onPromotion",
                                "status", "vendorId", "productVariantId"
                             ) VALUES (
                                NOW(), NOW(), $1, $2, $3,
                                4, 'HOURS', 'NEW', false,
                                'approved', $4, $5
                             );`,
                            [compPrice, compStock, `${sku}-V${addVendorIdx + 1}`, competitorVendorId, variantId]
                        );
                        totalOffersCreated++;
                    }
                }
            }
        }

        await queryRunner.commitTransaction();
        console.log(`\n🎉 SEED COMPLETED SUCCESSFULLY!`);
        console.log(`  - 15 Vendors verified & configured (5 Cotonou, 5 Porto-Novo, 5 Abomey-Calavi)`);
        console.log(`  - Password for all 15 vendors: 'ahizan123'`);
        console.log(`  - ${totalProductsCreated} new Products created`);
        console.log(`  - ${totalVariantsCreated} new Variants created`);
        console.log(`  - ${totalOffersCreated} new Multi-Vendor Offers created`);

    } catch (err) {
        console.error('❌ SEED FAILED, rolling back transaction:', err);
        await queryRunner.rollbackTransaction();
        throw err;
    } finally {
        await queryRunner.release();
        await dataSource.destroy();
    }
}

seed().catch((e) => {
    console.error(e);
    process.exit(1);
});
