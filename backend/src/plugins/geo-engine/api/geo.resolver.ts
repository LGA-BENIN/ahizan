import { Args, Mutation, Query, Resolver, ResolveField, Parent } from '@nestjs/graphql';
import { Ctx, RequestContext, Allow, Permission, Product } from '@vendure/core';
import { DeletionResponse, DeletionResult } from '@vendure/common/lib/generated-types';
import { GeoService } from '../service/geo.service';
import { GeoZone, GeoZoneStatus, GeoZoneType } from '../entities/geo-zone.entity';
import { Market } from '../entities/market.entity';
import { DeliveryZone, DeliveryZoneType } from '../entities/delivery-zone.entity';
import { In, IsNull } from 'typeorm';

@Resolver('GeoZone')
export class GeoResolver {
    constructor(private geoService: GeoService) {}

    @Query()
    @Allow(Permission.Public)
    async geoZones(@Ctx() ctx: RequestContext, @Args() args: any): Promise<GeoZone[]> {
        const repo = this.geoService.connection.getRepository(ctx, GeoZone);
        const queryBuilder = repo.createQueryBuilder('zone')
            .leftJoinAndSelect('zone.parent', 'parent');

        if (args.type) {
            queryBuilder.andWhere('zone.type = :type', { type: args.type });
        }

        if (args.parentName) {
            queryBuilder.andWhere('parent.name = :parentName', { parentName: args.parentName });
        }

        if (args.parentId) {
            queryBuilder.andWhere('zone.parentId = :parentId', { parentId: args.parentId });
        } else if (args.topLevelOnly) {
            queryBuilder.andWhere('zone.parentId IS NULL');
        }

        return queryBuilder.getMany();
    }

    @Query()
    @Allow(Permission.Public)
    async reverseGeocode(
        @Ctx() ctx: RequestContext,
        @Args() args: { latitude: number; longitude: number },
    ): Promise<GeoZone[]> {
        return this.geoService.reverseGeocode(ctx, args.latitude, args.longitude);
    }

    @Query()
    @Allow(Permission.Public)
    async resolveCoordinates(
        @Ctx() ctx: RequestContext,
        @Args() args: { latitude: number; longitude: number },
    ): Promise<any> {
        return this.geoService.resolveCoordinates(ctx, args.latitude, args.longitude);
    }

    @Query()
    @Allow(Permission.Public)
    async searchAddress(
        @Ctx() ctx: RequestContext,
        @Args() args: { query: string },
    ): Promise<any[]> {
        return this.geoService.searchAddress(ctx, args.query);
    }

    @Query()
    @Allow(Permission.Public)
    async geoZone(@Ctx() ctx: RequestContext, @Args() args: any): Promise<GeoZone | null> {
        const repo = this.geoService.connection.getRepository(ctx, GeoZone);
        if (args.id) {
            return repo.findOne({ where: { id: args.id }, relations: ['parent'] });
        }
        if (args.slug) {
            return repo.findOne({ where: { slug: args.slug }, relations: ['parent'] });
        }
        return null;
    }

    @Query()
    @Allow(Permission.Public)
    async markets(@Ctx() ctx: RequestContext, @Args() args: any): Promise<Market[]> {
        const repo = this.geoService.connection.getRepository(ctx, Market);
        const where: any = {};
        if (args.geoZoneId) {
            where.geoZone = { id: args.geoZoneId };
        }
        return repo.find({ where, relations: ['geoZone'] });
    }

    @Query()
    @Allow(Permission.Public)
    async market(@Ctx() ctx: RequestContext, @Args() args: any): Promise<Market | null> {
        const repo = this.geoService.connection.getRepository(ctx, Market);
        if (args.id) {
            return repo.findOne({ where: { id: args.id }, relations: ['geoZone'] });
        }
        if (args.slug) {
            return repo.findOne({ where: { slug: args.slug }, relations: ['geoZone'] });
        }
        return null;
    }

