'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';
import {
    Home,
    ShoppingBag,
    Package,
    DollarSign,
    MoreHorizontal,
    Settings,
    ChevronLeft,
    Search,
    ExternalLink,
    Copy,
    Plus,
    Eye,
    Grid,
    User,
    PanelLeftClose,
    Bell,
    LogOut,
    Menu,
    X,
    User as UserIcon,
    ShieldCheck,
    Heart,
    Settings as SettingsIcon,
    Download,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { logoutAction } from '@/app/sign-in/actions';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ThemeToggle } from './theme-toggle';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import Image from 'next/image';

interface DashboardLayoutProps {
    children: React.ReactNode;
    vendor?: any;
    dashboardConfig?: { walletPageEnabled: boolean };
}

export function DashboardLayout({ children, vendor, dashboardConfig }: DashboardLayoutProps) {
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
    const [isInstallable, setIsInstallable] = useState(false);
    const [isStandalone, setIsStandalone] = useState(false);

    useEffect(() => {
        const checkStandalone = () => {
            const standalone = 
                window.matchMedia("(display-mode: standalone)").matches || 
                window.matchMedia("(display-mode: fullscreen)").matches || 
                window.matchMedia("(display-mode: minimal-ui)").matches || 
                (window.navigator as any).standalone === true;
            setIsStandalone(standalone);
            return standalone;
        };

        const standalone = checkStandalone();
        if (standalone) {
            setIsInstallable(false);
            return;
        }

        // Check if event was already captured globally
        if ((window as any).deferredPrompt) {
            setDeferredPrompt((window as any).deferredPrompt);
            setIsInstallable(true);
        }

        const handleReady = () => {
            if (checkStandalone()) return;
            setDeferredPrompt((window as any).deferredPrompt);
            setIsInstallable(true);
        };

        const handleInstalled = () => {
            setIsInstallable(false);
            setIsStandalone(true);
        };

        const handleBeforeInstallPrompt = (e: Event) => {
            if (checkStandalone()) {
                setIsInstallable(false);
                return;
            }
            e.preventDefault();
            (window as any).deferredPrompt = e;
            setDeferredPrompt(e);
            setIsInstallable(true);
        };
        window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
        window.addEventListener("pwa-install-ready", handleReady);
        window.addEventListener("pwa-installed", handleInstalled);
        window.addEventListener("appinstalled", handleInstalled);

        return () => {
            window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
            window.removeEventListener("pwa-install-ready", handleReady);
            window.removeEventListener("pwa-installed", handleInstalled);
            window.removeEventListener("appinstalled", handleInstalled);
        };
    }, []);

    const handleInstallClick = async () => {
        if (!deferredPrompt) return;
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        console.log(`PWA Install Choice: ${outcome}`);
        setDeferredPrompt(null);
        setIsInstallable(false);
    };
    const pathname = usePathname();
    const { theme, resolvedTheme } = useTheme();
    const [mounted, setMounted] = useState(false);
    
    const vendorName = vendor?.name || (vendor?.customer?.firstName ? `${vendor.customer.firstName} ${vendor.customer.lastName}` : 'Vendeur');
    const vendorEmail = vendor?.customer?.emailAddress || '';

    // Avoid hydration mismatch by waiting for mount
    useEffect(() => {
        setMounted(true);
    }, []);

    const isDark = mounted && (theme === 'dark' || resolvedTheme === 'dark');

    const allNavItems = [
        { name: 'Tableau de bord', href: '/dashboard', icon: Home },
        { name: 'Ventes', href: '/dashboard/orders', icon: ShoppingBag },
        { name: 'Produits', href: '/dashboard/products', icon: Package },
        { name: 'Portefeuille', href: '/dashboard/wallet', icon: DollarSign, key: 'wallet' },
        { name: 'Paramètres', href: '/dashboard/settings', icon: Settings },
    ];

    const navigation = allNavItems.filter(item => {
        if (item.key === 'wallet' && dashboardConfig?.walletPageEnabled === false) return false;
        return true;
    });

    const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

    const SidebarContent = ({ mobile = false }: { mobile?: boolean }) => (
        <div className="h-full flex flex-col p-6">
            {/* Brand / Logo & Collapse */}
            <div className="flex items-center justify-between mb-10 px-2 group">
                <div className="flex items-center gap-3 cursor-pointer pr-2">
                     <div className="flex flex-col items-center gap-1">
                        <div className={cn(
                            "rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform overflow-hidden",
                            (isSidebarOpen || mobile) ? "w-20 h-14" : "w-14 h-14"
                        )}>
                            {mounted ? (
                                <img
                                    src={isDark ? '/logo-dark.png' : '/logo-light.png'}
                                    alt="AHIZAN Logo"
                                    className="w-full h-full object-contain"
                                />
                            ) : (
                                <div className={cn(
                                    "bg-brand-navy rounded-2xl flex items-center justify-center text-white font-bold",
                                    (isSidebarOpen || mobile) ? "w-20 h-14 text-lg" : "w-14 h-14 text-lg"
                                )}>
                                    AH
                                </div>
                            )}
                        </div>
                        {(isSidebarOpen || mobile) && mounted && (
                            <span className="text-[10px] text-brand-red font-bold uppercase tracking-widest animate-in fade-in slide-in-from-top-2 duration-500">Seller Hub</span>
                        )}
                     </div>
                </div>
                {!mobile && (
                    <button
                        onClick={toggleSidebar}
                        className="p-2 rounded-xl text-muted-foreground hover:bg-muted/80 hover:text-foreground transition-all shrink-0"
                    >
                        <PanelLeftClose className={cn("h-5 w-5 transition-transform", !isSidebarOpen && "rotate-180")} />
                    </button>
                )}
                {mobile && (
                    <button
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="p-2 rounded-xl text-muted-foreground hover:bg-muted/80 hover:text-foreground transition-all shrink-0"
                    >
                        <X className="h-5 w-5" />
                    </button>
                )}
            </div>

            {/* Navigation */}
            <nav className="flex-1 space-y-2 overflow-y-auto custom-scrollbar pr-2 -mr-2">
                {navigation.map((item) => {
                    const isActive = pathname === item.href;
                    const Icon = item.icon;

                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            onClick={() => mobile && setIsMobileMenuOpen(false)}
                            className={cn(
                                "flex items-center gap-3 px-4 py-3 text-sm transition-all group relative border-l-4",
                                isActive
                                    ? "bg-primary/10 dark:bg-white/10 text-primary dark:text-white border-primary font-bold rounded-r-xl"
                                    : "border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 rounded-r-xl"
                            )}
                        >
                            <Icon className={cn("h-5 w-5 shrink-0 transition-all group-hover:scale-110", isActive ? "text-primary" : "text-slate-500 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white")} />
                            {(isSidebarOpen || mobile) ? (
                                <span className="flex-1 truncate animate-in fade-in slide-in-from-left-2 duration-300">{item.name}</span>
                            ) : (
                                <div className="absolute left-full ml-4 px-3 py-2 bg-slate-900 dark:bg-[#0d1c32] text-white text-xs rounded-xl opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-[100] shadow-xl">
                                    {item.name}
                                </div>
                            )}
                            {isActive && (isSidebarOpen || mobile) && (
                                <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                            )}
                        </Link>
                    );
                })}
            </nav>
            
            {/* Merchant Badge & Support */}
            {(isSidebarOpen || mobile) && (
                <div className="mt-auto pt-4 border-t border-slate-200 dark:border-white/10 animate-in fade-in slide-in-from-bottom-2 duration-500">
                    <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/10 flex flex-col gap-1">
                        <p className="text-slate-900 dark:text-white font-bold text-xs truncate">{vendorName}</p>
                        <p className="text-slate-500 dark:text-slate-400 text-[9px] truncate">{vendorEmail}</p>
                    </div>
                </div>
            )}
        </div>
    );

    return (
        <div className="flex h-screen bg-dashboard-bg text-foreground transition-colors duration-300 overflow-hidden stitch-theme">
            {/* Desktop Sidebar */}
            <aside
                className={cn(
                    "hidden md:flex flex-col bg-white dark:bg-[#0d1c32] border-r border-slate-200 dark:border-white/10 transition-all duration-500 ease-in-out shadow-[4px_0_24px_rgba(0,0,0,0.02)] dark:shadow-2xl z-50",
                    isSidebarOpen ? "w-64" : "w-24"
                )}
            >
                <SidebarContent />
            </aside>

            {/* Mobile Drawer Overlay */}
            {isMobileMenuOpen && (
                <div 
                    className="fixed inset-0 bg-black/50 z-[100] md:hidden animate-in fade-in duration-300"
                    onClick={() => setIsMobileMenuOpen(false)}
                />
            )}

            {/* Mobile Drawer */}
            <aside
                className={cn(
                    "fixed inset-y-0 left-0 z-[101] w-72 bg-white dark:bg-[#0d1c32] border-r border-slate-200 dark:border-white/10 transition-transform duration-500 ease-in-out md:hidden shadow-2xl",
                    isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
                )}
            >
                <SidebarContent mobile />
            </aside>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
                {/* Top Navbar */}
                <header className="h-16 flex items-center justify-between px-4 md:px-6 bg-dashboard-bg shrink-0">
                    <div className="flex items-center gap-2 md:gap-4">
                        <Button 
                            variant="ghost" 
                            size="icon" 
                            className="md:hidden rounded-xl hover:bg-muted"
                            onClick={() => setIsMobileMenuOpen(true)}
                        >
                             <Menu className="h-5 w-5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="hidden md:flex rounded-full bg-muted/50 hover:bg-muted">
                             <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <h2 className="text-xs md:text-sm font-semibold text-muted-foreground capitalize">
                            {pathname === '/dashboard' ? 'Aperçu' : 
                             pathname.split('/').pop()?.replace('orders', 'Ventes')
                                                      .replace('products', 'Produits')
                                                      .replace('wallet', 'Portefeuille')
                                                      .replace('settings', 'Paramètres') || 'Aperçu'}
                        </h2>
                    </div>

                    {/* Search Bar - Desktop Only */}
                    <div className="hidden md:flex flex-1 max-w-md mx-8">
                        <div className="relative w-full group">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-brand-navy transition-colors" />
                            <Input
                                placeholder="Rechercher..."
                                className="pl-10 h-10 bg-muted/50 border-none rounded-2xl focus-visible:ring-2 focus-visible:ring-brand-navy/10 transition-all font-medium"
                            />
                        </div>
                    </div>

                    {/* Right Side Icons */}
                    <div className="flex items-center gap-1 md:gap-2">
                        {isInstallable && !isStandalone && (
                            <Button 
                                onClick={handleInstallClick}
                                variant="ghost" 
                                size="sm" 
                                className="h-9 gap-1.5 px-3 bg-muted/50 hover:bg-muted text-primary transition-colors font-semibold"
                            >
                                <Download className="h-4 w-4 animate-bounce" />
                                <span className="hidden sm:inline text-xs">Installer l'app</span>
                            </Button>
                        )}
                        <Button variant="ghost" size="icon" className="h-9 w-9 bg-muted/50 hover:bg-muted transition-colors">
                            <Bell className="h-4 w-4 text-muted-foreground" />
                        </Button>

                        <div className="hidden sm:block">
                            <ThemeToggle />
                        </div>

                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full bg-muted ml-1 md:ml-2 overflow-hidden ring-offset-background transition-all hover:ring-2 hover:ring-brand-navy/20">
                                    <UserIcon className="h-5 w-5 text-muted-foreground" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-64 rounded-2xl p-2 shadow-xl border-none">
                                <DropdownMenuLabel className="p-4 pt-2">
                                    <div className="flex flex-col space-y-1">
                                        <p className="text-sm font-bold">{vendorName}</p>
                                        <p className="text-[10px] text-muted-foreground truncate">{vendorEmail}</p>
                                    </div>
                                </DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem asChild className="rounded-xl p-3 focus:bg-muted cursor-pointer transition-colors group">
                                    <Link href="/dashboard/settings#general" className="flex items-center gap-3 w-full">
                                        <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                                            <UserIcon className="w-4 h-4" />
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-sm font-semibold">Profil</span>
                                            <span className="text-[10px] text-muted-foreground">Paramètres</span>
                                        </div>
                                    </Link>
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                    className="rounded-xl p-3 focus:bg-destructive/10 focus:text-destructive text-destructive cursor-pointer group"
                                    onClick={() => logoutAction()}
                                >
                                    <div className="flex items-center gap-3 w-full">
                                        <div className="w-8 h-8 rounded-lg bg-destructive/10 text-destructive flex items-center justify-center">
                                            <LogOut className="w-4 h-4" />
                                        </div>
                                        <span className="text-sm font-bold uppercase tracking-wider">Déconnexion</span>
                                    </div>
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </header>

                {/* Main Content Container with Rounded Inset */}
                <main className="flex-1 overflow-hidden p-3 md:p-6 pt-0">
                    <div className="h-full bg-card rounded-2xl md:rounded-[2rem] shadow-sm border overflow-hidden flex flex-col">
                        <div className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar">
                            {children}
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
}
