import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Conditions Générales de Vente | Ahizan',
    description: 'Consultez les conditions générales de vente applicables sur la marketplace Ahizan.',
};

export default function CGVPage() {
    return (
        <div className="container mx-auto px-4 py-16 max-w-3xl">
            <h1 className="text-3xl md:text-4xl font-serif font-black tracking-tight text-foreground mb-4">
                Conditions Générales de Vente (CGV)
            </h1>
            <p className="text-sm text-muted-foreground mb-10 font-medium">
                Dernière mise à jour : {new Date().toLocaleDateString('fr-FR', { year: 'numeric', month: 'long', day: 'numeric' })}
            </p>

            <div className="prose prose-slate dark:prose-invert max-w-none space-y-8 text-sm leading-relaxed">
                <section>
                    <h2 className="text-xl font-bold mb-3 text-foreground">1. Objet</h2>
                    <p className="text-muted-foreground">
                        Les présentes conditions générales de vente régissent les transactions effectuées entre acheteurs
                        et vendeurs via la plateforme Ahizan. Toute commande implique l'acceptation sans réserve des présentes CGV.
                    </p>
                </section>

                <section>
                    <h2 className="text-xl font-bold mb-3 text-foreground">2. Prix et paiement</h2>
                    <p className="text-muted-foreground">
                        Les prix affichés sont exprimés en Francs CFA (XOF) et sont indiqués toutes taxes comprises.
                        Le paiement s'effectue lors de la validation de la commande via les moyens de paiement disponibles
                        sur la plateforme (Mobile Money, carte bancaire).
                    </p>
                </section>

                <section>
                    <h2 className="text-xl font-bold mb-3 text-foreground">3. Livraison</h2>
                    <p className="text-muted-foreground">
                        Les modalités et délais de livraison sont définis par chaque vendeur indépendant. Ahizan met en relation
                        acheteurs et vendeurs mais n'assure pas directement la livraison des produits sauf accord contraire.
                    </p>
                </section>

                <section>
                    <h2 className="text-xl font-bold mb-3 text-foreground">4. Retours et remboursements</h2>
                    <p className="text-muted-foreground">
                        Toute demande de retour ou de remboursement doit être effectuée dans les 7 jours suivant la réception
                        du produit. La politique de retour spécifique de chaque vendeur s'applique en complément des présentes CGV.
                    </p>
                </section>

                <section>
                    <h2 className="text-xl font-bold mb-3 text-foreground">5. Garanties</h2>
                    <p className="text-muted-foreground">
                        Les produits vendus bénéficient des garanties légales en vigueur. En cas de défaut, contactez
                        directement le vendeur ou le service client Ahizan.
                    </p>
                </section>

                <section>
                    <h2 className="text-xl font-bold mb-3 text-foreground">6. Contact</h2>
                    <p className="text-muted-foreground">
                        Pour toute réclamation, contactez notre service client à{' '}
                        <a href="mailto:support@ahizan.com" className="text-primary font-semibold hover:underline">
                            support@ahizan.com
                        </a>.
                    </p>
                </section>
            </div>
        </div>
    );
}
