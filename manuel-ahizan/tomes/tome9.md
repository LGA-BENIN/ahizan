MANUEL VENDURE ADAPTÉ À AHIZAN
TOME 9 — WORKFLOWS ET RÈGLES MÉTIER

Document de référence fonctionnel et technique
Projet : AHIZAN Marketplace
Socle : Vendure
Version : 1.0 — 25 août 2026

STATUT DU DOCUMENT

Ce Tome 9 constitue le manuel de référence des processus métier d'Ahizan.

Il complète les Tomes précédents :

Tome 1 — Fondations de Vendure et architecture Ahizan
Tome 2 — Catalogue, produits et variantes
Tome 3 — Marketplace et gestion des vendeurs
Tome 4 — Fiches produits, référencement et qualité
Tome 5 — Commandes et gestion commerciale
Tome 6 — Stock et opérations
Tome 7 — Plugins, API et extensions
Tome 8 — Modèle de données et entités métier
Tome 9 — Workflows et règles métier

Principe directeur : Vendure fournit le moteur e-commerce et marketplace ; Ahizan ajoute les processus métier spécifiques nécessaires au fonctionnement d'une marketplace adaptée au marché béninois.

Vendure fonctionne lui-même avec des machines à états pour les commandes, paiements, fulfillments et remboursements. Il est donc préférable qu'Ahizan s'appuie sur ces mécanismes plutôt que de créer un deuxième système d'état indépendant.

SOMMAIRE
Objet du Tome 9
Philosophie générale des workflows Ahizan
Les acteurs du système
Les niveaux de workflow
Workflow global Ahizan
Workflow de création d'un produit
Détection d'un produit existant
Création d'une nouvelle fiche produit
Contrôle qualité de la fiche
Validation de la fiche
Création d'une offre vendeur
Gestion du stock vendeur
Publication de l'offre
Parcours client
Création du panier
Constitution d'une commande multi-vendeurs
Vérification du stock
Paiement
Allocation du stock
Création des Seller Orders
Notification des vendeurs
Acceptation d'une commande
Refus d'une commande
Rupture de stock
Recherche automatique d'un vendeur de remplacement
Validation du remplacement
Blocage temporaire de la livraison
Préparation de commande
Collecte chez le vendeur
Réception au hub
Consolidation des colis
Livraison finale
Livraison réussie
Échec de livraison
Annulation
Retour client
Remboursement
Litige
Commission
Settlement vendeur
Paiement vendeur
Évaluation vendeur
États du vendeur
États de l'offre
États de la commande
États logistiques
Machine à états globale
Règles de priorité
Gestion des exceptions
Journalisation et traçabilité
Notifications
Permissions
Cas complet : 10 produits / 5 vendeurs
Cas complet : vendeur indisponible
Cas complet : produit inexistant
Cas complet : rupture après paiement
Cas complet : retour
Architecture technique des workflows
Événements métier
Jobs asynchrones
Idempotence
Transactions
Sécurité
Règles d'or
Architecture finale
1. OBJET DU TOME 9

Le Tome 8 répondait à la question :

Quelles données Ahizan doit-il stocker ?

Le Tome 9 répond à une question différente :

Que doit faire Ahizan lorsque quelque chose se produit ?

Exemples :

un vendeur ajoute un produit ;
un client passe une commande ;
un vendeur refuse ;
le stock disparaît ;
un autre vendeur doit être recherché ;
un colis est collecté ;
plusieurs commandes doivent être regroupées ;
une livraison échoue ;
un client demande un retour ;
Ahizan doit payer le vendeur.
2. PHILOSOPHIE GÉNÉRALE DES WORKFLOWS AHIZAN

Ahizan doit être conçu comme un système où chaque événement déclenche une série d'actions contrôlées.

Exemple :

VENDEUR REFUSE UNE LIGNE
        ↓
AHIZAN IDENTIFIE LE PROBLÈME
        ↓
RECHERCHE D'UN VENDEUR ALTERNATIF
        ↓
VÉRIFICATION STOCK
        ↓
VÉRIFICATION PRIX
        ↓
SÉLECTION
        ↓
RÉAFFECTATION
        ↓
REPRISE DU PROCESSUS

Il ne faut pas que l'administrateur soit obligé de tout faire manuellement.

3. LES ACTEURS DU SYSTÈME

Ahizan possède plusieurs catégories d'acteurs.

3.1 Client

Il :

consulte ;
ajoute au panier ;
commande ;
paie ;
suit ;
reçoit ;
peut retourner ;
peut évaluer.
3.2 Vendeur

Il :

crée ou propose des produits ;
gère ses offres ;
confirme les commandes ;
prépare ;
remet les produits ;
reçoit ses règlements.
3.3 Équipe catalogue Ahizan

Elle :

contrôle les fiches ;
corrige ;
valide ;
classe ;
normalise.
3.4 Équipe marketplace

Elle :

contrôle les vendeurs ;
surveille les commandes ;
intervient dans les exceptions.
3.5 Équipe logistique

Elle :

collecte ;
réceptionne ;
consolide ;
expédie ;
livre.
3.6 Administration financière

Elle :

contrôle les paiements ;
commissions ;
remboursements ;
settlements ;
payouts.
3.7 Moteur Ahizan

Il automatise :

vérifications ;
affectations ;
notifications ;
calculs ;
recherche de remplacement ;
suivi des délais.
4. LES NIVEAUX DE WORKFLOW

