export async function Footer() {
    return (
        <footer className="stitch-theme bg-on-surface text-surface font-body-sm text-body-sm w-full rounded-none px-6 md:px-10 py-16 flex flex-col md:flex-row justify-between items-start gap-10 max-w-[1440px] mx-auto border-t border-surface/10">
            <div className="space-y-6 max-w-sm">
                <span className="font-headline-lg text-headline-lg font-bold text-surface">Ahizan</span>
                <p className="text-surface/70">
                    La première marketplace du Bénin dédiée à l'autonomisation des commerçants et artisans locaux.
                </p>
                <div className="flex gap-6">
                    <a className="hover:text-primary transition-colors" href="#"><span className="material-symbols-outlined">public</span></a>
                    <a className="hover:text-primary transition-colors" href="#"><span className="material-symbols-outlined">face</span></a>
                    <a className="hover:text-primary transition-colors" href="#"><span className="material-symbols-outlined">mail</span></a>
                </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-16">
                <div className="space-y-4">
                    <h4 className="font-bold uppercase tracking-widest text-xs opacity-50">Produit</h4>
                    <nav className="flex flex-col gap-2">
                        <a className="text-surface/70 hover:text-surface transition-colors" href="#why-sell">Pourquoi Ahizan</a>
                        <a className="text-surface/70 hover:text-surface transition-colors" href="#features">Fonctionnalités</a>
                        <a className="text-surface/70 hover:text-surface transition-colors" href="#">Tarifs</a>
                    </nav>
                </div>
                <div className="space-y-4">
                    <h4 className="font-bold uppercase tracking-widest text-xs opacity-50">Légal</h4>
                    <nav className="flex flex-col gap-2">
                        <a className="text-surface/70 hover:text-surface transition-colors" href="#">Terms of Service</a>
                        <a className="text-surface/70 hover:text-surface transition-colors" href="#">Privacy Policy</a>
                        <a className="text-surface/70 hover:text-surface transition-colors" href="#">Cookie Settings</a>
                    </nav>
                </div>
                <div className="space-y-4">
                    <h4 className="font-bold uppercase tracking-widest text-xs opacity-50">Support</h4>
                    <nav className="flex flex-col gap-2">
                        <a className="text-surface/70 hover:text-surface transition-colors" href="#">Support</a>
                        <a className="text-surface/70 hover:text-surface transition-colors" href="#">API Docs</a>
                        <a className="text-surface/70 hover:text-surface transition-colors" href="#">Centre d'aide</a>
                    </nav>
                </div>
            </div>
            <div className="w-full pt-16 mt-16 border-t border-surface/10 text-center md:text-left">
                <p className="text-surface/50">© {new Date().getFullYear()} Ahizan Marketplace. All rights reserved.</p>
            </div>
        </footer>
    );
}
