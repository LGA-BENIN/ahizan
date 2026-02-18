'use client';

import { useActionState, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { registerVendor } from './actions';
import Link from 'next/link';
import { query } from '@/lib/vendure/api';
import { gql } from 'graphql-tag';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";

const GET_REGISTRATION_FIELDS = gql`
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
        }
    }
`;

const initialState = {
    message: '',
    error: '',
};

export default function RegisterPage() {
    const [state, formAction, isPending] = useActionState(registerVendor, initialState);
    const [fields, setFields] = useState<any[]>([]);
    const [loadingFields, setLoadingFields] = useState(true);

    const [searchParams, setSearchParams] = useState<any>(null);

    useEffect(() => {
        // Simple client-side search params handling to avoid Suspense issues
        const params = new URLSearchParams(window.location.search);
        setSearchParams(params);
    }, []);

    const isResubmit = searchParams?.get('resubmit') === 'true';

    useEffect(() => {
        const fetchFieldsAndProfile = async () => {
            try {
                const { data } = await query(GET_REGISTRATION_FIELDS);
                setFields(data.registrationFields || []);

                if (isResubmit) {
                    const { data: profileData } = await query(gql`
                        query GetMyVendorProfileForResubmit {
                            myVendorProfile {
                                name
                                description
                                phoneNumber
                                address
                                zone
                                deliveryInfo
                                returnPolicy
                                type
                                website
                                facebook
                                instagram
                                rccmNumber
                                ifuNumber
                                idCardNumber
                                dynamicDetails
                            }
                        }
                    `, {}, { useAuthToken: true });

                    if (profileData.myVendorProfile) {
                        // Pre-fill logic will rely on defaultValues if using react-hook-form, 
                        // but here we are using standard form submission.
                        // We will set state to control input values or use defaultValue props.
                        // For simplicity in this server action setup, we might need to populate input defaultValues via JS or state.
                        // Let's store profile in state to access in render.
                        setPreFilledProfile(profileData.myVendorProfile);
                    }
                }
            } catch (error) {
                console.error("Failed to fetch data", error);
            } finally {
                setLoadingFields(false);
            }
        };
        fetchFieldsAndProfile();
    }, [isResubmit]);

    const [preFilledProfile, setPreFilledProfile] = useState<any>(null);

    // Sort fields by order
    const sortedFields = [...fields].sort((a, b) => a.order - b.order);

    return (
        <div className="flex min-h-full flex-1 flex-col justify-center px-6 py-12 lg:px-8">
            <div className="sm:mx-auto sm:w-full sm:max-w-sm">
                <h2 className="mt-10 text-center text-2xl font-bold leading-9 tracking-tight text-foreground">
                    Devenir Vendeur sur AHIZAN
                </h2>
                <p className="mt-2 text-center text-sm text-muted-foreground">
                    Créez votre boutique et commencez à vendre
                </p>
            </div>

            <div className="mt-10 sm:mx-auto sm:w-full sm:max-w-lg">
                <form action={formAction} className="space-y-6">

                    {loadingFields ? (
                        <div className="text-center py-4">Chargement du formulaire...</div>
                    ) : sortedFields.length === 0 ? (
                        <div className="text-center py-4 text-amber-600 bg-amber-50 rounded-md">
                            Aucun champ d'inscription n'est activé. Veuillez vérifier le Dashboard Admin.
                        </div>
                    ) : (
                        sortedFields.map((field) => {
                            if (!field.enabled) return null;

                            return (
                                <div key={field.name} className="space-y-2">
                                    <Label htmlFor={field.name}>
                                        {field.label} {field.required && <span className="text-red-500">*</span>}
                                    </Label>

                                    {field.type === 'select' ? (
                                        <div className="mt-2">
                                            <input type="hidden" name={field.name} id={`${field.name}-hidden`} />
                                            <Select
                                                required={field.required}
                                                onValueChange={(val) => {
                                                    const hidden = document.getElementById(`${field.name}-hidden`) as HTMLInputElement;
                                                    if (hidden) hidden.value = val;
                                                }}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue placeholder={field.placeholder || "Sélectionner..."} />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {field.options?.map((opt: any) => (
                                                        <SelectItem key={opt.value} value={opt.value}>
                                                            {opt.label}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    ) : field.type === 'boolean' ? (
                                        <div className="flex items-center space-x-2 mt-2">
                                            <Checkbox
                                                name={field.name}
                                                id={field.name}
                                                required={field.required}
                                            />
                                            <label htmlFor={field.name} className="text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                                {field.placeholder || "Oui"}
                                            </label>
                                        </div>
                                    ) : field.type === 'file' ? (
                                        <div className="mt-2 text-sm">
                                            {preFilledProfile && (field.name === 'rccmFile' || field.name === 'ifuFile' || field.name === 'idCardFile') && (
                                                <p className="text-gray-500 mb-1">Fichier précédent existant (téléchargez pour remplacer)</p>
                                            )}
                                            <Input
                                                id={field.name}
                                                name={field.name}
                                                type="file"
                                                accept="image/*,application/pdf"
                                                required={field.required && !isResubmit} // Allow skipping if resubmitting and file exists? Complex to detect, keeping required for now unless handled backend
                                                className="block w-full"
                                            />
                                        </div>
                                    ) : field.name === 'description' || field.name === 'shopDescription' || field.name === 'address' || field.name === 'deliveryInfo' || field.name === 'returnPolicy' ? (
                                        <div className="mt-2">
                                            <Textarea
                                                id={field.name}
                                                name={field.name}
                                                required={field.required}
                                                placeholder={field.placeholder}
                                                className="block w-full"
                                                rows={3}
                                                defaultValue={preFilledProfile ? (preFilledProfile[field.name] || (preFilledProfile.dynamicDetails && preFilledProfile.dynamicDetails[field.name])) : ''}
                                            />
                                        </div>
                                    ) : (
                                        <div className="mt-2">
                                            <Input
                                                id={field.name}
                                                name={field.name}
                                                type={field.name === 'email' ? 'email' : 'text'}
                                                required={field.required}
                                                placeholder={field.placeholder}
                                                className="block w-full"
                                                defaultValue={preFilledProfile ? (preFilledProfile[field.name] || (preFilledProfile.dynamicDetails && preFilledProfile.dynamicDetails[field.name])) : ''}
                                            />
                                        </div>
                                    )}
                                    {field.description && <p className="text-sm text-gray-500">{field.description}</p>}
                                </div>
                            );
                        })
                    )}

                    {/* Password is Mandatory and Hardcoded if not present in dynamic fields */}
                    <div>
                        <Label htmlFor="password">Mot de passe <span className="text-red-500">*</span></Label>
                        <div className="mt-2">
                            <Input
                                id="password"
                                name="password"
                                type="password"
                                autoComplete="new-password"
                                required
                                className="block w-full"
                            />
                        </div>
                    </div>

                    {state?.error && (
                        <div className="text-destructive text-sm font-medium">{state.error}</div>
                    )}
                    {state?.message && (
                        <div className="text-green-600 text-sm font-medium">{state.message}</div>
                    )}

                    <div>
                        <Button
                            type="submit"
                            className="flex w-full justify-center"
                            disabled={isPending || loadingFields}
                        >
                            {isPending ? 'Inscription...' : "S'inscrire"}
                        </Button>
                    </div>
                </form>

                <p className="mt-10 text-center text-sm text-muted-foreground">
                    Déjà vendeur ?{' '}
                    <Link href="/vendor/login" className="font-semibold leading-6 text-primary hover:text-primary/80">
                        Connectez-vous ici
                    </Link>
                </p>
            </div>
        </div>
    );
}