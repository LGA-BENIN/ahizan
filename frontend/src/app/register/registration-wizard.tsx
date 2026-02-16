'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Check, ChevronRight, ChevronLeft, Upload, FileText } from 'lucide-react';
import { registerAction } from './actions';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from "@/components/ui/progress";

// --- Schema Definitions ---

const baseShape = {
    emailAddress: z.string().email("Adresse email invalide"),
    password: z.string().min(8, 'Le mot de passe doit contenir au moins 8 caractères'),
    confirmPassword: z.string(),
    firstName: z.string().min(2, 'Le prénom est requis'),
    lastName: z.string().min(2, 'Le nom est requis'),
    phoneNumber: z.string().min(8, "Le numéro de téléphone doit contenir au moins 8 chiffres"),
    shopName: z.string().min(2, 'Le nom de la boutique est requis'),
    shopDescription: z.string().optional(),
};

const passwordRefinement = (data: any) => data.password === data.confirmPassword;
const passwordRefinementConfig = {
    message: "Les mots de passe ne correspondent pas",
    path: ["confirmPassword"],
};

// Enterprise extensions
const enterpriseSchema = z.object({
    ...baseShape,
    sellerType: z.literal('ENTERPRISE'),
    raisonSociale: z.string().min(2, 'La Raison Sociale est requise'),
    rccm: z.string().min(2, 'Le RCCM est requis'),
    ifu: z.string().min(2, "L'IFU est requis"),
    cnss: z.string().optional(),
    siegeAddress: z.string().optional(),
}).refine(passwordRefinement, passwordRefinementConfig);

// Other types extensions
const otherSchema = z.object({
    ...baseShape,
    sellerType: z.enum(['ONLINE', 'SHOP']),
}).refine(passwordRefinement, passwordRefinementConfig);

// Combined schema for form validation
const registrationSchema = z.discriminatedUnion('sellerType', [
    otherSchema,
    enterpriseSchema,
]);

type RegistrationFormValues = z.infer<typeof registrationSchema>;

// --- Components ---

