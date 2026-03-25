'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
    FormDescription
} from '@/components/ui/form';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle2, Upload } from 'lucide-react';
// import { updateVendorProfile } from './actions'; // You will create this

// Schema definitions
const basicSchema = z.object({
    name: z.string().min(2, "Store name is required"),
    description: z.string().min(10, "Description must be at least 10 characters"),
    phoneNumber: z.string().min(8, "Valid phone number is required"),
    address: z.string().min(5, "Address is required"),
    zone: z.string().min(2, "Zone is required"),
    type: z.enum(['INDIVIDUAL', 'ONLINE', 'SHOP', 'ENTERPRISE']),
    sex: z.enum(['M', 'F', 'O']).optional(),
});

const enterpriseSchema = basicSchema.extend({
    rccm: z.string().min(1, "RCCM is required"),
    ifu: z.string().min(1, "IFU is required"),
    raisonSociale: z.string().min(1, "Raison Sociale is required"),
    siegeAddress: z.string().min(1, "Siege Address is required"),
    // carteCip is handled as a file separately
});

type FormData = z.infer<typeof enterpriseSchema>;

export function OnboardingForm() {
    const [step, setStep] = useState(1);
    const [vendorType, setVendorType] = useState<'INDIVIDUAL' | 'ONLINE' | 'SHOP' | 'ENTERPRISE'>('INDIVIDUAL');
    const [isPending, setIsPending] = useState(false);

    const form = useForm<FormData>({
        resolver: zodResolver(vendorType === 'ENTERPRISE' ? enterpriseSchema : basicSchema),
        defaultValues: {
            name: '',
            description: '',
            phoneNumber: '',
            address: '',
            zone: '',
            type: 'INDIVIDUAL',
            sex: 'M',
            rccm: '',
            ifu: '',
            raisonSociale: '',
            siegeAddress: '',
        },
    });

    const watchedType = form.watch('type');
    if (watchedType !== vendorType) {
        setVendorType(watchedType);
    }

    const onSubmit = async (data: FormData) => {
        setIsPending(true);
        try {
            // TODO: Implement server action
            console.log('Submitting:', data);

            // Allow file upload logic here

        } catch (error) {
            console.error(error);
        } finally {
            setIsPending(false);
        }
    };

    return (
        <Card>
            <CardContent className="pt-6">
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">

                        <div className="space-y-4">
                            <h2 className="text-xl font-semibold">Basic Information</h2>

                            <div className="grid md:grid-cols-2 gap-4">
                                <FormField control={form.control} name="name" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Store Name</FormLabel>
                                        <FormControl><Input {...field} /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )} />

                                <FormField control={form.control} name="type" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Vendor Type</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select type" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value="INDIVIDUAL">Individual</SelectItem>
                                                <SelectItem value="ONLINE">Online Seller (Vendeur en ligne)</SelectItem>
                                                <SelectItem value="SHOP">Shop (Boutique)</SelectItem>
                                                <SelectItem value="ENTERPRISE">Enterprise (Commerce Entreprise)</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )} />
                            </div>

                            <FormField control={form.control} name="description" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Description</FormLabel>
                                    <FormControl><Textarea {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )} />

                            <div className="grid md:grid-cols-2 gap-4">
                                <FormField control={form.control} name="phoneNumber" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Phone Number</FormLabel>
                                        <FormControl><Input {...field} /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )} />

                                <FormField control={form.control} name="sex" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Sex</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select sex" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value="M">Male</SelectItem>
                                                <SelectItem value="F">Female</SelectItem>
                                                <SelectItem value="O">Other</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )} />
                            </div>

                            <div className="grid md:grid-cols-2 gap-4">
                                <FormField control={form.control} name="address" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Address</FormLabel>
                                        <FormControl><Input {...field} /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )} />

                                <FormField control={form.control} name="zone" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Zone (e.g. Cotonou - Akpakpa)</FormLabel>
                                        <FormControl><Input {...field} /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )} />
                            </div>
                        </div>

                        {vendorType === 'ENTERPRISE' && (
                            <div className="space-y-4 pt-4 border-t">
                                <h2 className="text-xl font-semibold">Enterprise Details</h2>

                                <FormField control={form.control} name="raisonSociale" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Raison Sociale</FormLabel>
                                        <FormControl><Input {...field} /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )} />

                                <div className="grid md:grid-cols-2 gap-4">
                                    <FormField control={form.control} name="rccm" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>RCCM</FormLabel>
                                            <FormControl><Input {...field} /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )} />

                                    <FormField control={form.control} name="ifu" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>IFU</FormLabel>
                                            <FormControl><Input {...field} /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )} />
                                </div>

                                <FormField control={form.control} name="siegeAddress" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Adresse du siège</FormLabel>
                                        <FormControl><Input {...field} /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )} />

                                <div className="space-y-2">
                                    <FormLabel>Carte CIP (Upload)</FormLabel>
                                    <div className="border border-dashed rounded-lg p-6 flex flex-col items-center justify-center text-muted-foreground hover:bg-muted/50 transition-colors cursor-pointer">
                                        <Upload className="h-8 w-8 mb-2" />
                                        <span className="text-sm">Click to upload file</span>
                                        <Input type="file" className="hidden" />
                                    </div>
                                    <p className="text-xs text-muted-foreground">Upload the official Carte CIP document.</p>
                                </div>
                            </div>
                        )}

                        <div className="pt-4">
                            <Button type="submit" className="w-full" disabled={isPending}>
                                {isPending ? 'Submitting...' : 'Complete Registration'}
                            </Button>
                        </div>

                    </form>
                </Form>
            </CardContent>
        </Card>
    );
}
