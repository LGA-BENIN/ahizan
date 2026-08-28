TOME 10 — ADMINISTRATION, BACK-OFFICE ET GOUVERNANCE OPÉRATIONNELLE

Document de référence fonctionnel et technique
Projet : AHIZAN Marketplace
Socle : Vendure
Version : 1.0 — 25 août 2026

STATUT DU DOCUMENT

Ce Tome 10 définit la manière dont Ahizan doit être administré, contrôlé et exploité au quotidien à partir de Vendure.

Il constitue le prolongement logique des Tomes 1 à 9.

Les Tomes précédents ont établi :

l'architecture ;
le catalogue ;
les produits et variantes ;
les vendeurs ;
les fiches produits ;
les commandes ;
le stock ;
les extensions ;
le modèle de données ;
les workflows.

Le Tome 10 répond maintenant à une question essentielle :

Qui fait quoi dans Ahizan, avec quels droits, sur quelles données et à travers quelle interface ?

Vendure dispose déjà d'un système d'authentification et d'autorisation basé sur les Roles et Permissions, ainsi que d'un Dashboard administrateur extensible.

SOMMAIRE
Objectif du Tome 10
Philosophie du back-office Ahizan
Architecture d'administration
Les trois interfaces d'Ahizan
Le Dashboard Vendure
Le Dashboard Ahizan
Les profils utilisateurs internes
Organisation des équipes
Rôles et permissions
Administrateur général
Responsable marketplace
Responsable catalogue
Opérateur catalogue
Responsable vendeur
Responsable commandes
Service client
Responsable logistique
Opérateur hub
Responsable financier
Contrôleur qualité
Gestion des vendeurs
Onboarding vendeur
Validation vendeur
Surveillance vendeur
Suspension vendeur
Gestion du catalogue
Contrôle des fiches produits
Gestion des offres
Gestion des commandes
Gestion des exceptions
Gestion des remplacements
Gestion de la logistique
Gestion des hubs
Gestion des livreurs
Gestion des paiements
Gestion des settlements
Gestion des payouts
Gestion des remboursements
Gestion des litiges
Gestion des clients
Notifications
Tableaux de bord
KPI commerciaux
KPI vendeurs
KPI catalogue
KPI logistiques
KPI financiers
Journal d'audit
Sécurité
Séparation des responsabilités
Architecture des permissions
Personnalisation du Dashboard
Extensions Dashboard Ahizan
Workflow de validation
Gestion des incidents
Gouvernance
Architecture finale
Règles d'or
Conclusion
1. OBJECTIF DU TOME 10

Le back-office est le centre de contrôle d'Ahizan.

Il ne doit pas être conçu comme une simple interface permettant de modifier des produits.

Il doit permettre de piloter :

VENDEURS
CATALOGUE
COMMANDES
STOCK
LOGISTIQUE
CLIENTS
FINANCE
QUALITÉ
LITIGES
PERFORMANCE

L'objectif est donc de transformer Vendure en :

un véritable centre opérationnel marketplace.

2. PHILOSOPHIE DU BACK-OFFICE AHIZAN

Le principe fondamental est :

Chaque employé doit voir uniquement ce dont il a besoin pour effectuer son travail.

Par exemple :

Un opérateur catalogue n'a aucune raison de pouvoir :

rembourser un client ;
modifier une commission ;
effectuer un payout ;
supprimer un vendeur.

Inversement, un comptable n'a pas besoin de pouvoir modifier une fiche produit.

Vendure permet précisément de créer des rôles personnalisés avec des permissions adaptées aux fonctions de chaque équipe.

3. ARCHITECTURE D'ADMINISTRATION

L'architecture cible :

                    AHIZAN
                       │
                 ADMINISTRATION
                       │
        ┌──────────────┼──────────────┐
        │              │              │
    OPERATIONS      CATALOGUE       FINANCE
        │              │              │
        ▼              ▼              ▼
    COMMANDES       PRODUITS       PAYMENTS
    LOGISTIQUE      OFFRES         SETTLEMENTS
    VENDEURS        QUALITÉ        PAYOUTS
        │
        └──────────────┬─────────────┘
                       │
                  SUPERVISION
                       │
                       ▼
                    ADMIN
4. LES TROIS INTERFACES D'AHIZAN

Il faut distinguer trois univers.

4.1 Storefront

Interface publique :

ahizan.com

Utilisée par :

clients ;
visiteurs.
4.2 Seller Portal

Interface vendeur :

vendeur.ahizan.com

Utilisée par :

vendeurs ;
responsables de boutiques.
4.3 Admin Dashboard

Interface interne :

admin.ahizan.com

Utilisée par :

