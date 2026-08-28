# MANUEL VENDURE POUR AHIZAN

## Tome 1 — Architecture du catalogue

**Version 1.0**

---

# Introduction

Ahizan est une marketplace béninoise qui doit permettre à plusieurs vendeurs de publier leurs produits, de recevoir des commandes et de les faire livrer aux clients.

Pour gérer efficacement des milliers, puis des centaines de milliers de produits, Ahizan a besoin d'une architecture de catalogue solide.

Vendure fournit cette architecture.

Cependant, Vendure utilise certains termes techniques qu'il faut bien comprendre avant de commencer à créer des produits.

Ce premier tome explique :

* comment le catalogue est organisé ;
* la différence entre un produit et une variante ;
* les catégories ;
* les collections ;
* les facettes ;
* les images ;
* les informations essentielles d'une fiche produit.

L'objectif est que toute personne travaillant sur Ahizan comprenne la structure du catalogue avant de commencer à saisir des produits.

---

# Chapitre 1 — Vue générale du catalogue

Dans Ahizan, un article vendu suit cette structure :

<box background=surface border={{ size: 1, color: "default" }} radius=3xl padding=4> <box align=center padding=2>
**CATALOGUE AHIZAN** </box> <divider spacing=1 /> <box align=center padding=2>
**Catégorie**

```
Téléphones
```

  </box>
  <divider spacing=1 />
  <box align=center padding=2>
    **Sous-catégorie**

```
Smartphones
```

  </box>
  <divider spacing=1 />
  <box align=center padding=2>
    **Produit**

```
Samsung Galaxy S25 Ultra
```

  </box>
  <divider spacing=1 />
  <box align=center padding=2>
    **Variantes**

```
Noir / 256 Go

Noir / 512 Go

Argent / 256 Go

Argent / 512 Go
```

  </box>
</box>

Cette hiérarchie doit être respectée pour tous les produits publiés sur Ahizan.

---

# Chapitre 2 — Les 6 éléments fondamentaux

Chaque fiche produit Ahizan repose sur six éléments.

| Élément    | Rôle                                  |
| ---------- | ------------------------------------- |
| Catégorie  | Classe le produit                     |
| Collection | Regroupe les produits                 |
| Produit    | Représente le modèle                  |
| Option     | Définit les choix                     |
| Variante   | Représente l'article réellement vendu |
| Facette    | Sert aux filtres                      |

Ces six éléments ont des fonctions différentes.

---

# Chapitre 3 — Les catégories

## Définition

Une catégorie indique **ce qu'est le produit**.

Exemple :

* Électronique
* Téléphones
* Smartphones

Pour Ahizan, je recommande une arborescence à trois niveaux maximum.

### Exemple

**Électronique**

* Téléphones

  * Smartphones
  * Téléphones classiques
* Informatique

  * Ordinateurs
  * Tablettes
* Audio

  * Casques
  * Enceintes

### Exemple alimentation

**Alimentation**

* Boissons

  * Eau
  * Jus
  * Boissons gazeuses
* Huiles
* Riz
* Conserves

## Règle Ahizan

Un produit doit avoir **une catégorie principale obligatoire**.

Exemple :

Samsung Galaxy S25 Ultra

Catégorie principale :

> Électronique → Téléphones → Smartphones

Cette règle évite les doublons et facilite la recherche.

---

# Chapitre 4 — Les collections

Les collections servent à regrouper des produits pour des besoins commerciaux.

Contrairement aux catégories, elles ne décrivent pas la nature du produit.

## Exemples de collections Ahizan

* Promotions du mois
* Nouveautés
* Meilleures ventes
* Rentrée scolaire
* Ramadan
* Produits locaux
* Électroménager
* Offres flash

Un même produit peut appartenir à plusieurs collections.

### Exemple

Un réfrigérateur peut être dans :

* Électroménager
* Promotions du mois
* Meilleures ventes

La catégorie reste la même.

---

# Chapitre 5 — Le produit

Le produit représente le modèle général.

## Exemple

**Samsung Galaxy S25 Ultra**

Le produit contient :

* le nom ;
* la description ;
* la marque ;
* la catégorie ;
* les photos générales ;
* les caractéristiques communes ;
* les informations SEO.

Le produit **ne représente pas encore un article précis en stock**.

