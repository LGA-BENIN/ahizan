1. OBJET DU TOME 7

Les six premiers tomes ont principalement défini le fonctionnement métier d'Ahizan.

Le Tome 7 franchit une étape supplémentaire :

transformer les règles métier d'Ahizan en architecture logicielle concrète basée sur Vendure.

L'objectif n'est donc plus seulement de répondre :

« Comment Ahizan doit fonctionner ? »

mais :

« Comment allons-nous construire techniquement Ahizan avec Vendure ? »

2. VISION TECHNIQUE D'AHIZAN

Ahizan doit être construit comme une plateforme modulaire.

Le principe fondamental est :

                 AHIZAN
                    │
          ┌─────────┴─────────┐
          │                   │
       VENDURE          LOGIQUE AHIZAN
          │                   │
     E-commerce          Marketplace
          │              + Logistique
          │              + IA
          │              + Finance
          │
          └─────────┬─────────┘
                    │
                 APIs
                    │
       ┌────────────┼────────────┐
       │            │            │
    CLIENT       VENDEUR      LIVREUR

Vendure est justement conçu comme une plateforme headless, avec des APIs GraphQL, un serveur, un Worker et un système de plugins permettant d'ajouter la logique métier propre à une application.

3. POURQUOI VENDURE POUR AHIZAN ?

Vendure fournit déjà un ensemble important de fonctions nécessaires à une marketplace :

catalogue ;
produits ;
variantes ;
clients ;
commandes ;
paiements ;
stocks ;
promotions ;
expédition ;
Channels ;
permissions ;
APIs GraphQL.

Surtout, Vendure possède désormais une architecture explicitement pensée pour les marketplaces multi-vendeurs. Sa documentation officielle décrit les Seller, Channel, commandes agrégées et API nécessaires à ce type de plateforme.

Ahizan n'a donc pas intérêt à reconstruire un moteur e-commerce complet.

Il faut plutôt :

prendre Vendure comme moteur central et construire la couche métier spécifique d'Ahizan.

4. ARCHITECTURE GÉNÉRALE

L'architecture cible :

                         INTERNET
                             │
                             ▼
                     ┌─────────────┐
                     │   AHIZAN    │
                     │  FRONTEND   │
                     └──────┬──────┘
                            │
                         GraphQL
                            │
                            ▼
                ┌───────────────────────┐
                │     VENDURE SERVER    │
                │                       │
                │ Shop API              │
                │ Admin API             │
                │ Marketplace Plugins   │
                │ Business Services     │
                └───────────┬───────────┘
                            │
              ┌─────────────┼─────────────┐
              │             │             │
              ▼             ▼             ▼
          DATABASE        WORKER       SERVICES
              │             │             │
              │             │             │
              └─────────────┼─────────────┘
                            │
                     SERVICES EXTERNES
                            │
              ┌─────────────┼──────────────┐
              │             │              │
           Paiement       SMS/Email      Maps
5. LES QUATRE COUCHES DU SYSTÈME

Ahizan devrait être organisé en quatre grandes couches.

Couche 1 — Commerce

Vendure :

produits ;
variantes ;
panier ;
commandes ;
paiements.
Couche 2 — Marketplace

Ahizan :

vendeurs ;
offres ;
sous-commandes ;
commissions ;
règlements.
Couche 3 — Logistique

Ahizan :

collecte ;
hub ;
consolidation ;
livreurs ;
livraison.
Couche 4 — Intelligence

Ahizan :

IA catalogue ;
recherche ;
recommandations ;
détection d'anomalies ;
optimisation logistique.
6. LE SERVEUR VENDURE

Le serveur constitue le cœur applicatif.

Il expose notamment :

Shop API

Pour le client.

Admin API

Pour l'administration.

Plugins

Pour la logique personnalisée.

Services

Pour la logique métier.

EventBus

Pour les événements.

Worker

Pour les traitements en arrière-plan.

