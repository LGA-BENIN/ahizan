# MANUEL VENDURE POUR AHIZAN

## TOME 2 — OPTIONS ET VARIANTES

### Architecture, création, contrôle et normalisation du catalogue

**Version 1.0 — Document de référence**

---

# TABLE DES MATIÈRES

1. Objectif du Tome 2
2. Architecture Produit → Options → Variantes
3. Le Product
4. Le ProductOptionGroup
5. Le ProductOption
6. Le ProductVariant
7. Comment les options créent les variantes
8. Calcul du nombre de variantes
9. Combinaisons autorisées et interdites
10. Produits à variante unique
11. Les SKU
12. Standard SKU Ahizan
13. Groupes d'options partagés
14. Options générales et options spécialisées
15. Cas des vêtements
16. Cas des chaussures
17. Cas des smartphones
18. Cas des boissons
19. Cas des produits alimentaires
20. Cas de l'électroménager
21. Variante et conditionnement
22. Variante et code-barres
23. Variante et images
24. Variante inactive
25. Modification d'une variante
26. Suppression et conservation historique
27. Création manuelle
28. Génération automatique
29. Import massif
30. Contrôle qualité Ahizan
31. IA et création des variantes
32. Validation humaine
33. Architecture marketplace
34. Exemple complet Ahizan
35. Règles définitives
36. Synthèse

---

# 1. OBJECTIF DU TOME 2

Le Tome 1 a établi la structure générale du catalogue :

**Catégorie → Produit → Variante**

Le présent Tome 2 explique comment Ahizan doit gérer les produits qui existent sous plusieurs formes.

Exemples :

* vêtement avec plusieurs tailles ;
* chaussure avec plusieurs pointures ;
* téléphone avec plusieurs couleurs et capacités ;
* boisson avec plusieurs formats ;
* produit vendu à l'unité ou par carton.

Dans Vendure, un produit possède au moins une `ProductVariant`. Lorsqu'un client achète un produit, c'est la **ProductVariant** qui est ajoutée au panier, et non le Product abstrait. La variante porte notamment le SKU et les informations de prix.

Pour Ahizan, cette distinction est fondamentale.

---

# 2. ARCHITECTURE PRODUIT → OPTIONS → VARIANTES

L'architecture de référence est :

**PRODUIT**

↓

**GROUPE D'OPTIONS**

↓

**OPTIONS**

↓

**VARIANTES**

↓

**SKU**

↓

**OFFRE DU VENDEUR**

Exemple :

**Produit**

Samsung Galaxy S25 Ultra

↓

**Groupe d'options**

Couleur

↓

**Options**

Noir / Argent

↓

**Groupe d'options**

Stockage

↓

**Options**

256 Go / 512 Go

↓

**Variantes**

Noir + 256 Go

Noir + 512 Go

Argent + 256 Go

Argent + 512 Go

---

# 3. LE PRODUCT

Dans Vendure, le `Product` représente le produit général.

Il contient notamment :

* nom ;
* slug ;
* description ;
* images ;
* catégories ;
* groupes d'options ;
* facettes ;
* variantes.

Le Product n'est donc pas l'unité commerciale finale.

### Exemple

**Samsung Galaxy S25 Ultra**

C'est le Product.

Mais :

**Samsung Galaxy S25 Ultra — Noir — 512 Go**

est une variante précise.

---

# 4. LE PRODUCTOPTIONGROUP

Le `ProductOptionGroup` représente une caractéristique permettant de différencier les variantes.

Exemples :

* Couleur ;
* Taille ;
* Stockage ;
* Format ;
* Conditionnement.

Dans Vendure, un groupe possède notamment :

* un nom ;
* un code ;
* des options ;
* des produits associés ;
* éventuellement des traductions ;
* des Custom Fields.

### Exemple

Nom :

> Couleur

Code :

> color

---

# 5. LE PRODUCTOPTION

Le `ProductOption` représente une valeur appartenant à un groupe.

Exemple :

### Groupe

Couleur

### Options

* Noir
* Blanc
* Bleu

Une option possède notamment :

* un nom ;
* un code ;
* un groupe parent ;
* éventuellement des traductions ;
* éventuellement des Custom Fields.

### Exemple

Nom :

> Noir

Code :

> black

---

# 6. LE PRODUCTVARIANT

