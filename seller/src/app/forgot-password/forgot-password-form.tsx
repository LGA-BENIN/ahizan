'use client';

import { useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { requestPasswordResetAction, verifyPasswordResetCodeAction } from './actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

const emailSchema = z.object({
    emailAddress: z.string().email('Veuillez entrer une adresse email valide'),
});

const codeSchema = z.object({
    code: z.string().length(6, 'Le code doit contenir 6 chiffres'),
});

export function ForgotPasswordForm() {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const [step, setStep] = useState<'email' | 'code'>('email');
    const [email, setEmail] = useState('');
    const [code, setCode] = useState('');
    const [serverError, setServerError] = useState<string | null>(null);

    const emailForm = useForm<z.infer<typeof emailSchema>>({
        resolver: zodResolver(emailSchema),
        defaultValues: { emailAddress: '' },
    });

    const onEmailSubmit = (data: z.infer<typeof emailSchema>) => {
        setServerError(null);
        startTransition(async () => {
            const formData = new FormData();
            formData.append('emailAddress', data.emailAddress);

            const result = await requestPasswordResetAction(undefined, formData);
            if (result?.error) {
                setServerError(result.error);
            } else {
                setEmail(data.emailAddress);
                setStep('code');
            }
        });
    };

    const onCodeSubmit = () => {
        if (code.length !== 6) return;
        setServerError(null);
        startTransition(async () => {
            const result = await verifyPasswordResetCodeAction(email, code);
            if (result?.error) {
                setServerError(result.error);
            } else {
                // Redirect to the reset password page with the token
                router.push(`/reset-password?token=${code}&email=${encodeURIComponent(email)}`);
            }
        });
    };

    return (
        <Card className="shadow-xl">
            <CardHeader>
                <CardTitle>{step === 'email' ? 'Mot de passe oublié ?' : 'Code de vérification'}</CardTitle>
                <CardDescription>
                    {step === 'email'
                        ? "Entrez votre adresse e-mail et nous vous enverrons un code pour réinitialiser votre mot de passe."
                        : `Nous avons envoyé un code à 6 chiffres à ${email}. Veuillez le saisir ci-dessous.`}
                </CardDescription>
            </CardHeader>
            <CardContent>
                {step === 'email' ? (
                    <Form {...emailForm}>
                        <form onSubmit={emailForm.handleSubmit(onEmailSubmit)} className="space-y-4">
                            <FormField
                                control={emailForm.control}
                                name="emailAddress"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>E-mail</FormLabel>
                                        <FormControl>
                                            <Input
                                                type="email"
                                                placeholder="votre@email.com"
                                                disabled={isPending}
                                                {...field}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            {serverError && <div className="text-sm text-destructive">{serverError}</div>}
                            <Button type="submit" className="w-full" disabled={isPending}>
                                {isPending ? 'Envoi...' : 'Envoyer le code'}
                            </Button>
                        </form>
                    </Form>
                ) : (
                    <div className="space-y-6">
                        <div className="space-y-4">
                            <label className="text-center block text-sm font-medium text-muted-foreground">
                                Code de confirmation (6 chiffres)
                            </label>
                            <input
                                type="text"
                                inputMode="numeric"
                                pattern="[0-9]*"
                                value={code}
                                onChange={(e) => {
                                    const val = e.target.value.replace(/[^0-9]/g, '').slice(0, 6);
                                    setCode(val);
                                    setServerError(null);
                                }}
                                autoFocus
                                placeholder="******"
                                className="block w-full text-center text-5xl font-mono font-bold h-20 border-b-4 border-primary bg-transparent focus:outline-none focus:border-primary-foreground transition-colors"
                            />
                        </div>

                        {serverError && (
                            <div className="text-sm text-destructive text-center bg-destructive/10 p-3 rounded-lg border border-destructive/20 animate-in fade-in zoom-in duration-200">
                                {serverError}
                            </div>
                        )}

                        <Button
                            onClick={() => onCodeSubmit()}
                            className="w-full h-12 text-lg font-semibold shadow-lg"
                            disabled={isPending || code.length !== 6}
                        >
                            {isPending ? 'Vérification...' : 'Vérifier le code'}
                        </Button>

                        <button
                            type="button"
                            onClick={() => {
                                setStep('email');
                                setServerError(null);
                                setCode('');
                            }}
                            className="text-sm text-muted-foreground hover:text-primary hover:underline w-full text-center py-2 transition-colors"
                            disabled={isPending}
                        >
                            Utiliser une autre adresse e-mail
                        </button>
                    </div>
                )}
            </CardContent>
            <CardFooter className="flex flex-col space-y-4">
                <Link
                    href="/sign-in"
                    className="text-sm text-center text-muted-foreground hover:text-primary transition-colors"
                >
                    Retour à la connexion
                </Link>
            </CardFooter>
        </Card>
    );
}