administration ;
opérations ;
catalogue ;
finance ;
logistique ;
service client.
5. LE DASHBOARD VENDURE

Vendure fournit aujourd'hui un Dashboard administrateur moderne et extensible. Le Dashboard permet notamment de gérer les produits, commandes, clients et paramètres, et peut être enrichi par des extensions de plugins.

Ahizan ne doit donc pas forcément reconstruire tout le back-office.

Il faut :

réutiliser Vendure lorsque sa fonction correspond au besoin et ajouter une interface Ahizan lorsque le métier l'exige.

6. LE DASHBOARD AHIZAN

Le Dashboard Ahizan devrait comporter une navigation principale :

ACCUEIL
│
├── Vendeurs
├── Catalogue
├── Offres
├── Commandes
├── Clients
├── Stock
├── Logistique
├── Hubs
├── Livraisons
├── Finance
├── Remboursements
├── Litiges
├── Qualité
├── Promotions
├── Rapports
└── Paramètres
7. PAGE D'ACCUEIL DU BACK-OFFICE

L'accueil doit être un véritable cockpit opérationnel.

Exemple :

┌────────────────────────────────────────────┐
│             AHIZAN CONTROL CENTER          │
├────────────────────────────────────────────┤
│ CA DU JOUR          COMMANDES             │
│ 12 450 000 FCFA       248                  │
│                                            │
│ VENDEURS ACTIFS      PRODUITS              │
│ 1 284                   48 520             │
│                                            │
│ COMMANDES BLOQUÉES    LIVRAISONS           │
│ 12                     221                 │
└────────────────────────────────────────────┘
8. CENTRE DES ALERTES

Le système doit mettre immédiatement en évidence :

🔴 Urgent

paiement échoué ;
commande bloquée ;
litige critique ;
vendeur suspendu ;
stock incohérent.

🟠 Important

vendeur n'ayant pas répondu ;
livraison en retard ;
fiche produit incomplète.

🟢 Information

nouvelle inscription ;
nouvelle fiche ;
nouveau produit.
9. LES PROFILS UTILISATEURS INTERNES

Je recommande au lancement les rôles suivants :

Rôle	Fonction
Super Admin	Direction technique et système
Admin Marketplace	Supervision générale
Catalogue Manager	Gestion catalogue
Catalogue Operator	Saisie/correction
Seller Manager	Gestion vendeurs
Order Manager	Gestion commandes
Customer Support	Service client
Logistics Manager	Logistique
Hub Operator	Gestion hub
Finance Manager	Finance
Finance Operator	Opérations financières
Quality Manager	Contrôle qualité
Analyst	Reporting
10. SUPER ADMIN

Le Super Admin dispose des privilèges les plus élevés.

Il peut :

configurer le système ;
gérer les plugins ;
gérer les permissions ;
gérer les channels ;
gérer les paramètres ;
accéder aux logs ;
gérer les administrateurs.

Il ne doit toutefois pas être utilisé comme compte quotidien.

Le compte SuperAdmin doit être réservé aux opérations nécessitant réellement les privilèges maximum.

11. ADMIN MARKETPLACE

C'est le véritable responsable opérationnel.

Il peut consulter :

VENDEURS
CATALOGUE
COMMANDES
LOGISTIQUE
CLIENTS

et intervenir sur les exceptions.

Exemple :

un vendeur refuse une commande et aucun remplacement automatique n'est possible.

L'Admin Marketplace peut prendre la décision.

12. RESPONSABLE CATALOGUE

Responsable :

produits ;
catégories ;
variantes ;
attributs ;
images ;
SEO ;
qualité des fiches.

Il peut :

approuver une fiche.

Mais ne doit pas pouvoir :

effectuer un remboursement financier.

13. OPÉRATEUR CATALOGUE

Il effectue :

saisie ;
correction ;
enrichissement ;
classification ;
images ;
attributs.

Mais :

il ne valide pas seul les fiches sensibles.

Il peut avoir :

CREATE
READ
UPDATE

mais pas nécessairement :

APPROVE
PUBLISH
DELETE
14. RESPONSABLE VENDEUR

Il gère :

inscription ;
KYC selon les procédures Ahizan ;
documents ;
activation ;
suspension ;
performance ;
contrats ;
informations bancaires selon ses permissions.
15. RESPONSABLE COMMANDES

Il supervise :

commandes ;
Seller Orders ;
refus ;
retards ;
remplacements ;
commandes bloquées.

C'est un rôle central.

16. SERVICE CLIENT

Le service client doit pouvoir :

rechercher un client ;
consulter une commande ;
voir son état ;
communiquer avec le client ;
ouvrir un ticket ;
suivre un retour.

