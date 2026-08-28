Tome 3 — Prix, Stocks et Gestion des Inventaires

Version 1.0 — Référence interne Ahizan

Introduction

Le succès d'une marketplace ne dépend pas seulement de la qualité des produits affichés.

Il dépend surtout de la capacité à répondre correctement à quatre questions :

Quel est le prix exact du produit ?

Le produit est-il réellement disponible ?

Où est-il stocké ?

Quel vendeur doit préparer la commande ?

Vendure répond à ces problématiques grâce à son système de Product Variants, de Stock Control, de Stock Locations et de ProductVariantPrice. 
Vendure Docs
+2

Pour Ahizan, ces mécanismes doivent être adaptés au fonctionnement réel des vendeurs béninois.

Chapitre 1 — La philosophie d'Ahizan
Un produit

Exemple :

Huile Dinor 1 L

Plusieurs vendeurs

Boutique A

Boutique B

Boutique C

Chaque vendeur possède :

son propre prix ;

son propre stock ;

éventuellement son propre entrepôt.

Cette séparation est fondamentale.

Le catalogue est partagé.

Les offres appartiennent aux vendeurs.

Chapitre 2 — Où vivent le prix et le stock ?

Dans Vendure, le Product est uniquement une fiche descriptive.

Le ProductVariant représente l'article réellement vendu.

C'est la variante qui porte :

le SKU ;

le prix ;

le stock ;

la catégorie fiscale ;

les informations d'inventaire. 
Vendure Docs
+1

Exemple

Produit :

Samsung Galaxy A16

Variantes :

Variante

	

SKU

	

Prix

	

Stock




Noir 128 Go

	

SAM-A16-N128

	

120 000

	

12




Noir 256 Go

	

SAM-A16-N256

	

145 000

	

6




Bleu 128 Go

	

SAM-A16-B128

	

122 000

	

4

Le client ajoute toujours une variante au panier.

Chapitre 3 — Les prix
Prix de vente

Chaque variante possède un prix.

Exemple :

Variante

	

Prix




256 Go

	

145 000 FCFA




512 Go

	

175 000 FCFA

Pourquoi ?

Parce que deux variantes peuvent avoir des coûts différents.

Chapitre 4 — Prix par vendeur (adaptation Ahizan)

La documentation Vendure prévoit un système de prix lié aux Channels. Chaque variante peut avoir un prix différent selon le canal auquel elle appartient. 
Vendure Docs

Pour Ahizan, je recommande de ne pas utiliser directement les Channels comme unique représentation des vendeurs.

À la place :

Structure recommandée

Catalogue

↓

Produit

↓

Variante

↓

Offre vendeur

Chaque offre contiendrait :

Champ

	

Exemple




vendeur

	

Boutique ABC




prix

	

2 450 FCFA




stock

	

75




délai

	

2 h




entrepôt

	

Cotonou




statut

	

Disponible

Cette architecture permettra plus tard :

comparaison des vendeurs ;

remplacement automatique d'un vendeur indisponible ;

optimisation de la livraison.

Chapitre 5 — Les promotions

Vendure possède un moteur de promotions intégré. 
GitHub

Pour Ahizan, il est préférable de distinguer :

Promotion vendeur

Exemple :

Ancien prix : 5 000 FCFA

Nouveau prix : 4 200 FCFA

Visible uniquement sur l'offre du vendeur.

Promotion Ahizan

Exemple :

« Semaine de la rentrée »

Applicable à plusieurs vendeurs.

Chapitre 6 — Le stock

Vendure suit le stock au niveau de la variante. 
docs.vendure.io
+1

Chaque variante possède notamment :

Stock disponible

Stock réservé

Stock vendu

Chapitre 7 — Comprendre le cycle du stock

Lorsqu'un client commande :

Avant commande

Stock : 10

Après validation

Stock disponible : 9

En réalité, Vendure distingue deux notions :

Stock On Hand (stock physique)

Allocated Stock (stock réservé). 
docs.vendure.io

Chapitre 8 — Les mouvements de stock

Vendure enregistre l'historique des mouvements.

Mouvement

	

Description




Allocation

	

Réservation




Sale

	

Vente




Release

	

Libération




Cancellation

	

Annulation




Stock Adjustment

	

Correction

docs.vendure.io
Exemple Ahizan

Stock initial :

50

Client commande :

5

Le système crée :

Allocation

Le stock vendable diminue immédiatement.

Lorsque le vendeur confirme l'expédition :

Sale

Le stock physique diminue.

Chapitre 9 — Les entrepôts (Stock Locations)

L'une des fonctions les plus puissantes de Vendure est le système de Stock Locations. 
Vendure Docs
+1

Un Stock Location représente un lieu physique.

Exemples :

Entrepôt Cotonou

Boutique Ganhi

Dépôt Abomey-Calavi

Magasin Porto-Novo

