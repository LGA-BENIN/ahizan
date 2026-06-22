import { User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import Link from "next/link";
import { LoginButton } from "@/components/layout/navbar/login-button";
import { getActiveCustomer } from "@/lib/vendure/actions";


export async function NavbarUser() {
    const customer = await getActiveCustomer()

    if (!customer) {
        return (
            <div className="flex items-center gap-4">
                {/* Écrans larges : Boutons complets */}
                <div className="hidden md:flex items-center gap-4">
                    <Link href="/sign-in" className="text-secondary hover:text-primary transition-colors font-semibold text-sm">
                        Connexion
                    </Link>
                    <Link href="/register" className="bg-primary text-white px-4 py-2 rounded-lg font-bold hover:opacity-90 transition-opacity scale-95 active:scale-90 duration-200 text-sm text-center">
                        Créer ma boutique
                    </Link>
                </div>
                {/* Mobiles : Icône de connexion simple */}
                <div className="flex md:hidden">
                    <Link href="/sign-in" className="text-secondary hover:text-primary p-2" title="Connexion">
                        <User className="h-6 w-6" />
                    </Link>
                </div>
            </div>
        );
    }

    const ssoUrl = process.env.NODE_ENV === 'production' 
        ? 'https://auth.ahizan.com/select-role' 
        : 'http://localhost:3003/select-role';

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost">
                    <User className="h-5 w-5" />
                    Hi, {customer.firstName}
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
                <DropdownMenuItem asChild>
                    <Link href="/dashboard" className="cursor-pointer">Tableau de bord</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                    <a href={ssoUrl} className="cursor-pointer">Changer de profil</a>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                    <LoginButton isLoggedIn={true} />
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
