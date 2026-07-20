import { Injectable } from '@nestjs/common';
import { TransactionalConnection, RequestContext } from '@vendure/core';
import { In } from 'typeorm';
import { GeoZone, GeoZoneType, GeoZoneStatus } from '../entities/geo-zone.entity';
import { Market } from '../entities/market.entity';
import { DeliveryZone, DeliveryZoneType } from '../entities/delivery-zone.entity';
import { Vendor } from '../../multivendor/entities/vendor.entity';
import { PlatformSettings } from '../../multivendor/entities/platform-settings.entity';
import * as XLSX from 'xlsx';

@Injectable()
export class GeoService {
    constructor(public connection: TransactionalConnection) {}

    async getLocation(ctx: RequestContext, id: number): Promise<GeoZone | null> {
        return this.connection.getRepository(ctx, GeoZone).findOne({ where: { id } });
    }

    async getMarket(ctx: RequestContext, id: number): Promise<Market | null> {
        return this.connection.getRepository(ctx, Market).findOne({
            where: { id },
            relations: ['geoZone'],
        });
    }

    async getMarketsByIds(ctx: RequestContext, ids: number[]): Promise<Market[]> {
        if (!ids || ids.length === 0) {
            return [];
        }
        return this.connection.getRepository(ctx, Market).find({
            where: { id: In(ids) },
            relations: ['geoZone'],
        });
    }

    // -------------------------------------------------------------
    // PHASE 2 GEOMETRIC METHODS
    // -------------------------------------------------------------

    /**
     * Detects location hierarchy based on GPS coordinates.
     */
    async detectLocation(ctx: RequestContext, ipAddress?: string, gps?: { lat: number; lng: number }): Promise<GeoZone[]> {
        if (gps) {
            return this.reverseGeocode(ctx, gps.lat, gps.lng);
        }
        return [];
    }

    /**
     * Performs reverse geocoding via PostGIS.
     * Returns the GeoZone hierarchy containing the coordinate sorted from largest (COUNTRY) to smallest (NEIGHBORHOOD).
     */
    async reverseGeocode(ctx: RequestContext, lat: number, lng: number): Promise<GeoZone[]> {
        // Safe parameterized PostGIS query to prevent SQL injections
        const query = `
            SELECT id
            FROM geo_zone
            WHERE status = 'ACTIVE' AND (
                (boundary IS NOT NULL AND ST_Contains(boundary, ST_SetSRID(ST_Point($1, $2), 4326)))
                OR
                (boundary IS NULL AND "centerLatitude" IS NOT NULL AND "centerLongitude" IS NOT NULL AND "radiusMeters" IS NOT NULL AND
                 ST_Distance(ST_SetSRID(ST_Point("centerLongitude", "centerLatitude"), 4326)::geography, ST_SetSRID(ST_Point($1, $2), 4326)::geography) <= "radiusMeters")
            )
        `;
        const raw = await this.connection.rawConnection.query(query, [lng, lat]);
        if (raw.length === 0) {
            return [];
        }

        const ids = raw.map((r: any) => r.id);
        const zones = await this.connection.getRepository(ctx, GeoZone).find({
            where: { id: In(ids) },
            relations: ['parent'],
        });

        // Hierarchy ordering COUNTRY -> DEPARTMENT -> COMMUNE -> ARRONDISSEMENT -> NEIGHBORHOOD
        const typeOrder = [
            GeoZoneType.COUNTRY,
            GeoZoneType.DEPARTMENT,
            GeoZoneType.COMMUNE,
            GeoZoneType.ARRONDISSEMENT,
            GeoZoneType.NEIGHBORHOOD
        ];

        return zones.sort((a: GeoZone, b: GeoZone) => typeOrder.indexOf(a.type) - typeOrder.indexOf(b.type));
    }