Ahizan doit séparer les workflows en cinq niveaux.

NIVEAU 1
CATALOGUE

NIVEAU 2
OFFRE VENDEUR

NIVEAU 3
COMMANDE

NIVEAU 4
LOGISTIQUE

NIVEAU 5
FINANCE
5. WORKFLOW GLOBAL AHIZAN

Voici le processus cible :

PRODUIT
   ↓
CONTRÔLE
   ↓
VALIDATION
   ↓
OFFRE VENDEUR
   ↓
PUBLICATION
   ↓
CLIENT
   ↓
PANIER
   ↓
CHECKOUT
   ↓
PAIEMENT
   ↓
COMMANDE
   ↓
SELLER ORDERS
   ↓
CONFIRMATION VENDEURS
   ↓
PRÉPARATION
   ↓
COLLECTE
   ↓
HUB
   ↓
CONSOLIDATION
   ↓
LIVRAISON
   ↓
CLIENT
   ↓
SETTLEMENT
   ↓
PAYOUT VENDEUR

Vendure considère déjà Order comme l'entité qui accompagne le parcours complet du panier jusqu'à la réception ; le panier n'est pas une entité séparée mais une commande encore dans un état actif.

6. WORKFLOW DE CRÉATION D'UN PRODUIT

Lorsqu'un vendeur veut vendre un produit :

VENDEUR
   ↓
SAISIE PRODUIT
   ↓
RECHERCHE PRODUIT EXISTANT
   ↓
     ┌───────────────┐
     │               │
 EXISTE            N'EXISTE PAS
     │               │
     ↓               ↓
RATTACHEMENT       CRÉATION
                     ↓
                  CONTRÔLE
                     ↓
                  VALIDATION
7. DÉTECTION D'UN PRODUIT EXISTANT

Avant de créer un nouveau Product, Ahizan doit rechercher un produit existant.

Ordre recommandé :

Niveau 1

EAN / GTIN.

Niveau 2

Référence fabricant.

Niveau 3

Marque + modèle.

Niveau 4

Nom normalisé.

Niveau 5

Caractéristiques.

Niveau 6

Recherche assistée par IA.

8. RÈGLE DE DÉDUPLICATION

Si Ahizan identifie :

exactement le même produit

il ne doit pas créer un deuxième produit.

Il doit créer ou rattacher une offre vendeur.

Vendure sépare bien le Product, qui porte notamment nom, description, slug et images, du ProductVariant, qui porte notamment SKU, prix et stock et constitue l'élément réellement acheté.

9. CRÉATION D'UNE NOUVELLE FICHE

Si le produit n'existe pas :

Product
   +
ProductVariant
   +
Assets
   +
Taxonomy
   +
SEO

Exemple :

Produit :
Bernard Remy Blanc de Blancs

Variant :
Bouteille 75 cl
10. CONTRÔLE QUALITÉ DE LA FICHE

Ahizan doit contrôler automatiquement :

Informations obligatoires
nom ;
marque ;
catégorie ;
description ;
caractéristiques ;
images ;
variante ;
unité ;
SKU ;
GTIN lorsqu'il existe ;
poids lorsque nécessaire.
Contrôle qualité
COMPLÉTUDE
IMAGE
DESCRIPTION
CLASSIFICATION
SEO
NORMALISATION
11. INTERVENTION DE L'IA

L'IA peut :

reformuler ;
corriger ;
proposer un titre ;
identifier la catégorie ;
proposer des attributs ;
détecter des doublons ;
améliorer la description ;
détecter les informations manquantes.

Mais :

L'IA ne doit pas être la seule autorité de validation.

Une fiche peut être :

BROUILLON
   ↓
IA ANALYSÉE
   ↓
CONTRÔLE HUMAIN
   ↓
VALIDÉE
12. VALIDATION DE LA FICHE

Statuts :

DRAFT
   ↓
AI_PROCESSING
   ↓
PENDING_REVIEW
   ↓
APPROVED
   ↓
PUBLISHED

Branches :

REJECTED
NEEDS_CORRECTION
SUSPENDED
13. CRÉATION D'UNE OFFRE VENDEUR

Une fois le produit validé :

PRODUCT VARIANT
        +
SELLER
        +
PRICE
        +
STOCK
        +
SELLER SKU
        ↓
SELLER OFFER
14. CONTRÔLES AVANT PUBLICATION

Ahizan vérifie :

Vendeur actif ?
       ↓
Oui

Produit validé ?
       ↓
Oui

Prix valide ?
       ↓
Oui

Stock renseigné ?
       ↓
Oui

Zone de vente autorisée ?
       ↓
Oui

Alors :

SellerOffer = ACTIVE

15. GESTION DU STOCK VENDEUR

Le stock est critique.

Vendure distingue notamment :

stock physique ;
stock alloué ;
stock disponible à la vente.

Le stock vendable correspond au stock physique moins les allocations et le seuil de rupture.

Exemple :

Stock physique = 20
Stock alloué = 5
Stock disponible = 15
16. RÈGLE DE SYNCHRONISATION DU STOCK

Ahizan doit éviter deux sources concurrentes de vérité.

Mauvais modèle
Vendure stock = 20
Ahizan stock = 17
Seller stock = 25
Bon modèle
SOURCE DE VÉRITÉ
       ↓
STOCK VENDURE
       ↓
