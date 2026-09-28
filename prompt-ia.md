MISSION
Tu as accès à l’intégralité du code source de la plateforme Ahizan.
Ta mission est de réaliser un audit approfondi de l’architecture actuelle, d’identifier les régressions récentes qui ont modifié la logique métier du storefront, puis de proposer et d’implémenter les corrections nécessaires.
Le point central de cette intervention est le suivant :
Sur le storefront, l’unité commerciale affichée et achetable doit être l’offre/variante d’un vendeur, et non le produit central.
Le produit central reste le référentiel commun de la marketplace. Il permet de normaliser et contrôler les informations officielles d’un produit. Mais le client final ne vient pas acheter abstraitement le produit central : il achète une offre concrète d’un vendeur, matérialisée par une variante avec ses spécifications, son prix et ses conditions propres.
Ne pars surtout pas du principe que l’architecture actuelle respecte encore cette règle. Elle semble avoir été modifiée par des interventions récentes et une partie du storefront affiche désormais les produits centraux au lieu des variantes/offres.
Tu dois donc comprendre l’architecture réelle existante avant de modifier quoi que ce soit.

1. MODÈLE MÉTIER À RESPECTER
Le modèle fonctionnel cible est le suivant.
1.1 Produit central
Un produit central représente la fiche/référence officielle d’un produit.
Exemple :
Huile X
Le produit central peut contenir :
nom officiel ;
description officielle ;
catégorie ;
collections ;
images de référence ;
attributs généraux ;
informations normalisées ;
relations avec d’autres produits ;
etc.
Le produit central n’est pas, à lui seul, l’unité commerciale finale affichée dans les listings.

1.2 Offre / variante vendeur
Un vendeur associe son offre à un produit central existant ou participe à la création/association d’un nouveau produit central.
Exemple :
Produit central :
Huile X
Vendeur A :
Huile X — 200 ml — 2 500 FCFA — livraison 24 h
Vendeur B :
Huile X — 200 ml — 2 300 FCFA — retrait au marché X
Vendeur A peut également proposer :
Huile X — 500 ml — 5 500 FCFA
Ainsi, un même produit central peut avoir :
plusieurs vendeurs ;
plusieurs offres par vendeur ;
plusieurs variantes/déclinaisons ;
différents prix ;
différentes conditions de livraison ;
différents niveaux de disponibilité.

2. INVARIANT ABSOLU DU STOREFRONT
Le principe suivant doit être considéré comme une règle métier fondamentale :
Les listes de produits destinées au client doivent travailler avec des unités commerciales vendables (offres/variantes), pas avec des produits centraux abstraits.
Cela concerne notamment :
page d’accueil ;
sections CMS ;
collections ;
catégories ;
catalogue ;
résultats de recherche ;
boutique d’un vendeur ;
pages de quartier ;
pages de marché ;
recommandations ;
produits similaires ;
produits récemment consultés ;
produits populaires ;
produits à proximité ;
éventuellement cross-sell / related products ;
tout autre composant qui génère des product cards.
Tu dois donc rechercher dans tout le code les endroits où un Product central est utilisé directement pour construire une liste destinée au storefront alors qu’une offre/variante aurait dû être utilisée.
Ne corrige pas seulement les pages explicitement citées ci-dessus.
Fais un inventaire complet de tous les points d’affichage de produits.

3. AUDIT INITIAL OBLIGATOIRE
Avant toute modification importante, inspecte le repository et documente précisément :
Architecture
Identifier :
backend ;
storefront ;
API ;
services ;
CMS ;
moteur de localisation ;
moteur de recherche ;
logique des vendeurs ;
logique des offres/variantes ;
logique des collections ;
scoring actuel ;
éventuel moteur de recommandation ;
système de cache ;
système de pagination ;
système de génération des URLs ;
SEO ;
Open Graph ;
gestion des images ;
panier/checkout.
Modèle de données
Déterminer précisément :
quelle entité correspond au produit central ;
quelle entité correspond à l’offre vendeur ;
quelle entité correspond à la variante ;
quelles relations existent entre produit central, vendeur et variantes ;
comment sont stockés prix, stock, disponibilité et livraison ;
comment les collections sont reliées aux produits/variantes ;
comment la localisation est reliée au vendeur, au produit ou à l’offre ;
comment les marchés et quartiers sont représentés ;
quelles données sont actuellement indexées dans le moteur de recherche.
Important
Ne suppose pas que mes mots correspondent exactement aux noms des entités du code.
Je parle fonctionnellement de :
Produit central
Offre vendeur
Variante
Vendeur
Marché
Quartier
Localisation
Mais tu dois mapper ces concepts aux véritables entités du projet.
Il peut par exemple exister une combinaison entre les entités natives Vendure et des entités/custom fields/services Ahizan.

