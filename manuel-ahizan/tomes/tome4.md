# MANUEL VENDURE POUR AHIZAN

## TOME 4 — FICHES PRODUITS, QUALITÉ DU CATALOGUE ET MOTEUR IA

**Version 1.0 — Document de référence**

---

# SOMMAIRE

1. Objet du Tome 4
2. Philosophie du catalogue Ahizan
3. La fiche produit Ahizan
4. Les données brutes du vendeur
5. Les données normalisées
6. Le nom du produit
7. La description courte
8. La description détaillée
9. Les caractéristiques techniques
10. Les images et assets
11. Les catégories
12. Les Facets et attributs
13. Les Custom Fields Ahizan
14. Les informations de variante
15. Le SKU et les références
16. Les codes-barres GTIN/EAN
17. Le référencement naturel
18. Les données SEO
19. Le rôle de l'IA
20. Le workflow IA Ahizan
21. Le contrôle de cohérence
22. La détection des doublons
23. La validation humaine
24. Le système de qualité Ahizan
25. Les fiches incomplètes
26. Le cas d'un produit inconnu
27. Le cas d'un produit déjà existant
28. Le cas de plusieurs vendeurs
29. Import massif du catalogue
30. Architecture technique recommandée
31. Exemple complet
32. Règles de publication
33. Gouvernance du catalogue
34. Synthèse
35. Conclusion

---

# 1. OBJET DU TOME 4

Les trois premiers tomes ont établi les fondations techniques :

**Tome 1**

Architecture du catalogue.

**Tome 2**

Options et variantes.

**Tome 3**

Prix, stocks et inventaires.

Le Tome 4 s'intéresse maintenant à une question essentielle :

> **Comment Ahizan doit-il transformer un produit fourni par un vendeur en une fiche produit professionnelle, claire, normalisée et facilement trouvable par le client ?**

Cette question est particulièrement importante pour Ahizan parce que beaucoup de vendeurs ne disposent pas nécessairement des compétences nécessaires pour produire eux-mêmes une fiche e-commerce de qualité.

Le vendeur peut connaître parfaitement son produit sans savoir :

* comment le nommer ;
* comment le décrire ;
* quelles caractéristiques renseigner ;
* quelles photos utiliser ;
* quelle catégorie choisir ;
* quels mots-clés utiliser ;
* comment structurer les informations ;
* comment éviter les doublons.

Ahizan doit donc prendre en charge une partie importante de cette normalisation.

---

# 2. PHILOSOPHIE DU CATALOGUE AHIZAN

Le principe fondamental doit être :

> **Le vendeur fournit l'information commerciale. Ahizan structure, vérifie et optimise cette information.**

Le vendeur ne doit donc pas être obligé de devenir spécialiste du référencement, de la rédaction web ou de la gestion de catalogue.

## Exemple

Le vendeur fournit :

> « Samsung A16 noir 256 giga 8 ram »

Ahizan doit pouvoir transformer cette information en :

**Samsung Galaxy A16 256 Go – 8 Go RAM – Noir**

Puis proposer automatiquement :

* catégorie ;
* marque ;
* caractéristiques ;
* description ;
* Facets ;
* informations SEO ;
* variante ;
* SKU ;
* contrôle de cohérence.

Le vendeur conserve toutefois la responsabilité de confirmer que les informations sont exactes.

---

# 3. LA FICHE PRODUIT AHIZAN

Une fiche produit complète doit être divisée en plusieurs blocs.

## Bloc A — Identité

* Nom
* Marque
* Modèle
* Référence
* Catégorie

## Bloc B — Présentation

* Description courte
* Description détaillée
* Points forts

## Bloc C — Caractéristiques

* Caractéristiques techniques
* Dimensions
* Poids
* Matière
* Origine
* Garantie

## Bloc D — Médias

* Image principale
* Images secondaires
* Images de variantes
* Vidéos éventuellement

## Bloc E — Commercial

* Variante
* SKU
* Prix
* Stock
* Conditionnement

## Bloc F — Recherche

* Catégorie
* Facets
* Mots-clés
* Données SEO

## Bloc G — Contrôle

* Qualité
* Complétude
* Doublon
* Validation

---

# 4. LES DONNÉES BRUTES DU VENDEUR

Ahizan doit accepter des informations imparfaites.

Exemple :

> « téléphone samsung A16 256 noir 8 giga ram garantie 1 an »

