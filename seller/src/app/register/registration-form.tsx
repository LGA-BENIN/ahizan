'use client';

import { useState, useTransition, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
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
    FormDescription,
} from '@/components/ui/form';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import Link from 'next/link';
import { Label } from '@/components/ui/label';
import { query } from '@/lib/vendure/api';
import { gql } from 'graphql-tag';

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

const registrationSchema = z.object({
    emailAddress: z.string().email('Please enter a valid email address'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string(),
    sellerType: z.enum(['ONLINE', 'SHOP', 'ENTERPRISE']),
    dynamicDetails: z.record(z.any()).optional(),
}).refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
});

type RegistrationFormData = z.infer<typeof registrationSchema>;

interface RegistrationFormProps {
    redirectTo?: string;
}

export function RegistrationForm({ redirectTo }: RegistrationFormProps) {
    const [isPending, startTransition] = useTransition();
    const [serverError, setServerError] = useState<string | null>(null);
    const [dynamicFields, setDynamicFields] = useState<any[]>([]);

    useEffect(() => {
        const fetchFields = async () => {
            try {
                const { registrationFields } = await query(GET_REGISTRATION_FIELDS);
                setDynamicFields(registrationFields);
            } catch (error) {
                console.error("Failed to fetch dynamic fields", error);
            }
        };
        fetchFields();
    }, []);

    const form = useForm<RegistrationFormData>({
        resolver: zodResolver(registrationSchema),
        defaultValues: {
            emailAddress: '',
            password: '',
            confirmPassword: '',
            sellerType: 'ONLINE',
            dynamicDetails: {},
        },
    });

    const onSubmit = (data: RegistrationFormData) => {
        setServerError(null);

        startTransition(async () => {
            const formData = new FormData();
            formData.append('emailAddress', data.emailAddress);
            formData.append('password', data.password);
            formData.append('sellerType', data.sellerType);

            // Handle Dynamic Fields
            if (data.dynamicDetails) {
                formData.append('dynamicDetails', JSON.stringify(data.dynamicDetails));
            }

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
        <Card>
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)}>
                    <CardContent className="space-y-4">
                        <FormField
                            control={form.control}
                            name="sellerType"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Seller Type</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select seller type" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem value="ONLINE">Online Seller</SelectItem>
                                            <SelectItem value="SHOP">Boutique Seller</SelectItem>
                                            <SelectItem value="ENTERPRISE">Enterprise Seller</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <FormDescription>
                                        Choose the type of seller account you want to create.
                                    </FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="emailAddress"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Email Address</FormLabel>
                                    <FormControl>
                                        <Input
                                            type="email"
                                            placeholder="you@example.com"
                                            disabled={isPending}
                                            {...field}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {/* Dynamic Fields Section */}
                        {dynamicFields.length > 0 && (
                            <div className="space-y-4 border-l-2 border-primary pl-4 my-4">
                                <h3 className="font-semibold text-lg">Additional Information</h3>
                                {dynamicFields.map((field) => (
                                    <FormField
                                        key={field.name}
                                        control={form.control}
                                        rules={{ required: field.required }}
                                        name={`dynamicDetails.${field.name}`}
                                        render={({ field: formField }) => (
                                            <FormItem>
                                                <FormLabel>
                                                    {field.label}
                                                    {field.required && <span className="text-red-500 ml-1">*</span>}
                                                </FormLabel>
                                                <FormControl>
                                                    {field.type === 'select' ? (
                                                        <Select onValueChange={formField.onChange} defaultValue={formField.value}>
                                                            <SelectTrigger>
                                                                <SelectValue placeholder={field.placeholder || "Select option"} />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                {field.options?.map((opt: any) => (
                                                                    <SelectItem key={opt.value} value={opt.value}>
                                                                        {opt.label}
                                                                    </SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                    ) : field.type === 'boolean' ? (
                                                        <div className="flex items-center space-x-2">
                                                            <Checkbox
                                                                checked={formField.value}
                                                                onCheckedChange={formField.onChange}
                                                            />
                                                            <label className="text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                                                {field.placeholder || "Yes"}
                                                            </label>
                                                        </div>
                                                    ) : (
                                                        <Input
                                                            type={field.type}
                                                            placeholder={field.placeholder}
                                                            disabled={isPending}
                                                            {...formField}
                                                            value={formField.value || ''}
                                                        />
                                                    )}
                                                </FormControl>
                                                {field.description && (
                                                    <FormDescription>{field.description}</FormDescription>
                                                )}
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                ))}
                            </div>
                        )}

                        <FormField
                            control={form.control}
                            name="password"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Password</FormLabel>
                                    <FormControl>
                                        <Input
                                            type="password"
                                            placeholder="••••••••"
                                            disabled={isPending}
                                            {...field}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="confirmPassword"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Confirm Password</FormLabel>
                                    <FormControl>
                                        <Input
                                            type="password"
                                            placeholder="••••••••"
                                            disabled={isPending}
                                            {...field}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {serverError && (
                            <div className="text-sm text-destructive">
                                {serverError}
                            </div>
                        )}

                        <Button type="submit" className="w-full" disabled={isPending}>
                            {isPending ? 'Creating account...' : 'Create Account'}
                        </Button>
                    </CardContent>
                    <CardFooter className="flex flex-col space-y-4 mt-4">

                        <div className="text-sm text-center text-muted-foreground">
                            Already have an account?{' '}
                            <Link href={signInHref} className="hover:text-primary underline">
                                Sign in
                            </Link>
                        </div>
                    </CardFooter>
                </form>
            </Form>
        </Card>
    );
}