4. VENDURE : NE PAS CASSER LE MODÈLE EXISTANT
Le projet utilise Vendure.
Avant de créer une nouvelle architecture, vérifie comment l’implémentation actuelle utilise :
Product ;
ProductVariant ;
Collection ;
Seller ;
custom fields ;
Shop API ;
Search API ;
services Vendure ;
éventuels plugins de recherche ;
mécanismes de channel ;
relations personnalisées.
Le principe doit être :
Réutiliser au maximum l’architecture existante et les services déjà présents.
Ne crée pas une seconde logique parallèle de produits si une logique équivalente existe déjà.
Ne remplace pas Vendure inutilement.
Ne crée pas de nouvelle entité seulement parce que cela semble plus simple sans avoir vérifié comment le système actuel représente déjà les données.

5. RESTAURATION DES LISTINGS
Chaque composant de listing doit désormais fonctionner conceptuellement comme ceci :
source de candidats
        ↓
offres / variantes vendables
        ↓
filtrage d’éligibilité
        ↓
filtrage localisation
        ↓
scoring
        ↓
moteur de diversité
        ↓
pagination
        ↓
cartes produit du storefront

La carte produit doit recevoir les informations nécessaires à l’offre/variante :
nom affiché ;
variantes/options ;
vendeur ;
prix ;
ancien prix éventuel ;
disponibilité ;
stock si pertinent ;
délai ou conditions de livraison ;
distance si pertinente ;
localisation ;
image ;
notation si disponible ;
autres informations commerciales pertinentes.
Elle ne doit pas être obligée de recevoir uniquement un Product central.

6. BOUTIQUE VENDEUR
La boutique d’un vendeur est un cas particulier.
Elle doit afficher :
uniquement les offres/variantes appartenant à ce vendeur.
Elle peut donc contenir plusieurs variantes du même produit central.
Exemple :
Vendeur X
Téléphone A — 64 Go — 120 000 FCFA
Téléphone A — 128 Go — 145 000 FCFA
Téléphone A — 256 Go — 170 000 FCFA
Cela est normal.
Mais il ne faut pas que la boutique affiche accidentellement :
Téléphone A — vendeur X
 Téléphone A — vendeur Y
 Téléphone A — vendeur Z
simplement parce que ces vendeurs sont liés au même produit central.

7. COLLECTIONS ET SECTIONS CMS
Toutes les sections qui affichent des produits doivent être auditées.
Exemples :
produits populaires ;
nouveautés ;
produits à proximité ;
produits d’une collection ;
produits d’une catégorie ;
produits recommandés ;
sélection éditoriale ;
produits d’un marché ;
produits d’un quartier ;
produits personnalisés ;
produits promotionnels ;
etc.
Une section CMS ne doit pas implicitement devenir :
CMS → Product[] → afficher toutes les variantes du Product

si cela entraîne un résultat incorrect ou massif.
Elle doit plutôt fonctionner comme :
CMS
  ↓
définition de la section / contraintes
  ↓
moteur de sélection
  ↓
offres/variantes éligibles
  ↓
diversification
  ↓
résultat final

Le CMS doit définir ce que la section cherche à montrer.
Le moteur d’affichage doit déterminer quelles offres concrètes afficher.

8. CONCEPTION DU MOTEUR D’AFFICHAGE
L’architecture existante possède déjà une logique de localisation et des outils CMS.
Un moteur d’affichage/sélection doit servir de couche spécialisée entre ces différentes sources.
Son objectif est d’éviter que chaque page implémente ses propres règles.
Conceptuellement :
CMS / page / contexte
        ↓
Display Engine
        ↓
Location Engine
        ↓
Candidate Retrieval
        ↓
Eligibility
        ↓
Scoring
        ↓
Diversity
        ↓
Final variants

Tu dois vérifier si un tel moteur existe déjà partiellement.
S’il existe :
réparer et consolider l’existant avant d’en créer un nouveau.
S’il n’existe pas réellement :
proposer la meilleure intégration compatible avec l’architecture existante.

9. LE PROBLÈME DE DIVERSITÉ
Un problème important existe avec les données.
Imaginons :
Produit central A :
vendeur 1 → 10 variantes
vendeur 2 → 10 variantes
vendeur 3 → 10 variantes
vendeur 4 → 10 variantes
vendeur 5 → 10 variantes
On arrive à 50 variantes.
Si une section demande 20 produits et que le moteur retourne naïvement toutes les variantes du produit A avant les autres produits, ce produit peut monopoliser la section.
Le moteur doit donc intégrer une logique de diversité.
Pour une section générale de marketplace :
limiter le nombre de variantes d’un même produit central ;
éventuellement limiter aussi le nombre de variantes provenant du même vendeur ;
donner de la place à d’autres produits ;
éviter les doublons visuels ;
conserver malgré tout plusieurs offres lorsqu’elles sont réellement pertinentes.
Exemple conceptuel :
Produit central A
  → variante vendeur A

Produit central B
  → variante vendeur C

Produit central C
  → variante vendeur B

Produit central A
  → seconde variante éventuellement

Produit central D
  → variante vendeur A

Le nombre maximal doit être configurable selon le contexte.
Une boutique vendeur n’a évidemment pas les mêmes règles de diversité qu’une homepage générale.

