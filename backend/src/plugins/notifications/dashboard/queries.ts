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

export const GET_VAPID_PUBLIC_KEY = gql`
    query GetVapidPublicKey {
        vapidPublicKey
    }
`;

export const SUBSCRIBE_TO_PUSH = gql`
    mutation SubscribeToPush(
        $endpoint: String!
        $p256dh: String!
        $auth: String!
        $userAgent: String
    ) {
        subscribeToPush(
            endpoint: $endpoint
            p256dh: $p256dh
            auth: $auth
            userAgent: $userAgent
        ) {
            success
        }
    }
`;
