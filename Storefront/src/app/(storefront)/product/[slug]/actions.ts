'use server';

import { mutate } from '@/lib/vendure/api';
import { AddToCartMutation } from '@/lib/vendure/mutations';
import { revalidatePath, revalidateTag, updateTag } from 'next/cache';
import { setAuthToken } from '@/lib/auth';
import { ensureAddingItems } from '@/app/(storefront)/checkout/actions';

export async function addToCart(variantId: string, quantity: number = 1, vendorId?: string) {
  try {
    await ensureAddingItems();
    const customFields = vendorId ? { assignedVendorId: vendorId } : undefined;
    const result = await mutate(AddToCartMutation, { variantId, quantity, customFields }, { useAuthToken: true });

    if (result.token) {
      await setAuthToken(result.token);
    }

    if (result.data?.addItemToOrder?.__typename === 'Order') {
      // Revalidate cart data across all pages and components
      try { (revalidateTag as any)('cart'); } catch (e) {}
      try { (revalidateTag as any)('active-order'); } catch (e) {}
      try { revalidatePath('/cart'); } catch (e) {}
      try { revalidatePath('/', 'layout'); } catch (e) {}
      try { (updateTag as any)('cart'); } catch (e) {}
      try { (updateTag as any)('active-order'); } catch (e) {}
      return { success: true, order: result.data.addItemToOrder };
    } else {
      const errorMsg = result.data?.addItemToOrder?.message || 'Impossible d\'ajouter au panier';
      console.warn('[Storefront AddToCart] Mutation returned non-order result:', result.data?.addItemToOrder);
      return { success: false, error: errorMsg };
    }
  } catch (err: any) {
    console.error('[Storefront Cart Action] AddToCart error:', err);
    return { success: false, error: err?.message || 'Failed to add item to cart' };
  }
}