La `ProductVariant` représente une référence réellement vendable.

Elle possède notamment :

* SKU ;
* nom ;
* prix ;
* devise ;
* stock ;
* options ;
* statut actif/inactif ;
* fiscalité ;
* images ;
* Custom Fields.

### Exemple

**Produit**

Samsung Galaxy S25 Ultra

**Variante**

Noir / 512 Go

**SKU**

SAM-S25U-BK-512

Cette variante peut alors être :

* affichée ;
* ajoutée au panier ;
* vendue ;
* suivie en stock.

---

# 7. COMMENT LES OPTIONS CRÉENT LES VARIANTES

Prenons :

### Couleur

* Noir
* Blanc

### Taille

* M
* L
* XL

Les combinaisons possibles sont :

| Couleur | Taille |
| ------- | ------ |
| Noir    | M      |
| Noir    | L      |
| Noir    | XL     |
| Blanc   | M      |
| Blanc   | L      |
| Blanc   | XL     |

Soit :

**2 × 3 = 6 variantes potentielles.**

Vendure utilise précisément les groupes d'options pour permettre cette différenciation des variantes.

---

# 8. CALCUL DU NOMBRE DE VARIANTES

La formule est :

**Nombre potentiel de variantes =**

**nombre d'options du groupe 1**

×

**nombre d'options du groupe 2**

×

**nombre d'options du groupe 3**

etc.

### Exemple

Couleur :

3 valeurs

Taille :

4 valeurs

Matière :

2 valeurs

Résultat :

**3 × 4 × 2 = 24 variantes potentielles.**

Mais attention :

> 24 variantes potentielles ne signifie pas nécessairement 24 variantes commercialisées.

---

# 9. COMBINAISONS AUTORISÉES ET INTERDITES

C'est un point essentiel pour Ahizan.

Supposons :

**Chaussure**

Couleurs :

* Noir
* Rouge

Tailles :

* 40
* 41
* 42
* 43

Le calcul donne :

**2 × 4 = 8 combinaisons.**

Mais le vendeur peut réellement posséder seulement :

* Noir 40
* Noir 41
* Noir 42
* Rouge 40
* Rouge 41

Les autres ne doivent pas être présentées comme disponibles.

### Règle Ahizan

Le système doit permettre de :

1. générer les combinaisons potentielles ;
2. sélectionner les combinaisons commercialisées ;
3. créer uniquement les variantes validées.

---

# 10. PRODUITS À VARIANTE UNIQUE

Tous les produits n'ont pas plusieurs options.

Exemple :

> Sac de riz 25 kg

Il peut avoir une seule variante :

**RIZ-25KG**

Prix :

> 15 000 FCFA

Stock :

> 50

Dans les versions récentes de Vendure, un produit à variante unique peut être créé directement sans devoir créer d'abord un groupe d'options. Cette amélioration a été introduite avec Vendure 3.6.1.

### Règle Ahizan

Ne jamais obliger artificiellement un vendeur à créer une option lorsque le produit n'a pas réellement de variante.

---

# 11. LES SKU

Le SKU signifie :

> Stock Keeping Unit

Il s'agit de la référence permettant d'identifier une variante.

Dans Vendure, le SKU appartient à la ProductVariant.

### Exemple

Samsung S25 Ultra :

> SAM-S25U-BK-256

Le SKU doit être unique dans le périmètre défini par l'architecture Ahizan.

---

# 12. STANDARD SKU AHIZAN

Ahizan doit mettre en place une norme interne.

### Structure recommandée

**MARQUE – MODÈLE – OPTION 1 – OPTION 2**

Exemple :

> SAM-S25U-BK-256

### Autres exemples

Chaussure :

> NIK-AIR-BK-42

Polo :

> LAC-POL-BL-M

Coca-Cola :

> COC-50CL-C24

Riz :

> RIZ-DIN-25KG

---

# 13. SKU AHIZAN ET RÉFÉRENCE VENDEUR

Il ne faut surtout pas confondre :

### SKU Ahizan

Référence interne du catalogue.

### Référence vendeur

Référence utilisée par le commerçant.

### EAN/GTIN

Identifiant standard lorsqu'il existe.

Exemple :

**SKU Ahizan**

> AHZ-SAM-S25U-BK-256

**Référence vendeur**

