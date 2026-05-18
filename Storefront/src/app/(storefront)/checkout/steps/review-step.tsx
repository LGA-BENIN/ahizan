'use client';

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, MapPin, Truck, CreditCard, Edit, Mail } from 'lucide-react';
import { useCheckout } from '../checkout-provider';
import { placeOrder as placeOrderAction } from '../actions';
import { Price } from '@/components/commerce/price';

interface ReviewStepProps {
  onEditStep: (step: 'contact' | 'shipping' | 'delivery' | 'payment') => void;
}

export default function ReviewStep({ onEditStep }: ReviewStepProps) {
  const { order, paymentMethods, selectedPaymentMethodCode, isGuest } = useCheckout();
  const [loading, setLoading] = useState(false);

  const isSubmitting = useRef(false);

  const selectedPaymentMethod = paymentMethods.find(
    (method) => method.code === selectedPaymentMethodCode
  );

  const handlePlaceOrder = async () => {
    if (!selectedPaymentMethodCode || isSubmitting.current) return;

    isSubmitting.current = true;
    setLoading(true);
    try {
      const result = await placeOrderAction(selectedPaymentMethodCode);
      
      if (result && !result.success) {
         if (result.error.includes('NO_ACTIVE_ORDER')) {
             console.log('No active order found. Session may have expired or order was already placed. Redirecting to cart.');
             // Force a full reload to /cart to clear any stale Next.js cache state
             window.location.href = '/cart';
             return;
         }
         console.error('Error placing order:', result.error);
         alert(`Payment failed: ${result.error}`); // Simple fallback alert for visibility
         isSubmitting.current = false;
         setLoading(false);
      }
    } catch (error) {
      if (error instanceof Error && error.message.includes('NEXT_REDIRECT')) {
        throw error; // This is a correct redirect from NextJS
      }
      console.error('Error placing order:', error);
      isSubmitting.current = false;
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 py-2">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Vérifiez les détails de votre commande</h3>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {isGuest && order.customer && (
          <div className="space-y-3 bg-muted/10 dark:bg-muted/5 p-4 rounded-xl border">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-md bg-primary/10 flex items-center justify-center">
                <Mail className="h-4 w-4 text-primary" />
              </div>
              <h4 className="text-xs font-semibold uppercase tracking-wide text-foreground/70">Contact</h4>
            </div>
            <div className="text-sm space-y-2">
              <div>
                <p className="font-semibold text-sm leading-tight">
                  {order.customer.firstName} {order.customer.lastName}
                </p>
                <p className="font-medium text-muted-foreground mt-1">{order.customer.emailAddress}</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onEditStep('contact')}
                className="h-8 rounded-lg font-bold text-xs hover:bg-primary/5 hover:text-primary transition-colors pl-0"
              >
                <Edit className="h-3 w-3 mr-2" />
                Modifier
              </Button>
            </div>
          </div>
        )}

        {/* Shipping Address */}
        <div className="space-y-3 bg-muted/10 dark:bg-muted/5 p-4 rounded-xl border">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-primary/10 flex items-center justify-center">
                <MapPin className="h-4 w-4 text-primary" />
            </div>
            <h4 className="text-xs font-semibold uppercase tracking-wide text-foreground/70">Livraison</h4>
          </div>
          {order.shippingAddress ? (
            <div className="text-sm space-y-2">
              <div>
                <p className="font-semibold text-sm leading-tight">{order.shippingAddress.fullName}</p>
                <p className="font-medium text-muted-foreground mt-1">
                  {order.shippingAddress.streetLine1}
                  {order.shippingAddress.streetLine2 && `, ${order.shippingAddress.streetLine2}`}
                </p>
                <p className="font-medium text-muted-foreground">
                  {order.shippingAddress.city}, {order.shippingAddress.province} {order.shippingAddress.postalCode}
                </p>
                <p className="font-bold text-foreground/80">{order.shippingAddress.country}</p>
                <p className="font-bold text-foreground mt-2">{order.shippingAddress.phoneNumber}</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onEditStep('shipping')}
                className="h-8 rounded-lg font-bold text-xs hover:bg-primary/5 hover:text-primary transition-colors pl-0"
              >
                <Edit className="h-3 w-3 mr-2" />
                Modifier
              </Button>
            </div>
          ) : (
            <p className="text-sm font-bold text-destructive italic">Adresse non définie</p>
          )}
        </div>

        {/* Delivery Method */}
        <div className="space-y-3 bg-muted/10 dark:bg-muted/5 p-4 rounded-xl border">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-primary/10 flex items-center justify-center">
                <Truck className="h-4 w-4 text-primary" />
            </div>
            <h4 className="text-xs font-semibold uppercase tracking-wide text-foreground/70">Mode d'expédition</h4>
          </div>
          {order.shippingLines && order.shippingLines.length > 0 ? (
            <div className="text-sm space-y-2">
              <div>
                <p className="font-semibold text-sm leading-tight">{order.shippingLines[0].shippingMethod.name}</p>
                <p className="font-bold text-primary mt-1 uppercase tracking-widest text-[10px]">
                  {order.shippingLines[0].priceWithTax === 0
                    ? 'LIVRAISON GRATUITE'
                    : <Price value={order.shippingLines[0].priceWithTax} currencyCode={order.currencyCode} />}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onEditStep('delivery')}
                className="h-8 rounded-lg font-bold text-xs hover:bg-primary/5 hover:text-primary transition-colors pl-0"
              >
                <Edit className="h-3 w-3 mr-2" />
                Modifier
              </Button>
            </div>
          ) : (
            <p className="text-sm font-bold text-destructive italic">Mode non sélectionné</p>
          )}
        </div>

        {/* Payment Method */}
        <div className="space-y-3 bg-muted/10 dark:bg-muted/5 p-4 rounded-xl border">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-primary/10 flex items-center justify-center">
                <CreditCard className="h-4 w-4 text-primary" />
            </div>
            <h4 className="text-xs font-semibold uppercase tracking-wide text-foreground/70">Paiement</h4>
          </div>
          {selectedPaymentMethod ? (
            <div className="text-sm space-y-2">
              <div>
                <p className="font-semibold text-sm leading-tight">{selectedPaymentMethod.name}</p>
                {selectedPaymentMethod.description && (
                  <p className="font-medium text-muted-foreground mt-1">
                    {selectedPaymentMethod.description}
                  </p>
                )}
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onEditStep('payment')}
                className="h-8 rounded-lg font-bold text-xs hover:bg-primary/5 hover:text-primary transition-colors pl-0"
              >
                <Edit className="h-3 w-3 mr-2" />
                Modifier
              </Button>
            </div>
          ) : (
            <p className="text-sm font-bold text-destructive italic">Mode non sélectionné</p>
          )}
        </div>
      </div>

      <div className="pt-4">
          <Button
            onClick={handlePlaceOrder}
            disabled={loading || !order.shippingAddress || !order.shippingLines?.length || !selectedPaymentMethodCode}
            className="w-full h-11 rounded-lg font-semibold transition-all active:scale-[0.98]"
          >
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Confirmer la commande'}
          </Button>

          {(!order.shippingAddress || !order.shippingLines?.length || !selectedPaymentMethodCode) && (
            <div className="mt-4 p-3 rounded-lg bg-destructive/5 border border-destructive/10">
                <p className="text-xs text-destructive text-center">
                  Veuillez compléter toutes les étapes précédentes avant de confirmer votre commande.
                </p>
            </div>
          )}
      </div>
    </div>
  );
}