Mais il ne doit pas pouvoir modifier arbitrairement :

les prix ;
les commissions ;
les payouts.
17. RESPONSABLE LOGISTIQUE

Il gère :

missions ;
livreurs ;
collectes ;
hubs ;
colis ;
livraisons ;
retours logistiques.
18. OPÉRATEUR HUB

Il travaille essentiellement sur :

RÉCEPTION
SCAN
TRI
CONSOLIDATION
EXPÉDITION
RETOUR

Il ne doit pas avoir accès aux données financières sensibles.

19. RESPONSABLE FINANCIER

Il gère :

paiements ;
remboursements ;
commissions ;
settlements ;
payouts ;
rapprochements.

C'est une zone à accès extrêmement contrôlé.

20. CONTRÔLEUR QUALITÉ

Il contrôle :

qualité des produits ;
qualité des images ;
conformité des descriptions ;
conformité des catégories ;
qualité vendeur ;
problèmes récurrents.
21. GESTION DES VENDEURS

La page vendeur doit être structurée.

VENDEUR
│
├── Informations
├── Documents
├── Contacts
├── Boutique
├── Produits
├── Offres
├── Commandes
├── Performance
├── Litiges
├── Finance
└── Historique
22. ONBOARDING VENDEUR

Workflow :

INSCRIPTION
   ↓
INFORMATIONS
   ↓
DOCUMENTS
   ↓
VÉRIFICATION
   ↓
VALIDATION
   ↓
FORMATION
   ↓
ACTIVATION
23. VALIDATION VENDEUR

L'administrateur doit avoir une checklist :

☐ Identité
☐ Informations entreprise
☐ Téléphone
☐ Adresse
☐ Documents
☐ Coordonnées de paiement
☐ Catégories autorisées
☐ Conditions commerciales

Puis :

VALIDER LE VENDEUR

24. SURVEILLANCE VENDEUR

Le Dashboard doit afficher :

TAUX D'ACCEPTATION
TAUX DE REFUS
TAUX DE RUPTURE
TEMPS MOYEN DE PRÉPARATION
TAUX D'ANNULATION
TAUX DE RETOUR
NOTE CLIENT
25. SCORE VENDEUR

Exemple :

Performance vendeur
        87 / 100

avec :

Disponibilité      92
Préparation        84
Qualité            89
Livraison          91
Service            79
26. SUSPENSION VENDEUR

Un vendeur peut être :

ACTIVE
   ↓
WARNING
   ↓
RESTRICTED
   ↓
SUSPENDED

Exemple :

taux de refus excessif.

Le système peut automatiquement générer :

Alerte performance vendeur.

27. GESTION DU CATALOGUE

Le catalogue doit avoir :

Produits
Variantes
Catégories
Collections
Attributs
Marques
Images
SEO
Offres
28. CONTRÔLE DES FICHES

Chaque fiche peut avoir un :

Catalog Quality Score

Exemple :

96 / 100

Critères :

Titre          ✓
Description    ✓
Images         ✓
Attributs      ✓
Catégorie      ✓
SEO            ✓
GTIN           ✓
29. GESTION DES OFFRES

La page produit doit permettre de voir :

PRODUIT
│
├── Vendeur A — 8 000 FCFA — Stock 20
├── Vendeur B — 8 200 FCFA — Stock 12
├── Vendeur C — 8 500 FCFA — Stock 0

L'administrateur voit immédiatement :

qui vend quoi, à quel prix et avec quel stock.

30. GESTION DES COMMANDES

La liste doit permettre de filtrer :

Toutes
À confirmer
En préparation
En attente
Bloquées
En collecte
Au hub
En livraison
Livrées
Annulées
Retournées
Litiges
31. FICHE COMMANDE

La fiche doit être le dossier central.

ORDER #AHZ-001258

CLIENT
Produits
Vendeurs
Paiement
Livraison
Fulfillments
Historique
Messages
Litiges
Remboursement
Settlement
32. TIMELINE DE COMMANDE

Exemple :

10:02  Commande créée
10:03  Paiement confirmé
10:04  Stock alloué
10:05  Seller Orders créés
10:06  Vendeur A accepté
10:06  Vendeur B accepté
10:08  Vendeur C refusé
10:09  Recherche remplacement
10:11  Vendeur D sélectionné

Vendure émet des événements pour les actions importantes et les changements d'état, ce qui constitue une base utile pour construire cette traçabilité.

33. GESTION DES EXCEPTIONS

Le Dashboard doit posséder une rubrique :

EXCEPTIONS

avec :

🔴 12 critiques
🟠 28 importantes
🟡 43 à traiter
34. GESTION DES REMPLACEMENTS