> TEL-00582

**GTIN**

> Code-barres officiel du produit

Ces trois informations doivent pouvoir coexister.

---

# 14. GROUPES D'OPTIONS PARTAGÉS

C'est une évolution importante de Vendure.

Depuis la version 3.6, les `ProductOptionGroup` peuvent être des ressources partagées.

Ainsi, un même groupe :

> Taille

peut être utilisé par plusieurs produits.

C'est particulièrement intéressant pour Ahizan.

### Exemple

Produit A :

> Polo homme

Produit B :

> T-shirt homme

Produit C :

> Chemise homme

Les trois peuvent utiliser un groupe commun :

> clothing-size

---

# 15. POURQUOI LE PARTAGE EST IMPORTANT POUR AHIZAN

Sans normalisation, Ahizan pourrait finir avec :

* Taille 1
* Taille 2
* Taille vêtement
* Taille vêtements
* Tailles
* Size
* Pointure

Cela créerait un catalogue désordonné.

Avec des groupes normalisés :

**clothing-size**

**shoe-size**

**storage-capacity**

**color**

**beverage-format**

le catalogue reste beaucoup plus propre.

---

# 16. GROUPES GÉNÉRAUX ET GROUPES SPÉCIALISÉS

Ahizan doit éviter de tout mettre dans un seul groupe universel.

### Groupe

**Couleur**

Peut être partagé largement.

### Groupe

**Taille vêtement**

Spécialisé.

### Groupe

**Pointure**

Spécialisé.

### Groupe

**Capacité de stockage**

Spécialisé.

### Groupe

**Format boisson**

Spécialisé.

---

# 17. CAS DES VÊTEMENTS

## Produit

Polo homme Lacoste

### Couleur

* Noir
* Blanc
* Bleu

### Taille

* M
* L
* XL

Nombre potentiel :

**3 × 3 = 9 variantes**

Exemple :

> Noir / M

SKU :

> LAC-POL-BK-M

---

# 18. CAS DES CHAUSSURES

## Produit

Nike Air Max

### Couleur

* Noir
* Blanc

### Pointure

* 40
* 41
* 42
* 43
* 44

Potentiel :

**2 × 5 = 10 variantes.**

Mais seules les variantes réellement vendues doivent être activées.

---

# 19. CAS DES SMARTPHONES

## Produit

Samsung Galaxy S25 Ultra

### Couleur

* Noir
* Argent

### Stockage

* 256 Go
* 512 Go

Variantes :

| Couleur | Stockage |
| ------- | -------- |
| Noir    | 256 Go   |
| Noir    | 512 Go   |
| Argent  | 256 Go   |
| Argent  | 512 Go   |

Chaque variante peut avoir son :

* SKU ;
* prix ;
* stock ;
* code-barres ;
* image.

---

# 20. CAS DES BOISSONS

## Produit

Coca-Cola

### Format

* 33 cl
* 50 cl
* 1,5 L

### Conditionnement

* Unité
* Pack
* Carton

Attention :

Toutes les combinaisons ne sont pas nécessairement valides.

Par exemple :

> 1,5 L / carton

peut être commercialisé.

Mais :

> 1,5 L / pack de 6

peut nécessiter une définition commerciale différente.

### Règle

Ahizan doit contrôler les combinaisons autorisées.

---

# 21. VARIANTE ET CONDITIONNEMENT

Pour la distribution, le conditionnement peut justifier une variante différente lorsqu'il possède :

* un SKU différent ;
* un prix différent ;
* un stock différent.

### Exemple

**Eau 1,5 L**

Variante 1 :

> Unité

SKU :

> EAU-15-U

Variante 2 :

> Carton de 12

SKU :

> EAU-15-C12

---

# 22. VARIANTE ET CODE-BARRES

Lorsqu'un produit possède un code-barres officiel, Ahizan doit pouvoir l'enregistrer.

Mais le code-barres ne doit pas remplacer le SKU interne.

### Architecture

**SKU Ahizan**

→ gestion interne

**Référence vendeur**

→ gestion du vendeur

**EAN/GTIN**

→ identification standardisée

Cela permettra notamment de rechercher rapidement un produit à partir d'un code-barres.

---

# 23. VARIANTE ET IMAGES

Une variante peut avoir une image spécifique.

### Exemple

