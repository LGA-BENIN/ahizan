MANUEL VENDURE POUR AHIZAN
TOME 5 — ARCHITECTURE MARKETPLACE ET GESTION DES VENDEURS

Version 1.0 — Document de référence
Projet : Ahizan Marketplace
Base technique : Vendure

SOMMAIRE
Objet du Tome 5
Vision marketplace d'Ahizan
Les trois niveaux fondamentaux
Le vendeur
La boutique
Le produit catalogue
La variante catalogue
L'offre vendeur
Prix et stock vendeur
Pourquoi séparer produit et vendeur
Exemple concret
Architecture recommandée
Inscription d'un vendeur
Validation d'un vendeur
Création d'une offre
Un produit, plusieurs vendeurs
Gestion des prix
Gestion des stocks
Disponibilité d'une offre
Commandes multi-vendeurs
Exemple d'une commande Ahizan
Découpage de la commande
Préparation des commandes
Refus d'une commande par un vendeur
Remplacement d'un vendeur
Vendeur de secours
Modification du prix après commande
Rupture de stock
Annulation
Commissions Ahizan
Paiement du vendeur
Retours et remboursements
Évaluation des vendeurs
Performance vendeur
Niveau de confiance vendeur
Gestion des produits interdits ou non conformes
Architecture Vendure / Ahizan
Channels et vendeurs
Custom Fields
Rôles et permissions
Workflow opérationnel complet
Règles d'or Ahizan
Architecture cible
Conclusion
1. OBJET DU TOME 5

Les Tomes précédents ont défini :

le catalogue ;
les produits ;
les options ;
les variantes ;
les SKU ;
les fiches produits ;
les Facets ;
la normalisation ;
l'intelligence artificielle.

Le Tome 5 aborde maintenant le cœur de la marketplace :

Comment plusieurs vendeurs peuvent-ils vendre le même produit sur Ahizan tout en conservant chacun leur propre prix, leur propre stock, leur propre préparation et leur propre responsabilité ?

C'est une question fondamentale.

Ahizan ne doit pas être conçu comme un simple site où chaque vendeur crée une boutique indépendante.

Il doit fonctionner comme une véritable marketplace avec :

un catalogue centralisé + plusieurs offres commerciales.

2. VISION MARKETPLACE D'AHIZAN

Le modèle cible est :

AHIZAN

↓

CATALOGUE CENTRAL

↓

PRODUITS

↓

VARIANTES

↓

OFFRES VENDEURS

↓

PRIX + STOCK + CONDITIONS

↓

COMMANDES

↓

LOGISTIQUE

↓

PAIEMENT

3. LES TROIS NIVEAUX FONDAMENTAUX

Il faut absolument distinguer :

Niveau 1 — Produit

Ce que le produit est.

Niveau 2 — Offre vendeur

Ce que le vendeur propose pour ce produit.

Niveau 3 — Commande

Ce que le client achète.

4. LE VENDEUR

Le vendeur est le commerçant qui propose des produits sur Ahizan.

Il possède notamment :

identité ;
coordonnées ;
documents ;
boutique ;
statut ;
informations bancaires ou de paiement ;
historique ;
notation ;
performances.

Le vendeur ne doit pas être confondu avec le produit.

5. LA BOUTIQUE

Chaque vendeur peut posséder une boutique sur Ahizan.

Exemple :

Vendeur

FR NÉGOCE

Boutique

FR NÉGOCE — Cotonou

La boutique peut contenir :

logo ;
nom commercial ;
description ;
localisation générale ;
horaires ;
conditions de vente ;
politique de retour ;
note ;
nombre de ventes.
6. LE PRODUIT CATALOGUE

Le produit catalogue appartient à Ahizan.

Exemple :

Coca-Cola 50 cl

Ce produit ne doit pas appartenir au vendeur A ou au vendeur B.

Il appartient au catalogue Ahizan.

Les vendeurs viennent ensuite proposer leurs offres sur ce produit.

7. LA VARIANTE CATALOGUE

Exemple :

Produit :

Coca-Cola

Variantes :

