'use server';

import { mutate, query } from '@/lib/vendure/api';
import { AddToCartMutation } from '@/lib/vendure/mutations';
import { GetVariantVendorQuery, GetActiveOrderQuery } from '@/lib/vendure/queries';
import { updateTag } from 'next/cache';
import { setAuthToken } from '@/lib/auth';

export async function addToCart(variantId: string, quantity: number = 1) {
  try {
    // 1. Check existing cart
    const { data: activeOrderData } = await query(GetActiveOrderQuery, {}, { useAuthToken: true });

    // 2. Check vendor of new item
    const { data: variantData } = await query(GetVariantVendorQuery, { variantId });
    const newVendorId = variantData.productVariant?.product.customFields?.vendor?.id;

    if (activeOrderData.activeOrder?.lines?.length && activeOrderData.activeOrder.lines.length > 0) {
      const existingVendorId = activeOrderData.activeOrder.lines[0].productVariant.product.customFields?.vendor?.id;

      // If cart has items from a vendor, and we are adding item from DIFFERENT vendor (or no vendor vs vendor)
      // strict check: if both exist and different, block.
      if (existingVendorId && newVendorId && existingVendorId !== newVendorId) {
        return { success: false, error: 'User constraint: You can only add items from one vendor at a time. Please clear your cart.' };
      }

      // If existing is global (no vendor) and new is vendor specific? Or visa versa?
      // Assuming strict "One Seller" policy means we can't mix global items with vendor items either if we want simple checkout.
      if (existingVendorId !== newVendorId) {
        // return { success: false, error: 'Mixed cart not allowed.' };
        // For MVP, lets allow if ids match or both undefined.
      }
    }

    const result = await mutate(AddToCartMutation, { variantId, quantity }, { useAuthToken: true });

    if (result.token) {
      await setAuthToken(result.token);
    }

    if (result.data.addItemToOrder.__typename === 'Order') {
      // Revalidate cart data across all pages
      updateTag('cart');
      updateTag('active-order');
      return { success: true, order: result.data.addItemToOrder };
    } else {
      return { success: false, error: result.data.addItemToOrder.message };
    }
  } catch {
    return { success: false, error: 'Failed to add item to cart' };
  }
}
