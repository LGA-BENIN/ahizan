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
import { getShopApiUrl } from '@/lib/vendure/api-utils';
import { toast } from 'sonner';

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
                const shopApiUrl = getShopApiUrl();
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
            await setDefaultShippingAddress(addressId);
            toast.success('Adresse de livraison par défaut mise à jour');
            router.refresh();
        } catch (error) {
            console.error('Error setting default shipping address:', error);
            toast.error('Erreur lors de la définition de l\'adresse de livraison par défaut');
        } finally {
            setSettingDefault(null);
        }
    };

    const handleSetDefaultBilling = async (addressId: string) => {
        setSettingDefault({ id: addressId, type: 'billing' });

        try {
            await setDefaultBillingAddress(addressId);
            toast.success('Adresse de facturation par défaut mise à jour');
            router.refresh();
        } catch (error) {
            console.error('Error setting default billing address:', error);
            toast.error('Erreur lors de la définition de l\'adresse de facturation par défaut');
        } finally {
            setSettingDefault(null);
        }
    };

    const confirmDelete = async () => {
        if (!addressToDelete) return;

        setIsDeleting(true);

        try {
            await deleteAddress(addressToDelete);
            toast.success('Adresse supprimée avec succès');
            setDeleteDialogOpen(false);
            setAddressToDelete(null);
            router.refresh();
        } catch (error) {
            console.error('Error deleting address:', error);
            toast.error('Erreur lors de la suppression de l\'adresse');
        } finally {
            setIsDeleting(false);
        }
    };

    const handleSubmit = async (data: any) => {
        setIsSubmitting(true);

        try {
            if (editingAddress) {
                await updateAddress({ ...data, id: editingAddress.id });
                toast.success('Adresse mise à jour avec succès');
            } else {
                await createAddress(data);
                toast.success('Adresse ajoutée avec succès');
            }
            setDialogOpen(false);
            setEditingAddress(null);
            router.refresh();
        } catch (error) {
            console.error('Error saving address:', error);
            toast.error('Erreur lors de l\'enregistrement de l\'adresse');
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
                    Ajouter une adresse
                </Button>
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary" />
                </div>
            ) : addresses.length === 0 ? (
                <Card>
                    <CardContent className="py-12 text-center">
                        <p className="text-muted-foreground mb-4">Aucune adresse enregistrée pour le moment</p>
                        <Button onClick={handleAddNew}>
                            <Plus className="mr-2 h-4 w-4" />
                            Ajouter votre première adresse
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
                                                    <Badge variant="secondary">Livraison par défaut</Badge>
                                                )}
                                                {address.defaultBillingAddress && (
                                                    <Badge variant="secondary">Facturation par défaut</Badge>
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
                                                Modifier
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
                                                {address.defaultShippingAddress ? 'Livraison par défaut' : 'Définir pour la livraison'}
                                            </DropdownMenuItem>
                                            <DropdownMenuItem
                                                onClick={() => handleSetDefaultBilling(address.id)}
                                                disabled={
                                                    address.defaultBillingAddress ||
                                                    (settingDefault?.id === address.id && settingDefault?.type === 'billing')
                                                }
                                            >
                                                <CreditCard className="mr-2 h-4 w-4" />
                                                {address.defaultBillingAddress ? 'Facturation par défaut' : 'Définir pour la facturation'}
                                            </DropdownMenuItem>
                                            <DropdownMenuSeparator />
                                            <DropdownMenuItem
                                                onClick={() => handleDelete(address.id)}
                                                className="text-destructive focus:text-destructive"
                                            >
                                                <Trash2 className="mr-2 h-4 w-4 text-destructive" />
                                                Supprimer
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
                        <DialogTitle>{editingAddress ? "Modifier l'adresse" : "Ajouter une adresse"}</DialogTitle>
                        <DialogDescription>
                            {editingAddress
                                ? "Mettez à jour les détails de votre adresse."
                                : "Remplissez le formulaire ci-dessous pour ajouter une adresse."}
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
                        <AlertDialogTitle>Êtes-vous sûr ?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Cette action est irréversible. L'adresse sera définitivement supprimée.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isDeleting}>Annuler</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmDelete} disabled={isDeleting}>
                            {isDeleting ? 'Suppression...' : 'Supprimer'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