Une page spéciale :

REPLACEMENT CENTER

Exemple :

Commande : AHZ-001258
Produit : Bernard Remy Blanc de Blancs
Vendeur initial : A
Motif : Rupture

Candidats :

B — 92/100
C — 86/100
D — 78/100

L'opérateur peut :

ACCEPTER B

35. GESTION DE LA LOGISTIQUE

Dashboard :

COLLECTES
│
├── À assigner
├── Assignées
├── En route
└── Terminées

LIVRAISONS
│
├── À préparer
├── En cours
├── Livrées
└── Échecs
36. GESTION DES HUBS

Chaque hub doit disposer de son propre tableau :

HUB COTONOU

Colis reçus       324
À trier            82
Consolidés        190
À expédier         52
Retours            11
37. GESTION DES LIVREURS
Livreur
│
├── Identité
├── Zone
├── Disponibilité
├── Missions
├── Performance
└── Historique
38. GESTION DES PAIEMENTS

Le module Finance doit permettre de voir :

Paiements reçus
Paiements échoués
Paiements en attente
Remboursements
39. SETTLEMENTS

Exemple :

Vendeur : Boutique X

Ventes              1 250 000
Commission            -125 000
Frais                  -20 000
Retours                -15 000
──────────────────────────────
Net                   1 090 000
40. PAYOUTS

Le responsable financier doit pouvoir voir :

PAYOUT #000452

Vendeur : X
Montant : 1 090 000 FCFA
Statut : APPROVED

Puis :

PROCESSING
      ↓
PAID
41. REMBOURSEMENTS

Chaque remboursement doit afficher :

Commande
Client
Motif
Montant
Mode de paiement
Date
Agent
Statut
42. LITIGES

Créer une véritable interface :

DISPUTE CENTER

Avec :

Nouveau
En investigation
Attente vendeur
Attente client
Décision
Résolu
Escaladé
43. GESTION DES CLIENTS

La fiche client :

CLIENT
│
├── Profil
├── Adresses
├── Commandes
├── Retours
├── Remboursements
├── Litiges
├── Avis
└── Historique

Vendure possède déjà une séparation entre les utilisateurs administrateurs et les clients, avec des mécanismes d'authentification distincts pour les APIs Admin et Shop.

44. NOTIFICATIONS

Le back-office doit permettre de contrôler :

Email
SMS
WhatsApp
Push

Mais la logique métier doit rester indépendante du canal.

Exemple :

OrderDelivered
      ↓
Notification Service
      ├── SMS
      ├── Email
      └── Push
45. TABLEAUX DE BORD

Ahizan doit avoir plusieurs dashboards.

Dashboard Direction
CA
Commandes
Clients
Vendeurs
Marge
Croissance
Dashboard Marketplace
Vendeurs actifs
Offres
Refus
Ruptures
Commandes
Dashboard Logistique
Collectes
Hubs
Livraisons
Retards
Dashboard Finance
GMV
Commission
Settlements
Payouts
Refunds
46. KPI COMMERCIAUX

Les indicateurs principaux :

GMV

Gross Merchandise Value

Nombre de commandes
Panier moyen
Taux de conversion
Clients actifs
Réachat
47. KPI VENDEURS

À suivre :

Acceptance Rate
Cancellation Rate
Stock Accuracy
Preparation Time
Return Rate
Customer Rating
48. KPI CATALOGUE
Produits actifs
Produits en attente
Fiches rejetées
Fiches incomplètes
Temps moyen de validation
Score qualité moyen
49. KPI LOGISTIQUES
Temps de collecte
Temps hub
Temps de consolidation
Temps livraison
First Attempt Delivery Rate
Taux d'échec
Coût moyen livraison
50. KPI FINANCIERS
GMV
Commission
Net Revenue
Refund Rate
Settlement Pending
Payout Pending
51. JOURNAL D'AUDIT

C'est une composante indispensable.

Chaque action sensible doit être enregistrée :

USER
DATE
ACTION
ENTITY
OLD VALUE
NEW VALUE
REASON
IP / CONTEXT

Exemple :

Agent : ADMIN-023
Action : Seller suspended
Seller : VEN-00451
Motif : taux de refus excessif
Date : 25/08/2026
52. SÉCURITÉ

La sécurité doit être organisée selon le principe :

Least Privilege

Chaque utilisateur reçoit :

uniquement les permissions nécessaires.

Vendure applique cette logique au travers des rôles et permissions ; les rôles peuvent également être associés à des Channels, ce qui est particulièrement intéressant pour des architectures multi-vendeurs ou multi-tenant.

53. MATRICE DES PERMISSIONS

Exemple recommandé :