Cette information constitue une **donnée brute**.

Elle ne doit pas être publiée directement.

Ahizan doit d'abord effectuer une phase de normalisation.

---

# 5. LES DONNÉES NORMALISÉES

Le système transforme les données brutes en données structurées.

### Données reçues

> Samsung A16 256 noir 8 ram garantie 1 an

### Données structurées

**Marque**

Samsung

**Modèle**

Galaxy A16

**RAM**

8 Go

**Stockage**

256 Go

**Couleur**

Noir

**Garantie**

12 mois

**Catégorie**

Électronique → Téléphones → Smartphones

Cette structure peut ensuite alimenter le Product, la ProductVariant, les Facets et les Custom Fields Vendure.

Vendure permet précisément d'associer des données structurées aux produits et variantes grâce aux Facets et Custom Fields.

---

# 6. LE NOM DU PRODUIT

Le nom est l'un des éléments les plus importants de la fiche.

Il doit être :

* précis ;
* compréhensible ;
* normalisé ;
* suffisamment court ;
* identifiable par le client.

## Mauvais

> Samsung a16 256 noir 8g

## Correct

> Samsung Galaxy A16 256 Go – 8 Go RAM – Noir

## Règle Ahizan

Le nom doit suivre autant que possible la structure :

**Marque + Modèle + caractéristique principale + variante importante**

---

# 7. LA DESCRIPTION COURTE

La description courte doit permettre au client de comprendre immédiatement ce qu'il achète.

Exemple :

> Smartphone Samsung Galaxy A16 avec 8 Go de RAM, 256 Go de stockage et finition noire. Idéal pour les utilisateurs recherchant un téléphone polyvalent avec un grand espace de stockage.

La description courte ne doit pas être une répétition artificielle de mots-clés.

---

# 8. LA DESCRIPTION DÉTAILLÉE

La description détaillée doit présenter le produit de manière structurée.

## Structure recommandée

### Présentation

Description générale.

### Points forts

* 8 Go RAM
* 256 Go stockage
* Écran grand format
* Double SIM

### Utilisation

Description des usages principaux.

### Contenu

* Téléphone
* Chargeur
* Câble
* Documentation

### Garantie

12 mois.

---

# 9. LES CARACTÉRISTIQUES TECHNIQUES

Les caractéristiques doivent être séparées de la description.

Exemple :

| Caractéristique | Valeur     |
| --------------- | ---------- |
| Marque          | Samsung    |
| Modèle          | Galaxy A16 |
| RAM             | 8 Go       |
| Stockage        | 256 Go     |
| Réseau          | 4G         |
| Couleur         | Noir       |
| SIM             | Double SIM |
| Garantie        | 12 mois    |

Cela permet :

* une meilleure lecture ;
* de meilleurs filtres ;
* une meilleure recherche ;
* une meilleure comparaison entre produits.

---

# 10. LES IMAGES ET ASSETS

Dans Vendure, les Assets peuvent être utilisés pour stocker des images, vidéos, PDF et autres fichiers, et peuvent être associés notamment aux produits et variantes.

Ahizan doit imposer une politique qualité.

## Image principale

Elle doit :

* montrer clairement le produit ;
* être nette ;
* être suffisamment grande ;
* ne pas être trompeuse.

## Images secondaires

Elles peuvent montrer :

* différents angles ;
* détails ;
* emballage ;
* accessoires ;
* dimensions ;
* utilisation.

## Images de variante

Lorsqu'une variante change visuellement, l'image correspondante doit être associée à cette variante.

---

# 11. LE CONTRÔLE DES IMAGES PAR AHIZAN

Ahizan peut analyser automatiquement :

* résolution ;
* format ;
* orientation ;
* doublons ;
* image floue ;
* présence éventuelle de texte excessif ;
* cohérence avec le produit.

L'IA peut également aider à déterminer quelle image doit être utilisée comme image principale.

Mais la validation finale doit rester contrôlée.

---

# 12. LES CATÉGORIES

La catégorie doit être déterminée à partir de la nature réelle du produit.

Exemple :

> Samsung Galaxy A16

Ne doit pas être classé simplement :

> Électronique

mais idéalement :

> Électronique → Téléphones → Smartphones

Vendure utilise les catégories, collections et Facets comme éléments distincts du catalogue.

---

# 13. LES FACETS

