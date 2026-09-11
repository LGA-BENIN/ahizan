import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { Ctx, RequestContext, Allow, Permission } from '@vendure/core';
import { SettlementService } from '../service/settlement.service';

@Resolver()
export class SettlementAdminResolver {
    constructor(private settlementService: SettlementService) {}

    @Query()
    @Allow(Permission.ReadSeller, Permission.ReadOrder)
    async vendorSettlements(
        @Ctx() ctx: RequestContext,
        @Args('vendorId') vendorId: string
    ) {
        return this.settlementService.getVendorSettlements(ctx, vendorId);
    }

    @Query()
    @Allow(Permission.ReadSeller, Permission.ReadOrder)
    async vendorAvailableBalance(
        @Ctx() ctx: RequestContext,
        @Args('vendorId') vendorId: string
    ) {
        return this.settlementService.getVendorAvailableBalance(ctx, vendorId);
    }

    @Mutation()
    @Allow(Permission.UpdateSeller, Permission.Public)
    async requestPayout(
        @Ctx() ctx: RequestContext,
        @Args('vendorId') vendorId: string,
        @Args('amount') amount: number,
        @Args('paymentMethod') paymentMethod?: 'MOBILE_MONEY' | 'BANK_TRANSFER',
        @Args('provider') provider?: string,
        @Args('accountNumber') accountNumber?: string
    ) {
        return this.settlementService.requestPayout(ctx, vendorId, amount, {
            paymentMethod,
            provider,
            accountNumber
        });
    }

    @Mutation()
    @Allow(Permission.UpdateSeller)
    async approvePayout(
        @Ctx() ctx: RequestContext,
        @Args('payoutId') payoutId: string
    ) {
        return this.settlementService.approvePayout(ctx, payoutId);
    }
}
