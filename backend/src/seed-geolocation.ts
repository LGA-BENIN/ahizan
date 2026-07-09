import { DataSource } from 'typeorm';
import * as fs from 'fs';
import * as path from 'path';
import 'dotenv/config';
import { GeographicLocation, LocationType } from './plugins/multivendor/entities/geographic-location.entity';
import { Market } from './plugins/multivendor/entities/market.entity';

const dataSource = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST || '127.0.0.1',
    port: +(process.env.DB_PORT || 5432),
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 'vendure',
    schema: process.env.DB_SCHEMA || 'public',
    entities: [GeographicLocation, Market],
    synchronize: true, // This will automatically sync new tables to the DB
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

async function seed() {
    console.log('🚀 Starting Geolocation and Markets Seeder...');
    await dataSource.initialize();
    console.log('🔌 Connected to PostgreSQL Database.');

    const locationRepo = dataSource.getRepository(GeographicLocation);
    const marketRepo = dataSource.getRepository(Market);

    // 1. Seed Cities
    console.log('🏙️ Seeding Cities...');
    const citiesData = [
        { name: 'Cotonou', lat: 6.3654, lng: 2.4183, radius: 8000 },
        { name: 'Porto-Novo', lat: 6.4969, lng: 2.6288, radius: 6000 },
        { name: 'Abomey-Calavi', lat: 6.4481, lng: 2.3524, radius: 8000 },
    ];

    const citiesMap = new Map<string, GeographicLocation>();

    for (const city of citiesData) {
        let dbCity = await locationRepo.findOne({ where: { name: city.name, type: LocationType.CITY } });
        if (!dbCity) {
            dbCity = new GeographicLocation({
                name: city.name,
                type: LocationType.CITY,
                centerLatitude: city.lat,
                centerLongitude: city.lng,
                radiusMeters: city.radius,
                isActive: true,
            });
            await locationRepo.save(dbCity);
            console.log(`✅ Created City: ${city.name}`);
        } else {
            console.log(`ℹ️ City already exists: ${city.name}`);
        }
        citiesMap.set(city.name, dbCity);
    }

    // 2. Seed Default Neighborhoods (Quartiers)
    console.log('🏘️ Seeding Neighborhoods...');
    const neighborhoodsData = [
        // Cotonou neighborhoods
        { name: 'Akpakpa Dodomè', city: 'Cotonou', lat: 6.3873, lng: 2.4573, radius: 800 },
        { name: 'Agla', city: 'Cotonou', lat: 6.3650, lng: 2.3780, radius: 1000 },
        { name: 'Fidjrossè', city: 'Cotonou', lat: 6.3690, lng: 2.3610, radius: 1200 },
        { name: 'Cadjèhoun', city: 'Cotonou', lat: 6.3620, lng: 2.4000, radius: 800 },
        { name: 'Gbégamey', city: 'Cotonou', lat: 6.3650, lng: 2.4080, radius: 800 },
        { name: 'Saint Michel', city: 'Cotonou', lat: 6.3620, lng: 2.4280, radius: 800 },
        { name: 'Zongo', city: 'Cotonou', lat: 6.3660, lng: 2.4220, radius: 600 },
        { name: 'Haie Vive', city: 'Cotonou', lat: 6.3720, lng: 2.3950, radius: 800 },
        
        // Porto-Novo neighborhoods
        { name: 'Ouando', city: 'Porto-Novo', lat: 6.5050, lng: 2.6180, radius: 1000 },
        { name: 'Ahouangbo', city: 'Porto-Novo', lat: 6.4880, lng: 2.6280, radius: 800 },
        { name: 'Tokpota', city: 'Porto-Novo', lat: 6.5150, lng: 2.6320, radius: 1200 },

        // Abomey-Calavi neighborhoods
        { name: 'Zogbadjè', city: 'Abomey-Calavi', lat: 6.4220, lng: 2.3420, radius: 1000 },
        { name: 'Godomey', city: 'Abomey-Calavi', lat: 6.4150, lng: 2.3550, radius: 1500 },
        { name: 'Cococodji', city: 'Abomey-Calavi', lat: 6.4250, lng: 2.2980, radius: 1200 },
    ];

    const neighborhoodMap = new Map<string, GeographicLocation>();

    for (const q of neighborhoodsData) {
        const parentCity = citiesMap.get(q.city);
        if (!parentCity) continue;

        let dbNeighborhood = await locationRepo.findOne({ where: { name: q.name, type: LocationType.NEIGHBORHOOD, parent: { id: parentCity.id } } });
        if (!dbNeighborhood) {
            dbNeighborhood = new GeographicLocation({
                name: q.name,
                type: LocationType.NEIGHBORHOOD,
                centerLatitude: q.lat,
                centerLongitude: q.lng,
                radiusMeters: q.radius,
                isActive: true,
                parent: parentCity,
            });
            await locationRepo.save(dbNeighborhood);
            console.log(`  ✅ Created Neighborhood: ${q.name} (${q.city})`);
        } else {
            console.log(`  ℹ️ Neighborhood already exists: ${q.name} (${q.city})`);
        }
        neighborhoodMap.set(q.name, dbNeighborhood);
    }

    // 3. Parse and Seed Markets from market.md
    console.log('🛒 Parsing and Seeding Markets from market.md...');
    let marketFile = '/srv/ahizan/scratch/market.md';
    if (!fs.existsSync(marketFile)) {
        marketFile = path.join(process.cwd(), 'market.md');
    }
    if (!fs.existsSync(marketFile)) {
        marketFile = path.join(process.cwd(), '../scratch/market.md');
    }
    if (!fs.existsSync(marketFile)) {
        marketFile = './market.md';
    }
    if (!fs.existsSync(marketFile)) {
        console.error(`❌ Fichier market.md introuvable (tenté /srv/ahizan/scratch/market.md, ${path.join(process.cwd(), 'market.md')}, ${path.join(process.cwd(), '../scratch/market.md')} et ./market.md) !`);
        await dataSource.destroy();
        process.exit(1);
    }

    const marketCoords: Record<string, { lat: number; lng: number; radius: number }> = {
        'Marché Dantokpa': { lat: 6.3670, lng: 2.4400, radius: 1200 },
        'Marché Moderne de PK3': { lat: 6.3880, lng: 2.4700, radius: 600 },
        'Marché Moderne de Ganhi': { lat: 6.3570, lng: 2.4300, radius: 600 },
        'Marché de Cadjèhoun': { lat: 6.3620, lng: 2.4000, radius: 400 },
        'Marché de Gbégamey': { lat: 6.3650, lng: 2.4080, radius: 500 },
        'Marché de Mènontin': { lat: 6.3710, lng: 2.3850, radius: 600 },
        'Marché d\'Aïdjèdo': { lat: 6.3770, lng: 2.4180, radius: 500 },
        'Marché de Wologuèdè': { lat: 6.3720, lng: 2.4130, radius: 400 },
        'Marché de Tokplégbé': { lat: 6.3780, lng: 2.4550, radius: 600 },
        'Marché de Midombo': { lat: 6.3740, lng: 2.4620, radius: 500 },
        'Marché de la Sainte Trinité': { lat: 6.3750, lng: 2.4380, radius: 400 },
        'Marché Missèbo': { lat: 6.3630, lng: 2.4350, radius: 800 },
        'Marché de Zongo': { lat: 6.3660, lng: 2.4220, radius: 500 },
        'Marché de Ouando': { lat: 6.5050, lng: 2.6180, radius: 1000 },
        'Marché d\'Ahouangbo': { lat: 6.4880, lng: 2.6280, radius: 600 },
        'Marché de Djassin': { lat: 6.4780, lng: 2.6320, radius: 600 },
        'Marché de Godomey': { lat: 6.4150, lng: 2.3550, radius: 800 },
        'Marché d\'Akassato': { lat: 6.5350, lng: 2.3480, radius: 1000 },
        'Marché de Cococodji': { lat: 6.4250, lng: 2.2980, radius: 800 },
        'Marché de Zogbadjè': { lat: 6.4220, lng: 2.3420, radius: 600 },
        'Marché de Glo-Djigbé': { lat: 6.6200, lng: 2.2900, radius: 1200 },
    };

    const content = fs.readFileSync(marketFile, 'utf-8');
    const lines = content.split('\n');

    for (const line of lines) {
        if (line.trim().startsWith('|') && !line.includes(':---') && !line.includes('Nom du Marché')) {
            const parts = line.split('|').map(p => p.trim()).filter(Boolean);
            if (parts.length >= 3) {
                const name = parts[0];
                const city = parts[1];
                const description = parts[2];
                const slug = slugify(name);

                const coords = marketCoords[name] || { lat: 6.3654, lng: 2.4183, radius: 500 };
                const parentCity = citiesMap.get(city);

                let dbMarket = await marketRepo.findOne({ where: { slug } });
                if (!dbMarket) {
                    dbMarket = new Market({
                        name,
                        slug,
                        description,
                        centerLatitude: coords.lat,
                        centerLongitude: coords.lng,
                        radiusMeters: coords.radius,
                        allowedFacetIds: [],
                        location: parentCity,
                    });
                    await marketRepo.save(dbMarket);
                    console.log(`  ✅ Created Market: ${name} (Slug: ${slug}) in ${city}`);
                } else {
                    console.log(`  ℹ️ Market already exists: ${name} (Slug: ${slug})`);
                }
            }
        }
    }

    console.log('🎉 Seeding successfully completed!');
    await dataSource.destroy();
}

seed().catch(err => {
    console.error('❌ Seeding failed:', err);
    dataSource.destroy().catch(() => {});
});