Les Facets sont particulièrement importantes pour Ahizan.

Vendure les utilise notamment pour :

* les filtres ;
* l'organisation du catalogue ;
* certaines logiques commerciales.

## Exemple

Facet :

**Marque**

Valeur :

> Samsung

Facet :

**RAM**

Valeur :

> 8 Go

Facet :

**Stockage**

Valeur :

> 256 Go

Facet :

**Réseau**

Valeur :

> 4G

Le client peut ensuite filtrer les résultats.

---

# 14. FACETS PUBLICS ET PRIVÉS

Vendure permet de définir des Facets publics ou privés.

Les Facets publics peuvent être exposés via le Shop API et utilisés pour la recherche et les filtres du storefront.

Les Facets privés peuvent être utilisés pour la logique interne sans être affichés au client.

Cette distinction est très intéressante pour Ahizan.

## Facets publiques

* Marque
* Couleur
* Taille
* Matière
* Capacité

## Facets privées

* Qualité fiche
* Priorité commerciale
* Niveau de contrôle
* Marge interne
* Produit stratégique

---

# 15. LES CUSTOM FIELDS AHIZAN

Vendure permet d'ajouter des Custom Fields à de nombreuses entités.

Ils peuvent notamment servir à stocker :

* poids ;
* dimensions ;
* GTIN ;
* références supplémentaires ;
* coordonnées ;
* informations spécifiques au métier.

Ahizan doit utiliser cette possibilité pour ajouter les données nécessaires à son modèle.

## Product

Exemples :

* fabricant ;
* pays d'origine ;
* garantie ;
* matière ;
* informations SEO ;
* qualité de fiche.

## ProductVariant

Exemples :

* SKU vendeur ;
* GTIN ;
* poids ;
* longueur ;
* largeur ;
* hauteur ;
* conditionnement ;
* seuil d'alerte.

---

# 16. LE SKU

Le SKU identifie la variante.

Ahizan doit conserver trois niveaux lorsque les données sont disponibles :

### SKU Ahizan

Référence interne.

### SKU vendeur

Référence propre au commerçant.

### GTIN/EAN

Identifiant standard du produit lorsqu'il existe.

Il ne faut pas confondre ces trois références.

---

# 17. LE RÉFÉRENCEMENT NATUREL

Ahizan doit construire ses fiches afin qu'elles soient compréhensibles :

* par les clients ;
* par le moteur de recherche interne ;
* par les moteurs de recherche externes.

Le référencement ne doit toutefois jamais conduire à inventer des informations.

## Mauvaise pratique

Ajouter :

> meilleur téléphone pas cher Cotonou Bénin smartphone Samsung téléphone mobile

sans logique.

## Bonne pratique

Utiliser naturellement les termes réellement associés au produit.

---

# 18. LES DONNÉES SEO

Ahizan peut prévoir des champs spécifiques tels que :

**SEO Title**

> Samsung Galaxy A16 256 Go – 8 Go RAM | Ahizan

**Meta Description**

> Découvrez le Samsung Galaxy A16 256 Go avec 8 Go de RAM. Consultez le prix, les variantes et la disponibilité sur Ahizan.

**Slug**

> samsung-galaxy-a16-256-go

Ces données peuvent être stockées dans des Custom Fields Ahizan lorsque cela est nécessaire.

---

# 19. LE RÔLE DE L'IA

L'IA doit être considérée comme un **assistant de catalogue**.

Elle ne remplace pas :

* le vendeur ;
* le responsable catalogue ;
* la validation Ahizan.

Elle assiste leur travail.

---

# 20. LE PIPELINE IA AHIZAN

Le processus recommandé est :

**Données vendeur**

↓

**Analyse IA**

↓

**Identification du produit**

↓

**Catégorisation**

↓

**Extraction des caractéristiques**

↓

**Normalisation**

↓

**Création de la fiche**

↓

**Création des variantes**

↓

**Génération des données SEO**

↓

**Contrôle automatique**

↓

**Validation humaine**

↓

**Publication**

---

# 21. EXEMPLE D'UTILISATION DE L'IA

Le vendeur saisit :

> « Je vends une TV Hisense 55 pouces smart 4K, modèle 55A6K, prix 350000. »

Ahizan propose :

### Nom

> Hisense 55A6K – TV Smart 4K 55 pouces

### Marque

Hisense

