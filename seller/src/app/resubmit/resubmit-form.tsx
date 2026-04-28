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
import { resubmitVendor } from '@/app/register/actions';
import { logoutAction } from '@/app/sign-in/actions';
import { RefreshCw } from 'lucide-react';

const initialState = { message: '', error: '' };

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

interface ResubmitFormProps {
    profile: Record<string, any>;
    fields: RegistrationField[];
}

export default function ResubmitForm({ profile, fields }: ResubmitFormProps) {
    const [state, formAction, isPending] = useActionState(resubmitVendor, initialState);

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

    return (
        <div className="min-h-screen flex flex-col bg-gradient-to-br from-red-50 to-orange-50">
            {/* Minimal header */}
            <header className="h-16 flex items-center justify-between px-6 bg-white border-b shadow-sm">
                <span className="text-xl font-bold bg-gradient-to-r from-orange-500 to-red-600 bg-clip-text text-transparent">
                    AHIZAN
                </span>
                <form action={logoutAction}>
                    <Button variant="ghost" size="sm" type="submit" className="text-gray-500 hover:text-red-600">
                        Se déconnecter
                    </Button>
                </form>
            </header>

            <div className="flex-1 py-10 px-4">
                <div className="max-w-2xl mx-auto">
                    {/* Rejection notice */}
                    {profile.rejectionReason && (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                            <h4 className="font-semibold text-red-900 mb-1 text-sm">Motif du refus :</h4>
                            <p className="text-red-800 text-sm">{profile.rejectionReason}</p>
                        </div>
                    )}

                    <div className="bg-white rounded-xl shadow-sm border p-8">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="bg-orange-100 p-2 rounded-full">
                                <RefreshCw className="w-5 h-5 text-orange-600" />
                            </div>
                            <div>
                                <h1 className="text-xl font-bold text-gray-900">Corriger et renvoyer votre demande</h1>
                                <p className="text-sm text-gray-500">Modifiez les informations ci-dessous et soumettez à nouveau.</p>
                            </div>
                        </div>

                        {fields.length === 0 ? (
                            <div className="text-center py-4 text-amber-600 bg-amber-50 rounded-md">
                                Aucun champ d'inscription n'est configuré. Veuillez contacter l'administrateur.
                            </div>
                        ) : (
                            <form action={formAction} className="space-y-5">
                                {fields.map((field) => (
                                    <div key={field.name} className="space-y-1">
                                        <Label htmlFor={field.name}>
                                            {field.label}
                                            {field.required && <span className="text-red-500 ml-1">*</span>}
                                        </Label>

                                        {field.type === 'select' ? (
                                            <div>
                                                {/* Hidden input to capture Select value */}
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
                                                <p className="text-gray-500 mb-1 text-xs">
                                                    Fichier précédent existant — téléchargez un nouveau fichier pour le remplacer (optionnel)
                                                </p>
                                                <Input
                                                    id={field.name}
                                                    name={field.name}
                                                    type="file"
                                                    accept="image/*,application/pdf"
                                                    // On resubmit, file fields are never strictly required
                                                    // (the existing file is kept if no new one is uploaded)
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
                                {state?.message && (
                                    <div className="text-green-600 text-sm font-medium bg-green-50 p-3 rounded-lg">
                                        {state.message}
                                    </div>
                                )}

                                <Button
                                    type="submit"
                                    className="w-full bg-orange-600 hover:bg-orange-700 text-white"
                                    disabled={isPending}
                                >
                                    {isPending ? 'Envoi en cours...' : 'Soumettre la demande corrigée'}
                                </Button>
                            </form>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
