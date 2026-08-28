TOME 6 — COMMANDES, PAIEMENT, LIVRAISON ET LOGISTIQUE MULTI-VENDEURS

Version 1.0 — Document de référence
Projet : Ahizan Marketplace
Base technique : Vendure

Principe directeur : une commande peut être unique pour le client, tout en étant divisée opérationnellement entre plusieurs vendeurs, plusieurs lieux de préparation et plusieurs étapes logistiques.

Vendure fournit déjà les briques fondamentales pour ce fonctionnement : Order, OrderLine, paiements, Fulfillment, méthodes d'expédition, gestion du stock et machine d'état des commandes. Vendure prévoit également explicitement le cas des marketplaces multi-vendeurs.

SOMMAIRE
Objet du Tome 6
Vision générale du processus Ahizan
La commande Ahizan
Le panier et la commande
Les lignes de commande
La commande multi-vendeurs
La commande agrégée
Les sous-commandes vendeurs
Le paiement client
La réservation du stock
La confirmation vendeur
Le refus d'une commande
Le vendeur de remplacement
La recherche automatique d'un remplaçant
La différence de prix
La rupture de stock
Le calcul de livraison
Livraison par vendeur ou livraison consolidée
Le hub Ahizan
La préparation des produits
La collecte chez les vendeurs
La consolidation
La livraison finale
Les Fulfillments Vendure
Les états logistiques Ahizan
Le suivi de livraison
Le paiement des vendeurs
Les commissions
Les remboursements
Les annulations
Les retours
Les litiges
Exemple complet : 10 produits / 5 vendeurs
Gestion d'un échec vendeur
Gestion d'un échec logistique
Architecture technique
Channels et marketplace
StockLocations
ShippingMethods
FulfillmentHandlers
Machine d'état Ahizan
Notifications
Traçabilité
Sécurité
Tableau des responsabilités
Règles d'or Ahizan
Architecture cible
Conclusion
1. OBJET DU TOME 6

Les Tomes précédents ont établi :

le catalogue ;
les produits ;
les variantes ;
les SKU ;
les fiches produits ;
les vendeurs ;
les offres vendeurs.

Le Tome 6 répond maintenant à la question essentielle :

Que se passe-t-il après que le client a cliqué sur « Commander » ?

Ahizan doit gérer simultanément :

le paiement ;
la réservation des stocks ;
plusieurs vendeurs ;
plusieurs lieux ;
la préparation ;
la collecte ;
la consolidation ;
la livraison ;
les retours ;
les remboursements ;
le règlement des vendeurs.
2. VISION GÉNÉRALE DU PROCESSUS AHIZAN

Le processus cible est :

CLIENT

↓

PANIER

↓

COMMANDE AHIZAN

↓

PAIEMENT

↓

RÉSERVATION STOCK

↓

DÉCOUPAGE PAR VENDEUR

↓

CONFIRMATION VENDEURS

↓

COLLECTE

↓

HUB / CONSOLIDATION

↓

LIVRAISON

↓

CONFIRMATION CLIENT

↓

RÈGLEMENT VENDEURS

3. LA COMMANDE AHIZAN

Dans Vendure, une Order représente le cycle de vie complet de la commande. Elle contient notamment les lignes de commande, le client, les adresses, les paiements, les méthodes d'expédition et les fulfillments.

Pour Ahizan, cette commande devient :

la commande globale du client.

Exemple :

Commande AHZ-2026-000125

Client :

Franck

Total :

187 500 FCFA

Elle peut contenir des produits provenant de plusieurs vendeurs.

4. LE PANIER ET LA COMMANDE

Dans Vendure, il n'existe pas une entité séparée « panier » et « commande ».

Le panier est simplement une Order encore active et non finalisée.

Pour Ahizan, l'interface peut toutefois présenter au client :

Mon panier

puis :

Ma commande

alors que techniquement Vendure utilise le même modèle d'Order pendant les différentes étapes.

5. LES LIGNES DE COMMANDE

Une OrderLine représente notamment une variante de produit et la quantité commandée. Elle contient également les informations nécessaires au calcul de la commande, comme le prix et les taxes.

Exemple :

Ligne	Produit	Variante	Quantité
1	Téléphone	Noir / 256 Go	1
2	Chaussures	Noir / 42	2
3	Coca-Cola	50 cl	10

Chaque ligne doit ensuite être reliée à l'offre vendeur sélectionnée.

6. LA COMMANDE MULTI-VENDEURS