    @Query()
    @Allow(Permission.Public)
    async deliveryZones(@Ctx() ctx: RequestContext, @Args() args: any): Promise<DeliveryZone[]> {
        const repo = this.geoService.connection.getRepository(ctx, DeliveryZone);
        const where: any = args.ownerId 
            ? [ { ownerId: args.ownerId }, { ownerId: IsNull() } ]
            : { ownerId: IsNull() };
        return repo.find({
            where,
            relations: ['geoZone'],
            order: { price: 'ASC' }
        });
    }

    @Query()
    @Allow(Permission.Public)
    async geoZoneBySlug(@Ctx() ctx: RequestContext, @Args() args: { slug: string }): Promise<GeoZone | null> {
        return this.geoService.connection.getRepository(ctx, GeoZone).findOne({
            where: { slug: args.slug },
            relations: ['parent']
        });
    }

    @Query()
    @Allow(Permission.Public)
    async productsInGeoZone(
        @Ctx() ctx: RequestContext,
        @Args() args: { geoZoneId: number; limit?: number; offset?: number }
    ): Promise<Product[]> {
        const zoneId = args.geoZoneId;
        const limit = args.limit ?? 10;
        const offset = args.offset ?? 0;

        const subZones = await this.geoService.getChildren(ctx, zoneId);
        const zoneIds = [zoneId, ...subZones.map(z => z.id)];

        const query = `
            SELECT id FROM vendor
            WHERE "locationId" = ANY($1)
        `;
        const rawVendors = await this.geoService.connection.rawConnection.query(query, [zoneIds]);
        const vendorIds = rawVendors.map((v: any) => v.id);

        if (vendorIds.length === 0) {
            return [];
        }

        const productRepo = this.geoService.connection.getRepository(ctx, Product);
        const queryBuilder = productRepo.createQueryBuilder('product')
            .leftJoinAndSelect('product.translations', 'translations')
            .leftJoinAndSelect('product.featuredAsset', 'featuredAsset')
            .leftJoinAndSelect('product.assets', 'assets')
            .leftJoinAndSelect('product.variants', 'variants')
            .leftJoinAndSelect('variants.translations', 'variantTranslations')
            .leftJoinAndSelect('variants.options', 'options')
            .leftJoinAndSelect('options.group', 'group')
            .where('product."customFieldsVendorid" = ANY(:vendorIds)', { vendorIds })
            .andWhere('product.deletedAt IS NULL')
            .skip(offset)
            .take(limit);

        return queryBuilder.getMany();
    }

    @ResolveField()
    async parent(@Ctx() ctx: RequestContext, @Parent() zone: GeoZone): Promise<GeoZone | null> {
        if (zone.parent) {
            return zone.parent;
        }
        const dbZone = await this.geoService.connection.getRepository(ctx, GeoZone).findOne({
            where: { id: zone.id },
            relations: ['parent']
        });
        return dbZone?.parent || null;
    }

    @ResolveField()
    async children(@Ctx() ctx: RequestContext, @Parent() zone: GeoZone): Promise<GeoZone[]> {
        return this.geoService.connection.getRepository(ctx, GeoZone).find({
            where: { parent: { id: zone.id } }
        });
    }

    @ResolveField()
    isActive(@Parent() zone: GeoZone): boolean {
        return zone.status === GeoZoneStatus.ACTIVE;
    }

    @ResolveField()
    boundary(@Parent() zone: GeoZone): any {
        if (!zone.boundary) {
            return null;
        }
        if (typeof zone.boundary === 'string') {
            try {
                return JSON.parse(zone.boundary);
            } catch (e) {
                return null;
            }
        }
        return zone.boundary;
    }
}

@Resolver('GeoZone')
export class GeoAdminResolver {
    constructor(private geoService: GeoService) {}

