import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Politique de Confidentialité | Ahizan',
    description: "Découvrez comment Ahizan collecte, utilise et protège vos données personnelles.",
};

export default function PolitiqueDeConfidentialitePage() {
    return (
        <div className="container mx-auto px-4 py-16 max-w-3xl">
            <h1 className="text-3xl md:text-4xl font-serif font-black tracking-tight text-foreground mb-4">
                Politique de Confidentialité
            </h1>
            <p className="text-sm text-muted-foreground mb-10 font-medium">
                Dernière mise à jour : {new Date().toLocaleDateString('fr-FR', { year: 'numeric', month: 'long', day: 'numeric' })}
            </p>

            <div className="prose prose-slate dark:prose-invert max-w-none space-y-8 text-sm leading-relaxed">
                <section>
                    <h2 className="text-xl font-bold mb-3 text-foreground">1. Données collectées</h2>
                    <p className="text-muted-foreground">
                        Ahizan collecte les données suivantes lors de votre inscription et de votre utilisation du service :
                        nom, prénom, adresse email, numéro de téléphone, adresse de livraison, historique des commandes
                        et préférences de navigation.
                    </p>
                </section>

                <section>
                    <h2 className="text-xl font-bold mb-3 text-foreground">2. Utilisation des données</h2>
                    <p className="text-muted-foreground">
                        Vos données sont utilisées pour gérer votre compte, traiter vos commandes, personnaliser
                        votre expérience, et vous envoyer des communications pertinentes. Nous ne revendons
                        jamais vos données à des tiers sans votre consentement explicite.
                    </p>
                </section>

                <section>
                    <h2 className="text-xl font-bold mb-3 text-foreground">3. Cookies</h2>
                    <p className="text-muted-foreground">
                        Ahizan utilise des cookies techniques nécessaires au bon fonctionnement du service
                        (authentification, panier) ainsi que des cookies analytiques pour améliorer l'expérience utilisateur.
                        Vous pouvez gérer vos préférences de cookies depuis les paramètres de votre navigateur.
                    </p>
                </section>

                <section>
                    <h2 className="text-xl font-bold mb-3 text-foreground">4. Vos droits</h2>
                    <p className="text-muted-foreground">
                        Conformément à la réglementation applicable, vous disposez d'un droit d'accès, de rectification,
                        d'effacement et de portabilité de vos données. Pour exercer ces droits, contactez-nous à{' '}
                        <a href="mailto:privacy@ahizan.com" className="text-primary font-semibold hover:underline">
                            privacy@ahizan.com
                        </a>.
                    </p>
                </section>

                <section>
                    <h2 className="text-xl font-bold mb-3 text-foreground">5. Sécurité</h2>
                    <p className="text-muted-foreground">
                        Nous mettons en œuvre des mesures techniques et organisationnelles appropriées pour protéger vos données
                        contre tout accès non autorisé, perte ou destruction.
                    </p>
                </section>

                <section>
                    <h2 className="text-xl font-bold mb-3 text-foreground">6. Contact DPO</h2>
                    <p className="text-muted-foreground">
                        Pour toute question relative à la protection de vos données, contactez notre délégué à la protection
                        des données à{' '}
                        <a href="mailto:privacy@ahizan.com" className="text-primary font-semibold hover:underline">
                            privacy@ahizan.com
                        </a>.
                    </p>
                </section>
            </div>
        </div>
    );
}