    /**
     * Geocodes an address string using Nominatim API. Fallbacks to Cotonou center.
     */
    async geocode(ctx: RequestContext, address: string): Promise<{ lat: number; lng: number }> {
        const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&limit=1`;
        try {
            const response = await fetch(url, {
                headers: { 'User-Agent': 'Ahizan-GeoEngine/1.0 (contact@ahizan.com)' }
            });
            if (!response.ok) {
                throw new Error(`Nominatim API returned HTTP status ${response.status}`);
            }
            const data = await response.json() as any[];
            if (data && data.length > 0) {
                return {
                    lat: parseFloat(data[0].lat),
                    lng: parseFloat(data[0].lon)
                };
            }
        } catch (e) {
            console.error(`[GeoService] Geocoding failed for "${address}":`, e);
        }
        return { lat: 6.3654, lng: 2.4183 };
    }

    /**
     * Retrieves direct child administrative zones.
     */
    async getChildren(ctx: RequestContext, zoneId: number): Promise<GeoZone[]> {
        return this.connection.getRepository(ctx, GeoZone).find({
            where: { parent: { id: zoneId }, status: GeoZoneStatus.ACTIVE },
        });
    }

    /**
     * Retrieves the full administrative path (breadcrumb path) down to the zone.
     */
    async getPath(ctx: RequestContext, zoneId: number): Promise<GeoZone[]> {
        const path: GeoZone[] = [];
        let current = await this.connection.getRepository(ctx, GeoZone).findOne({
            where: { id: zoneId },
            relations: ['parent'],
        });

        while (current) {
            path.unshift(current);
            if (current.parent) {
                current = await this.connection.getRepository(ctx, GeoZone).findOne({
                    where: { id: current.parent.id },
                    relations: ['parent'],
                });
            } else {
                break;
            }
        }
        return path;
    }

    /**
     * Returns markets sorted by distance from the coordinate, up to a radius.
     */
    async getNearbyMarkets(ctx: RequestContext, lat: number, lng: number, radiusMeters: number): Promise<Market[]> {
        const query = `
            SELECT id,
                   ST_Distance(ST_SetSRID(ST_Point("centerLongitude", "centerLatitude"), 4326)::geography, ST_SetSRID(ST_Point($1, $2), 4326)::geography) AS distance
            FROM market
            WHERE "centerLatitude" IS NOT NULL AND "centerLongitude" IS NOT NULL AND
                  ST_Distance(ST_SetSRID(ST_Point("centerLongitude", "centerLatitude"), 4326)::geography, ST_SetSRID(ST_Point($1, $2), 4326)::geography) <= $3
            ORDER BY distance ASC
        `;
        const raw = await this.connection.rawConnection.query(query, [lng, lat, radiusMeters]);
        if (raw.length === 0) {
            return [];
        }

        const ids = raw.map((r: any) => r.id);
        const markets = await this.connection.getRepository(ctx, Market).find({
            where: { id: In(ids) },
            relations: ['geoZone'],
        });

        // Preserve distance sorting
        return ids.map((id: number) => markets.find((m: Market) => m.id === id)!).filter(Boolean);
    }

    /**
     * Checks if a GPS point is inside a GeoJSON or WKT geometry.
     */
    async isInsidePolygon(ctx: RequestContext, point: { lat: number; lng: number }, geometry: any): Promise<boolean> {
        let geomStr: string;
        let query: string;
        if (typeof geometry === 'string') {
            geomStr = geometry;
            query = `SELECT ST_Contains(ST_GeomFromText($1, 4326), ST_SetSRID(ST_Point($2, $3), 4326)) AS inside`;
        } else {
            geomStr = JSON.stringify(geometry);
            query = `SELECT ST_Contains(ST_GeomFromGeoJSON($1), ST_SetSRID(ST_Point($2, $3), 4326)) AS inside`;
        }
        const raw = await this.connection.rawConnection.query(query, [geomStr, point.lng, point.lat]);
        return !!raw[0]?.inside;
    }

    /**
     * Calculates geodesic distance between two points in meters.
     */
    async calculateDistance(ctx: RequestContext, p1: { lat: number; lng: number }, p2: { lat: number; lng: number }): Promise<number> {
        const query = `SELECT ST_Distance(ST_SetSRID(ST_Point($1, $2), 4326)::geography, ST_SetSRID(ST_Point($3, $4), 4326)::geography) AS distance`;
        const raw = await this.connection.rawConnection.query(query, [p1.lng, p1.lat, p2.lng, p2.lat]);
        return parseFloat(raw[0]?.distance ?? 0);
    }

    /**
     * Evaluates if the client coordinates fall within any active delivery zone of the vendor.
     * Selects the cheapest zone and returns it.
     */
    async checkDeliveryEligibility(ctx: RequestContext, clientGps: { lat: number; lng: number }, vendorId: string): Promise<{ eligible: boolean; fee: number }> {
        const query = `
            SELECT dz.id, dz.price, dz."ownerId"
            FROM delivery_zone dz
            LEFT JOIN geo_zone gz ON dz."geoZoneId" = gz.id
            WHERE (dz."ownerId" = $1 OR dz."ownerId" IS NULL) AND dz."isActive" = true AND (
                -- Case 1: Linked to a GeoZone
                (dz."geoZoneId" IS NOT NULL AND gz.status = 'ACTIVE' AND (
                    (gz.boundary IS NOT NULL AND ST_Contains(gz.boundary, ST_SetSRID(ST_Point($2, $3), 4326)))
                    OR
                    (gz.boundary IS NULL AND gz."centerLatitude" IS NOT NULL AND gz."centerLongitude" IS NOT NULL AND gz."radiusMeters" IS NOT NULL AND
                     ST_Distance(ST_SetSRID(ST_Point(gz."centerLongitude", gz."centerLatitude"), 4326)::geography, ST_SetSRID(ST_Point($2, $3), 4326)::geography) <= gz."radiusMeters")
                ))
                -- Case 2: Legacy fallback directly on delivery_zone fields
                OR
                (dz."geoZoneId" IS NULL AND (
                    (dz.type = 'RADIUS' AND dz."centerLatitude" IS NOT NULL AND dz."centerLongitude" IS NOT NULL AND dz."radiusMeters" IS NOT NULL AND
                     ST_Distance(ST_SetSRID(ST_Point(dz."centerLongitude", dz."centerLatitude"), 4326)::geography, ST_SetSRID(ST_Point($2, $3), 4326)::geography) <= dz."radiusMeters")
                    OR
                    (dz.type = 'POLYGON' AND dz."polygonGeometry" IS NOT NULL AND ST_Contains(dz."polygonGeometry", ST_SetSRID(ST_Point($2, $3), 4326)))
                ))
            )
            ORDER BY (dz."ownerId" IS NULL) ASC, dz.price ASC
            LIMIT 1
        `;
        const raw = await this.connection.rawConnection.query(query, [vendorId, clientGps.lng, clientGps.lat]);
        if (raw.length > 0) {
            return { eligible: true, fee: raw[0].price };
        }

        // Fallback: Dynamic distance-based kilometric calculator
        try {
            let vendorLat: number | null = null;
            let vendorLng: number | null = null;

            const rawVendor = await this.connection.rawConnection.query(
                `SELECT latitude, longitude, "physicalMarketId", "locationId" FROM vendor WHERE id = $1 LIMIT 1`,
                [vendorId]
            );

            if (rawVendor && rawVendor[0]) {
                const v = rawVendor[0];
                if (v.latitude != null && v.longitude != null) {
                    vendorLat = parseFloat(v.latitude);
                    vendorLng = parseFloat(v.longitude);
                } else if (v.physicalMarketId) {
                    const rawMarket = await this.connection.rawConnection.query(
                        `SELECT "centerLatitude", "centerLongitude" FROM physical_market WHERE id = $1 LIMIT 1`,
                        [v.physicalMarketId]
                    );
                    if (rawMarket && rawMarket[0] && rawMarket[0].centerLatitude != null) {
                        vendorLat = parseFloat(rawMarket[0].centerLatitude);
                        vendorLng = parseFloat(rawMarket[0].centerLongitude);
                    }
                } else if (v.locationId) {
                    const rawLoc = await this.connection.rawConnection.query(
                        `SELECT "centerLatitude", "centerLongitude" FROM geo_zone WHERE id = $1 LIMIT 1`,
                        [v.locationId]
                    );
                    if (rawLoc && rawLoc[0] && rawLoc[0].centerLatitude != null) {
                        vendorLat = parseFloat(rawLoc[0].centerLatitude);
                        vendorLng = parseFloat(rawLoc[0].centerLongitude);
                    }
                }
            }

            if (vendorLat == null || vendorLng == null || isNaN(vendorLat) || isNaN(vendorLng)) {
                vendorLat = 6.3654; // Cotonou center fallback
                vendorLng = 2.4183;
            }

            const distanceMeters = await this.calculateDistance(ctx, { lat: vendorLat, lng: vendorLng }, clientGps);
            const distanceKm = distanceMeters / 1000;
            
            // Platform level configured settings via raw query
            let baseFee = 500;
            let feePerKm = 100;
            try {
                const rawSettings = await this.connection.rawConnection.query(`SELECT "deliveryBaseFee", "deliveryFeePerKm" FROM platform_settings WHERE id = 'platform_settings' LIMIT 1`);
                if (rawSettings && rawSettings[0]) {
                    if (rawSettings[0].deliveryBaseFee != null) baseFee = Number(rawSettings[0].deliveryBaseFee);
                    if (rawSettings[0].deliveryFeePerKm != null) feePerKm = Number(rawSettings[0].deliveryFeePerKm);
                }
            } catch (e) {}

            const calculatedFee = Math.round(baseFee + (distanceKm * feePerKm));
            const finalFee = Math.max(calculatedFee, baseFee);
            
            return { eligible: true, fee: finalFee };
        } catch (e) {
            console.error('Failed to calculate dynamic distance-based delivery fee:', e);
        }

        // If all calculations fail, return baseFee instead of 0 to avoid free shipping by mistake
        try {
            const settings = await this.connection.getRepository(ctx, PlatformSettings).findOne({ where: { id: 'platform_settings' } as any });
            const baseFee = settings?.deliveryBaseFee ?? 500;
            return { eligible: true, fee: baseFee };
        } catch (e) {
            return { eligible: true, fee: 500 };
        }
    }

    /**
     * Imports an administrative boundary from Nominatim/OpenStreetMap.
     * Searches by name/query, extracts geojson, and saves it to the GeoZone.
     */
    async importBoundaryFromOSM(ctx: RequestContext, zoneId: number, queryStr: string): Promise<GeoZone> {
        const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(queryStr)}&format=json&polygon_geojson=1&limit=1`;
        
        try {
            const response = await fetch(url, {
                headers: { 'User-Agent': 'Ahizan-GeoEngine/1.0 (contact@ahizan.com)' }
            });
            if (!response.ok) {
                throw new Error(`Nominatim API returned HTTP status ${response.status}`);
            }
            const data = await response.json() as any[];
            if (!data || data.length === 0 || !data[0].geojson) {
                throw new Error(`No boundary found in OSM for query: "${queryStr}"`);
            }

            const geojson = data[0].geojson;
            // Simplify polygon automatically (10m tolerance ~ 0.00009 degrees in SRID 4326)
            // Using parameterized SQL to avoid SQL injection
            const updateQuery = `
                UPDATE geo_zone
                SET boundary = ST_SimplifyPreserveTopology(ST_GeomFromGeoJSON($1), 0.00009)
                WHERE id = $2
            `;
            await this.connection.rawConnection.query(updateQuery, [JSON.stringify(geojson), zoneId]);

            const updated = await this.getLocation(ctx, zoneId);
            if (!updated) {
                throw new Error(`GeoZone with id ${zoneId} not found after boundary update`);
            }
            return updated;
        } catch (e: any) {
            console.error('[GeoService] Failed to import boundary from OSM:', e);
            throw new Error(`OSM boundary import failed: ${e.message}`);
        }
    }

