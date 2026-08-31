import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { Ctx, RequestContext, Allow, Permission } from '@vendure/core';
import { LogisticsHubService } from '../service/logistics-hub.service';

@Resolver()
export class LogisticsHubAdminResolver {
    constructor(private logisticsHubService: LogisticsHubService) {}

    @Mutation()
    @Allow(Permission.UpdateOrder, Permission.Public)
    async markReadyForPickup(
        @Ctx() ctx: RequestContext,
        @Args('orderId') orderId: string,
        @Args('vendorId') vendorId: string
    ) {
        return this.logisticsHubService.markReadyForPickup(ctx, orderId, vendorId);
    }

    @Mutation()
    @Allow(Permission.UpdateOrder)
    async recordHubArrival(
        @Ctx() ctx: RequestContext,
        @Args('orderId') orderId: string,
        @Args('vendorId') vendorId?: string
    ) {
        return this.logisticsHubService.recordHubArrival(ctx, orderId, vendorId);
    }

    @Mutation()
    @Allow(Permission.UpdateOrder)
    async dispatchForFinalDelivery(
        @Ctx() ctx: RequestContext,
        @Args('orderId') orderId: string,
        @Args('driverName') driverName: string,
        @Args('driverPhone') driverPhone: string
    ) {
        return this.logisticsHubService.dispatchForFinalDelivery(ctx, orderId, {
            name: driverName,
            phone: driverPhone
        });
    }

    @Mutation()
    @Allow(Permission.Public, Permission.UpdateOrder)
    async verifyDeliveryOtp(
        @Ctx() ctx: RequestContext,
        @Args('orderCode') orderCode: string,
        @Args('otpCode') otpCode: string
    ) {
        return this.logisticsHubService.verifyDeliveryOtp(ctx, orderCode, otpCode);
    }
}