AHIZAN L'EXPLOITE

Si un système externe est utilisé, Ahizan doit définir précisément lequel est maître.

Vendure permet également de synchroniser son stock avec un système d'inventaire externe lorsqu'on choisit cette architecture.

17. PUBLICATION DE L'OFFRE

Une offre active devient visible :

Recherche
   ↓
Page produit
   ↓
Choix vendeur
   ↓
Ajout panier
18. PARCOURS CLIENT

Le client :

RECHERCHE
   ↓
PRODUIT
   ↓
VARIANTE
   ↓
CHOIX DE L'OFFRE
   ↓
PANIER
   ↓
ADRESSE
   ↓
LIVRAISON
   ↓
PAIEMENT
   ↓
COMMANDE
19. CRÉATION DU PANIER

Le client ajoute :

Produit A × 2
Produit B × 3
Produit C × 1

Vendure représente ce panier par une Order dans son état actif.

20. CONSTITUTION D'UNE COMMANDE MULTI-VENDEURS

Supposons :

Produit A → Vendeur 1
Produit B → Vendeur 2
Produit C → Vendeur 1
Produit D → Vendeur 3

Le client voit :

UNE COMMANDE

Ahizan doit ensuite créer la structure interne :

ORDER
│
├── SELLER ORDER 1
│    ├── A
│    └── C
│
├── SELLER ORDER 2
│    └── B
│
└── SELLER ORDER 3
     └── D

Vendure documente précisément le principe de séparation d'une commande agrégée en commandes vendeur et prévoit une stratégie OrderSellerStrategy pour répartir les lignes entre vendeurs.

21. VÉRIFICATION DU STOCK

Avant confirmation :

Stock disponible ?
      │
 ┌────┴────┐
OUI       NON
 │          │
 ↓          ↓
CONTINUE   EXCEPTION
22. PAIEMENT

Le client paie Ahizan selon le moyen de paiement choisi.

Le système doit ensuite distinguer :

ARGENT CLIENT
      ↓
PAYMENT
      ↓
AHIZAN
      ↓
SETTLEMENT
      ↓
VENDEUR

Il ne faut pas considérer immédiatement le paiement client comme un paiement au vendeur.

23. ALLOCATION DU STOCK

Une fois la commande suffisamment avancée dans le processus de paiement, le stock peut être alloué selon la stratégie configurée.

Dans Vendure, par défaut, l'allocation intervient lorsque la commande atteint PaymentAuthorized ou PaymentSettled, selon la configuration.

Exemple :

Stock = 10
Commande = 3

Après allocation :

Stock physique = 10
Alloué = 3
Vendable = 7
24. CRÉATION DES SELLER ORDERS

Une fois la commande validée :

ORDER AHZ-000125
       │
       ├── SellerOrder A
       ├── SellerOrder B
       └── SellerOrder C

Chaque vendeur ne reçoit que sa partie.

25. NOTIFICATION DES VENDEURS

Le vendeur reçoit :

Nouvelle commande à confirmer

Avec :

produit ;
quantité ;
prix ;
délai ;
lieu de collecte ;
date limite de confirmation.
26. ACCEPTATION D'UNE COMMANDE

Le vendeur clique :

ACCEPTER

Workflow :

PENDING
   ↓
ACCEPTED
   ↓
PREPARING
   ↓
READY_FOR_PICKUP
27. REFUS D'UNE COMMANDE

Le vendeur clique :

REFUSER

Il doit idéalement sélectionner une raison :

STOCK_INCORRECT
PRODUCT_UNAVAILABLE
PRICE_ERROR
BUSINESS_CLOSED
PREPARATION_IMPOSSIBLE
OTHER

Puis :

SELLER ORDER
     ↓
REJECTED
     ↓
REPLACEMENT ENGINE
28. RUPTURE DE STOCK

Deux cas.

Cas A — rupture avant paiement

Le client n'a pas encore payé.

Ahizan peut :

proposer un autre vendeur ;
modifier le panier ;
retirer le produit.
Cas B — rupture après paiement

Situation beaucoup plus sensible.

Ahizan doit :

BLOQUER LA LIGNE
      ↓
RECHERCHER REMPLACEMENT
      ↓
TROUVER ?
   ┌──┴──┐
 OUI    NON
  │       │
  ↓       ↓
REASSIGNER REMBOURSER
29. MOTEUR DE REMPLACEMENT AHIZAN

Le moteur recherche les offres compatibles.

Critères :

Critère 1 — Même ProductVariant

Priorité maximale.

Critère 2 — Stock disponible
Critère 3 — Prix acceptable
Critère 4 — Distance
Critère 5 — Fiabilité vendeur
Critère 6 — Délai de préparation
Critère 7 — Zone de livraison
30. SCORE DE REMPLACEMENT

Exemple conceptuel :

Score =
30% disponibilité
25% prix
15% distance
15% fiabilité
10% délai
5% qualité vendeur

Les pondérations doivent être configurables.

31. EXEMPLE

Le vendeur A refuse.

Ahizan trouve :

Vendeur B
Prix : 8 200
Stock : 12
Distance : 3 km
Score : 92

Vendeur C
Prix : 8 700
Stock : 50
Distance : 9 km
Score : 81

Ahizan propose :

Vendeur B

32. VALIDATION DU REMPLACEMENT

Selon la politique commerciale :

Mode automatique

Si le prix respecte la limite :