### Catégorie

Électronique → Télévision → Smart TV

### Caractéristiques

* Taille : 55 pouces
* Résolution : 4K
* Type : Smart TV
* Modèle : 55A6K

### Prix

350 000 FCFA

Le vendeur vérifie.

Il confirme.

La fiche est ensuite envoyée en validation.

---

# 22. L'IA NE DOIT PAS INVENTER

C'est une règle absolue.

Si le vendeur fournit :

> « TV Hisense 55 pouces 4K »

L'IA ne doit pas inventer :

* le nombre de ports HDMI ;
* la puissance audio ;
* la fréquence ;
* la technologie HDR ;
* le système d'exploitation ;

si ces informations ne sont pas vérifiées.

L'IA doit écrire :

> **Information non fournie**

ou demander une confirmation.

---

# 23. SOURCES D'INFORMATION

Pour améliorer la fiabilité, Ahizan pourra utiliser plusieurs sources :

### Source 1

Informations fournies par le vendeur.

### Source 2

Documents fournis par le vendeur.

### Source 3

Code-barres / GTIN lorsqu'il est disponible.

### Source 4

Documentation officielle du fabricant.

### Source 5

Base catalogue Ahizan déjà validée.

La source doit être conservée lorsque cela est nécessaire pour assurer la traçabilité.

---

# 24. DÉTECTION DES DOUBLONS

C'est une fonction essentielle pour Ahizan.

Imaginons :

Vendeur A crée :

> Samsung Galaxy A16 256 Go

Puis vendeur B crée :

> Samsung A16 256GB

Ahizan doit déterminer qu'il s'agit probablement du même produit.

Le système peut comparer :

* marque ;
* modèle ;
* GTIN ;
* caractéristiques ;
* images ;
* références fabricant.

---

# 25. LE PRINCIPE DU CATALOGUE CENTRAL

Si un produit existe déjà :

> Ahizan ne doit pas forcément créer un nouveau Product.

Il doit pouvoir proposer :

> **Ajouter votre offre à ce produit existant.**

Exemple :

**Produit catalogue**

> Samsung Galaxy A16 256 Go

### Vendeur A

> 145 000 FCFA

### Vendeur B

> 142 000 FCFA

### Vendeur C

> 150 000 FCFA

Le produit reste unique dans le catalogue.

Les offres commerciales sont multiples.

---

# 26. CAS D'UN PRODUIT NON ENCORE PRÉSENT

Si le produit n'existe pas :

1. Le vendeur soumet le produit.
2. Ahizan analyse les informations.
3. Le système propose une fiche.
4. Ahizan vérifie la catégorie.
5. Ahizan vérifie les caractéristiques.
6. Ahizan vérifie les images.
7. Ahizan crée le produit.
8. Le vendeur crée ou confirme son offre.
9. Le produit est publié.

Cette logique est particulièrement importante pour éviter un catalogue rempli de doublons.

---

# 27. CAS D'UN PRODUIT MAL RENSEIGNÉ

Exemple :

> « iphone 13 »

Informations insuffisantes.

Ahizan peut demander :

* capacité ;
* couleur ;
* état ;
* garantie ;
* neuf ou occasion ;
* disponibilité.

La fiche ne doit pas être publiée tant que les informations indispensables ne sont pas disponibles.

---

# 28. PRODUITS NEUFS ET PRODUITS D'OCCASION

Ahizan doit prévoir une distinction claire.

## Produit neuf

Informations :

* état : neuf ;
* garantie ;
* emballage ;
* accessoires.

## Produit d'occasion

Informations supplémentaires :

* état général ;
* état écran ;
* état batterie lorsque pertinent ;
* accessoires ;
* défauts éventuels ;
* garantie vendeur.

Cette information doit être structurée et non simplement laissée dans une description libre.

---

# 29. PRODUITS ALIMENTAIRES

Pour l'alimentaire, Ahizan devra prévoir des champs supplémentaires.

Exemples :

* marque ;
* poids ;
* volume ;
* ingrédients ;
* origine ;
* conditionnement ;
* date de durabilité ;
* conditions de conservation.

Ces informations peuvent être modélisées dans les Custom Fields lorsque le modèle métier Ahizan l'exige. Vendure permet précisément d'étendre les entités avec des champs personnalisés.

---

# 30. PRODUITS DE DISTRIBUTION

