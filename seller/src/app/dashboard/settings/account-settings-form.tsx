'use client';

import { useActionState, useEffect, useState } from 'react';
import { updateVendorProfileAction, changePasswordAction } from './actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { User, Store, Shield, Globe, MapPin, Truck } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AccountSettingsFormProps {
    vendor: any;
}

export function AccountSettingsForm({ vendor }: AccountSettingsFormProps) {
    const [profileState, profileAction, isProfilePending] = useActionState<any, FormData>(updateVendorProfileAction, undefined);
    const [passwordState, passwordAction, isPasswordPending] = useActionState<any, FormData>(changePasswordAction, undefined);
    const [activeTab, setActiveTab] = useState('general');

    useEffect(() => {
        const hash = window.location.hash.replace('#', '');
        if (hash && ['general', 'details', 'social', 'security'].includes(hash)) {
            setActiveTab(hash);
        }
        
        const handleHashChange = () => {
            const newHash = window.location.hash.replace('#', '');
            if (newHash && ['general', 'details', 'social', 'security'].includes(newHash)) {
                setActiveTab(newHash);
            }
        };

        window.addEventListener('hashchange', handleHashChange);
        return () => window.removeEventListener('hashchange', handleHashChange);
    }, []);

    useEffect(() => {
        if (profileState?.success) {
            toast.success('Profil mis à jour avec succès');
        } else if (profileState?.error) {
            toast.error(profileState.error);
        }
    }, [profileState]);

    useEffect(() => {
        if (passwordState?.success) {
            toast.success('Mot de passe mis à jour avec succès');
            // Reset form could be handled here if needed
        } else if (passwordState?.error) {
            toast.error(passwordState.error);
        }
    }, [passwordState]);

    return (
        <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <div className="flex flex-col md:flex-row gap-8">
                    <aside className="w-full md:w-64 shrink-0 overflow-x-auto md:overflow-visible custom-scrollbar">
                        <TabsList className="flex flex-row md:flex-col h-auto bg-transparent border-none p-0 space-x-1 md:space-x-0 md:space-y-1">
                            <TabsTrigger 
                                value="general" 
                                className="w-full justify-start gap-3 px-4 py-3 rounded-xl data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all text-muted-foreground hover:bg-muted"
                            >
                                <Store className="w-4 h-4 shrink-0" />
                                <span className="whitespace-nowrap font-bold">Boutique</span>
                            </TabsTrigger>
                            <TabsTrigger 
                                value="details" 
                                className="w-full justify-start gap-3 px-4 py-3 rounded-xl data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all text-muted-foreground hover:bg-muted"
                            >
                                <MapPin className="w-4 h-4 shrink-0" />
                                <span className="whitespace-nowrap font-bold">Localisation</span>
                            </TabsTrigger>
                            <TabsTrigger 
                                value="social" 
                                className="w-full justify-start gap-3 px-4 py-3 rounded-xl data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all text-muted-foreground hover:bg-muted"
                            >
                                <Globe className="w-4 h-4 shrink-0" />
                                <span className="whitespace-nowrap font-bold">Sociaux</span>
                            </TabsTrigger>
                            <TabsTrigger 
                                value="security" 
                                className="w-full justify-start gap-3 px-4 py-3 rounded-xl data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all text-muted-foreground hover:bg-muted"
                            >
                                <Shield className="w-4 h-4 shrink-0" />
                                <span className="whitespace-nowrap font-bold">Sécurité</span>
                            </TabsTrigger>
                        </TabsList>
                    </aside>

                    <div className="flex-1">
                        <form action={profileAction}>
                            <TabsContent value="general" className="m-0 space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                                <Card className="border border-border shadow-sm bg-card rounded-2xl md:rounded-[2rem]">
                                    <CardHeader className="p-4 sm:p-8 pb-2 sm:pb-4">
                                        <CardTitle className="text-xl md:text-2xl font-serif font-black">Informations</CardTitle>
                                        <CardDescription className="text-[10px] uppercase font-bold tracking-wider">Identité visuelle de votre boutique.</CardDescription>
                                    </CardHeader>
                                    <CardContent className="p-4 sm:p-8 pt-2 sm:pt-4 space-y-6">
                                        <div className="grid grid-cols-1 gap-6">
                                            <div className="space-y-2">
                                                <Label htmlFor="name">Nom de la boutique</Label>
                                                <Input id="name" name="name" defaultValue={vendor?.name} className="h-12 rounded-xl" />
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="description">Description professionnelle</Label>
                                                <Textarea id="description" name="description" defaultValue={vendor?.description} rows={4} className="rounded-xl resize-none" />
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="phoneNumber">Numéro de téléphone</Label>
                                                <Input id="phoneNumber" name="phoneNumber" defaultValue={vendor?.phoneNumber} className="h-12 rounded-xl" />
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                                <Button type="submit" disabled={isProfilePending} className="h-12 px-8 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold ml-auto flex">
                                    {isProfilePending ? 'Enregistrement...' : 'Enregistrer les modifications'}
                                </Button>
                            </TabsContent>

                            <TabsContent value="details" className="m-0 space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                                <Card className="border border-border shadow-sm bg-card rounded-2xl md:rounded-[2rem]">
                                    <CardHeader className="p-4 sm:p-8 pb-2 sm:pb-4">
                                        <CardTitle className="text-xl md:text-2xl font-serif font-black">Localisation</CardTitle>
                                        <CardDescription className="text-[10px] uppercase font-bold tracking-wider">Gérez votre adresse et politiques.</CardDescription>
                                    </CardHeader>
                                    <CardContent className="p-4 sm:p-8 pt-2 sm:pt-4 space-y-6">
                                        <div className="grid grid-cols-1 gap-6">
                                            <div className="space-y-2">
                                                <Label htmlFor="address">Adresse physique</Label>
                                                <Input id="address" name="address" defaultValue={vendor?.address} className="h-12 rounded-xl" />
                                            </div>
                                             <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                <div className="space-y-2">
                                                    <Label htmlFor="zone">Zone</Label>
                                                    <Input id="zone" name="zone" defaultValue={vendor?.zone} className="h-12 rounded-xl" />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label htmlFor="type">Type de vendeur</Label>
                                                    <Input id="type" name="type" defaultValue={vendor?.type} className="h-12 rounded-xl" readOnly />
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="deliveryInfo">Infos de livraison</Label>
                                                <Textarea id="deliveryInfo" name="deliveryInfo" defaultValue={vendor?.deliveryInfo} className="rounded-xl resize-none" />
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="returnPolicy">Politique de retour</Label>
                                                <Textarea id="returnPolicy" name="returnPolicy" defaultValue={vendor?.returnPolicy} className="rounded-xl resize-none" />
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                                <Button type="submit" disabled={isProfilePending} className="h-12 px-8 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold ml-auto flex">
                                    {isProfilePending ? 'Enregistrement...' : 'Enregistrer les modifications'}
                                </Button>
                            </TabsContent>

                            <TabsContent value="social" className="m-0 space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                                <Card className="border border-border shadow-sm bg-card rounded-2xl md:rounded-[2rem]">
                                    <CardHeader className="p-4 sm:p-8 pb-2 sm:pb-4">
                                        <CardTitle className="text-xl md:text-2xl font-serif font-black">Réseaux Sociaux</CardTitle>
                                        <CardDescription className="text-[10px] uppercase font-bold tracking-wider">Liez votre boutique au web.</CardDescription>
                                    </CardHeader>
                                    <CardContent className="p-4 sm:p-8 pt-2 sm:pt-4 space-y-6">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="space-y-2">
                                                <Label htmlFor="website">Site Web</Label>
                                                <Input id="website" name="website" placeholder="https://..." defaultValue={vendor?.website} className="h-12 rounded-xl" />
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="facebook">Facebook</Label>
                                                <Input id="facebook" name="facebook" placeholder="Nom d'utilisateur" defaultValue={vendor?.facebook} className="h-12 rounded-xl" />
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="instagram">Instagram</Label>
                                                <Input id="instagram" name="instagram" placeholder="Nom d'utilisateur" defaultValue={vendor?.instagram} className="h-12 rounded-xl" />
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                                <Button type="submit" disabled={isProfilePending} className="h-12 px-8 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold ml-auto flex">
                                    {isProfilePending ? 'Enregistrement...' : 'Enregistrer les modifications'}
                                </Button>
                            </TabsContent>
                        </form>

                        <TabsContent value="security" className="m-0 space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                            <form action={passwordAction} className="space-y-6">
                                <Card className="border border-border shadow-sm bg-card rounded-2xl md:rounded-[2rem]">
                                    <CardHeader className="p-4 sm:p-8 pb-2 sm:pb-4">
                                        <CardTitle className="text-xl md:text-2xl font-serif font-black">Sécurité</CardTitle>
                                        <CardDescription className="text-[10px] uppercase font-bold tracking-wider">Sécurisez votre accès.</CardDescription>
                                    </CardHeader>
                                    <CardContent className="p-4 sm:p-8 pt-2 sm:pt-4 space-y-6">
                                        <div className="grid grid-cols-1 gap-6 max-w-md">
                                            <div className="space-y-2">
                                                <Label htmlFor="currentPassword">Mot de passe actuel</Label>
                                                <Input id="currentPassword" name="currentPassword" type="password" className="h-12 rounded-xl" />
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="newPassword">Nouveau mot de passe</Label>
                                                <Input id="newPassword" name="newPassword" type="password" className="h-12 rounded-xl" />
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="confirmPassword">Confirmer le mot de passe</Label>
                                                <Input id="confirmPassword" name="confirmPassword" type="password" className="h-12 rounded-xl" />
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                                <Button type="submit" disabled={isPasswordPending} className="h-12 px-8 rounded-xl bg-brand-navy hover:bg-brand-navy/90 text-white font-bold ml-auto flex">
                                    {isPasswordPending ? 'Mise à jour...' : 'Changer le mot de passe'}
                                </Button>
                            </form>
                        </TabsContent>
                    </div>
                </div>
            </Tabs>
        </div>
    );
}
