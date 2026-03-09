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
        emailMethod: String
        smtpHost: String
        smtpPort: Int
        smtpUser: String
        smtpPassword: String
        fromEmail: String
        fromName: String
        channelsConfig: JSON
    }

    input UpdateBrevoSettingsInput {
        brevoApiKey: String
        defaultPhonePrefix: String
        emailMethod: String
        smtpHost: String
        smtpPort: Int
        smtpUser: String
        smtpPassword: String
        fromEmail: String
        fromName: String
        channelsConfig: JSON
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
    @Allow(Permission.Public)
    async brevoSettings(@Ctx() ctx: RequestContext): Promise<BrevoSettings | null> {
        return this.smsService.getSettings();
    }

    @Mutation()
    @Allow(Permission.Public)
    async updateBrevoSettings(
        @Ctx() ctx: RequestContext,
        @Args('input') input: Partial<BrevoSettings>,
    ): Promise<BrevoSettings> {
        return this.smsService.saveSettings(input);
    }
}