Produit :

> Chaussure Nike Air

Image générale :

> vue générale

Variante :

> Noir / 42

Image spécifique :

> chaussure noire

Variante :

> Blanc / 42

Image spécifique :

> chaussure blanche

Vendure expose les assets au niveau du produit et de la variante.

---

# 24. VARIANTE INACTIVE

Une variante peut être désactivée sans nécessairement être supprimée.

Exemple :

> Noir / XL

Stock :

> 0

Statut :

> Inactive

Cette approche permet à Ahizan de conserver l'historique.

### Pourquoi ?

Une variante peut déjà avoir été utilisée dans :

* commandes ;
* factures ;
* statistiques ;
* historiques de vente.

---

# 25. MODIFICATION D'UNE VARIANTE

Il faut distinguer :

### Modification descriptive

Exemple :

> Correction du nom.

Normalement sans problème.

### Modification commerciale

Exemple :

> Changement de prix.

Possible selon les règles commerciales.

### Modification identifiante

Exemple :

> Changement du SKU.

À contrôler strictement.

### Modification structurelle

Exemple :

> Transformer une variante 256 Go en 512 Go.

À éviter.

Dans ce dernier cas, il est généralement préférable de conserver l'ancienne variante et d'en créer une nouvelle.

---

# 26. SUPPRESSION ET HISTORIQUE

Ahizan doit privilégier :

> **désactivation**

plutôt que :

> **suppression définitive**

lorsqu'une variante a déjà été utilisée.

Vendure utilise notamment des mécanismes de suppression logique/soft delete sur ses entités de catalogue.

L'objectif est de préserver l'intégrité historique.

---

# 27. CRÉATION MANUELLE

Pour un produit simple, le vendeur peut créer manuellement :

1. le produit ;
2. les groupes d'options ;
3. les options ;
4. les variantes ;
5. les SKU ;
6. les prix ;
7. les stocks.

Mais cette méthode ne doit pas être la seule pour Ahizan.

---

# 28. GÉNÉRATION AUTOMATIQUE

Ahizan doit proposer :

**Créer les variantes automatiquement**

Exemple :

Couleur :

☑ Noir
☑ Blanc

Taille :

☑ M
☑ L
☑ XL

Ahizan calcule :

> 6 variantes potentielles

Puis affiche les variantes avant validation.

---

# 29. ÉCRAN DE VALIDATION RECOMMANDÉ

Le vendeur doit voir :

| Variante   | SKU  | Prix | Stock | Activer |
| ---------- | ---- | ---: | ----: | ------- |
| Noir / M   | Auto |    — |     — | ☑       |
| Noir / L   | Auto |    — |     — | ☑       |
| Noir / XL  | Auto |    — |     — | ☑       |
| Blanc / M  | Auto |    — |     — | ☑       |
| Blanc / L  | Auto |    — |     — | ☐       |
| Blanc / XL | Auto |    — |     — | ☑       |

Il peut ainsi supprimer les combinaisons qu'il ne vend pas.

---

# 30. IMPORT MASSIF

Ahizan devra rapidement permettre l'importation de nombreux produits.

Vendure dispose d'un mécanisme d'import CSV permettant notamment d'importer les produits, variantes, options et groupes d'options.

Le format permet notamment de définir les groupes d'options et leurs valeurs.

Un même code de groupe peut être utilisé pour partager un groupe d'options entre plusieurs produits.

---

# 31. EXEMPLE D'IMPORT AHIZAN

Supposons un fichier contenant :

| Produit    | Option  | Valeur | SKU      |
| ---------- | ------- | ------ | -------- |
| Polo homme | Couleur | Noir   | POL-BK-M |
| Polo homme | Taille  | M      | POL-BK-M |
| Polo homme | Couleur | Blanc  | POL-WH-M |
| Polo homme | Taille  | M      | POL-WH-M |

Ahizan peut transformer ces données en :

**Produit**

Polo homme

↓

**Options**

Couleur + Taille

↓

**Variantes**

Noir/M

Blanc/M

---

# 32. IA ET CRÉATION DES VARIANTES

C'est ici qu'Ahizan peut apporter une réelle valeur ajoutée.

Le vendeur peut écrire :

> « Samsung A16 noir et bleu, 128 et 256 Go. »

L'IA peut proposer :

