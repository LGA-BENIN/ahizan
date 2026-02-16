import { gql } from 'graphql-tag';

const commonApiExtensions = gql`
  type RegistrationFieldOption {
    label: String!
    value: String!
  }

  type ValidationConfig {
    maxFileSize: Int
    allowedMimeTypes: [String!]
    minLength: Int
    maxLength: Int
  }

  type RegistrationField implements Node {
    id: ID!
    createdAt: DateTime!
    updatedAt: DateTime!
    name: String!
    label: String!
    type: String!
    options: [RegistrationFieldOption!]
    required: Boolean!
    order: Int!
    enabled: Boolean!
    description: String
    placeholder: String
    config: ValidationConfig
  }

  type RegistrationResponse implements Node {
    id: ID!
    createdAt: DateTime!
    updatedAt: DateTime!
    value: String
    registrationField: RegistrationField!
  }
`;

export const shopApiExtensions = gql`
  ${commonApiExtensions}

  input RegistrationFieldOptionInput {
    label: String!
    value: String!
  }

  input SubmitRegistrationResponseInput {
    registrationFieldId: ID!
    value: String
  }

  input ValidationConfigInput {
    maxFileSize: Int
    allowedMimeTypes: [String!]
    minLength: Int
    maxLength: Int
  }

  input CreateRegistrationFieldInput {
    name: String!
    label: String!
    type: String!
    options: [RegistrationFieldOptionInput!]
    required: Boolean
    order: Int
    enabled: Boolean
    description: String
    placeholder: String
    config: ValidationConfigInput
  }

  input UpdateRegistrationFieldInput {
    id: ID!
    name: String
    label: String
    type: String
    options: [RegistrationFieldOptionInput!]
    required: Boolean
    order: Int
    enabled: Boolean
    description: String
    placeholder: String
    config: ValidationConfigInput
  }

  extend type Query {
    registrationFields: [RegistrationField!]!
    myRegistrationResponses: [RegistrationResponse!]!
  }

  extend type Mutation {
    submitRegistrationResponses(input: [SubmitRegistrationResponseInput!]!): Boolean!
    createRegistrationField(input: CreateRegistrationFieldInput!): RegistrationField!
    updateRegistrationField(input: UpdateRegistrationFieldInput!): RegistrationField!
    deleteRegistrationField(id: ID!): DeletionResponse!
  }
`;

export const adminApiExtensions = gql`
  ${commonApiExtensions}

  input RegistrationFieldOptionInput {
    label: String!
    value: String!
  }

  input ValidationConfigInput {
    maxFileSize: Int
    allowedMimeTypes: [String!]
    minLength: Int
    maxLength: Int
  }

  input CreateRegistrationFieldInput {
    name: String!
    label: String!
    type: String!
    options: [RegistrationFieldOptionInput!]
    required: Boolean
    order: Int
    enabled: Boolean
    description: String
    placeholder: String
    config: ValidationConfigInput
  }

  input UpdateRegistrationFieldInput {
    id: ID!
    name: String
    label: String
    type: String
    options: [RegistrationFieldOptionInput!]
    required: Boolean
    order: Int
    enabled: Boolean
    description: String
    placeholder: String
    config: ValidationConfigInput
  }

  extend type Query {
    registrationFieldsAdmin: [RegistrationField!]!
    registrationField(id: ID!): RegistrationField
    # Admin could see responses for a specific vendor
    vendorRegistrationResponses(vendorId: ID!): [RegistrationResponse!]!
  }

  extend type Mutation {
    createRegistrationField(input: CreateRegistrationFieldInput!): RegistrationField!
    updateRegistrationField(input: UpdateRegistrationFieldInput!): RegistrationField!
    deleteRegistrationField(id: ID!): DeletionResponse!
  }
`;