C'est le cœur du modèle Ahizan.

Un client peut commander :

3 produits chez vendeur A ;
2 produits chez vendeur B ;
4 produits chez vendeur C ;
1 produit chez vendeur D.

Pour le client :

une seule commande.

Pour Ahizan :

plusieurs unités opérationnelles.

7. LA COMMANDE AGRÉGÉE

Ahizan doit conserver une commande globale.

Exemple :

Commande AHZ-125

Total :

250 000 FCFA

Cette commande contient :

Seller Order A ;
Seller Order B ;
Seller Order C.

Dans les versions actuelles de Vendure, l'entité Order possède elle-même des relations sellerOrders et aggregateOrder, ce qui fournit une base particulièrement intéressante pour une architecture marketplace multi-vendeurs.

8. LES SOUS-COMMANDES VENDEURS

La commande peut être représentée ainsi :

COMMANDE AHIZAN
│
├── VENDEUR A
│   ├── Produit 1
│   └── Produit 4
│
├── VENDEUR B
│   ├── Produit 2
│   └── Produit 3
│
└── VENDEUR C
    └── Produit 5

Chaque vendeur ne doit voir que sa partie opérationnelle.

9. LE PAIEMENT CLIENT

Le client doit avoir une expérience simple :

Je commande → je paie une fois.

Même si cinq vendeurs sont impliqués.

Ahizan devient alors l'orchestrateur.

Le paiement client doit être enregistré sur la commande globale, tandis que la répartition comptable entre vendeurs est gérée ensuite par le système marketplace.

Vendure prévoit les états PaymentAuthorized et PaymentSettled dans son cycle de commande.

10. LA RÉSERVATION DU STOCK

C'est un point critique.

Supposons :

Vendeur A :

3 unités disponibles

Client :

commande 3 unités.

Le stock doit être réservé afin qu'un autre client ne puisse pas acheter simultanément les mêmes unités.

Vendure distingue notamment le stock disponible du stock alloué : lors du checkout, les quantités sont allouées, puis deviennent effectivement vendues lors de la création du fulfillment.

11. CONFIRMATION VENDEUR

Après la commande :

Vendeur A

Vous devez préparer 3 unités.

Il peut :

Accepter

Je peux préparer.

ou :

Refuser

Je ne peux pas fournir.

Le délai de réponse doit être défini par Ahizan.

Exemple :

15 minutes pour les produits urgents.

ou :

2 heures pour les produits standards.

12. REFUS D'UNE COMMANDE

Supposons :

Commande :

10 produits

Vendeur A :

refuse.

Ahizan ne doit pas immédiatement annuler toute la commande.

Il doit isoler :

la ligne ou le sous-ensemble concerné.

Puis rechercher une solution.

13. VENDEUR DE REMPLACEMENT

Ahizan recherche :

Même ProductVariant

↓

Autres offres

↓

Stock disponible

↓

Vendeur éligible

↓

Distance

↓

Prix

↓

Fiabilité

↓

Délai

Le système sélectionne ensuite le meilleur candidat.

14. RECHERCHE AUTOMATIQUE D'UN REMPLAÇANT

Exemple :

Produit :

10 cartons

Vendeur A :

indisponible.

Ahizan trouve :

Vendeur B

Stock :

15 cartons

Distance :

3 km

Prix :

100 000 FCFA

Vendeur C

Stock :

50 cartons

Distance :

12 km

Prix :

103 000 FCFA

Ahizan peut choisir B.

15. DIFFÉRENCE DE PRIX

Supposons :

Prix initial :

100 000 FCFA

Prix vendeur remplaçant :

103 000 FCFA

Différence :

3 000 FCFA.

Ahizan doit appliquer une politique prédéfinie.

Politique recommandée

Pour les petites différences :

Ahizan absorbe la différence dans une limite définie.

Pour les différences importantes :

validation nécessaire.

Cela permet de préserver l'expérience client.

16. RUPTURE DE STOCK

Une rupture peut être détectée :

avant paiement ;
au moment de la commande ;
après paiement ;
pendant la préparation.

Ahizan doit traiter différemment ces scénarios.

Avant paiement

Le client peut choisir une autre offre.

Après paiement

Ahizan doit rechercher un remplacement.

Aucun remplacement

Remboursement de la partie concernée selon les règles commerciales.

17. CALCUL DE LIVRAISON

