'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Field, FieldLabel, FieldError, FieldGroup } from '@/components/ui/field';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useForm } from 'react-hook-form';
import { Loader2, AlertCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { setCustomerForOrder, SetCustomerForOrderResult } from '../actions';

interface ContactStepProps {
  onComplete: () => void;
}

interface ContactFormData {
  emailAddress: string;
  firstName: string;
  lastName: string;
}

function getErrorMessage(error: SetCustomerForOrderResult) {
  if (error.success) return null;

  switch (error.errorCode) {
    case 'EMAIL_CONFLICT':
      return (
        <>
          Un compte existe déjà avec cet email.{' '}
          <Link href="/sign-in?redirectTo=/checkout" className="underline hover:no-underline font-bold">
            Se connecter
          </Link>{' '}
          pour continuer.
        </>
      );
    case 'GUEST_CHECKOUT_DISABLED':
      return 'La commande en tant qu\'invité n\'est pas activée. Veuillez vous connecter ou créer un compte.';
    case 'NO_ACTIVE_ORDER':
      return (
        <>
          Votre panier est vide.{' '}
          <Link href="/" className="underline hover:no-underline font-bold">
            Continuer vos achats
          </Link>
        </>
      );
    default:
      return error.message;
  }
}

export default function ContactStep({ onComplete }: ContactStepProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<SetCustomerForOrderResult | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ContactFormData>();

  const onSubmit = async (data: ContactFormData) => {
    setLoading(true);
    setError(null);

    try {
      const result = await setCustomerForOrder(data);

      if (result.success) {
        router.refresh();
        onComplete();
      } else {
        setError(result);
      }
    } catch (err) {
      console.error('Error setting customer:', err);
      setError({ success: false, errorCode: 'UNKNOWN', message: 'Une erreur inattendue s\'est produite' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 py-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-muted-foreground">
          Vous avez déjà un compte ?{' '}
          <Link href="/sign-in?redirectTo=/checkout" className="text-primary font-black underline hover:no-underline decoration-2">
            Se connecter
          </Link>
        </p>
      </div>

      {error && !error.success && (
        <Alert variant="destructive" className="rounded-xl bg-destructive/10 border-destructive/20 text-destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="font-bold">{getErrorMessage(error)}</AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit(onSubmit)}>
        <FieldGroup className="space-y-6">
          <div className="grid grid-cols-2 gap-6">
            <Field className="col-span-2">
              <FieldLabel htmlFor="emailAddress" className="font-black text-xs uppercase tracking-widest text-muted-foreground">Adresse Email *</FieldLabel>
              <Input
                id="emailAddress"
                type="email"
                placeholder="votre@email.com"
                className="h-10 rounded-lg focus-visible:ring-primary"
                {...register('emailAddress', {
                  required: 'L\'email est requis',
                  pattern: {
                    value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                    message: 'Adresse email invalide',
                  },
                })}
              />
              <FieldError className="font-bold text-xs text-destructive">{errors.emailAddress?.message}</FieldError>
            </Field>

            <Field className="col-span-2 sm:col-span-1">
              <FieldLabel htmlFor="firstName" className="font-black text-xs uppercase tracking-widest text-muted-foreground">Prénom *</FieldLabel>
              <Input
                id="firstName"
                placeholder="Jean"
                className="h-10 rounded-lg focus-visible:ring-primary"
                {...register('firstName', { required: 'Le prénom est requis' })}
              />
              <FieldError className="font-bold text-xs text-destructive">{errors.firstName?.message}</FieldError>
            </Field>

            <Field className="col-span-2 sm:col-span-1">
              <FieldLabel htmlFor="lastName" className="font-black text-xs uppercase tracking-widest text-muted-foreground">Nom *</FieldLabel>
              <Input
                id="lastName"
                placeholder="Dupont"
                className="h-10 rounded-lg focus-visible:ring-primary"
                {...register('lastName', { required: 'Le nom est requis' })}
              />
              <FieldError className="font-bold text-xs text-destructive">{errors.lastName?.message}</FieldError>
            </Field>
          </div>

          <Button type="submit" disabled={loading} className="w-full h-11 rounded-lg font-semibold transition-all active:scale-[0.98] mt-4">
            {loading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : 'Continuer vers la livraison'}
          </Button>
        </FieldGroup>
      </form>
    </div>
  );
}
