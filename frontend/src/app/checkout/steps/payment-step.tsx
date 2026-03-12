'use client';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Banknote, CheckCircle2 } from 'lucide-react';
import { useCheckout } from '../checkout-provider';
import { useEffect } from 'react';

interface PaymentStepProps {
  onComplete: () => void;
}

export default function PaymentStep({ onComplete }: PaymentStepProps) {
  const { paymentMethods, selectedPaymentMethodCode, setSelectedPaymentMethodCode } = useCheckout();

  // Auto-select the cash-on-delivery method
  useEffect(() => {
    const cod = paymentMethods.find(m => m.code === 'cash-on-delivery');
    if (cod && !selectedPaymentMethodCode) {
      setSelectedPaymentMethodCode(cod.code);
    } else if (paymentMethods.length === 1 && !selectedPaymentMethodCode) {
      setSelectedPaymentMethodCode(paymentMethods[0].code);
    }
  }, [paymentMethods, selectedPaymentMethodCode, setSelectedPaymentMethodCode]);

  if (paymentMethods.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">Aucun mode de paiement disponible.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h3 className="font-semibold">Mode de paiement</h3>

      <Card className="p-5 border-2 border-primary/30 bg-primary/5">
        <div className="flex items-center gap-4">
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <Banknote className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1">
            <p className="font-semibold">Paiement à la livraison</p>
            <p className="text-sm text-muted-foreground">
              Payez en espèces au moment de la réception de votre colis.
            </p>
          </div>
          <CheckCircle2 className="h-5 w-5 text-primary shrink-0" />
        </div>
      </Card>

      <div className="rounded-md bg-amber-50 border border-amber-200 p-3 text-sm text-amber-800">
        💡 <strong>Conseil :</strong> Préparez la monnaie exacte pour faciliter la livraison.
      </div>

      <Button
        onClick={onComplete}
        disabled={!selectedPaymentMethodCode}
        className="w-full"
      >
        Confirmer et passer en revue
      </Button>
    </div>
  );
}