Vendure fournit des ShippingMethods composées notamment d'un checker d'éligibilité et d'un calculator pour déterminer si une méthode peut s'appliquer et calculer son coût. Ces méthodes peuvent être limitées à certaines zones.

Ahizan doit construire une logique plus riche autour de cela.

18. LIVRAISON PAR VENDEUR OU CONSOLIDÉE

Deux modèles sont possibles.

Modèle A — Livraison directe

Chaque vendeur expédie directement au client.

Avantage

Simple.

Inconvénient

Coût potentiellement élevé.

Modèle B — Consolidation Ahizan

Les vendeurs alimentent un point de consolidation.

Puis Ahizan livre le client.

Avantage

Une expérience client plus homogène.

Inconvénient

Logistique plus complexe.

19. LE HUB AHIZAN

Le hub constitue un point central où plusieurs commandes peuvent être regroupées.

Exemple :

Vendeur A ─┐
           │
Vendeur B ─┼──> HUB AHIZAN ───> CLIENT
           │
Vendeur C ─┘

Le hub peut être :

un entrepôt ;
un relais ;
un magasin ;
un centre de consolidation.
20. PRÉPARATION DES PRODUITS

Chaque vendeur reçoit une liste claire.

Exemple

Vendeur A

Commande AHZ-125

2 × Samsung A16
1 × casque

Statut :

À préparer.

Une fois préparé :

READY_FOR_PICKUP

21. COLLECTE CHEZ LES VENDEURS

Ahizan peut créer une mission logistique :

Collecte #458

Vendeur A ;
2 colis ;
adresse ;
créneau ;
code de collecte.

Le livreur confirme :

Produit récupéré.

22. CONSOLIDATION

Au hub :

Colis A

Produits vendeur A.

Colis B

Produits vendeur B.

Colis C

Produits vendeur C.

Ahizan peut :

conserver les colis séparés

ou

les regrouper dans un colis client unique.

La décision dépend :

du type de produit ;
du poids ;
de la fragilité ;
de la réglementation ;
de la logistique.
23. LIVRAISON FINALE

Une fois le colis prêt :

Commande

READY_FOR_DELIVERY

↓

Livreur assigné

↓

En route

↓

Arrivé

↓

Livré

↓

Preuve de livraison

24. LES FULFILLMENTS VENDURE

Vendure utilise le concept de Fulfillment pour représenter la livraison effective d'une partie ou de la totalité d'une commande. Une commande peut avoir plusieurs fulfillments.

Un fulfillment peut notamment contenir :

lignes concernées ;
quantité ;
méthode ;
numéro de suivi ;
état.

Vendure prévoit notamment les états :

Pending ;
Shipped ;
Delivered ;
Cancelled.

25. ÉTATS LOGISTIQUES AHIZAN

Ahizan doit probablement ajouter une couche opérationnelle plus détaillée.

ORDER

Created

↓

PaymentSettled

↓

AwaitingSellerConfirmation

↓

PartiallyConfirmed

↓

Confirmed

↓

Preparing

↓

ReadyForPickup

↓

PartiallyCollected

↓

Collected

↓

AtHub

↓

ReadyForDelivery

↓

OutForDelivery

↓

Delivered

26. SUIVI DE LIVRAISON

Le client doit pouvoir voir :

Commande confirmée

✓ Paiement reçu

✓ Vendeurs confirmés

✓ Produits en préparation

✓ Produits collectés

✓ Colis regroupé

🚚 En livraison

✓ Livré

Le numéro de suivi peut être conservé dans le Fulfillment. Vendure prévoit notamment trackingCode et method sur cette entité.

27. PAIEMENT DES VENDEURS

Le vendeur ne doit pas nécessairement recevoir immédiatement son argent.

Architecture recommandée :

Client paie

↓

Ahizan sécurise le montant

↓

Commande préparée

↓

Commande livrée

↓

Délai de contestation

↓

Montant libérable

↓

Paiement vendeur

28. COMMISSION AHIZAN

Exemple :

Montant vendu :

100 000 FCFA

Commission Ahizan :

8 %

Commission :

8 000 FCFA

Montant vendeur :

92 000 FCFA

Le système doit conserver une trace de :

montant brut ;
commission ;
frais ;
remboursement ;
montant net ;
montant payé.
29. REMBOURSEMENTS

Vendure permet de rembourser tout ou partie d'une commande et de sélectionner notamment les articles concernés ainsi que les frais de livraison.

Pour Ahizan, il faut distinguer :

Remboursement total