export function RegistrationWizard() {
    const [step, setStep] = useState(1);
    const [isPending, setIsPending] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [files, setFiles] = useState<{
        carteCip?: File;
        rccmDocument?: File;
        ifuDocument?: File;
        cnssDocument?: File;
    }>({});

    const form = useForm<RegistrationFormValues>({
        resolver: zodResolver(registrationSchema),
        defaultValues: {
            sellerType: 'ONLINE',
            emailAddress: '',
            password: '',
            confirmPassword: '',
            firstName: '',
            lastName: '',
            phoneNumber: '',
            shopName: '',
            shopDescription: '',
            raisonSociale: '',
            rccm: '',
            ifu: '',
            cnss: '',
            siegeAddress: '',
        },
        mode: 'onChange',
    });

    const sellerType = form.watch('sellerType');

    // Steps configuration
    const totalSteps = sellerType === 'ENTERPRISE' ? 3 : 3;

    const nextStep = async () => {
        let valid = false;
        if (step === 1) {
            valid = await form.trigger(['emailAddress', 'password', 'confirmPassword', 'firstName', 'lastName', 'phoneNumber']);
        } else if (step === 2) {
            valid = await form.trigger(['shopName', 'shopDescription', 'sellerType']);
        }

        if (valid) {
            setStep((s) => Math.min(s + 1, totalSteps));
        }
    };

    const prevStep = () => {
        setStep((s) => Math.max(s - 1, 1));
    };

    const onSubmit = async (data: RegistrationFormValues) => {
        setIsPending(true);
        setError(null);

        const formData = new FormData();
        Object.entries(data).forEach(([key, value]) => {
            if (value) formData.append(key, value);
        });

        // Append files
        if (sellerType === 'ENTERPRISE') {
            if (files.carteCip) formData.append('carteCip', files.carteCip);
            if (files.rccmDocument) formData.append('rccmDocument', files.rccmDocument);
            if (files.ifuDocument) formData.append('ifuDocument', files.ifuDocument);
            if (files.cnssDocument) formData.append('cnssDocument', files.cnssDocument);
        }

        // Add redirectTo
        formData.append('redirectTo', '/dashboard');

        const result = await registerAction(undefined, formData);

        if (result?.error) {
            setError(result.error);
            setIsPending(false);
        }
    };

    const handleFileChange = (field: keyof typeof files, file: File | undefined) => {
        if (file) {
            setFiles(prev => ({ ...prev, [field]: file }));
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
            <div className="w-full max-w-3xl">
                <div className="mb-8 text-center space-y-2">
                    <h1 className="text-4xl font-extrabold tracking-tight text-primary">Ahizan</h1>
                    <p className="text-muted-foreground text-lg">Rejoignez la première marketplace du Bénin.</p>
                </div>

                <Card className="border-0 shadow-xl overflow-hidden">
                    <div className="bg-primary/5 h-2 w-full">
                        <Progress value={(step / totalSteps) * 100} className="h-full rounded-none bg-transparent" indicatorClassName="bg-primary" />
                    </div>

                    <CardHeader className="bg-white pb-0 pt-8 px-8">
                        <div className="flex items-center justify-between mb-6">
                            <div className="space-y-1">
                                <CardTitle className="text-2xl">
                                    {step === 1 && "Informations du Compte"}
                                    {step === 2 && "Détails de la Boutique"}
                                    {step === 3 && "Vérification & Documents"}
                                </CardTitle>
                                <CardDescription>
                                    Étape {step} sur {totalSteps}
                                </CardDescription>
                            </div>
                            <div className="hidden md:flex space-x-2">
                                {[1, 2, 3].map((i) => (
                                    <div key={i} className={cn(
                                        "w-3 h-3 rounded-full transition-all duration-300",
                                        i === step ? "bg-primary scale-125" : i < step ? "bg-primary/40" : "bg-slate-200"
                                    )} />
                                ))}
                            </div>
                        </div>
                    </CardHeader>

                    <CardContent className="p-8">
                        <Form {...form}>
                            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                                <AnimatePresence mode="wait">
                                    {step === 1 && (
                                        <motion.div
                                            key="step1"
                                            initial={{ opacity: 0, x: 20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            exit={{ opacity: 0, x: -20 }}
                                            className="space-y-4"
                                        >
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <FormField control={form.control} name="firstName" render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>Prénom</FormLabel>
                                                        <FormControl><Input placeholder="Jean" {...field} /></FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )} />
                                                <FormField control={form.control} name="lastName" render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>Nom</FormLabel>
                                                        <FormControl><Input placeholder="Dupont" {...field} /></FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )} />
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <FormField control={form.control} name="emailAddress" render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>Email</FormLabel>
                                                        <FormControl><Input placeholder="jean@exemple.com" type="email" {...field} /></FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )} />
                                                <FormField control={form.control} name="phoneNumber" render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>Téléphone</FormLabel>
                                                        <FormControl><Input placeholder="+229..." {...field} /></FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )} />
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <FormField control={form.control} name="password" render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>Mot de passe</FormLabel>
                                                        <FormControl><Input type="password" {...field} /></FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )} />
                                                <FormField control={form.control} name="confirmPassword" render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>Confirmer le mot de passe</FormLabel>
                                                        <FormControl><Input type="password" {...field} /></FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )} />
                                            </div>
                                        </motion.div>
                                    )}

                                    {step === 2 && (
                                        <motion.div
                                            key="step2"
                                            initial={{ opacity: 0, x: 20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            exit={{ opacity: 0, x: -20 }}
                                            className="space-y-4"
                                        >
                                            <FormField control={form.control} name="shopName" render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Nom de la Boutique</FormLabel>
                                                    <FormControl><Input placeholder="Ma Super Boutique" {...field} /></FormControl>
                                                    <FormDescription>Ce nom sera visible par les clients.</FormDescription>
                                                    <FormMessage />
                                                </FormItem>
                                            )} />

                                            <FormField control={form.control} name="shopDescription" render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Description</FormLabel>
                                                    <FormControl><Textarea placeholder="Décrivez votre boutique..." className="resize-none" {...field} /></FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )} />

                                            <FormField control={form.control} name="sellerType" render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Type de Vendeur</FormLabel>
                                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                        <FormControl>
                                                            <SelectTrigger>
                                                                <SelectValue placeholder="Sélectionnez un type" />
                                                            </SelectTrigger>
                                                        </FormControl>
                                                        <SelectContent>
                                                            <SelectItem value="ONLINE">Vendeur en Ligne</SelectItem>
                                                            <SelectItem value="SHOP">Boutique Physique</SelectItem>
                                                            <SelectItem value="ENTERPRISE">Entreprise</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                    <FormMessage />
                                                </FormItem>
                                            )} />
                                        </motion.div>
                                    )}

                                    {step === 3 && (
                                        <motion.div
                                            key="step3"
                                            initial={{ opacity: 0, x: 20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            exit={{ opacity: 0, x: -20 }}
                                            className="space-y-6"
                                        >
                                            {sellerType === 'ENTERPRISE' ? (
                                                <div className="space-y-6">
                                                    <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 text-blue-800 text-sm">
                                                        <p className="font-semibold mb-1">Vérification d'Entreprise</p>
                                                        <p>Veuillez fournir vos documents d'enregistrement. Tous les champs sont requis pour les comptes entreprise.</p>
                                                    </div>

                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                        <FormField control={form.control} name="raisonSociale" render={({ field }) => (
                                                            <FormItem>
                                                                <FormLabel>Raison Sociale</FormLabel>
                                                                <FormControl><Input {...field} /></FormControl>
                                                                <FormMessage />
                                                            </FormItem>
                                                        )} />
                                                        <FormField control={form.control} name="siegeAddress" render={({ field }) => (
                                                            <FormItem>
                                                                <FormLabel>Adresse du Siège</FormLabel>
                                                                <FormControl><Input {...field} /></FormControl>
                                                                <FormMessage />
                                                            </FormItem>
                                                        )} />
                                                    </div>

                                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                        <FormField control={form.control} name="rccm" render={({ field }) => (
                                                            <FormItem>
                                                                <FormLabel>Numéro RCCM</FormLabel>
                                                                <FormControl><Input {...field} /></FormControl>
                                                                <FormMessage />
                                                            </FormItem>
                                                        )} />
                                                        <FormField control={form.control} name="ifu" render={({ field }) => (
                                                            <FormItem>
                                                                <FormLabel>Numéro IFU</FormLabel>
                                                                <FormControl><Input {...field} /></FormControl>
                                                                <FormMessage />
                                                            </FormItem>
                                                        )} />
                                                        <FormField control={form.control} name="cnss" render={({ field }) => (
                                                            <FormItem>
                                                                <FormLabel>Numéro CNSS</FormLabel>
                                                                <FormControl><Input {...field} /></FormControl>
                                                                <FormMessage />
                                                            </FormItem>
                                                        )} />
                                                    </div>

                                                    <div className="space-y-4 pt-4 border-t">
                                                        <FormLabel className="text-base">Documents à Télécharger</FormLabel>
                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                            <FileUploadField label="Carte CIP" onChange={(f) => handleFileChange('carteCip', f)} file={files.carteCip} />
                                                            <FileUploadField label="Document RCCM" onChange={(f) => handleFileChange('rccmDocument', f)} file={files.rccmDocument} />
                                                            <FileUploadField label="Document IFU" onChange={(f) => handleFileChange('ifuDocument', f)} file={files.ifuDocument} />
                                                            <FileUploadField label="Document CNSS" onChange={(f) => handleFileChange('cnssDocument', f)} file={files.cnssDocument} />
                                                        </div>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="text-center py-8 space-y-4">
                                                    <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto">
                                                        <Check className="w-8 h-8" />
                                                    </div>
                                                    <h3 className="text-xl font-semibold">Almost There!</h3>
                                                    <p className="text-muted-foreground max-w-md mx-auto">
                                                        You have selected a <strong>{sellerType === 'ONLINE' ? 'Online Seller' : 'Boutique Seller'}</strong> account.
                                                        Your account will be created immediately, but may require administrative approval before you can start selling.
                                                    </p>
                                                </div>
                                            )}
                                        </motion.div>
                                    )}
                                </AnimatePresence>

                                {error && (
                                    <div className="bg-destructive/15 text-destructive text-sm p-3 rounded-md">
                                        {error}
                                    </div>
                                )}
                            </form>
                        </Form>
                    </CardContent>

                    <CardFooter className="flex justify-between bg-slate-50 p-8 border-t">
                        <Button
                            variant="outline"
                            onClick={prevStep}
                            disabled={step === 1 || isPending}
                        >
                            <ChevronLeft className="w-4 h-4 mr-2" />
                            Previous
                        </Button>

                        {step < totalSteps ? (
                            <Button onClick={nextStep} disabled={isPending}>
                                Next
                                <ChevronRight className="w-4 h-4 ml-2" />
                            </Button>
                        ) : (
                            <Button onClick={form.handleSubmit(onSubmit)} disabled={isPending} className="min-w-[140px]">
                                {isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : "Complete Registration"}
                            </Button>
                        )}
                    </CardFooter>
                </Card>
            </div>
        </div>
    );
}

function FileUploadField({ label, onChange, file }: { label: string, onChange: (f: File | undefined) => void, file?: File }) {
    return (
        <div className="border border-dashed border-input rounded-lg p-4 hover:bg-slate-50 transition-colors text-center cursor-pointer relative group">
            <input
                type="file"
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                onChange={(e) => onChange(e.target.files?.[0])}
                accept=".pdf,.jpg,.jpeg,.png"
            />
            <div className="space-y-2">
                {file ? (
                    <div className="flex flex-col items-center text-primary">
                        <FileText className="w-8 h-8" />
                        <span className="text-sm font-medium truncate max-w-[200px]">{file.name}</span>
                        <span className="text-xs text-muted-foreground">Cliquer pour remplacer</span>
                    </div>
                ) : (
                    <div className="flex flex-col items-center text-muted-foreground group-hover:text-foreground">
                        <Upload className="w-8 h-8 mb-1" />
                        <span className="text-sm font-medium">{label}</span>
                        <span className="text-xs">PDF ou Image</span>
                    </div>
                )}
            </div>
        </div>
    );
}
