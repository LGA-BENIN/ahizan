MANUEL VENDURE ADAPTÉ À AHIZAN
TOME 8 — MODÈLE DE DONNÉES, BASE DE DONNÉES ET ENTITÉS MÉTIER

Version 1.0 — Document de référence technique
Projet : Ahizan Marketplace
Socle : Vendure
Statut : Architecture de référence

AVERTISSEMENT TECHNIQUE

Ce Tome 8 est conçu comme un document d'architecture, et non comme une simple copie de la documentation Vendure.

Il distingue volontairement :

les entités natives de Vendure qui doivent être réutilisées ;
les Custom Fields qui permettent d'ajouter des informations à ces entités ;
les entités métier propres à Ahizan qui doivent être créées dans des plugins ;
les relations entre ces différentes données.

C'est important, car Ahizan ne doit pas reconstruire inutilement ce que Vendure sait déjà faire.

Vendure permet notamment aux plugins de définir de nouvelles entités de base de données, d'étendre GraphQL et d'ajouter des Custom Fields aux entités existantes.

SOMMAIRE
Objet du Tome 8
Principe fondamental de la base Ahizan
Les trois catégories de données
Architecture générale des données
Entités natives Vendure à conserver
Channel
Seller
Product
ProductVariant
ProductVariantPrice
StockLocation
Stock et Inventory
Customer
Order
OrderLine
Payment
Fulfillment
ShippingMethod
Promotions et taxes
Custom Fields Ahizan
Entités spécifiques Ahizan
SellerProfile
SellerOffer
SellerOfferPrice
SellerStock
SellerOrder
SellerOrderLine
ReplacementRequest
Hub
PickupMission
DeliveryMission
Package
Settlement
Commission
Payout
ReturnRequest
Dispute
SellerPerformance
ProductQuality
AIProcessingJob
Relations entre les entités
Schéma global
Identifiants et références
SKU
EAN/GTIN
Slug
Prix et montants
Statuts
Historisation
Suppression et archivage
Indexation
Intégrité des données
Transactions
Sécurité et permissions
Exemple complet d'une commande
Exemple d'un vendeur
Exemple d'une offre
Exemple d'un règlement
Architecture SQL conceptuelle
Règles d'or de la base Ahizan
Architecture cible finale
1. OBJET DU TOME 8

Le Tome 7 définissait comment construire Ahizan.

Le Tome 8 définit maintenant :

quelles données Ahizan doit stocker, où elles doivent être stockées et comment elles doivent être reliées.

C'est l'un des documents les plus importants du projet.

Une mauvaise architecture de données peut provoquer :

des doublons ;
des incohérences de stock ;
des erreurs de prix ;
des problèmes de commande ;
des erreurs de commission ;
des difficultés de remboursement ;
des problèmes de performance.
2. PRINCIPE FONDAMENTAL DE LA BASE AHIZAN

La règle fondamentale est :

Ne jamais créer une nouvelle entité lorsqu'une entité native Vendure répond déjà correctement au besoin.

Exemple :

Ahizan n'a pas besoin de créer :

AhizanProduct

simplement parce qu'Ahizan utilise des produits.

Vendure possède déjà :

Product

et :

ProductVariant.

Ahizan doit plutôt étendre ces entités lorsque nécessaire.

3. LES TROIS CATÉGORIES DE DONNÉES
CATÉGORIE A — DONNÉES NATIVES VENDURE

Exemples :

Product ;
ProductVariant ;
Order ;
OrderLine ;
Customer ;
Payment ;
Fulfillment ;
Channel ;
Seller ;
StockLocation.
CATÉGORIE B — CUSTOM FIELDS

Exemples :

ProductVariant
 ├── gtin
 ├── manufacturerCode
 └── packagingUnit

Vendure permet d'ajouter des Custom Fields à de nombreuses entités et ces champs sont intégrés à la base de données et aux APIs GraphQL.

CATÉGORIE C — ENTITÉS AHIZAN

Exemples :

SellerOffer ;
SellerOrder ;
ReplacementRequest ;
Hub ;
PickupMission ;
DeliveryMission ;
Settlement ;
Dispute.

Ces entités doivent vivre dans les plugins Ahizan.

4. ARCHITECTURE GÉNÉRALE DES DONNÉES

Vue simplifiée :

                    CHANNEL
                       │
                       │
                    SELLER
                       │
              ┌────────┴────────┐
              │                 │
        SELLER PROFILE      SELLER OFFER
                                  │
                                  │
PRODUCT ───── PRODUCT VARIANT ────┘
                 │
                 │
              STOCK
                 │
                 ▼
              CUSTOMER
                 │
                 ▼
               ORDER
                 │
          ┌──────┴──────┐
          │             │
      ORDER LINE     PAYMENT
          │
          ▼
     SELLER ORDER
          │
          ▼
      LOGISTICS
          │
     ┌────┼────┐
     │    │    │
  PICKUP HUB DELIVERY
          │
          ▼
      FULFILLMENT
          │
          ▼
      SETTLEMENT
5. ENTITÉS NATIVES VENDURE À CONSERVER

Le socle Ahizan doit réutiliser autant que possible les entités natives de Vendure.