Vision Ahizan
Chapitre 10 — Pourquoi plusieurs entrepôts sont indispensables

Imagine ce cas.

Le client habite Fidjrossè.

Le produit existe :

Entrepôt

	

Stock




Ganhi

	

20




Akpakpa

	

35




Calavi

	

50

Le système pourrait choisir :

le plus proche ;

le moins coûteux ;

le plus rapide.

Vendure prévoit justement une StockLocationStrategy permettant de personnaliser cette logique. 
vendure
+1

Chapitre 11 — La stratégie Ahizan de sélection du stock

Je recommande l'algorithme suivant.

Priorité 1

Même vendeur.

Priorité 2

Entrepôt le plus proche.

Priorité 3

Coût de livraison.

Priorité 4

Stock disponible.

Exemple :

Entrepôt

	

Distance

	

Stock




Ganhi

	

3 km

	

10




Akpakpa

	

8 km

	

50

Le système choisira Ganhi.

Chapitre 12 — Les seuils d'alerte

Chaque variante doit posséder un seuil minimum.

Exemple :

Produit

	

Stock

	

Seuil




Coca-Cola 33 cl

	

120

	

50




Huile Dinor

	

18

	

20




Samsung A16

	

3

	

5

Lorsque le seuil est atteint :

notification vendeur ;

notification Ahizan ;

priorité de réapprovisionnement.

Chapitre 13 — Les backorders

Vendure permet d'autoriser les ventes même lorsque le stock est nul grâce au mécanisme de Back Orders. 
docs.vendure.io

Pour Ahizan :

Autoriser uniquement pour

grossistes ;

produits réapprovisionnés régulièrement.

Interdire pour

téléphones d'occasion ;

produits uniques ;

articles artisanaux uniques.

Chapitre 14 — Les corrections de stock

Les erreurs existent.

Exemple :

Le vendeur annonce :

20

Après comptage :

17

Le système doit enregistrer :

Stock Adjustment.

L'historique reste conservé.

docs.vendure.io
Chapitre 15 — Le workflow complet d'une commande

Étapes :

Client ajoute une variante.

Commande créée.

Stock réservé.

Vendeur prépare.

Livreur récupère.

Livraison.

Stock définitivement déduit.

Cette logique correspond au fonctionnement standard du contrôle de stock de Vendure. 
docs.vendure.io

Chapitre 16 — Cas réel Ahizan : plusieurs vendeurs

Le client commande :

Produit

	

Vendeur




Coca-Cola

	

A




Huile Dinor

	

B




Riz

	

A




Téléphone

	

C

Le système crée :

Commande unique client

↓

Sous-commandes

Vendeur A

Vendeur B

Vendeur C

Chaque vendeur réserve uniquement son propre stock.

C'est une personnalisation que je recommande au-dessus du moteur Vendure.

Chapitre 17 — Les tableaux de bord indispensables
Tableau vendeur

Stock faible

Produits épuisés

Ventes du jour

Réservations

Alertes

Tableau Ahizan

Produits les plus vendus

Produits en rupture

Valeur du stock

Commandes en attente

Taux de disponibilité des vendeurs

Chapitre 18 — Les champs personnalisés Ahizan

Vendure permet d'ajouter des Custom Fields aux variantes. 
docs.vendure.io

Je recommande d'ajouter :

Champ

	

Utilité




Prix d'achat

	

marge




Fournisseur

	

réapprovisionnement




Date d'entrée

	

rotation




Date limite

	

alimentaire




Poids

	

livraison




Volume

	

calcul colis




Seuil d'alerte

	

notifications




Référence fournisseur

	

achats

Ces champs seront extrêmement utiles pour la logistique.

Chapitre 19 — Règles officielles Ahizan

Chaque variante doit respecter :

un SKU unique ;

un prix obligatoire ;

un stock obligatoire ;

un entrepôt associé ;

un seuil d'alerte ;

un historique des mouvements.

Aucune variante ne doit être vendue sans ces informations.

Chapitre 20 — Décisions stratégiques pour Ahizan

À la fin de ce Tome 3, je recommande de retenir les décisions suivantes :

Le prix appartient toujours à la variante, jamais au produit.

Le stock est suivi au niveau de chaque variante avec réservation automatique lors de la commande. 
Vendure Docs
+1

Les entrepôts seront modélisés comme des Stock Locations afin de préparer une logistique nationale (Cotonou, Calavi, Porto-Novo, Parakou...). 
Vendure Docs
+1

Chaque vendeur conservera son propre stock, même lorsque plusieurs vendeurs proposent le même produit.

Un moteur d'attribution Ahizan choisira automatiquement le meilleur vendeur selon le stock, la distance et le coût de livraison.

Les seuils d'alerte et l'historique des mouvements seront obligatoires pour garantir un inventaire fiable.

Les Custom Fields permettront d'ajouter les informations spécifiques au marché béninois sans modifier le cœur de Vendure. 
docs.vendure.io