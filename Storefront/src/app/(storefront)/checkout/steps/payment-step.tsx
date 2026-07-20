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
      <div className="text-center py-12 bg-muted/20 rounded-2xl border border-dashed border-border">
        <Banknote className="w-12 h-12 text-muted-foreground/40 mx-auto mb-4" />
        <p className="text-muted-foreground font-medium">Aucun mode de paiement disponible pour le moment.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 py-4">
      <h3 className="font-black text-xs uppercase tracking-widest text-muted-foreground/60">Choisissez votre mode de paiement</h3>

      <div className="relative group">
        <Card className="p-8 rounded-2xl border-2 border-primary bg-primary/5 shadow-sm transition-all group-hover:shadow-md">
            <div className="flex items-center gap-6">
                <div className="h-14 w-14 rounded-2xl bg-primary text-white flex items-center justify-center shrink-0 shadow-lg shadow-primary/20">
                    <Banknote className="h-7 w-7" />
                </div>
                <div className="flex-1">
                    <p className="font-black text-xl tracking-tight leading-tight">Paiement à la livraison (COD)</p>
                    <p className="text-sm font-medium text-muted-foreground mt-1">
                        Réglez votre commande en espèces directement auprès du livreur lors de la réception de votre colis.
                    </p>
                </div>
                <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-white shrink-0">
                    <CheckCircle2 className="h-5 w-5" />
                </div>
            </div>
        </Card>
      </div>

      <div className="rounded-2xl bg-amber-50 dark:bg-amber-950/20 border-2 border-amber-200/50 dark:border-amber-900/30 p-5 flex items-start gap-4">
        <span className="text-xl">💡</span>
        <div>
            <p className="text-sm font-black text-amber-900 dark:text-amber-200 uppercase tracking-widest mb-1">Conseil pratique</p>
            <p className="text-sm font-medium text-amber-800 dark:text-amber-300/80 leading-relaxed">
                Afin de faciliter la transaction, nous vous recommandons de préparer la monnaie exacte lors de la livraison de votre colis.
            </p>
        </div>
      </div>

      <Button
        onClick={onComplete}
        disabled={!selectedPaymentMethodCode}
        className="w-full h-11 rounded-lg font-semibold transition-all active:scale-[0.98] mt-4"
      >
        Récapitulatif de la commande
      </Button>
    </div>
  );
}