10. SCORING DU MOTEUR
Le moteur doit pouvoir combiner plusieurs signaux.
La localisation doit être un signal majeur.
Les signaux disponibles doivent être recherchés dans le code et réutilisés lorsqu’ils existent déjà.
Potentiellement :
Signaux géographiques
distance ;
quartier ;
zone ;
marché ;
ville ;
disponibilité locale ;
rapidité de livraison ;
présence du vendeur dans la zone.
Signaux commerciaux
popularité ;
quantité vendue ;
disponibilité ;
stock ;
fraîcheur ;
promotion ;
taux de conversion si disponible.
Signaux utilisateur
Pour un utilisateur identifié :
historique d’achat ;
catégories consultées ;
produits consultés ;
recherches ;
préférences ;
favoris ;
interactions.
Pour un utilisateur anonyme :
localisation ;
contexte courant ;
navigation de la session ;
catégories actuellement consultées ;
tendances générales.
Important :
Le moteur de personnalisation avancée/EMS n’est pas encore considéré comme stable.
Ne construis donc pas une dépendance forte à cet éventuel moteur.
Prévois plutôt une architecture dans laquelle un futur moteur de personnalisation pourra fournir des signaux supplémentaires.

11. PRIORITÉ À LA PROXIMITÉ
Pour Ahizan au Bénin, la proximité géographique doit être un facteur particulièrement important.
Le système doit privilégier les produits/offres réellement disponibles à proximité lorsque ceux-ci satisfont les autres critères d’éligibilité.
Mais :
La proximité ne doit jamais aboutir à une section vide alors que des produits existent plus loin.

12. FALLBACK GÉOGRAPHIQUE
Une section ne doit pas produire :
« Aucun produit disponible dans votre périmètre »
simplement parce que le périmètre immédiat ne contient aucun produit.
Le moteur doit élargir progressivement la recherche.
Exemple conceptuel :
Niveau 1
quartier / zone immédiate

        ↓ aucun candidat

Niveau 2
zones voisines

        ↓ aucun candidat

Niveau 3
marché / secteur proche

        ↓ aucun candidat

Niveau 4
reste de la ville

        ↓ aucun candidat

Niveau 5
zone géographique plus large

        ↓ aucun candidat

Niveau 6
catalogue global

Les niveaux exacts doivent être déterminés après inspection du moteur de localisation existant.
Le système doit éviter de rechercher immédiatement tout le catalogue.
Il doit privilégier :
proximité d’abord → élargissement progressif → catalogue global en dernier recours.
Le résultat devrait idéalement conserver l'information du périmètre utilisé, afin que le storefront puisse éventuellement comprendre que les résultats sont plus éloignés.

13. STABILITÉ DE LA LOCALISATION
Un problème actuel semble exister :
pour une même position, des résultats différents peuvent parfois être renvoyés, voire aucun résultat.
Audit obligatoire :
obtention de la position ;
reverse geocoding éventuel ;
normalisation ;
arrondissement ;
calcul de distance ;
cache ;
précision ;
coordonnées ;
zone courante ;
quartier ;
marché ;
fallback ;
synchronisation frontend/backend.
Une même localisation doit produire des résultats cohérents et déterministes dans des conditions identiques, sauf lorsqu’un changement réel des données justifie une différence.
Ne te contente pas de corriger l’interface.
Cherche la cause structurelle.

14. LOCALISATION DU STOREFRONT
Le module de localisation est centralisé dans le projet.
Tu dois identifier le service réellement responsable de la localisation et faire en sorte que les composants du storefront utilisent cette source comme référence.
Évite plusieurs systèmes concurrents du type :
Homepage → sa propre localisation
Search → autre localisation
Seller page → autre localisation
Market page → autre localisation
CMS → autre localisation

L’objectif doit être :
Central Location Engine
        ↓
context localisation courant
        ↓
display / search / CMS / seller / market / neighborhood


15. MARCHÉS ET QUARTIERS
Ahizan dispose également de pages dédiées :
aux marchés ;
aux quartiers.
Ces pages doivent être considérées comme des contextes de découverte spécifiques.
Exemple :
Quartier X
    ↓
collections
    ↓
offres/variantes disponibles dans le quartier

ou :
Marché Y
    ↓
collections
    ↓
offres/variantes disponibles dans le marché

Audit obligatoire :
comment un vendeur associe ses offres à une zone ;
comment une offre est considérée comme disponible dans un marché ;
comment une offre est considérée comme disponible dans un quartier ;
comment les coordonnées sont déterminées ;
comment les pages de marché/quartier filtrent actuellement les produits.
Les pages doivent afficher les offres/variantes concrètes, pas simplement les produits centraux auxquels elles sont rattachées.

16. SECTIONS « QUARTIERS PROCHES »
Le système doit également permettre au storefront d’afficher les quartiers proches de la localisation actuelle de l’utilisateur.
Exemple :
Votre zone

Quartiers proches
[Quartier A]
[Quartier B]
[Quartier C]

