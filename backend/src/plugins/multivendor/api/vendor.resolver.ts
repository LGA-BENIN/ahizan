import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { Allow, Ctx, Permission, RequestContext, PaginatedList } from '@vendure/core';
import { VendorService } from '../service/vendor.service';
import { Vendor, VendorStatus } from '../entities/vendor.entity';

@Resolver()
export class VendorResolver {
    constructor(private vendorService: VendorService) { }

    @Mutation()
    @Allow(Permission.Public)
    async applyToBecomeVendor(
        @Ctx() ctx: RequestContext,
        @Args('input') input: { name: string; email: string; phoneNumber?: string; address?: string }
    ): Promise<Vendor> {
        return this.vendorService.create(ctx, input);
    }
}

@Resolver()
export class VendorAdminResolver {
    constructor(private vendorService: VendorService) { }

    @Query()
    @Allow(Permission.ReadCatalog) // Adjust permission as needed, usually Permission.ReadVender if we had it, fallback to Catalog or SuperAdmin
    async vendors(@Ctx() ctx: RequestContext, @Args('options') options: any): Promise<PaginatedList<Vendor>> {
        return this.vendorService.findAll(ctx, options);
    }

    @Query()
    @Allow(Permission.ReadCatalog)
    async vendor(@Ctx() ctx: RequestContext, @Args('id') id: string): Promise<Vendor | null> {
        return this.vendorService.findOne(ctx, id);
    }

    @Mutation()
    @Allow(Permission.UpdateCatalog)
    async createVendor(
        @Ctx() ctx: RequestContext,
        @Args('input') input: { name: string; email: string; phoneNumber?: string; address?: string }
    ): Promise<Vendor> {
        return this.vendorService.create(ctx, input);
    }

    @Mutation()
    @Allow(Permission.UpdateCatalog)
    async updateVendorStatus(
        @Ctx() ctx: RequestContext,
        @Args('id') id: string,
        @Args('status') status: VendorStatus
    ): Promise<Vendor> {
        return this.vendorService.update(ctx, id, { status });
    }
}
