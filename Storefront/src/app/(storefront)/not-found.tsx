import { Button } from '@/components/ui/button';
import Link from "next/link";

export default function NotFound() {
    return (
        <div className="min-h-[50vh] flex items-center justify-center px-4">
            <div className="text-center space-y-6 max-w-md">
                <div className="relative inline-block">
                    <h1 className="text-7xl font-bold text-primary/10 select-none">404</h1>
                    <div className="absolute inset-0 flex items-center justify-center">
                        <h2 className="text-xl font-bold tracking-tight">Oups !</h2>
                    </div>
                </div>
                <div className="space-y-2">
                    <h2 className="text-lg font-semibold">Page Introuvable</h2>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                        Désolé, la page que vous recherchez n'existe pas ou a été déplacée. 
                        Peut-être qu'un de nos produits saura vous consoler ?
                    </p>
                </div>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <Button asChild size="default" className="rounded-lg font-semibold">
                        <Link href="/">Retour à l'accueil</Link>
                    </Button>
                    <Button asChild variant="outline" size="default" className="rounded-lg">
                        <Link href="/search">Rechercher un produit</Link>
                    </Button>
                </div>
            </div>
        </div>
    );
}