### Couleur

* Noir
* Bleu

### Stockage

* 128 Go
* 256 Go

### Variantes proposées

1. Noir / 128 Go
2. Noir / 256 Go
3. Bleu / 128 Go
4. Bleu / 256 Go

---

# 33. L'IA NE DOIT PAS ÊTRE L'AUTORITÉ

L'IA doit :

**proposer**

mais le vendeur doit :

**confirmer**

et Ahizan doit :

**valider**.

Le processus devient :

**Vendeur**

↓

**IA**

↓

**Contrôle automatique**

↓

**Validation vendeur**

↓

**Validation Ahizan**

↓

**Publication**

---

# 34. CONTRÔLE AUTOMATIQUE

Avant publication, Ahizan doit vérifier :

### Identité

* produit correctement identifié.

### Options

* groupes cohérents.

### Variantes

* combinaisons valides.

### SKU

* aucun doublon.

### Prix

* renseigné.

### Stock

* renseigné si nécessaire.

### Images

* présentes.

### Catalogue

* bonne catégorie.

---

# 35. ARCHITECTURE MARKETPLACE

C'est un point capital.

Supposons :

**Produit catalogue**

> Huile Dinor 1 L

Trois vendeurs proposent le produit.

### Vendeur A

2 500 FCFA

Stock 100

### Vendeur B

2 450 FCFA

Stock 30

### Vendeur C

2 600 FCFA

Stock 80

Ahizan ne doit pas créer trois produits différents.

Il doit conserver :

**UN PRODUIT CATALOGUE**

et plusieurs :

**OFFRES VENDEURS**

---

# 36. DISTINCTION FONDAMENTALE

La structure recommandée devient :

**PRODUCT**

↓

**PRODUCT VARIANT**

↓

**SELLER OFFER**

↓

**PRICE**

↓

**STOCK**

Cela permet de séparer :

### Identité du produit

de

### Conditions commerciales du vendeur.

Cette distinction sera essentielle pour la suite de l'architecture marketplace Ahizan.

---

# 37. RECHERCHE PAR VARIANTE

Lorsqu'un client choisit :

**Samsung S25 Ultra**

puis :

**Noir**

puis :

**512 Go**

Ahizan doit retrouver précisément :

> SAM-S25U-BK-512

La recherche ne doit pas simplement retourner le produit général.

Elle doit identifier la variante sélectionnée.

---

# 38. GROUPES D'OPTIONS ET MULTI-CANAL

Les groupes d'options Vendure sont également **Channel-aware** dans l'architecture actuelle.

Cela devient intéressant si Ahizan développe plusieurs canaux commerciaux.

Exemple :

* Ahizan B2C ;
* Ahizan B2B ;
* application mobile ;
* portail grossistes.

Mais cette fonction doit être utilisée avec prudence.

Elle ne doit pas être confondue automatiquement avec :

> un vendeur = un Channel.

Cette décision doit être prise au niveau de l'architecture marketplace globale.

---

# 39. MULTILINGUE

Vendure permet de traduire notamment :

* Products ;
* ProductOptions ;
* ProductOptionGroups ;
* ProductVariants.

Pour Ahizan :

### Phase 1

Français.

### Phase 2

Anglais.

### Phase 3

Éventuellement langues locales selon la stratégie commerciale.

L'architecture doit donc être conçue dès le départ pour accepter les traductions.

---

# 40. EXTENSION DE L'INTERFACE VEN DURE

Vendure permet d'étendre son dashboard et fournit notamment des points d'extension pour :

* détail produit ;
* détail variante ;
* gestion des variantes ;
* groupe d'options ;
* option ;
* champs personnalisés.

C'est très important pour Ahizan.

L'équipe technique n'a donc pas besoin de reconstruire tout le système de gestion du catalogue depuis zéro.

Elle peut partir de Vendure et ajouter l'interface métier Ahizan.

---

# 41. INTERFACE VENDEUR AHIZAN RECOMMANDÉE

Le vendeur devrait voir :

## ÉTAPE 1

**Quel est votre produit ?**

Nom du produit.

---

## ÉTAPE 2

**Votre produit possède-t-il plusieurs variantes ?**

○ Non

○ Oui

---

## ÉTAPE 3

**Choisissez les caractéristiques**

* Couleur

* Taille

* Format