33 cl ;
50 cl ;
1,5 L.

Chaque variante possède sa propre identité catalogue.

8. L'OFFRE VENDEUR

C'est l'un des concepts les plus importants de toute l'architecture Ahizan.

Une offre vendeur signifie :

« Ce vendeur propose cette variante précise à ce prix et avec ce stock. »

Exemple :

Produit

Coca-Cola 50 cl

Vendeur A

Prix : 500 FCFA
Stock : 100

Vendeur B

Prix : 475 FCFA
Stock : 40

Vendeur C

Prix : 550 FCFA
Stock : 200

Il s'agit d'un seul produit catalogue avec trois offres commerciales.

9. PRIX ET STOCK VENDEUR

Le prix et le stock doivent être liés à l'offre commerciale.

Exemple :

Vendeur	Produit	Prix	Stock
A	Coca-Cola 50 cl	500	100
B	Coca-Cola 50 cl	475	40
C	Coca-Cola 50 cl	550	200

Le produit lui-même ne doit pas porter arbitrairement le prix d'un vendeur.

10. POURQUOI SÉPARER PRODUIT ET VENDEUR ?

Prenons :

Samsung Galaxy A16 256 Go

Si cinq vendeurs le vendent, Ahizan ne doit pas créer :

Samsung A16 vendeur A ;
Samsung A16 vendeur B ;
Samsung A16 vendeur C ;
Samsung A16 vendeur D ;
Samsung A16 vendeur E.

Cela provoquerait :

doublons ;
mauvais référencement ;
recherche inefficace ;
statistiques fragmentées ;
mauvaise comparaison des prix.

Il faut :

UN produit

et

CINQ offres.
11. EXEMPLE CONCRET
Produit catalogue

Samsung Galaxy A16 — 256 Go

Variante

Noir / 256 Go

Offres

Vendeur A

145 000 FCFA

Stock : 10

Vendeur B

142 000 FCFA

Stock : 5

Vendeur C

149 000 FCFA

Stock : 20

Le client voit :

Samsung Galaxy A16 — Noir — 256 Go

Puis :

Offres disponibles
Vendeur	Prix	Disponibilité
Vendeur B	142 000	Disponible
Vendeur A	145 000	Disponible
Vendeur C	149 000	Disponible
12. ARCHITECTURE RECOMMANDÉE

La structure métier Ahizan devrait être :

Product
   │
   └── ProductVariant
           │
           ├── SellerOffer A
           │      ├── Price
           │      ├── Stock
           │      └── Seller
           │
           ├── SellerOffer B
           │      ├── Price
           │      ├── Stock
           │      └── Seller
           │
           └── SellerOffer C
                  ├── Price
                  ├── Stock
                  └── Seller

Cette architecture doit être considérée comme une couche marketplace Ahizan au-dessus du modèle catalogue Vendure.

13. INSCRIPTION D'UN VENDEUR

Le vendeur commence par créer un compte.

Étape 1

Création du compte.

Étape 2

Informations personnelles ou professionnelles.

Étape 3

Informations de boutique.

Étape 4

Documents requis.

Étape 5

Informations de paiement.

Étape 6

Acceptation des conditions.

Étape 7

Contrôle Ahizan.

Étape 8

Activation.

14. VALIDATION D'UN VENDEUR

Le vendeur peut avoir plusieurs statuts :

PENDING

Inscription reçue.

↓

UNDER_REVIEW

Dossier en vérification.

↓

APPROVED

Vendeur validé.

↓

ACTIVE

Vendeur opérationnel.

↓

SUSPENDED

Vendeur suspendu.

↓

CLOSED

Compte fermé.

15. CRÉATION D'UNE OFFRE

Lorsqu'un vendeur veut vendre un produit :

Cas 1

Le produit existe déjà.

Ahizan affiche :

Vendre ce produit

Le vendeur renseigne :

prix ;
stock ;
condition ;
garantie ;
délai de préparation ;
éventuellement son SKU.

Ahizan crée alors une offre.

Cas 2

Le produit n'existe pas.

Le vendeur soumet le produit.

