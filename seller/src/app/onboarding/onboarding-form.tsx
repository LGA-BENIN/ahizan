'use client';

import { useState, useEffect, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { query } from '@/lib/vendure/api';
import { applyToBecomeVendorAction } from './actions';

const GetRegistrationFieldsQuery = `
    query GetRegistrationFields {
        registrationFields {
            id
            name
            label
            type
            options {
                label
                value
            }
            required
            order
            enabled
            description
            placeholder
            config {
                showDetectPositionButton
            }
        }
    }
`;

const DEFAULT_REGISTRATION_FIELDS = [
    { name: 'name', label: 'Nom de la Boutique', type: 'string', required: true, order: 1, enabled: true, placeholder: 'Ex: Ahizan Fashion Store' },
    { name: 'type', label: 'Type de Vendeur', type: 'select', required: true, order: 2, enabled: true, description: 'Sélectionnez la catégorie qui correspond à votre activité' },
    { name: 'phoneNumber', label: 'Numéro WhatsApp / Téléphone Pro', type: 'string', required: true, order: 3, enabled: true, placeholder: '+229 01 02 03 04' },
    { name: 'address', label: 'Ville et Adresse', type: 'string', required: true, order: 4, enabled: true, placeholder: 'Ex: Cotonou, Littoral' },
    { name: 'description', label: 'Présentation de vos produits', type: 'string', required: false, order: 5, enabled: true, placeholder: 'Décrivez brièvement les articles que vous vendez...' },
];

export function OnboardingForm({ customer, isRecognized }: { customer?: any; isRecognized?: boolean }) {
    const [dynamicFields, setDynamicFields] = useState<any[]>([]);
    const [neighborhoods, setNeighborhoods] = useState<any[]>([]);
    const [sellerType, setSellerType] = useState<string>('ONLINE');
    const [isPending, startTransition] = useTransition();
    const [error, setError] = useState<string | null>(null);
    const [detectingGps, setDetectingGps] = useState(false);
    const [gpsError, setGpsError] = useState<string | null>(null);

    const handleDetectLocation = () => {
        if (!navigator.geolocation) {
            alert("La géolocalisation n'est pas supportée par votre navigateur.");
            return;
        }

        setDetectingGps(true);
        setGpsError(null);

        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const { latitude, longitude } = position.coords;
                try {
                    // 1. Fetch details from Nominatim for full address details
                    const osmRes = await fetch(
                        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`,
                        { headers: { 'Accept-Language': 'fr' } }
                    );
                    const osmData = await osmRes.json();
                    const addressComponents = osmData.address || {};
                    const neighborhoodName = addressComponents.suburb || addressComponents.neighbourhood || addressComponents.city_district || '';
                    const fullAddress = osmData.display_name || '';

                    // 2. Fetch the zone ID from Vendure reverseGeocode
                    const res = await query(`
                        query ReverseGeocode($lat: Float!, $lng: Float!) {
                            reverseGeocode(latitude: $lat, longitude: $lng) {
                                id
                                name
                                type
                            }
                        }
                    `, { lat: latitude, lng: longitude });

                    const matchedZones = (res.data as any)?.reverseGeocode || [];
                    let zoneId = '';
                    
                    // Search backwards from most specific zone (NEIGHBORHOOD -> ARRONDISSEMENT -> COMMUNE)
                    for (let i = matchedZones.length - 1; i >= 0; i--) {
                        const z = matchedZones[i];
                        const exists = neighborhoods.some((n: any) => String(n.id) === String(z.id));
                        if (exists) {
                            zoneId = String(z.id);
                            break;
                        }
                    }

                    if (!zoneId && matchedZones.length > 0) {
                        zoneId = String(matchedZones[matchedZones.length - 1].id);
                    }

                    if (!zoneId && neighborhoodName) {
                        const matched = neighborhoods.find((n: any) => 
                            n.name.toLowerCase().includes(neighborhoodName.toLowerCase()) ||
                            neighborhoodName.toLowerCase().includes(n.name.toLowerCase())
                        );
                        if (matched) {
                            zoneId = String(matched.id);
                        }
                    }

                    // 3. Fill the locationId select dropdown
                    if (zoneId) {
                        const selectEl = document.getElementsByName('locationId')[0] as HTMLSelectElement;
                        if (selectEl) {
                            selectEl.value = zoneId;
                            const event = new Event('change', { bubbles: true });
                            selectEl.dispatchEvent(event);
                        }
                    } else if (neighborhoodName) {
                        setGpsError(`Quartier détecté (${neighborhoodName}) non disponible dans la liste.`);
                    } else {
                        setGpsError("Impossible de localiser votre quartier.");
                    }

                    // 4. Fill the address input field
                    if (fullAddress) {
                        const addressEl = document.getElementsByName('address')[0] as HTMLInputElement;
                        if (addressEl) {
                            addressEl.value = fullAddress;
                            const event = new Event('change', { bubbles: true });
                            addressEl.dispatchEvent(event);
                        }
                    }

                    // 5. Fill the zone input field
                    if (neighborhoodName) {
                        const zoneEl = document.getElementsByName('zone')[0] as HTMLInputElement;
                        if (zoneEl) {
                            zoneEl.value = neighborhoodName;
                            const event = new Event('change', { bubbles: true });
                            zoneEl.dispatchEvent(event);
                        }
                    }

                } catch (err: any) {
                    console.error('Error during location detection:', err);
                    setGpsError("Erreur lors de la détermination de la zone.");
                } finally {
                    setDetectingGps(false);
                }
            },
            (error) => {
                console.error('GPS error:', error);
                setGpsError("Accès GPS refusé ou indisponible.");
                setDetectingGps(false);
            },
            { enableHighAccuracy: true, timeout: 8000 }
        );
    };

    const FALLBACK_ZONES = [
        { id: "18", name: "Cotonou", type: "COMMUNE" },
        { id: "3", name: "Abomey-Calavi", type: "COMMUNE" },
        { id: "2", name: "Porto-Novo", type: "COMMUNE" },
        { id: "85", name: "Akpakpa Dodomè", type: "NEIGHBORHOOD" },
        { id: "86", name: "Agla", type: "NEIGHBORHOOD" },
        { id: "87", name: "Fidjrossè", type: "NEIGHBORHOOD" },
        { id: "88", name: "Cadjèhoun", type: "NEIGHBORHOOD" },
        { id: "89", name: "Gbégamey", type: "NEIGHBORHOOD" },
        { id: "96", name: "Ouando", type: "NEIGHBORHOOD" },
        { id: "97", name: "Ahouangbo", type: "NEIGHBORHOOD" },
        { id: "98", name: "Tokpota", type: "NEIGHBORHOOD" },
        { id: "101", name: "Zogbadjè", type: "NEIGHBORHOOD" },
        { id: "102", name: "Godomey", type: "NEIGHBORHOOD" },
    ];

    // Charger les champs d'inscription configurés (ou fallback)
    useEffect(() => {
        const fetchFields = async () => {
            try {
                const result = await query(GetRegistrationFieldsQuery, undefined);
                const fields = (result.data as any)?.registrationFields || [];
                setDynamicFields(fields.length > 0 ? fields : DEFAULT_REGISTRATION_FIELDS);
            } catch (err) {
                console.error('Failed to load dynamic fields, using fallback:', err);
                setDynamicFields(DEFAULT_REGISTRATION_FIELDS);
            }
        };
        const fetchNeighborhoods = async () => {
            try {
                const res = await query(`
                    query GetNeighborhoods {
                        geoZones {
                            id
                            name
                            type
                            parent {
                                id
                                name
                            }
                        }
                    }
                `);
                const zones = (res.data as any)?.geoZones || [];
                setNeighborhoods(zones.length > 0 ? zones : FALLBACK_ZONES);
            } catch (err) {
                console.error('Failed to load neighborhoods in onboarding:', err);
                setNeighborhoods(FALLBACK_ZONES);
            }
        };
        fetchFields();
        fetchNeighborhoods();
    }, []);

    // Filtrer et trier les champs actifs
    const activeFields = dynamicFields
        .filter(f => f && f.enabled)
        .sort((a, b) => ((a && a.order) || 0) - ((b && b.order) || 0));

    // Déterminer si un champ est lié à l'entreprise (à afficher uniquement si type === ENTERPRISE)
    const isEnterpriseField = (name: string) => {
        return [
            'rccmNumber', 'rccmFile', 'ifuNumber', 'ifuFile', 
            'idCardNumber', 'idCardFile', 'raisonSociale', 'siegeAddress'
        ].includes(name);
    };

    // Synchroniser l'état du type de vendeur
    const handleTypeChange = (value: string) => {
        setSellerType(value);
    };

    const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setError(null);

        const formElement = event.currentTarget;
        const formData = new FormData(formElement);

        // Validation additionnelle des fichiers requis pour Entreprise
        if (sellerType === 'ENTERPRISE') {
            const hasRccmFile = activeFields.some(f => f.name === 'rccmFile');
            const hasIfuFile = activeFields.some(f => f.name === 'ifuFile');
            const hasIdCardFile = activeFields.some(f => f.name === 'idCardFile');

            if (hasRccmFile) {
                const rccm = formData.get('rccmFile') as File;
                if (!rccm || rccm.size === 0) {
                    setError('Le fichier RCCM est requis pour une Entreprise.');
                    return;
                }
            }
            if (hasIfuFile) {
                const ifu = formData.get('ifuFile') as File;
                if (!ifu || ifu.size === 0) {
                    setError('Le fichier IFU est requis pour une Entreprise.');
                    return;
                }
            }
            if (hasIdCardFile) {
                const idCard = formData.get('idCardFile') as File;
                if (!idCard || idCard.size === 0) {
                    setError("La pièce d'identité (CIP/Autre) est requise pour une Entreprise.");
                    return;
                }
            }
        }

        startTransition(async () => {
            try {
                // Collecter les valeurs des champs dynamiques personnalisés (hors champs standards de Vendure)
                const standardFieldsList = [
                    'name', 'email', 'phoneNumber', 'address', 'description', 'zone', 
                    'type', 'rccmNumber', 'ifuNumber', 'idCardNumber', 'website', 
                    'facebook', 'instagram', 'rccmFile', 'ifuFile', 'idCardFile', 'logo', 'coverImage',
                    'locationId'
                ];

                const dynamicDetails: Record<string, any> = {};
                activeFields.forEach(field => {
                    const isStandard = standardFieldsList.includes(field.name);
                    
                    if (!isStandard) {
                        const inputElement = formElement.elements.namedItem(`custom_${field.name}`) as HTMLInputElement | HTMLSelectElement;
                        if (inputElement) {
                            if (field.type === 'boolean') {
                                dynamicDetails[field.name] = (inputElement as HTMLInputElement).checked;
                            } else {
                                dynamicDetails[field.name] = inputElement.value;
                            }
                        }
                    }
                });

                formData.append('dynamicDetails', JSON.stringify(dynamicDetails));

                // S'assurer que le type de vendeur est bien inclus
                if (!formData.has('type')) {
                    formData.append('type', sellerType);
                }

                const result = await applyToBecomeVendorAction(formData);

                if (result.error) {
                    setError(result.error);
                } else if (result.success && result.redirectUrl) {
                    window.location.href = result.redirectUrl;
                }
            } catch (err: any) {
                console.error(err);
                setError(err.message || 'Une erreur est survenue.');
            }
        });
    };

    if (activeFields.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center p-12 text-center">
                <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4" />
                <p className="text-muted-foreground font-medium">Chargement des paramètres du formulaire...</p>
            </div>
        );
    }

    return (
        <Card className="shadow-lg border border-border rounded-2xl">
            <CardContent className="pt-6">
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-4">
                        <h2 className="text-xl font-bold text-primary">Informations de la Boutique</h2>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {activeFields.map(field => {
                                // Sauter les champs d'entreprise si le type n'est pas ENTERPRISE
                                if (isEnterpriseField(field.name) && sellerType !== 'ENTERPRISE') {
                                    return null;
                                }

                                const isStandard = [
                                    'name', 'email', 'phoneNumber', 'address', 'description', 'zone', 
                                    'type', 'rccmNumber', 'ifuNumber', 'idCardNumber', 'website', 
                                    'facebook', 'instagram', 'rccmFile', 'ifuFile', 'idCardFile', 'logo', 'coverImage',
                                    'locationId'
                                ].includes(field.name);

                                const inputName = isStandard ? field.name : `custom_${field.name}`;

                                // Cas particulier : Location / Résidence de résidence (Sélecteur)
                                if (field.name === 'locationId') {
                                    const showGpsBtn = field.config?.showDetectPositionButton;
                                    return (
                                        <div key={field.name} className="space-y-2 col-span-1 md:col-span-2">
                                            <div className="flex items-center justify-between">
                                                <label className="text-sm font-semibold text-foreground">
                                                    {field.label} {field.required && <span className="text-red-500 font-bold">*</span>}
                                                </label>
                                                <button
                                                    type="button"
                                                    onClick={handleDetectLocation}
                                                    disabled={detectingGps || isPending}
                                                    className="text-xs font-semibold text-primary hover:text-primary/80 transition-colors flex items-center gap-1 focus:outline-none"
                                                >
                                                    {detectingGps ? (
                                                        <>
                                                            <span className="w-3 h-3 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                                                            Détection...
                                                        </>
                                                    ) : (
                                                        <>📍 Utiliser ma position actuelle</>
                                                    )}
                                                </button>
                                            </div>
                                            {(() => {
                                                const mainCities = neighborhoods.filter((n: any) => n.type === 'COMMUNE' || n.type === 'CITY' || ['cotonou', 'abomey-calavi', 'porto-novo'].includes(n.name?.toLowerCase()));
                                                const subZones = neighborhoods.filter((n: any) => !mainCities.some((c: any) => c.id === n.id));
                                                return (
                                                    <select
                                                        name={inputName}
                                                        required={field.required}
                                                        disabled={isPending}
                                                        className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm outline-none focus:ring-2 focus:ring-primary/20"
                                                    >
                                                        <option value="">Sélectionnez votre ville, quartier ou arrondissement...</option>
                                                        {mainCities.length > 0 && (
                                                            <optgroup label="🏙️ Villes / Communes principales">
                                                                {mainCities.map((n: any) => (
                                                                    <option key={n.id} value={n.id}>{n.name}</option>
                                                                ))}
                                                            </optgroup>
                                                        )}
                                                        {subZones.length > 0 && (
                                                            <optgroup label="🏘️ Quartiers et Arrondissements">
                                                                {subZones.map((n: any) => (
                                                                    <option key={n.id} value={n.id}>
                                                                        {n.parent?.name ? `${n.name} (${n.parent.name})` : n.name}
                                                                    </option>
                                                                ))}
                                                            </optgroup>
                                                        )}
                                                    </select>
                                                );
                                            })()}
                                            {gpsError && <p className="text-xs text-red-500 mt-1">{gpsError}</p>}
                                            {field.description && <p className="text-xs text-muted-foreground mt-1">{field.description}</p>}
                                        </div>
                                    );
                                }

                                // Cas particulier : Type de Vendeur (Sélecteur)
                                if (field.name === 'type') {
                                    return (
                                        <div key={field.name} className="space-y-2">
                                            <label className="text-sm font-semibold text-foreground">
                                                {field.label} {field.required && <span className="text-red-500 font-bold">*</span>}
                                            </label>
                                            <select
                                                name={inputName}
                                                required={field.required}
                                                disabled={isPending}
                                                value={sellerType}
                                                onChange={(e) => handleTypeChange(e.target.value)}
                                                className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm outline-none focus:ring-2 focus:ring-primary/20"
                                            >
                                                <option value="ONLINE">Vendeur en ligne (Particulier)</option>
                                                <option value="SHOP">Boutique physique</option>
                                                <option value="ENTERPRISE">Entreprise enregistrée</option>
                                            </select>
                                            {field.description && <p className="text-xs text-muted-foreground mt-1">{field.description}</p>}
                                        </div>
                                    );
                                }

                                // Textarea pour descriptions et politiques
                                const isTextarea = ['description', 'deliveryInfo', 'returnPolicy'].includes(field.name);

                                if (isTextarea) {
                                    return (
                                        <div key={field.name} className="space-y-2 col-span-1 md:col-span-2">
                                            <label className="text-sm font-semibold text-foreground">
                                                {field.label} {field.required && <span className="text-red-500 font-bold">*</span>}
                                            </label>
                                            <Textarea
                                                name={inputName}
                                                required={field.required}
                                                disabled={isPending}
                                                placeholder={field.placeholder || `Entrez le/la ${field.label.toLowerCase()}`}
                                            />
                                            {field.description && <p className="text-xs text-muted-foreground mt-1">{field.description}</p>}
                                        </div>
                                    );
                                }

                                // Uploads de fichiers
                                if (field.type === 'file') {
                                    return (
                                        <div key={field.name} className="space-y-2">
                                            <label className="text-sm font-semibold text-foreground">
                                                {field.label} {field.required && <span className="text-red-500 font-bold">*</span>}
                                            </label>
                                            <Input
                                                type="file"
                                                name={inputName}
                                                required={field.required && sellerType === 'ENTERPRISE'}
                                                disabled={isPending}
                                                className="cursor-pointer"
                                            />
                                            {field.description && <p className="text-xs text-muted-foreground mt-1">{field.description}</p>}
                                        </div>
                                    );
                                }

                                // Checkboxes (booléens)
                                if (field.type === 'boolean') {
                                    return (
                                        <div key={field.name} className="flex items-center gap-2 py-1 col-span-1 md:col-span-2">
                                            <input
                                                id={inputName}
                                                name={inputName}
                                                required={field.required}
                                                disabled={isPending}
                                                type="checkbox"
                                                className="w-5 h-5 rounded border-input text-primary focus:ring-primary"
                                            />
                                            <label htmlFor={inputName} className="text-sm text-muted-foreground">
                                                {field.label} {field.required && <span className="text-red-500 font-bold">*</span>}
                                            </label>
                                        </div>
                                    );
                                }

                                // Listes de choix
                                if (field.type === 'select') {
                                    return (
                                        <div key={field.name} className="space-y-2">
                                            <label className="text-sm font-semibold text-foreground">
                                                {field.label} {field.required && <span className="text-red-500 font-bold">*</span>}
                                            </label>
                                            <select
                                                name={inputName}
                                                required={field.required}
                                                disabled={isPending}
                                                className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm outline-none focus:ring-2 focus:ring-primary/20"
                                            >
                                                {field.options?.map((opt: any) => (
                                                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                                                ))}
                                            </select>
                                            {field.description && <p className="text-xs text-muted-foreground mt-1">{field.description}</p>}
                                        </div>
                                    );
                                }

                                // Inputs classiques (texte, nombre)
                                const getDefaultValue = (fieldName: string) => {
                                    if (fieldName === 'email') return customer?.emailAddress || '';
                                    if (fieldName === 'firstName') return customer?.firstName || '';
                                    if (fieldName === 'lastName') return customer?.lastName || '';
                                    if (fieldName === 'phoneNumber') return customer?.phoneNumber || '';
                                    return '';
                                };

                                return (
                                    <div key={field.name} className="space-y-2">
                                        <label className="text-sm font-semibold text-foreground">
                                            {field.label} {field.required && <span className="text-red-500 font-bold">*</span>}
                                        </label>
                                        <Input
                                            type={field.type === 'number' ? 'number' : 'text'}
                                            name={inputName}
                                            required={field.required}
                                            disabled={isPending}
                                            defaultValue={getDefaultValue(field.name)}
                                            placeholder={field.placeholder || `Entrez le/la ${field.label.toLowerCase()}`}
                                        />
                                        {field.description && <p className="text-xs text-muted-foreground mt-1">{field.description}</p>}
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {error && (
                        <div className="text-sm text-red-600 bg-red-50 p-3 rounded-xl border border-red-200">
                            {error}
                        </div>
                    )}

                    <div className="pt-4">
                        <Button type="submit" className="w-full h-12 rounded-xl font-bold text-sm bg-primary text-white hover:bg-primary-container" disabled={isPending}>
                            {isPending ? 'Soumission en cours...' : 'Finaliser la création de ma boutique'}
                        </Button>
                    </div>
                </form>
            </CardContent>
        </Card>
    );
}
