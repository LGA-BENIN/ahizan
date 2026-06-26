import Image from "next/image";
import Link from "next/link";

export async function Footer() {
    return (
        <footer className="w-full bg-[#0d213d] text-white font-sans border-t border-white/10">
            <div className="max-w-[1440px] mx-auto px-6 md:px-10 py-16">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-10 lg:gap-16">
                    {/* Colonne marque */}
                    <div className="md:col-span-5 space-y-6 max-w-sm">
                        <Link href="/" className="inline-block">
                            <img 
                                src="/logo-ahizan-official.svg" 
                                alt="Ahizan Marketplace" 
                                className="h-10 w-auto brightness-0 invert" 
                            />
                        </Link>
                        <p className="text-white/70 text-sm leading-relaxed">
                            La première marketplace du Bénin dédiée à l'autonomisation des commerçants et artisans locaux. Vendez partout au pays simplement.
                        </p>
                        <div className="flex gap-4">
                            <a className="w-9 h-9 rounded-full bg-white/5 hover:bg-[#d8263e] flex items-center justify-center transition-colors text-white" href="#" title="Facebook">
                                <span className="material-symbols-outlined text-sm">public</span>
                            </a>
                            <a className="w-9 h-9 rounded-full bg-white/5 hover:bg-[#d8263e] flex items-center justify-center transition-colors text-white" href="#" title="Instagram">
                                <span className="material-symbols-outlined text-sm">face</span>
                            </a>
                            <a className="w-9 h-9 rounded-full bg-white/5 hover:bg-[#d8263e] flex items-center justify-center transition-colors text-white" href="#" title="Email">
                                <span className="material-symbols-outlined text-sm">mail</span>
                            </a>
                        </div>
                    </div>

                    {/* Colonnes liens */}
                    <div className="md:col-span-7 grid grid-cols-2 sm:grid-cols-3 gap-8 md:gap-12 pt-2 md:pt-0">
                        <div className="space-y-4">
                            <h4 className="font-bold uppercase tracking-widest text-xs text-[#d8263e]">Produit</h4>
                            <nav className="flex flex-col gap-2.5 text-sm">
                                <a className="text-white/70 hover:text-white transition-colors" href="#why-sell">Pourquoi Ahizan</a>
                                <a className="text-white/70 hover:text-white transition-colors" href="#features">Fonctionnalités</a>
                                <a className="text-white/70 hover:text-white transition-colors" href="#logistics">Logistique</a>
                                <a className="text-white/70 hover:text-white transition-colors" href="#payments">Tarifs & Paiements</a>
                            </nav>
                        </div>
                        <div className="space-y-4">
                            <h4 className="font-bold uppercase tracking-widest text-xs text-[#d8263e]">Légal</h4>
                            <nav className="flex flex-col gap-2.5 text-sm">
                                <a className="text-white/70 hover:text-white transition-colors" href="#">Conditions Générales</a>
                                <a className="text-white/70 hover:text-white transition-colors" href="#">Politique de Confidentialité</a>
                                <a className="text-white/70 hover:text-white transition-colors" href="#">Charte Vendeur</a>
                                <a className="text-white/70 hover:text-white transition-colors" href="#">Cookies</a>
                            </nav>
                        </div>
                        <div className="space-y-4 col-span-2 sm:col-span-1">
                            <h4 className="font-bold uppercase tracking-widest text-xs text-[#d8263e]">Support</h4>
                            <nav className="flex flex-col gap-2.5 text-sm">
                                <a className="text-white/70 hover:text-white transition-colors" href="#">Centre d'aide</a>
                                <a className="text-white/70 hover:text-white transition-colors" href="#">Documentation API</a>
                                <a className="text-white/70 hover:text-white transition-colors" href="#">Contacter le support</a>
                                <a className="text-white/70 hover:text-white transition-colors" href="#faq">FAQ Vendeurs</a>
                            </nav>
                        </div>
                    </div>
                </div>

                {/* Bas de page */}
                <div className="w-full pt-8 mt-16 border-t border-white/10 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-white/50">
                    <p>© {new Date().getFullYear()} Ahizan Marketplace. Tous droits réservés.</p>
                    <div className="flex items-center gap-6">
                        <span>Fait avec passion au Bénin 🇧🇯</span>
                    </div>
                </div>
            </div>
        </footer>
    );
}
