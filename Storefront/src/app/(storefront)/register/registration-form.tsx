'use client';

import { useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { registerAction } from './actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form';
import Link from 'next/link';

const registrationSchema = z.object({
    emailAddress: z.string().email('Veuillez entrer une adresse email valide'),
    firstName: z.string().min(1, 'Le prénom est requis'),
    lastName: z.string().min(1, 'Le nom est requis'),
    phoneNumber: z.string().optional(),
    password: z.string().min(8, 'Le mot de passe doit contenir au moins 8 caractères'),
    confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
    message: "Les mots de passe ne correspondent pas",
    path: ["confirmPassword"],
});

type RegistrationFormData = z.infer<typeof registrationSchema>;

interface RegistrationFormProps {
    redirectTo?: string;
}

export function RegistrationForm({ redirectTo }: RegistrationFormProps) {
    const [isPending, startTransition] = useTransition();
    const [serverError, setServerError] = useState<string | null>(null);

    const form = useForm<RegistrationFormData>({
        resolver: zodResolver(registrationSchema),
        defaultValues: {
            emailAddress: '',
            firstName: '',
            lastName: '',
            phoneNumber: '',
            password: '',
            confirmPassword: '',
        },
    });

    const onSubmit = (data: RegistrationFormData) => {
        setServerError(null);

        startTransition(async () => {
            const formData = new FormData();
            formData.append('emailAddress', data.emailAddress);
            if (data.firstName) formData.append('firstName', data.firstName);
            if (data.lastName) formData.append('lastName', data.lastName);
            if (data.phoneNumber) formData.append('phoneNumber', data.phoneNumber);
            formData.append('password', data.password);
            if (redirectTo) {
                formData.append('redirectTo', redirectTo);
            }

            const result = await registerAction(undefined, formData);
            if (result?.error) {
                setServerError(result.error);
            }
        });
    };

    const signInHref = redirectTo
        ? `/sign-in?redirectTo=${encodeURIComponent(redirectTo)}`
        : '/sign-in';

    return (
        <Card className="rounded-xl border shadow-sm">
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)}>
                    <CardContent className="space-y-4 p-5 pt-6">
                        <FormField
                            control={form.control}
                            name="emailAddress"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="font-black text-xs uppercase tracking-widest text-muted-foreground">Adresse Email</FormLabel>
                                    <FormControl>
                                        <Input
                                            type="email"
                                            placeholder="votre@email.com"
                                            disabled={isPending}
                                            className="h-10 rounded-lg"
                                            {...field}
                                        />
                                    </FormControl>
                                    <FormMessage className="font-bold text-xs" />
                                </FormItem>
                            )}
                        />

                        <div className="grid grid-cols-2 gap-6">
                            <FormField
                                control={form.control}
                                name="firstName"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="font-black text-xs uppercase tracking-widest text-muted-foreground">Prénom</FormLabel>
                                        <FormControl>
                                            <Input
                                                type="text"
                                                placeholder="Jean"
                                                disabled={isPending}
                                                className="h-10 rounded-lg"
                                                {...field}
                                            />
                                        </FormControl>
                                        <FormMessage className="font-bold text-xs" />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="lastName"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="font-black text-xs uppercase tracking-widest text-muted-foreground">Nom</FormLabel>
                                        <FormControl>
                                            <Input
                                                type="text"
                                                placeholder="Dupont"
                                                disabled={isPending}
                                                className="h-10 rounded-lg"
                                                {...field}
                                            />
                                        </FormControl>
                                        <FormMessage className="font-bold text-xs" />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <FormField
                            control={form.control}
                            name="phoneNumber"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="font-black text-xs uppercase tracking-widest text-muted-foreground">Téléphone (Optionnel)</FormLabel>
                                    <FormControl>
                                        <Input
                                            type="tel"
                                            placeholder="ex: 97123456"
                                            disabled={isPending}
                                            className="h-10 rounded-lg"
                                            {...field}
                                        />
                                    </FormControl>
                                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">L'indicatif +229 sera ajouté automatiquement si absent.</p>
                                    <FormMessage className="font-bold text-xs" />
                                </FormItem>
                            )}
                        />

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                            <FormField
                                control={form.control}
                                name="password"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="font-black text-xs uppercase tracking-widest text-muted-foreground">Mot de passe</FormLabel>
                                        <FormControl>
                                            <Input
                                                type="password"
                                                placeholder="••••••••"
                                                disabled={isPending}
                                                className="h-10 rounded-lg"
                                                {...field}
                                            />
                                        </FormControl>
                                        <FormMessage className="font-bold text-xs" />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="confirmPassword"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="font-black text-xs uppercase tracking-widest text-muted-foreground">Confirmation</FormLabel>
                                        <FormControl>
                                            <Input
                                                type="password"
                                                placeholder="••••••••"
                                                disabled={isPending}
                                                className="h-10 rounded-lg"
                                                {...field}
                                            />
                                        </FormControl>
                                        <FormMessage className="font-bold text-xs" />
                                    </FormItem>
                                )}
                            />
                        </div>

                        {serverError && (
                            <div className="p-3 rounded-lg bg-destructive/5 border border-destructive/10 text-sm text-destructive">
                                {serverError}
                            </div>
                        )}

                        <Button type="submit" className="w-full h-11 rounded-lg font-semibold transition-all active:scale-[0.98]" disabled={isPending}>
                            {isPending ? 'Création en cours...' : 'Créer mon compte'}
                        </Button>
                    </CardContent>
                    <CardFooter className="flex flex-col p-5 pt-4 border-t">
                        <div className="text-muted-foreground font-medium text-sm text-center">
                            Vous avez déjà un compte ?{' '}
                            <Link href={signInHref} className="text-primary font-black hover:underline underline-offset-4">
                                Se connecter
                            </Link>
                        </div>
                    </CardFooter>
                </form>
            </Form>
        </Card>
    );
}
