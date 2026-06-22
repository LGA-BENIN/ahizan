export const LoginMutation = `
    mutation Login($username: String!, $password: String!) {
        login(username: $username, password: $password) {
            __typename
            ... on CurrentUser {
                id
                identifier
            }
            ... on ErrorResult {
                errorCode
                message
            }
        }
    }
`;

export const RegisterCustomerAccountMutation = `
    mutation RegisterCustomerAccount($input: RegisterCustomerInput!) {
        registerCustomerAccount(input: $input) {
            __typename
            ... on Success {
                success
            }
            ... on ErrorResult {
                errorCode
                message
            }
        }
    }
`;

export const ApplyToBecomeVendorMutation = `
    mutation ApplyToBecomeVendor($input: CreateVendorInput!) {
        applyToBecomeVendor(input: $input) {
            id
            name
            status
        }
    }
`;

export const LogoutMutation = `
    mutation Logout {
        logout {
            __typename
            ... on Success {
                success
            }
        }
    }
`;
