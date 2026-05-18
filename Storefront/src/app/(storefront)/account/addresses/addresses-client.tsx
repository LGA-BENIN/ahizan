'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Plus, MoreVertical, Home, CreditCard, Edit2, Trash2 } from 'lucide-react';
import { AddressForm } from './address-form';
import { useRouter } from 'next/navigation';
import { createAddress, updateAddress, deleteAddress, setDefaultShippingAddress, setDefaultBillingAddress } from './actions';

interface Country {
    id: string;
    code: string;
    name: string;
}

interface CustomerAddress {
    id: string;
    fullName?: string | null;
    company?: string | null;
    streetLine1: string;
    streetLine2?: string | null;
    city?: string | null;
    province?: string | null;
    postalCode?: string | null;
    country: { id: string; code: string; name: string };
    phoneNumber?: string | null;
    defaultShippingAddress?: boolean | null;
    defaultBillingAddress?: boolean | null;
}

interface AddressesClientProps {
    addresses: CustomerAddress[];
    countries: Country[];
}

export function AddressesClient({ addresses: serverAddresses, countries: serverCountries }: AddressesClientProps) {
    const router = useRouter();
    const [clientAddresses, setClientAddresses] = useState<CustomerAddress[]>(serverAddresses);
    const [clientCountries, setClientCountries] = useState<Country[]>(serverCountries);
    const [loading, setLoading] = useState(!serverAddresses.length && !serverCountries.length);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingAddress, setEditingAddress] = useState<CustomerAddress | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [addressToDelete, setAddressToDelete] = useState<string | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [settingDefault, setSettingDefault] = useState<{ id: string; type: 'shipping' | 'billing' } | null>(null);

    const addresses = clientAddresses.length > 0 || serverAddresses.length > 0 ? (clientAddresses.length > 0 ? clientAddresses : serverAddresses) : clientAddresses;
    const countries = clientCountries.length > 0 || serverCountries.length > 0 ? (clientCountries.length > 0 ? clientCountries : serverCountries) : clientCountries;

    useEffect(() => {
        if (serverAddresses.length > 0 && serverCountries.length > 0) {
            setLoading(false);
            return;
        }
        const fetchData = async () => {
            try {
                const shopApiUrl = process.env.NEXT_PUBLIC_VENDURE_SHOP_API_URL || 'http://127.0.0.1:3000/shop-api';
                const [addrRes, ctryRes] = await Promise.all([
                    fetch(shopApiUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify({ query: 'query { activeCustomer { addresses { id fullName company streetLine1 streetLine2 city province postalCode phoneNumber defaultShippingAddress defaultBillingAddress country { id code name } } } }' }) }),
                    fetch(shopApiUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ query: 'query { availableCountries { id code name } }' }) }),
                ]);
                const addrData = await addrRes.json();
                const ctryData = await ctryRes.json();
                setClientAddresses(addrData.data?.activeCustomer?.addresses || []);
                setClientCountries(ctryData.data?.availableCountries || []);
            } catch (e) {
                console.error('Failed to fetch addresses:', e);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const handleAddNew = () => {
        setEditingAddress(null);
        setDialogOpen(true);
    };

    const handleEdit = (address: CustomerAddress) => {
        setEditingAddress(address);
        setDialogOpen(true);
    };

    const handleDelete = (addressId: string) => {
        setAddressToDelete(addressId);
        setDeleteDialogOpen(true);
    };

   const handleSetDefaultShipping = async (addressId: string) => {
    setSettingDefault({ id: addressId, type: 'shipping' });

    try {
        console.log('TEMP set default shipping:', addressId);

        router.refresh();
    } catch (error) {
        console.error('Error setting default shipping address:', error);
    } finally {
        setSettingDefault(null);
    }
    };

    const handleSetDefaultBilling = async (addressId: string) => {
        setSettingDefault({ id: addressId, type: 'billing' });

        try {
            console.log('TEMP set default billing:', addressId);

            router.refresh();
        } catch (error) {
            console.error('Error setting default billing address:', error);
        } finally {
            setSettingDefault(null);
        }
    };

    const confirmDelete = async () => {
        if (!addressToDelete) return;

        setIsDeleting(true);

        try {
            console.log('TEMP delete address:', addressToDelete);

            setDeleteDialogOpen(false);
            setAddressToDelete(null);

            router.refresh();
        } catch (error) {
            console.error('Error deleting address:', error);
        } finally {
            setIsDeleting(false);
        }
    };

    const handleSubmit = async (data: any) => {
        setIsSubmitting(true);

        try {
            console.log('TEMP submit address:', data);

            setDialogOpen(false);
            setEditingAddress(null);

            router.refresh();
        } catch (error) {
            console.error('Error saving address:', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <>
            <div className="flex justify-between items-center">
                <div></div>
                <Button onClick={handleAddNew}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add new address
                </Button>
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary" />
                </div>
            ) : addresses.length === 0 ? (
                <Card>
                    <CardContent className="py-12 text-center">
                        <p className="text-muted-foreground mb-4">No addresses saved yet</p>
                        <Button onClick={handleAddNew}>
                            <Plus className="mr-2 h-4 w-4" />
                            Add your first address
                        </Button>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {addresses.map((address) => (
                        <Card key={address.id}>
                            <CardHeader>
                                <div className="flex items-start justify-between">
                                    <div className="space-y-1 flex-1">
                                        <CardTitle className="text-lg">{address.fullName}</CardTitle>
                                        {(address.defaultShippingAddress || address.defaultBillingAddress) && (
                                            <div className="flex gap-2">
                                                {address.defaultShippingAddress && (
                                                    <Badge variant="secondary">Default Shipping</Badge>
                                                )}
                                                {address.defaultBillingAddress && (
                                                    <Badge variant="secondary">Default Billing</Badge>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                aria-label="Address actions"
                                            >
                                                <MoreVertical className="h-4 w-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuItem onClick={() => handleEdit(address)}>
                                                <Edit2 className="mr-2 h-4 w-4" />
                                                Edit
                                            </DropdownMenuItem>
                                            <DropdownMenuSeparator />
                                            <DropdownMenuItem
                                                onClick={() => handleSetDefaultShipping(address.id)}
                                                disabled={
                                                    address.defaultShippingAddress ||
                                                    (settingDefault?.id === address.id && settingDefault?.type === 'shipping')
                                                }
                                            >
                                                <Home className="mr-2 h-4 w-4" />
                                                {address.defaultShippingAddress ? 'Default Shipping' : 'Set as Shipping'}
                                            </DropdownMenuItem>
                                            <DropdownMenuItem
                                                onClick={() => handleSetDefaultBilling(address.id)}
                                                disabled={
                                                    address.defaultBillingAddress ||
                                                    (settingDefault?.id === address.id && settingDefault?.type === 'billing')
                                                }
                                            >
                                                <CreditCard className="mr-2 h-4 w-4" />
                                                {address.defaultBillingAddress ? 'Default Billing' : 'Set as Billing'}
                                            </DropdownMenuItem>
                                            <DropdownMenuSeparator />
                                            <DropdownMenuItem
                                                onClick={() => handleDelete(address.id)}
                                                className="text-destructive focus:text-destructive"
                                            >
                                                <Trash2 className="mr-2 h-4 w-4 text-destructive" />
                                                Delete
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="text-sm text-muted-foreground space-y-1">
                                    {address.company && <p>{address.company}</p>}
                                    <p>
                                        {address.streetLine1}
                                        {address.streetLine2 && `, ${address.streetLine2}`}
                                    </p>
                                    <p>
                                        {address.city}, {address.province} {address.postalCode}
                                    </p>
                                    <p>{address.country.name}</p>
                                    <p>{address.phoneNumber}</p>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>{editingAddress ? 'Edit address' : 'Add new address'}</DialogTitle>
                        <DialogDescription>
                            {editingAddress
                                ? 'Update the details of your address'
                                : 'Fill in the form below to add a new address'}
                        </DialogDescription>
                    </DialogHeader>
                    <AddressForm
                        countries={countries}
                        address={editingAddress || undefined}
                        onSubmit={handleSubmit}
                        onCancel={() => {
                            setDialogOpen(false);
                            setEditingAddress(null);
                        }}
                        isSubmitting={isSubmitting}
                    />
                </DialogContent>
            </Dialog>

            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete this address.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmDelete} disabled={isDeleting}>
                            {isDeleting ? 'Deleting...' : 'Delete'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
