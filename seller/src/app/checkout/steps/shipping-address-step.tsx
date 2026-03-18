'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Field, FieldLabel, FieldError, FieldGroup } from '@/components/ui/field';
import { useForm, Controller } from 'react-hook-form';
import { Loader2, Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCheckout } from '../checkout-provider';
import { setShippingAddress, createCustomerAddress } from '../actions';
import { CountrySelect } from '@/components/shared/country-select';

interface ShippingAddressStepProps {
  onComplete: () => void;
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

export default function ShippingAddressStep({ onComplete }: ShippingAddressStepProps) {
  const router = useRouter();
  const { addresses, countries, order, isGuest } = useCheckout();
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(() => {
    if (order.shippingAddress) {
      const matchingAddress = addresses.find(
        (a) =>
          a.streetLine1 === order.shippingAddress?.streetLine1 &&
          a.postalCode === order.shippingAddress?.postalCode
      );
      if (matchingAddress) return matchingAddress.id;
    }
    const defaultAddress = addresses.find((a) => a.defaultShippingAddress);
    return defaultAddress?.id || null;
  });
  
  const [isAddingNewAddress, setIsAddingNewAddress] = useState(addresses.length === 0);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [useSameForBilling, setUseSameForBilling] = useState(true);

  const getDefaultFormValues = (): Partial<AddressFormData> => {
    const customerFullName = order.customer
      ? `${order.customer.firstName} ${order.customer.lastName}`.trim()
      : '';

    if (isGuest && order.shippingAddress?.streetLine1) {
      return {
        fullName: order.shippingAddress.fullName || customerFullName,
        streetLine1: order.shippingAddress.streetLine1 || '',
        streetLine2: order.shippingAddress.streetLine2 || '',
        city: order.shippingAddress.city || '',
        province: order.shippingAddress.province || '',
        postalCode: order.shippingAddress.postalCode || '',
        countryCode: countries.find(c => c.name === order.shippingAddress?.country)?.code || countries.find(c => c.code === 'BJ')?.code || countries[0]?.code || 'BJ',
        phoneNumber: order.shippingAddress.phoneNumber || order.customer?.phoneNumber || '',
        company: order.shippingAddress.company || '',
      };
    }
    return {
      fullName: customerFullName,
      countryCode: countries.find(c => c.code === 'BJ')?.code || countries[0]?.code || 'BJ',
      phoneNumber: order.customer?.phoneNumber || '',
    };
  };

  const { register, handleSubmit, formState: { errors }, reset, control } = useForm<AddressFormData>({
    defaultValues: getDefaultFormValues()
  });

  const handleSelectExistingAddress = async () => {
    if (!selectedAddressId) return;

    setLoading(true);
    try {
      const selectedAddress = addresses.find(a => a.id === selectedAddressId);
      if (!selectedAddress) return;

      await setShippingAddress({
        fullName: selectedAddress.fullName || '',
        company: selectedAddress.company || '',
        streetLine1: selectedAddress.streetLine1,
        streetLine2: selectedAddress.streetLine2 || '',
        city: selectedAddress.city || '',
        province: selectedAddress.province || '',
        postalCode: selectedAddress.postalCode || '',
        countryCode: selectedAddress.country.code,
        phoneNumber: selectedAddress.phoneNumber || '',
      }, useSameForBilling);

      router.refresh();
      onComplete();
    } catch (error) {
      console.error('Error setting address:', error);
    } finally {
      setLoading(false);
    }
  };

  const onSaveNewAddress = async (data: AddressFormData) => {
    setSaving(true);
    try {
      const newAddress = await createCustomerAddress(data);
      setIsAddingNewAddress(false);
      reset();
      router.refresh();
      setSelectedAddressId(newAddress.id);
    } catch (error) {
      console.error('Error creating address:', error);
      alert(`Error creating address: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setSaving(false);
    }
  };

  const onSubmitGuestAddress = async (data: AddressFormData) => {
    setLoading(true);
    try {
      await setShippingAddress(data, useSameForBilling);
      router.refresh();
      onComplete();
    } catch (error) {
      console.error('Error setting address:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderAddressForm = (formType: 'guest' | 'new') => (
    <div className="space-y-6">
      <form onSubmit={handleSubmit(formType === 'guest' ? onSubmitGuestAddress : onSaveNewAddress)}>
        <FieldGroup>
          <div className="grid grid-cols-2 gap-4">
            <Field className="col-span-2">
              <FieldLabel htmlFor="fullName">Full Name *</FieldLabel>
              <Input
                id="fullName"
                {...register('fullName', { required: 'Full name is required' })}
              />
              <FieldError>{errors.fullName?.message}</FieldError>
            </Field>

            <Field className="col-span-2">
              <FieldLabel htmlFor="company">Company</FieldLabel>
              <Input id="company" {...register('company')} />
            </Field>

            <Field className="col-span-2">
              <FieldLabel htmlFor="streetLine1">Street Address *</FieldLabel>
              <Input
                id="streetLine1"
                {...register('streetLine1', { required: 'Street address is required' })}
              />
              <FieldError>{errors.streetLine1?.message}</FieldError>
            </Field>

            <Field className="col-span-2">
              <FieldLabel htmlFor="streetLine2">Apartment, suite, etc.</FieldLabel>
              <Input id="streetLine2" {...register('streetLine2')} />
            </Field>

            <Field>
              <FieldLabel htmlFor="city">City *</FieldLabel>
              <Input
                id="city"
                {...register('city', { required: 'City is required' })}
              />
              <FieldError>{errors.city?.message}</FieldError>
            </Field>

            <Field>
              <FieldLabel htmlFor="province">State/Province</FieldLabel>
              <Input
                id="province"
                {...register('province')}
              />
              <FieldError>{errors.province?.message}</FieldError>
            </Field>

            <Field>
              <FieldLabel htmlFor="postalCode">Postal Code *</FieldLabel>
              <Input
                id="postalCode"
                {...register('postalCode', { required: 'Postal code is required' })}
              />
              <FieldError>{errors.postalCode?.message}</FieldError>
            </Field>

            <Field>
              <FieldLabel htmlFor="countryCode">Country *</FieldLabel>
              <Controller
                name="countryCode"
                control={control}
                rules={{ required: 'Country is required' }}
                render={({ field }) => (
                  <CountrySelect
                    countries={countries}
                    value={field.value}
                    onValueChange={field.onChange}
                    disabled={loading || saving}
                  />
                )}
              />
              <FieldError>{errors.countryCode?.message}</FieldError>
            </Field>

            <Field className="col-span-2">
              <FieldLabel htmlFor="phoneNumber">Phone Number *</FieldLabel>
              <Input
                id="phoneNumber"
                type="tel"
                {...register('phoneNumber', { required: 'Phone number is required' })}
              />
              <FieldError>{errors.phoneNumber?.message}</FieldError>
            </Field>
          </div>

          <div className="flex items-center space-x-2 mt-4">
            <Checkbox
              id="same-billing-form"
              checked={useSameForBilling}
              onCheckedChange={(checked) => setUseSameForBilling(checked === true)}
            />
            <label
              htmlFor="same-billing-form"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              Use same address for billing
            </label>
          </div>

          <div className="flex gap-3 mt-6">
            {formType === 'new' && addresses.length > 0 && (
              <Button type="button" variant="outline" onClick={() => setIsAddingNewAddress(false)} disabled={saving}>
                Cancel
              </Button>
            )}
            <Button type="submit" disabled={loading || saving} className="flex-1">
              {(loading || saving) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {formType === 'guest' ? 'Continue' : 'Save & Use Address'}
            </Button>
          </div>
        </FieldGroup>
      </form>
    </div>
  );

  if (isGuest) {
    return renderAddressForm('guest');
  }

  if (isAddingNewAddress || addresses.length === 0) {
    return (
      <div className="space-y-4">
        <h3 className="font-semibold">{addresses.length === 0 ? 'Add shipping address' : 'Add new address'}</h3>
        {renderAddressForm('new')}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">Select a saved address</h3>
          <Button variant="ghost" size="sm" onClick={() => setIsAddingNewAddress(true)} className="text-primary">
            <Plus className="w-4 h-4 mr-1" />
            Add new address
          </Button>
        </div>
        
        <RadioGroup value={selectedAddressId || ''} onValueChange={setSelectedAddressId}>
          {addresses.map((address) => (
            <div key={address.id} className="flex items-start space-x-3">
              <RadioGroupItem value={address.id} id={address.id} className="mt-1" />
              <Label htmlFor={address.id} className="flex-1 cursor-pointer">
                <Card className="p-4">
                  <div className="leading-tight space-y-0 text-sm">
                    <p className="font-medium">{address.fullName}</p>
                    {address.company && <p className="text-muted-foreground">{address.company}</p>}
                    <p className="text-muted-foreground">
                      {address.streetLine1}
                      {address.streetLine2 && `, ${address.streetLine2}`}
                    </p>
                    <p className="text-muted-foreground">
                      {address.city}, {address.province} {address.postalCode}
                    </p>
                    <p className="text-muted-foreground">{address.country.name}</p>
                    <p className="text-muted-foreground">{address.phoneNumber}</p>
                  </div>
                </Card>
              </Label>
            </div>
          ))}
        </RadioGroup>

        <div className="flex items-center space-x-2">
          <Checkbox
            id="same-billing"
            checked={useSameForBilling}
            onCheckedChange={(checked) => setUseSameForBilling(checked === true)}
          />
          <label
            htmlFor="same-billing"
            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
          >
            Use same address for billing
          </label>
        </div>

        <Button
          onClick={handleSelectExistingAddress}
          disabled={!selectedAddressId || loading}
          className="w-full"
        >
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Continue with selected address
        </Button>
      </div>
    </div>
  );
}