    /**
     * Performs a massive data import from CSV, Excel, or GeoJSON.
     * Takes base64 content, validates file size and signature, parses, and inserts records.
     */
    async importMassiveData(
        ctx: RequestContext,
        base64Content: string,
        format: 'csv' | 'xlsx' | 'xls' | 'geojson',
        type: 'GEOZONE' | 'MARKET' | 'DELIVERYZONE'
    ): Promise<{ count: number }> {
        const buffer = (globalThis as any).Buffer.from(base64Content, 'base64');
        
        // 1. Security check: File size limit (10MB)
        if (buffer.length > 10 * 1024 * 1024) {
            throw new Error('File size exceeds the 10MB security limit.');
        }

        // 2. Security check: Magic Bytes header signature validation
        const header = buffer.subarray(0, 4);
        if (format === 'xlsx') {
            const isXlsx = header[0] === 0x50 && header[1] === 0x4B && header[2] === 0x03 && header[3] === 0x04;
            if (!isXlsx) throw new Error('Security check failed: File header does not match XLSX signature.');
        } else if (format === 'xls') {
            const isXls = header[0] === 0xD0 && header[1] === 0xCF && header[2] === 0x11 && header[3] === 0xE0;
            if (!isXls) throw new Error('Security check failed: File header does not match XLS signature.');
        }

        let parsedData: any[] = [];

        // 3. Parsing logic
        if (format === 'geojson') {
            if (type !== 'GEOZONE') {
                throw new Error('GeoJSON import is only supported for GEOZONE type');
            }
            const geojson = JSON.parse(buffer.toString('utf-8'));
            if (geojson.type === 'FeatureCollection') {
                parsedData = geojson.features;
            } else if (geojson.type === 'Feature') {
                parsedData = [geojson];
            } else {
                parsedData = [{ type: 'Feature', geometry: geojson, properties: {} }];
            }
        } else if (format === 'csv') {
            const content = buffer.toString('utf-8');
            const lines = content.split(/\r?\n/).map((line: string) => {
                const result = [];
                let current = '';
                let inQuotes = false;
                for (let i = 0; i < line.length; i++) {
                    const char = line[i];
                    if (char === '"') {
                        inQuotes = !inQuotes;
                    } else if (char === ',' && !inQuotes) {
                        result.push(current.trim());
                        current = '';
                    } else {
                        current += char;
                    }
                }
                result.push(current.trim());
                return result;
            }).filter((row: string[]) => row.length > 0 && row.some((cell: string) => cell !== ''));

            if (lines.length > 1) {
                const headers = lines[0].map((h: string) => h.replace(/^"|"$/g, '').trim());
                for (let i = 1; i < lines.length; i++) {
                    const obj: Record<string, any> = {};
                    headers.forEach((h: string, idx: number) => {
                        let val = lines[i][idx];
                        if (val !== undefined) {
                            val = val.replace(/^"|"$/g, '').trim();
                            obj[h] = val;
                        }
                    });
                    parsedData.push(obj);
                }
            }
        } else {
            // Excel import (using pure JS sheets reader - immune to DTD/XXE)
            const workbook = XLSX.read(buffer, { type: 'buffer' });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            parsedData = XLSX.utils.sheet_to_json(worksheet) as any[];
        }

        // 4. Seeding/Import execution
        let count = 0;
        if (type === 'GEOZONE') {
            const repo = this.connection.getRepository(ctx, GeoZone);
            
            // If GeoJSON, import boundaries
            if (format === 'geojson') {
                for (const feature of parsedData) {
                    const props = feature.properties || {};
                    const name = props.name || 'Unnamed Boundary';
                    const slug = props.slug || name.toLowerCase().replace(/\s+/g, '-').replace(/[^\w\-]+/g, '');
                    
                    let zone = await repo.findOne({ where: { slug } });
                    if (!zone) {
                        zone = new GeoZone({
                            name,
                            slug,
                            type: props.type || GeoZoneType.NEIGHBORHOOD,
                            status: GeoZoneStatus.ACTIVE,
                            centerLatitude: props.centerLatitude ? parseFloat(props.centerLatitude) : null,
                            centerLongitude: props.centerLongitude ? parseFloat(props.centerLongitude) : null,
                            radiusMeters: props.radiusMeters ? parseInt(props.radiusMeters, 10) : null,
                        });
                        zone = await repo.save(zone);
                    }
                    
                    if (feature.geometry) {
                        const updateQuery = `
                            UPDATE geo_zone
                            SET boundary = ST_SimplifyPreserveTopology(ST_GeomFromGeoJSON($1), 0.00009)
                            WHERE id = $2
                        `;
                        await this.connection.rawConnection.query(updateQuery, [JSON.stringify(feature.geometry), zone.id]);
                    }
                    count++;
                }
            } else {
                // CSV/Excel imports
                for (const row of parsedData) {
                    const name = row.name;
                    if (!name) continue;
                    const slug = row.slug || name.toLowerCase().replace(/\s+/g, '-').replace(/[^\w\-]+/g, '');
                    
                    let zone = await repo.findOne({ where: { slug } });
                    if (!zone) {
                        zone = new GeoZone({
                            name,
                            slug,
                            type: row.type || GeoZoneType.NEIGHBORHOOD,
                            code: row.code || null,
                            status: GeoZoneStatus.ACTIVE,
                            centerLatitude: row.centerLatitude ? parseFloat(row.centerLatitude) : null,
                            centerLongitude: row.centerLongitude ? parseFloat(row.centerLongitude) : null,
                            radiusMeters: row.radiusMeters ? parseInt(row.radiusMeters, 10) : null,
                        });
                        
                        if (row.parentSlug) {
                            const parent = await repo.findOne({ where: { slug: row.parentSlug } });
                            if (parent) zone.parent = parent;
                        }
                        await repo.save(zone);
                        count++;
                    }
                }
            }
        } else if (type === 'MARKET') {
            const marketRepo = this.connection.getRepository(ctx, Market);
            const zoneRepo = this.connection.getRepository(ctx, GeoZone);
            
            for (const row of parsedData) {
                const name = row.name;
                if (!name) continue;
                const slug = row.slug || name.toLowerCase().replace(/\s+/g, '-').replace(/[^\w\-]+/g, '');
                
                let market = await marketRepo.findOne({ where: { slug } });
                if (!market) {
                    market = new Market({
                        name,
                        slug,
                        description: row.description || null,
                        centerLatitude: row.centerLatitude ? parseFloat(row.centerLatitude) : null,
                        centerLongitude: row.centerLongitude ? parseFloat(row.centerLongitude) : null,
                        radiusMeters: row.radiusMeters ? parseInt(row.radiusMeters, 10) : null,
                    });
                    
                    if (row.geoZoneSlug) {
                        const zone = await zoneRepo.findOne({ where: { slug: row.geoZoneSlug } });
                        if (zone) market.geoZone = zone;
                    }
                    await marketRepo.save(market);
                    count++;
                }
            }
        } else if (type === 'DELIVERYZONE') {
            const deliveryRepo = this.connection.getRepository(ctx, DeliveryZone);
            const zoneRepo = this.connection.getRepository(ctx, GeoZone);
            
            for (const row of parsedData) {
                const ownerId = row.ownerId;
                if (!ownerId) continue;
                
                let name = row.name;
                let geoZone = null;
                
                if (row.geoZoneSlug) {
                    geoZone = await zoneRepo.findOne({ where: { slug: row.geoZoneSlug } });
                    if (geoZone) {
                        name = name || `Livraison ${geoZone.name}`;
                    }
                }
                
                if (!name) continue;
                
                const zone = new DeliveryZone({
                    ownerId,
                    name,
                    price: row.price ? parseInt(row.price, 10) : 0,
                    type: geoZone ? (geoZone.boundary ? DeliveryZoneType.POLYGON : DeliveryZoneType.RADIUS) : (row.type || DeliveryZoneType.RADIUS),
                    centerLatitude: geoZone ? geoZone.centerLatitude : (row.centerLatitude ? parseFloat(row.centerLatitude) : null),
                    centerLongitude: geoZone ? geoZone.centerLongitude : (row.centerLongitude ? parseFloat(row.centerLongitude) : null),
                    radiusMeters: geoZone ? geoZone.radiusMeters : (row.radiusMeters ? parseInt(row.radiusMeters, 10) : null),
                    polygonGeometry: geoZone ? geoZone.boundary : null,
                    isActive: row.isActive !== undefined ? row.isActive === 'true' || row.isActive === true : true,
                });
                
                if (geoZone) {
                    zone.geoZone = geoZone;
                }
                
                await deliveryRepo.save(zone);
                count++;
            }
        }

        return { count };
    }
}