Domaine	Entité
Marketplace	Channel
Marketplace	Seller
Catalogue	Product
Catalogue	ProductVariant
Catalogue	Asset
Stock	StockLocation
Client	Customer
Commande	Order
Commande	OrderLine
Paiement	Payment
Livraison	Fulfillment
Expédition	ShippingMethod
Promotion	Promotion
Fiscalité	TaxCategory / TaxRate

Vendure documente notamment Channel, Seller, Product, ProductVariant, Order, Payment, Fulfillment et les autres entités comme faisant partie de son modèle de données.

6. CHANNEL

Le Channel représente un contexte de vente distinct.

Il peut contrôler notamment :

devise ;
langue ;
taxes ;
produits ;
prix ;
stock ;
méthodes de paiement ;
méthodes de livraison ;
commandes ;
permissions.

Vendure utilise explicitement les Channels pour les architectures multi-vendeurs.

6.1 MODÈLE AHIZAN

Dans l'architecture marketplace Vendure :

Seller
   │
   └── Channel

Chaque Channel est associé à un Seller.

Attention

Pour Ahizan, la décision :

1 vendeur = 1 Channel

doit être validée définitivement avec l'architecte avant le développement.

Elle est possible et correspond au modèle marketplace de Vendure, mais elle aura des conséquences sur :

prix ;
catalogue ;
stock ;
permissions ;
commandes.
7. SELLER

Vendure possède désormais une véritable entité Seller.

Elle représente :

la personne ou l'organisation qui vend sur un Channel.

L'entité native possède notamment :

Seller
 ├── id
 ├── name
 ├── deletedAt
 ├── customFields
 └── channels

Ahizan doit éviter de recréer inutilement une deuxième entité Seller.

8. PRODUCT

Product représente le produit générique.

Exemple :

Coca-Cola

Ce n'est pas encore :

Coca-Cola 50 cl vendu par Boutique X à 600 FCFA.

Le produit constitue le référentiel catalogue.

9. PRODUCT VARIANT

La variante représente une version vendable du produit.

Exemple :

Produit :
Samsung Galaxy A16

Variantes :
 ├── 128 Go / Noir
 ├── 128 Go / Bleu
 └── 256 Go / Noir

C'est généralement la variante qui porte les informations directement liées à l'achat :

SKU ;
prix ;
stock ;
poids ;
dimensions ;
options.
10. PRODUCTVARIANTPRICE

Il faut faire une distinction importante.

Dans Vendure, le prix n'est pas simplement une propriété unique du ProductVariant.

Les prix sont associés aux Channels via ProductVariantPrice.

Cela devient particulièrement important pour Ahizan.

11. STOCKLOCATION

Un StockLocation représente un lieu physique où le stock est conservé.

Exemples Ahizan :

StockLocation
 ├── Boutique vendeur
 ├── Entrepôt vendeur
 ├── Entrepôt Ahizan
 └── Hub Ahizan

Vendure permet d'associer les StockLocations aux Channels.

12. STOCK ET INVENTORY

Il faut distinguer :

Stock physique

Ce qui existe réellement.

Stock disponible

Ce qui peut être vendu.

Stock alloué

Ce qui a été réservé pour des commandes.

Stock vendu

Ce qui a réellement été vendu.

Exemple :

Stock physique       = 100
Stock déjà réservé   = 20
Stock disponible     = 80

Cette distinction est fondamentale pour Ahizan.

13. CUSTOMER

Le Customer représente le client.

Ahizan doit éviter de créer un :

AhizanCustomer

si les besoins sont couverts par l'entité native.

Les informations supplémentaires peuvent être ajoutées via Custom Fields.

14. ORDER

Order représente la commande.

Dans Ahizan :

Order = commande globale du client.

Exemple :

AHZ-2026-000125

Cette commande peut contenir des produits provenant de plusieurs vendeurs.

15. ORDERLINE

Chaque OrderLine représente une ligne de commande.

Exemple :

Order
 │
 ├── OrderLine 1
 ├── OrderLine 2
 ├── OrderLine 3
 └── OrderLine 4

Chaque ligne doit pouvoir être reliée à l'offre vendeur qui a réellement été sélectionnée.

16. PAYMENT

Le Payment représente le paiement effectué par le client.

Il ne faut surtout pas confondre :

Payment

avec :

Settlement.

Payment

Argent du client vers Ahizan.

Settlement

Argent qu'Ahizan doit ensuite au vendeur.

17. FULFILLMENT

Le Fulfillment représente l'exécution logistique d'une commande.

Ahizan devra l'utiliser pour représenter la partie e-commerce de l'expédition.

Mais il est recommandé de conserver les opérations logistiques détaillées dans les propres entités Ahizan.

18. SHIPPINGMETHOD

Vendure possède déjà les méthodes de livraison.

Ahizan pourra définir :

livraison standard ;
express ;
retrait ;
point relais ;
livraison volumineuse.

Les règles métier avancées pourront être ajoutées dans LogisticsPlugin.

19. PROMOTIONS ET TAXES

Ahizan doit également réutiliser les mécanismes Vendure pour :

promotions ;
coupons ;
catégories fiscales ;
taux de taxe.

Il faut éviter de créer une deuxième architecture promotionnelle indépendante sans raison.

20. CUSTOM FIELDS AHIZAN

Les Custom Fields constituent un outil très puissant.

Vendure permet notamment les types :

string
text
int
float
boolean
datetime
struct
relation
champs localisés.
21. CUSTOM FIELDS — PRODUCT