Vendure est construit autour de cette architecture modulaire.

7. LE WORKER

Certaines opérations ne doivent pas bloquer le client.

Exemples :

génération d'une fiche produit par IA ;
indexation ;
envoi massif de notifications ;
calculs complexes ;
synchronisation logistique ;
rapprochement financier.

Ces tâches doivent être confiées au Worker lorsque cela est approprié.

8. LE DASHBOARD

Le Dashboard est l'interface utilisée par les administrateurs.

Ahizan devra l'étendre pour permettre notamment :

validation vendeurs ;
validation produits ;
gestion des offres ;
supervision des commandes ;
supervision logistique ;
gestion des litiges ;
gestion des commissions ;
statistiques.

Vendure permet d'étendre le Dashboard via ses mécanismes de plugins et d'extensions.

9. LE STOREFRONT AHIZAN

Le client ne doit pas nécessairement voir Vendure.

Il voit :

AHIZAN

Le frontend peut être développé avec la technologie choisie par l'équipe.

Il communique avec Vendure via :

Shop GraphQL API

Vendure fournit précisément cette architecture headless, où le storefront peut être développé indépendamment du backend.

10. LE PRINCIPE DES PLUGINS

C'est probablement la notion technique la plus importante du Tome 7.

Un plugin Vendure peut :

ajouter des entités ;
ajouter des Custom Fields ;
étendre GraphQL ;
ajouter des services ;
écouter des événements ;
intégrer des systèmes externes ;
lancer des tâches en arrière-plan.

Pour Ahizan, cela signifie :

ne pas mettre toute la logique dans un énorme fichier.

Il faut découper le système.

11. ARCHITECTURE DES PLUGINS AHIZAN

Je recommande au minimum :

Ahizan
│
├── MarketplacePlugin
├── SellerPlugin
├── CatalogPlugin
├── OfferPlugin
├── SellerOrderPlugin
├── LogisticsPlugin
├── SettlementPlugin
├── ReviewPlugin
├── NotificationPlugin
├── AIPlugin
└── AnalyticsPlugin

Chaque plugin doit avoir une responsabilité claire.

12. PLUGIN MARKETPLACE

Le MarketplacePlugin constitue le chef d'orchestre.

Il peut gérer :

règles générales marketplace ;
relations vendeur/catalogue ;
configuration globale ;
règles de remplacement ;
politiques marketplace.
13. PLUGIN CATALOGUE

Le CatalogPlugin gère les fonctionnalités propres à Ahizan autour du catalogue :

normalisation ;
validation ;
qualité ;
classification ;
EAN/GTIN ;
données locales ;
workflow de validation.

Vendure conserve les entités natives :

Product

et

ProductVariant.

Ahizan ajoute sa logique métier.

14. PLUGIN SELLER

Le SellerPlugin gère :

inscription ;
validation ;
profil ;
boutique ;
documents ;
statut ;
performance.

Vendure possède déjà l'entité Seller dans son architecture marketplace, et celle-ci peut être enrichie avec des Custom Fields.

15. PLUGIN SELLER OFFER

Le concept d'offre vendeur est central pour Ahizan.

Il doit permettre :

ProductVariant
       │
       ├── Offre A
       │    ├── Prix
       │    ├── Stock
       │    └── Vendeur
       │
       ├── Offre B
       │
       └── Offre C

Ce plugin devient responsable du :

prix vendeur ;
stock vendeur ;
disponibilité ;
condition ;
délai ;
priorité ;
statut.
16. PLUGIN SELLER ORDER

Ce plugin gère les sous-commandes.

Exemple :

Order AHZ-100
│
├── SellerOrder A
├── SellerOrder B
└── SellerOrder C

Il doit permettre :

confirmation ;
refus ;
préparation ;
annulation ;
remplacement ;
statut vendeur.
17. PLUGIN LOGISTICS

Ce plugin constitue le cœur logistique d'Ahizan.

Il gère :