    @Query()
    @Allow(Permission.ReadSettings)
    async geoZones(@Ctx() ctx: RequestContext, @Args() args: any): Promise<GeoZone[]> {
        const repo = this.geoService.connection.getRepository(ctx, GeoZone);
        const queryBuilder = repo.createQueryBuilder('zone')
            .leftJoinAndSelect('zone.parent', 'parent');

        if (args.type) {
            queryBuilder.andWhere('zone.type = :type', { type: args.type });
        }

        if (args.parentName) {
            queryBuilder.andWhere('parent.name = :parentName', { parentName: args.parentName });
        }

        if (args.parentId) {
            queryBuilder.andWhere('zone.parentId = :parentId', { parentId: args.parentId });
        } else if (args.topLevelOnly) {
            queryBuilder.andWhere('zone.parentId IS NULL');
        }

        queryBuilder.orderBy('zone.name', 'ASC');

        return queryBuilder.getMany();
    }


    @Query()
    @Allow(Permission.ReadSettings)
    async geoZone(@Ctx() ctx: RequestContext, @Args() args: any): Promise<GeoZone | null> {
        const repo = this.geoService.connection.getRepository(ctx, GeoZone);
        if (args.id) {
            return repo.findOne({ where: { id: args.id }, relations: ['parent'] });
        }
        if (args.slug) {
            return repo.findOne({ where: { slug: args.slug }, relations: ['parent'] });
        }
        return null;
    }

    @Query()
    @Allow(Permission.ReadSettings)
    async markets(@Ctx() ctx: RequestContext, @Args() args: any): Promise<Market[]> {
        const repo = this.geoService.connection.getRepository(ctx, Market);
        const where: any = {};
        if (args.geoZoneId) {
            where.geoZone = { id: args.geoZoneId };
        }
        return repo.find({ where, relations: ['geoZone'] });
    }

    @Query()
    @Allow(Permission.ReadSettings)
    async market(@Ctx() ctx: RequestContext, @Args() args: any): Promise<Market | null> {
        const repo = this.geoService.connection.getRepository(ctx, Market);
        if (args.id) {
            return repo.findOne({ where: { id: args.id }, relations: ['geoZone'] });
        }
        if (args.slug) {
            return repo.findOne({ where: { slug: args.slug }, relations: ['geoZone'] });
        }
        return null;
    }

    @Query()
    @Allow(Permission.ReadSettings)
    async deliveryZones(@Ctx() ctx: RequestContext, @Args() args: any): Promise<DeliveryZone[]> {
        const repo = this.geoService.connection.getRepository(ctx, DeliveryZone);
        return repo.find({
            where: { ownerId: args.ownerId },
            order: { price: 'ASC' }
        });
    }

    @Query()
    @Allow(Permission.ReadSettings)
    async geoZoneBySlug(@Ctx() ctx: RequestContext, @Args() args: { slug: string }): Promise<GeoZone | null> {
        return this.geoService.connection.getRepository(ctx, GeoZone).findOne({
            where: { slug: args.slug },
            relations: ['parent']
        });
    }

    @Query()
    @Allow(Permission.ReadSettings)
    async productsInGeoZone(
        @Ctx() ctx: RequestContext,
        @Args() args: { geoZoneId: number; limit?: number; offset?: number }
    ): Promise<Product[]> {
        const zoneId = args.geoZoneId;
        const limit = args.limit ?? 10;
        const offset = args.offset ?? 0;

        const subZones = await this.geoService.getChildren(ctx, zoneId);
        const zoneIds = [zoneId, ...subZones.map(z => z.id)];

        const query = `
            SELECT id FROM vendor
            WHERE "locationId" = ANY($1)
        `;
        const rawVendors = await this.geoService.connection.rawConnection.query(query, [zoneIds]);
        const vendorIds = rawVendors.map((v: any) => v.id);

        if (vendorIds.length === 0) {
            return [];
        }

        const productRepo = this.geoService.connection.getRepository(ctx, Product);
        const queryBuilder = productRepo.createQueryBuilder('product')
            .leftJoinAndSelect('product.translations', 'translations')
            .leftJoinAndSelect('product.featuredAsset', 'featuredAsset')
            .leftJoinAndSelect('product.assets', 'assets')
            .leftJoinAndSelect('product.variants', 'variants')
            .leftJoinAndSelect('variants.translations', 'variantTranslations')
            .leftJoinAndSelect('variants.options', 'options')
            .leftJoinAndSelect('options.group', 'group')
            .where('product."customFieldsVendorid" = ANY(:vendorIds)', { vendorIds })
            .andWhere('product.deletedAt IS NULL')
            .skip(offset)
            .take(limit);

        return queryBuilder.getMany();
    }

