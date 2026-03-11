import { gql } from 'graphql-tag';

export const GET_PAGES = gql`
    query GetPages($options: PageListOptions) {
        pages(options: $options) {
            items {
                id
                slug
                title
                type
                isActive
            }
            totalItems
        }
    }
`;

export const GET_PAGE = gql`
    query GetPage($id: ID!) {
        page(id: $id) {
            id
            slug
            title
            type
            isActive
            sections {
                id
                type
                title
                description
                layout
                order
                isActive
                dataJson
            }
        }
    }
`;

export const CREATE_PAGE = gql`
    mutation CreatePage($input: CreatePageInput!) {
        createPage(input: $input) {
            id
            slug
            title
        }
    }
`;

export const UPDATE_PAGE = gql`
    mutation UpdatePage($input: UpdatePageInput!) {
        updatePage(input: $input) {
            id
            slug
            title
        }
    }
`;

export const DELETE_PAGE = gql`
    mutation DeletePage($id: ID!) {
        deletePage(id: $id) {
            result
        }
    }
`;

export const CREATE_SECTION = gql`
    mutation CreateSection($input: CreateSectionInput!) {
        createSection(input: $input) {
            id
            type
            order
        }
    }
`;

export const UPDATE_SECTION = gql`
    mutation UpdateSection($input: UpdateSectionInput!) {
        updateSection(input: $input) {
            id
            type
            order
        }
    }
`;

export const DELETE_SECTION = gql`
    mutation DeleteSection($id: ID!) {
        deleteSection(id: $id) {
            result
        }
    }
`;

export const INITIALIZE_HOME_PAGE = gql`
    mutation InitializeHomePage($pageId: ID!) {
        initializeHomePage(pageId: $pageId) {
            id
            sections {
                id
                type
                order
            }
        }
    }
`;

export const CREATE_ASSETS = gql`
    mutation CreateAssets($input: [CreateAssetInput!]!) {
        createAssets(input: $input) {
            ... on Asset {
                id
                preview
                source
            }
    }
  }
`;

export const CREATE_CMS_ASSET = gql`
  mutation CreateCmsAsset($file: Upload!) {
    createCmsAsset(file: $file) {
      id
      name
      preview
      source
    }
  }
`;
