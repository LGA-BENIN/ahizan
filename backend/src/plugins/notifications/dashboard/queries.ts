import { gql } from 'graphql-tag';

export const GET_BREVO_SETTINGS = gql`
    query GetBrevoSettings {
        brevoSettings {
            id
            brevoApiKey
            defaultPhonePrefix
            emailMethod
            smtpHost
            smtpPort
            smtpUser
            smtpPassword
            fromEmail
            fromName
            channelsConfig
        }
    }
`;

export const UPDATE_BREVO_SETTINGS = gql`
    mutation UpdateBrevoSettings($input: UpdateBrevoSettingsInput!) {
        updateBrevoSettings(input: $input) {
            id
            brevoApiKey
            defaultPhonePrefix
            emailMethod
            smtpHost
            smtpPort
            smtpUser
            smtpPassword
            fromEmail
            fromName
            channelsConfig
        }
    }
`;