    @Mutation()
    @Allow(Permission.UpdateSettings)
    async createGeoZone(@Ctx() ctx: RequestContext, @Args('input') input: any): Promise<GeoZone> {
        const repo = this.geoService.connection.getRepository(ctx, GeoZone);
        const zone = new GeoZone(input);
        
        if (input.parentId) {
            const parent = await repo.findOne({ where: { id: input.parentId } });
            if (parent) {
                zone.parent = parent;
            }
        }
        
        return repo.save(zone);
    }

    @Mutation()
    @Allow(Permission.UpdateSettings)
    async updateGeoZone(@Ctx() ctx: RequestContext, @Args() args: { id: number; input: any }): Promise<GeoZone> {
        const repo = this.geoService.connection.getRepository(ctx, GeoZone);
        const zone = await repo.findOneOrFail({ where: { id: args.id } });
        
        const { parentId, ...rest } = args.input;
        Object.assign(zone, rest);

        if (parentId !== undefined) {
            if (parentId === null) {
                zone.parent = null;
            } else {
                const parent = await repo.findOne({ where: { id: parentId } });
                if (parent) {
                    zone.parent = parent;
                }
            }
        }

        return repo.save(zone);
    }

    @Mutation()
    @Allow(Permission.UpdateSettings)
    async deleteGeoZone(@Ctx() ctx: RequestContext, @Args() args: { id: number }): Promise<DeletionResponse> {
        const repo = this.geoService.connection.getRepository(ctx, GeoZone);
        const zone = await repo.findOneOrFail({ where: { id: args.id } });
        await repo.remove(zone);
        return {
            result: DeletionResult.DELETED,
        };
    }

    @Mutation()
    @Allow(Permission.UpdateSettings)
    async createMarket(@Ctx() ctx: RequestContext, @Args('input') input: any): Promise<Market> {
        const repo = this.geoService.connection.getRepository(ctx, Market);
        const market = new Market(input);

        if (input.geoZoneId) {
            const geoZone = await this.geoService.connection.getRepository(ctx, GeoZone).findOne({ where: { id: input.geoZoneId } });
            if (geoZone) {
                market.geoZone = geoZone;
            }
        }

        return repo.save(market);
    }

    @Mutation()
    @Allow(Permission.UpdateSettings)
    async updateMarket(@Ctx() ctx: RequestContext, @Args() args: { id: number; input: any }): Promise<Market> {
        const repo = this.geoService.connection.getRepository(ctx, Market);
        const market = await repo.findOneOrFail({ where: { id: args.id } });

        const { geoZoneId, ...rest } = args.input;
        Object.assign(market, rest);

        if (geoZoneId !== undefined) {
            if (geoZoneId === null) {
                market.geoZone = null;
            } else {
                const geoZone = await this.geoService.connection.getRepository(ctx, GeoZone).findOne({ where: { id: geoZoneId } });
                if (geoZone) {
                    market.geoZone = geoZone;
                }
            }
        }

        return repo.save(market);
    }

    @Mutation()
    @Allow(Permission.UpdateSettings)
    async deleteMarket(@Ctx() ctx: RequestContext, @Args() args: { id: number }): Promise<DeletionResponse> {
        const repo = this.geoService.connection.getRepository(ctx, Market);
        const market = await repo.findOneOrFail({ where: { id: args.id } });
        await repo.remove(market);
        return {
            result: DeletionResult.DELETED,
        };
    }

