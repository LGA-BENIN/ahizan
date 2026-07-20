import { Button } from '@/components/ui/button';
import Link from "next/link";
import { Lottie404 } from '@/components/shared/animations/Lottie404';

export default function NotFound() {
    return (
        <div className="min-h-[50vh] flex items-center justify-center px-4">
            <div className="text-center space-y-6 max-w-md">
                <div className="w-64 h-64 mx-auto flex items-center justify-center">
                    <Lottie404 />
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
