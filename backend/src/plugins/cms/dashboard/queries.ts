import { gql } from 'graphql-tag';

export const GET_PAGES = gql`
    query GetCmsPages($options: PageListOptions) {
        pages(options: $options) {
            items {
                id
                slug
                title
                type
                isActive
                createdAt
            }
            totalItems
        }
    }
`;

export const GET_PAGE = gql`
    query GetCmsPage($id: ID!) {
        page(id: $id) {
            id
            slug
            title
            type
            isActive
            sections {
                id
                type
                order
                isActive
                dataJson
            }
        }
    }
`;

export const UPDATE_PAGE = gql`
    mutation UpdateCmsPage($input: UpdatePageInput!) {
        updatePage(input: $input) {
            id
            slug
            title
            isActive
        }
    }
`;

export const CREATE_PAGE = gql`
    mutation CreateCmsPage($input: CreatePageInput!) {
        createPage(input: $input) {
            id
        }
    }
`;

export const CREATE_SECTION = gql`
    mutation CreateCmsSection($input: CreateSectionInput!) {
        createSection(input: $input) {
            id
        }
    }
`;

export const UPDATE_SECTION = gql`
    mutation UpdateCmsSection($input: UpdateSectionInput!) {
        updateSection(input: $input) {
            id
        }
    }
`;

export const DELETE_SECTION = gql`
    mutation DeleteCmsSection($id: ID!) {
        deleteSection(id: $id) {
            result
        }
    }
`;
