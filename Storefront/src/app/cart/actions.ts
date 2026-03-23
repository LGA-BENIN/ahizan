'use server';

import {mutate} from '@/lib/vendure/api';
import {
    RemoveFromCartMutation,
    AdjustCartItemMutation,
    ApplyPromotionCodeMutation,
    RemovePromotionCodeMutation
} from '@/lib/vendure/mutations';
import {updateTag} from 'next/cache';
import {ensureAddingItems} from '@/app/checkout/actions';

export async function removeFromCart(lineId: string) {
    await ensureAddingItems();
    await mutate(RemoveFromCartMutation, {lineId}, {useAuthToken: true});
    updateTag('cart');
}

export async function adjustQuantity(lineId: string, quantity: number) {
    await ensureAddingItems();
    await mutate(AdjustCartItemMutation, {lineId, quantity}, {useAuthToken: true});
    updateTag('cart');
}

export async function applyPromotionCode(formData: FormData) {
    const code = formData.get('code') as string;
    if (!code) return;

    await ensureAddingItems();
    const res = await mutate(ApplyPromotionCodeMutation, {couponCode: code}, {useAuthToken: true});
    console.log({res: res.data.applyCouponCode})
    updateTag('cart');
}

export async function removePromotionCode(formData: FormData) {
    const code = formData.get('code') as string;
    if (!code) return;

    await ensureAddingItems();
    const res = await mutate(RemovePromotionCodeMutation, {couponCode: code}, {useAuthToken: true});
    console.log({removeRes: res.data.removeCouponCode});
    updateTag('cart');
}
