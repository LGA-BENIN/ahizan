'use server';

import { mutate } from '@/lib/vendure/api';
import { revalidatePath } from 'next/cache';
import { graphql } from '@/graphql';

const CreditVendorWalletMutation = graphql(`
    mutation CreditVendorWallet($vendorId: ID!, $amount: Int!, $note: String) {
        creditVendorWallet(vendorId: $vendorId, amount: $amount, note: $note) {
            id
            name
            walletBalance
        }
    }
`);

const DebitVendorWalletMutation = graphql(`
    mutation DebitVendorWallet($vendorId: ID!, $amount: Int!, $note: String) {
        debitVendorWallet(vendorId: $vendorId, amount: $amount, note: $note) {
            id
            name
            walletBalance
        }
    }
`);

const SetVendorAllowNegativeBalanceMutation = graphql(`
    mutation SetVendorAllowNegativeBalance($vendorId: ID!, $allow: Boolean!) {
        setVendorAllowNegativeBalance(vendorId: $vendorId, allow: $allow) {
            id
            name
            allowNegativeBalance
        }
    }
`);

export async function creditWallet(vendorId: string, amount: number, note?: string) {
    await mutate(CreditVendorWalletMutation, { vendorId, amount, note }, { useAuthToken: true });
    revalidatePath('/dashboard/wallets');
}

export async function debitWallet(vendorId: string, amount: number, note?: string) {
    await mutate(DebitVendorWalletMutation, { vendorId, amount, note }, { useAuthToken: true });
    revalidatePath('/dashboard/wallets');
}

export async function toggleOverdraft(vendorId: string, allow: boolean) {
    await mutate(SetVendorAllowNegativeBalanceMutation, { vendorId, allow }, { useAuthToken: true });
    revalidatePath('/dashboard/wallets');
}
