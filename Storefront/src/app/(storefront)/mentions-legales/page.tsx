import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Mentions Légales | Ahizan',
    description: "Mentions légales de la marketplace Ahizan — éditeur, hébergement, propriété intellectuelle.",
};

export default function MentionsLegalesPage() {
    return (
        <div className="container mx-auto px-4 py-16 max-w-3xl">
            <h1 className="text-3xl md:text-4xl font-serif font-black tracking-tight text-foreground mb-4">
                Mentions Légales
            </h1>
            <p className="text-sm text-muted-foreground mb-10 font-medium">
                Dernière mise à jour : {new Date().toLocaleDateString('fr-FR', { year: 'numeric', month: 'long', day: 'numeric' })}
            </p>

            <div className="prose prose-slate dark:prose-invert max-w-none space-y-8 text-sm leading-relaxed">
                <section>
                    <h2 className="text-xl font-bold mb-3 text-foreground">1. Éditeur du site</h2>
                    <p className="text-muted-foreground">
                        Le site <strong>ahizan.com</strong> est édité par la société Ahizan.<br />
                        Adresse : Bénin, Afrique de l'Ouest<br />
                        Email : <a href="mailto:contact@ahizan.com" className="text-primary font-semibold hover:underline">contact@ahizan.com</a>
                    </p>
                </section>

                <section>
                    <h2 className="text-xl font-bold mb-3 text-foreground">2. Directeur de la publication</h2>
                    <p className="text-muted-foreground">
                        Le directeur de la publication est le représentant légal de la société Ahizan.
                    </p>
                </section>

                <section>
                    <h2 className="text-xl font-bold mb-3 text-foreground">3. Hébergement</h2>
                    <p className="text-muted-foreground">
                        Le site est hébergé par des fournisseurs de services cloud tiers. Les informations détaillées sur
                        l'hébergement sont disponibles sur simple demande à{' '}
                        <a href="mailto:tech@ahizan.com" className="text-primary font-semibold hover:underline">
                            tech@ahizan.com
                        </a>.
                    </p>
                </section>

                <section>
                    <h2 className="text-xl font-bold mb-3 text-foreground">4. Propriété intellectuelle</h2>
                    <p className="text-muted-foreground">
                        L'ensemble des éléments du site (logo, textes, images, structure) est protégé par les lois
                        relatives à la propriété intellectuelle. Toute reproduction, même partielle, est interdite sans
                        autorisation préalable écrite d'Ahizan.
                    </p>
                </section>

                <section>
                    <h2 className="text-xl font-bold mb-3 text-foreground">5. Limitation de responsabilité</h2>
                    <p className="text-muted-foreground">
                        Ahizan s'efforce d'assurer l'exactitude des informations diffusées sur ce site. Toutefois,
                        Ahizan ne saurait garantir l'exactitude, la complétude et la mise à jour des informations
                        diffusées sur son site.
                    </p>
                </section>

                <section>
                    <h2 className="text-xl font-bold mb-3 text-foreground">6. Droit applicable</h2>
                    <p className="text-muted-foreground">
                        Le présent site est soumis au droit béninois. Tout litige relatif à l'utilisation du site
                        relève de la compétence exclusive des tribunaux compétents.
                    </p>
                </section>
            </div>
        </div>
    );
}
