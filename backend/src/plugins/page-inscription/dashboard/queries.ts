
import { gql } from 'graphql-tag';

export const GET_REGISTRATION_FIELDS = gql`
    query GetRegistrationFields {
        registrationFieldsAdmin {
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

export const CREATE_REGISTRATION_FIELD = gql`
    mutation CreateRegistrationField($input: CreateRegistrationFieldInput!) {
        createRegistrationField(input: $input) {
            id
            name
            label
        }
    }
`;

export const UPDATE_REGISTRATION_FIELD = gql`
    mutation UpdateRegistrationField($input: UpdateRegistrationFieldInput!) {
        updateRegistrationField(input: $input) {
            id
            name
            label
            enabled
        }
    }
`;

export const DELETE_REGISTRATION_FIELD = gql`
    mutation DeleteRegistrationField($id: ID!) {
        deleteRegistrationField(id: $id) {
            result
            message
        }
    }
`;
