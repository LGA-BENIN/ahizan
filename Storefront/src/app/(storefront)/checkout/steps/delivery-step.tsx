'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Loader2, Truck } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCheckout } from '../checkout-provider';
import { setShippingMethod as setShippingMethodAction } from '../actions';

interface DeliveryStepProps {
  onComplete: () => void;
}

export default function DeliveryStep({ onComplete }: DeliveryStepProps) {
  const router = useRouter();
  const { shippingMethods, order } = useCheckout();
  const [selectedMethodId, setSelectedMethodId] = useState<string | null>(() => {
    // If order already has a shipping method selected, pre-select it
    if (order.shippingLines && order.shippingLines.length > 0) {
      return order.shippingLines[0].shippingMethod.id;
    }
    // Otherwise default to first method if there's only one
    return shippingMethods.length === 1 ? shippingMethods[0].id : null;
  });
  const [submitting, setSubmitting] = useState(false);

  const handleContinue = async () => {
    if (!selectedMethodId) return;

    setSubmitting(true);
    try {
      await setShippingMethodAction(selectedMethodId);
      router.refresh();
      onComplete();
    } catch (error) {
      console.error('Error setting shipping method:', error);
    } finally {
      setSubmitting(false);
    }
  };

  if (shippingMethods.length === 0) {
    return (
      <div className="text-center py-12 bg-muted/20 rounded-2xl border border-dashed border-border">
        <Truck className="w-12 h-12 text-muted-foreground/40 mx-auto mb-4" />
        <p className="text-muted-foreground font-medium">Aucun mode de livraison disponible pour cette adresse.</p>
        <p className="text-xs text-muted-foreground mt-2 italic">Veuillez vérifier votre adresse de livraison.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 py-4">
      <h3 className="font-black text-xs uppercase tracking-widest text-muted-foreground/60">Choisissez votre mode de livraison</h3>

      <RadioGroup value={selectedMethodId || ''} onValueChange={setSelectedMethodId} className="grid gap-4">
        {shippingMethods.map((method) => (
          <div key={method.id} className="relative group">
            <RadioGroupItem value={method.id} id={method.id} className="sr-only" />
            <Label htmlFor={method.id} className="cursor-pointer block">
              <Card className={`p-6 rounded-2xl border-2 transition-all group-hover:shadow-md ${
                selectedMethodId === method.id 
                  ? 'border-primary bg-primary/5 shadow-sm' 
                  : 'border-muted bg-card hover:border-primary/40'
              }`}>
                <div className="flex items-center justify-between gap-6">
                  <div className="flex items-center gap-5 flex-1">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors ${
                      selectedMethodId === method.id ? 'bg-primary text-white' : 'bg-muted text-muted-foreground'
                    }`}>
                        <Truck className="h-6 w-6" />
                    </div>
                    <div className="flex-1">
                      <p className="font-black text-lg tracking-tight leading-tight">{method.name}</p>
                      {method.description && (
                        <p className="text-xs font-bold text-muted-foreground mt-1 uppercase tracking-wider">
                          {method.description}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className={`text-xl font-black ${method.priceWithTax === 0 ? 'text-green-600' : 'text-foreground'}`}>
                      {method.priceWithTax === 0
                        ? 'GRATUIT'
                        : (method.priceWithTax / 100).toLocaleString('fr-FR', {
                            style: 'currency',
                            currency: 'XOF',
                            minimumFractionDigits: 0,
                            maximumFractionDigits: 0,
                          })}
                    </p>
                  </div>
                </div>
              </Card>
            </Label>
          </div>
        ))}
      </RadioGroup>

      <Button
        onClick={handleContinue}
        disabled={!selectedMethodId || submitting}
        className="w-full h-11 rounded-lg font-semibold transition-all active:scale-[0.98] mt-4"
      >
        {submitting ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : 'Continuer vers le paiement'}
      </Button>
    </div>
  );
}