Le moteur doit déterminer la proximité de manière cohérente avec le Location Engine existant.
Ne recrée pas un calcul géographique indépendant si un service central existe déjà.

17. SECTIONS « MARCHÉS PROCHES »
Même logique pour les marchés :
Marchés proches de vous
[Marché A]
[Marché B]
[Marché C]

Les marchés doivent être triés selon une logique géographique cohérente.
Prévoir la possibilité future de les combiner avec :
popularité ;
activité ;
disponibilité ;
catégories disponibles.

18. RECHERCHE GLOBALE
La barre de recherche doit à terme pouvoir reconnaître plusieurs types d’intention :
Produit
Variante / offre
Catégorie
Marché
Quartier

Exemples :
huile

→ produits/offres correspondants.
marché Dantokpa

→ marché.
Zongo

→ quartier/zone.
huile 200 ml

→ offres/variantes pertinentes.
Tu dois examiner le système de recherche actuel et déterminer si cette évolution peut être intégrée proprement à l’existant.
Ne crée pas forcément cinq moteurs séparés.
Cherche plutôt à construire ou étendre une couche de recherche capable d'identifier le type de résultat.

19. FICHE PRODUIT : CHANGEMENT MAJEUR
La fiche produit constitue un autre problème central.
Actuellement, le clic semble conduire à une fiche basée sur le produit central, qui permet de sélectionner des groupes d’options et qui présente ensuite plusieurs vendeurs/offres partenaires.
Cette logique n’est plus souhaitée comme comportement principal.
La fiche doit être contextualisée sur l’offre/variante du vendeur.

20. CONTEXTE DE LA FICHE PRODUIT
Une fiche produit devrait conceptuellement être :
Produit central
      +
Vendeur
      +
Offre/variante sélectionnée

et non simplement :
Produit central

Exemple :
Produit central :
Huile X
Vendeur :
Boutique Y
Variante :
200 ml
Prix :
2 500 FCFA
Livraison :
24 h dans certaines zones
La fiche doit donc afficher ces données précises.

21. CHANGEMENT D’OPTION SUR LA FICHE
Supposons que le vendeur possède :
Huile X – 100 ml
Huile X – 200 ml
Huile X – 500 ml

Le client arrive sur :
Huile X – 200 ml

Puis sélectionne :
500 ml

La page doit mettre à jour de façon cohérente :
nom affiché ;
variante active ;
prix ;
comparaison de prix si elle existe ;
disponibilité ;
conditions de livraison ;
stock ;
SKU si pertinent ;
image spécifique si disponible ;
éventuelles données propres à la variante ;
identifiant utilisé pour le panier.
La sélection doit rester dans le périmètre du vendeur/offre concerné.
Il ne faut pas que :
sélectionner « 500 ml »
fasse basculer implicitement vers le vendeur B.

22. URL CANONIQUE DE VARIANTE
La variante doit être considérée comme l'unité de partage.
Un lien partagé par un vendeur doit ouvrir :
la fiche correspondant à cette offre/variante précise.
Le système doit donc avoir un identifiant stable de variante/offre dans l'URL, directement ou indirectement.
Exemples conceptuels :
/product/huile-x?variant=123

ou
/produit/huile-x/200ml?offer=123

ou une structure plus propre adaptée aux routes existantes.
Ne choisis pas arbitrairement cette structure.
Inspecte d’abord :
routing actuel ;
slug ;
IDs ;
SEO ;
partage existant ;
anciennes URLs ;
liens envoyés par les vendeurs.
Puis propose la meilleure structure compatible avec le projet.

23. LIENS LEGACY
Il existe probablement d’anciens liens pointant uniquement vers le produit central.
Ne casse pas inutilement ces URLs.
Analyse les différents cas :
Cas A
URL contenant déjà une variante/offre.
→ ouvrir directement cette variante.
Cas B
URL contenant un produit central + contexte vendeur.
→ résoudre vers la variante correspondante si possible.
Cas C
URL contenant uniquement le produit central.
→ déterminer la meilleure stratégie de compatibilité.
Ne redirige pas aveuglément vers un vendeur arbitraire sans comprendre le contexte.
Si aucun contexte vendeur/variante n’existe, il peut être préférable d’afficher un état de sélection d’offre ou une expérience de découverte contrôlée plutôt que de prétendre qu’il s’agit de la fiche d'un vendeur précis.
Documente le choix.

24. OFFRES DES AUTRES VENDEURS SUR UNE FICHE
Le problème actuel est le suivant :
Un vendeur partage sa fiche produit.
Le client arrive.
Il voit ensuite :
autres boutiques / vendeurs partenaires
avec parfois un autre prix, inférieur au sien.
Ce comportement est indésirable dans le contexte d’une fiche partagée par un vendeur.
La fiche variante doit donc connaître son contexte.
Conceptuellement :
seller_variant_context = true