Exemple recommandé :

Product.customFields
 ├── brand
 ├── manufacturer
 ├── productType
 ├── ahizanCategoryCode
 └── aiQualityScore

Mais il ne faut pas transformer Product.customFields en fourre-tout.

22. CUSTOM FIELDS — PRODUCTVARIANT

Exemple :

ProductVariant.customFields
 ├── gtin
 ├── manufacturerSku
 ├── weight
 ├── length
 ├── width
 ├── height
 ├── packagingUnit
 └── fragile

Vendure cite justement GTIN, poids et dimensions parmi les cas d'utilisation des Custom Fields sur ProductVariant.

23. CUSTOM FIELDS — SELLER

Exemple :

Seller.customFields
 ├── legalName
 ├── businessPhone
 ├── businessEmail
 ├── verificationStatus
 ├── verificationDate
 ├── sellerType
 └── rating
24. CUSTOM FIELDS — STOCKLOCATION

Exemple :

StockLocation.customFields
 ├── latitude
 ├── longitude
 ├── zoneCode
 ├── pickupAvailable
 └── operatingHours

Vendure cite notamment latitude et longitude comme exemple de Custom Fields sur StockLocation.

25. ENTITÉS SPÉCIFIQUES AHIZAN

Voici maintenant le cœur de la base spécifique Ahizan.

SellerProfile
SellerOffer
SellerOfferPrice
SellerStock
SellerOrder
SellerOrderLine
ReplacementRequest
Hub
PickupMission
DeliveryMission
Package
Settlement
Commission
Payout
ReturnRequest
Dispute
SellerPerformance
ProductQuality
AIProcessingJob
26. SELLERPROFILE

Même si certaines informations peuvent être stockées dans Seller.customFields, je recommande une entité séparée pour les données administratives importantes.

Structure conceptuelle
SellerProfile
 ├── id
 ├── sellerId
 ├── legalName
 ├── commercialName
 ├── phone
 ├── email
 ├── address
 ├── taxId
 ├── registrationNumber
 ├── status
 ├── verifiedAt
 └── createdAt
27. SELLEROFFER

C'est l'une des entités les plus importantes d'Ahizan.

Elle répond à la question :

Quel vendeur propose quelle variante, à quel prix et avec quelle disponibilité ?

Structure
SellerOffer
 ├── id
 ├── sellerId
 ├── productVariantId
 ├── stockLocationId
 ├── price
 ├── currency
 ├── sellerSku
 ├── condition
 ├── status
 ├── leadTime
 ├── minQuantity
 ├── maxQuantity
 ├── priority
 ├── createdAt
 └── updatedAt
28. RELATION SELLEROFFER
SELLER
   │
   └────< SELLER_OFFER >──── PRODUCT_VARIANT
                    │
                    └──── STOCK_LOCATION

Un vendeur peut avoir plusieurs offres.

Une variante peut avoir plusieurs vendeurs.

29. EXEMPLE

Produit :

Bernard Rémy Blanc de Blancs

Variante :

Bouteille 75 cl

Offres :

Vendeur A
Prix : 8 500 FCFA
Stock : 20

Vendeur B
Prix : 8 200 FCFA
Stock : 10

Vendeur C
Prix : 9 000 FCFA
Stock : 100

Le client voit éventuellement :

À partir de 8 200 FCFA

30. SELLEROFFERPRICE

Il peut être intéressant de séparer le prix de l'offre lorsque Ahizan doit gérer :

historique ;
prix promotionnel ;
prix professionnel ;
prix par période.

Exemple :

SellerOffer
      │
      ├── Price 8 500
      ├── Promotion 8 000
      └── Start / End
31. SELLERSTOCK

Il faut décider si le stock vendeur doit être entièrement porté par le modèle natif Vendure ou si une couche Ahizan doit exister.

Recommandation

Le stock opérationnel de référence doit rester dans le mécanisme de stock Vendure.

SellerStock ne doit être créé que si Ahizan a besoin d'informations supplémentaires que le modèle natif ne couvre pas.

Cette règle évite deux sources concurrentes de vérité.

32. SELLERORDER

Le SellerOrder représente la partie d'une commande globale concernant un vendeur.

Exemple :

ORDER AHZ-1001
│
├── SellerOrder A
├── SellerOrder B
└── SellerOrder C

Vendure possède déjà un modèle marketplace avec des commandes agrégées et des Seller Orders ; Ahizan doit donc s'appuyer sur ce modèle natif plutôt que créer une structure concurrente sans nécessité.

33. SELLERORDERLINE

Cette entité représente une ligne appartenant à un vendeur.

Exemple :

SellerOrder A
 │
 ├── ProductVariant X × 2
 └── ProductVariant Y × 1

Elle permet de savoir :

quoi préparer ;
quelle quantité ;
quel prix ;
quelle commission ;
quel statut.
34. REPLACEMENTREQUEST

Cette entité est spécifique et stratégique pour Ahizan.

Elle gère le cas :

vendeur indisponible → recherche d'un autre vendeur.

Structure
ReplacementRequest
 ├── id
 ├── orderLineId
 ├── originalSellerId
 ├── productVariantId
 ├── quantity
 ├── reason
 ├── status
 ├── targetPrice
 ├── maxPriceDifference
 ├── selectedSellerId
 ├── createdAt
 └── resolvedAt