Fonction	Lire	Créer	Modifier	Supprimer	Valider
Catalogue	✓	✓	✓	—	✓
Vendeur	✓	✓	✓	—	✓
Commande	✓	—	limité	—	—
Finance	✓	✓	✓	—	✓
Logistique	✓	✓	✓	—	✓
Client	✓	—	limité	—	—
54. SÉPARATION DES RESPONSABILITÉS

Exemple :

L'opérateur financier crée un payout.

Mais :

le responsable financier l'approuve.

C'est beaucoup plus sécurisé.

CREATE
  ↓
REVIEW
  ↓
APPROVE
  ↓
EXECUTE
55. PERMISSIONS PERSONNALISÉES AHIZAN

Vendure permet de créer des permissions personnalisées.

Ahizan pourrait définir :

ManageSellers
ApproveSeller
SuspendSeller

ManageCatalog
ApproveProduct
PublishProduct

ManageReplacement
ApproveReplacement

ManageHub
ManagePickup
ManageDelivery

ManageSettlement
ApprovePayout

ManageDispute
ResolveDispute
56. CHAMPS PERSONNALISÉS

Vendure permet d'ajouter des Custom Fields à de nombreuses entités, avec la possibilité de contrôler leur accès via des permissions.

Ahizan peut donc ajouter, par exemple :

Product
ahizanQualityScore
catalogStatus
brand
countryOfOrigin
ProductVariant
ean
gtin
internalSku
weight
volume
Seller
sellerCode
sellerScore
verificationStatus
57. EXEMPLE : SELLER
Seller
│
├── name
├── email
├── phone
├── status
├── customFields
│    ├── sellerCode
│    ├── qualityScore
│    ├── verificationStatus
│    └── riskLevel
58. PERSONNALISATION DU DASHBOARD

Il ne faut pas modifier directement le cœur de Vendure si une extension officielle existe.

Vendure fournit aujourd'hui des mécanismes pour :

ajouter des pages ;
ajouter des blocs ;
ajouter des boutons ;
modifier des tableaux ;
ajouter des formulaires ;
ajouter des éléments de navigation ;
ajouter des widgets.
59. DASHBOARD : PRINCIPE DE DÉVELOPPEMENT

Le développeur doit préférer :

PLUGIN
   ↓
DASHBOARD EXTENSION

plutôt que :

MODIFICATION DIRECTE DU CORE

Pourquoi ?

Parce qu'une modification directe rend les futures mises à jour beaucoup plus difficiles.

La documentation Vendure recommande d'utiliser les points d'extension du Dashboard plutôt que de remplacer les pages natives lorsque ce n'est pas nécessaire.

60. EXTENSION DU DASHBOARD AHIZAN

Exemple :

AhizanMarketplacePlugin
       │
       ├── Entities
       ├── Services
       ├── Events
       ├── Permissions
       ├── GraphQL
       └── Dashboard Extension

Vendure considère précisément les plugins comme le mécanisme central permettant d'ajouter des fonctionnalités métier, des entités, des APIs, des intégrations et des traitements en arrière-plan.

61. PAGE « REPLACEMENT CENTER »

C'est une fonctionnalité qui n'existe pas naturellement dans Vendure et qui doit être construite pour Ahizan.

Elle affiche :

COMMANDES BLOQUÉES

puis :

Produit
Vendeur initial
Motif
Candidats
Score
Prix
Stock
Distance

avec les actions :

[ASSIGNER]
[REFUSER]
[CONTACTER CLIENT]
[REMBOURSER]
62. PAGE « SELLER CONTROL CENTER »

Une autre page spécifique :

VENDEURS À SURVEILLER

Exemple :

🔴 Seller A — score 48
🟠 Seller B — score 63
🟢 Seller C — score 91
63. PAGE « ORDER CONTROL CENTER »

Cette page doit être le centre de supervision.

248 commandes aujourd'hui

✓ 201 normales
⏳ 29 en attente
⚠ 12 bloquées
🔴 6 critiques

L'opérateur doit pouvoir cliquer directement sur :

12 commandes bloquées

64. PAGE « LOGISTICS CONTROL CENTER »
COLLECTES
48

COLIS AU HUB
137

LIVRAISONS
221

RETARDS
17

ÉCHECS
8
65. PAGE « FINANCE CONTROL CENTER »
GMV DU JOUR
12 450 000 FCFA

COMMISSIONS
1 245 000 FCFA

SETTLEMENTS À VALIDER
28

PAYOUTS À EFFECTUER
21

REMBOURSEMENTS
4
66. WORKFLOW DE VALIDATION

Chaque action sensible devrait suivre :

DRAFT
 ↓
SUBMITTED
 ↓
