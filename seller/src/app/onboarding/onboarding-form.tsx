'use client';

import { useState, useEffect, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { query } from '@/lib/vendure/api';
import { GetRegistrationFieldsQuery } from '@/lib/vendure/queries';
import { applyToBecomeVendorAction } from './actions';

export function OnboardingForm() {
    const [dynamicFields, setDynamicFields] = useState<any[]>([]);
    const [sellerType, setSellerType] = useState<string>('ONLINE');
    const [isPending, startTransition] = useTransition();
    const [error, setError] = useState<string | null>(null);

    // Charger les champs d'inscription configurés
    useEffect(() => {
        const fetchFields = async () => {
            try {
                const result = await query(GetRegistrationFieldsQuery, undefined);
                setDynamicFields((result.data as any)?.registrationFields || []);
            } catch (err) {
                console.error('Failed to load dynamic fields:', err);
            }
        };
        fetchFields();
    }, []);

    // Filtrer et trier les champs actifs
    const activeFields = dynamicFields
        .filter(f => f.enabled)
        .sort((a, b) => (a.order || 0) - (b.order || 0));

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
                    'facebook', 'instagram', 'rccmFile', 'ifuFile', 'idCardFile', 'logo', 'coverImage'
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
                                    'facebook', 'instagram', 'rccmFile', 'ifuFile', 'idCardFile', 'logo', 'coverImage'
                                ].includes(field.name);

                                const inputName = isStandard ? field.name : `custom_${field.name}`;

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