35. STATUTS REPLACEMENTREQUEST
REQUESTED
    ↓
SEARCHING
    ↓
CANDIDATE_FOUND
    ↓
AWAITING_CONFIRMATION
    ↓
ACCEPTED

Branches :

NO_CANDIDATE
REJECTED
EXPIRED
CANCELLED
36. HUB

Le Hub représente un point logistique.

Hub
 ├── id
 ├── name
 ├── address
 ├── latitude
 ├── longitude
 ├── status
 ├── capacity
 └── operatingHours

Exemple :

Hub Cotonou Centre.

37. PICKUPMISSION

Une PickupMission représente une mission de collecte.

PickupMission
 ├── id
 ├── sellerId
 ├── orderId
 ├── driverId
 ├── location
 ├── status
 ├── scheduledAt
 ├── collectedAt
 └── proof
38. DELIVERYMISSION

La livraison finale doit avoir sa propre entité.

DeliveryMission
 ├── id
 ├── orderId
 ├── driverId
 ├── destination
 ├── status
 ├── assignedAt
 ├── startedAt
 ├── deliveredAt
 ├── proofType
 └── proofReference
39. PACKAGE

Une commande peut avoir plusieurs colis.

Donc :

Order
 │
 ├── Package 1
 ├── Package 2
 └── Package 3
Structure
Package
 ├── id
 ├── orderId
 ├── fulfillmentId
 ├── trackingCode
 ├── weight
 ├── dimensions
 ├── status
 └── packageType
40. SETTLEMENT

Le Settlement représente le calcul du montant dû au vendeur.

Settlement
 ├── id
 ├── sellerId
 ├── orderId
 ├── grossAmount
 ├── commissionAmount
 ├── logisticsAmount
 ├── refundAmount
 ├── adjustmentAmount
 ├── netAmount
 ├── status
 └── paidAt
41. COMMISSION

Je recommande de conserver la commission séparément.

Commission
 ├── id
 ├── sellerId
 ├── orderLineId
 ├── rate
 ├── baseAmount
 ├── amount
 ├── type
 └── createdAt

Pourquoi ?

Parce qu'une commande peut contenir :

plusieurs vendeurs ;
plusieurs taux ;
plusieurs catégories.
42. PAYOUT

Le Payout représente le paiement effectif du vendeur.

Différence :

SETTLEMENT
= ce qu'Ahizan doit

PAYOUT
= ce qu'Ahizan a effectivement payé
43. RETURNREQUEST

Le retour client doit avoir son propre objet métier.

ReturnRequest
 ├── id
 ├── orderId
 ├── orderLineId
 ├── customerId
 ├── sellerId
 ├── reason
 ├── status
 ├── requestedAt
 ├── approvedAt
 └── completedAt
44. DISPUTE

Un litige doit être indépendant du retour.

Exemple :

Produit livré mais différent de la description.

Dispute
 ├── id
 ├── orderId
 ├── orderLineId
 ├── customerId
 ├── sellerId
 ├── category
 ├── description
 ├── evidence
 ├── status
 ├── resolution
 └── resolvedAt
45. SELLERPERFORMANCE

Cette entité permettra de calculer la qualité du vendeur.

Exemples :

taux d'acceptation ;
taux de refus ;
taux de rupture ;
délai moyen de préparation ;
taux de livraison réussie ;
taux de retour ;
note client.
Exemple
SellerPerformance
 ├── sellerId
 ├── acceptanceRate
 ├── cancellationRate
 ├── stockAccuracy
 ├── preparationTime
 ├── returnRate
 ├── rating
 └── score
46. PRODUCTQUALITY

Ahizan veut résoudre un problème important au Bénin :

les vendeurs ne maîtrisent pas toujours la création d'une fiche produit optimisée.

Il est donc pertinent de conserver un score qualité.

ProductQuality
 ├── productId
 ├── completenessScore
 ├── imageScore
 ├── descriptionScore
 ├── SEOScore
 ├── taxonomyScore
 ├── AIReviewScore
 └── status
47. AIPROCESSINGJOB

L'IA doit également être traçable.

AIProcessingJob
 ├── id
 ├── type
 ├── entityType
 ├── entityId
 ├── status
 ├── model
 ├── inputHash
 ├── output
 ├── createdAt
 └── completedAt
48. RELATIONS ENTRE LES ENTITÉS

Voici la structure fondamentale :

SELLER
  │
  ├──────── CHANNEL
  │
  ├──────── SELLER PROFILE
  │
  ├──────── SELLER OFFER
  │                 │
  │                 ▼
  │          PRODUCT VARIANT
  │                 │
  │                 ▼
  │             STOCK
  │
  └──────── SELLER ORDER
                    │
                    ▼
                  ORDER
                    │
              ┌─────┴─────┐
              │           │
           PAYMENT     FULFILLMENT
                          │
                    ┌─────┴─────┐
                    │           │
                  PACKAGE    DELIVERY
49. SCHÉMA GLOBAL AHIZAN

Le modèle complet :

                         SELLER
                           │
             ┌─────────────┼─────────────┐
             │             │             │
          CHANNEL       PROFILE       OFFERS
                                        │
                                        ▼
                                  PRODUCT VARIANT
                                        │
                              ┌─────────┴─────────┐
                              │                   │
                         STOCK LOCATION        PRICE
                              │
                              ▼
                           STOCK

