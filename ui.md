Cette spécification technique et visuelle détaille l'ensemble des motifs d'interface utilisateur (UI/UX) observés sur **Jumia**, **Amazon** et **Cdiscount** à partir de votre capture. Elle est structurée sous forme de cahier des charges composant par composant, directement exploitable par un LLM ou un développeur pour concevoir ou refondre les blocs modulaires de votre CMS e-commerce.

---

## 1. Jumia : L'approche merchandising promotionnel & urgence

L'interface de Jumia s'appuie sur une hiérarchisation forte par blocs thématiques colorés, des indicateurs d'urgence (ventes flash) et une structure très dense.

### A. Le bloc « Ventes Flash » (Scarcity & Countdown)

* **En-tête thématique plein format** :
* Bandeau supérieur rouge/grenat avec coins légèrement arrondis.


* Titre à gauche (« Ventes Flash | Chaque jour »).


* Bloc compte à rebours dynamique au centre : pictogramme chronomètre + pastille sombre affichant `07h : 46m : 59s`.


* Bouton d'action à droite : « Voir plus > ».




* **Structure de la carte produit Flash** :
* **Image** : Carrée, fond neutre/blanc, produit centré.


* **Bouton d'ajout rapide** : Icône `+` blanche dans un cercle noir contrasté positionné dans le coin supérieur droit de l'image (optimisé pour l'achat rapide sans quitter la page).


* **Barre d'état du stock** : Indicateur de rareté textuel + jauge (ex. *« 14 articles restants »* ou *« 231 articles en stock »*) au-dessus ou sous l'image pour stimuler le FOMO.


* **Informations produit** : Titre tronqué à 2 lignes.


* **Zone prix** : Prix remisé en gras (grand format, couleur sombre), prix barré d'origine plus discret et badge pourcentage de réduction vert (ex. `-28%`, `-54%`).


* **Social proof** : Note sous forme d'étoile dorée accompagnée du nombre d'avis client (ex. `★ 3.7 (12)`).





### B. Le ruban de pastilles de navigation / Collections (« Trouvez vos produits essentiels »)

* **Composant carrousel de badges** :
* Cartes au ratio portrait arrondi/arrondi continu (squircle).


* Fond en dégradé pastel doux (jaune, rouge dégradé, violet, vert menthe, rose).


* Visuel 3D ou illustration du thème (ex. « Déstockage », « Nouveautés », « Boutique officielles », « Le Djassa »).


* Bouton pill-button intégré au bas de la carte (ex. « DÉCOUVRIR »).




* **Rôle CMS** : Permet de créer un outil de « Hubs promotionnels » ou de « Mini-mondes » administrables par événement marketing.

### C. Le bloc de réassurance / Services de confiance

* **Bandeau de proposition de valeur** :
* 4 à 5 colonnes horizontales espacées.


* Illustration fine ou icône filaire colorée.


* Titre court en gras + sous-titre explicatif (ex. *« Prix usine - Des milliers d'articles importés à petits prix »*, *« Envoi de colis »*, *« Vends sur Jumia »*, *« Gagne ton djai »*).


* Idéal pour le contexte local (ex. paiement à la livraison, points relais, garantie authenticité).



### D. Blocs thématiques avec fond personnalisé (« Univers / Collections »)

* Un bandeau d'en-tête de section coloré spécifique à une catégorie (ex. orange pour « Offres à saisir / Semaine du Geek », rouge pour « TVs & Audio »).


* Slider horizontal de produits sur fond clair contrasté.



---

## 2. Amazon : La navigation par intention & les cartes « Quad-Grid »

Amazon privilégie une mise en avant axée sur la personnalisation, l'exploration rapide par sous-catégories et une expérience tactile fortement influencée par le mobile.

### A. La section Hero en cartes verticales déroulantes (« Story Cards »)

* **Format visuel** :
* Rangée de cartes au ratio vertical (format écran smartphone / story 9:16 ou 3:4) avec scroll horizontal fluide.


* Coins fortement arrondis (border-radius d'environ 12 à 16px).


* Fond photographique ou colorblock unifié avec typographie incrustée en haut.


* Exemple d'accroches : *« Découvrez tous nos produits de... »*, *« Commencez à avoir l'air pointu »*, *« Jouets pour les tout-petits »*, *« Améliorez votre PC ici »*.




* **Intérêt UX/Mobile** :
* Les utilisateurs mobiles naviguent naturellement avec le pouce d'un swipe horizontal.
* Chaque carte fonctionne comme un portail vers une sélection thématique ciblée sans surcharger la vue.



### B. Le composant « Quad-Card » (Boîte 2x2 sous-catégories)

* **Structure du conteneur** :
* Carte carrée/rectangulaire blanche avec ombre douce ou contour fin.


* Titre percutant en haut avec flèche de navigation (ex. *« Branchez-vous à nos appareils électroniques > »*, *« Préparez-vous à vous mettre en forme > »*, *« Vêtements à moins de 25 $ > »*).




* **Grille interne** :
* 4 cellules organisées en grille 2x2.


* Chaque cellule contient :
1. Une image produit miniature carrée sur fond gris clair/détourée.


2. Un libellé textuel court en dessous (ex. *Casque audio*, *Comprimés/Tablettes*, *Jeux*, *Intervenants/Enceintes*).






* **Avantage CMS** :
* Permet de regrouper 4 points d'entrée de catalogue dans l'espace d'une seule grande carte.
* Rend la page d'accueil extrêmement riche en liens de navigation profonde sans effet catalogue indigeste.



---

## 3. Cdiscount : Le minimalisme fonctionnel & les bannières panoramiques

Cdiscount mise sur un fond blanc épuré, des hauteurs de bannières compactes, des accès rapides par icônes rondes et des onglets dynamiques.

### A. Le bandeau Hero panoramique « Slim / Compact »

* **Ratio d'affichage** :
* Prend la pleine largeur du conteneur central, mais avec une **hauteur restreinte** (ratio très panoramique).


* Évite d'occuper tout le champ visuel (le « fold ») pour laisser immédiatement visibles les premières cartes produits juste en dessous.




* **Contenu** :
* Fond aplat vif ou dégradé graphique unifié.


* Typographie dynamique à gauche, visuel produit détouré au centre, badge de réduction percutant à droite (ex. *-10€ dès 90€*, *-50€*, *-15€*).





### B. Le carrousel circulaire « Les Incontournables » (Avatars Catégories)

* **Format visuel** :
* Rangée horizontale d'icônes rondes (cercles parfaits avec fond gris très doux ou blanc).


* Image produit ou mascotte/illustration détourée centrée dans le cercle.


* Nom de la catégorie centré sous le cercle en texte sobre (ex. *Téléphonie*, *Informatique*, *Bricolage*, *Jouets*, *Meuble*, *Électroménager*).




* **Intérêt ergonomique** : Reproduit la gestuelle des applications mobiles (stories Instagram / filtres d'applications de livraison).

### C. La carte produit Cdiscount : Badges & Hiérarchie des prix

* **Badges contextuels supérieurs** :
* Étiquette colorée en haut à gauche de la carte : `Promo` (fond rouge), `Bon plan` (fond bleu indigo), `Meilleur prix` (fond bordeaux) ou `Plus responsable` (fond vert).




* **Typographie du produit** :
* Titre produit court, suivi immédiatement de la ligne de notation (`★★★★☆ 4,3/5`).




* **Double prix explicite** :
* Prix de comparaison / prix barré : *« Prix de comparaison : 21,99 € »* en petit texte gris.


* Prix de vente final : Typographie rouge ou noire très marquée avec séparateur décimal en exposant (ex. `169,99 €`).





### D. Le composant à onglets dynamiques (« Nos meilleures offres »)

* Un seul conteneur carrousel surmonté d'onglets commutables : `Alertes` | `Bons Plans` | `Jeux`.


* Cliquer sur un onglet met à jour les cartes affichées sans recharger la page, optimisant l'espace vertical disponible.



---

## 4. Matrice de spécification pour vos composants CMS

Ce tableau résume les propriétés et structures de données à implémenter dans votre CMS pour alimenter ces représentations côté Storefront :

| Type de Composant | Inspiration | Rendu visuel Storefront | Schéma de données CMS (Props / Config) |
| --- | --- | --- | --- |
| **`HeroStoryScroller`** | Amazon

 | Carrousel horizontal de cartes verticales (ratio ~9:16), coins arrondis, titre en surimpression.

 | `cards: [{ title, coverImage, linkUrl, tag }]` |
| **`HeroSlimBanner`** | Cdiscount

 | Bannière panoramique basse hauteur, pleine largeur de grille, carrousel auto-play.

 | `slides: [{ bgGradient, promoText, highlightAmount, productImage, ctaUrl }]` |
| **`FlashSaleGrid`** | Jumia

 | Bandeau rouge avec compteur dégressif + carrousel de cartes produit avec jauge de stock.

 | `endDate, title, products: [{ id, discountPercent, stockRemaining, stockTotal }]` |
| **`QuadCategoryCard`** | Amazon

 | Carte blanche contenant une grille 2x2 de miniatures avec labels individuels + lien global.

 | `cardTitle, targetCategoryUrl, items: [4x { name, imageUrl, targetUrl }]` |
| **`CircularCategoryNav`** | Cdiscount

 | Ruban horizontal d'avatars circulaires défilants.

 | `categories: [{ iconImage, label, categorySlug }]` |
| **`TabbedProductSlider`** | Cdiscount

 | En-tête avec pills cliquables commutant différentes listes de produits.

 | `tabs: [{ label, badgeCount, queryFilter: 'on_sale' |
| **`TrustFooterBar`** | Jumia / Cdiscount

 | Barre de badges d'engagements (4 items : Paiement mobile sécurisé, Livraison Cotonou & environs, etc.).

 | `items: [{ icon, title, subtitle }]` |

---

## 5. Recommandations d'adaptation pour Areezan (Marché Béninois)

* **Mobile-First strict** : Au Bénin, plus de 85% du trafic passera par des smartphones (souvent sur des réseaux 3G/4G variables). Les bannières compactes (style Cdiscount) et les story cards (style Amazon) doivent privilégier des images WebP légères avec lazy-loading natif.
* **Mise en avant des prix en FCFA** : Le format monétaire `FCFA` occupe plus de caractères que `€` ou `$`. Privilégiez des cartes produits avec un espace suffisant pour les libellés monétaires (ex. `19 500 FCFA` au lieu de `19,5k`) sans retour à la ligne cassé.
* **Bouton d'action directe** : L'icône `+` noire vue sur Jumia est essentielle pour permettre un ajout immédiat au panier ou déclencher directement un tunnel d'achat rapide / commande WhatsApp si vous proposez ce canal.



Souhaitez-vous que l'on détaille les interfaces TypeScript et les schémas JSON (par exemple pour Strapi, Directus ou un backend custom) correspondant à ces composants ?