Ahizan le traite selon le workflow défini dans le Tome 4.

Après validation :

le vendeur peut créer son offre.

16. UN PRODUIT, PLUSIEURS VENDEURS

C'est la situation normale d'Ahizan.

Exemple :

Produit

Huile Dinor 1 L

Offres

Vendeur A :

2 500 FCFA

Vendeur B :

2 450 FCFA

Vendeur C :

2 600 FCFA

Ahizan peut alors proposer au client :

Meilleur prix : 2 450 FCFA

Mais le meilleur prix ne doit pas être le seul critère.

17. LE MEILLEUR VENDEUR

Ahizan doit pouvoir établir un classement des offres.

Le classement peut tenir compte de :

prix ;
disponibilité ;
distance ;
délai ;
note vendeur ;
taux d'annulation ;
taux de préparation ;
fiabilité ;
historique.
Exemple

Vendeur A :

145 000 FCFA
Note 4,9/5
Préparation rapide

Vendeur B :

142 000 FCFA
Note 3,2/5
Nombreuses annulations

Ahizan peut décider de présenter A en premier malgré son prix légèrement supérieur.

18. STOCK

Le stock appartient à l'offre vendeur.

Exemple :

Vendeur A :

Stock = 10

Vendeur B :

Stock = 50

Vendeur C :

Stock = 0

Le produit catalogue reste disponible.

Seule l'offre C devient indisponible.

19. DISPONIBILITÉ D'UNE OFFRE

Une offre peut avoir plusieurs états :

ACTIVE

Disponible à la vente.

OUT_OF_STOCK

Rupture.

PAUSED

Vendeur temporairement indisponible.

SUSPENDED

Ahizan a suspendu l'offre.

EXPIRED

Offre expirée selon les règles définies.

20. COMMANDES MULTI-VENDEURS

C'est l'une des particularités les plus importantes d'Ahizan.

Un client peut acheter :

produit A chez vendeur 1 ;
produit B chez vendeur 2 ;
produit C chez vendeur 3.

Pour le client :

une seule commande.

Pour Ahizan :

plusieurs sous-commandes opérationnelles.

21. EXEMPLE D'UNE COMMANDE AHIZAN

Client :

Monsieur X

Commande :

Produit 1

Téléphone

Vendeur A

Produit 2

Chaussures

Vendeur B

Produit 3

Boisson

Vendeur C

Produit 4

Sac

Vendeur A

Le client effectue :

un seul paiement

Mais Ahizan doit créer une structure logistique permettant de distinguer :

Sous-commande A

Téléphone + Sac

Sous-commande B

Chaussures

Sous-commande C

Boisson

22. DÉCOUPAGE DE LA COMMANDE

Architecture recommandée :

ORDER AHIZAN
│
├── SELLER ORDER A
│      ├── Produit 1
│      └── Produit 4
│
├── SELLER ORDER B
│      └── Produit 2
│
└── SELLER ORDER C
       └── Produit 3

La commande globale reste liée au client.

Les sous-commandes permettent la gestion opérationnelle.

23. PRÉPARATION DES COMMANDES

Chaque vendeur reçoit uniquement les éléments qui le concernent.

Vendeur A

Préparer téléphone + sac.

Vendeur B

Préparer chaussures.

Vendeur C

Préparer boisson.

Le vendeur ne doit pas nécessairement voir les commandes des autres vendeurs.

24. REFUS D'UNE COMMANDE PAR UN VENDEUR

C'est un scénario que tu avais déjà identifié comme très important pour Ahizan.

Exemple :

Le client commande :

10 produits provenant de 5 vendeurs.

Un vendeur refuse finalement la commande.

Ahizan doit alors :

Étape 1

Bloquer temporairement la partie concernée de la préparation.

Étape 2

Identifier la variante exacte.

Étape 3

Rechercher d'autres vendeurs proposant cette même variante.

Étape 4

Vérifier :

stock ;
prix ;
distance ;
délai ;
fiabilité.
Étape 5

Proposer automatiquement un vendeur de remplacement.

25. REMPLACEMENT D'UN VENDEUR