Toute la commande.

Remboursement partiel

Une partie seulement.

Remboursement d'une ligne

Un produit précis.

Remboursement logistique

Les frais de livraison.

30. ANNULATIONS

Une ligne peut être annulée sans nécessairement annuler toute la commande.

Exemple :

Client commande :

Produit A ✓
Produit B ✓
Produit C ✗

Produit C indisponible.

Ahizan peut :

annuler uniquement C

et poursuivre la commande pour A + B.

Vendure prévoit que l'annulation d'articles puisse réintégrer les quantités concernées dans le stock.

31. RETOURS

Le retour doit suivre son propre workflow.

Client demande retour

↓

Ahizan vérifie l'éligibilité

↓

Retour accepté

↓

Collecte

↓

Réception vendeur / hub

↓

Contrôle

↓

Remboursement

↓

Réintégration stock si possible

32. LITIGES

Exemples :

produit différent ;
produit endommagé ;
quantité incorrecte ;
produit manquant ;
vendeur absent ;
livraison tardive.

Ahizan doit créer un dossier de litige contenant :

commande ;
vendeur ;
client ;
produit ;
preuves ;
photos ;
messages ;
décision ;
remboursement éventuel.
33. EXEMPLE COMPLET : 10 PRODUITS / 5 VENDEURS

Voici le scénario de référence Ahizan.

Client

Commande :

10 produits

Répartition

Vendeur A

3 produits

Vendeur B

2 produits

Vendeur C

1 produit

Vendeur D

2 produits

Vendeur E

2 produits

Total :

10 produits.

34. ÉTAPE 1 — COMMANDE

Ahizan crée :

Commande AHZ-10025

Le client paie :

250 000 FCFA

35. ÉTAPE 2 — RÉSERVATION

Les stocks sont réservés.

A

3 unités

B

2 unités

C

1 unité

D

2 unités

E

2 unités

36. ÉTAPE 3 — CONFIRMATION
A

✓ Accepté

B

✓ Accepté

C

✗ Refusé

D

✓ Accepté

E

✓ Accepté

Il manque donc :

1 produit.

37. ÉTAPE 4 — RECHERCHE AUTOMATIQUE

Ahizan cherche une autre offre pour le même produit.

Il trouve :

Vendeur F

Stock :

10

Prix :

+1 500 FCFA

Distance :

acceptable

Fiabilité :

excellente.

Ahizan sélectionne F.

38. ÉTAPE 5 — VALIDATION

Si la différence de prix est dans la limite autorisée :

Ahizan prend la différence en charge.

Le client ne voit aucune complication.

Pour lui :

sa commande est toujours confirmée.

39. ÉTAPE 6 — LOGISTIQUE

Ahizan doit maintenant collecter :

A ;
B ;
D ;
E ;
F.

Le système cherche à optimiser le trajet.

40. ÉTAPE 7 — CONSOLIDATION

Tous les produits arrivent au hub.

Ahizan vérifie :

quantité ;
références ;
état ;
correspondance avec commande.

Puis crée le colis final.

41. ÉTAPE 8 — LIVRAISON

Le livreur reçoit :

Colis AHZ-10025

Adresse :

Client

Statut :

OutForDelivery

Puis :

Delivered

42. ÉTAPE 9 — RÈGLEMENT

Après validation de la livraison :

Vendeur A

Montant net.

Vendeur B

Montant net.

Vendeur D

Montant net.

Vendeur E

Montant net.

Vendeur F

Montant net.

Le vendeur C ne reçoit rien pour la ligne refusée.

43. GESTION D'UN ÉCHEC VENDEUR

Il faut distinguer :

Refus avant préparation

Facilement remplaçable.

Refus après préparation

Le produit doit éventuellement être récupéré.

Refus après collecte

Le produit est déjà chez Ahizan.

Refus après expédition

Le problème devient logistique.

Chaque étape doit donc avoir son propre workflow.

44. GESTION D'UN ÉCHEC LOGISTIQUE

Exemple :

Le vendeur a bien préparé.

Le livreur ne passe pas.

Ahizan doit pouvoir réassigner :

Mission de collecte #458

à :

Livreur #732.

Il ne faut pas annuler la commande simplement parce qu'un livreur a échoué.

45. ARCHITECTURE TECHNIQUE

