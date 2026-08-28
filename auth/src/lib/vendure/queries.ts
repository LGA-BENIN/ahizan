export const GetMyVendorProfileQuery = `
    query GetMyVendorProfile {
        myVendorProfile {
            id
            name
            status
            description
            rejectionReason
        }
    }
`;

export const GetActiveCustomerQuery = `
    query GetActiveCustomer {
        activeCustomer {
            id
            firstName
            lastName
            emailAddress
            phoneNumber
        }
    }
`;

export const GetRegistrationFieldsQuery = `
    query GetRegistrationFields {
        registrationFields {
            id
            name
            label
            type
            options {
                label
                value
            }
            required
            order
            enabled
            description
            placeholder
        }
    }
`;