Pour les produits de grande consommation, Ahizan doit particulièrement gérer :

* unité ;
* pack ;
* carton ;
* quantité par carton ;
* poids ;
* volume ;
* SKU ;
* GTIN ;
* prix grossiste ;
* prix de vente.

Exemple :

**Coca-Cola 50 cl**

Conditionnement :

> Carton de 24

Quantité :

> 24 unités

---

# 31. SCORE DE QUALITÉ DE LA FICHE

Je recommande de créer un score interne Ahizan.

## Exemple

### 90–100 %

**Excellente fiche**

Publication possible.

### 75–89 %

**Bonne fiche**

Publication possible après contrôle.

### 50–74 %

**Fiche à améliorer**

Correction recommandée.

### < 50 %

**Fiche insuffisante**

Publication interdite.

---

# 32. CALCUL DU SCORE

Exemple :

| Critère          |  Points |
| ---------------- | ------: |
| Nom              |      15 |
| Catégorie        |      10 |
| Description      |      15 |
| Images           |      15 |
| Caractéristiques |      15 |
| Variante         |      10 |
| SKU              |       5 |
| Prix             |       5 |
| Stock            |       5 |
| SEO              |       5 |
| **Total**        | **100** |

Ce score est interne à Ahizan.

Il peut être utilisé pour prioriser le travail de l'équipe catalogue.

---

# 33. VALIDATION AUTOMATIQUE

Avant qu'un produit arrive à l'équipe de validation, Ahizan doit effectuer automatiquement plusieurs contrôles.

### Contrôle 1

Nom présent.

### Contrôle 2

Catégorie correcte.

### Contrôle 3

Image présente.

### Contrôle 4

Variante présente.

### Contrôle 5

SKU présent.

### Contrôle 6

Prix présent.

### Contrôle 7

Stock correctement configuré.

### Contrôle 8

Pas de doublon évident.

### Contrôle 9

Informations contradictoires absentes.

### Contrôle 10

Contenu conforme aux règles Ahizan.

---

# 34. VALIDATION HUMAINE

L'équipe Ahizan doit pouvoir voir :

### Données fournies par le vendeur

vs.

### Proposition IA

vs.

### Version finale

Exemple :

**Vendeur :**

> Samsung A16 noir 256 8 ram

**IA :**

> Samsung Galaxy A16 256 Go – 8 Go RAM – Noir

**Validateur :**

> ✓ Accepté

Cette traçabilité est importante pour comprendre les modifications apportées.

---

# 35. STATUTS D'UNE FICHE

Je recommande les statuts suivants :

**DRAFT**

Produit en préparation.

↓

**AI_PROCESSING**

Analyse IA.

↓

**NEEDS_INFORMATION**

Informations manquantes.

↓

**PENDING_REVIEW**

En attente de validation.

↓

**REVISION_REQUIRED**

Correction nécessaire.

↓

**APPROVED**

Validé.

↓

**PUBLISHED**

Publié.

↓

**SUSPENDED**

Suspendu.

---

# 36. QUI PEUT MODIFIER QUOI ?

## Vendeur

Peut :

* renseigner ses produits ;
* modifier certaines informations de son offre ;
* modifier son stock ;
* modifier son prix ;
* proposer des corrections.

## Équipe catalogue Ahizan

Peut :

* corriger la catégorie ;
* normaliser les fiches ;
* fusionner les doublons ;
* corriger les informations communes ;
* valider les produits.

## Administrateur

Peut :

* modifier la structure du catalogue ;
* gérer les règles ;
* gérer les catégories ;
* gérer les Facets ;
* gérer les Custom Fields ;
* gérer les workflows.

---

# 37. IMPORT MASSIF

Ahizan devra pouvoir intégrer des catalogues importants.

Vendure propose un mécanisme d'import CSV capable de gérer notamment :

* produits ;
* variantes ;
* assets ;
* Facets ;
* option groups ;
* option values ;
* Custom Fields.

Cela sera utile pour :

* import initial ;
* migration ;
* intégration de gros vendeurs ;
* import de catalogues fournisseurs ;
* mise à jour massive.

---

# 38. EXEMPLE DE FICHIER D'IMPORT AHIZAN

Un fichier pourrait contenir :