Dans ce contexte :
fiche centrée sur le vendeur ;
variante centrée sur l’offre ;
pas de liste concurrente immédiatement présentée comme contenu principal.
Les offres d'autres vendeurs peuvent éventuellement apparaître sous une section secondaire/contextuelle telle que :
« Autres offres disponibles »
mais uniquement lorsque le contexte le justifie.
Tu dois proposer un comportement intelligent basé sur le contexte plutôt qu’un simple display:none.

25. PRODUITS SIMILAIRES
Il reste pertinent d'afficher :
produits similaires ;
autres produits du même vendeur ;
suggestions ;
alternatives ;
recommandations.
Mais ces sections doivent elles aussi utiliser des offres/variantes concrètes.
Ne recrée pas le problème en affichant des produits centraux dans les blocs « similaires ».

26. PAGE PRODUIT = CONTEXTE COMMERCIAL
Le modèle mental cible doit être :
Produit central
    = identité/catalogue/référentiel

Offre vendeur
    = relation commerciale

Variante
    = unité sélectionnable/achetable

Fiche produit
    = représentation contextualisée d'une offre/variante

Ces concepts doivent rester distincts dans le code.
Ne mélange pas :
données officielles du produit central ;
données commerciales du vendeur ;
données propres à une variante.

27. MOTEUR D’AFFICHAGE : CONTEXTE DE REQUÊTE
Le moteur doit pouvoir recevoir un contexte.
Conceptuellement :
DisplayContext = {
  pageType,
  location,
  neighborhood,
  market,
  sellerId?,
  centralProductId?,
  variantId?,
  collectionId?,
  categoryId?,
  userId?,
  sessionId?,
  limit,
  diversityPolicy,
  localizationPolicy,
  rankingPolicy
}

Ce type est uniquement conceptuel.
Tu dois l'adapter aux conventions et types déjà présents dans le projet.

28. POLITIQUES D’AFFICHAGE
Prévoir des politiques configurables.
Exemples :
Marketplace générale
Objectif :
diversité ;
proximité ;
disponibilité ;
popularité.
Boutique vendeur
Objectif :
produits de ce vendeur ;
ses variantes ;
ses prix ;
son catalogue.
Marché
Objectif :
offres disponibles dans le marché ;
proximité ;
collections.
Quartier
Objectif :
offres locales ;
proximité ;
disponibilité.
Recommendation
Objectif :
historique ;
pertinence ;
popularité ;
proximité.
Le moteur peut avoir une politique différente selon le contexte.

29. DIVERSITÉ PAR SECTION
Une règle importante :
Une même variante peut être très pertinente mais ne doit pas automatiquement monopoliser une section.
Prévoir des limites configurables telles que :
maxVariantsPerCentralProduct
maxVariantsPerSeller

Mais ne pas les appliquer aveuglément.
Dans la boutique vendeur :
maxVariantsPerCentralProduct = configurable / beaucoup plus élevé

Sur la homepage :
maxVariantsPerCentralProduct = faible

Sur une page produit :
contextuel

Le moteur doit rester capable d'expliquer pourquoi une variante a été sélectionnée.

30. DÉDUPLICATION
Auditer tous les risques de duplication.
Une même variante ne doit pas apparaître deux fois dans une section à cause de plusieurs chemins de recherche.
Exemple :
collection
+
popularité
+
proximité

ne doit pas produire :
Variante 123
Variante 123
Variante 123

Fusionner les candidats avant le classement final.

31. PAGINATION
Attention à ne pas appliquer la diversité uniquement après avoir déjà chargé énormément de variantes.
Mauvais scénario :
charger 10 000 variantes
→ filtrer
→ trier
→ dédupliquer
→ afficher 20

Analyser des stratégies plus efficaces côté backend/database/search.
La diversité et le ranking doivent être compatibles avec les performances.
Si le moteur de recherche ou l’indexation existants permettent d’effectuer une partie de ce travail efficacement, étudie cette possibilité.

32. CMS : RESPONSABILITÉS
Le CMS doit rester responsable de choses comme :
titre
description
position
type de section
collection
catégorie
stratégie de sélection
filtres
limite
ordre éventuel
contexte

Mais il ne doit pas contenir toute la logique de sélection des variantes.
Éviter :
CMS → énorme liste d'IDs → logique métier complexe

Préférer :
CMS → intention
     ↓
Display Engine → candidats
     ↓
Location Engine
     ↓
ranking
     ↓
diversité


33. LOCALISATION + CMS
Le CMS et la localisation doivent travailler ensemble.
Exemple :
Section :
"Produits proches de vous"

Le CMS décrit l'intention.
Le moteur détermine :
position de l'utilisateur
        ↓
quartier
        ↓
zones voisines
        ↓
offres compatibles
        ↓
classement

Le CMS ne doit pas avoir à connaître les coordonnées exactes ou implémenter lui-même les calculs de distance.

34. SECTIONS DYNAMIQUES
Prévoir des types de sections suffisamment flexibles pour permettre plus tard :
Produits proches
Marchés proches
Quartiers proches
Produits populaires
Produits récents
Produits d'une catégorie
Produits d'une collection
Produits d'un marché
Produits d'un quartier
Recommandés pour vous