remplacement automatique.

Mode manuel

Un opérateur doit valider.

Mode client

Si le prix augmente fortement :

demander l'accord du client.

33. BLOCAGE TEMPORAIRE DE LA LIVRAISON

C'est une règle particulièrement importante pour Ahizan.

Si une ligne n'est pas résolue :

ORDER
  ↓
DELIVERY HOLD

La commande ne doit pas continuer aveuglément.

Exemple :

10 produits
5 vendeurs

4 vendeurs OK
1 vendeur refuse

La partie logistique dépendante de cette ligne est :

EN ATTENTE

34. STATUT DELIVERY HOLD
READY
   ↓
HOLD
   ↓
RESOLVING
   ↓
RESOLVED
   ↓
READY_FOR_LOGISTICS

Ou :

HOLD
 ↓
FAILED
 ↓
PARTIAL_REFUND
35. IMPORTANT : NE PAS BLOQUER NÉCESSAIREMENT TOUTE LA COMMANDE

Ahizan doit distinguer :

Blocage global

Toute la commande attend.

Blocage partiel

Seule une partie attend.

Exemple :

Commande
│
├── Vendeur A ✓
├── Vendeur B ✓
├── Vendeur C ✓
├── Vendeur D ⏳
└── Vendeur E ✓

Ahizan peut décider selon la politique choisie :

expédier les parties prêtes

ou :

attendre la totalité.

Vendure permet plusieurs fulfillments et gère les états partiels lorsqu'une commande est exécutée en plusieurs étapes.

36. PRÉPARATION VENDEUR

Après acceptation :

ACCEPTED
   ↓
PREPARING

Le vendeur :

prépare ;
emballe ;
vérifie ;
marque comme prêt.
37. READY FOR PICKUP

Le vendeur confirme :

PRÊT POUR COLLECTE

Ahizan crée :

PickupMission
38. COLLECTE

Le livreur reçoit :

Mission #PU-00125
Vendeur : Boutique X
Adresse : ...
Colis : 3

Étapes :

ASSIGNED
   ↓
EN_ROUTE
   ↓
ARRIVED
   ↓
COLLECTED
39. PREUVE DE COLLECTE

La collecte doit pouvoir être prouvée.

Exemples :

signature ;
photo ;
QR code ;
code vendeur ;
scan colis.
40. RÉCEPTION AU HUB

Le colis arrive au hub :

COLLECTED
   ↓
IN_TRANSIT_TO_HUB
   ↓
RECEIVED_AT_HUB

Le personnel scanne le colis.

41. CONTRÔLE AU HUB

Ahizan vérifie :

colis ;
commande ;
vendeur ;
quantité ;
état ;
identification.

Si problème :

EXCEPTION
42. CONSOLIDATION

Supposons que le client ait commandé :

Vendeur A → 2 colis
Vendeur B → 1 colis
Vendeur C → 2 colis

Le hub peut préparer :

une expédition client consolidée

5 colis vendeur
      ↓
HUB
      ↓
CONSOLIDATION
      ↓
EXPÉDITION CLIENT
43. FULFILLMENT

Vendure utilise Fulfillment pour représenter la livraison des articles au client.

Une commande peut avoir plusieurs fulfillments, notamment lorsque les articles proviennent de lieux différents ou sont livrés séparément.

Ahizan doit donc utiliser le Fulfillment Vendure comme objet e-commerce de livraison, tout en conservant ses propres objets logistiques pour les opérations détaillées.

44. LIVRAISON FINALE

Workflow :

READY_FOR_DELIVERY
       ↓
ASSIGNED
       ↓
PICKED_UP
       ↓
IN_TRANSIT
       ↓
ARRIVED
       ↓
DELIVERED
45. PREUVE DE LIVRAISON

La livraison doit pouvoir être confirmée par :

OTP ;
signature ;
photo ;
scan ;
confirmation client.

Exemple :

Client reçoit SMS :
"Votre code de livraison est 4821"

Livreur saisit :
4821

→ DELIVERED
46. COMMANDE LIVRÉE

Lorsque toutes les parties nécessaires sont livrées :

SELLER ORDERS
      ↓
FULFILLMENTS
      ↓
DELIVERED
      ↓
ORDER = DELIVERED

Vendure fait évoluer l'état global de la commande en fonction de l'état de ses fulfillments ; avec plusieurs fulfillments, des états partiels sont possibles.

47. ÉCHEC DE LIVRAISON

Exemples :

CUSTOMER_ABSENT
WRONG_ADDRESS
PHONE_UNREACHABLE
CUSTOMER_REFUSED
DAMAGED_PACKAGE

Workflow :

DELIVERY_FAILED
       ↓
RETRY

Après plusieurs tentatives :

RETURN_TO_HUB

Puis éventuellement :

RETURN_TO_SELLER
48. ANNULATION

Une commande peut être annulée selon son état et les règles commerciales.

L'annulation doit déclencher les conséquences appropriées :

ORDER CANCEL
      ↓
RELEASE STOCK
      ↓
REFUND IF REQUIRED
      ↓
CANCEL LOGISTICS
      ↓
UPDATE SELLER SETTLEMENT

Vendure prévoit notamment des mouvements de stock de type Release lorsqu'un stock alloué est libéré à la suite d'une annulation avant fulfillment.

49. RETOUR CLIENT

Le client demande :

Retourner le produit.

