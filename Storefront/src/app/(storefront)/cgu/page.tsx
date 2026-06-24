import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: "Conditions Générales d'Utilisation | Ahizan",
    description: "Consultez les conditions générales d'utilisation de la marketplace Ahizan.",
};

export default function CGUPage() {
    return (
        <div className="container mx-auto px-4 py-16 max-w-3xl">
            <h1 className="text-3xl md:text-4xl font-serif font-black tracking-tight text-foreground mb-4">
                {"Conditions Générales d'Utilisation (CGU)"}
            </h1>
            <p className="text-sm text-muted-foreground mb-10 font-medium">
                Dernière mise à jour : {new Date().toLocaleDateString('fr-FR', { year: 'numeric', month: 'long', day: 'numeric' })}
            </p>

            <div className="prose prose-slate dark:prose-invert max-w-none space-y-8 text-sm leading-relaxed">
                <section>
                    <h2 className="text-xl font-bold mb-3 text-foreground">1. Présentation du service</h2>
                    <p className="text-muted-foreground">
                        Ahizan est une marketplace multivendeur permettant à des acheteurs de découvrir et d'acheter des produits
                        proposés par des vendeurs indépendants. En accédant à la plateforme, vous acceptez les présentes conditions
                        générales d'utilisation.
                    </p>
                </section>

                <section>
                    <h2 className="text-xl font-bold mb-3 text-foreground">2. Création de compte</h2>
                    <p className="text-muted-foreground">
                        Pour accéder à certaines fonctionnalités (suivi de commandes, favoris, messagerie), vous devez créer un compte.
                        Vous êtes responsable de la confidentialité de vos identifiants de connexion.
                    </p>
                </section>

                <section>
                    <h2 className="text-xl font-bold mb-3 text-foreground">3. Obligations des utilisateurs</h2>
                    <p className="text-muted-foreground">
                        Vous vous engagez à utiliser la plateforme de manière légale et à ne pas porter atteinte aux droits d'autres
                        utilisateurs ou aux intérêts d'Ahizan. Tout comportement frauduleux entraînera la suppression immédiate du compte.
                    </p>
                </section>

                <section>
                    <h2 className="text-xl font-bold mb-3 text-foreground">4. Responsabilité</h2>
                    <p className="text-muted-foreground">
                        Ahizan agit en tant qu'intermédiaire entre acheteurs et vendeurs. Ahizan ne saurait être tenu responsable des
                        problèmes liés aux produits vendus par des vendeurs tiers, sauf en cas de négligence avérée de notre part.
                    </p>
                </section>

                <section>
                    <h2 className="text-xl font-bold mb-3 text-foreground">5. Modification des CGU</h2>
                    <p className="text-muted-foreground">
                        Ahizan se réserve le droit de modifier les présentes CGU à tout moment. Les utilisateurs seront informés des
                        changements majeurs par email ou via une notification sur la plateforme.
                    </p>
                </section>

                <section>
                    <h2 className="text-xl font-bold mb-3 text-foreground">6. Contact</h2>
                    <p className="text-muted-foreground">
                        Pour toute question relative aux présentes CGU, contactez-nous à{' '}
                        <a href="mailto:legal@ahizan.com" className="text-primary font-semibold hover:underline">
                            legal@ahizan.com
                        </a>.
                    </p>
                </section>
            </div>
        </div>
    );
}