CUSTOMER
   │
   ▼
 ORDER
   │
   ├──────── PAYMENT
   │
   ├──────── ORDER LINES
   │              │
   │              ▼
   │        SELLER ORDERS
   │
   └──────── FULFILLMENTS
                  │
                  ▼
               PACKAGES
                  │
          ┌───────┴───────┐
          ▼               ▼
       PICKUPS          DELIVERY
          │
          ▼
         HUB

ORDER
  │
  ▼
SETTLEMENT
  │
  ├── COMMISSION
  │
  └── PAYOUT
50. IDENTIFIANTS ET RÉFÉRENCES

Ahizan doit distinguer plusieurs identifiants.

ID technique

Identifiant interne de base de données.

Exemple :

id = 84721
Référence métier

Exemple :

AHZ-ORD-2026-000125
SKU

Référence de vente de la variante/offre.

GTIN/EAN

Identifiant standardisé du produit lorsqu'il existe.

Tracking code

Identifiant logistique.

51. SKU

Il faut éviter de confondre :

SKU produit

et :

SKU vendeur.

Dans Ahizan :

ProductVariant
    │
    ├── SKU référentiel
    │
    └── SellerOffer
          └── SellerSKU

Cela permettra à plusieurs vendeurs de vendre la même variante avec leurs propres références internes.

52. EAN / GTIN

Le GTIN/EAN doit être traité comme un identifiant produit standardisé lorsqu'il est authentique et applicable.

Il ne doit pas être utilisé comme identifiant unique du vendeur.

Exemple :

ProductVariant
GTIN = 1234567890123

Seller A
SKU = REMY-BDB-001

Seller B
SKU = BRBDB-75

Seller C
SKU = ALCOOL-004

Les trois vendeurs peuvent proposer la même variante.

53. SLUG

Le slug est principalement un identifiant lisible utilisé dans les URLs.

Exemple :

https://ahizan.com/produit/bernard-remy-blanc-de-blancs

Le slug ne doit pas remplacer :

l'ID ;
le SKU ;
le GTIN.

Il sert principalement à la navigation et au référencement.

54. PRIX ET MONTANTS

Tous les montants financiers doivent suivre une règle stricte :

ne jamais utiliser des calculs flottants imprécis pour l'argent.

Il faut utiliser le mécanisme monétaire prévu par Vendure et conserver :

valeur ;
devise ;
contexte ;
historique.

Exemple :

100000 XOF

et non :

100000.00 sans devise
55. STATUTS

Les statuts doivent être centralisés.

Exemple :

Seller
PENDING
ACTIVE
SUSPENDED
BLOCKED
REJECTED
SellerOffer
DRAFT
PENDING_REVIEW
ACTIVE
PAUSED
OUT_OF_STOCK
SUSPENDED
SellerOrder
PENDING
ACCEPTED
REJECTED
PREPARING
READY_FOR_PICKUP
COLLECTED
COMPLETED
CANCELLED
56. HISTORISATION

Ahizan doit éviter d'écraser certaines informations importantes.

Exemple :

Prix :

01/08 → 8 000 FCFA
10/08 → 8 500 FCFA
20/08 → 8 200 FCFA

Il peut être nécessaire de conserver l'historique.

Même chose pour :

commissions ;
remboursements ;
statuts ;
remplacements ;
paiements.
57. SUPPRESSION ET ARCHIVAGE

Il faut éviter de supprimer physiquement les données importantes.

Exemple :

Un vendeur quitte Ahizan.

On ne doit pas supprimer toutes ses anciennes commandes.

Il faut plutôt :

désactiver / archiver.

Vendure utilise notamment des mécanismes de suppression logique sur certaines entités, comme Seller.

58. INDEXATION

La base doit être indexée sur les champs fréquemment recherchés.

Exemples :

SellerOffer
 ├── sellerId
 ├── productVariantId
 ├── status
 └── sellerId + productVariantId
SellerOrder
 ├── sellerId
 ├── aggregateOrderId
 └── status
DeliveryMission
 ├── driverId
 ├── status
 └── scheduledAt
59. INTÉGRITÉ DES DONNÉES

Une règle essentielle :

Une donnée critique ne doit pas pouvoir devenir incohérente entre deux tables.

Exemple :

Une SellerOffer ne doit pas pointer vers :

un vendeur inexistant.

Une SellerOrderLine ne doit pas pointer vers :

une offre supprimée.

Une Settlement ne doit pas être créé pour :

une commande inexistante.

Les relations et contraintes doivent être définies dès la conception.

60. TRANSACTIONS

Certaines opérations doivent être atomiques.

Exemple :

Le client commande 5 unités.

Il faut éviter :

Commande créée ✓
Stock non réservé ✗

ou :

Stock réservé ✓
Commande échouée ✗

Une opération critique doit être conçue pour maintenir la cohérence.

61. SÉCURITÉ ET PERMISSIONS

Les données financières sont particulièrement sensibles.

Un vendeur doit pouvoir consulter :

ses SellerOrders
ses Settlements
ses Payouts

mais pas :

les Settlements du vendeur B

L'administration possède une vision globale.

Les Channels et les permissions Vendure constituent une partie importante de cette isolation.

62. EXEMPLE COMPLET D'UNE COMMANDE

Client :

Client 10045

Commande :

AHZ-2026-000500