Workflow :

RETURN REQUEST
       ↓
REVIEW
       ↓
APPROVED
       ↓
RETURN PICKUP
       ↓
RECEIVED
       ↓
INSPECTION
       ↓
REFUND / REPLACEMENT
50. REMBOURSEMENT

Le remboursement doit être indépendant de la logistique.

On peut avoir :

RETURN + REFUND

mais aussi :

REFUND SANS RETOUR

Vendure permet notamment qu'un remboursement et une annulation ne soient pas nécessairement les mêmes opérations.

51. LITIGE

Exemple :

Client affirme que le produit reçu n'est pas celui commandé.

Workflow :

DISPUTE_OPENED
       ↓
EVIDENCE_COLLECTION
       ↓
SELLER_RESPONSE
       ↓
AHIZAN_REVIEW
       ↓
DECISION

Résolutions possibles :

CUSTOMER_FAVOR
SELLER_FAVOR
PARTIAL_REFUND
FULL_REFUND
REPLACEMENT
NO_ACTION
52. COMMISSION

Après validation de la vente :

Gross Sale
   ↓
Commission Rule
   ↓
Commission Amount

Exemple :

Vente = 100 000 FCFA
Commission = 10%

Commission = 10 000 FCFA
53. SETTLEMENT

Le settlement détermine :

combien Ahizan doit au vendeur.

Exemple :

Vente                  100 000
Commission              -8 000
Frais logistiques       -2 000
Remboursement            -0
──────────────────────────────
Net vendeur             90 000
54. PAYOUT

Le Payout intervient lorsque le paiement réel au vendeur est effectué.

SETTLEMENT
    ↓
APPROVED
    ↓
PAYOUT_PENDING
    ↓
PROCESSING
    ↓
PAID

En cas d'erreur :

FAILED
55. ÉVALUATION DU VENDEUR

Après livraison :

ORDER DELIVERED
      ↓
CUSTOMER REVIEW
      ↓
SELLER PERFORMANCE

Les indicateurs peuvent inclure :

note ;
délai ;
refus ;
exactitude stock ;
qualité produit ;
taux de retour.
56. ÉTATS DU VENDEUR

Je recommande :

PENDING
   ↓
VERIFICATION
   ↓
ACTIVE

Branches :

SUSPENDED
BLOCKED
REJECTED
CLOSED
57. ÉTATS DE L'OFFRE
DRAFT
 ↓
PENDING_REVIEW
 ↓
ACTIVE

Puis :

PAUSED
OUT_OF_STOCK
SUSPENDED
DISCONTINUED
58. ÉTATS DE LA COMMANDE

Il faut distinguer les états Vendure et les états métier Ahizan.

Vendure

Le workflow standard comprend notamment :

AddingItems
ArrangingPayment
PaymentAuthorized
PaymentSettled
Shipped
Delivered

avec des états partiels lorsqu'il y a plusieurs fulfillments.

Ahizan

On peut ajouter une couche métier :

WAITING_SELLER_CONFIRMATION
SELLER_ISSUE
REPLACEMENT_IN_PROGRESS
LOGISTICS_HOLD
READY_FOR_PICKUP
AT_HUB
CONSOLIDATING
OUT_FOR_DELIVERY
59. NE PAS CONFONDRE LES DEUX MACHINES

C'est une règle technique fondamentale.

Mauvais modèle

Créer un deuxième OrderState Ahizan qui remplace complètement Vendure.

Bon modèle
VENDURE ORDER STATE
        +
AHIZAN BUSINESS STATUS

Vendure utilise une machine à états typée pour contrôler les transitions valides.

60. MACHINE À ÉTATS GLOBALE AHIZAN

Vue conceptuelle :

ADDING_ITEMS
     ↓
ARRANGING_PAYMENT
     ↓
PAYMENT_AUTHORIZED
     ↓
PAYMENT_SETTLED
     ↓
SELLER_CONFIRMATION
     │
     ├──────────────┐
     │              │
 ALL ACCEPTED     PROBLEM
     │              │
     ↓              ↓
PREPARATION     REPLACEMENT
     │              │
     │         ┌────┴────┐
     │       FOUND     NOT FOUND
     │         │           │
     │         ↓           ↓
     └────── REASSIGN    REFUND
              │
              ↓
       READY_FOR_PICKUP
              ↓
           PICKUP
              ↓
            HUB
              ↓
       CONSOLIDATION
              ↓
         OUT_FOR_DELIVERY
              ↓
          DELIVERED
61. RÈGLE DE PRIORITÉ

Lorsqu'une anomalie survient, Ahizan doit traiter :

Priorité 1

Sécurité financière

Priorité 2

Intégrité du stock

Priorité 3

Intégrité de la commande

Priorité 4

Logistique

Priorité 5

Expérience utilisateur

Cela signifie qu'Ahizan ne doit jamais continuer une opération logistique si les données financières ou de stock sont incohérentes.

62. GESTION DES EXCEPTIONS

Chaque workflow doit prévoir :

SUCCESS
FAILURE
TIMEOUT
CANCELLED
RETRY
MANUAL_REVIEW

Exemple :

Seller confirmation
        ↓
Timeout 30 min
        ↓
Reminder
        ↓
Timeout 60 min
        ↓
Replacement workflow

Les délais doivent être configurables.

63. JOURNALISATION

Chaque événement critique doit laisser une trace.