collecte ;
missions ;
livreurs ;
itinéraires ;
hubs ;
consolidation ;
livraison ;
preuve de livraison.

Il devra probablement communiquer avec des services cartographiques et éventuellement des partenaires logistiques externes.

18. PLUGIN SETTLEMENT

Le SettlementPlugin gère l'argent dû aux vendeurs.

Il calcule :

Montant vente
- Commission Ahizan
- Frais éventuels
- Remboursements
= Montant vendeur

Il doit également gérer :

périodes de règlement ;
paiements ;
historique ;
rapprochement.
19. PLUGIN REVIEWS

Il gère :

notation ;
commentaires ;
note vendeur ;
note produit ;
note livraison ;
modération.

Les avis pourront ensuite alimenter l'algorithme de classement des vendeurs.

20. PLUGIN AI

C'est une couche stratégique pour Ahizan.

Elle pourra gérer :

IA catalogue
titre ;
description ;
attributs ;
tags ;
catégorie ;
détection de doublon.
IA recherche

Comprendre les recherches mal formulées.

IA vendeur

Détecter les anomalies.

IA logistique

Optimiser les tournées.

IA commerciale

Recommandations.

21. ENTITÉS PERSONNALISÉES

Ahizan aura probablement besoin de nouvelles entités.

Exemple :

SellerOffer
id
sellerId
productVariantId
price
stock
status
sellerSku
condition
leadTime
priority
createdAt
updatedAt
SellerOrder
id
aggregateOrderId
sellerId
status
subtotal
commission
sellerAmount
DeliveryMission
id
orderId
type
status
driverId
pickupLocation
deliveryLocation
scheduledAt
Settlement
id
sellerId
orderId
grossAmount
commission
fees
netAmount
status
paidAt

Vendure permet aux plugins de définir leurs propres entités de base de données.

22. CUSTOM FIELDS

Les Custom Fields doivent être utilisés lorsque l'information est réellement un attribut complémentaire d'une entité existante.

Exemple :

ProductVariant
GTIN ;
poids ;
dimensions ;
code fabricant.
StockLocation
latitude ;
longitude.

La documentation Vendure prévoit précisément ce type d'usage.

23. CHANNELS

Vendure utilise les Channels pour représenter plusieurs contextes commerciaux.

Un Channel peut notamment avoir :

ses devises ;
langues ;
taxes ;
produits ;
prix ;
stocks ;
promotions ;
méthodes de livraison ;
commandes.

Vendure indique explicitement que les Channels peuvent servir à construire une marketplace multi-vendeurs.

24. SELLER ET CHANNEL

Dans Vendure, chaque Channel peut être associé à un Seller.

C'est particulièrement important pour Ahizan.

Le modèle officiel de marketplace de Vendure utilise :

Seller + Channel

pour représenter les vendeurs.

Cependant, Ahizan devra décider précisément si :

1 vendeur = 1 Channel

est suffisant pour son architecture finale.

Ce choix doit être validé avant le développement définitif, car il affectera le catalogue, les prix, le stock et les permissions.

25. GESTION DES PERMISSIONS

Il faut appliquer le principe :

Chaque acteur ne voit que ce qu'il doit voir.

Client

Voit ses commandes.

Vendeur A

Voit uniquement ses offres et Seller Orders.

Vendeur B

Ne voit pas les informations privées du vendeur A.

Logisticien

Voit les informations nécessaires à la collecte et à la livraison.

Administrateur

Accès global.

Vendure permet notamment des rôles administrateurs limités à certains Channels.

26. ARCHITECTURE GRAPHQL

Ahizan doit utiliser GraphQL comme couche API principale.

Vendure possède deux APIs :

Shop API

Client / storefront.

Admin API

Administration.

Elles peuvent être étendues indépendamment par les plugins.

27. SHOP API

Le client pourra effectuer des opérations comme :

query {
  search(input: {
    term: "Samsung A16"
  }) {
    items {
      productName
      slug
    }
  }
}