Produits
Ligne 1 → Variant A → Seller A
Ligne 2 → Variant B → Seller B
Ligne 3 → Variant C → Seller A
Ligne 4 → Variant D → Seller C
Structure
ORDER 500
│
├── LINE 1
│     └── SELLER A
│
├── LINE 2
│     └── SELLER B
│
├── LINE 3
│     └── SELLER A
│
└── LINE 4
      └── SELLER C
63. SELLER ORDERS

Ahizan crée :

SellerOrder A
 ├── Line 1
 └── Line 3

SellerOrder B
 └── Line 2

SellerOrder C
 └── Line 4

Le client voit :

une seule commande.

Les vendeurs voient :

leur propre partie.

C'est exactement le type de logique que Vendure cherche à faciliter avec son architecture multi-vendeurs.

64. EXEMPLE DE REMPLACEMENT

Le vendeur A refuse la ligne 1.

Ahizan crée :

ReplacementRequest

Puis :

SEARCHING

Le système trouve :

Seller D

Puis :

CANDIDATE_FOUND

Après validation :

ACCEPTED

La ligne est réaffectée au vendeur D.

65. EXEMPLE DE RÈGLEMENT

Supposons :

Vente vendeur A : 100 000 FCFA
Commission : 8 000
Frais : 2 000
Remboursement : 0

Alors :

Settlement
Gross = 100000
Commission = 8000
Fees = 2000
Net = 90000

Puis :

Payout
Amount = 90000
Status = PAID
66. ARCHITECTURE SQL CONCEPTUELLE

Vue simplifiée :

seller
   │
   ├── seller_profile
   │
   ├── seller_offer
   │        │
   │        └── product_variant
   │
   └── seller_order
            │
            └── seller_order_line

order
 │
 ├── order_line
 ├── payment
 └── fulfillment

order_line
 │
 └── seller_offer

fulfillment
 │
 └── package

package
 │
 └── delivery_mission

seller_order
 │
 └── settlement

settlement
 ├── commission
 └── payout
67. RÈGLE CRITIQUE : UNE SOURCE DE VÉRITÉ

Pour chaque donnée, Ahizan doit définir :

Quelle table fait foi ?

Exemple :

Produit

Product

Variante

ProductVariant

Stock réel

Mécanisme de stock Vendure

Commande

Order

Paiement client

Payment

Livraison e-commerce

Fulfillment

Offre vendeur

SellerOffer

Commission

Commission

Dette envers vendeur

Settlement

Paiement effectif vendeur

Payout

Cette règle évitera énormément de problèmes futurs.

68. RÈGLE CRITIQUE : NE PAS DUPLIQUER VENDURE

Il serait dangereux de créer par exemple :

AhizanOrder
AhizanProduct
AhizanCustomer
AhizanPayment

simplement pour reproduire les entités Vendure.

Il faut plutôt :

Vendure Order
       +
Ahizan SellerOrder
       +
Ahizan Logistics
69. RÈGLE CRITIQUE : CUSTOM FIELD OU ENTITY ?

La décision peut être prise avec cette règle :

Utiliser Custom Field si :

l'information est simplement une propriété supplémentaire.

Exemple :

ProductVariant
→ GTIN
Utiliser Entity si :

l'information possède :

sa propre logique ;
plusieurs relations ;
son propre cycle de vie ;
ses propres permissions ;
ses propres événements.

Exemple :

ReplacementRequest

doit être une véritable entité.

Vendure permet également d'ajouter des Custom Fields à des entités personnalisées, ce qui permet aux différents plugins Ahizan de rester extensibles.

70. RÈGLE CRITIQUE : NE PAS METTRE TOUT DANS CUSTOM FIELDS

Il serait tentant de faire :

Seller.customFields
 ├── orders
 ├── offers
 ├── commissions
 ├── deliveries
 ├── disputes
 └── ...

C'est une mauvaise architecture.

Les relations importantes doivent être des entités propres.

Les Custom Fields doivent rester adaptés aux propriétés complémentaires.

71. ARCHITECTURE DES PLUGINS ET DES ENTITÉS

La structure recommandée :

plugins/
│
├── seller/
│   ├── SellerProfile
│   └── SellerPerformance
│
├── offer/
│   ├── SellerOffer
│   └── SellerOfferPrice
│
├── marketplace-order/
│   ├── SellerOrder
│   └── SellerOrderLine
│
├── replacement/
│   └── ReplacementRequest
│
├── logistics/
│   ├── Hub
│   ├── PickupMission
│   ├── DeliveryMission
│   └── Package
│
├── finance/
│   ├── Commission
│   ├── Settlement
│   └── Payout
│
├── returns/
│   └── ReturnRequest
│
├── disputes/
│   └── Dispute
│
└── ai/
    ├── ProductQuality
    └── AIProcessingJob

Vendure est justement conçu pour que les plugins puissent définir leurs propres entités et services.

72. OUTIL DE CRÉATION DES ENTITÉS

Le CLI Vendure permet actuellement de générer des plugins, entités, services, extensions API et jobs. Il permet notamment de créer une entité avec le support des Custom Fields.

Exemple conceptuel :

vendure add --entity SellerOffer --selected-plugin OfferPlugin

Puis :

SellerOffer

sera intégré au plugin correspondant.

73. EXTENSION DU DASHBOARD

Les nouvelles entités Ahizan devront également être accessibles aux administrateurs.

