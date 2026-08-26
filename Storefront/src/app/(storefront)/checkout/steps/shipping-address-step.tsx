'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Field, FieldLabel, FieldError, FieldGroup } from '@/components/ui/field';
import { useForm, Controller } from 'react-hook-form';
import { Loader2, MapPin, Navigation, Search, Trash2, Edit, Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCheckout } from '../checkout-provider';
import { setShippingAddress, createCustomerAddress, updateCustomerAddress, deleteCustomerAddress } from '../actions';
import { CountrySelect } from '@/components/shared/country-select';
import { useLocation } from '@/contexts/location-context';

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

interface NominatimSuggestion {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
  address: {
    road?: string;
    house_number?: string;
    neighbourhood?: string;
    suburb?: string;
    city?: string;
    town?: string;
    village?: string;
    state?: string;
    postcode?: string;
    country_code?: string;
  };
}

export default function ShippingAddressStep({ onComplete }: ShippingAddressStepProps) {
  const router = useRouter();
  const { addresses, countries, order, isGuest } = useCheckout();
  const { selectLocation } = useLocation();
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
  const [editingAddress, setEditingAddress] = useState<any | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  // Coordinates captured via Nominatim or GPS
  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(null);

  // Nominatim autocomplete state
  const [nominatimQuery, setNominatimQuery] = useState('');
  const [suggestions, setSuggestions] = useState<NominatimSuggestion[]>([]);
  const [nominatimLoading, setNominatimLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const getDefaultFormValues = (): Partial<AddressFormData> => {
    const customerFullName = order.customer
      ? `${order.customer.firstName} ${order.customer.lastName}`.trim()
      : '';

    let storedLocation: any = null;
    if (typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem('ahizan_client_location');
        if (raw) storedLocation = JSON.parse(raw);
      } catch (e) {
        /* ignore */
      }
    }

    if (isGuest && order.shippingAddress?.streetLine1) {
      return {
        fullName: order.shippingAddress.fullName || customerFullName,
        streetLine1: order.shippingAddress.streetLine1 || '',
        streetLine2: order.shippingAddress.streetLine2 || '',
        city: order.shippingAddress.city || '',
        province: order.shippingAddress.province || '',
        postalCode: order.shippingAddress.postalCode || '',
        countryCode: countries.find(c => c.name.toLowerCase() === order.shippingAddress?.country?.toLowerCase())?.code || countries.find(c => c.code.toLowerCase() === 'bj')?.code || countries[0]?.code || 'bj',
        phoneNumber: order.shippingAddress.phoneNumber || order.customer?.phoneNumber || '',
        company: order.shippingAddress.company || '',
      };
    }

    // Default to stored location from header if available
    const initialStreet = storedLocation?.name || '';
    const initialCity = storedLocation?.name || '';

    return {
      fullName: customerFullName,
      streetLine1: initialStreet,
      city: initialCity,
      countryCode: countries.find(c => c.code.toLowerCase() === 'bj')?.code || countries[0]?.code || 'bj',
      phoneNumber: order.customer?.phoneNumber || '',
    };
  };

  const { register, handleSubmit, formState: { errors }, reset, control, setValue, watch } = useForm<AddressFormData>({
    defaultValues: getDefaultFormValues()
  });

  const cityValue = watch('city');

  useEffect(() => {
    const cityToProvince: Record<string, string> = {
      'Cotonou': 'Littoral',
      'Parakou': 'Borgou',
      'Porto-Novo': 'Ouémé',
      'Abomey-Calavi': 'Atlantique',
      'Ouidah': 'Atlantique',
      'Bohicon': 'Zou',
      'Abomey': 'Zou',
      'Djougou': 'Donga',
      'Natitingou': 'Atacora',
      'Kandi': 'Alibori',
      'Lokossa': 'Mono',
      'Savalou': 'Collines',
      'Malanville': 'Alibori',
      'Dassa-Zoumè': 'Collines',
      'Pobè': 'Plateau',
      'Allada': 'Atlantique',
      'Comè': 'Mono',
      'Sakété': 'Plateau',
      'Tchaourou': 'Borgou',
      'Bembèrèkè': 'Borgou',
      'Nikki': 'Borgou',
      'Aplahoué': 'Couffo',
      'Tanguiéta': 'Atacora'
    };

    if (cityValue && typeof cityValue === 'string') {
      const matchedCity = Object.keys(cityToProvince).find(c => c.toLowerCase() === cityValue.trim().toLowerCase());
      if (matchedCity) {
        setValue('province', cityToProvince[matchedCity]);
      }
    }
  }, [cityValue, setValue]);

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const searchNominatim = useCallback(async (q: string) => {
    if (q.length < 3) {
      setSuggestions([]);
      return;
    }
    setNominatimLoading(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&addressdetails=1&limit=6&countrycodes=bj`,
        { headers: { 'Accept-Language': 'fr' } }
      );
      const data: NominatimSuggestion[] = await res.json();
      setSuggestions(data);
      setShowSuggestions(true);
    } catch (e) {
      console.error('Nominatim search error:', e);
    } finally {
      setNominatimLoading(false);
    }
  }, []);

  const handleNominatimInput = (val: string) => {
    setNominatimQuery(val);
    setValue('streetLine1', val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => searchNominatim(val), 400);
  };

  const handleSelectSuggestion = (s: NominatimSuggestion) => {
    const addr = s.address;
    const street = [addr.house_number, addr.road].filter(Boolean).join(' ') || s.display_name.split(',')[0];
    const city = addr.city || addr.town || addr.village || addr.suburb || '';
    const province = addr.state || '';
    const postalCode = addr.postcode || '';
    const countryCode = (addr.country_code || 'bj').toLowerCase();

    setValue('streetLine1', street);
    setValue('city', city);
    setValue('province', province);
    setValue('postalCode', postalCode);
    const matchedCountry = countries.find(c => c.code.toLowerCase() === countryCode);
    if (matchedCountry) setValue('countryCode', matchedCountry.code);

    setNominatimQuery(s.display_name);
    const lat = parseFloat(s.lat);
    const lon = parseFloat(s.lon);
    setCoords({ latitude: lat, longitude: lon });
    selectLocation({
      id: 'gps_raw',
      name: street || s.display_name.split(',')[0],
      latitude: lat,
      longitude: lon,
      type: 'GPS'
    });
    setSuggestions([]);
    setShowSuggestions(false);
  };

  const handleUseGps = () => {
    if (!navigator.geolocation) {
      alert("La géolocalisation n'est pas supportée par votre navigateur.");
      return;
    }
    setGpsLoading(true);

    let isResolved = false;
    const fallbackTimer = setTimeout(() => {
      if (!isResolved) {
        isResolved = true;
        setGpsLoading(false);
        alert("Le délai d'attente de la géolocalisation a expiré. Veuillez vérifier que la localisation est autorisée sur votre appareil ou saisir directement votre ville ci-dessous.");
      }
    }, 7000);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        if (isResolved) return;
        isResolved = true;
        clearTimeout(fallbackTimer);
        const { latitude, longitude } = position.coords;
        setCoords({ latitude, longitude });
        setValue('streetLine1', 'Détection de votre adresse...');
        setNominatimQuery('Détection de votre adresse...');
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&addressdetails=1`,
            { headers: { 'Accept-Language': 'fr' } }
          );
          if (res.ok) {
            const data = await res.json();
            const addr = data.address || {};
            const street = [addr.house_number, addr.road].filter(Boolean).join(' ')
              || addr.suburb
              || addr.neighbourhood
              || addr.quarter
              || addr.city_district
              || addr.village
              || addr.town
              || addr.city;
            const city = addr.city || addr.town || addr.village || addr.suburb || addr.county || 'Cotonou';
            const province = addr.state || '';
            const postalCode = addr.postcode || '';
            const countryCode = (addr.country_code || 'bj').toUpperCase();

            const finalName = street || city;
            if (finalName) setValue('streetLine1', finalName);
            if (city) setValue('city', city);
            if (province) setValue('province', province);
            if (postalCode) setValue('postalCode', postalCode);
            const matchedCountry = countries.find(c => c.code === countryCode);
            if (matchedCountry) setValue('countryCode', matchedCountry.code);
            if (data.display_name) setNominatimQuery(data.display_name);

            selectLocation({
              id: 'gps_raw',
              name: finalName,
              latitude,
              longitude,
              type: 'GPS'
            });
          }
        } catch (e) {
          console.error('Reverse geocode error:', e);
          setValue('streetLine1', 'Cotonou');
          setNominatimQuery('Cotonou');
        } finally {
          setGpsLoading(false);
        }
      },
      (error) => {
        if (isResolved) return;
        isResolved = true;
        clearTimeout(fallbackTimer);
        console.error('GPS error:', error);
        alert("Impossible d'accéder à votre position GPS. Vérifiez les autorisations du navigateur ou saisissez manuellement votre ville.");
        setGpsLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const resolveCityCoordinates = (cityInput: string): { latitude: number; longitude: number } => {
    const city = (cityInput || '').toLowerCase().trim();
    if (city.includes('parakou')) return { latitude: 9.3371, longitude: 2.6303 };
    if (city.includes('porto') || city.includes('novo')) return { latitude: 6.4969, longitude: 2.6289 };
    if (city.includes('calavi') || city.includes('akassato') || city.includes('godomey')) return { latitude: 6.4485, longitude: 2.3556 };
    if (city.includes('ouidah') || city.includes('pahou')) return { latitude: 6.3631, longitude: 2.0851 };
    if (city.includes('bohicon')) return { latitude: 7.1783, longitude: 2.0667 };
    if (city.includes('abomey') && !city.includes('calavi')) return { latitude: 7.1829, longitude: 1.9912 };
    if (city.includes('djougou')) return { latitude: 9.7085, longitude: 1.6659 };
    if (city.includes('natitingou')) return { latitude: 10.3167, longitude: 1.3833 };
    if (city.includes('kandi')) return { latitude: 11.1342, longitude: 2.9386 };
    if (city.includes('lokossa')) return { latitude: 6.6386, longitude: 1.7867 };
    if (city.includes('savalou')) return { latitude: 7.9281, longitude: 1.9756 };
    if (city.includes('malanville')) return { latitude: 11.8667, longitude: 3.3833 };
    if (city.includes('dassa')) return { latitude: 7.7500, longitude: 2.1833 };
    if (city.includes('pobè') || city.includes('pobe')) return { latitude: 6.9800, longitude: 2.6667 };
    if (city.includes('allada')) return { latitude: 6.6667, longitude: 2.1500 };
    if (city.includes('comè') || city.includes('come')) return { latitude: 6.4069, longitude: 1.8819 };
    if (city.includes('sakété') || city.includes('sakete')) return { latitude: 6.7362, longitude: 2.6587 };
    if (city.includes('tchaourou')) return { latitude: 8.8865, longitude: 2.5975 };
    if (city.includes('bembèrèkè') || city.includes('bembereke')) return { latitude: 10.2283, longitude: 2.6633 };
    if (city.includes('nikki')) return { latitude: 9.9401, longitude: 3.2108 };
    if (city.includes('aplahoué') || city.includes('aplahoue')) return { latitude: 6.9333, longitude: 1.6833 };
    if (city.includes('tanguiéta') || city.includes('tanguieta')) return { latitude: 10.6167, longitude: 1.2667 };
    if (city.includes('cotonou') || city.includes('fidjrosse') || city.includes('cadjehoun') || city.includes('akpakpa')) return { latitude: 6.3654, longitude: 2.4183 };
    return { latitude: 6.3654, longitude: 2.4183 }; // Default Cotonou
  };

  const getResolvedCoordsForSubmission = (cityInput: string, currentCoords: { latitude: number; longitude: number } | null) => {
    const cityResolved = resolveCityCoordinates(cityInput || '');
    if (!currentCoords) return cityResolved;
    const cityStr = (cityInput || '').toLowerCase().trim();
    if (cityStr && !cityStr.includes('cotonou') && !cityStr.includes('fidjrosse') && !cityStr.includes('cadjehoun') && !cityStr.includes('akpakpa')) {
      return cityResolved;
    }
    return currentCoords;
  };

  const handleSelectExistingAddress = async () => {
    if (!selectedAddressId) return;
    setLoading(true);
    try {
      const selectedAddress = addresses.find(a => a.id === selectedAddressId);
      if (!selectedAddress) return;
      const existingCoords = (selectedAddress as any).customFields;
      let resolvedCoords = existingCoords?.latitude ? {
        latitude: Number(existingCoords.latitude),
        longitude: Number(existingCoords.longitude),
      } : resolveCityCoordinates(selectedAddress.city || '');

      const cityStr = (selectedAddress.city || '').toLowerCase().trim();
      if (cityStr && !cityStr.includes('cotonou')) {
        const cityResolved = resolveCityCoordinates(selectedAddress.city || '');
        if (!existingCoords?.latitude || (Math.abs(Number(existingCoords.latitude) - 6.3654) < 0.05 && Math.abs(cityResolved.latitude - 6.3654) > 0.1)) {
          resolvedCoords = cityResolved;
        }
      }

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
        customFields: resolvedCoords,
      }, useSameForBilling);
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
      const resolvedCoords = getResolvedCoordsForSubmission(data.city || '', coords);
      const newAddress = await createCustomerAddress({
        ...data,
        customFields: resolvedCoords,
      });
      setDialogOpen(false);
      reset();
      setCoords(null);
      setNominatimQuery('');
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
      const resolvedCoords = getResolvedCoordsForSubmission(data.city || '', coords);
      await setShippingAddress({
        ...data,
        customFields: resolvedCoords,
      }, useSameForBilling);
      onComplete();
    } catch (error) {
      console.error('Error setting address:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenNew = () => {
    setEditingAddress(null);
    reset(getDefaultFormValues());
    setCoords(null);
    setNominatimQuery('');
    setDialogOpen(true);
  };

  const handleOpenEdit = (address: any, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setEditingAddress(address);
    setValue('fullName', address.fullName || '');
    setValue('company', address.company || '');
    setValue('phoneNumber', address.phoneNumber || '');
    setValue('streetLine1', address.streetLine1 || '');
    setValue('streetLine2', address.streetLine2 || '');
    setValue('city', address.city || '');
    setValue('province', address.province || '');
    setValue('postalCode', address.postalCode || '');
    setValue('countryCode', address.country?.code || 'bj');
    setCoords(address.customFields?.latitude ? {
      latitude: Number(address.customFields.latitude),
      longitude: Number(address.customFields.longitude)
    } : null);
    setEditDialogOpen(true);
  };

  const onUpdateAddress = async (data: AddressFormData) => {
    if (!editingAddress) return;
    setSaving(true);
    try {
      const resolvedCoords = getResolvedCoordsForSubmission(data.city || '', coords);
      await updateCustomerAddress({
        id: editingAddress.id,
        ...data,
        customFields: resolvedCoords,
      });
      setEditDialogOpen(false);
      setEditingAddress(null);
      reset(getDefaultFormValues());
      setCoords(null);
      setNominatimQuery('');
      router.refresh();
    } catch (error) {
      console.error('Error updating address:', error);
      alert(`Erreur lors de la mise à jour : ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAddress = async (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm("Êtes-vous sûr de vouloir supprimer cette adresse ?")) return;
    setLoading(true);
    try {
      await deleteCustomerAddress(id);
      if (selectedAddressId === id) {
        setSelectedAddressId(null);
      }
      router.refresh();
    } catch (error) {
      console.error('Error deleting address:', error);
      alert(`Erreur lors de la suppression de l'adresse.`);
    } finally {
      setLoading(false);
    }
  };

  // Reusable Nominatim + GPS search block (used in all forms)
  const renderAddressSearchBlock = () => (
    <div className="col-span-2 space-y-2">
      <button
        type="button"
        onClick={handleUseGps}
        disabled={gpsLoading}
        className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary font-bold text-sm border border-primary/20 transition-all disabled:opacity-60"
      >
        {gpsLoading ? (
          <><Loader2 className="w-4 h-4 animate-spin" /><span>Localisation en cours...</span></>
        ) : (
          <><Navigation className="w-4 h-4" /><span>Utiliser ma position actuelle</span></>
        )}
      </button>

      <FieldLabel className="font-black text-xs uppercase tracking-widest text-muted-foreground pt-1 block">
        Adresse *
      </FieldLabel>
      <div ref={wrapperRef} className="relative">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            placeholder="Rechercher une adresse (rue, quartier...)"
            value={nominatimQuery}
            onChange={(e) => handleNominatimInput(e.target.value)}
            onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
            className="w-full pl-9 pr-10 py-2.5 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
          />
          {nominatimLoading && (
            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />
          )}
        </div>
        {showSuggestions && suggestions.length > 0 && (
          <ul className="absolute top-full left-0 right-0 z-50 mt-1 bg-popover border border-border rounded-xl shadow-xl max-h-52 overflow-y-auto">
            {suggestions.map((s) => (
              <li key={s.place_id}>
                <button
                  type="button"
                  onClick={() => handleSelectSuggestion(s)}
                  className="w-full text-left px-3 py-2.5 text-sm hover:bg-muted transition-colors flex items-start gap-2"
                >
                  <MapPin className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                  <span className="line-clamp-2">{s.display_name}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <input type="hidden" {...register('streetLine1', { required: "L'adresse est requise" })} />
      {errors.streetLine1 && (
        <p className="text-xs font-bold text-destructive">{errors.streetLine1.message}</p>
      )}

      {coords && (
        <div className="flex items-center gap-1.5 text-xs text-emerald-600 font-bold">
          <MapPin className="w-3 h-3" />
          <span>Coordonnées : {coords.latitude.toFixed(5)}, {coords.longitude.toFixed(5)}</span>
        </div>
      )}
    </div>
  );

  if (isGuest) {
    return (
      <div className="space-y-8 py-4">
        <form onSubmit={handleSubmit(onSubmitGuestAddress)}>
          <FieldGroup className="space-y-6">
            <div className="grid grid-cols-2 gap-6">
              <Field className="col-span-2">
                <FieldLabel htmlFor="fullName" className="font-black text-xs uppercase tracking-widest text-muted-foreground">Nom Complet *</FieldLabel>
                <Input id="fullName" placeholder="Jean Dupont" className="h-10 rounded-lg focus-visible:ring-primary" {...register('fullName', { required: 'Le nom complet est requis' })} />
                <FieldError className="font-bold text-xs text-destructive">{errors.fullName?.message}</FieldError>
              </Field>

              <Field className="col-span-2 sm:col-span-1">
                <FieldLabel htmlFor="company" className="font-black text-xs uppercase tracking-widest text-muted-foreground">Entreprise (Optionnel)</FieldLabel>
                <Input id="company" placeholder="Nom de l'entreprise" className="h-10 rounded-lg" {...register('company')} />
              </Field>

              <Field className="col-span-2 sm:col-span-1">
                <FieldLabel htmlFor="phoneNumber" className="font-black text-xs uppercase tracking-widest text-muted-foreground">Numéro de téléphone *</FieldLabel>
                <Input id="phoneNumber" type="tel" placeholder="+229 00 00 00 00" className="h-10 rounded-lg focus-visible:ring-primary" {...register('phoneNumber', { required: 'Le numéro de téléphone est requis' })} />
                <FieldError className="font-bold text-xs text-destructive">{errors.phoneNumber?.message}</FieldError>
              </Field>

              {renderAddressSearchBlock()}

              <Field className="col-span-2">
                <FieldLabel htmlFor="streetLine2" className="font-black text-xs uppercase tracking-widest text-muted-foreground">Précisions (Optionnel)</FieldLabel>
                <Input id="streetLine2" placeholder="Ex: Appt 4B, face à la pharmacie..." className="h-10 rounded-lg" {...register('streetLine2')} />
              </Field>

              <Field className="col-span-2 sm:col-span-1">
                <FieldLabel htmlFor="city" className="font-black text-xs uppercase tracking-widest text-muted-foreground">Ville *</FieldLabel>
                <Input id="city" list="benin-cities" placeholder="Ex: Cotonou, Parakou, Porto-Novo..." className="h-10 rounded-lg focus-visible:ring-primary" {...register('city', { required: 'La ville est requise' })} />
                <datalist id="benin-cities">
                  <option value="Cotonou" />
                  <option value="Parakou" />
                  <option value="Porto-Novo" />
                  <option value="Abomey-Calavi" />
                  <option value="Ouidah" />
                  <option value="Bohicon" />
                  <option value="Abomey" />
                  <option value="Djougou" />
                  <option value="Natitingou" />
                  <option value="Kandi" />
                  <option value="Lokossa" />
                  <option value="Savalou" />
                  <option value="Malanville" />
                  <option value="Dassa-Zoumè" />
                  <option value="Pobè" />
                  <option value="Allada" />
                  <option value="Comè" />
                  <option value="Sakété" />
                  <option value="Tchaourou" />
                  <option value="Bembèrèkè" />
                  <option value="Nikki" />
                  <option value="Aplahoué" />
                  <option value="Tanguiéta" />
                </datalist>
                <FieldError className="font-bold text-xs text-destructive">{errors.city?.message}</FieldError>
              </Field>

              <Field className="col-span-2 sm:col-span-1">
                <FieldLabel htmlFor="province" className="font-black text-xs uppercase tracking-widest text-muted-foreground">Département / Province</FieldLabel>
                <Input id="province" placeholder="Littoral" className="h-10 rounded-lg" {...register('province')} />
              </Field>

              <Field className="col-span-2 sm:col-span-1">
                <FieldLabel htmlFor="postalCode" className="font-black text-xs uppercase tracking-widest text-muted-foreground">Code Postal</FieldLabel>
                <Input id="postalCode" placeholder="00000" className="h-10 rounded-lg" {...register('postalCode')} />
              </Field>

              <Field className="col-span-2 sm:col-span-1">
                <FieldLabel htmlFor="countryCode" className="font-black text-xs uppercase tracking-widest text-muted-foreground">Pays *</FieldLabel>
                <Controller name="countryCode" control={control} rules={{ required: 'Le pays est requis' }} render={({ field }) => (
                  <CountrySelect countries={countries} value={field.value} onValueChange={field.onChange} disabled={loading} />
                )} />
                <FieldError className="font-bold text-xs text-destructive">{errors.countryCode?.message}</FieldError>
              </Field>
            </div>

            <div className="flex items-center space-x-3 mt-4 bg-muted/30 p-4 rounded-xl border border-dashed">
              <Checkbox id="same-billing-guest" checked={useSameForBilling} onCheckedChange={(checked) => setUseSameForBilling(checked === true)} className="w-5 h-5 rounded-md" />
              <label htmlFor="same-billing-guest" className="text-sm font-bold leading-none cursor-pointer">Utiliser la même adresse pour la facturation</label>
            </div>

            <Button type="submit" disabled={loading} className="w-full h-11 rounded-lg font-semibold shadow-xl shadow-primary/10 transition-all active:scale-[0.98] mt-4">
              {loading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : 'Continuer vers le mode de livraison'}
            </Button>
          </FieldGroup>
        </form>
      </div>
    );
  }

  // Shared dialog form content
  const renderAddressDialogForm = (
    onSubmitHandler: (data: AddressFormData) => Promise<void>,
    isSaving: boolean,
    onCancel?: () => void,
    submitLabel?: string
  ) => (
    <form onSubmit={handleSubmit(onSubmitHandler)}>
      <FieldGroup className="space-y-6">
        <div className="grid grid-cols-2 gap-6">
          <Field className="col-span-2">
            <FieldLabel htmlFor="fullName" className="font-black text-xs uppercase tracking-widest text-muted-foreground">Nom Complet</FieldLabel>
            <Input id="fullName" placeholder="Jean Dupont" className="h-10 rounded-lg" {...register('fullName')} />
            <FieldError className="font-bold text-xs text-destructive">{errors.fullName?.message}</FieldError>
          </Field>

          <Field className="col-span-2 sm:col-span-1">
            <FieldLabel htmlFor="company" className="font-black text-xs uppercase tracking-widest text-muted-foreground">Entreprise</FieldLabel>
            <Input id="company" className="h-10 rounded-lg" {...register('company')} />
          </Field>

          <Field className="col-span-2 sm:col-span-1">
            <FieldLabel htmlFor="phoneNumber" className="font-black text-xs uppercase tracking-widest text-muted-foreground">Numéro de téléphone</FieldLabel>
            <Input id="phoneNumber" type="tel" className="h-10 rounded-lg" {...register('phoneNumber')} />
            <FieldError className="font-bold text-xs text-destructive">{errors.phoneNumber?.message}</FieldError>
          </Field>

          {renderAddressSearchBlock()}

          <Field className="col-span-2">
            <FieldLabel htmlFor="streetLine2" className="font-black text-xs uppercase tracking-widest text-muted-foreground">Précisions (Optionnel)</FieldLabel>
            <Input id="streetLine2" className="h-10 rounded-lg" {...register('streetLine2')} />
          </Field>

          <Field className="col-span-2 sm:col-span-1">
            <FieldLabel htmlFor="city" className="font-black text-xs uppercase tracking-widest text-muted-foreground">Ville</FieldLabel>
            <Input id="city" list="benin-cities" placeholder="Ex: Parakou, Cotonou..." className="h-10 rounded-lg" {...register('city')} />
            <FieldError className="font-bold text-xs text-destructive">{errors.city?.message}</FieldError>
          </Field>

          <Field className="col-span-2 sm:col-span-1">
            <FieldLabel htmlFor="province" className="font-black text-xs uppercase tracking-widest text-muted-foreground">Province / Département</FieldLabel>
            <Input id="province" className="h-10 rounded-lg" {...register('province')} />
          </Field>

          <Field className="col-span-2 sm:col-span-1">
            <FieldLabel htmlFor="postalCode" className="font-black text-xs uppercase tracking-widest text-muted-foreground">Code Postal</FieldLabel>
            <Input id="postalCode" className="h-10 rounded-lg" {...register('postalCode')} />
          </Field>

          <Field className="col-span-2 sm:col-span-1">
            <FieldLabel htmlFor="countryCode" className="font-black text-xs uppercase tracking-widest text-muted-foreground">Pays *</FieldLabel>
            <Controller name="countryCode" control={control} rules={{ required: 'Le pays est requis' }} render={({ field }) => (
              <CountrySelect countries={countries} value={field.value} onValueChange={field.onChange} disabled={isSaving} />
            )} />
            <FieldError className="font-bold text-xs text-destructive">{errors.countryCode?.message}</FieldError>
          </Field>
        </div>
      </FieldGroup>

      <DialogFooter className="mt-10 gap-3">
        <Button type="button" variant="ghost" onClick={onCancel || (() => setDialogOpen(false))} disabled={isSaving} className="h-12 rounded-xl font-bold">Annuler</Button>
        <Button type="submit" disabled={isSaving} className="h-12 px-8 rounded-xl font-black">
          {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : (submitLabel || "Enregistrer l'adresse")}
        </Button>
      </DialogFooter>
    </form>
  );

  return (
    <div className="space-y-8 py-4">
      {addresses.length > 0 && (
        <div className="space-y-6">
          <h3 className="font-black text-xs uppercase tracking-widest text-muted-foreground/60">Sélectionnez une adresse enregistrée</h3>
          <RadioGroup value={selectedAddressId || ''} onValueChange={setSelectedAddressId} className="grid gap-4">
            {addresses.map((address) => (
              <div key={address.id} className="relative group">
                <RadioGroupItem value={address.id} id={address.id} className="sr-only" />
                <div className="absolute top-5 right-5 flex items-center gap-2 z-10">
                  <button
                    type="button"
                    onClick={(e) => handleOpenEdit(address, e)}
                    disabled={loading || saving}
                    className="p-2 rounded-xl bg-muted/80 hover:bg-primary/20 hover:text-primary transition-colors text-muted-foreground shadow-sm"
                    title="Modifier l'adresse"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => handleDeleteAddress(address.id, e)}
                    disabled={loading || saving}
                    className="p-2 rounded-xl bg-muted/80 hover:bg-destructive/20 hover:text-destructive transition-colors text-muted-foreground shadow-sm"
                    title="Supprimer l'adresse"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <Label htmlFor={address.id} className="flex-1 cursor-pointer block">
                  <Card className={`p-6 rounded-2xl border-2 transition-all group-hover:shadow-md ${selectedAddressId === address.id ? 'border-primary bg-primary/5 shadow-sm' : 'border-muted bg-card hover:border-primary/40'}`}>
                    <div className="flex items-start justify-between pr-24">
                      <div className="leading-relaxed space-y-1">
                        <p className="font-black text-lg tracking-tight">{address.fullName}</p>
                        {address.company && <p className="text-sm font-bold text-primary uppercase tracking-wider">{address.company}</p>}
                        <p className="text-sm font-medium text-muted-foreground">
                          {address.streetLine1}{address.streetLine2 && `, ${address.streetLine2}`}
                        </p>
                        <p className="text-sm font-medium text-muted-foreground">{address.city}, {address.province} {address.postalCode}</p>
                        <p className="text-sm font-bold text-foreground/80">{address.country.name}</p>
                        <p className="text-sm font-bold text-foreground mt-2 flex items-center gap-2">
                          <span className="text-[10px] bg-muted px-2 py-0.5 rounded uppercase tracking-tighter">Tel</span>
                          {address.phoneNumber}
                        </p>
                        {(address as any).customFields?.latitude && (
                          <p className="text-xs text-emerald-600 font-bold flex items-center gap-1 mt-1">
                            <MapPin className="w-3 h-3" />
                            GPS: {Number((address as any).customFields.latitude).toFixed(4)}, {Number((address as any).customFields.longitude).toFixed(4)}
                          </p>
                        )}
                      </div>
                      {selectedAddressId === address.id && (
                        <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center text-white mt-1 shrink-0">
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
            <Checkbox id="same-billing" checked={useSameForBilling} onCheckedChange={(checked) => setUseSameForBilling(checked === true)} className="w-5 h-5 rounded-md" />
            <label htmlFor="same-billing" className="text-sm font-bold cursor-pointer">Utiliser la même adresse pour la facturation</label>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 pt-4">
            <Button onClick={handleSelectExistingAddress} disabled={!selectedAddressId || loading} className="flex-1 h-11 rounded-lg font-semibold shadow-xl shadow-primary/10">
              {loading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : "Continuer avec l'adresse sélectionnée"}
            </Button>

            <Button type="button" variant="outline" onClick={handleOpenNew} className="h-14 px-8 rounded-2xl font-bold border-2 flex items-center gap-2">
              <Plus className="w-5 h-5" /> Nouvelle adresse
            </Button>
          </div>
        </div>
      )}

      {addresses.length === 0 && (
        <div className="flex flex-col items-center justify-center p-12 bg-card border-2 border-dashed rounded-3xl text-center space-y-6">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center text-primary">
            <MapPin className="w-8 h-8" />
          </div>
          <div className="space-y-2 max-w-md">
            <h3 className="text-xl font-black">Aucune adresse enregistrée</h3>
            <p className="text-sm text-muted-foreground font-medium">
              Vous n'avez pas encore d'adresse de livraison ou vous avez tout supprimé. Cliquez ci-dessous pour ajouter une adresse.
            </p>
          </div>
          <Button type="button" onClick={handleOpenNew} className="h-14 px-8 rounded-2xl font-bold text-base shadow-xl shadow-primary/20 flex items-center gap-2">
            <Plus className="w-5 h-5" /> Ajouter une adresse de livraison
          </Button>
        </div>
      )}

      {/* Dialog for adding new address */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl p-8">
          <DialogHeader className="mb-8">
            <DialogTitle className="text-2xl font-black tracking-tight">Ajouter une nouvelle adresse</DialogTitle>
            <DialogDescription className="text-base font-medium">Remplissez le formulaire ci-dessous pour ajouter une adresse de livraison.</DialogDescription>
          </DialogHeader>
          {renderAddressDialogForm(onSaveNewAddress, saving, () => setDialogOpen(false), "Enregistrer l'adresse")}
        </DialogContent>
      </Dialog>

      {/* Dialog for editing existing address */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl p-8">
          <DialogHeader className="mb-8">
            <DialogTitle className="text-2xl font-black tracking-tight">Modifier l'adresse</DialogTitle>
            <DialogDescription className="text-base font-medium">Modifiez les informations de votre adresse de livraison ci-dessous.</DialogDescription>
          </DialogHeader>
          {renderAddressDialogForm(onUpdateAddress, saving, () => setEditDialogOpen(false), "Mettre à jour l'adresse")}
        </DialogContent>
      </Dialog>
    </div>
  );
}