    @Mutation()
    @Allow(Permission.UpdateSettings)
    async createDeliveryZone(@Ctx() ctx: RequestContext, @Args('input') input: any): Promise<DeliveryZone> {
        const repo = this.geoService.connection.getRepository(ctx, DeliveryZone);
        const { geoZoneId, ...rest } = input;
        const zone = new DeliveryZone(rest);

        if (geoZoneId) {
            const geoZone = await this.geoService.connection.getRepository(ctx, GeoZone).findOne({ where: { id: geoZoneId } });
            if (geoZone) {
                zone.geoZone = geoZone;
                zone.name = `Livraison ${geoZone.name}`;
                zone.type = geoZone.boundary ? DeliveryZoneType.POLYGON : DeliveryZoneType.RADIUS;
                zone.centerLatitude = geoZone.centerLatitude;
                zone.centerLongitude = geoZone.centerLongitude;
                zone.radiusMeters = geoZone.radiusMeters;
                zone.polygonGeometry = geoZone.boundary;
            }
        } else if (input.polygonCoordinates && input.type === DeliveryZoneType.POLYGON) {
            const coords = Array.isArray(input.polygonCoordinates)
                ? input.polygonCoordinates
                : JSON.parse(input.polygonCoordinates);
            
            const coordsArray = coords.map((c: any) => [
                c.lng !== undefined ? c.lng : c[0],
                c.lat !== undefined ? c.lat : c[1]
            ]);

            if (coordsArray.length > 0) {
                if (coordsArray[0][0] !== coordsArray[coordsArray.length - 1][0] || coordsArray[0][1] !== coordsArray[coordsArray.length - 1][1]) {
                    coordsArray.push(coordsArray[0]);
                }
                zone.polygonGeometry = {
                    type: 'Polygon',
                    coordinates: [coordsArray]
                };
            }
        }

        return repo.save(zone);
    }

    @Mutation()
    @Allow(Permission.UpdateSettings)
    async updateDeliveryZone(@Ctx() ctx: RequestContext, @Args() args: { id: number; input: any }): Promise<DeliveryZone> {
        const repo = this.geoService.connection.getRepository(ctx, DeliveryZone);
        const zone = await repo.findOneOrFail({ where: { id: args.id }, relations: ['geoZone'] });

        const { polygonCoordinates, geoZoneId, ...rest } = args.input;
        Object.assign(zone, rest);

        if (geoZoneId !== undefined) {
            if (geoZoneId === null) {
                zone.geoZone = null;
            } else {
                const geoZone = await this.geoService.connection.getRepository(ctx, GeoZone).findOne({ where: { id: geoZoneId } });
                if (geoZone) {
                    zone.geoZone = geoZone;
                    zone.name = `Livraison ${geoZone.name}`;
                    zone.type = geoZone.boundary ? DeliveryZoneType.POLYGON : DeliveryZoneType.RADIUS;
                    zone.centerLatitude = geoZone.centerLatitude;
                    zone.centerLongitude = geoZone.centerLongitude;
                    zone.radiusMeters = geoZone.radiusMeters;
                    zone.polygonGeometry = geoZone.boundary;
                }
            }
        } else if (polygonCoordinates !== undefined && zone.type === DeliveryZoneType.POLYGON) {
            if (polygonCoordinates === null) {
                zone.polygonGeometry = null;
            } else {
                const coords = Array.isArray(polygonCoordinates)
                    ? polygonCoordinates
                    : JSON.parse(polygonCoordinates);
                
                const coordsArray = coords.map((c: any) => [
                    c.lng !== undefined ? c.lng : c[0],
                    c.lat !== undefined ? c.lat : c[1]
                ]);

                if (coordsArray.length > 0) {
                    if (coordsArray[0][0] !== coordsArray[coordsArray.length - 1][0] || coordsArray[0][1] !== coordsArray[coordsArray.length - 1][1]) {
                        coordsArray.push(coordsArray[0]);
                    }
                    zone.polygonGeometry = {
                        type: 'Polygon',
                        coordinates: [coordsArray]
                    };
                }
            }
        }

        return repo.save(zone);
    }

