import { Allow, Ctx, Permission, RequestContext } from '@vendure/core';
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { OrderStatusService } from '../service/order-status.service';
import { OrderStatus } from '../entities/order-status.entity';

@Resolver()
export class OrderStatusAdminResolver {
    constructor(private orderStatusService: OrderStatusService) { }

    @Query()
    @Allow(Permission.Authenticated)
    async orderStatuses(@Ctx() ctx: RequestContext): Promise<OrderStatus[]> {
        return this.orderStatusService.findAll(ctx);
    }

    @Mutation()
    @Allow(Permission.Authenticated)
    async createOrderStatus(@Ctx() ctx: RequestContext, @Args('input') input: any): Promise<OrderStatus> {
        return this.orderStatusService.create(ctx, input);
    }

    @Mutation()
    @Allow(Permission.Authenticated)
    async updateOrderStatus(@Ctx() ctx: RequestContext, @Args('id') id: string, @Args('input') input: any): Promise<OrderStatus> {
        return this.orderStatusService.update(ctx, id, input);
    }

    @Mutation()
    @Allow(Permission.Authenticated)
    async deleteOrderStatus(@Ctx() ctx: RequestContext, @Args('id') id: string): Promise<boolean> {
        return this.orderStatusService.delete(ctx, id);
    }
}

@Resolver()
export class OrderStatusShopResolver {
    constructor(private orderStatusService: OrderStatusService) { }

    @Query()
    @Allow(Permission.Public)
    async orderStatuses(@Ctx() ctx: RequestContext): Promise<OrderStatus[]> {
        return this.orderStatusService.findAll(ctx);
    }

    @Query()
    @Allow(Permission.Public)
    async vendorOrderStatuses(@Ctx() ctx: RequestContext): Promise<OrderStatus[]> {
        return this.orderStatusService.findVendorStatuses(ctx);
    }
}