Ahizan pourra ensuite enrichir la réponse avec :

meilleure offre ;
vendeurs ;
prix ;
disponibilité ;
délai ;
livraison.
28. ADMIN API

L'Admin API servira notamment à :

gérer les vendeurs ;
valider les produits ;
modifier les offres ;
surveiller les commandes ;
gérer les litiges ;
consulter les règlements.
29. API VENDEUR

Ahizan pourra créer une couche spécifique permettant au vendeur de :

Consulter
ses commandes ;
son stock ;
ses ventes ;
ses paiements.
Modifier
prix ;
stock ;
disponibilité ;
informations de boutique.
Recevoir
nouvelles commandes ;
alertes ;
demandes de confirmation.
30. SERVICES MÉTIER

Une règle importante :

Les resolvers ne doivent pas contenir toute la logique métier.

Le resolver reçoit la requête.

Puis appelle :

un Service.

Vendure recommande précisément cette séparation entre API/resolver et service métier.

Exemple :

GraphQL Mutation
       ↓
SellerOfferResolver
       ↓
SellerOfferService
       ↓
Database
31. EVENTBUS

Vendure dispose d'un EventBus permettant aux plugins de réagir aux événements du système.

Des événements existent notamment pour :

création/modification/suppression d'entités ;
inscription ;
commande ;
paiement ;
fulfillment ;
remboursement ;
changement d'état.

C'est extrêmement intéressant pour Ahizan.

32. ÉVÉNEMENTS AHIZAN

Ahizan pourra créer ses propres événements.

Exemples :

SellerRegisteredEvent
SellerApprovedEvent
OfferCreatedEvent
OfferSuspendedEvent
SellerOrderRejectedEvent
SellerReplacementRequestedEvent
SellerReplacementFoundEvent
PickupCreatedEvent
PickupCompletedEvent
HubReceivedEvent
DeliveryAssignedEvent
DeliveryCompletedEvent
SettlementCreatedEvent
SettlementPaidEvent

Cela permettra de découpler les différents systèmes.

33. TÂCHES ASYNCHRONES

Certaines opérations doivent être exécutées en arrière-plan.

Exemple :

Un vendeur refuse une commande.

Le système doit rechercher :

200 autres offres possibles.

Il n'est pas nécessaire de bloquer la requête client pendant tout le processus.

Le Worker peut traiter :

recherche de remplaçant ;
notifications ;
IA ;
indexation ;
synchronisations ;
calculs lourds.
34. ARCHITECTURE DES STOCKS

Le stock doit être lié à :

variante ;
vendeur ;
emplacement ;
Channel selon le modèle retenu.

Vendure fournit déjà des mécanismes de gestion du stock et de localisation du stock.

Pour Ahizan :

Seller A
   │
   └── StockLocation A
           │
           └── Variant X
                  └── Stock = 50
35. ARCHITECTURE DES PRIX

Il faut distinguer :

Prix catalogue

Information de référence.

Prix vendeur

Prix de l'offre.

Prix promotionnel

Prix temporaire.

Prix client

Prix final après promotions.

Exemple :

Prix vendeur : 100 000
Promotion : -5 000
Livraison : +2 000
-------------------
Total client : 97 000
36. ARCHITECTURE DES COMMANDES

Architecture :

Aggregate Order
       │
       ├── Seller Order A
       │       ├── Line 1
       │       └── Line 2
       │
       ├── Seller Order B
       │       └── Line 3
       │
       └── Seller Order C
               └── Line 4

Cette structure correspond bien au modèle marketplace documenté par Vendure.

37. ARCHITECTURE LOGISTIQUE

Il faut séparer :

Order

de

DeliveryMission

Une commande peut nécessiter :

plusieurs collectes ;
un passage au hub ;
une livraison finale.

Donc :

ORDER
 │
 ├── PICKUP A
 ├── PICKUP B
 ├── PICKUP C
 │
 └── DELIVERY