Exemple :

25/08 14:01
Seller A received order

25/08 14:15
Seller A rejected order

25/08 14:16
Replacement search started

25/08 14:17
Seller B selected

25/08 14:18
Line reassigned
64. HISTORIQUE DE COMMANDE

Le dossier de commande doit permettre de répondre à :

Qui a fait quoi, quand et pourquoi ?

C'est indispensable pour :

service client ;
litiges ;
finance ;
audit ;
contrôle vendeur.
65. NOTIFICATIONS

Ahizan doit utiliser plusieurs canaux.

Client
commande reçue ;
paiement confirmé ;
commande préparée ;
expédition ;
livraison ;
problème ;
remboursement.
Vendeur
nouvelle commande ;
rappel ;
retard ;
refus ;
remplacement ;
paiement.
Opérateur
commande bloquée ;
litige ;
rupture ;
échec de paiement ;
échec de livraison.
66. NOTIFICATIONS : RÈGLE IMPORTANTE

Une notification ne doit pas être la source de vérité.

Exemple :

SMS "Commande livrée"

ne signifie pas que la commande est réellement livrée.

La vérité est :

DeliveryMission.status = DELIVERED

Le SMS n'est qu'une conséquence.

67. PERMISSIONS
Client

Voit :

ses commandes.

Vendeur

Voit :

ses SellerOrders.

Logisticien

Voit :

ses missions.

Finance

Voit :

settlements / payouts.

Admin

Voit :

tout.

68. CAS COMPLET : 10 PRODUITS / 5 VENDEURS

Voici le scénario clé d'Ahizan.

Le client commande :

10 produits
5 vendeurs

Structure :

ORDER 1000

Seller A → 3 produits
Seller B → 2 produits
Seller C → 1 produit
Seller D → 2 produits
Seller E → 2 produits
69. ÉTAPE 1 — PAIEMENT

Client paie.

PaymentSettled

Le stock est ensuite alloué selon la stratégie configurée.

70. ÉTAPE 2 — SPLIT

Ahizan divise :

ORDER
│
├── SellerOrder A
├── SellerOrder B
├── SellerOrder C
├── SellerOrder D
└── SellerOrder E

Vendure documente justement cette logique de séparation des OrderLines par vendeur dans son architecture marketplace.

71. ÉTAPE 3 — CONFIRMATION

Résultat :

A ✓
B ✓
C ✓
D ✗
E ✓

D refuse.

72. ÉTAPE 4 — REMPLACEMENT

Ahizan cherche un vendeur alternatif pour les deux produits de D.

SEARCH
 ↓
Candidate X
Candidate Y
Candidate Z

Le moteur classe les candidats.

73. ÉTAPE 5 — RÉAFFECTATION

Supposons :

Produit D1 → vendeur X
Produit D2 → vendeur X

Ahizan met à jour :

SellerOrder X

et conserve l'historique du changement.

74. ÉTAPE 6 — LOGISTIQUE

Finalement :

A → 3
B → 2
C → 1
X → 2
E → 2

Total :

10 produits.

75. ÉTAPE 7 — COLLECTE

Les vendeurs préparent.

Les livreurs collectent.

A ✓
B ✓
C ✓
X ✓
E ✓
76. ÉTAPE 8 — HUB

Les colis arrivent.

5 vendeurs
↓
HUB
↓
CONSOLIDATION
↓
1 expédition client
77. ÉTAPE 9 — LIVRAISON
Livreur
   ↓
Client
   ↓
OTP
   ↓
DELIVERED
78. ÉTAPE 10 — FINANCE

Ahizan calcule :

Ventes
   ↓
Commissions
   ↓
Frais
   ↓
Remboursements éventuels
   ↓
Settlements
   ↓
Payouts
79. CAS COMPLET : VENDEUR INDISPONIBLE

Commande :

Seller A

Le vendeur ne répond pas.

T+0

Commande envoyée.

T+30 min

Rappel.

T+60 min

Deuxième rappel.

T+X

Timeout.

SELLER_TIMEOUT

Puis :

REPLACEMENT_SEARCH
80. CAS COMPLET : PRODUIT INEXISTANT

Le vendeur apporte :

nouveau produit.

Ahizan :

Recherche
   ↓
Aucun produit
   ↓
Création Product
   ↓
Création Variant
   ↓
IA
   ↓
Contrôle
   ↓
Validation
   ↓
SellerOffer
81. CAS COMPLET : RUPTURE APRÈS PAIEMENT

Le client a payé.

Le vendeur annonce :

stock indisponible.

Ahizan :

LINE BLOCKED
       ↓
SEARCH ALTERNATIVE
Alternative trouvée
REASSIGN
Alternative plus chère
CLIENT APPROVAL
Aucune alternative
PARTIAL REFUND
82. CAS COMPLET : RETOUR
Customer
   ↓
Return Request
   ↓
Approved
   ↓
Pickup
   ↓
Hub
   ↓
Inspection
   ↓
Decision

Puis :

Refund

ou :

Replacement
83. ARCHITECTURE TECHNIQUE DES WORKFLOWS

Chaque workflow Ahizan doit idéalement comporter :

TRIGGER
   ↓
VALIDATION
   ↓
BUSINESS RULE
   ↓
ACTION
   ↓
EVENT
   ↓
NOTIFICATION
   ↓
AUDIT
84. EXEMPLE TECHNIQUE