Exemple :

Dashboard Ahizan
│
├── Vendeurs
├── Offres
├── Commandes
├── Remplacements
├── Logistique
├── Règlements
├── Litiges
└── IA

Vendure permet aux plugins d'étendre le Dashboard avec leurs propres interfaces.

74. MODÈLE DE DONNÉES DU VENDEUR

Le modèle cible :

SELLER
│
├── CHANNEL
│
├── SELLER PROFILE
│
├── SELLER PERFORMANCE
│
├── SELLER OFFERS
│       │
│       └── PRODUCTS / VARIANTS
│
├── SELLER ORDERS
│
├── COMMISSIONS
│
├── SETTLEMENTS
│
└── PAYOUTS
75. MODÈLE DE DONNÉES DU PRODUIT
PRODUCT
│
├── ASSETS
├── FACETS
├── COLLECTIONS
│
└── PRODUCT VARIANTS
        │
        ├── SKU
        ├── GTIN
        ├── PRICES
        ├── STOCK
        │
        └── SELLER OFFERS
76. MODÈLE DE DONNÉES DE LA COMMANDE
CUSTOMER
   │
   ▼
ORDER
   │
   ├── ORDER LINES
   │       │
   │       └── SELLER OFFER
   │
   ├── PAYMENTS
   │
   ├── SELLER ORDERS
   │
   └── FULFILLMENTS
           │
           └── PACKAGES
                   │
                   └── DELIVERY
77. MODÈLE DE DONNÉES FINANCIER
ORDER
 │
 ▼
ORDER LINE
 │
 ▼
SELLER ORDER
 │
 ├── GROSS AMOUNT
 │
 ├── COMMISSION
 │
 ├── FEES
 │
 ├── REFUNDS
 │
 ▼
SETTLEMENT
 │
 ▼
PAYOUT
78. MODÈLE DE DONNÉES LOGISTIQUE
SELLER ORDER
      │
      ▼
PICKUP MISSION
      │
      ▼
PACKAGE
      │
      ▼
HUB
      │
      ▼
DELIVERY MISSION
      │
      ▼
CUSTOMER
79. MODÈLE DE DONNÉES IA
PRODUCT
   │
   ▼
AI PROCESSING JOB
   │
   ▼
PRODUCT QUALITY
   │
   ├── Title Score
   ├── Description Score
   ├── Image Score
   ├── SEO Score
   └── Classification Score

L'IA devient donc un service contrôlé et traçable, et non une boîte noire qui modifie directement le catalogue.

80. EXEMPLE : CRÉATION D'UN PRODUIT

Un vendeur apporte :

« Bernard remy blanc de blanc 75 cl »

Ahizan reçoit le produit.

Étape 1

Recherche d'un produit existant.

Étape 2

Recherche par :

EAN/GTIN ;
marque ;
nom ;
caractéristiques.
Étape 3

Si trouvé :

rattacher l'offre au ProductVariant existant.

Étape 4

Si non trouvé :

créer un nouveau Product/ProductVariant.

Étape 5

IA :

normalisation de la fiche.

Étape 6

Validation Ahizan.

Étape 7

Création de SellerOffer.

81. EXEMPLE : DEUX VENDEURS, UN PRODUIT
PRODUCT
"Bernard Remy Blanc de Blancs"

        │
        ▼

PRODUCT VARIANT
"75 cl"

        │
    ┌───┴───┐
    ▼       ▼
SELLER A SELLER B
    │       │
8 500     8 200
    │       │
20 unités 10 unités

Il ne faut donc pas créer deux Products.

Il faut :

un Product / une Variant / plusieurs SellerOffers.

C'est l'une des décisions structurantes d'Ahizan.

82. EXEMPLE : LE VENDEUR CHANGE DE PRIX

Vendeur A :

8 500 FCFA.

Il modifie :

8 900 FCFA.

Ahizan modifie son SellerOffer.

Le ProductVariant reste :

le même produit.

83. EXEMPLE : LE VENDEUR N'A PLUS DE STOCK

Le SellerOffer devient :

OUT_OF_STOCK

Mais le ProductVariant reste actif.

Les autres vendeurs peuvent continuer à vendre.

84. EXEMPLE : LE VENDEUR EST SUSPENDU

Le vendeur B est suspendu.

Ses offres peuvent devenir :

SUSPENDED

sans supprimer les produits du catalogue.

Le client pourra toujours acheter le même produit auprès d'un autre vendeur.

85. EXEMPLE : LE VENDEUR QUITTE AHIZAN

Il ne faut pas supprimer :

ses anciennes commandes ;
ses paiements ;
ses settlements ;
les historiques.

On désactive son activité commerciale et on conserve les données nécessaires à la traçabilité.

86. PERFORMANCE DE LA BASE

Les tables les plus sollicitées seront probablement :

ProductVariant ;
SellerOffer ;
Stock ;
Order ;
OrderLine ;
SellerOrder ;
DeliveryMission.

Elles devront être conçues pour supporter une croissance importante.

87. RECHERCHE DES OFFRES

Une requête typique sera :

« Donne-moi les vendeurs qui proposent cette variante, avec stock et prix. »

Le système devra rapidement pouvoir effectuer :

ProductVariant
       ↓
SellerOffers
       ↓
ACTIVE
       ↓
STOCK > 0
       ↓
