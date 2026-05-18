'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Field, FieldLabel, FieldError, FieldGroup } from '@/components/ui/field';
import { useForm, Controller } from 'react-hook-form';
import { Loader2 } from 'lucide-react';
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
  const [dialogOpen, setDialogOpen] = useState(addresses.length === 0 && !isGuest);
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
      setDialogOpen(false);
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

  if (isGuest) {
    return (
      <div className="space-y-8 py-4">
        <form onSubmit={handleSubmit(onSubmitGuestAddress)}>
          <FieldGroup className="space-y-6">
            <div className="grid grid-cols-2 gap-6">
              <Field className="col-span-2">
                <FieldLabel htmlFor="fullName" className="font-black text-xs uppercase tracking-widest text-muted-foreground">Nom Complet *</FieldLabel>
                <Input
                  id="fullName"
                  placeholder="Jean Dupont"
                  className="h-10 rounded-lg focus-visible:ring-primary"
                  {...register('fullName', { required: 'Le nom complet est requis' })}
                />
                <FieldError className="font-bold text-xs text-destructive">{errors.fullName?.message}</FieldError>
              </Field>

              <Field className="col-span-2 sm:col-span-1">
                <FieldLabel htmlFor="company" className="font-black text-xs uppercase tracking-widest text-muted-foreground">Entreprise (Optionnel)</FieldLabel>
                <Input id="company" placeholder="Nom de l'entreprise" className="h-10 rounded-lg" {...register('company')} />
              </Field>

              <Field className="col-span-2 sm:col-span-1">
                <FieldLabel htmlFor="phoneNumber" className="font-black text-xs uppercase tracking-widest text-muted-foreground">Numéro de téléphone *</FieldLabel>
                <Input
                  id="phoneNumber"
                  type="tel"
                  placeholder="+229 00 00 00 00"
                  className="h-10 rounded-lg focus-visible:ring-primary"
                  {...register('phoneNumber', { required: 'Le numéro de téléphone est requis' })}
                />
                <FieldError className="font-bold text-xs text-destructive">{errors.phoneNumber?.message}</FieldError>
              </Field>

              <Field className="col-span-2">
                <FieldLabel htmlFor="streetLine1" className="font-black text-xs uppercase tracking-widest text-muted-foreground">Adresse *</FieldLabel>
                <Input
                  id="streetLine1"
                  placeholder="Rue, quartier, maison..."
                  className="h-10 rounded-lg focus-visible:ring-primary"
                  {...register('streetLine1', { required: 'L\'adresse est requise' })}
                />
                <FieldError className="font-bold text-xs text-destructive">{errors.streetLine1?.message}</FieldError>
              </Field>

              <Field className="col-span-2">
                <FieldLabel htmlFor="streetLine2" className="font-black text-xs uppercase tracking-widest text-muted-foreground">Appartement, suite, etc. (Optionnel)</FieldLabel>
                <Input id="streetLine2" placeholder="Ex: Appt 4B" className="h-10 rounded-lg" {...register('streetLine2')} />
              </Field>

              <Field className="col-span-2 sm:col-span-1">
                <FieldLabel htmlFor="city" className="font-black text-xs uppercase tracking-widest text-muted-foreground">Ville *</FieldLabel>
                <Input
                  id="city"
                  placeholder="Cotonou"
                  className="h-10 rounded-lg focus-visible:ring-primary"
                  {...register('city', { required: 'La ville est requise' })}
                />
                <FieldError className="font-bold text-xs text-destructive">{errors.city?.message}</FieldError>
              </Field>

              <Field className="col-span-2 sm:col-span-1">
                <FieldLabel htmlFor="province" className="font-black text-xs uppercase tracking-widest text-muted-foreground">Département / Province</FieldLabel>
                <Input
                  id="province"
                  placeholder="Littoral"
                  className="h-10 rounded-lg"
                  {...register('province')}
                />
                <FieldError className="font-bold text-xs text-destructive">{errors.province?.message}</FieldError>
              </Field>

              <Field className="col-span-2 sm:col-span-1">
                <FieldLabel htmlFor="postalCode" className="font-black text-xs uppercase tracking-widest text-muted-foreground">Code Postal *</FieldLabel>
                <Input
                  id="postalCode"
                  placeholder="00000"
                  className="h-10 rounded-lg focus-visible:ring-primary"
                  {...register('postalCode', { required: 'Le code postal est requis' })}
                />
                <FieldError className="font-bold text-xs text-destructive">{errors.postalCode?.message}</FieldError>
              </Field>

              <Field className="col-span-2 sm:col-span-1">
                <FieldLabel htmlFor="countryCode" className="font-black text-xs uppercase tracking-widest text-muted-foreground">Pays *</FieldLabel>
                <Controller
                  name="countryCode"
                  control={control}
                  rules={{ required: 'Le pays est requis' }}
                  render={({ field }) => (
                    <CountrySelect
                      countries={countries}
                      value={field.value}
                      onValueChange={field.onChange}
                      disabled={loading}
                    />
                  )}
                />
                <FieldError className="font-bold text-xs text-destructive">{errors.countryCode?.message}</FieldError>
              </Field>
            </div>

            <div className="flex items-center space-x-3 mt-4 bg-muted/30 p-4 rounded-xl border border-dashed">
              <Checkbox
                id="same-billing-guest"
                checked={useSameForBilling}
                onCheckedChange={(checked) => setUseSameForBilling(checked === true)}
                className="w-5 h-5 rounded-md"
              />
              <label
                htmlFor="same-billing-guest"
                className="text-sm font-bold leading-none cursor-pointer"
              >
                Utiliser la même adresse pour la facturation
              </label>
            </div>

            <Button type="submit" disabled={loading} className="w-full h-11 rounded-lg font-semibold shadow-xl shadow-primary/10 transition-all active:scale-[0.98] mt-4">
              {loading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : 'Continuer vers le mode de livraison'}
            </Button>
          </FieldGroup>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-8 py-4">
      {addresses.length > 0 && (
        <div className="space-y-6">
          <h3 className="font-black text-xs uppercase tracking-widest text-muted-foreground/60">Sélectionnez une adresse enregistrée</h3>
          <RadioGroup value={selectedAddressId || ''} onValueChange={setSelectedAddressId} className="grid gap-4">
            {addresses.map((address) => (
              <div key={address.id} className="relative group">
                <RadioGroupItem value={address.id} id={address.id} className="sr-only" />
                <Label htmlFor={address.id} className="flex-1 cursor-pointer block">
                  <Card className={`p-6 rounded-2xl border-2 transition-all group-hover:shadow-md ${
                    selectedAddressId === address.id 
                      ? 'border-primary bg-primary/5 shadow-sm' 
                      : 'border-muted bg-card hover:border-primary/40'
                  }`}>
                    <div className="flex items-start justify-between">
                        <div className="leading-relaxed space-y-1">
                            <p className="font-black text-lg tracking-tight">{address.fullName}</p>
                            {address.company && <p className="text-sm font-bold text-primary uppercase tracking-wider">{address.company}</p>}
                            <p className="text-sm font-medium text-muted-foreground">
                                {address.streetLine1}
                                {address.streetLine2 && `, ${address.streetLine2}`}
                            </p>
                            <p className="text-sm font-medium text-muted-foreground">
                                {address.city}, {address.province} {address.postalCode}
                            </p>
                            <p className="text-sm font-bold text-foreground/80">{address.country.name}</p>
                            <p className="text-sm font-bold text-foreground mt-2 flex items-center gap-2">
                                <span className="text-[10px] bg-muted px-2 py-0.5 rounded uppercase tracking-tighter">Tel</span>
                                {address.phoneNumber}
                            </p>
                        </div>
                        {selectedAddressId === address.id && (
                            <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center text-white">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                            </div>
                        )}
                    </div>
                  </Card>
                </Label>
              </div>
            ))}
          </RadioGroup>

          <div className="flex items-center space-x-3 bg-muted/30 p-4 rounded-xl border border-dashed">
            <Checkbox
              id="same-billing"
              checked={useSameForBilling}
              onCheckedChange={(checked) => setUseSameForBilling(checked === true)}
              className="w-5 h-5 rounded-md"
            />
            <label
              htmlFor="same-billing"
              className="text-sm font-bold cursor-pointer"
            >
              Utiliser la même adresse pour la facturation
            </label>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 pt-4">
            <Button
              onClick={handleSelectExistingAddress}
              disabled={!selectedAddressId || loading}
              className="flex-1 h-11 rounded-lg font-semibold shadow-xl shadow-primary/10"
            >
              {loading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : 'Continuer avec l\'adresse sélectionnée'}
            </Button>

            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button type="button" variant="outline" className="h-14 px-8 rounded-2xl font-bold border-2">
                  Nouvelle adresse
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl p-8">
                <form onSubmit={handleSubmit(onSaveNewAddress)}>
                  <DialogHeader className="mb-8">
                    <DialogTitle className="text-2xl font-black tracking-tight">Ajouter une nouvelle adresse</DialogTitle>
                    <DialogDescription className="text-base font-medium">
                      Remplissez le formulaire ci-dessous pour ajouter une adresse de livraison.
                    </DialogDescription>
                  </DialogHeader>

                  <FieldGroup className="space-y-6">
                    <div className="grid grid-cols-2 gap-6">
                      <Field className="col-span-2">
                        <FieldLabel htmlFor="fullName" className="font-black text-xs uppercase tracking-widest text-muted-foreground">Nom Complet</FieldLabel>
                        <Input
                          id="fullName"
                          placeholder="Jean Dupont"
                          className="h-10 rounded-lg"
                          {...register('fullName')}
                        />
                        <FieldError className="font-bold text-xs text-destructive">{errors.fullName?.message}</FieldError>
                      </Field>

                      <Field className="col-span-2 sm:col-span-1">
                        <FieldLabel htmlFor="company" className="font-black text-xs uppercase tracking-widest text-muted-foreground">Entreprise</FieldLabel>
                        <Input id="company" className="h-10 rounded-lg" {...register('company')} />
                      </Field>

                      <Field className="col-span-2 sm:col-span-1">
                        <FieldLabel htmlFor="phoneNumber" className="font-black text-xs uppercase tracking-widest text-muted-foreground">Numéro de téléphone</FieldLabel>
                        <Input
                          id="phoneNumber"
                          type="tel"
                          className="h-10 rounded-lg"
                          {...register('phoneNumber')}
                        />
                        <FieldError className="font-bold text-xs text-destructive">{errors.phoneNumber?.message}</FieldError>
                      </Field>

                      <Field className="col-span-2">
                        <FieldLabel htmlFor="streetLine1" className="font-black text-xs uppercase tracking-widest text-muted-foreground">Adresse *</FieldLabel>
                        <Input
                          id="streetLine1"
                          className="h-10 rounded-lg"
                          {...register('streetLine1', { required: 'L\'adresse est requise' })}
                        />
                        <FieldError className="font-bold text-xs text-destructive">{errors.streetLine1?.message}</FieldError>
                      </Field>

                      <Field className="col-span-2">
                        <FieldLabel htmlFor="streetLine2" className="font-black text-xs uppercase tracking-widest text-muted-foreground">Appartement, suite, etc.</FieldLabel>
                        <Input id="streetLine2" className="h-10 rounded-lg" {...register('streetLine2')} />
                      </Field>

                      <Field className="col-span-2 sm:col-span-1">
                        <FieldLabel htmlFor="city" className="font-black text-xs uppercase tracking-widest text-muted-foreground">Ville</FieldLabel>
                        <Input
                          id="city"
                          className="h-10 rounded-lg"
                          {...register('city')}
                        />
                        <FieldError className="font-bold text-xs text-destructive">{errors.city?.message}</FieldError>
                      </Field>

                      <Field className="col-span-2 sm:col-span-1">
                        <FieldLabel htmlFor="province" className="font-black text-xs uppercase tracking-widest text-muted-foreground">Province / Département</FieldLabel>
                        <Input
                          id="province"
                          className="h-10 rounded-lg"
                          {...register('province')}
                        />
                        <FieldError className="font-bold text-xs text-destructive">{errors.province?.message}</FieldError>
                      </Field>

                      <Field className="col-span-2 sm:col-span-1">
                        <FieldLabel htmlFor="postalCode" className="font-black text-xs uppercase tracking-widest text-muted-foreground">Code Postal</FieldLabel>
                        <Input
                          id="postalCode"
                          className="h-10 rounded-lg"
                          {...register('postalCode')}
                        />
                        <FieldError className="font-bold text-xs text-destructive">{errors.postalCode?.message}</FieldError>
                      </Field>

                      <Field className="col-span-2 sm:col-span-1">
                        <FieldLabel htmlFor="countryCode" className="font-black text-xs uppercase tracking-widest text-muted-foreground">Pays *</FieldLabel>
                        <Controller
                          name="countryCode"
                          control={control}
                          rules={{ required: 'Le pays est requis' }}
                          render={({ field }) => (
                            <CountrySelect
                              countries={countries}
                              value={field.value}
                              onValueChange={field.onChange}
                              disabled={saving}
                            />
                          )}
                        />
                        <FieldError className="font-bold text-xs text-destructive">{errors.countryCode?.message}</FieldError>
                      </Field>
                    </div>
                  </FieldGroup>

                  <DialogFooter className="mt-10 gap-3">
                    <Button type="button" variant="ghost" onClick={() => setDialogOpen(false)} disabled={saving} className="h-12 rounded-xl font-bold">
                      Annuler
                    </Button>
                    <Button type="submit" disabled={saving} className="h-12 px-8 rounded-xl font-black">
                      {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Enregistrer l\'adresse'}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      )}

      {addresses.length === 0 && (
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl p-8">
            <form onSubmit={handleSubmit(onSaveNewAddress)}>
              <DialogHeader className="mb-8">
                <DialogTitle className="text-2xl font-black tracking-tight">Ajouter une adresse de livraison</DialogTitle>
                <DialogDescription className="text-base font-medium">
                  Remplissez le formulaire ci-dessous pour ajouter votre adresse de livraison.
                </DialogDescription>
              </DialogHeader>

              <FieldGroup className="space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  <Field className="col-span-2">
                    <FieldLabel htmlFor="fullName" className="font-black text-xs uppercase tracking-widest text-muted-foreground">Nom Complet</FieldLabel>
                    <Input
                      id="fullName"
                      placeholder="Jean Dupont"
                      className="h-10 rounded-lg"
                      {...register('fullName')}
                    />
                    <FieldError className="font-bold text-xs text-destructive">{errors.fullName?.message}</FieldError>
                  </Field>

                  <Field className="col-span-2 sm:col-span-1">
                    <FieldLabel htmlFor="company" className="font-black text-xs uppercase tracking-widest text-muted-foreground">Entreprise</FieldLabel>
                    <Input id="company" className="h-10 rounded-lg" {...register('company')} />
                  </Field>

                  <Field className="col-span-2 sm:col-span-1">
                    <FieldLabel htmlFor="phoneNumber" className="font-black text-xs uppercase tracking-widest text-muted-foreground">Numéro de téléphone</FieldLabel>
                    <Input
                      id="phoneNumber"
                      type="tel"
                      className="h-10 rounded-lg"
                      {...register('phoneNumber')}
                    />
                    <FieldError className="font-bold text-xs text-destructive">{errors.phoneNumber?.message}</FieldError>
                  </Field>

                  <Field className="col-span-2">
                    <FieldLabel htmlFor="streetLine1" className="font-black text-xs uppercase tracking-widest text-muted-foreground">Adresse *</FieldLabel>
                    <Input
                      id="streetLine1"
                      className="h-10 rounded-lg"
                      {...register('streetLine1', { required: 'L\'adresse est requise' })}
                    />
                    <FieldError className="font-bold text-xs text-destructive">{errors.streetLine1?.message}</FieldError>
                  </Field>

                  <Field className="col-span-2">
                    <FieldLabel htmlFor="streetLine2" className="font-black text-xs uppercase tracking-widest text-muted-foreground">Appartement, suite, etc.</FieldLabel>
                    <Input id="streetLine2" className="h-10 rounded-lg" {...register('streetLine2')} />
                  </Field>

                  <Field className="col-span-2 sm:col-span-1">
                    <FieldLabel htmlFor="city" className="font-black text-xs uppercase tracking-widest text-muted-foreground">Ville</FieldLabel>
                    <Input
                      id="city"
                      className="h-10 rounded-lg"
                      {...register('city')}
                    />
                    <FieldError className="font-bold text-xs text-destructive">{errors.city?.message}</FieldError>
                  </Field>

                  <Field className="col-span-2 sm:col-span-1">
                    <FieldLabel htmlFor="province" className="font-black text-xs uppercase tracking-widest text-muted-foreground">Province / Département</FieldLabel>
                    <Input
                      id="province"
                      className="h-10 rounded-lg"
                      {...register('province')}
                    />
                    <FieldError className="font-bold text-xs text-destructive">{errors.province?.message}</FieldError>
                  </Field>

                  <Field className="col-span-2 sm:col-span-1">
                    <FieldLabel htmlFor="postalCode" className="font-black text-xs uppercase tracking-widest text-muted-foreground">Code Postal</FieldLabel>
                    <Input
                      id="postalCode"
                      className="h-10 rounded-lg"
                      {...register('postalCode')}
                    />
                    <FieldError className="font-bold text-xs text-destructive">{errors.postalCode?.message}</FieldError>
                  </Field>

                  <Field className="col-span-2 sm:col-span-1">
                    <FieldLabel htmlFor="countryCode" className="font-black text-xs uppercase tracking-widest text-muted-foreground">Pays *</FieldLabel>
                    <Controller
                      name="countryCode"
                      control={control}
                      rules={{ required: 'Le pays est requis' }}
                      render={({ field }) => (
                        <CountrySelect
                          countries={countries}
                          value={field.value}
                          onValueChange={field.onChange}
                          disabled={saving}
                        />
                      )}
                    />
                    <FieldError className="font-bold text-xs text-destructive">{errors.countryCode?.message}</FieldError>
                  </Field>
                </div>
              </FieldGroup>

              <DialogFooter className="mt-8">
                <Button type="submit" disabled={saving} className="w-full h-11 rounded-lg font-semibold">
                  {saving ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : 'Enregistrer l\'adresse'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