    @Mutation()
    @Allow(Permission.UpdateSettings)
    async deleteDeliveryZone(@Ctx() ctx: RequestContext, @Args() args: { id: number }): Promise<DeletionResponse> {
        const repo = this.geoService.connection.getRepository(ctx, DeliveryZone);
        const zone = await repo.findOneOrFail({ where: { id: args.id } });
        await repo.remove(zone);
        return {
            result: DeletionResult.DELETED,
        };
    }

    @Mutation()
    @Allow(Permission.UpdateSettings)
    async importBoundaryFromOSM(@Ctx() ctx: RequestContext, @Args() args: { zoneId: number; query: string }): Promise<GeoZone> {
        return this.geoService.importBoundaryFromOSM(ctx, args.zoneId, args.query);
    }

    @Mutation()
    @Allow(Permission.UpdateSettings)
    async importMassiveData(
        @Ctx() ctx: RequestContext,
        @Args() args: { base64Content: string; format: any; type: any }
    ): Promise<any> {
        return this.geoService.importMassiveData(ctx, args.base64Content, args.format, args.type);
    }

    @Query()
    @Allow(Permission.ReadSettings)
    async geoResolutionLogs(@Ctx() ctx: RequestContext, @Args() args: any): Promise<any[]> {
        return this.geoService.getResolutionLogs(ctx, args.limit, args.offset);
    }

    @Query()
    @Allow(Permission.ReadSettings)
    async geoUserCorrections(@Ctx() ctx: RequestContext, @Args() args: any): Promise<any[]> {
        return this.geoService.getUserCorrections(ctx, args.status);
    }

    @Query()
    @Allow(Permission.ReadSettings)
    async geoCoverageStats(@Ctx() ctx: RequestContext): Promise<any> {
        return this.geoService.getCoverageStats(ctx);
    }

    @Mutation()
    @Allow(Permission.Public)
    async submitUserCorrection(@Ctx() ctx: RequestContext, @Args() args: any): Promise<any> {
        return this.geoService.submitUserCorrection(ctx, args);
    }

    @Mutation()
    @Allow(Permission.UpdateSettings)
    async moderateUserCorrection(@Ctx() ctx: RequestContext, @Args() args: { id: number; approve: boolean }): Promise<any> {
        return this.geoService.moderateUserCorrection(ctx, args.id, args.approve);
    }

    @Mutation()
    @Allow(Permission.UpdateSettings)
    async splitGeoZone(@Ctx() ctx: RequestContext, @Args() args: { parentZoneId: number; newZoneNames: string[] }): Promise<any[]> {
        return this.geoService.splitGeoZone(ctx, args.parentZoneId, args.newZoneNames);
    }

    @Mutation()
    @Allow(Permission.UpdateSettings)
    async mergeGeoZones(@Ctx() ctx: RequestContext, @Args() args: { zoneIds: number[]; mergedName: string }): Promise<any> {
        return this.geoService.mergeGeoZones(ctx, args.zoneIds, args.mergedName);
    }
}

@Resolver('Market')
export class MarketResolver {
    constructor(private geoService: GeoService) {}

    @ResolveField()
    async geoZone(@Ctx() ctx: RequestContext, @Parent() market: Market): Promise<GeoZone | null> {
        if (market.geoZone) {
            return market.geoZone;
        }
        const dbZone = await this.geoService.connection.getRepository(ctx, Market).findOne({
            where: { id: market.id },
            relations: ['geoZone']
        });
        return dbZone?.geoZone || null;
    }
}

@Resolver('DeliveryZone')
export class DeliveryZoneResolver {
    constructor(private geoService: GeoService) {}

    @ResolveField()
    async geoZone(@Ctx() ctx: RequestContext, @Parent() deliveryZone: DeliveryZone): Promise<GeoZone | null> {
        if (deliveryZone.geoZone) {
            return deliveryZone.geoZone;
        }
        const dbZone = await this.geoService.connection.getRepository(ctx, DeliveryZone).findOne({
            where: { id: deliveryZone.id },
            relations: ['geoZone']
        });
        return dbZone?.geoZone || null;
    }
}