* Capacité

* Conditionnement

---

## ÉTAPE 4

**Sélectionnez les valeurs**

Exemple :

Couleur :

☑ Noir

☑ Blanc

☑ Bleu

---

## ÉTAPE 5

**Générer les variantes**

Ahizan affiche toutes les combinaisons potentielles.

---

## ÉTAPE 6

**Contrôler les variantes**

Le vendeur désactive celles qu'il ne commercialise pas.

---

## ÉTAPE 7

**Prix et stock**

Chaque variante reçoit :

* SKU ;
* prix ;
* stock ;
* éventuellement code-barres.

---

# 42. EXEMPLE COMPLET AHIZAN

## Produit

**Tecno Camon 40 Pro**

### Catégorie

Électronique → Téléphones → Smartphones

### Groupe 1

Couleur

* Noir
* Bleu
* Vert

### Groupe 2

Stockage

* 128 Go
* 256 Go

### Variantes

| Variante      | SKU            |    Prix | Stock |
| ------------- | -------------- | ------: | ----: |
| Noir / 128 Go | TEC-C40-BK-128 | 170 000 |    10 |
| Noir / 256 Go | TEC-C40-BK-256 | 190 000 |     5 |
| Bleu / 128 Go | TEC-C40-BL-128 | 170 000 |     7 |
| Bleu / 256 Go | TEC-C40-BL-256 | 190 000 |     3 |
| Vert / 128 Go | TEC-C40-GR-128 | 175 000 |     4 |
| Vert / 256 Go | TEC-C40-GR-256 | 195 000 |     2 |

---

# 43. RÈGLES D'OR AHIZAN

### Règle 1

Un produit doit toujours posséder au moins une variante.

### Règle 2

Une variante représente une référence réellement vendable.

### Règle 3

Une option doit avoir une fonction commerciale réelle.

### Règle 4

Les combinaisons impossibles ne doivent pas être créées.

### Règle 5

Chaque variante doit avoir un SKU unique.

### Règle 6

Le SKU vendeur et le SKU Ahizan doivent pouvoir coexister.

### Règle 7

Les groupes d'options communs doivent être normalisés.

### Règle 8

Les variantes inactives doivent pouvoir être conservées.

### Règle 9

L'IA doit assister la création, pas remplacer la validation.

### Règle 10

Le Product catalogue doit être séparé de l'offre commerciale du vendeur.

---

# 44. TABLEAU DE RÉFÉRENCE

| Objet Vendure        | Fonction                   | Adaptation Ahizan            |
| -------------------- | -------------------------- | ---------------------------- |
| Product              | Produit général            | Produit catalogue            |
| ProductOptionGroup   | Groupe de caractéristiques | Couleur, taille, format      |
| ProductOption        | Valeur                     | Noir, M, 1 L                 |
| ProductVariant       | Référence vendable         | Variante catalogue           |
| SKU                  | Identifiant                | SKU Ahizan                   |
| Option Group partagé | Réutilisation              | Normalisation catalogue      |
| Channel              | Périmètre commercial       | À définir selon architecture |
| Custom Fields        | Données supplémentaires    | Données métier Ahizan        |

---

# 45. SYNTHÈSE FINALE

L'architecture du catalogue Ahizan doit être comprise comme ceci :

**CATÉGORIE**

↓

**PRODUCT**

↓

**PRODUCT OPTION GROUP**

↓

**PRODUCT OPTION**

↓

**PRODUCT VARIANT**

↓

**SKU**

↓

**SELLER OFFER**

↓

**PRIX + STOCK**

↓

**COMMANDE**

Vendure fournit déjà une grande partie de cette infrastructure. La documentation officielle confirme que le Product est le conteneur, tandis que la ProductVariant constitue l'unité réellement achetée et porte notamment le SKU et le prix.

Les versions actuelles apportent également les groupes d'options partagés, ce qui est particulièrement adapté à la normalisation d'un catalogue marketplace comme Ahizan.

---

# CONCLUSION

Le système de variantes est l'un des piliers techniques d'Ahizan.

La bonne architecture n'est pas :

> **Un vendeur = un produit**

mais :

> **Un produit catalogue → une ou plusieurs variantes → plusieurs offres vendeurs.**

Cette distinction permettra à Ahizan de construire progressivement un catalogue
