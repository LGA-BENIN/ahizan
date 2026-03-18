import { Allow, Ctx, Permission, RequestContext } from '@vendure/core';
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { DeliveryZoneService } from '../service/delivery-zone.service';
import { DeliveryZone } from '../entities/delivery-zone.entity';

@Resolver()
export class DeliveryZoneAdminResolver {
    constructor(private deliveryZoneService: DeliveryZoneService) { }

    @Query()
    @Allow(Permission.Authenticated)
    async deliveryZones(@Ctx() ctx: RequestContext): Promise<DeliveryZone[]> {
        return this.deliveryZoneService.findAllAdmin(ctx);
    }

    @Mutation()
    @Allow(Permission.Authenticated)
    async createDeliveryZone(@Ctx() ctx: RequestContext, @Args('input') input: any): Promise<DeliveryZone> {
        return this.deliveryZoneService.create(ctx, input);
    }

    @Mutation()
    @Allow(Permission.Authenticated)
    async updateDeliveryZone(@Ctx() ctx: RequestContext, @Args('id') id: string, @Args('input') input: any): Promise<DeliveryZone> {
        return this.deliveryZoneService.update(ctx, id, input);
    }

    @Mutation()
    @Allow(Permission.Authenticated)
    async deleteDeliveryZone(@Ctx() ctx: RequestContext, @Args('id') id: string): Promise<boolean> {
        return this.deliveryZoneService.delete(ctx, id);
    }
}

@Resolver()
export class DeliveryZoneShopResolver {
    constructor(private deliveryZoneService: DeliveryZoneService) { }

    @Query()
    @Allow(Permission.Public)
    async deliveryZones(@Ctx() ctx: RequestContext): Promise<DeliveryZone[]> {
        return this.deliveryZoneService.findAll(ctx);
    }
}
