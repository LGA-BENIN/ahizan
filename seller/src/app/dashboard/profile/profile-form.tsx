'use client';

import { useActionState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { updateProfileAction } from './actions';
import { Save } from 'lucide-react';

const initialState: { error?: string; success?: boolean } = {};

interface FieldOption {
    label: string;
    value: string;
}

interface RegistrationField {
    id: string;
    name: string;
    label: string;
    type: string;
    options?: FieldOption[];
    required: boolean;
    order: number;
    enabled: boolean;
    description?: string;
    placeholder?: string;
}

interface ProfileFormProps {
    profile: Record<string, any>;
    fields: RegistrationField[];
}

export function ProfileForm({ profile, fields }: ProfileFormProps) {
    const [state, formAction, isPending] = useActionState(updateProfileAction, initialState);

    // Helper to get pre-filled value from profile or dynamicDetails
    const getPrefilledValue = (fieldName: string): string => {
        if (profile[fieldName] !== undefined && profile[fieldName] !== null) {
            return String(profile[fieldName]);
        }
        if (profile.dynamicDetails && profile.dynamicDetails[fieldName] !== undefined) {
            return String(profile.dynamicDetails[fieldName]);
        }
        return '';
    };

    // Filter out password and email fields — those are not editable here
    const editableFields = fields.filter(
        (f) => f.name !== 'password' && f.name !== 'confirmPassword'
    );

    return (
        <div className="bg-white rounded-xl shadow-sm border p-8">
            <div className="flex items-center gap-3 mb-6">
                <div className="bg-orange-100 p-2 rounded-full">
                    <Save className="w-5 h-5 text-orange-600" />
                </div>
                <div>
                    <h2 className="text-xl font-bold text-gray-900">Informations de la boutique</h2>
                    <p className="text-sm text-gray-500">Modifiez vos informations et enregistrez.</p>
                </div>
            </div>

            {editableFields.length === 0 ? (
                <div className="text-center py-4 text-amber-600 bg-amber-50 rounded-md">
                    Aucun champ de profil n&apos;est configuré. Veuillez contacter l&apos;administrateur.
                </div>
            ) : (
                <form action={formAction} className="space-y-5">
                    {editableFields.map((field) => (
                        <div key={field.name} className="space-y-1">
                            <Label htmlFor={field.name}>
                                {field.label}
                                {field.required && <span className="text-red-500 ml-1">*</span>}
                            </Label>

                            {field.type === 'select' ? (
                                <div>
                                    <input
                                        type="hidden"
                                        name={field.name}
                                        id={`${field.name}-hidden`}
                                        defaultValue={getPrefilledValue(field.name)}
                                    />
                                    <Select
                                        defaultValue={getPrefilledValue(field.name)}
                                        onValueChange={(val) => {
                                            const hidden = document.getElementById(`${field.name}-hidden`) as HTMLInputElement;
                                            if (hidden) hidden.value = val;
                                        }}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder={field.placeholder || 'Sélectionner...'} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {field.options?.map((opt) => (
                                                <SelectItem key={opt.value} value={opt.value}>
                                                    {opt.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            ) : field.type === 'boolean' ? (
                                <div className="flex items-center space-x-2 mt-1">
                                    <Checkbox
                                        name={field.name}
                                        id={field.name}
                                        defaultChecked={getPrefilledValue(field.name) === 'true'}
                                    />
                                    <label htmlFor={field.name} className="text-sm leading-none">
                                        {field.placeholder || 'Oui'}
                                    </label>
                                </div>
                            ) : field.type === 'file' ? (
                                <div className="text-sm">
                                    {getPrefilledValue(field.name) && (
                                        <p className="text-gray-500 mb-1 text-xs">
                                            Fichier existant — téléchargez un nouveau fichier pour le remplacer (optionnel)
                                        </p>
                                    )}
                                    <Input
                                        id={field.name}
                                        name={field.name}
                                        type="file"
                                        accept="image/*,application/pdf"
                                        required={false}
                                        className="block w-full"
                                    />
                                </div>
                            ) : field.name === 'description' ||
                                field.name === 'shopDescription' ||
                                field.name === 'address' ||
                                field.name === 'deliveryInfo' ||
                                field.name === 'returnPolicy' ? (
                                <Textarea
                                    id={field.name}
                                    name={field.name}
                                    required={field.required}
                                    placeholder={field.placeholder}
                                    className="block w-full"
                                    rows={3}
                                    defaultValue={getPrefilledValue(field.name)}
                                    disabled={isPending}
                                />
                            ) : (
                                <Input
                                    id={field.name}
                                    name={field.name}
                                    type={field.name === 'email' ? 'email' : 'text'}
                                    required={field.required}
                                    placeholder={field.placeholder}
                                    className="block w-full"
                                    defaultValue={getPrefilledValue(field.name)}
                                    disabled={field.name === 'email' || isPending}
                                />
                            )}

                            {field.description && (
                                <p className="text-xs text-gray-500">{field.description}</p>
                            )}
                        </div>
                    ))}

                    {state?.error && (
                        <div className="text-red-600 text-sm font-medium bg-red-50 p-3 rounded-lg">
                            {state.error}
                        </div>
                    )}
                    {state?.success && (
                        <div className="text-green-600 text-sm font-medium bg-green-50 p-3 rounded-lg">
                            Profil mis à jour avec succès !
                        </div>
                    )}

                    <Button
                        type="submit"
                        className="w-full bg-orange-600 hover:bg-orange-700 text-white"
                        disabled={isPending}
                    >
                        {isPending ? 'Enregistrement...' : 'Enregistrer les modifications'}
                    </Button>
                </form>
            )}
        </div>
    );
}
