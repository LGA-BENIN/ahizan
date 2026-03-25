import { graphql } from '@/graphql';

export const UpdateMyVendorProfileMutation = graphql(`
    mutation UpdateMyVendorProfile($input: UpdateVendorInput!) {
        updateMyVendorProfile(input: $input) {
            id
            name
            description
            phoneNumber
            address
            returnPolicy
            deliveryInfo
        }
    }
`);