Ces sections doivent utiliser des services réutilisables.
Éviter de coder une logique spécifique à chaque page.

35. FUTUR MOTEUR DE PERSONNALISATION
Un système de scoring existe déjà dans le projet mais le moteur de personnalisation n'est pas considéré comme stable.
Ne bloque pas cette migration dessus.
Construis plutôt une architecture où le moteur d'affichage peut ultérieurement recevoir :
personalizationScore

ou des signaux équivalents.
Architecture cible :
Location Score
Popularity Score
Availability Score
Seller/Offer Score
Business Score
Personalization Score
Recency Score
...
        ↓
Final Ranking

Mais pour la version actuelle, privilégier les signaux effectivement fiables et existants.

36. PERFORMANCE
Le moteur doit être conçu pour fonctionner lorsque le catalogue grossira fortement.
Attention notamment aux cas :
1 produit central
100 vendeurs
10 variantes par vendeur
= 1 000 offres

et :
100 000 vendeurs

Le système ne doit pas charger toutes les variantes d’un produit uniquement pour décider ensuite d’en afficher une ou deux.
Étudier :
SQL filtering ;
indexes ;
search index ;
pagination ;
caching ;
geospatial queries ;
pre-ranking ;
cursor pagination ;
batch loading ;
DataLoader ;
GraphQL query shape ;
N+1 ;
éventuellement pré-calcul.

37. STABILITÉ DES RÉSULTATS
À contexte identique :
même localisation
+
même utilisateur
+
mêmes données
+
même section

les résultats doivent être suffisamment déterministes.
Un mécanisme d’exploration/rotation peut être ajouté plus tard, mais il doit être contrôlé.
Ne pas générer un ordre complètement aléatoire à chaque requête.

38. SEARCH ET INDEXATION
Inspecte le système de recherche actuel.
Vérifie en particulier :
si les variantes sont indexées ;
si les recherches retournent des produits centraux ;
si les données vendeur sont accessibles ;
si la localisation est exploitable ;
si les champs nécessaires au ranking existent ;
si le moteur de recherche pourrait servir de candidate retrieval layer.
Si une extension de l’index est nécessaire, privilégie l’existant plutôt que la création d’un moteur parallèle.

39. SEO ET OG METADATA
Les pages de variante/offre doivent avoir des métadonnées cohérentes.
Pour une variante partagée :
<title>

doit correspondre au produit/offre pertinent.
Les OG metadata doivent également correspondre à la variante partagée lorsque les données le permettent :
nom ;
image ;
prix éventuellement ;
vendeur éventuellement ;
description adaptée.
Un lien partagé par un vendeur doit donc afficher ailleurs sur le web une représentation cohérente de l’offre réellement partagée.
Auditer également :
canonical URL ;
Open Graph ;
Twitter/X metadata ;
structured data éventuel ;
sitemap si les fiches sont indexables.

40. PANIER ET ACHAT
Vérifier impérativement que la variante affichée est bien celle utilisée lors de l'achat.
Le flux doit rester cohérent :
fiche
  ↓
variante sélectionnée
  ↓
add to cart
  ↓
variant/offre exacte
  ↓
prix correspondant
  ↓
conditions correspondant
  ↓
checkout

Aucune possibilité ne doit exister pour qu'une sélection d'option visuelle montre une variante mais qu'un autre identifiant soit envoyé au panier.

41. AUDIT DES ROUTES ET COMPOSANTS
Recherche dans tout le projet :
routes /product
routes /products
routes /collection
routes /category
routes /seller
routes /shop
routes /market
routes /neighborhood
routes /search
composants ProductCard
composants ProductGrid
composants ProductList
composants FeaturedProducts
composants RelatedProducts
composants RecommendedProducts
composants CMS ;
loaders ;
hooks ;
query builders ;
GraphQL fragments ;
appels Shop API ;
appels REST ;
services de recherche.
Ne te limite pas aux noms exacts ci-dessus.
Utilise le graphe réel du code.

42. IDENTIFIER LES RÉGRESSIONS RÉCENTES
L'une des hypothèses est qu'une intervention récente a modifié l'ancien comportement correct.
Utilise donc si disponible :
Git history ;
commits récents ;
diffs ;
branches ;
PR ;
fichiers récemment modifiés.
Cherche notamment les changements ayant transformé :
ProductVariant

en
Product

dans les réponses du storefront.
Détermine :
quel était le comportement antérieur ;
ce qui a changé ;
pourquoi cela avait probablement été modifié ;
si la modification corrigeait un ancien problème ;
comment conserver la correction technique sans casser l'invariant métier.
Il ne faut pas simplement « revenir en arrière » sans comprendre la raison de la modification.