---

# Chapitre 6 — Les options

Les options définissent les choix possibles.

## Exemple smartphone

### Couleur

* Noir
* Argent

### Stockage

* 256 Go
* 512 Go

Ces options permettront de créer les variantes.

## Autres exemples

### Vêtements

**Taille**

* S
* M
* L
* XL

**Couleur**

* Noir
* Blanc
* Bleu

### Boissons

**Format**

* 33 cl
* 50 cl
* 1 L

**Conditionnement**

* Unité
* Pack de 6
* Carton

---

# Chapitre 7 — Les variantes

La variante est l'élément le plus important du catalogue.

C'est **la variante qui est réellement achetée par le client**.

## Exemple

Produit :

Samsung Galaxy S25 Ultra

| Variante        | SKU       |    Prix | Stock |
| --------------- | --------- | ------: | ----: |
| Noir / 256 Go   | S25U-N256 | 650 000 |     8 |
| Noir / 512 Go   | S25U-N512 | 750 000 |     3 |
| Argent / 256 Go | S25U-A256 | 670 000 |     5 |
| Argent / 512 Go | S25U-A512 | 770 000 |     2 |

Chaque variante possède :

* un SKU ;
* un prix ;
* un stock ;
* éventuellement un code-barres ;
* éventuellement des photos spécifiques.

---

# Chapitre 8 — Les facettes

Les facettes servent principalement aux filtres.

Il ne faut pas les confondre avec les options.

## Exemple smartphone

Facettes :

* Marque : Samsung
* Réseau : 5G
* RAM : 12 Go
* Écran : 6,9 pouces

Le client pourra filtrer :

* uniquement Samsung ;
* uniquement 5G ;
* uniquement 12 Go de RAM.

Les facettes ne créent pas de variantes.

---

# Chapitre 9 — Différence entre options et facettes

| Options              | Facettes           |
| -------------------- | ------------------ |
| Créent les variantes | Créent les filtres |
| Couleur              | Marque             |
| Taille               | Réseau             |
| Stockage             | Garantie           |
| Format               | Pays d'origine     |

### Exemple

Couleur :

* Noir
* Blanc

C'est une **option**, car le client choisit la couleur.

Marque :

* Samsung

C'est une **facette**, car elle sert surtout à rechercher et filtrer.

---

# Chapitre 10 — Les images

Ahizan doit distinguer deux types d'images.

## Images du produit

Elles montrent le produit de manière générale.

Exemple :

* vue avant ;
* vue arrière ;
* emballage ;
* accessoires.

Je recommande :

* minimum : 3 photos ;
* idéal : 5 à 8 photos.

## Images des variantes

Elles sont liées à une variante particulière.

Exemple :

Chaussure Nike.

Variante noire :

* photo noire.

Variante rouge :

* photo rouge.

Ainsi, lorsque le client choisit la couleur rouge, l'image correspondante s'affiche.

---

# Chapitre 11 — Les informations obligatoires

Pour garantir la qualité du catalogue Ahizan, une fiche produit ne devrait pas pouvoir être publiée sans les informations suivantes.

## Obligatoires

* Nom du produit
* Catégorie
* Marque
* Description
* Au moins une image
* Au moins une variante
* SKU
* Prix
* Stock

## Recommandées

* Code-barres
* Garantie
* Poids
* Dimensions
* Pays d'origine
* Caractéristiques techniques

---

# Chapitre 12 — Exemple complet

## Produit

**Tecno Camon 40 Pro**

### Catégorie

Électronique → Téléphones → Smartphones

### Marque

Tecno

### Description

Smartphone Tecno Camon 40 Pro avec 8 Go de RAM, 256 Go de stockage et connectivité 5G.

### Facettes

* Marque : Tecno
* RAM : 8 Go
* Réseau : 5G
* Garantie : 12 mois

### Options

**Couleur**

* Noir
* Vert
* Bleu

### Variantes

| Variante | SKU         |    Prix | Stock |
| -------- | ----------- | ------: | ----: |
| Noir     | TEC-C40P-BK | 180 000 |    10 |
| Vert     | TEC-C40P-GR | 180 000 |     7 |
| Bleu     | TEC-C40P-BL | 185 000 |     5 |

### Images