Événement :

SellerOrderRejected

Le moteur :

1. Vérifie que le SellerOrder est bien actif.
2. Enregistre le refus.
3. Libère/réévalue le stock selon le cas.
4. Crée ReplacementRequest.
5. Recherche les candidats.
6. Notifie l'opérateur ou le client si nécessaire.
85. ÉVÉNEMENTS MÉTIER

Ahizan devrait définir un catalogue d'événements.

Exemples :

ProductSubmitted
ProductApproved
ProductRejected

SellerOfferCreated
SellerOfferActivated
SellerOfferSuspended

OrderPlaced
PaymentSettled

SellerOrderCreated
SellerOrderAccepted
SellerOrderRejected

ReplacementRequested
ReplacementFound
ReplacementAccepted
ReplacementFailed

PickupCreated
PickupCompleted

HubReceived
PackageConsolidated

DeliveryStarted
DeliveryCompleted
DeliveryFailed

ReturnRequested
ReturnApproved
ReturnReceived

RefundCreated
SettlementCreated
PayoutCompleted
86. JOBS ASYNCHRONES

Certaines tâches ne doivent pas bloquer le client.

Exemples :

génération fiche SEO ;
analyse IA ;
synchronisation stock ;
recherche vendeur ;
calcul statistiques ;
notifications ;
rapprochement financier.

Architecture :

EVENT
  ↓
QUEUE
  ↓
WORKER
  ↓
PROCESS
  ↓
RESULT
87. IDEMPOTENCE

C'est une règle essentielle.

Si un événement est reçu deux fois :

PaymentSettled
PaymentSettled

Ahizan ne doit pas créer :

2 paiements
2 settlements
2 allocations

Le traitement doit reconnaître :

cet événement a déjà été traité.

88. TRANSACTIONS

Les opérations critiques doivent être transactionnelles.

Exemple :

Réaffectation vendeur

doit éviter :

Seller A retiré
mais
Seller B jamais ajouté

Il faut garantir une cohérence globale.

89. STOCK : RÈGLE ABSOLUE

Ne jamais faire :

stock = stock - 1

sans passer par le mécanisme approprié.

Vendure possède un système de StockMovement, avec notamment Allocation, Sale, Release, Cancellation et StockAdjustment, afin de conserver l'historique des mouvements.

90. FULFILLMENT : RÈGLE ABSOLUE

Le Fulfillment Vendure doit représenter la réalité e-commerce de l'expédition.

Ahizan peut ajouter ses propres états logistiques :

COLLECTED
AT_HUB
CONSOLIDATED
OUT_FOR_DELIVERY

Vendure permet d'étendre le processus de fulfillment avec des états personnalisés, ce qui peut être utile pour intégrer certaines étapes opérationnelles Ahizan.

91. RÈGLE : VENDURE RESTE LE MOTEUR COMMERCE

Ahizan ne doit pas réimplémenter inutilement :

panier ;
calcul commande ;
paiement ;
stock ;
fulfillment ;
taxes ;
promotions.

Il doit orchestrer et étendre.

92. RÈGLE : AHIZAN EST LE MOTEUR MARKETPLACE

Ahizan doit apporter notamment :

VENDEURS
OFFRES
REMPLACEMENTS
CONTRÔLE QUALITÉ
LOGISTIQUE
HUBS
RÈGLEMENTS
PERFORMANCE
93. RÈGLE : UNE COMMANDE CLIENT = UNE EXPÉRIENCE

Même si techniquement :

1 Order
5 SellerOrders
10 OrderLines
5 Fulfillments

le client doit percevoir :

une seule commande Ahizan.

C'est essentiel pour l'expérience utilisateur.

94. RÈGLE : LE VENDEUR NE VOIT QUE SA PARTIE

Si une commande contient :

Seller A
Seller B
Seller C

Seller A ne doit pas voir :

les prix négociés de B ;
les données commerciales de C ;
les commandes de B ;
les règlements de C.
95. RÈGLE : TOUTE DÉCISION AUTOMATIQUE DOIT ÊTRE EXPLICABLE

Si Ahizan choisit le vendeur B plutôt que C :

il doit pouvoir expliquer :

Vendeur B sélectionné car :

Stock = 20
Prix = 8 200
Distance = 3 km
Score = 92

Cela sera important pour l'administration.

96. RÈGLE : TOUTE MODIFICATION CRITIQUE EST AUDITABLE

Exemple :

Qui a changé le vendeur d'une ligne ?

Le système doit pouvoir répondre :

Utilisateur : Agent 004
Date : 25/08/2026
Ancien vendeur : A
Nouveau vendeur : B
Motif : rupture
97. RÈGLE : LES DÉLAIS DOIVENT ÊTRE CONFIGURABLES

Ne pas coder en dur :

60 minutes

dans le programme.

Utiliser une configuration :

sellerConfirmationTimeout = 60 min

Cela permettra de modifier les règles sans reconstruire toute l'application.

98. RÈGLE : LES POLITIQUES DOIVENT ÊTRE CONFIGURABLES

Exemple :

maxReplacementPriceIncrease = 5%

ou :

autoReplacementEnabled = true

ou :

partialShipmentEnabled = false

Cela donnera à Ahizan une grande souplesse.

99. RÈGLE : LE CLIENT DOIT ÊTRE INFORMÉ DES EXCEPTIONS IMPORTANTES

Exemple :