| Nom                | Catégorie   | Marque  | Variante    | SKU          |   Prix | Stock |
| ------------------ | ----------- | ------- | ----------- | ------------ | -----: | ----: |
| Samsung Galaxy A16 | Smartphones | Samsung | Noir 256 Go | SAM-A16-N256 | 145000 |    10 |
| Samsung Galaxy A16 | Smartphones | Samsung | Bleu 256 Go | SAM-A16-B256 | 147000 |     5 |

Vendure prend en charge l'import des données produit et variante ainsi que des assets, Facets et Custom Fields.

---

# 39. ARCHITECTURE TECHNIQUE RECOMMANDÉE

La chaîne technique Ahizan peut être représentée ainsi :

**VENDEUR**

↓

**INTERFACE AHIZAN**

↓

**MOTEUR DE NORMALISATION**

↓

**IA**

↓

**MOTEUR DE DÉTECTION DES DOUBLONS**

↓

**VALIDATION**

↓

**VENDURE**

↓

**CATALOGUE**

↓

**SITE / APPLICATION**

Cette séparation permet de garder Vendure comme moteur e-commerce tout en laissant Ahizan contrôler son propre processus de qualité.

---

# 40. DONNÉES À ENREGISTRER POUR L'IA

Pour chaque fiche, Ahizan devrait pouvoir conserver :

* données originales du vendeur ;
* données normalisées ;
* proposition IA ;
* corrections humaines ;
* version finale ;
* date de validation ;
* utilisateur ayant validé ;
* éventuelle source externe ;
* niveau de confiance.

Cela permettra d'améliorer progressivement le système.

---

# 41. NIVEAU DE CONFIANCE IA

L'IA devrait attribuer un niveau de confiance.

### 95–100 %

Information très fiable.

### 80–94 %

Information probablement correcte.

### 60–79 %

Vérification recommandée.

### < 60 %

Validation humaine obligatoire.

Exemple :

**Marque : Samsung**

Confiance :

> 99 %

**Modèle : Galaxy A16**

Confiance :

> 97 %

**RAM : 8 Go**

Confiance :

> 72 %

Ahizan demandera alors une confirmation.

---

# 42. RÈGLE D'OR

Une donnée importante ne doit jamais être inventée simplement pour rendre la fiche plus belle.

Le principe doit être :

> **Mieux vaut une fiche incomplète mais exacte qu'une fiche complète contenant de fausses informations.**

---

# 43. EXEMPLE COMPLET — AVANT

### Information vendeur

> « Samsung A16 noir 8 ram 256 giga 145000 garantie 1an »

---

# 44. EXEMPLE COMPLET — APRÈS

## Nom

**Samsung Galaxy A16 256 Go – 8 Go RAM – Noir**

## Catégorie

Électronique → Téléphones → Smartphones

## Marque

Samsung

## Modèle

Galaxy A16

## Variante

Noir / 256 Go

## RAM

8 Go

## Stockage

256 Go

## Garantie

12 mois

## Prix

145 000 FCFA

## Stock

À renseigner par le vendeur.

## SKU

À générer ou confirmer.

## Description courte

> Smartphone Samsung Galaxy A16 avec 8 Go de RAM et 256 Go de stockage, proposé en finition noire avec une garantie de 12 mois.

## Facets

* Samsung
* 8 Go RAM
* 256 Go
* Noir

## SEO

**Titre :**

> Samsung Galaxy A16 256 Go 8 Go RAM Noir | Ahizan

**Slug :**

> samsung-galaxy-a16-256-go-8-go-ram-noir

---

# 45. CE QUE VENDURE GÈRE ET CE QU'AHIZAN DOIT AJOUTER

## Vendure fournit

* Product ;
* ProductVariant ;
* catégories ;
* collections ;
* Facets ;
* assets ;
* prix ;
* stocks ;
* options ;
* API ;
* Custom Fields ;
* import de catalogue.

## Ahizan ajoute

* interface vendeur simplifiée ;
* normalisation du catalogue ;
* règles de qualité ;
* moteur de détection des doublons ;
* assistant IA ;
* score de qualité ;
* workflow de validation ;
* logique de catalogue central ;
* gestion des offres vendeurs ;
* règles spécifiques au marché béninois.

---

# 46. RÈGLES DE PUBLICATION AHIZAN

Un produit ne doit être publié que si :