PRICE
       ↓
DISTANCE
       ↓
SELLER SCORE
88. FUTUR MOTEUR DE CLASSEMENT

Ahizan pourra ensuite classer les offres selon :

Score =
Prix
+ Disponibilité
+ Distance
+ Fiabilité
+ Délai
+ Note vendeur

Le score ne doit toutefois pas être stocké comme une vérité permanente s'il dépend de données qui changent constamment.

Il peut être calculé ou recalculé selon le besoin.

89. RÈGLES D'OR DE LA BASE AHIZAN
Règle 1

Product = produit catalogue.

Règle 2

ProductVariant = unité vendable.

Règle 3

SellerOffer = proposition d'un vendeur.

Règle 4

Order = commande globale client.

Règle 5

SellerOrder = partie opérationnelle vendeur.

Règle 6

Payment = argent du client.

Règle 7

Settlement = argent dû au vendeur.

Règle 8

Payout = argent effectivement versé.

Règle 9

Fulfillment = exécution e-commerce de l'expédition.

Règle 10

DeliveryMission = opération logistique Ahizan.

90. RÈGLE D'OR SUPPLÉMENTAIRE

Ne jamais faire dépendre une donnée financière importante d'une information calculée uniquement à l'affichage.

Une commission doit être enregistrée.

Un remboursement doit être enregistré.

Un règlement doit être enregistré.

Une modification importante doit être traçable.

91. ARCHITECTURE CIBLE FINALE

Voici le modèle que je recommande comme base de travail officielle pour Ahizan :

                           AHIZAN
                             │
                    ┌────────┴────────┐
                    │                 │
                  VENDURE          AHIZAN
                    │              PLUGINS
                    │                 │
        ┌───────────┼───────────┐     │
        │           │           │     │
     CATALOGUE    COMMERCE     STOCK  │
        │           │           │     │
        │           │           │     │
        └───────────┼───────────┘     │
                    │                 │
                 MARKETPLACE ─────────┤
                    │                 │
             ┌──────┼──────┐          │
             │      │      │          │
           OFFER  SELLER  ORDER       │
                    │      │          │
                    │      └──────────┤
                    │                 │
                 LOGISTICS ───────────┤
                    │                 │
                 FINANCE ─────────────┤
                    │                 │
                    AI ───────────────┘
92. CONCLUSION DU TOME 8

Le Tome 8 établit une règle essentielle pour le développement d'Ahizan :

Ahizan ne doit pas remplacer Vendure ; Ahizan doit s'appuyer sur Vendure et l'étendre intelligemment.

Vendure fournit déjà les fondations nécessaires au commerce et à la marketplace : Product, ProductVariant, Order, Seller, Channel, stock, paiement, fulfillment, etc. Son architecture permet aux plugins d'ajouter des entités, des services, des APIs et des fonctionnalités métier.

L'architecture Ahizan doit donc être pensée autour de cette séparation :

CE QUE VENDURE POSSÈDE
Produit
Variante
Client
Commande
Paiement
Stock
Channel
Seller
Fulfillment
Shipping
Promotion
Taxe
CE QU'AHIZAN AJOUTE
SellerOffer
SellerProfile
ReplacementRequest
Hub
PickupMission
DeliveryMission
Package
Commission
Settlement
Payout
ReturnRequest
Dispute
SellerPerformance
ProductQuality
AIProcessingJob
ET SURTOUT :
                    VENDURE
                       │
             ┌─────────┴─────────┐
             │                   │
        COMMERCE             MARKETPLACE
             │                   │
             │              SELLER OFFER
             │                   │
             │              SELLER ORDER
             │                   │
             │               LOGISTICS
             │                   │
             │                FINANCE
             │                   │
             └──────────┬────────┘
                        │
                       IA
                        │
                     AHIZAN

C'est cette architecture qui permettra à Ahizan de commencer avec une base relativement simple tout en conservant la capacité d'évoluer vers une véritable marketplace multi-vendeurs à grande échelle.

TOME 8 — DÉCISION D'ARCHITECTURE À RETENIR

Pour l'équipe technique, je recommande de considérer les éléments suivants comme les entités structurantes du modèle Ahizan :

Domaine	Entité de référence
Produit	Product Vendure
Variante	ProductVariant Vendure
Prix Channel	ProductVariantPrice Vendure
Vendeur	Seller Vendure
Canal vendeur	Channel Vendure
Stock	Mécanisme Stock Vendure
Client	Customer Vendure
Commande globale	Order Vendure
Ligne	OrderLine Vendure
Paiement	Payment Vendure
Expédition	Fulfillment Vendure
Offre vendeur	SellerOffer Ahizan
Profil vendeur	SellerProfile Ahizan
Sous-commande	modèle Marketplace/SellerOrder Vendure + extensions Ahizan
Remplacement	ReplacementRequest Ahizan
Hub	Hub Ahizan
Collecte	PickupMission Ahizan
Livraison	DeliveryMission Ahizan
Colis	Package Ahizan
Commission	Commission Ahizan
Dette vendeur	Settlement Ahizan
Paiement vendeur	Payout Ahizan
Retour	ReturnRequest Ahizan
Litige	Dispute Ahizan
Qualité catalogue	ProductQuality Ahizan
IA	AIProcessingJob Ahizan

C'est cette table qui devrait servir de référence lors de la conception technique.