Exemple :

Client commande :

10 cartons de produit X.

Vendeur A devait fournir :

10 cartons.

Vendeur A refuse.

Ahizan recherche :

Vendeur B

Stock :

20 cartons

Prix :

légèrement supérieur

Ahizan peut transférer l'approvisionnement.

Important

Le remplacement ne doit pas modifier silencieusement le prix payé par le client.

Ahizan doit définir une règle commerciale.

26. RÈGLE DE REMPLACEMENT RECOMMANDÉE

Je recommande :

Si le prix du vendeur de remplacement est inférieur

Le client conserve son prix initial.

La différence constitue éventuellement une économie pour Ahizan ou doit être traitée selon la politique commerciale.

Si le prix est supérieur

Ahizan doit décider :

Option A

Ahizan prend la différence à sa charge.

Option B

Le client doit accepter le nouveau prix.

Option C

La commande concernée est annulée et remboursée.

Pour une expérience client premium, l'option A peut être très intéressante dans certaines limites.

27. VENDEUR DE SECOURS

Ahizan devrait progressivement créer un système de :

Backup Seller

Pour chaque produit très demandé, Ahizan peut connaître :

vendeur principal ;
vendeur secondaire ;
vendeur tertiaire.

Exemple :

Produit X

Vendeur A — priorité 1
Vendeur B — priorité 2
Vendeur C — priorité 3

Si A échoue :

B est automatiquement sollicité.

28. RUPTURE DE STOCK

Une rupture peut survenir entre :

commande ;
confirmation ;
préparation.

Ahizan doit donc prévoir une réservation du stock.

Processus

Commande reçue

↓

Stock réservé

↓

Vendeur confirme

↓

Préparation

↓

Stock définitivement déduit

Cette logique doit être définie avec précision lors de l'implémentation Vendure.

29. ANNULATION

Une commande peut être annulée par :

Client

Avant préparation.

Vendeur

Selon les règles Ahizan.

Ahizan

En cas de problème.

Système

En cas d'échec automatique.

Chaque annulation doit avoir une raison.

Exemples :

rupture ;
produit indisponible ;
vendeur injoignable ;
fraude ;
erreur de prix ;
problème logistique.
30. COMMISSIONS AHIZAN

Ahizan doit définir une commission.

Exemple :

Produit vendu :

100 000 FCFA

Commission :

10 %

Ahizan :

10 000 FCFA

Vendeur :

90 000 FCFA

Mais la commission peut varier selon :

catégorie ;
vendeur ;
volume ;
campagne ;
contrat.
31. PAIEMENT DU VENDEUR

Le paiement vendeur ne doit pas nécessairement être immédiat.

Ahizan peut mettre en place :

Commande payée

↓

Commande livrée

↓

Période de contestation

↓

Montant libérable

↓

Paiement vendeur

Cette architecture protège la marketplace contre certaines situations de litige.

32. RETOURS ET REMBOURSEMENTS

Ahizan doit distinguer :

Retour produit

Le produit revient au vendeur.

Remboursement client

Le client récupère son argent.

Commission Ahizan

Elle doit être recalculée selon la politique définie.

Stock

Le stock doit être réintégré seulement si le produit est réellement revendable.

33. ÉVALUATION DES VENDEURS

Après une commande, le client peut noter :

produit ;
vendeur ;
livraison ;
expérience.

La note vendeur peut être calculée à partir de plusieurs indicateurs.

34. PERFORMANCE VENDEUR

Ahizan doit suivre notamment :

Taux d'acceptation

Commandes acceptées / commandes reçues.

Taux d'annulation

Commandes annulées / commandes acceptées.

Taux de préparation à temps

Commandes préparées dans le délai.

Taux de rupture

Commandes impossibles à satisfaire.

Note moyenne

Évaluation client.

35. NIVEAU DE CONFIANCE VENDEUR

Ahizan peut attribuer un niveau :

GOLD

Vendeur très fiable.

SILVER

Vendeur fiable.

STANDARD

Vendeur normal.

WATCH

Vendeur sous surveillance.