Le système cible peut être représenté ainsi :

                    CLIENT
                       │
                       ▼
                  AHIZAN STORE
                       │
                       ▼
                    VENDURE
                       │
                ┌──────┴──────┐
                │             │
             ORDER          PAYMENT
                │
       ┌────────┼────────┐
       │        │        │
    Seller A Seller B Seller C
       │        │        │
    Stock     Stock     Stock
       │        │        │
       └────────┼────────┘
                │
                ▼
            LOGISTICS
                │
             PICKUP
                │
                ▼
              HUB
                │
                ▼
           FULFILLMENT
                │
                ▼
             CLIENT
46. CHANNELS ET MARKETPLACE

Vendure permet d'utiliser les Channels pour des architectures multi-vendeurs et associe également un vendeur à chaque Channel. La documentation officielle présente explicitement les Channels comme une solution possible pour les marketplaces multi-vendeurs.

Mais pour Ahizan, il faudra faire un choix architectural précis.

Option A

Un Channel par vendeur.

Option B

Un Channel Ahizan principal + couche marketplace personnalisée.

Option C

Architecture hybride.

Recommandation :

Ne pas décider automatiquement :

« 1 vendeur = 1 Channel »

avant d'avoir étudié les conséquences sur :

prix ;
stock ;
catalogue ;
commandes ;
permissions ;
taxes ;
shipping ;
performance.

Vendure est suffisamment flexible pour supporter des architectures différentes.

47. STOCK LOCATIONS

Vendure utilise les StockLocations pour représenter les lieux physiques où le stock est conservé : entrepôt, magasin ou autre emplacement.

Pour Ahizan, cela peut représenter :

entrepôt Ahizan ;
boutique vendeur ;
dépôt vendeur ;
hub ;
centre de distribution.

La stratégie actuelle de Vendure tient également compte du Channel actif lorsqu'elle détermine le stock disponible et les allocations.

48. SHIPPING METHODS

Ahizan pourra créer plusieurs méthodes :

Livraison standard

Coût normal.

Livraison express

Coût supérieur.

Retrait en point relais

Coût réduit.

Retrait boutique

Éventuellement gratuit.

Livraison volumineuse

Tarification spécifique.

Vendure permet de déterminer l'éligibilité et le coût via les ShippingMethod, avec des calculateurs et règles personnalisables.

49. CALCULATEUR DE LIVRAISON AHIZAN

Le calculateur Ahizan peut prendre en compte :

distance ;
poids ;
volume ;
nombre de vendeurs ;
nombre de points de collecte ;
zone ;
type de produit ;
urgence ;
regroupement possible ;
heure de commande.

Exemple conceptuel :

Prix livraison =

distance + poids + complexité + urgence − optimisation.

50. FULFILLMENT HANDLER

Vendure permet de personnaliser le comportement d'un fulfillment avec un FulfillmentHandler.

Il peut par exemple :

créer un numéro de suivi ;
appeler une API de transport ;
déclencher une action ;
envoyer une notification.

La documentation indique également qu'un handler peut réagir aux transitions d'état du fulfillment.

Ahizan pourra donc connecter son propre moteur logistique.

51. MACHINE D'ÉTAT AHIZAN

Vendure utilise une machine d'état pour contrôler les transitions d'une commande et permet de personnaliser ce processus.

Ahizan devra probablement ajouter des états métier autour du processus vendeur/logistique.

Exemple :

AddingItems
      ↓
ArrangingPayment
      ↓
PaymentSettled
      ↓
AwaitingSellerConfirmation
      ↓
SellerConfirmed
      ↓
Preparing
      ↓
ReadyForPickup
      ↓
Collected
      ↓
AtHub
      ↓
ReadyForDelivery
      ↓
Shipped
      ↓
Delivered

Avec des branches :

SellerRejected
      ↓
FindingReplacement
      ↓
ReplacementConfirmed
52. NOTIFICATIONS

Chaque acteur doit recevoir uniquement les informations pertinentes.

Client
commande reçue ;
paiement confirmé ;
vendeur confirmé ;
commande préparée ;
collecte ;
livraison ;
livraison terminée.
Vendeur
nouvelle commande ;
délai de confirmation ;
commande acceptée ;
collecte ;
paiement à venir.
Livreur
mission ;
adresse ;
colis ;
itinéraire ;
preuve de collecte ;
preuve de livraison.
Administrateur
erreur ;
refus ;
rupture ;
litige ;
retard.
53. TRAÇABILITÉ

Ahizan doit conserver un journal des événements.

Exemple :

14:03

Commande créée.

14:04

Paiement confirmé.