REVIEW
 ↓
APPROVED
 ↓
EXECUTED

ou :

REJECTED
67. GESTION DES INCIDENTS

Ahizan doit disposer d'un centre :

Incident Management

Exemples :

INC-000125
Stock incohérent

INC-000126
Paiement non confirmé

INC-000127
Commande bloquée

INC-000128
Colis manquant
68. NIVEAUX D'INCIDENT
P1 — Critique
P2 — Majeur
P3 — Important
P4 — Mineur
P1

Exemple :

plusieurs paiements clients affectés.

P2

hub indisponible.

P3

vendeur bloqué.

P4

problème visuel.

69. GOUVERNANCE DES DONNÉES

Il faut définir :

Qui est propriétaire de chaque donnée ?

Exemple :

Donnée	Responsable
Produit	Catalogue
Offre	Marketplace
Stock	Operations
Commande	Commerce
Livraison	Logistique
Settlement	Finance
Client	Customer Operations
70. RÈGLE DE PROPRIÉTÉ

Un service ne doit pas modifier librement les données appartenant à un autre domaine.

Exemple :

Logistique ne modifie pas le montant d'une commission.

Elle signale :

livraison effectuée.

Puis le moteur Finance calcule le settlement.

71. ARCHITECTURE DES DOMAINES

Je recommande :

AHIZAN
│
├── Catalog
├── Sellers
├── Offers
├── Orders
├── Replacement
├── Inventory
├── Logistics
├── Hubs
├── Customers
├── Payments
├── Refunds
├── Settlements
├── Payouts
├── Disputes
├── Notifications
└── Analytics
72. ARCHITECTURE TECHNIQUE
                    STOREFRONT
                         │
                         ▼
                    SHOP API
                         │
                         ▼
                    VENDURE
                         │
        ┌────────────────┼────────────────┐
        │                │                │
      CORE           AHIZAN PLUGINS    WORKER
        │                │                │
        │                │                │
    Products         Sellers          Jobs
    Orders           Offers           Emails
    Stock            Logistics        Sync
    Payments         Finance          AI
        │                │
        └────────────────┼────────────────┘
                         │
                    ADMIN API
                         │
                         ▼
                  AHIZAN DASHBOARD

Vendure sépare notamment le Server, le Worker, le Dashboard et les APIs Shop/Admin ; le Worker est conçu pour les tâches longues ou nécessitant des retries.

73. WORKER AHIZAN

Le Worker peut traiter :

Synchronisation stock
Recherche remplacement
Analyse IA
Notifications
Calcul statistiques
Import catalogue
Export rapports

Cela évite de faire attendre l'administrateur.

74. ÉVÉNEMENTS ADMINISTRATION

Exemples :

SellerApproved
SellerSuspended
ProductApproved
ProductPublished
ReplacementApproved
SettlementApproved
PayoutApproved
DisputeResolved

Les événements Vendure peuvent être consommés par des plugins, notamment pour réagir aux créations/modifications d'entités et aux changements d'état des commandes, paiements, fulfillments et remboursements.

75. RÈGLE : PAS DE SUPPRESSION DANGEREUSE

Pour les données critiques :

préférer l'archivage à la suppression.

Exemple :

Seller
ACTIVE
 ↓
CLOSED

plutôt que :

DELETE Seller

Cela conserve l'historique.

76. RÈGLE : TOUT DOIT ÊTRE RECHERCHABLE

L'administrateur doit pouvoir rechercher :

Commande
Téléphone
Nom client
Nom vendeur
SKU
GTIN
Référence
Tracking
Numéro de payout
77. RÈGLE : EXPORTS

Les utilisateurs autorisés doivent pouvoir exporter :

commandes ;
produits ;
vendeurs ;
stocks ;
settlements ;
payouts ;
rapports.

Mais les exports doivent être soumis aux permissions.

78. RÈGLE : DONNÉES SENSIBLES

Les informations financières ou personnelles ne doivent être visibles que par les utilisateurs autorisés.

Les Custom Fields peuvent eux-mêmes être protégés par permissions dans Vendure.

79. RÈGLE : CHANNELS

Si Ahizan utilise plusieurs marchés, zones ou environnements commerciaux, les Channels de Vendure peuvent être utilisés pour séparer certaines données et opérations.

Les rôles Vendure peuvent être limités à des Channels spécifiques, ce qui peut être particulièrement utile pour des architectures multi-tenant.

80. EXEMPLE D'ÉVOLUTION FUTURE

Aujourd'hui :

AHIZAN BÉNIN

Demain :

AHIZAN
│
├── BENIN
├── TOGO
├── CÔTE D'IVOIRE
└── NIGER

