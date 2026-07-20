Tu es un Software Architect Senior, spécialisé en architecture de plateformes e-commerce, marketplaces, SIG (Systèmes d'Information Géographique), Domain Driven Design (DDD), architectures modulaires, Vendure, NestJS, PostgreSQL/PostGIS, OpenStreetMap, Leaflet et conception de plateformes évolutives.

Tu travailles sur le projet **Ahizan**, une marketplace béninoise.

Tu disposes déjà d'un accès complet au code source de la plateforme.

Avant toute proposition technique, tu dois analyser entièrement l'existant.

Tu ne dois écrire aucun code dans cette étape.

Ta mission est uniquement de réaliser une étude d'architecture complète et produire un plan de déploiement détaillé qui sera soumis à validation avant le développement.

---

# **CONTEXTE DU PROJET**

Ahizan n'est pas destinée à être une copie d'Amazon ou d'une marketplace occidentale.

L'objectif est de construire une marketplace profondément adaptée au contexte africain, et plus particulièrement au Bénin.

Nous voulons que l'utilisateur ait le sentiment que la plateforme comprend réellement son environnement.

La localisation ne doit donc pas être une simple fonctionnalité.

Elle doit devenir un moteur métier utilisé par l'ensemble de la plateforme.

Nous appelons ce composant :

**Geo Engine**

Il deviendra progressivement une des fondations techniques d'Ahizan.

---

# **CONTEXTE TECHNIQUE**

Le backend est basé sur Vendure.

Le Geo Engine sera développé comme un module interne à Vendure.

Nous ne souhaitons PAS créer un microservice indépendant pour le moment.

En revanche, nous voulons que son architecture soit pensée dès aujourd'hui pour pouvoir être extraite plus tard sous forme de service autonome sans casser le reste de la plateforme.

Le Geo Engine doit donc être développé comme un module totalement autonome à l'intérieur du monolithe.

Aucun autre module ne devra accéder directement à ses tables.

Toutes les interactions devront passer par une couche de services publique (GeoService).

Le but est qu'un jour, cette couche puisse être remplacée par des appels HTTP sans modifier les autres modules.

---

# **OBJECTIFS DU GEO ENGINE**

Le Geo Engine doit devenir la source unique de vérité concernant toutes les données géographiques de la plateforme.

Tous les modules devront dépendre de lui.

Exemples :

* gestion des vendeurs  
* gestion des clients  
* CMS Builder  
* recherche  
* livraison  
* calcul des frais  
* affichage de la page d'accueil  
* géolocalisation  
* SEO  
* statistiques  
* publicité  
* recommandations  
* IA  
* analytics  
* futur service de livraison  
* futures applications mobiles

---

# **HIERARCHIE GÉOGRAPHIQUE**

Le moteur doit gérer une hiérarchie géographique.

Pour le Bénin :

Pays

↓

Département

↓

Commune

↓

Arrondissement

↓

Quartier ou Village

↓

Marché (entité métier Ahizan)

↓

Boutique

Le marché n'est pas une subdivision administrative.

C'est une subdivision commerciale propre à Ahizan.

Le modèle doit rester suffisamment générique pour supporter d'autres pays africains.

---

# **CHAQUE NIVEAU DOIT POUVOIR CONTENIR**

Identité

* nom  
* slug  
* code  
* description

Etat

* actif  
* brouillon  
* archivé

Position

* latitude  
* longitude  
* point GPS  
* GeoJSON  
* Bounding Box  
* centre géographique

Informations cartographiques

* superficie  
* rayon  
* polygone

SEO

* meta title  
* meta description  
* URL

Illustration

* image  
* bannière  
* icône

Statistiques

* nombre de vendeurs  
* nombre de produits  
* nombre de commandes  
* nombre de visiteurs

---

# **MODES DE CRÉATION**

Le moteur devra supporter plusieurs méthodes.

## **Création manuelle**

Création complète via le back-office.

---

## **Import OpenStreetMap**

Recherche d'une ville, commune, quartier...

Import automatique de :

* nom  
* coordonnées  
* GeoJSON  
* limites  
* centre  
* autres informations disponibles

---

## **Import massif**

Import CSV

Import Excel

Import GeoJSON

Pour permettre d'importer rapidement toutes les subdivisions administratives d'un pays.

---

# **CARTOGRAPHIE**

Nous utilisons actuellement :

* OpenStreetMap  
* Leaflet

Le moteur devra exploiter au maximum ces technologies.

L'utilisation de PostGIS est autorisée si elle apporte une réelle valeur.

Analyse si son adoption est pertinente dans notre contexte.

---

# **RELATIONS AUTOMATIQUES**

Lorsque le vendeur choisit un point GPS.

Le moteur doit automatiquement retrouver :

Quartier

↓

Arrondissement

↓

Commune

↓

Département

↓

Pays

Le vendeur ne doit pas avoir à remplir manuellement ces informations.

---

# **DÉTECTION DES UTILISATEURS**

Lorsque le client autorise la géolocalisation.

Le moteur doit automatiquement déterminer :

* son pays  
* son département  
* sa commune  
* son arrondissement  
* son quartier

Ces informations alimenteront automatiquement les autres modules.

---

# **MARCHÉS**

Les marchés sont une notion métier.

Chaque marché doit être rattaché à :

* pays  
* département  
* commune  
* arrondissement  
* quartier

Et posséder :

* position  
* GeoJSON  
* horaires  
* description  
* images  
* statistiques

---

# **BOUTIQUES**

Chaque boutique doit pouvoir disposer :

* d'une position GPS  
* d'un quartier  
* d'un marché  
* d'une adresse  
* d'une zone de livraison

---

# **ZONES DE LIVRAISON**

Le moteur devra permettre :

* rayon circulaire

ou

* polygone

afin de déterminer automatiquement si un client est livrable.

---

# **CMS BUILDER**

Le CMS devra pouvoir utiliser le Geo Engine.

Exemples :

Afficher les produits :

* d'un quartier  
* d'une commune  
* d'un département  
* d'un marché  
* d'une zone personnalisée

Le CMS ne devra jamais manipuler directement les données géographiques.

---

# **RECHERCHE**

Le Geo Engine devra enrichir le moteur de recherche.

Exemples :

"Téléphones à Ganhi"

"Chaussures près de moi"

"Restaurants à Porto-Novo"

---

# **PUBLICITÉ**

Le moteur devra permettre un ciblage géographique.

Par exemple :

* uniquement Cotonou  
* uniquement Dantokpa  
* uniquement Fidjrossè

---

# **ANALYTICS**

Le moteur devra fournir des statistiques géographiques.

Par exemple :

Produits les plus vendus par quartier.

Top vendeurs par commune.

Répartition des commandes.

Heatmaps.

---

# **SEO**

Chaque subdivision géographique devra pouvoir générer automatiquement des pages publiques.

Exemples :

/benin

/benin/littoral

/benin/littoral/cotonou

etc.

---

# **API INTERNE**

Tous les modules devront utiliser uniquement des services.

Exemples :

GeoService.detectLocation()

GeoService.findZone()

GeoService.findMarket()

GeoService.reverseGeocode()

GeoService.geocode()

GeoService.getChildren()

GeoService.getParents()

GeoService.getPath()

GeoService.getNearbyMarkets()

GeoService.getNearbyShops()

GeoService.isInsidePolygon()

GeoService.calculateDistance()

GeoService.getDeliveryZone()

GeoService.importGeoJSON()

GeoService.exportGeoJSON()

Aucun autre module ne devra accéder directement aux tables du Geo Engine.

---

# **CONTRAINTE D'ARCHITECTURE**

Le Geo Engine doit être conçu comme un futur microservice.

Aujourd'hui :

Module Vendure.

Demain :

Service indépendant.

Cette extraction devra être possible avec un minimum de modifications.

---

# **TA MISSION**

Avant toute implémentation :

1. Analyse complètement le code existant.  
2. Analyse l'architecture actuelle de Vendure.  
3. Analyse les modules déjà présents.  
4. Analyse le CMS Builder existant.  
5. Analyse la gestion actuelle des vendeurs.  
6. Analyse la gestion actuelle des adresses.  
7. Analyse la recherche.  
8. Analyse les points d'intégration possibles.  
9. Identifie les dépendances.  
10. Identifie les risques.  
11. Identifie les conflits éventuels.  
12. Propose des améliorations si certaines de nos idées peuvent être optimisées.

Ne considère pas nos propositions comme des contraintes absolues. Si une approche plus robuste, plus évolutive ou plus adaptée au code existant existe, explique-la et justifie-la.

---

# **LIVRABLE ATTENDU**

Je ne veux **aucune ligne de code** à cette étape.

Je veux que ton plan d’implémentation comprennent en général les infos suivantes:

* une analyse de l'existant ;  
* les hypothèses retenues ;  
* les éventuelles remises en question de nos choix ;  
* l'architecture cible du Geo Engine ;  
* son découpage en sous-modules ;  
* les modèles de données proposés ;  
* les services publics (`GeoService`) ;  
* les événements, hooks et intégrations avec Vendure ;  
* les interfaces d'administration ;  
* les flux fonctionnels ;  
* les dépendances avec les autres modules ;  
* les choix techniques (et leurs justifications) ;  
* les performances attendues (index spatiaux, cache, pagination, etc.) ;  
* la stratégie d'évolution vers un microservice autonome ;  
* un plan de déploiement découpé en phases de développement avec les priorités, les risques et les critères de validation de chaque phase.  
* etc…