« Un article de votre commande n'est plus disponible chez le vendeur initial. Nous recherchons actuellement un vendeur alternatif. »

Puis :

« Nous avons trouvé un vendeur alternatif au même prix. Votre commande continue normalement. »

C'est beaucoup mieux que de laisser le client sans information.

100. ARCHITECTURE FINALE DES WORKFLOWS
                         AHIZAN
                            │
          ┌─────────────────┼─────────────────┐
          │                 │                 │
       CATALOGUE         MARKETPLACE       COMMERCE
          │                 │                 │
          ▼                 ▼                 ▼
      PRODUCT           SELLER OFFER        ORDER
          │                 │                 │
          │                 ▼                 ▼
          │            SELLER ORDER        PAYMENT
          │                 │                 │
          └─────────────────┼─────────────────┘
                            │
                       ORCHESTRATION
                            │
              ┌─────────────┼─────────────┐
              │             │             │
          REPLACEMENT    LOGISTICS      FINANCE
              │             │             │
              ▼             ▼             ▼
           SELLER         HUB          SETTLEMENT
           SEARCH        DELIVERY          │
                                           ▼
                                         PAYOUT
101. ARCHITECTURE TECHNIQUE CIBLE

Le principe final peut être résumé ainsi :

                    VENDURE CORE
                         │
      ┌──────────────────┼──────────────────┐
      │                  │                  │
   CATALOGUE          COMMERCE            STOCK
      │                  │                  │
      └──────────────────┼──────────────────┘
                         │
                  AHIZAN MARKETPLACE
                         │
       ┌─────────────────┼─────────────────┐
       │                 │                 │
    SELLERS            OFFERS           ORDERS
       │                 │                 │
       └─────────────────┼─────────────────┘
                         │
                    ORCHESTRATOR
                         │
        ┌────────────────┼────────────────┐
        │                │                │
    REPLACEMENT       LOGISTICS        FINANCE
        │                │                │
        ▼                ▼                ▼
     SEARCH             HUBS          SETTLEMENT
        │                │                │
        └────────────────┼────────────────┘
                         │
                         ▼
                         IA
102. LES 15 RÈGLES D'OR D'AHIZAN
Règle 1

Un produit identique ne doit pas être recréé pour chaque vendeur.

Règle 2

Chaque vendeur possède ses propres offres.

Règle 3

La commande client reste une commande globale.

Règle 4

Les SellerOrders permettent de gérer chaque vendeur séparément.

Règle 5

Le stock doit avoir une source de vérité unique.

Règle 6

Le paiement client n'est pas le paiement vendeur.

Règle 7

Un refus vendeur doit déclencher un workflow d'exception.

Règle 8

Une recherche de remplacement doit être automatisable.

Règle 9

Une commande bloquée doit être explicitement identifiée.

Règle 10

La logistique ne doit jamais avancer sur une donnée incohérente.

Règle 11

Chaque événement critique doit être journalisé.

Règle 12

Chaque traitement critique doit être idempotent.

Règle 13

Les délais doivent être configurables.

Règle 14

Les décisions automatiques doivent être explicables.

Règle 15

Vendure gère le moteur e-commerce ; Ahizan orchestre le métier marketplace.

103. SYNTHÈSE OPÉRATIONNELLE

Le fonctionnement idéal d'Ahizan devient :

1. PRODUIT IDENTIFIÉ
        ↓
2. FICHE VALIDÉE
        ↓
3. OFFRE VENDEUR PUBLIÉE
        ↓
4. CLIENT COMMANDE
        ↓
5. PAIEMENT
        ↓
6. STOCK ALLOUÉ
        ↓
7. ORDER SPLIT PAR VENDEUR
        ↓
8. VENDEURS CONFIRMENT
        ↓
9. PROBLÈME ?
       / \
     NON  OUI
     │     │
     │     ↓
     │  REMPLACEMENT
     │     │
     └─────┘
        ↓
10. PRÉPARATION
        ↓
11. COLLECTE
        ↓
12. HUB
        ↓
13. CONSOLIDATION
        ↓
14. LIVRAISON
        ↓
15. CONFIRMATION CLIENT
        ↓
16. SETTLEMENT
        ↓
17. PAYOUT VENDEUR
104. CONCLUSION DU TOME 9

Le Tome 9 établit une distinction fondamentale :

Vendure sait gérer une commande ; Ahizan doit savoir gérer la complexité d'une marketplace.

Vendure fournit déjà une machine à états pour le cycle de vie des commandes, ainsi que les mécanismes de stock, paiement et fulfillment.

Ahizan doit donc construire au-dessus de ces fondations :

                 VENDURE
                    │
       ┌────────────┼────────────┐
       │            │            │
    COMMANDE       STOCK       FULFILLMENT
       │            │            │
       └────────────┼────────────┘
                    │
                 AHIZAN
                    │
       ┌────────────┼────────────┐
       │            │            │
    VENDEURS     REMPLACEMENT  LOGISTIQUE
       │            │            │
       └────────────┼────────────┘
                    │
                  FINANCE
                    │
                  PAYOUT

Et surtout, le scénario qui caractérise réellement Ahizan est celui-ci :

Un client peut acheter plusieurs produits provenant de plusieurs vendeurs ; Ahizan doit transformer cette commande unique en opérations indépendantes, tout en donnant au client l'impression qu'il n'a passé qu'une seule commande.