Il faut donc éviter de coder :

« Bénin » partout dans le système.

Les paramètres géographiques doivent être configurables.

81. GESTION DES PARAMÈTRES

Le Dashboard doit posséder :

Paramètres Ahizan

avec :

Marketplace
Catalogue
Commandes
Logistique
Remplacements
Finance
Notifications
82. EXEMPLE DE PARAMÈTRES MARKETPLACE
autoReplacement = true

maxReplacementPriceIncrease = 5%

sellerConfirmationTimeout = 60

allowPartialShipment = false
83. EXEMPLE DE PARAMÈTRES LOGISTIQUES
maxPickupDelay
maxHubProcessingTime
maxDeliveryAttempts
returnAfterFailedAttempts
84. EXEMPLE DE PARAMÈTRES FINANCIERS
commissionDefault
settlementDelay
minimumPayout
refundApprovalLimit
85. APPROBATION À DOUBLE NIVEAU

Pour les opérations financières importantes :

OPERATEUR
   ↓
CRÉE
   ↓
MANAGER
   ↓
APPROUVE
   ↓
SYSTÈME
   ↓
EXÉCUTE

C'est une excellente protection contre les erreurs et fraudes internes.

86. EXEMPLE DE LIMITE FINANCIÈRE
Remboursement < 25 000 FCFA
→ Service client

25 000 – 100 000
→ Responsable

> 100 000
→ Finance Manager

Les seuils sont configurables.

87. APPROBATION DES PRODUITS

Même logique :

OPÉRATEUR
   ↓
PRÉPARE
   ↓
QUALITY MANAGER
   ↓
VALIDE
   ↓
PUBLISH
88. APPROBATION DES VENDEURS
SELLER MANAGER
      ↓
CHECK
      ↓
QUALITY / COMPLIANCE
      ↓
APPROVE
      ↓
ACTIVE
89. APPROBATION DES REMPLACEMENTS

Selon le montant :

Même produit + même prix
→ automatique

Différence < 5 %
→ automatique

Différence 5–10 %
→ opérateur

Différence > 10 %
→ client

C'est une règle métier Ahizan, pas une règle native de Vendure.

90. GESTION DES ERREURS HUMAINES

Le système doit demander confirmation pour les actions dangereuses :

« Confirmer la suspension du vendeur ? »

« Confirmer le remboursement de 350 000 FCFA ? »

« Confirmer la réaffectation de cette commande ? »

91. BOUTON D'ACTION RAPIDE

Sur chaque dossier :

[ACCEPTER]
[REFUSER]
[RÉAFFECTER]
[REMBOURSER]
[CONTACTER]
[ESCALADER]

Mais uniquement si l'utilisateur possède la permission correspondante.

92. DASHBOARD PERSONNALISÉ PAR RÔLE

Le même système doit afficher des informations différentes.

Direction
CA
Marge
GMV
Croissance
Logistique
Collectes
Hubs
Livraisons
Retards
Catalogue
Fiches
Qualité
Produits
Finance
Payments
Settlements
Payouts
Refunds
93. POURQUOI CETTE ARCHITECTURE EST IMPORTANTE

Ahizan ne sera pas simplement :

« un site où on vend des produits ».

Ce sera :

une organisation numérique qui orchestre plusieurs milliers de vendeurs, produits, commandes, paiements et opérations logistiques.

Le back-office devient donc aussi important que le site client.

94. CE QUE LE DÉVELOPPEUR DOIT ÉVITER
❌ Modifier le core Vendure
❌ Donner tous les droits à tous les employés
❌ Stocker des règles métier en dur
❌ Créer plusieurs sources contradictoires pour le stock
❌ Modifier directement les commandes sans workflow
❌ Supprimer les historiques
❌ Mélanger les responsabilités finance/logistique/catalogue
❌ Créer un deuxième moteur de commande indépendant de Vendure
95. CE QUE LE DÉVELOPPEUR DOIT PRIVILÉGIER
✅ Plugins
✅ Custom Fields
✅ Custom Permissions
✅ Events
✅ Worker / Job Queue
✅ Dashboard Extensions
✅ Services métier
✅ Machines à états Vendure
✅ Audit Logs
✅ Configuration

Vendure est justement conçu pour être étendu par plugins qui peuvent modifier la configuration, ajouter des entités, étendre GraphQL, réagir aux événements et exécuter des tâches en arrière-plan.

