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

export const TEST_SMTP_CONNECTION = gql`
    mutation TestSmtpConnection($email: String!) {
        testSmtpConnection(email: $email)
    }
`;

export const TEST_SMTP_CONNECTION_DIRECT = gql`
    mutation TestSmtpConnectionDirect(
        $email: String!
        $emailMethod: String!
        $smtpHost: String
        $smtpPort: Int
        $smtpUser: String
        $smtpPassword: String
        $brevoApiKey: String
        $fromEmail: String
        $fromName: String
    ) {
        testSmtpConnectionDirect(
            email: $email
            emailMethod: $emailMethod
            smtpHost: $smtpHost
            smtpPort: $smtpPort
            smtpUser: $smtpUser
            smtpPassword: $smtpPassword
            brevoApiKey: $brevoApiKey
            fromEmail: $fromEmail
            fromName: $fromName
        )
    }
`;
