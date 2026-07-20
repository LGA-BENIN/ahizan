'use server';

import { mutate, query } from '@/lib/vendure/api';
import { gql } from 'graphql-tag';
import { revalidatePath } from 'next/cache';

const GET_REGISTRATION_FIELDS_ADMIN = gql`
    query GetRegistrationFieldsAdmin {
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
            config {
                maxFileSize
                allowedMimeTypes
                minLength
                maxLength
            }
        }
    }
`;

const CREATE_REGISTRATION_FIELD = gql`
    mutation CreateRegistrationField($input: CreateRegistrationFieldInput!) {
        createRegistrationField(input: $input) {
            id
            name
        }
    }
`;

const DELETE_REGISTRATION_FIELD = gql`
    mutation DeleteRegistrationField($id: ID!) {
        deleteRegistrationField(id: $id) {
            result
            message
        }
    }
`;

const UPDATE_REGISTRATION_FIELD = gql`
    mutation UpdateRegistrationField($input: UpdateRegistrationFieldInput!) {
        updateRegistrationField(input: $input) {
            id
            name
            required
            enabled
        }
    }
`;

export async function getRegistrationFields() {
    console.log('Fetching registration fields from admin API...');
    const { registrationFieldsAdmin } = await query(GET_REGISTRATION_FIELDS_ADMIN);
    return registrationFieldsAdmin;
}

export async function createFieldAction(formData: FormData) {
    const name = formData.get('name') as string;
    const label = formData.get('label') as string;
    const type = formData.get('type') as string;
    const required = formData.get('required') === 'on';
    const enabled = formData.get('enabled') === 'on';
    const description = formData.get('description') as string;
    const placeholder = formData.get('placeholder') as string;
    const order = parseInt(formData.get('order') as string) || 0;

    // Handle options for select type
    let options = [];
    if (type === 'select') {
        const optionsString = formData.get('options') as string;
        if (optionsString) {
            options = optionsString.split(',').map(opt => {
                const [val, lab] = opt.split(':');
                return { value: val.trim(), label: (lab || val).trim() };
            });
        }
    }

    const maxFileSize = formData.get('maxFileSize') ? parseInt(formData.get('maxFileSize') as string) : undefined;
    const allowedMimeTypes = formData.get('allowedMimeTypes') ? (formData.get('allowedMimeTypes') as string).split(',').map(t => t.trim()) : undefined;

    const config = {
        maxFileSize,
        allowedMimeTypes: allowedMimeTypes,
    };

    try {
        await mutate(CREATE_REGISTRATION_FIELD, {
            input: {
                name,
                label,
                type,
                required,
                enabled,
                description,
                placeholder,
                order,
                options: options.length > 0 ? options : undefined,
                config,
            }
        });
        revalidatePath('/dashboard/page-inscription');
        return { success: true };
    } catch (error: any) {
        return { error: error.message };
    }
}

export async function updateFieldAction(id: string, data: any) {
    try {
        await mutate(UPDATE_REGISTRATION_FIELD, {
            input: {
                id,
                ...data
            }
        });
        revalidatePath('/dashboard/page-inscription');
        return { success: true };
    } catch (error: any) {
        return { error: error.message };
    }
}

export async function deleteFieldAction(id: string) {
    try {
        await mutate(DELETE_REGISTRATION_FIELD, { id });
        revalidatePath('/dashboard/page-inscription');
        return { success: true };
    } catch (error: any) {
        return { error: error.message };
    }
}