38. ARCHITECTURE DES PAIEMENTS

Le paiement client et le règlement vendeur doivent être séparés conceptuellement.

Payment

Argent reçu du client.

Settlement

Argent dû au vendeur.

Ainsi :

CLIENT
   ↓
PAYMENT
   ↓
AHIZAN
   ↓
SETTLEMENT
   ↓
VENDEUR
39. ARCHITECTURE DES COMMISSIONS

La commission ne doit pas être seulement calculée visuellement.

Elle doit être enregistrée.

Exemple :

OrderLine
   │
   ├── Gross = 100000
   ├── Commission = 8000
   ├── LogisticsFee = 2000
   └── SellerNet = 90000

Toutes les valeurs doivent être historisées.

40. ARCHITECTURE DES RÈGLEMENTS

Exemple :

Settlement #500
Seller: A
Order: AHZ-125
Gross: 150000
Commission: 12000
Fees: 3000
Refund: 0
Net: 135000
Status: PENDING

Après validation :

PAID

41. ARCHITECTURE FRONTEND

Ahizan peut avoir plusieurs interfaces :

1. Site client

ahizan.com

2. Espace vendeur

vendeur.ahizan.com

3. Application livreur

Mobile.

4. Dashboard administration

Interface interne.

42. APPLICATION VENDEUR

Le vendeur doit avoir une interface extrêmement simple.

Tableau de bord
ventes ;
commandes ;
stock ;
chiffre d'affaires ;
montant disponible.
Produits
mes offres ;
ajouter une offre ;
modifier prix ;
modifier stock.
Commandes
nouvelles ;
à préparer ;
prêtes ;
terminées.
43. APPLICATION LIVREUR

Le livreur doit voir :

Mission

Collecte chez vendeur A.

Puis :

Collecte chez vendeur B.

Puis :

Déposer au hub.

Puis :

Livraison client.

L'application doit pouvoir gérer :

GPS ;
statut ;
appel ;
preuve photo ;
signature ;
code OTP.
44. DASHBOARD AHIZAN

Le Dashboard principal doit être pensé comme un :

Centre de contrôle marketplace.

Il devrait afficher :

Vue générale
commandes du jour ;
vendeurs actifs ;
commandes en retard ;
livraisons en cours ;
chiffre d'affaires ;
commissions ;
litiges.
Alertes
vendeur en retard ;
rupture ;
paiement échoué ;
livraison bloquée.
45. BASE DE DONNÉES

Architecture conceptuelle :

PRODUCT
   │
PRODUCT_VARIANT
   │
SELLER_OFFER
   │
SELLER
   │
SELLER_ORDER
   │
ORDER
   │
FULFILLMENT
   │
DELIVERY_MISSION
   │
SETTLEMENT

Il faut éviter de dupliquer inutilement les données natives Vendure.

46. SÉCURITÉ

La sécurité doit être intégrée dès la conception.

Authentification
client ;
vendeur ;
administrateur ;
livreur.
Autorisation

Chaque action doit être contrôlée.

Données financières

Accès extrêmement limité.

Données vendeurs

Isolation entre vendeurs.

API

Validation stricte des entrées.

47. JOURNALISATION

Ahizan doit conserver :

qui a fait quoi ;
quand ;
sur quelle commande ;
avant quelle valeur ;
après quelle valeur.

Exemple :

Vendeur A
14:52
Stock produit X
10 → 8

Cette information est précieuse pour les audits et les litiges.

48. GESTION DES ERREURS

Une erreur technique ne doit pas automatiquement provoquer :

Annulation de commande.

Exemple :

Le service de notification tombe.

La commande doit continuer.

Le système doit distinguer :

Erreur critique

Exemple :

paiement impossible.

Erreur récupérable

Exemple :

SMS non envoyé.

Erreur temporaire

Exemple :

API logistique indisponible.

49. PERFORMANCE

Ahizan devra être capable de gérer :