* photo générale ;
* photo face avant ;
* photo face arrière ;
* photo variante noire ;
* photo variante verte ;
* photo variante bleue.

---

# Chapitre 13 — Exemple pour ton activité de distribution

## Produit

**Coca-Cola**

### Catégorie

Alimentation → Boissons → Boissons gazeuses

### Options

**Format**

* 33 cl
* 50 cl
* 1,5 L

**Conditionnement**

* Unité
* Pack
* Carton

### Variantes

| Variante       | SKU      |  Prix | Stock |
| -------------- | -------- | ----: | ----: |
| 33 cl / Unité  | COC-33-U |   400 |   200 |
| 33 cl / Carton | COC-33-C | 9 000 |    30 |
| 1,5 L / Unité  | COC-15-U | 1 000 |   100 |

Cet exemple montre que Vendure peut parfaitement gérer les produits de grande consommation que tu distribues déjà.

---

# Chapitre 14 — Règles de qualité du catalogue Ahizan

Pour que la marketplace reste professionnelle, je recommande les règles suivantes.

### Règle 1

Un produit ne doit pas être créé deux fois.

Avant de créer un produit, le vendeur doit rechercher s'il existe déjà.

### Règle 2

Le nom doit être normalisé.

Mauvais :

> Samsung s25 ultra noir 256

Bon :

> Samsung Galaxy S25 Ultra 256 Go – Noir

### Règle 3

Chaque variante possède un SKU unique.

### Règle 4

Les photos doivent être nettes.

### Règle 5

La catégorie doit être correcte.

### Règle 6

La description doit être claire et sans fautes.

---

# Chapitre 15 — Le workflow recommandé pour Ahizan

Le vendeur suit ce parcours :

<box background=surface border={{ size: 1, color: "default" }} radius=3xl padding=4> <box align=center padding=2>
**1. Rechercher le produit** </box> <divider spacing=1 /> <box align=center padding=2>
**2. Choisir la catégorie** </box> <divider spacing=1 /> <box align=center padding=2>
**3. Saisir les informations générales** </box> <divider spacing=1 /> <box align=center padding=2>
**4. Ajouter les photos** </box> <divider spacing=1 /> <box align=center padding=2>
**5. Définir les options** </box> <divider spacing=1 /> <box align=center padding=2>
**6. Générer les variantes** </box> <divider spacing=1 /> <box align=center padding=2>
**7. Renseigner SKU, prix et stock** </box> <divider spacing=1 /> <box align=center padding=2>
**8. Vérifier la fiche** </box> <divider spacing=1 /> <box align=center padding=2>
**9. Envoyer pour validation** </box> <divider spacing=1 /> <box align=center padding=2>
**10. Publication sur Ahizan** </box> </box>

---

# Résumé du Tome 1

| Élément    | Fonction                               |
| ---------- | -------------------------------------- |
| Catégorie  | Organise le catalogue                  |
| Collection | Met en avant des groupes commerciaux   |
| Produit    | Représente le modèle général           |
| Option     | Définit les choix possibles            |
| Variante   | Représente l'article réellement vendu  |
| Facette    | Permet les filtres                     |
| SKU        | Identifie chaque variante              |
| Images     | Présentent le produit et ses variantes |

---

# Décisions recommandées pour Ahizan

À la fin de ce Tome 1, je recommande de retenir les principes suivants pour le développement d'Ahizan :

1. **Vendure sera utilisé comme moteur central du catalogue.**
2. **Le produit sera partagé dans le catalogue Ahizan.**
3. **Les variantes porteront les SKU, les prix et les stocks.**
4. **Les catégories seront normalisées par Ahizan pour éviter les doublons.**
5. **Les facettes serviront à construire les filtres de recherche.**
6. **L'interface vendeur sera simplifiée afin que même un commerçant peu habitué au numérique puisse créer une fiche produit.**
7. **Une validation par Ahizan sera prévue avant la publication des nouvelles fiches afin de maintenir la qualité du catalogue.**

---

**Fin du Tome 1 — Architecture du catalogue**

**Prochain tome : Tome 2 — Options & Variantes**, qui expliquera en détail comment créer les groupes d'options, générer automatiquement les combinaisons de variantes, gérer les cas particuliers (boissons, vêtements, téléphones, électroménager) et définir les règles de création automatique des SKU pour Ahizan.
