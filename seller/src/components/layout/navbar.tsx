import Link from "next/link";
import { NavbarUser } from '@/components/layout/navbar/navbar-user';
import { ThemeSwitcher } from '@/components/layout/navbar/theme-switcher';
import { Suspense } from "react";
import { NavbarUserSkeleton } from '@/components/shared/skeletons/navbar-user-skeleton';
import { PWAHeaderInstallButton } from '@/components/layout/pwa-install-button';

export function Navbar() {
    return (
        <header className="stitch-theme fixed top-0 left-0 right-0 z-50 border-b bg-surface/85 backdrop-blur-md transition-all duration-300 font-body-lg text-body-lg" id="top-nav">
            <div className="flex justify-between items-center w-full px-6 md:px-10 py-4 max-w-[1440px] mx-auto z-50">
                <div className="flex items-center gap-2">
                    <Link href="/" className="flex items-center gap-2.5">
                        <img src="/logo-ahizan-official.svg" alt="Ahizan" className="h-9 w-auto dark:brightness-0 dark:invert" />
                        <span className="font-bold text-sm tracking-tight hidden sm:inline">Marketplace</span>
                    </Link>
                </div>
                <nav className="hidden md:flex items-center gap-10">
                    <a className="text-secondary hover:text-primary transition-colors" href="#why-sell">Pourquoi vendre ?</a>
                    <a className="text-secondary hover:text-primary transition-colors" href="#features">Fonctionnalités</a>
                    <a className="text-secondary hover:text-primary transition-colors" href="#logistics">Logistique</a>
                    <a className="text-secondary hover:text-primary transition-colors" href="#payments">Paiements</a>
                    <a className="text-secondary hover:text-primary transition-colors" href="#faq">FAQ</a>
                </nav>
                <div className="flex items-center gap-6">
                    <PWAHeaderInstallButton />
                    <ThemeSwitcher />
                    <Suspense fallback={<NavbarUserSkeleton />}>
                        <NavbarUser />
                    </Suspense>
                </div>
            </div>
        </header>
    );
}