* son identité est suffisamment claire ;
* sa catégorie est correcte ;
* ses informations essentielles sont disponibles ;
* ses images respectent les règles ;
* sa variante est correctement définie ;
* son SKU est valide ;
* son prix est renseigné ;
* son stock est correctement configuré ;
* aucun doublon critique n'a été détecté ;
* les informations importantes ont été validées.

---

# 47. PRINCIPES DE GOUVERNANCE DU CATALOGUE

Ahizan doit conserver une distinction stricte entre :

### Données communes du produit

Exemple :

> Samsung Galaxy A16

et

### Données propres au vendeur

Exemple :

> Prix : 145 000 FCFA

> Stock : 10

> Garantie vendeur : 12 mois

Cette séparation est essentielle pour éviter que le vendeur A puisse modifier les informations communes du produit utilisées également par le vendeur B.

---

# 48. VISION À LONG TERME

Lorsque Ahizan atteindra plusieurs dizaines de milliers de vendeurs et de produits, le catalogue deviendra un actif stratégique.

Il pourra permettre :

* comparaison des prix ;
* comparaison des vendeurs ;
* recherche avancée ;
* recommandations ;
* statistiques ;
* personnalisation ;
* publicité ;
* promotions ;
* analyse des ventes ;
* gestion des stocks ;
* optimisation logistique.

Le catalogue ne doit donc pas être considéré comme une simple liste de produits.

Il doit être considéré comme :

> **la base de données commerciale centrale d'Ahizan.**

---

# 49. ARCHITECTURE FINALE DU SYSTÈME

La vision globale devient :

**VENDEUR**

↓

**Données brutes**

↓

**IA Ahizan**

↓

**Normalisation**

↓

**Détection du produit existant**

↓

**Création ou rattachement au produit catalogue**

↓

**Création des variantes**

↓

**Création de l'offre vendeur**

↓

**Prix + stock**

↓

**Contrôle qualité**

↓

**Validation**

↓

**VENDURE**

↓

**PUBLICATION**

---

# 50. DÉCISIONS DE RÉFÉRENCE POUR AHIZAN

À la fin de ce Tome 4, les décisions suivantes sont recommandées.

### 1.

Ahizan doit posséder un **catalogue centralisé**.

### 2.

Un même produit ne doit pas être recréé pour chaque vendeur.

### 3.

Les vendeurs doivent proposer des **offres** sur les produits existants lorsque cela est possible.

### 4.

L'IA doit assister la création des fiches.

### 5.

L'IA ne doit jamais inventer une caractéristique produit.

### 6.

Les informations structurées doivent être privilégiées aux longues descriptions libres.

### 7.

Les Facets doivent être normalisées afin d'assurer une recherche cohérente. Vendure les prévoit précisément pour la structuration et le filtrage du catalogue.

### 8.

Les Custom Fields doivent être utilisés pour les données propres au modèle Ahizan.

### 9.

Les images doivent être considérées comme des données catalogue à part entière.

### 10.

Toute nouvelle fiche doit passer par un contrôle de qualité avant publication.

---

# CONCLUSION

Vendure fournit à Ahizan un moteur solide pour représenter les produits, variantes, catégories, Facets et assets.

Mais la véritable valeur d'Ahizan ne doit pas résider uniquement dans Vendure.

Elle doit résider dans la couche métier construite autour de Vendure.

Le modèle recommandé est donc :

> **Vendure = moteur catalogue et commerce**

> **Ahizan = intelligence, normalisation, marketplace et expérience utilisateur**

> **IA = assistant de création et de contrôle**

> **Équipe Ahizan = autorité de validation**

Cette architecture permettra à Ahizan de résoudre l'un des problèmes majeurs du commerce en ligne local : transformer des catalogues hétérogènes, incomplets et parfois mal renseignés en un **catalogue professionnel, homogène, searchable et exploitable à grande échelle**.

---

# FIN DU TOME 4

## Suite recommandée

**TOME 5 — Architecture Marketplace et gestion des vendeurs**

Ce tome devra traiter en profondeur :

* vendeur ;
* boutique ;
* offre vendeur ;
* produit commun ;
* prix par vendeur ;
* stock par vendeur ;
* Channel Vendure ;
* commandes multi-vendeurs ;
* commissions ;
* attribution des commandes ;
* refus d'un vendeur ;
* remplacement automatique d'un vendeur ;
* gestion des vendeurs de secours ;
* séparation catalogue / offre ;
* architecture marketplace recommandée pour Ahizan.
