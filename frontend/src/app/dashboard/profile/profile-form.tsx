'use client';

import { useState, useTransition, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { updateProfileAction } from './actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
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

const profileSchema = z.object({
    dynamicDetails: z.record(z.any()).optional(),
});

type ProfileFormData = z.infer<typeof profileSchema>;

export function ProfileForm({ vendor }: { vendor: any }) {
    const [isPending, startTransition] = useTransition();
    const [dynamicFields, setDynamicFields] = useState<any[]>([]);
    const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

    // Initial values from vendor profile
    const initialDynamicDetails = vendor?.dynamicDetails || {};

    const form = useForm<ProfileFormData>({
        resolver: zodResolver(profileSchema),
        defaultValues: {
            dynamicDetails: initialDynamicDetails,
        },
    });

    useEffect(() => {
        const fetchFields = async () => {
            try {
                const { data } = await (query as any)(GET_REGISTRATION_FIELDS);
                setDynamicFields((data as any).registrationFields || []);
            } catch (error) {
                console.error("Failed to fetch dynamic fields", error);
                setDynamicFields([]);
            }
        };
        fetchFields();
    }, []);

    const onSubmit = (data: ProfileFormData) => {
        startTransition(async () => {
            const formData = new FormData();

            // Handle Dynamic Fields
            if (data.dynamicDetails) {
                formData.append('dynamicDetails', JSON.stringify(data.dynamicDetails));
            }

            const result = await updateProfileAction(formData);

            if (result?.error) {
                setFeedback({ type: 'error', message: result.error });
            } else {
                setFeedback({ type: 'success', message: 'Profile updated successfully.' });
            }
        });
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Edit Profile</CardTitle>
            </CardHeader>
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)}>
                    <CardContent className="space-y-4">
                        {/* Dynamic Fields Section */}
                        {dynamicFields.length > 0 ? (
                            <div className="space-y-4">
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
                                                        <Select onValueChange={formField.onChange} defaultValue={formField.value as any}>
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
                                                                checked={formField.value as any}
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
                                                            value={formField.value as any || ''}
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
                        ) : (
                            <div className="text-center py-4 text-muted-foreground">
                                No profile fields configured.
                            </div>
                        )}

                        {feedback && (
                            <div className={`text-sm font-medium p-3 rounded-lg ${feedback.type === 'error'
                                ? 'text-red-600 bg-red-50'
                                : 'text-green-600 bg-green-50'
                                }`}>
                                {feedback.message}
                            </div>
                        )}
                        <Button type="submit" className="w-full" disabled={isPending}>
                            {isPending ? 'Saving...' : 'Save Changes'}
                        </Button>
                    </CardContent>
                </form>
            </Form>
        </Card>
    );
}