SUSPENDED

Vendeur suspendu.

Ce niveau peut influencer le classement des offres.

36. PRODUITS NON CONFORMES

Ahizan doit pouvoir suspendre une offre lorsqu'un vendeur :

utilise une fausse marque ;
fournit une mauvaise description ;
utilise une image trompeuse ;
vend une variante différente ;
falsifie un prix ;
utilise un mauvais code-barres ;
accumule les plaintes.

La suspension peut concerner :

l'offre uniquement

ou

le vendeur entier

selon la gravité.

37. ARCHITECTURE VENDURE / AHIZAN

C'est probablement la partie la plus importante techniquement.

Vendure fournit une grande partie du moteur e-commerce :

Products ;
ProductVariants ;
Orders ;
Customers ;
Channels ;
Stock ;
Promotions ;
Shipping ;
Payment ;
Permissions ;
APIs.

Ahizan doit ajouter sa couche marketplace.

38. LA COUCHE MARKETPLACE AHIZAN

Je recommande une architecture conceptuelle comprenant notamment :

Seller

Identité du vendeur.

SellerStore

Boutique.

SellerOffer

Offre commerciale.

SellerOrder

Sous-commande vendeur.

SellerSettlement

Montant à reverser au vendeur.

SellerPerformance

Indicateurs de performance.

SellerPayout

Paiement effectué au vendeur.

Ces entités constituent la couche métier marketplace Ahizan.

39. CUSTOM FIELDS

Les Custom Fields Vendure peuvent être utilisés pour compléter les données natives lorsque cela est approprié.

Par exemple :

Product
ahizanQualityScore
brand
manufacturer
catalogStatus
ProductVariant
sellerSku
gtin
packSize
OrderLine
informations opérationnelles nécessaires.

Mais les informations fondamentales du marketplace qui nécessitent leur propre logique relationnelle ne doivent pas être artificiellement stockées dans des Custom Fields.

40. CHANNELS ET VENDEURS

Vendure possède une notion de Channel permettant de séparer certains contextes commerciaux.

Cette fonctionnalité peut être utile pour Ahizan.

Mais une règle importante doit être posée :

Un vendeur ne doit pas automatiquement être considéré comme un Channel.

Pourquoi ?

Parce que :

Channel = contexte commercial / opérationnel

alors que :

Seller = acteur marketplace.

Le modèle exact doit être décidé selon l'architecture finale d'Ahizan.

41. RÔLES ET PERMISSIONS

Ahizan doit contrôler précisément les accès.

Vendeur

Peut :

voir ses offres ;
modifier ses prix ;
modifier ses stocks ;
recevoir ses commandes ;
préparer ses commandes.
Gestionnaire catalogue

Peut :

gérer les produits ;
gérer les catégories ;
contrôler les fiches.
Gestionnaire marketplace

Peut :

gérer les vendeurs ;
gérer les offres ;
gérer les commissions ;
gérer les litiges.
Logisticien

Peut :

voir les commandes ;
organiser les collectes ;
suivre les livraisons.
Administrateur

Accès global.

42. WORKFLOW OPÉRATIONNEL COMPLET

Voici le workflow de référence.

Étape 1

Client recherche un produit.

↓

Étape 2

Ahizan affiche le produit catalogue.

↓

Étape 3

Ahizan recherche les offres disponibles.

↓

Étape 4

Le moteur classe les vendeurs.

↓

Étape 5

Client choisit.

↓

Étape 6

Commande créée.

↓

Étape 7

Stock réservé.

↓

Étape 8

Commande découpée par vendeur.

↓

Étape 9

Chaque vendeur reçoit sa sous-commande.

↓

Étape 10

Vendeurs confirment.

↓

Étape 11

Ahizan organise la collecte.

↓

Étape 12

Produits regroupés si nécessaire.

↓

Étape 13

Livraison client.

↓

Étape 14

Commande clôturée.

↓

Étape 15

Règlement vendeur.

43. CAS PARTICULIER : PRODUITS DE PLUSIEURS ZONES

Exemple :

Client à Cotonou.

Commande :

