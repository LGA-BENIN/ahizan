import { cacheLife } from 'next/cache';
import Link from "next/link";


async function Copyright() {
    'use cache'
    cacheLife('days');

    return (
        <div className="text-muted-foreground">
            © {new Date().getFullYear()} AHIZAN. Tous droits réservés.
        </div>
    )
}

export async function Footer() {
    'use cache'
    cacheLife('days');

    return (
        <footer className="border-t border-border mt-auto bg-card">
            <div className="container mx-auto px-4 py-8">
                <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                    <div className="flex items-center gap-4">
                        <span className="text-lg font-bold bg-gradient-to-r from-orange-500 to-red-600 bg-clip-text text-transparent">
                            AHIZAN
                        </span>
                        <div className="hidden md:block h-4 w-[1px] bg-border" />
                        <Copyright />
                    </div>

                    <div className="flex items-center gap-6 text-sm text-muted-foreground">
                        <Link href="/about" className="hover:text-foreground transition-colors">À propos</Link>
                        <Link href="/terms" className="hover:text-foreground transition-colors">Conditions</Link>
                        <Link href="/contact" className="hover:text-foreground transition-colors">Contact</Link>
                    </div>
                </div>
            </div>
        </footer>
    );
}