milliers de produits ;
milliers de vendeurs ;
nombreuses offres ;
commandes simultanées.

Il faudra notamment surveiller :

requêtes SQL ;
index ;
cache ;
recherche ;
files de tâches ;
API externes.
50. SCALABILITÉ

L'architecture doit pouvoir évoluer.

Phase 1

Un serveur principal.

Phase 2

Serveur + Worker séparé.

Phase 3

Plusieurs instances.

Phase 4

Infrastructure distribuée.

L'objectif est de ne pas commencer avec une architecture inutilement complexe.

51. ARCHITECTURE RECOMMANDÉE DU PROJET

Je recommande une structure de type :

ahizan/
│
├── apps/
│   ├── server/
│   ├── worker/
│   ├── storefront/
│   ├── seller-app/
│   └── driver-app/
│
├── packages/
│   ├── shared/
│   ├── graphql/
│   ├── types/
│   └── utils/
│
└── plugins/
    ├── marketplace/
    ├── seller/
    ├── catalog/
    ├── offer/
    ├── seller-order/
    ├── logistics/
    ├── settlement/
    ├── review/
    ├── notification/
    ├── ai/
    └── analytics/

Vendure recommande notamment une organisation de type monorepo pour les projets comportant plusieurs plugins, ce qui facilite le partage de code et la gestion des dépendances.

52. EXEMPLE D'ARBORESCENCE D'UN PLUGIN
seller-plugin/
│
├── seller.plugin.ts
│
├── entities/
│   └── seller-profile.entity.ts
│
├── services/
│   └── seller.service.ts
│
├── api/
│   ├── seller.resolver.ts
│   └── api-extensions.ts
│
├── events/
│   └── seller-approved.event.ts
│
├── strategies/
│   └── seller-validation.strategy.ts
│
└── types.ts

C'est cohérent avec la manière dont Vendure structure ses plugins : plugin, services, entités, extensions API et logique métier séparée.

53. WORKFLOW TECHNIQUE D'UNE COMMANDE

Prenons une commande de 5 vendeurs.

Client
  │
  ▼
Shop API
  │
  ▼
Vendure Order
  │
  ▼
Payment
  │
  ▼
Marketplace Service
  │
  ├── Seller A
  ├── Seller B
  ├── Seller C
  ├── Seller D
  └── Seller E
  │
  ▼
Seller Orders
  │
  ▼
Events
  │
  ▼
Seller confirmation
  │
  ▼
Logistics
  │
  ▼
Fulfillment
  │
  ▼
Delivery
  │
  ▼
Settlement
54. EXEMPLE D'API AHIZAN

Ahizan pourrait exposer une mutation métier :

mutation {
  createSellerOffer(
    input: {
      sellerId: "12"
      productVariantId: "450"
      price: 2500
      stock: 100
    }
  ) {
    id
    price
    stock
    status
  }
}

Cette mutation ne doit pas directement manipuler la base de données.

Architecture :

GraphQL
   ↓
Resolver
   ↓
SellerOfferService
   ↓
Validation
   ↓
Database
   ↓
EventBus
55. DÉPLOIEMENT

L'environnement de production pourrait être :

             INTERNET
                 │
              CDN/WAF
                 │
          Load Balancer
                 │
        ┌────────┴────────┐
        │                 │
   Vendure Server 1  Vendure Server 2
        │                 │
        └────────┬────────┘
                 │
              Database
                 │
              Worker
                 │
       ┌─────────┼─────────┐
       │         │         │
    Payment   Shipping     AI

L'architecture exacte dépendra du volume réel.

56. ENVIRONNEMENTS

Il faut impérativement séparer :

DEVELOPMENT

Développement.

STAGING

Tests avant production.

PRODUCTION

Environnement réel.

Aucun développeur ne doit expérimenter directement sur la base de production.

57. TESTS

Chaque plugin doit disposer de tests.

Tests unitaires

Tester :

commission = 10 %.