14:05

Stock réservé.

14:06

Vendeur A confirmé.

14:08

Vendeur B refusé.

14:09

Recherche vendeur de remplacement.

14:10

Vendeur F sélectionné.

14:12

Commande F confirmée.

16:30

Collecte terminée.

17:05

Colis au hub.

18:20

Livraison démarrée.

19:02

Commande livrée.

Cette traçabilité sera extrêmement importante en cas de litige.

54. SÉCURITÉ

Le système doit empêcher :

double allocation de stock ;
double remboursement ;
double paiement vendeur ;
modification frauduleuse du prix ;
modification d'une commande sans autorisation ;
accès d'un vendeur aux commandes d'un autre vendeur.

Les permissions Vendure et les rôles limités aux Channels peuvent contribuer à cette séparation.

55. TABLEAU DES RESPONSABILITÉS
Action	Client	Vendeur	Ahizan	Livreur
Commander	✓			
Payer	✓			
Confirmer produit		✓	✓	
Préparer		✓		
Collecter			✓	✓
Consolider			✓	✓
Livrer			✓	✓
Confirmer réception	✓			
Rembourser			✓	
Régler vendeur			✓	
Gérer litige			✓	
56. RÈGLES D'OR AHIZAN
Règle 1

Le client ne doit pas subir la complexité interne de la marketplace.

Règle 2

Une commande client peut contenir plusieurs vendeurs.

Règle 3

Chaque vendeur doit gérer uniquement sa partie.

Règle 4

Le stock doit être réservé avant qu'il ne puisse être vendu à un autre client.

Règle 5

Un vendeur défaillant ne doit pas nécessairement entraîner l'annulation de toute la commande.

Règle 6

Ahizan doit rechercher automatiquement un vendeur de remplacement lorsque c'est possible.

Règle 7

Le prix payé par le client doit rester maîtrisé lors d'un remplacement.

Règle 8

Chaque étape logistique doit être traçable.

Règle 9

Le paiement vendeur doit être calculé à partir de données vérifiables.

Règle 10

La commande globale et les opérations des vendeurs doivent être séparées.

57. ARCHITECTURE CIBLE AHIZAN

La vision finale peut être représentée ainsi :

                         CLIENT
                            │
                            ▼
                     ┌─────────────┐
                     │   AHIZAN    │
                     │ Marketplace │
                     └──────┬──────┘
                            │
                         ORDER
                            │
                 ┌──────────┴──────────┐
                 │                     │
          COMMANDE GLOBALE         PAYMENT
                 │
       ┌─────────┼─────────┐
       │         │         │
   VENDEUR A  VENDEUR B  VENDEUR C
       │         │         │
     STOCK     STOCK     STOCK
       │         │         │
       └─────────┼─────────┘
                 │
           ORCHESTRATION
                 │
       ┌─────────┴─────────┐
       │                   │
    COLLECTE             HUB
       │                   │
       └─────────┬─────────┘
                 │
            CONSOLIDATION
                 │
             FULFILLMENT
                 │
              LIVRAISON
                 │
                 ▼
               CLIENT
                 │
                 ▼
          RÈGLEMENT VENDEURS
58. CONCLUSION GÉNÉRALE

Le Tome 6 établit une distinction essentielle :

Vendure gère le cycle e-commerce de la commande ; Ahizan doit orchestrer la complexité spécifique de la marketplace.

Vendure fournit déjà :

la commande ;
les lignes de commande ;
les paiements ;
les allocations de stock ;
les méthodes d'expédition ;
les fulfillments ;
les remboursements ;
les annulations ;
la machine d'état ;
les Channels ;
les StockLocations.

Ahizan doit construire autour de ces briques :

la commande multi-vendeurs ;
les Seller Orders ;
le moteur de remplacement vendeur ;
l'orchestration logistique ;
le calcul avancé des frais de livraison ;
la consolidation ;
les missions de collecte ;
les règles de commission ;
le règlement des vendeurs ;
la gestion des litiges ;
le suivi opérationnel.

Et surtout, Ahizan doit conserver une philosophie simple :

Pour le client : une commande, un paiement, une expérience.

Pour Ahizan : plusieurs vendeurs, plusieurs stocks, plusieurs opérations logistiques, mais un seul système centralisé de pilotage.

C'est cette capacité d'orchestration qui peut faire d'Ahizan une véritable marketplace, et pas simplement un site où plusieurs vendeurs mettent leurs produits en ligne.