import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { Ctx, RequestContext, Transaction, Allow, Permission } from '@vendure/core';
import { RegistrationFieldService } from '../service/registration-field.service';

@Resolver()
export class RegistrationFieldShopResolver {
    constructor(
        private registrationFieldService: RegistrationFieldService,
    ) { }

    @Query()
    @Allow(Permission.Public)
    async registrationFields(@Ctx() ctx: RequestContext) {
        console.log('[RegistrationFieldShopResolver] registrationFields called');
        return this.registrationFieldService.findAll(ctx);
    }

    @Query()
    @Allow(Permission.Owner)
    async myRegistrationResponses(@Ctx() ctx: RequestContext) {
        return this.registrationFieldService.getMyResponses(ctx);
    }

    @Mutation()
    @Allow(Permission.Authenticated)
    async submitRegistrationResponses(@Ctx() ctx: RequestContext, @Args('input') input: any[]) {
        return this.registrationFieldService.submitResponses(ctx, input);
    }

    @Mutation()
    @Transaction()
    @Allow(Permission.Public)
    async createRegistrationField(@Ctx() ctx: RequestContext, @Args('input') input: any) {
        return this.registrationFieldService.create(ctx, input);
    }

    @Mutation()
    @Transaction()
    @Allow(Permission.Public)
    async updateRegistrationField(@Ctx() ctx: RequestContext, @Args('input') input: any) {
        return this.registrationFieldService.update(ctx, input.id, input);
    }

    @Mutation()
    @Transaction()
    @Allow(Permission.Public)
    async deleteRegistrationField(@Ctx() ctx: RequestContext, @Args() args: { id: string }) {
        return this.registrationFieldService.delete(ctx, args.id);
    }
}

@Resolver()
export class RegistrationFieldAdminResolver {
    constructor(
        private registrationFieldService: RegistrationFieldService,
    ) { }

    @Query()
    @Allow(Permission.Public)
    async registrationFieldsAdmin(@Ctx() ctx: RequestContext) {
        return this.registrationFieldService.findAllAdmin(ctx);
    }

    @Query()
    @Allow(Permission.Public)
    async registrationField(@Ctx() ctx: RequestContext, @Args() args: { id: string }) {
        return this.registrationFieldService.findOne(ctx, args.id);
    }

    @Mutation()
    @Transaction()
    @Allow(Permission.Public)
    async createRegistrationField(@Ctx() ctx: RequestContext, @Args('input') input: any) {
        return this.registrationFieldService.create(ctx, input);
    }

    @Mutation()
    @Transaction()
    @Allow(Permission.Public)
    async updateRegistrationField(@Ctx() ctx: RequestContext, @Args('input') input: any) {
        return this.registrationFieldService.update(ctx, input.id, input);
    }

    @Mutation()
    @Transaction()
    @Allow(Permission.Public)
    async deleteRegistrationField(@Ctx() ctx: RequestContext, @Args() args: { id: string }) {
        return this.registrationFieldService.delete(ctx, args.id);
    }

    @Query()
    @Allow(Permission.Public)
    async vendorRegistrationResponses(@Ctx() ctx: RequestContext, @Args() args: { vendorId: string }) {
        return this.registrationFieldService.getVendorResponses(ctx, args.vendorId);
    }
}