Tests métier

Tester :

vendeur refusé → recherche remplacement.

Tests API

Tester :

création d'offre.

Tests intégration

Tester :

commande multi-vendeurs.

Tests logistiques

Tester :

collecte → hub → livraison.

58. CI/CD

Le processus recommandé :

Développeur
    ↓
Git
    ↓
Pull Request
    ↓
Tests
    ↓
Build
    ↓
Staging
    ↓
Validation
    ↓
Production

Aucun code ne doit être envoyé directement en production sans validation.

59. ROADMAP DE DÉVELOPPEMENT

Je recommande de construire Ahizan en plusieurs phases.

PHASE 1 — CORE COMMERCE
Vendure ;
catalogue ;
produits ;
variantes ;
clients ;
panier ;
commande ;
paiement.
PHASE 2 — MARKETPLACE
vendeurs ;
boutiques ;
offres ;
prix ;
stock ;
Seller Orders.
PHASE 3 — LOGISTIQUE
collecte ;
livreurs ;
hub ;
livraison.
PHASE 4 — FINANCE
commissions ;
settlements ;
remboursements ;
rapprochement.
PHASE 5 — IA
fiches produits ;
classification ;
recherche ;
recommandations.
PHASE 6 — OPTIMISATION
analytics ;
automatisation ;
scoring vendeur ;
optimisation logistique.
60. ARCHITECTURE CIBLE FINALE

L'architecture finale d'Ahizan peut être représentée ainsi :

                         AHIZAN
                           │
       ┌───────────────────┼───────────────────┐
       │                   │                   │
    CLIENT              VENDEUR             LIVREUR
       │                   │                   │
       └───────────────────┼───────────────────┘
                           │
                        GRAPHQL
                           │
                    ┌──────▼──────┐
                    │   VENDURE   │
                    └──────┬──────┘
                           │
       ┌───────────────────┼────────────────────┐
       │                   │                    │
    CATALOGUE          MARKETPLACE          COMMERCE
       │                   │                    │
 Product/Variant       Sellers/Offers       Orders
       │                   │                    │
       └───────────────────┼────────────────────┘
                           │
                     AHIZAN SERVICES
                           │
       ┌──────────┬────────┼────────┬──────────┐
       │          │        │        │          │
      AI      LOGISTICS  FINANCE  NOTIFY   ANALYTICS
       │          │        │        │          │
       └──────────┴────────┼────────┴──────────┘
                           │
                         WORKER
                           │
                        DATABASE
CONCLUSION DU TOME 7

Le Tome 7 établit l'architecture fondamentale du projet.

La règle principale est :

Vendure doit rester le moteur e-commerce ; Ahizan doit devenir la couche d'intelligence marketplace qui transforme Vendure en plateforme adaptée au marché béninois et, à terme, régional.

Vendure fournit une architecture particulièrement adaptée à cette approche : plugins extensibles, entités personnalisées, APIs GraphQL, services métier, événements et support natif des scénarios multi-vendeurs.

Le cœur d'Ahizan devrait donc être construit autour de cette logique :

VENDURE
   +
AHIZAN MARKETPLACE
   +
AHIZAN LOGISTICS
   +
AHIZAN FINANCE
   +
AHIZAN AI
   =
PLATEFORME AHIZAN

Et surtout, il ne faut pas coder Ahizan comme un seul gros bloc.

Chaque fonction importante doit devenir un module ou un plugin indépendant, avec ses propres :

entités ;
services ;
APIs ;
événements ;
permissions ;
tests.

Cette architecture permettra à Ahizan de commencer relativement simplement, puis d'évoluer progressivement sans devoir reconstruire toute la plateforme lorsque le nombre de vendeurs et de commandes augmentera.

Référence technique officielle

La documentation actuelle de Vendure est disponible dans le Vendure Developer Hub, notamment les sections consacrées aux plugins, à l'architecture, aux Channels et aux marketplaces multi-vendeurs.