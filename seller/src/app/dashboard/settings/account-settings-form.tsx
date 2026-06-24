'use client';

import { useActionState, useEffect, useState, useRef, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { updateVendorProfileAction, changePasswordAction } from './actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Store, Shield, Globe, MapPin, Palette, Contact, Eye, CheckCircle2, RefreshCw, UploadCloud, Save } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AccountSettingsFormProps {
    vendor: any;
}

export function AccountSettingsForm({ vendor }: AccountSettingsFormProps) {
    const router = useRouter();
    const [profileState, profileAction, isProfilePending] = useActionState<any, FormData>(updateVendorProfileAction, undefined);
    const [passwordState, passwordAction, isPasswordPending] = useActionState<any, FormData>(changePasswordAction, undefined);
    const [activeTab, setActiveTab] = useState('general');
    
    // Form dirtiness tracking
    const [isDirty, setIsDirty] = useState(false);
    const formRef = useRef<HTMLFormElement>(null);
    const initialValuesRef = useRef<Record<string, string>>({});

    // Visual Identity States (Banner & Logo previews)
    const [bannerUrl, setBannerUrl] = useState<string>(vendor?.coverImage?.preview || 'https://lh3.googleusercontent.com/aida-public/AB6AXuB1uy1r93iwW9yNwkvjtjWpQtp-WgvPOWIixujkgolgJIoBIU2X528DvC-jLmqSQ5Uh5fcB-dh7kYg0MAcp3w3UeamQXVijk2sT1l9z8FC8ntzmQV_z4iuaFKQW-a5ReSPqA17DF6kl3OW6TdKjbGLECaSd_NJTOAr6BLAVSy16icuB2d23RDvBCBm6-jcImg5t0KR1KrW9cyJh2ld6C4Rj8nwpqYmYDyxSVEDcAAYYDmzWK7hldASxynb4Ms4djh7tHG_RHDWReJfV');
    const [logoUrl, setLogoUrl] = useState<string>(vendor?.logo?.preview || '');
    const [isPublic, setIsPublic] = useState(true);

    const bannerInputRef = useRef<HTMLInputElement>(null);
    const logoInputRef = useRef<HTMLInputElement>(null);

    // Capture initial values for dirty state comparison
    useEffect(() => {
        if (vendor) {
            const vals = {
                name: vendor.name || '',
                description: vendor.description || '',
                phoneNumber: vendor.phoneNumber || '',
                address: vendor.address || '',
                zone: vendor.zone || '',
                deliveryInfo: vendor.deliveryInfo || '',
                returnPolicy: vendor.returnPolicy || '',
                website: vendor.website || '',
                facebook: vendor.facebook || '',
                instagram: vendor.instagram || '',
            };
            initialValuesRef.current = vals;
        }
    }, [vendor]);

    // Handle hash change for tabs navigation
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

    // Form modification detection
    const handleFormChange = () => {
        if (!formRef.current) return;
        const formData = new FormData(formRef.current);
        
        let dirty = false;
        for (const [key, value] of Object.entries(initialValuesRef.current)) {
            const currentValue = formData.get(key) as string;
            if (currentValue !== null && currentValue !== value) {
                dirty = true;
                break;
            }
        }
        setIsDirty(dirty);
    };

    // Actions state feedback
    useEffect(() => {
        if (profileState?.success) {
            toast.success('Profil mis à jour avec succès');
            setIsDirty(false);
            router.refresh();
        } else if (profileState?.error) {
            toast.error(profileState.error);
        }
    }, [profileState, router]);

    useEffect(() => {
        if (passwordState?.success) {
            toast.success('Mot de passe mis à jour avec succès');
            // Reset fields
            if (formRef.current) {
                const currentPass = formRef.current.querySelector('#currentPassword') as HTMLInputElement;
                const newPass = formRef.current.querySelector('#newPassword') as HTMLInputElement;
                const confirmPass = formRef.current.querySelector('#confirmPassword') as HTMLInputElement;
                if (currentPass) currentPass.value = '';
                if (newPass) newPass.value = '';
                if (confirmPass) confirmPass.value = '';
            }
            router.refresh();
        } else if (passwordState?.error) {
            toast.error(passwordState.error);
        }
    }, [passwordState, router]);

    // File upload previews (simulated client side for instant premium feel)
    const handleBannerFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const url = URL.createObjectURL(file);
            setBannerUrl(url);
            setIsDirty(true);
            toast.success('Bannière chargée temporairement (Aperçu)');
        }
    };

    const handleLogoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const url = URL.createObjectURL(file);
            setLogoUrl(url);
            setIsDirty(true);
            toast.success('Logo chargé temporairement (Aperçu)');
        }
    };

    const triggerBannerUpload = () => bannerInputRef.current?.click();
    const triggerLogoUpload = () => logoInputRef.current?.click();

    // Trigger form submit via float footer
    const handleSaveClick = () => {
        if (formRef.current) {
            formRef.current.requestSubmit();
        }
    };

    const handleCancelClick = () => {
        if (formRef.current) {
            // Reset inputs to initial values
            for (const [key, value] of Object.entries(initialValuesRef.current)) {
                const input = formRef.current.querySelector(`[name="${key}"]`) as HTMLInputElement | HTMLTextAreaElement;
                if (input) input.value = value;
            }
            setIsDirty(false);
            toast.info('Modifications annulées');
        }
    };

    return (
        <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 relative">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <div className="flex flex-col lg:flex-row gap-8">
                    
                    {/* Left Navigation Menu */}
                    <aside className="w-full lg:w-52 shrink-0 overflow-x-auto lg:overflow-visible custom-scrollbar">
                        <TabsList className="flex flex-row lg:flex-col h-auto bg-transparent border-none p-0 space-x-1 lg:space-x-0 lg:space-y-1">
                            <TabsTrigger 
                                value="general" 
                                className="w-full justify-start gap-3 px-4 py-3 rounded-xl data-[state=active]:bg-primary data-[state=active]:text-white transition-all text-muted-foreground hover:bg-muted font-bold text-xs uppercase tracking-wider"
                            >
                                <Store className="w-4 h-4 shrink-0" />
                                <span className="whitespace-nowrap">Boutique</span>
                            </TabsTrigger>
                            <TabsTrigger 
                                value="details" 
                                className="w-full justify-start gap-3 px-4 py-3 rounded-xl data-[state=active]:bg-primary data-[state=active]:text-white transition-all text-muted-foreground hover:bg-muted font-bold text-xs uppercase tracking-wider"
                            >
                                <MapPin className="w-4 h-4 shrink-0" />
                                <span className="whitespace-nowrap">Localisation</span>
                            </TabsTrigger>
                            <TabsTrigger 
                                value="social" 
                                className="w-full justify-start gap-3 px-4 py-3 rounded-xl data-[state=active]:bg-primary data-[state=active]:text-white transition-all text-muted-foreground hover:bg-muted font-bold text-xs uppercase tracking-wider"
                            >
                                <Globe className="w-4 h-4 shrink-0" />
                                <span className="whitespace-nowrap">Sociaux</span>
                            </TabsTrigger>
                            <TabsTrigger 
                                value="security" 
                                className="w-full justify-start gap-3 px-4 py-3 rounded-xl data-[state=active]:bg-primary data-[state=active]:text-white transition-all text-muted-foreground hover:bg-muted font-bold text-xs uppercase tracking-wider"
                            >
                                <Shield className="w-4 h-4 shrink-0" />
                                <span className="whitespace-nowrap">Sécurité</span>
                            </TabsTrigger>
                        </TabsList>
                    </aside>

                    {/* Middle Bento Form Fields (7 Cols equivalent) */}
                    <div className="flex-1 min-w-0">
                        <form ref={formRef} action={profileAction} onChange={handleFormChange} encType="multipart/form-data">
                            
                            {/* Tab 1: Identity/General */}
                            <TabsContent value="general" className="m-0 space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                                
                                {/* Visual Identity Card */}
                                <Card className="border border-border shadow-sm bg-card rounded-2xl md:rounded-[2rem] overflow-hidden">
                                    <CardHeader className="p-6 sm:p-8 pb-4">
                                        <CardTitle className="text-xl md:text-2xl font-serif font-black flex items-center gap-2">
                                            <Palette className="w-5 h-5 text-primary" />
                                            Identité visuelle de votre boutique
                                        </CardTitle>
                                        <CardDescription className="text-[10px] uppercase font-black tracking-wider text-muted-foreground">
                                            Gérez la bannière et le logo public.
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent className="p-6 sm:p-8 pt-0 space-y-6">
                                        
                                        {/* Banner Upload Section */}
                                        <div className="relative">
                                            <label className="block text-[10px] font-black uppercase mb-2 text-muted-foreground tracking-wider">
                                                Bannière de la boutique
                                            </label>
                                            <div 
                                                onClick={triggerBannerUpload}
                                                className="w-full h-44 rounded-xl bg-muted overflow-hidden group relative cursor-pointer border border-border border-dashed hover:border-primary/50 transition-all"
                                            >
                                                <div 
                                                    className="w-full h-full bg-cover bg-center opacity-70 group-hover:opacity-50 transition-opacity" 
                                                    style={{ backgroundImage: `url('${bannerUrl}')` }}
                                                />
                                                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                                    <UploadCloud className="w-8 h-8 text-foreground/80 group-hover:scale-110 transition-transform duration-300" />
                                                    <span className="text-xs font-bold text-foreground mt-2 bg-card/80 px-3 py-1.5 rounded-lg border shadow-sm">
                                                        Cliquez pour charger une bannière
                                                    </span>
                                                </div>
                                                <input 
                                                    type="file" 
                                                    ref={bannerInputRef} 
                                                    onChange={handleBannerFileChange} 
                                                    accept="image/*" 
                                                    className="hidden" 
                                                    name="coverImage"
                                                />
                                            </div>
                                        </div>

                                        <div className="flex flex-col sm:flex-row gap-6 items-start">
                                            
                                            {/* Logo Upload Section */}
                                            <div className="flex-shrink-0 w-full sm:w-auto">
                                                <label className="block text-[10px] font-black uppercase mb-2 text-muted-foreground tracking-wider">
                                                    Logo
                                                </label>
                                                <div 
                                                    onClick={triggerLogoUpload}
                                                    className="w-32 h-32 mx-auto sm:mx-0 rounded-2xl bg-muted border border-border border-dashed flex items-center justify-center cursor-pointer group hover:border-primary/50 transition-all overflow-hidden relative shadow-inner"
                                                >
                                                    {logoUrl ? (
                                                        <img src={logoUrl} alt="Logo Preview" className="w-full h-full object-cover" />
                                                    ) : (
                                                        <div className="flex flex-col items-center justify-center text-muted-foreground text-center p-2">
                                                            <UploadCloud className="w-6 h-6 mb-1 text-muted-foreground group-hover:text-primary transition-colors" />
                                                            <span className="text-[9px] font-bold uppercase tracking-wider">Logo 128x128</span>
                                                        </div>
                                                    )}
                                                    <div className="absolute inset-0 bg-primary/10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <span className="text-[10px] font-black text-primary uppercase tracking-widest bg-white/90 px-2 py-1 rounded border shadow-sm">Modifier</span>
                                                    </div>
                                                    <input 
                                                        type="file" 
                                                        ref={logoInputRef} 
                                                        onChange={handleLogoFileChange} 
                                                        accept="image/*" 
                                                        className="hidden" 
                                                        name="logo"
                                                    />
                                                </div>
                                            </div>

                                            {/* Core Info Inputs with micro-animations */}
                                            <div className="flex-1 w-full space-y-6">
                                                <div className="space-y-2 group">
                                                    <Label htmlFor="name" className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Nom de la boutique</Label>
                                                    <Input 
                                                        id="name" 
                                                        name="name" 
                                                        defaultValue={vendor?.name} 
                                                        className="h-12 rounded-xl bg-card border-border focus-visible:ring-2 focus-visible:ring-primary/10 transition-all duration-300 focus-visible:scale-[1.01]" 
                                                    />
                                                </div>
                                                <div className="space-y-2 group">
                                                    <Label htmlFor="description" className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Description professionnelle</Label>
                                                    <Textarea 
                                                        id="description" 
                                                        name="description" 
                                                        defaultValue={vendor?.description} 
                                                        rows={4} 
                                                        className="rounded-xl bg-card border-border resize-none focus-visible:ring-2 focus-visible:ring-primary/10 transition-all duration-300 focus-visible:scale-[1.01]" 
                                                        placeholder="Décrivez l'activité, l'expertise et la vision de votre boutique..."
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                    </CardContent>
                                </Card>

                                {/* Contact Card */}
                                <Card className="border border-border shadow-sm bg-card rounded-2xl md:rounded-[2rem]">
                                    <CardHeader className="p-6 sm:p-8 pb-4">
                                        <CardTitle className="text-xl md:text-2xl font-serif font-black flex items-center gap-2">
                                            <Contact className="w-5 h-5 text-primary" />
                                            Coordonnées
                                        </CardTitle>
                                        <CardDescription className="text-[10px] uppercase font-black tracking-wider text-muted-foreground">
                                            Informations de contact public et marchand.
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent className="p-6 sm:p-8 pt-0">
                                        <div className="space-y-2">
                                            <Label htmlFor="phoneNumber" className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Téléphone de contact</Label>
                                            <Input 
                                                id="phoneNumber" 
                                                name="phoneNumber" 
                                                type="tel"
                                                defaultValue={vendor?.phoneNumber} 
                                                className="h-12 rounded-xl bg-card border-border focus-visible:ring-2 focus-visible:ring-primary/10 transition-all duration-300 focus-visible:scale-[1.01]" 
                                            />
                                        </div>
                                    </CardContent>
                                </Card>

                            </TabsContent>

                            {/* Tab 2: Location/Details */}
                            <TabsContent value="details" className="m-0 space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                                <Card className="border border-border shadow-sm bg-card rounded-2xl md:rounded-[2rem]">
                                    <CardHeader className="p-6 sm:p-8 pb-4">
                                        <CardTitle className="text-xl md:text-2xl font-serif font-black flex items-center gap-2">
                                            <MapPin className="w-5 h-5 text-primary" />
                                            Localisation & Expéditions
                                        </CardTitle>
                                        <CardDescription className="text-[10px] uppercase font-black tracking-wider text-muted-foreground">
                                            Gérez votre adresse physique et vos politiques.
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent className="p-6 sm:p-8 pt-0 space-y-6">
                                        <div className="space-y-6">
                                            <div className="space-y-2">
                                                <Label htmlFor="address" className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Adresse de la boutique</Label>
                                                <Input 
                                                    id="address" 
                                                    name="address" 
                                                    defaultValue={vendor?.address} 
                                                    className="h-12 rounded-xl bg-card border-border focus-visible:ring-2 focus-visible:ring-primary/10 transition-all duration-300 focus-visible:scale-[1.01]" 
                                                />
                                            </div>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                <div className="space-y-2">
                                                    <Label htmlFor="zone" className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Zone géographique (Ville, Pays)</Label>
                                                    <Input 
                                                        id="zone" 
                                                        name="zone" 
                                                        defaultValue={vendor?.zone} 
                                                        className="h-12 rounded-xl bg-card border-border focus-visible:ring-2 focus-visible:ring-primary/10 transition-all duration-300 focus-visible:scale-[1.01]" 
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label htmlFor="type" className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Type de marchand</Label>
                                                    <Input 
                                                        id="type" 
                                                        name="type" 
                                                        defaultValue={vendor?.type || 'ONLINE'} 
                                                        className="h-12 rounded-xl bg-muted/60 text-muted-foreground border-border cursor-not-allowed font-bold text-xs tracking-wider" 
                                                        readOnly 
                                                    />
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="deliveryInfo" className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Politiques et informations de livraison</Label>
                                                <Textarea 
                                                    id="deliveryInfo" 
                                                    name="deliveryInfo" 
                                                    defaultValue={vendor?.deliveryInfo} 
                                                    rows={3} 
                                                    className="rounded-xl bg-card border-border resize-none focus-visible:ring-2 focus-visible:ring-primary/10 transition-all duration-300 focus-visible:scale-[1.01]" 
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="returnPolicy" className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Politique de retour et remboursement</Label>
                                                <Textarea 
                                                    id="returnPolicy" 
                                                    name="returnPolicy" 
                                                    defaultValue={vendor?.returnPolicy} 
                                                    rows={3} 
                                                    className="rounded-xl bg-card border-border resize-none focus-visible:ring-2 focus-visible:ring-primary/10 transition-all duration-300 focus-visible:scale-[1.01]" 
                                                />
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </TabsContent>

                            {/* Tab 3: Social/Web */}
                            <TabsContent value="social" className="m-0 space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                                <Card className="border border-border shadow-sm bg-card rounded-2xl md:rounded-[2rem]">
                                    <CardHeader className="p-6 sm:p-8 pb-4">
                                        <CardTitle className="text-xl md:text-2xl font-serif font-black flex items-center gap-2">
                                            <Globe className="w-5 h-5 text-primary" />
                                            Liens & Réseaux Sociaux
                                        </CardTitle>
                                        <CardDescription className="text-[10px] uppercase font-black tracking-wider text-muted-foreground">
                                            Associez votre e-boutique à vos canaux digitaux.
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent className="p-6 sm:p-8 pt-0 space-y-6">
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                            <div className="space-y-2">
                                                <Label htmlFor="website" className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Site Internet officiel</Label>
                                                <Input 
                                                    id="website" 
                                                    name="website" 
                                                    placeholder="https://www.votresite.com"
                                                    defaultValue={vendor?.website} 
                                                    className="h-12 rounded-xl bg-card border-border focus-visible:ring-2 focus-visible:ring-primary/10 transition-all duration-300 focus-visible:scale-[1.01]" 
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="facebook" className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Page Facebook (URL)</Label>
                                                <Input 
                                                    id="facebook" 
                                                    name="facebook" 
                                                    placeholder="https://facebook.com/nom_boutique"
                                                    defaultValue={vendor?.facebook} 
                                                    className="h-12 rounded-xl bg-card border-border focus-visible:ring-2 focus-visible:ring-primary/10 transition-all duration-300 focus-visible:scale-[1.01]" 
                                                />
                                            </div>
                                            <div className="space-y-2 sm:col-span-2">
                                                <Label htmlFor="instagram" className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Compte Instagram (URL)</Label>
                                                <Input 
                                                    id="instagram" 
                                                    name="instagram" 
                                                    placeholder="https://instagram.com/nom_boutique"
                                                    defaultValue={vendor?.instagram} 
                                                    className="h-12 rounded-xl bg-card border-border focus-visible:ring-2 focus-visible:ring-primary/10 transition-all duration-300 focus-visible:scale-[1.01]" 
                                                />
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </TabsContent>
                        </form>

                        {/* Tab 4: Security (handled via its own form submission) */}
                        <TabsContent value="security" className="m-0 space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                            <form action={passwordAction} className="space-y-6">
                                <Card className="border border-border shadow-sm bg-card rounded-2xl md:rounded-[2rem]">
                                    <CardHeader className="p-6 sm:p-8 pb-4">
                                        <CardTitle className="text-xl md:text-2xl font-serif font-black flex items-center gap-2">
                                            <Shield className="w-5 h-5 text-primary" />
                                            Sécurité du compte
                                        </CardTitle>
                                        <CardDescription className="text-[10px] uppercase font-black tracking-wider text-muted-foreground">
                                            Mettez à jour vos identifiants de connexion.
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent className="p-6 sm:p-8 pt-0 space-y-6">
                                        <div className="grid grid-cols-1 gap-6 max-w-md">
                                            <div className="space-y-2">
                                                <Label htmlFor="currentPassword" className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Mot de passe actuel</Label>
                                                <Input 
                                                    id="currentPassword" 
                                                    name="currentPassword" 
                                                    type="password" 
                                                    className="h-12 rounded-xl bg-card border-border focus-visible:ring-2 focus-visible:ring-primary/10 transition-all duration-300 focus-visible:scale-[1.01]" 
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="newPassword" className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Nouveau mot de passe</Label>
                                                <Input 
                                                    id="newPassword" 
                                                    name="newPassword" 
                                                    type="password" 
                                                    className="h-12 rounded-xl bg-card border-border focus-visible:ring-2 focus-visible:ring-primary/10 transition-all duration-300 focus-visible:scale-[1.01]" 
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="confirmPassword" className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Confirmer le nouveau mot de passe</Label>
                                                <Input 
                                                    id="confirmPassword" 
                                                    name="confirmPassword" 
                                                    type="password" 
                                                    className="h-12 rounded-xl bg-card border-border focus-visible:ring-2 focus-visible:ring-primary/10 transition-all duration-300 focus-visible:scale-[1.01]" 
                                                />
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                                <Button 
                                    type="submit" 
                                    disabled={isPasswordPending} 
                                    className="h-12 px-8 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold ml-auto flex items-center gap-2 uppercase text-[10px] tracking-widest transition-all active:scale-95 shadow-md"
                                >
                                    {isPasswordPending ? (
                                        <>
                                            <RefreshCw className="w-4 h-4 animate-spin" />
                                            Mise à jour...
                                        </>
                                    ) : (
                                        'Changer le mot de passe'
                                    )}
                                </Button>
                            </form>
                        </TabsContent>
                    </div>

                    {/* Right Sidebar Column (4 Cols equivalent) */}
                    <aside className="w-full lg:w-72 space-y-6">
                        
                        {/* Shop Status Card */}
                        <Card className="border border-border shadow-sm bg-card rounded-2xl overflow-hidden">
                            <CardHeader className="p-5 pb-3">
                                <h3 className="text-sm font-black uppercase tracking-wider text-foreground">Statut de la boutique</h3>
                            </CardHeader>
                            <CardContent className="p-5 pt-0 space-y-4">
                                <div className="flex items-center justify-between p-3.5 bg-muted/40 rounded-xl border border-border/50">
                                    <span className="text-xs font-semibold text-foreground">Visibilité publique</span>
                                    
                                    {/* Toggle Switch */}
                                    <button 
                                        type="button"
                                        onClick={() => {
                                            setIsPublic(!isPublic);
                                            toast.info(isPublic ? 'Boutique masquée du public (simulation)' : 'Boutique mise en ligne (simulation)');
                                        }}
                                        className={cn(
                                            "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none",
                                            isPublic ? "bg-primary" : "bg-slate-250 dark:bg-slate-800"
                                        )}
                                    >
                                        <span 
                                            className={cn(
                                                "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
                                                isPublic ? "translate-x-5" : "translate-x-0"
                                            )}
                                        />
                                    </button>
                                </div>
                                <div className="p-4 bg-tertiary/5 text-tertiary rounded-xl border border-tertiary/10 text-xs leading-relaxed font-medium">
                                    Votre boutique est actuellement en ligne. Toutes les modifications textuelles et réseaux s'appliqueront instantanément au profil public.
                                </div>
                            </CardContent>
                        </Card>

                        {/* Public Preview Card */}
                        <Card className="border border-border shadow-sm bg-card rounded-2xl overflow-hidden text-center p-6 flex flex-col items-center">
                            <h3 className="text-xs font-black uppercase tracking-wider text-muted-foreground mb-5 self-start">Aperçu rapide</h3>
                            <div className="w-20 h-20 rounded-full bg-muted shadow-inner mb-4 flex items-center justify-center overflow-hidden border border-border/75">
                                {logoUrl ? (
                                    <img src={logoUrl} alt="Store logo" className="w-full h-full object-cover" />
                                ) : (
                                    <span className="text-lg font-black text-muted-foreground">
                                        {vendor?.name ? vendor.name.substring(0, 2).toUpperCase() : 'AH'}
                                    </span>
                                )}
                            </div>
                            <div className="font-serif font-black text-base text-foreground leading-tight">{vendor?.name || 'Boutique'}</div>
                            <div className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider mt-1 flex items-center gap-1">
                                <MapPin className="w-3.5 h-3.5 text-primary" />
                                {vendor?.zone || 'Bénin'}
                            </div>
                            
                            <Button 
                                variant="link" 
                                className="text-primary font-bold text-xs uppercase tracking-wider mt-5 hover:underline flex items-center gap-1.5"
                                onClick={() => toast.info('Affichage du profil public')}
                            >
                                <Eye className="w-4 h-4" />
                                Voir mon profil public
                            </Button>
                        </Card>
                    </aside>

                </div>
            </Tabs>

            {/* Floating Action Footer (Stitch) */}
            <footer 
                className={cn(
                    "fixed bottom-8 left-[calc(260px+50%)] -translate-x-1/2 z-50 flex justify-center w-full max-w-2xl px-6 transition-all duration-500 ease-in-out transform pointer-events-none",
                    isDirty 
                        ? "translate-y-0 opacity-100" 
                        : "translate-y-20 opacity-0"
                )}
            >
                <div className="bg-slate-900/95 dark:bg-card/95 backdrop-blur-xl border border-slate-800/80 dark:border-border shadow-2xl px-6 py-4 rounded-2xl flex items-center justify-between gap-8 pointer-events-auto w-full">
                    <p className="text-xs font-bold text-slate-350 dark:text-muted-foreground hidden md:block">
                        Vous avez des modifications non enregistrées.
                    </p>
                    <div className="flex gap-3 w-full md:w-auto justify-end">
                        <button 
                            type="button"
                            onClick={handleCancelClick}
                            className="px-5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider text-slate-300 hover:text-white hover:bg-white/5 transition-all"
                        >
                            Annuler
                        </button>
                        <Button 
                            onClick={handleSaveClick}
                            disabled={isProfilePending}
                            className="px-6 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold text-xs uppercase tracking-widest shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-2"
                        >
                            {isProfilePending ? (
                                <>
                                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                    Enregistrement...
                                </>
                            ) : (
                                <>
                                    <Save className="w-3.5 h-3.5" />
                                    Enregistrer
                                </>
                            )}
                        </Button>
                    </div>
                </div>
            </footer>

        </div>
    );
}