43. NE PAS RÉGRESSER SUR LE PROBLÈME INITIAL
Un ancien problème semble avoir motivé les modifications actuelles :
trop de variantes d'un même produit central pouvaient saturer certaines sections.
Ce problème doit être corrigé par :
candidate filtering ;
diversité ;
scoring ;
limite par produit central ;
pagination ;
sélection intelligente.
Il ne doit pas être corrigé en revenant à l'affichage du produit central.
Autrement dit :
la solution au problème de volume ne doit pas détruire la logique commerciale des variantes.

44. PLAN D’IMPLÉMENTATION À PRODUIRE AVANT CODAGE
Après ton audit, produis un plan technique concret contenant au minimum :
A. Diagnostic
Liste des problèmes trouvés.
B. Architecture actuelle
Schéma simplifié des flux actuels.
C. Architecture cible
Schéma :
Central Product
       ↓
Seller Offers / Variants
       ↓
Candidate Retrieval
       ↓
Location Engine
       ↓
Display Engine
       ↓
Diversity + Ranking
       ↓
CMS Section / Search / Page
       ↓
Storefront

D. Fichiers concernés
Lister précisément :
fichiers frontend ;
fichiers backend ;
services ;
resolvers ;
queries ;
hooks ;
composants ;
migrations éventuelles ;
tests.
E. Changements de données
S'il faut modifier le schéma, expliquer précisément pourquoi.
Ne créer aucune migration destructive sans nécessité.
F. Compatibilité
Expliquer :
anciennes URLs ;
anciennes données ;
CMS existant ;
Search ;
panier ;
vendeur ;
checkout.

45. ORDRE D’IMPLÉMENTATION RECOMMANDÉ
Tu peux adapter cet ordre après audit, mais la logique générale doit rester :
Phase 1 — Audit
Comprendre l'existant.
Phase 2 — Rétablir l’unité d’affichage
Faire en sorte que les listings travaillent avec les variantes/offres.
Phase 3 — Corriger la fiche produit
Passer à une fiche contextualisée sur l'offre/variante.
Phase 4 — Centraliser Display Engine
Créer ou restaurer un service commun.
Phase 5 — Localisation
Brancher correctement Location Engine + Display Engine.
Phase 6 — Fallback géographique
Élargissement progressif sans sections vides.
Phase 7 — Diversité/ranking
Limiter la monopolisation des sections.
Phase 8 — Marchés/quartiers
Brancher les contextes géographiques dédiés.
Phase 9 — Recherche
Produits/variantes + marchés + quartiers.
Phase 10 — SEO/OG/URLs
Garantir des liens partageables et canoniques.
Phase 11 — Tests complets
Tester l'ensemble des scénarios.

46. TESTS D’ACCEPTATION OBLIGATOIRES
Créer ou compléter les tests nécessaires.
Cas 1 — Produit multi-vendeurs
Produit central :
A

Vendeurs :
Vendeur 1
Vendeur 2
Vendeur 3

Le storefront doit afficher des offres/variantes concrètes, pas trois fiches identiques basées uniquement sur le produit central.

Cas 2 — Même vendeur, plusieurs variantes
Vendeur A
Produit X
  100 ml
  200 ml
  500 ml

La boutique du vendeur doit afficher les trois variantes.

Cas 3 — Page variante
Cliquer sur :
Produit X / Vendeur A / 200 ml

doit conduire à la fiche de cette offre.

Cas 4 — Changement de variante
Passer :
200 ml
→
500 ml

doit mettre à jour :
nom ;
prix ;
disponibilité ;
livraison ;
identifiant panier ;
URL si nécessaire.

Cas 5 — Vendeur partage son lien
Le client ouvre le lien.
La page doit rester dans le contexte du vendeur concerné.
Elle ne doit pas immédiatement promouvoir une offre concurrente moins chère.

Cas 6 — Localisation avec produits
Utilisateur situé dans zone A.
Des produits existent dans A.
→ les produits de A sont privilégiés.

Cas 7 — Localisation sans produits
Zone A :
0 produit

Zone B proche :
20 produits

→ ne pas afficher « aucun produit ».
→ utiliser le fallback vers B.

Cas 8 — Aucun produit à proximité
Si aucune zone proche n'a de produit :
→ élargir progressivement.
→ ne retourner vide qu'après épuisement des niveaux définis.

Cas 9 — 50 variantes d'un même produit
Un produit central possède 50 offres.
Une section demande 20 résultats.
→ le produit ne doit pas monopoliser les 20 résultats.

Cas 10 — Deux produits différents
Produit A :
50 variantes
Produit B :
5 variantes
Produit C :
3 variantes
→ la section doit rester diversifiée.

Cas 11 — Marché
Page :
Marché X

→ afficher uniquement les offres éligibles à ce contexte.

Cas 12 — Quartier
Page :
Quartier X

→ même logique.

Cas 13 — Quartiers proches
La localisation est donnée.
→ retourner les quartiers proches selon le moteur géographique existant.

Cas 14 — Marchés proches
Même logique pour les marchés.

Cas 15 — Recherche
Tester :
nom produit

nom variante

nom marché

nom quartier


Cas 16 — Utilisateur anonyme
La localisation doit fonctionner sans compte lorsque les données sont disponibles.

