'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Field, FieldLabel, FieldError, FieldGroup } from '@/components/ui/field';
import { useForm, Controller } from 'react-hook-form';
import { Loader2 } from 'lucide-react';
import { CountrySelect } from '@/components/shared/country-select';

interface Country {
  id: string;
  code: string;
  name: string;
}

interface AddressFormData {
  fullName: string;
  streetLine1: string;
  streetLine2?: string;
  city: string;
  province: string;
  postalCode: string;
  countryCode: string;
  phoneNumber: string;
  company?: string;
}

interface CustomerAddress {
  id: string;
  fullName?: string | null;
  company?: string | null;
  streetLine1: string;
  streetLine2?: string | null;
  city?: string | null;
  province?: string | null;
  postalCode?: string | null;
  country: { id: string; code: string; name: string };
  phoneNumber?: string | null;
  defaultShippingAddress?: boolean | null;
  defaultBillingAddress?: boolean | null;
}

interface AddressFormProps {
  countries: Country[];
  address?: CustomerAddress;
  onSubmit: (data: AddressFormData & { id?: string }) => Promise<void>;
  onCancel: () => void;
  isSubmitting: boolean;
}

export function AddressForm({ countries, address, onSubmit, onCancel, isSubmitting }: AddressFormProps) {
  const { register, handleSubmit, formState: { errors }, control } = useForm<AddressFormData>({
    defaultValues: address ? {
      fullName: address.fullName || '',
      company: address.company || '',
      streetLine1: address.streetLine1,
      streetLine2: address.streetLine2 || '',
      city: address.city || '',
      province: address.province || '',
      postalCode: address.postalCode || '',
      countryCode: address.country.code,
      phoneNumber: address.phoneNumber || '',
    } : {
      countryCode: countries[0]?.code || 'US',
    }
  });

  const handleFormSubmit = async (data: AddressFormData) => {
    await onSubmit(address ? { ...data, id: address.id } : data);
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)}>
      <FieldGroup className="my-6">
        <div className="grid grid-cols-2 gap-4">
          <Field className="col-span-2">
            <FieldLabel htmlFor="fullName">Nom complet *</FieldLabel>
            <Input
              id="fullName"
              {...register('fullName', { required: 'Le nom complet est requis' })}
              disabled={isSubmitting}
            />
            <FieldError>{errors.fullName?.message}</FieldError>
          </Field>

          <Field className="col-span-2">
            <FieldLabel htmlFor="company">Entreprise / Société</FieldLabel>
            <Input id="company" {...register('company')} disabled={isSubmitting} />
          </Field>

          <Field className="col-span-2">
            <FieldLabel htmlFor="streetLine1">Adresse *</FieldLabel>
            <Input
              id="streetLine1"
              {...register('streetLine1', { required: 'L\'adresse est requise' })}
              disabled={isSubmitting}
            />
            <FieldError>{errors.streetLine1?.message}</FieldError>
          </Field>

          <Field className="col-span-2">
            <FieldLabel htmlFor="streetLine2">Appartement, suite, etc.</FieldLabel>
            <Input id="streetLine2" {...register('streetLine2')} disabled={isSubmitting} />
          </Field>

          <Field>
            <FieldLabel htmlFor="city">Ville *</FieldLabel>
            <Input
              id="city"
              {...register('city', { required: 'La ville est requise' })}
              disabled={isSubmitting}
            />
            <FieldError>{errors.city?.message}</FieldError>
          </Field>

          <Field>
            <FieldLabel htmlFor="province">État / Province / Région *</FieldLabel>
            <Input
              id="province"
              {...register('province', { required: 'La province est requise' })}
              disabled={isSubmitting}
            />
            <FieldError>{errors.province?.message}</FieldError>
          </Field>

          <Field>
            <FieldLabel htmlFor="postalCode">Code postal *</FieldLabel>
            <Input
              id="postalCode"
              {...register('postalCode', { required: 'Le code postal est requis' })}
              disabled={isSubmitting}
            />
            <FieldError>{errors.postalCode?.message}</FieldError>
          </Field>

          <Field>
            <FieldLabel htmlFor="countryCode">Pays *</FieldLabel>
            <Controller
              name="countryCode"
              control={control}
              rules={{ required: 'Le pays est requis' }}
              render={({ field }) => (
                <CountrySelect
                  countries={countries}
                  value={field.value}
                  onValueChange={field.onChange}
                  disabled={isSubmitting}
                />
              )}
            />
            <FieldError>{errors.countryCode?.message}</FieldError>
          </Field>

          <Field className="col-span-2">
            <FieldLabel htmlFor="phoneNumber">Numéro de téléphone *</FieldLabel>
            <Input
              id="phoneNumber"
              type="tel"
              {...register('phoneNumber', { required: 'Le numéro de téléphone est requis' })}
              disabled={isSubmitting}
            />
            <FieldError>{errors.phoneNumber?.message}</FieldError>
          </Field>
        </div>
      </FieldGroup>

      <div className="flex gap-3 justify-end">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
          Annuler
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {address ? 'Mettre à jour l\'adresse' : 'Enregistrer l\'adresse'}
        </Button>
      </div>
    </form>
  );
}