96. ARCHITECTURE FINALE DU BACK-OFFICE AHIZAN
                         AHIZAN
                            │
                    ┌───────┴───────┐
                    │               │
                FRONT OFFICE    BACK OFFICE
                    │               │
                    │               ▼
                    │         DASHBOARD AHIZAN
                    │               │
                    │       ┌───────┼────────┐
                    │       │       │        │
                    │   OPERATIONS CATALOGUE FINANCE
                    │       │       │        │
                    │       ▼       ▼        ▼
                    │   ORDERS   PRODUCTS  PAYMENTS
                    │   LOGISTICS OFFERS   PAYOUTS
                    │   SELLERS  QUALITY   SETTLEMENT
                    │
                    ▼
                 SHOP API
                    │
                    ▼
              VENDURE CORE
                    │
        ┌───────────┼───────────┐
        │           │           │
      SERVER      WORKER      PLUGINS
        │           │           │
        └───────────┼───────────┘
                    │
               DATABASE
97. LES 20 RÈGLES D'OR DU TOME 10
1.

Chaque utilisateur doit avoir un rôle.

2.

Chaque rôle doit avoir uniquement les permissions nécessaires.

3.

Les données financières doivent être fortement protégées.

4.

Les opérations sensibles doivent être auditables.

5.

Le Super Admin ne doit pas être le compte quotidien.

6.

Un opérateur ne doit pas pouvoir s'auto-approuver sur les opérations sensibles.

7.

Le catalogue doit être séparé de la finance.

8.

La logistique doit être séparée de la finance.

9.

Les exceptions doivent être visibles.

10.

Les commandes bloquées doivent avoir un centre de contrôle.

11.

Les vendeurs doivent avoir un score de performance.

12.

Les produits doivent avoir un score de qualité.

13.

Les paramètres métier doivent être configurables.

14.

Les actions critiques doivent demander confirmation.

15.

Les données importantes ne doivent pas être supprimées sans stratégie d'archivage.

16.

Le Dashboard doit être adapté au rôle de l'utilisateur.

17.

Les extensions doivent être développées sous forme de plugins lorsque possible.

18.

Le cœur Vendure ne doit pas être modifié inutilement.

19.

Toutes les opérations critiques doivent être traçables.

20.

Le back-office Ahizan doit être conçu comme un centre de contrôle opérationnel, pas comme un simple panneau d'administration.

98. CONCLUSION DU TOME 10

Le Tome 9 définissait :

comment Ahizan fonctionne.

Le Tome 10 définit :

comment les équipes Ahizan pilotent ce fonctionnement.

L'architecture cible peut donc être résumée ainsi :

                     VENDURE
                        │
             MOTEUR E-COMMERCE
                        │
                        ▼
                     AHIZAN
                        │
          ┌─────────────┼─────────────┐
          │             │             │
       MARKETPLACE    LOGISTICS      FINANCE
          │             │             │
       SELLERS         HUBS       SETTLEMENTS
       OFFERS         DELIVERY      PAYOUTS
          │             │             │
          └─────────────┼─────────────┘
                        │
                        ▼
                 ADMIN DASHBOARD
                        │
        ┌───────────────┼────────────────┐
        │               │                │
     CATALOGUE       ORDERS          CONTROL
        │               │                │
     QUALITY       EXCEPTIONS          KPI
        │               │                │
        └───────────────┼────────────────┘
                        │
                        ▼
                   DIRECTION

Et la règle fondamentale devient :

Vendure fournit le moteur. Ahizan fournit l'intelligence opérationnelle, les règles marketplace et le centre de contrôle.

Cette approche est cohérente avec l'architecture actuelle de Vendure : plateforme headless exposant les APIs Shop/Admin, serveur et Worker séparés, Dashboard extensible et système de plugins destiné précisément à ajouter les fonctionnalités métier propres à une application.

Références techniques officielles

Documentation officielle Vendure

Marketplace multi-vendeurs Vendure

Authentification et autorisation Vendure

Rôles et permissions

Custom Fields

Plugins Vendure

Extension du Dashboard

Événements Vendure

POSITIONNEMENT DANS LA COLLECTION AHIZAN

À ce stade, les 10 tomes forment une véritable architecture documentaire :

TOME 1 → Fondations Vendure / Ahizan
TOME 2 → Produits & Variantes
TOME 3 → Marketplace / Vendeurs
TOME 4 → Fiches Produits / Qualité / SEO
TOME 5 → Commandes
TOME 6 → Stocks & Opérations
TOME 7 → Plugins / API / Extensions
TOME 8 → Modèle de données
TOME 9 → Workflows / Règles métier
TOME 10 → Administration / Back-office / Gouvernance

Le Tome 10 clôt donc le premier grand bloc fonctionnel du manuel. Il donne au développeur non seulement les règles techniques Vendure, mais surtout la structure organisationnelle nécessaire pour transformer Vendure en véritable infrastructure marketplace Ahizan.