vendeur A à Akpakpa ;
vendeur B à Godomey ;
vendeur C à Abomey-Calavi ;
vendeur D à Porto-Novo.

Ahizan doit calculer la logistique.

Il ne faut pas simplement considérer :

4 vendeurs = 4 livraisons.

Le moteur logistique doit déterminer :

regroupement possible ;
itinéraire ;
ordre des collectes ;
point de consolidation ;
coût ;
délai.
44. POINT DE CONSOLIDATION

Ahizan peut utiliser un entrepôt ou relais comme :

Hub de consolidation

Les vendeurs déposent ou sont collectés.

Les produits sont regroupés.

Puis :

une livraison finale vers le client.

Cette architecture sera particulièrement intéressante lorsque Ahizan aura un volume important.

45. EXEMPLE

Client commande :

Vendeur A

2 produits

Vendeur B

3 produits

Vendeur C

1 produit

Les trois vendeurs sont proches.

Ahizan peut organiser :

Collecte A

↓

Collecte B

↓

Collecte C

↓

Hub Ahizan

↓

Colis client

↓

Livraison

Cela réduit potentiellement les coûts logistiques.

46. RÈGLES D'OR AHIZAN
Règle 1

Un produit catalogue doit être indépendant des vendeurs.

Règle 2

Une variante catalogue doit être indépendante des vendeurs.

Règle 3

Le prix appartient à l'offre vendeur.

Règle 4

Le stock appartient à l'offre vendeur.

Règle 5

Le vendeur ne doit pas pouvoir modifier arbitrairement les données communes du catalogue.

Règle 6

Une commande client peut être divisée en plusieurs sous-commandes vendeur.

Règle 7

Ahizan doit pouvoir remplacer un vendeur défaillant lorsque cela est possible.

Règle 8

Le système doit conserver l'historique des changements.

Règle 9

Le paiement vendeur doit être traçable.

Règle 10

Les performances vendeur doivent être mesurées.

47. ARCHITECTURE CIBLE AHIZAN

Le modèle global devient :

                         AHIZAN
                            │
                 ┌──────────┴──────────┐
                 │                     │
             CATALOGUE             MARKETPLACE
                 │                     │
          ┌──────┴──────┐        ┌─────┴─────┐
          │             │        │           │
       Product       Variant   Sellers     Offers
                                   │           │
                                   │      Prix / Stock
                                   │
                              Seller Orders
                                   │
                              Logistics
                                   │
                               Payment
                                   │
                               Settlement
48. MODÈLE ÉCONOMIQUE

Ahizan peut générer des revenus grâce à :

commission sur ventes ;
frais logistiques ;
abonnement vendeur ;
publicité ;
mise en avant ;
services premium ;
services de stockage ;
services de préparation ;
services B2B.

Le modèle économique doit cependant rester indépendant du modèle catalogue.

49. VISION À LONG TERME

Lorsque Ahizan atteindra une taille importante, le système pourra devenir :

Catalogue central

Des dizaines de milliers de produits.

Réseau vendeur

Des milliers de vendeurs.

Réseau logistique

Collecteurs + hubs + livreurs.

Intelligence

IA catalogue + IA recommandation + IA logistique.

Finance

Paiement + commissions + règlements.

Ahizan deviendra alors non seulement une marketplace, mais une véritable infrastructure commerciale numérique.

50. CONCLUSION

Le principe fondamental du Tome 5 peut être résumé en une phrase :

Ahizan ne doit pas être une collection de boutiques ; Ahizan doit être un catalogue central auquel plusieurs vendeurs apportent leurs offres.

La structure recommandée est :

PRODUCT

↓

PRODUCT VARIANT

↓

SELLER OFFER

↓

PRICE + STOCK

↓

ORDER

↓

SELLER ORDER

↓

LOGISTICS

↓

PAYMENT

↓

SETTLEMENT

Vendure constitue le moteur e-commerce sur lequel cette architecture peut être construite, tandis que la couche marketplace spécifique à Ahizan doit gérer les relations entre vendeurs, offres, commandes, commissions et logistique.