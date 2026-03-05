import gql from 'graphql-tag';
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { Allow, Permission, Ctx, RequestContext } from '@vendure/core';
import { BrevoSmsService } from './brevo-sms.service';
import { BrevoSettings } from './entities/brevo-settings.entity';

// ─── GraphQL Schema Extension ────────────────────────────────────────────────

export const notificationsAdminApiExtensions = gql`
    type BrevoSettings {
        id: ID!
        brevoApiKey: String
        defaultPhonePrefix: String!
        enableOrderConfirmedSms: Boolean!
        enableNewOrderVendorSms: Boolean!
        enableVendorApprovedSms: Boolean!
        enableVendorRegistrationSms: Boolean!
        enablePaymentFailedSms: Boolean!
        enableShippingUpdateSms: Boolean!
        enableStockAlertEmail: Boolean!
        templateOrderConfirmed: String
        templateNewOrderVendor: String
        templateVendorApproved: String
        templateVendorRegistration: String
        templatePaymentFailed: String
        templateShippingUpdate: String
    }

    input UpdateBrevoSettingsInput {
        brevoApiKey: String
        defaultPhonePrefix: String
        enableOrderConfirmedSms: Boolean
        enableNewOrderVendorSms: Boolean
        enableVendorApprovedSms: Boolean
        enableVendorRegistrationSms: Boolean
        enablePaymentFailedSms: Boolean
        enableShippingUpdateSms: Boolean
        enableStockAlertEmail: Boolean
        templateOrderConfirmed: String
        templateNewOrderVendor: String
        templateVendorApproved: String
        templateVendorRegistration: String
        templatePaymentFailed: String
        templateShippingUpdate: String
    }

    extend type Query {
        brevoSettings: BrevoSettings
    }

    extend type Mutation {
        updateBrevoSettings(input: UpdateBrevoSettingsInput!): BrevoSettings!
    }
`;

// ─── Admin API Resolver ───────────────────────────────────────────────────────

@Resolver()
export class NotificationsAdminResolver {
    constructor(private readonly smsService: BrevoSmsService) { }

    @Query()
    @Allow(Permission.SuperAdmin)
    async brevoSettings(@Ctx() ctx: RequestContext): Promise<BrevoSettings | null> {
        return this.smsService.getSettings();
    }

    @Mutation()
    @Allow(Permission.SuperAdmin)
    async updateBrevoSettings(
        @Ctx() ctx: RequestContext,
        @Args('input') input: Partial<BrevoSettings>,
    ): Promise<BrevoSettings> {
        return this.smsService.saveSettings(input);
    }
}