Cas 17 — Utilisateur connecté
Le moteur peut utiliser les signaux utilisateur réellement disponibles.
Mais il ne doit jamais casser la priorité géographique ou les règles fondamentales d'éligibilité.

47. CONTRAINTES DE CODE
Respecter les règles suivantes :
pas de duplication inutile de logique ;
pas de second moteur de localisation ;
pas de second système de recherche sans justification ;
pas de logique métier dispersée dans les composants UI ;
pas de logique géographique dans chaque page ;
pas de requêtes gigantesques pour simplement afficher 20 cartes ;
pas de TODO laissé en production ;
pas de fake data pour masquer une fonctionnalité non terminée ;
pas de régression du checkout ;
pas de migration destructive sans nécessité ;
conserver les conventions du repository ;
respecter types, lint, tests et build existants.

48. MÉTRIQUES / OBSERVABILITÉ
Lorsque c'est pertinent, le moteur doit pouvoir exposer ou logger suffisamment d'informations pour diagnostiquer un résultat.
Par exemple :
section
location
candidateCount
eligibleCount
fallbackLevel
distanceRange
centralProductDiversity
sellerDiversity
rankingPolicy

Ces informations peuvent être réservées au backend/debug/admin.
Elles permettront de comprendre plus facilement pourquoi une section renvoie certains résultats.

49. PRINCIPLE DE RESPONSABILITÉ DES MODULES
L'architecture finale devrait idéalement respecter :
Location Engine
→ sait OÙ se trouve le contexte.

Catalog / Search
→ sait QUELS candidats existent.

Eligibility layer
→ sait QUELS candidats peuvent être affichés.

Display Engine
→ décide QUELS candidats afficher et dans quel ordre.

CMS
→ décrit CE QUE la section veut montrer.

Storefront
→ présente le résultat.

Cart / Checkout
→ achète EXACTEMENT la variante choisie.

Ne mélange pas ces responsabilités.

50. RÈGLE DE PRIORITÉ
Lorsque plusieurs exigences entrent en conflit, respecter cet ordre :
intégrité des données et du modèle métier ;
affichage d’une offre/variante réellement achetable ;
disponibilité ;
contexte vendeur ;
localisation ;
pertinence ;
diversité ;
personnalisation ;
merchandising CMS.
Le CMS ou le ranking ne doit jamais forcer l'affichage d'une variante qui n'est pas réellement éligible.

51. LIVRABLE FINAL ATTENDU
À la fin de l'intervention, fournis :
1. Audit
Une liste claire des causes des problèmes actuels.
2. Architecture
Un schéma du nouveau flux.
3. Plan d’implémentation
Les étapes réalisées et les fichiers touchés.
4. Modifications
Implémenter réellement les changements nécessaires.
5. Tests
Ajouter/modifier les tests automatisés.
6. Validation
Exécuter :
tests ;
lint ;
typecheck ;
build ;
vérifications spécifiques storefront/backend.
7. Résumé final
Indiquer :
Ce qui a été corrigé
Ce qui existait déjà et a été réutilisé
Ce qui a été créé
Ce qui a été modifié dans les données
Ce qui reste éventuellement à surveiller


52. RÈGLE IMPORTANTE POUR CETTE INTERVENTION
Ne fais pas une simple correction locale du type :
remplacer Product par ProductVariant

Cette tâche est plus profonde.
Tu dois vérifier la cohérence de toute la chaîne :
création produit
      ↓
association vendeur
      ↓
création variantes
      ↓
localisation
      ↓
indexation/recherche
      ↓
CMS
      ↓
Display Engine
      ↓
listing
      ↓
fiche variante
      ↓
partage
      ↓
panier
      ↓
checkout

La migration est considérée comme réussie uniquement lorsque cette chaîne est cohérente.

53. DERNIÈRE CONSIGNE
Ne commence pas par modifier du code.
Commence par :
lire l’architecture ;
identifier les entités ;
tracer les flux ;
identifier les régressions ;
identifier les services existants ;
identifier le moteur de localisation existant ;
identifier les outils CMS existants ;
identifier le système de recherche ;
identifier le système de scoring ;
identifier toutes les pages qui affichent des produits ;
produire ton diagnostic ;
produire ton plan ;
puis implémenter.
Ne demande pas de recréer toute la plateforme.
Le but est de restaurer et consolider la logique existante, en conservant les bonnes parties de l’architecture actuelle et en éliminant les régressions.
Privilégie une évolution architecturale propre, centralisée, réutilisable et extensible plutôt qu’une succession de corrections spécifiques à chaque page.
Le résultat recherché est un storefront Ahizan dans lequel :
le produit central définit l’identité du produit ; l’offre/variante du vendeur constitue l’unité commerciale ; le moteur d’affichage sélectionne intelligemment ces offres ; le moteur de localisation détermine le contexte géographique ; le CMS exprime les intentions de présentation ; et la fiche produit, le partage et le panier restent cohérents avec la variante réellement choisie.

