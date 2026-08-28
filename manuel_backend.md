# 🏛️ Manuel d'Administration Complet — Plateforme Ahizan (Back-Office)

> **À qui s'adresse ce document ?**
> Ce manuel est destiné aux administrateurs, gestionnaires de contenu, responsables logistiques et coordinateurs de la marketplace Ahizan. Il décrit chaque fonctionnalité disponible dans le back-office, comment l'utiliser pas à pas, et quel effet chaque action produit sur le reste de la plateforme (site client, portail vendeur, commandes, notifications).
>
> *Aucun code ou terme technique n'est utilisé dans ce document.*

---

## 📋 Table des Matières

1. [Architecture générale de la plateforme](#1-architecture-générale-de-la-plateforme)
2. [Connexion et gestion des administrateurs](#2-connexion-et-gestion-des-administrateurs)
3. [Gestion du catalogue : Produits](#3-gestion-du-catalogue--produits)
4. [Gestion du catalogue : Collections (Catégories)](#4-gestion-du-catalogue--collections-catégories)
5. [Gestion du catalogue : Facettes et Filtres](#5-gestion-du-catalogue--facettes-et-filtres)
6. [Association Facettes ↔ Collections (Collection Facet Map)](#6-association-facettes--collections-collection-facet-map)
7. [Importation en masse (Bulk Import Excel)](#7-importation-en-masse-bulk-import-excel)
8. [Gestion des Vendeurs (Plugin Multivendeur)](#8-gestion-des-vendeurs-plugin-multivendeur)
9. [Formulaire d'inscription dynamique (Page Inscription)](#9-formulaire-dinscription-dynamique-page-inscription)
10. [Gestion des Commandes et Logistique](#10-gestion-des-commandes-et-logistique)
11. [Gestion Financière : Portefeuilles, Commissions et Retraits](#11-gestion-financière--portefeuilles-commissions-et-retraits)
12. [Statuts de commande personnalisés](#12-statuts-de-commande-personnalisés)
13. [Moteur Géographique (Geo Engine)](#13-moteur-géographique-geo-engine)
14. [Moteur d'Expérience et CMS](#14-moteur-dexpérience-et-cms)
15. [Gestionnaire de Bannières (Banner Manager)](#15-gestionnaire-de-bannières-banner-manager)
16. [Système de Notifications](#16-système-de-notifications)
17. [Modération du Chat](#17-modération-du-chat)
18. [Gestion des Clients](#18-gestion-des-clients)
19. [Expédition et Livraison](#19-expédition-et-livraison)
20. [Taxes et Fiscalité](#20-taxes-et-fiscalité)
21. [Promotions et Réductions](#21-promotions-et-réductions)
22. [Gestion des Actifs (Images et Fichiers)](#22-gestion-des-actifs-images-et-fichiers)
23. [Paramètres Généraux de la Plateforme](#23-paramètres-généraux-de-la-plateforme)
24. [Rôles et Permissions](#24-rôles-et-permissions)
25. [Recherche et Indexation](#25-recherche-et-indexation)
26. [Statistiques et Tableaux de Bord](#26-statistiques-et-tableaux-de-bord)
27. [Canaux (Channels)](#27-canaux-channels)
28. [Interactions entre modules : guide des effets croisés](#28-interactions-entre-modules--guide-des-effets-croisés)

---

## 1. Architecture générale de la plateforme

La plateforme Ahizan est une marketplace multi-vendeurs. Elle repose sur un moteur central (Vendure) auquel viennent s'ajouter des modules sur mesure appelés **plugins**. Voici comment les grandes parties s'articulent :

**Le back-office (admin)** est l'interface réservée aux administrateurs. On y gère tout : les vendeurs, les produits, les commandes, le contenu du site client, les zones géographiques, les notifications, etc.

**Le portail vendeur (seller)** est l'interface que chaque vendeur utilise pour gérer sa boutique : créer ses produits, consulter ses commandes, répondre à ses clients, demander ses virements.

**Le site client** est ce que voient les acheteurs : la vitrine, les produits, les pages CMS, les résultats de recherche filtrés selon leur position géographique.

**Les plugins installés sur Ahizan :**
- **Plugin Multivendeur** — Gestion complète des vendeurs, commissions, portefeuilles, commandes, chat, likes.
- **Plugin Geo Engine** — Cartographie des zones géographiques, marchés, zones de livraison, résolution d'adresses.
- **Plugin CMS** — Création et gestion des pages du site client, sections, préréglages, habillages saisonniers.
- **Plugin Bulk Import** — Importation en masse via fichier Excel des collections, facettes et valeurs de facettes.
- **Plugin Collection Facet Map** — Association contrôlée des filtres disponibles par catégorie de produits.
- **Plugin Page Inscription** — Personnalisation du formulaire d'inscription des vendeurs.
- **Plugin Banner Manager** — Gestion des bannières publicitaires, héros, flash sales, modales.
- **Plugin Notifications** — Envoi de SMS, emails, push web et notifications in-app.
- **Plugin Tax Enforcement** — Application automatique et uniforme du système fiscal (0% TVA, monnaie XOF).

---

## 2. Connexion et gestion des administrateurs

### A. Se connecter au back-office

L'interface d'administration est accessible à l'adresse indiquée par votre équipe technique (généralement `/admin`). Pour vous connecter :

1. Saisissez votre **adresse email** ou votre **identifiant administrateur**.
2. Saisissez votre **mot de passe**.
3. Cliquez sur **Se connecter**.

Le super-administrateur a des droits illimités sur toutes les sections. Les autres rôles administrateurs peuvent avoir des accès restreints à certaines sections (voir section 24 — Rôles et Permissions).

### B. Créer un nouveau compte administrateur

1. Dans le menu, allez dans **Paramètres → Administrateurs**.
2. Cliquez sur **Créer un administrateur**.
3. Renseignez : prénom, nom, adresse email, mot de passe.
4. Attribuez un ou plusieurs **rôles** (ex. : Gestionnaire de contenu, Gestionnaire logistique).
5. Validez. Le compte est immédiatement actif.

*Effet sur la plateforme :* Le nouveau compte peut se connecter avec les droits correspondants à son rôle. Il ne peut pas accéder aux sections auxquelles son rôle ne lui donne pas accès.

### C. Modifier un compte administrateur

1. Allez dans **Paramètres → Administrateurs**.
2. Cliquez sur l'administrateur à modifier.
3. Changez les informations souhaitées (email, mot de passe, rôles).
4. Cliquez sur **Enregistrer**.

### D. Supprimer un compte administrateur

1. Ouvrez la fiche d'un administrateur.
2. Cliquez sur **Supprimer**.
3. Confirmez la suppression.

*Attention :* Il n'est pas possible de supprimer le super-administrateur principal pour des raisons de sécurité.

---

## 3. Gestion du catalogue : Produits

Les produits sont les articles mis en vente sur la plateforme. Ils peuvent être créés directement par l'administrateur (pour les articles de la plateforme elle-même) ou par les vendeurs via leur portail. L'administrateur a un accès complet à tous les produits.

### A. Consulter la liste des produits

1. Cliquez sur **Catalogue → Produits** dans le menu latéral.
2. Vous voyez la liste de tous les produits de la plateforme avec :
   - Le nom du produit
   - L'image principale
   - L'état (activé / désactivé)
   - Le nom du vendeur propriétaire
   - La date de création
3. Utilisez la barre de **recherche** pour trouver un produit par son nom ou par son identifiant.
4. Utilisez les **filtres** pour afficher uniquement les produits d'un vendeur précis, d'une collection précise, ou selon leur état (activé/désactivé).

### B. Créer un produit (du côté admin) catalog/products 

1. Cliquez sur **Créer un produit** (bouton vert en haut à droite).
2. Remplissez le formulaire :
   - **Nom du produit** (obligatoire) : Titre principal affiché sur le site client.
   - **Slug** (identifiant URL) : Généré automatiquement à partir du nom. Vous pouvez le modifier manuellement pour l'optimisation du référencement naturel.
   - **Description** : Texte riche (gras, listes, liens) décrivant le produit en détail.
   - **Petite description** (champ personnalisé Ahizan) : Court texte affiché en résumé dans les cartes produit sur le site client.
   - **Image principale** et **galerie d'images** : Téléchargez autant d'images que nécessaire. La première image est celle affichée dans les listes.
   - **Collections** : Sélectionnez une ou plusieurs catégories auxquelles ce produit appartient. *Cette association déclenche automatiquement l'ajout des facettes permises par ces collections au produit.*
   - **Facettes** : Filtres supplémentaires (couleur, taille, matière, etc.) permettant aux clients de trouver ce produit dans les résultats de recherche filtrés. Les facettes disponibles dépendent des collections choisies.
   - **État** : Activé (visible sur le site client) ou Désactivé (invisible, en attente de validation).
   - **Vendeur propriétaire** (champ personnalisé) : Associe ce produit à un vendeur spécifique. Obligatoire si le produit appartient à un vendeur.

3. Dans la section **Variantes** :
   - Chaque produit a au minimum une variante (la variante par défaut).
   - Une variante contient le **prix**, le **stock**, et éventuellement des déclinaisons (taille S, M, L ou couleur rouge, bleu).
   - Cliquez sur **Ajouter une variante** pour créer plusieurs déclinaisons.
   - Pour chaque variante, renseignez :
     - **Prix** (en francs CFA, ex. : 15000)
     - **Stock disponible** : Nombre d'unités disponibles à la vente.
     - **En promotion** (champ Ahizan) : Cochez cette case pour activer le prix promotionnel.
     - **Prix promotionnel** (champ Ahizan) : Le prix réduit affiché sur le site. Le prix barré est automatiquement l'ancien prix.
     - **Prix de comparaison** (barré) : Un prix indicatif optionnel servant à montrer une économie réalisée.
     - **SKU** : Référence interne unique (générée automatiquement si laissée vide).

4. Cliquez sur **Créer le produit**.

*Effet sur la plateforme :*
- Si l'état est **Activé**, le produit apparaît immédiatement sur le site client dans les collections auxquelles il appartient.
- Si une variante est marquée **En promotion**, le moteur de prix promotionnel d'Ahizan l'affiche automatiquement avec le prix réduit et le prix barré. Les sections Flash Sale du CMS peuvent également inclure ce produit.
- Le moteur de recherche indexe immédiatement le produit (nom, description, facettes).

### C. Modifier un produit existant

1. Cliquez sur le produit dans la liste.
2. La fiche de modification est identique au formulaire de création.
3. Modifiez les champs souhaités et cliquez sur **Enregistrer**.

*Points importants lors de la modification :*
- Modifier les **collections** d'un produit change instantanément dans quelles catégories il apparaît sur le site client.
- Modifier les **facettes** change les filtres auxquels ce produit répond dans les résultats de recherche.
- Désactiver un produit (**État = Désactivé**) le retire immédiatement du site client sans le supprimer.
- Modifier le **stock** d'une variante à zéro affiche "Rupture de stock" sur le site client si le paramètre global correspondant l'indique.

### D. Activer / Désactiver un produit

- Depuis la liste des produits, cliquez sur le bouton bascule (toggle) de l'état directement dans la ligne du produit.
- Ou ouvrez la fiche du produit et changez le champ **État**.

*Un produit désactivé reste dans le système mais n'est plus visible sur le site client ni dans les résultats de recherche.*

### E. Supprimer un produit

1. Ouvrez la fiche d'un produit.
2. Cliquez sur le bouton **Supprimer** (icône corbeille).
3. Confirmez.

*Attention :* La suppression est permanente. Si le produit est associé à des commandes existantes, le système peut bloquer la suppression pour préserver l'historique. Il est préférable de désactiver le produit plutôt que de le supprimer.

### F. Validation des produits créés par les vendeurs

Lorsqu'un vendeur crée un produit via son portail, ce produit est créé avec l'état **Désactivé** par défaut. L'administrateur doit le valider :

1. Allez dans **Catalogue → Produits**.
2. Filtrez par état **Désactivé** ou par vendeur spécifique.
3. Ouvrez le produit à valider, vérifiez les informations (description, images, prix, collections).
4. Changez l'état en **Activé** et enregistrez.

*Effet :* Le produit devient immédiatement visible sur le site client et dans les résultats de recherche.

### G. Gestion des variantes avancée

Pour un produit déjà créé, accédez aux variantes via l'onglet **Variantes** de la fiche produit :
- **Ajouter une variante** : Crée une nouvelle déclinaison (ex. : une taille suppléme7ntaire).
- **Modifier une variante** : Changez le prix, le stock, l'état de promotion.
- **Désactiver une variante** : La variante devient invisible sans être supprimée.
- **Supprimer une variante** : Suppression définitive. Impossible si des commandes existent pour cette variante.

*Prix minimum de la plateforme :* Un paramètre global (configuré dans **Paramètres de la Plateforme**) définit le prix minimum en dessous duquel aucun vendeur ne peut publier un article. Si un vendeur tente de créer un produit en dessous de ce seuil, le système bloque l'action et affiche un message d'erreur.

---

## 4. Gestion du catalogue : Collections (Catégories)

Les collections sont les catégories qui organisent les produits. Sur le site client, elles forment les menus de navigation (ex. : Alimentation > Céréales > Riz). La plateforme Ahizan supporte une hiérarchie illimitée de collections parents-enfants.

### A. Consulter la liste des collections

1. Cliquez sur **Catalogue → Collections**.
2. Vous voyez un arbre de collections avec les collections racines et leurs sous-catégories.
3. Cliquez sur la flèche à gauche d'une collection pour développer ses enfants.

### B. Créer une collection

1. Cliquez sur **Créer une collection**.
2. Renseignez :
   - **Nom** (obligatoire) : Le nom affiché sur le site client.
   - **Slug** (identifiant URL) : Généré automatiquement. Important pour les liens directs et le référencement.
   - **Description** : Texte décrivant la catégorie (affiché sur la page de la collection sur le site).
   - **Image mise en avant** : Photo ou illustration représentant la catégorie.
   - **Collection parente** : Si vous créez une sous-catégorie, sélectionnez ici la collection parent. Laissez vide pour créer une collection racine.
   - **Privée** : Si cochée, cette collection ne s'affiche pas dans le menu de navigation client. Utile pour des collections internes utilisées par des règles CMS ou des filtres sans exposition directe.
   - **Facettes autorisées** (champ personnalisé Ahizan, géré via le plugin Collection Facet Map) : La liste des filtres que les vendeurs peuvent utiliser pour classer leurs produits dans cette collection. *Ce champ ne doit pas être rempli ici mais via l'onglet dédié "Facettes autorisées" décrit en section 6.*
   - **Filtres de collection** : Définit quels produits apparaissent automatiquement dans cette collection. Il existe deux types de filtres :
     - **Filtre par valeur de facette** : Tous les produits ayant une certaine facette (ex. : couleur=Rouge) sont automatiquement inclus dans cette collection.
     - **Filtre par identifiant de variante** (filtre Ahizan personnalisé) : Incluez des variantes de produits spécifiques dans une collection, indépendamment de leurs facettes.
   - **Hériter les filtres du parent** : Si activé, cette collection inclut tous les produits de sa collection parente en plus des siens propres.
3. Cliquez sur **Créer**.

*Effet sur la plateforme :*
- La nouvelle collection apparaît immédiatement dans la navigation du site client si elle est publique.
- Si des filtres sont configurés, les produits correspondants sont automatiquement inclus et affichés dans cette collection.
- Les vendeurs peuvent désormais associer leurs produits à cette collection.

### C. Modifier une collection

1. Cliquez sur la collection dans la liste.
2. Modifiez les champs souhaités.
3. Cliquez sur **Enregistrer**.

*Modifications importantes et leurs effets :*
- Changer le **parent** d'une collection la déplace dans la hiérarchie. Les clients verront la collection au nouveau emplacement dans le menu.
- Changer les **filtres** recalcule immédiatement quels produits appartiennent à cette collection.
- Changer le **slug** casse tous les liens existants vers cette collection. À éviter sauf en cas de besoin impératif.
- Activer/désactiver **Privée** change instantanément la visibilité dans le menu client.

### D. Réorganiser les collections

1. Dans la liste des collections, glissez-déposez les collections pour changer leur ordre d'affichage dans le menu client.
2. L'ordre est pris en compte immédiatement sur le site.

### E. Supprimer une collection

1. Ouvrez la fiche de la collection.
2. Cliquez sur **Supprimer**.
3. Confirmez.

*Attention :* La suppression ne supprime pas les produits associés à cette collection. Les produits restent dans le catalogue mais ne sont plus classés dans cette catégorie. Si la collection avait des sous-collections, celles-ci deviennent orphelines (sans parent).

---

## 5. Gestion du catalogue : Facettes et Filtres

Les facettes sont les critères de filtrage que les clients utilisent pour affiner leur recherche (couleur, taille, marque, matière, etc.). Chaque facette contient des **valeurs** (ex. : Facette "Couleur" → valeurs "Rouge", "Bleu", "Vert").

### A. Consulter les facettes existantes

1. Allez dans **Catalogue → Facettes**.
2. Vous voyez la liste de toutes les facettes avec le nombre de valeurs associées.

### B. Créer une facette

1. Cliquez sur **Créer une facette**.
2. Renseignez :
   - **Nom** (obligatoire) : Le nom visible par les clients (ex. : "Couleur", "Taille", "Marque").
   - **Code** : Identifiant technique interne (généré automatiquement à partir du nom). Important pour l'importation en masse et les règles CMS.
   - **Privée** : Si cochée, cette facette n'est pas visible par les clients mais peut être utilisée par les règles de filtrage internes du CMS.
3. Cliquez sur **Créer**.

### C. Ajouter des valeurs à une facette

Après avoir créé une facette (ou en ouvrant une existante) :
1. Dans l'onglet **Valeurs**, cliquez sur **Ajouter une valeur**.
2. Renseignez le **nom** de la valeur (ex. : "Rouge") et son **code** (ex. : "rouge").
3. Répétez pour toutes les valeurs souhaitées.
4. Cliquez sur **Enregistrer**.

*Effet sur la plateforme :*
- Les nouvelles valeurs apparaissent immédiatement dans les filtres du site client dans les collections qui ont cette facette comme autorisée.
- Les vendeurs peuvent désormais classer leurs produits avec cette valeur.
- Si des règles CMS utilisent cette facette, les sections concernées se mettent à jour automatiquement.

### D. Modifier une facette ou ses valeurs

1. Ouvrez la facette dans la liste.
2. Modifiez le nom ou ajoutez/supprimez des valeurs.
3. Enregistrez.

*Attention :* Renommer une valeur de facette modifie ce qui est affiché aux clients dans les filtres. Les produits déjà associés à cette valeur restent associés (seul le libellé change, pas l'association).

### E. Supprimer une facette

1. Ouvrez la facette.
2. Cliquez sur **Supprimer**.

*Attention :* Supprimer une facette la retire de tous les produits qui l'utilisaient. Elle disparaît des filtres du site client. Cette action est irréversible.

---

## 6. Association Facettes ↔ Collections (Collection Facet Map)

Ce plugin Ahizan est l'un des plus importants pour la qualité du catalogue. Il permet de contrôler quelles facettes (filtres) sont disponibles dans chaque collection. Cela garantit que les vendeurs ne peuvent pas classer un vêtement avec une facette "Capacité en litres" par exemple.

### A. Pourquoi ce système est essentiel

Sans ce plugin, tous les filtres seraient disponibles pour tous les produits dans toutes les catégories, créant une confusion dans le catalogue. Grâce à ce plugin :
- Chaque collection a une liste de **facettes autorisées**.
- Quand un vendeur crée ou modifie un produit dans une collection, seules les facettes autorisées de cette collection lui sont proposées.
- Si un produit est ajouté à une collection, les facettes de cette collection lui sont automatiquement héritées (si la configuration le prévoit).

### B. Consulter les associations actuelles

1. Allez dans **Catalogue → Associations Facettes** (ou via l'onglet **Facettes autorisées** dans la fiche d'une collection).
2. Vous voyez un arbre représentant toutes les collections et, pour chacune, la liste des facettes autorisées.
3. Les facettes héritées du parent sont affichées distinctement des facettes propres à cette collection.

### C. Définir les facettes autorisées d'une collection

**Méthode individuelle :**
1. Allez dans **Catalogue → Collections**.
2. Ouvrez la collection souhaitée.
3. Cliquez sur l'onglet **Facettes autorisées**.
4. Cochez ou décochez les facettes à autoriser pour cette collection.
5. Cliquez sur **Enregistrer**.

**Méthode en masse (plusieurs collections à la fois) :**
1. Allez dans **Catalogue → Associations Facettes**.
2. Sélectionnez plusieurs collections (cases à cocher).
3. Cliquez sur **Définir les facettes pour la sélection**.
4. Choisissez les facettes et validez.

*Effet sur la plateforme :*
- Les vendeurs qui créent des produits dans cette collection ne voient que les facettes autorisées dans leur interface.
- Les filtres disponibles sur le site client pour cette collection se mettent à jour immédiatement.
- Les sous-collections héritent automatiquement des facettes autorisées de leur parent (sauf si une configuration différente leur est définie en propre).

### D. Héritage parent-enfant des facettes

Lorsqu'une collection parent a les facettes "Couleur" et "Taille" autorisées, toutes ses sous-collections héritent de ces deux facettes. Si vous ajoutez une facette "Marque" à une sous-collection spécifique, cette sous-collection aura alors "Couleur", "Taille" ET "Marque".

Cette hiérarchie permet de définir des filtres communs au niveau supérieur et des filtres spécialisés au niveau inférieur.

### E. Configuration du tableau de bord vendeur

Via le même module, l'administrateur peut activer ou désactiver l'affichage de la page **Portefeuille** dans le portail vendeur :
1. Dans **Associations Facettes**, cherchez le paramètre **Activer la page Portefeuille**.
2. Activez ou désactivez selon la politique de la plateforme.

*Effet :* Si désactivé, les vendeurs ne voient plus l'onglet "Portefeuille" dans leur interface mais les opérations de portefeuille continuent de fonctionner en arrière-plan.

---

## 7. Importation en masse (Bulk Import Excel)

Ce plugin permet d'importer des centaines de collections, facettes et valeurs de facettes en une seule opération en chargeant un fichier Excel structuré. C'est particulièrement utile lors de la création initiale du catalogue ou d'une refonte majeure des catégories.

### A. Format du fichier Excel

Le fichier Excel doit contenir exactement **trois feuilles (onglets)** nommés :

**Feuille 1 : "Collections"**

| Colonne | Description | Obligatoire |
|---|---|---|
| `name` | Nom de la collection en français | Oui |
| `nameEn` | Nom en anglais | Non |
| `slug` | Identifiant URL unique (sans espaces ni caractères spéciaux) | Oui |
| `parentSlug` | Slug de la collection parente (laisser vide si collection racine) | Non |
| `description` | Description de la collection en français | Non |
| `descriptionEn` | Description en anglais | Non |
| `featuredAssetUrl` | URL d'une image existante dans le système | Non |
| `position` | Ordre d'affichage | Non |
| `allowedFacetCodes` | Codes des facettes autorisées, séparés par des virgules | Non |
| `facetValueCodes` | Codes des valeurs de facettes pour filtrer les produits automatiquement | Non |
| `variantIds` | Identifiants de variantes pour inclusion directe, séparés par virgules | Non |
| `inheritFilters` | `true` ou `false` — hériter les filtres du parent (défaut : `true`) | Non |
| `isPrivate` | `true` ou `false` — rendre la collection privée (défaut : `false`) | Non |

**Feuille 2 : "Facets"**

| Colonne | Description | Obligatoire |
|---|---|---|
| `code` | Identifiant unique de la facette | Oui |
| `name` | Nom en français | Oui |
| `nameEn` | Nom en anglais | Non |
| `isPrivate` | `true` ou `false` | Non |

**Feuille 3 : "Facet Values"**

| Colonne | Description | Obligatoire |
|---|---|---|
| `facetCode` | Code de la facette parente (doit correspondre à une facette existante ou créée dans la feuille Facets) | Oui |
| `code` | Identifiant unique de la valeur | Oui |
| `name` | Nom en français | Oui |
| `nameEn` | Nom en anglais | Non |

### B. Réaliser l'importation

1. Allez dans **Catalogue → Importation en masse**.
2. Cliquez sur **Choisir un fichier** et sélectionnez votre fichier Excel (.xlsx).
3. Cliquez sur **Analyser le fichier** : le système valide le format et affiche un résumé de ce qui sera créé (nombre de collections, facettes, valeurs).
4. Si des erreurs sont détectées (colonne manquante, slug en double, code de facette inexistant), elles sont listées en rouge avec le numéro de ligne correspondant.
5. Corrigez les erreurs dans le fichier Excel, rechargez-le et réanalysez.
6. Une fois aucune erreur détectée, cliquez sur **Lancer l'importation**.
7. Un rapport s'affiche à la fin avec :
   - Nombre de collections créées / mises à jour
   - Nombre de facettes créées / mises à jour
   - Nombre de valeurs de facettes créées / mises à jour
   - Liste des erreurs restantes (s'il y en a)

### C. Comportement lors de l'importation

- Si une collection avec le même **slug** existe déjà, elle est **mise à jour** (pas dupliquée).
- Si une facette avec le même **code** existe déjà, elle est **mise à jour**.
- Les collections sont toujours créées dans l'ordre parent → enfant, même si elles sont dans le désordre dans le fichier Excel.
- Les images référencées par `featuredAssetUrl` doivent déjà exister dans le gestionnaire d'actifs. Les URLs externes ne sont pas téléchargées automatiquement.

*Effet sur la plateforme :*
- Toutes les collections importées sont immédiatement disponibles pour les vendeurs lors de la création de produits.
- Les facettes et valeurs importées sont immédiatement disponibles pour les filtres et pour les règles CMS.
- Les associations facettes-collections définies dans `allowedFacetCodes` sont appliquées automatiquement via le plugin Collection Facet Map.

---

## 8. Gestion des Vendeurs (Plugin Multivendeur)

Le plugin multivendeur est le cœur opérationnel d'Ahizan. Il gère l'inscription, la validation, la suspension, le suivi financier et les interactions avec chaque boutique partenaire.

### A. Consulter la liste des vendeurs

1. Dans le menu, cliquez sur **Vendeurs**.
2. La liste affiche :
   - Nom de la boutique
   - Email et téléphone
   - Statut (En attente / Approuvé / Rejeté / Suspendu)
   - Type de vendeur (Particulier / Entreprise, etc.)
   - Note moyenne
   - Taux de commission appliqué
   - Solde du portefeuille
   - Date d'inscription
3. **Filtres disponibles** :
   - Par statut (En attente, Approuvé, etc.)
   - Par zone géographique
   - Par email ou téléphone
   - Par type de vendeur
   - Par plage de dates
4. **Tris disponibles** :
   - Par date de création (plus récent ou plus ancien)
   - Par nom alphabétique
   - Par note
   - Par taux de commission
5. **Tri géographique** : En fournissant une latitude et longitude dans les filtres avancés, les vendeurs sont triés par proximité physique de ce point.

### B. Fiche détaillée d'un vendeur

Cliquez sur un vendeur pour accéder à sa fiche complète. Celle-ci contient plusieurs sections :

**Informations générales :**
- Nom de la boutique
- Prénom et nom du propriétaire
- Email, numéro de téléphone
- Adresse physique
- Description de la boutique
- Site web, Facebook, Instagram
- Logo et image de couverture

**Informations légales :**
- Numéro RCCM (Registre du Commerce)
- Numéro IFU (Identifiant Fiscal Unique)
- Numéro de carte d'identité
- Documents téléchargés (scans des justificatifs)

**Informations financières :**
- Taux de commission (peut être différent du taux global de la plateforme)
- Solde du portefeuille en temps réel
- Méthode de paiement (Mobile Money ou virement bancaire)
- Numéro de Mobile Money ou coordonnées bancaires

**Géolocalisation :**
- Latitude et longitude du vendeur
- Zone géographique (GeoZone) rattachée
- Marché physique principal
- Marchés secondaires

**Statistiques :**
- Nombre de produits
- Nombre d'abonnés (likes)
- Note et nombre d'évaluations

**Champs dynamiques (dynamicDetails) :**
Informations supplémentaires définies lors de l'inscription via le formulaire dynamique (voir section 9).

### C. Approuver un vendeur

1. Ouvrez la fiche du vendeur.
2. Vérifiez ses informations légales et ses documents.
3. Cliquez sur **Approuver**.
4. Confirmez.

*Effets immédiats :*
- Le statut du vendeur passe à **Approuvé**.
- Ses produits (s'il en a déjà créé) sont mis en file d'attente de validation et peuvent être publiés.
- Une notification SMS et/ou email est envoyée automatiquement au vendeur pour l'informer de son approbation.
- Le vendeur peut désormais se connecter à son portail et accéder à toutes les fonctionnalités.

*Option d'approbation automatique :* Si l'option **Approbation automatique des vendeurs** est activée dans les Paramètres de la Plateforme (section 23), les nouveaux vendeurs sont approuvés immédiatement à la soumission de leur dossier, sans intervention manuelle.

### D. Rejeter un vendeur

1. Ouvrez la fiche du vendeur.
2. Cliquez sur **Rejeter**.
3. Saisissez obligatoirement le **motif du rejet** dans le champ qui apparaît (ex. : "Photo de la carte d'identité floue — veuillez soumettre une photo plus nette").
4. Confirmez.

*Effets :*
- Le statut passe à **Rejeté**.
- Le vendeur reçoit une notification avec le motif du rejet.
- Sur son portail, le vendeur voit le motif et peut corriger sa fiche et soumettre à nouveau.
- Ses produits restent dans le système mais restent désactivés.

### E. Suspendre un vendeur

1. Ouvrez la fiche du vendeur.
2. Cliquez sur **Suspendre**.
3. Saisissez le **motif de la suspension** (ex. : "Signalements répétés pour produits non conformes").
4. Confirmez.

*Effets immédiats :*
- Le statut passe à **Suspendu**.
- Tous les produits du vendeur sont immédiatement retirés du site client (désactivés).
- Le vendeur peut toujours se connecter à son portail mais ne peut plus créer ou modifier des produits ni traiter des commandes.
- Une notification est envoyée au vendeur avec le motif.

### F. Réactiver un vendeur suspendu

1. Ouvrez la fiche du vendeur suspendu.
2. Cliquez sur **Réactiver**.
3. Confirmez.

*Effets :*
- Le statut passe à **Approuvé**.
- Les produits précédemment actifs avant la suspension sont remis en ligne.
- Le vendeur retrouve l'accès complet à son portail.

### G. Créer un vendeur depuis l'admin

L'admin peut créer directement un compte vendeur :
1. Dans la liste des vendeurs, cliquez sur **Créer un vendeur**.
2. Renseignez tous les champs (nom, email, téléphone, adresse, documents légaux, coordonnées bancaires, géolocalisation, etc.).
3. Définissez son statut initial (En attente ou Approuvé directement).
4. Cliquez sur **Créer**.

*Usage typique :* Créer des vendeurs pilotes pour tester le système avant l'ouverture publique, ou onboarder manuellement des vendeurs partenaires stratégiques.

### H. Modifier le profil d'un vendeur

1. Ouvrez la fiche du vendeur.
2. Modifiez les champs souhaités (nom, contacts, informations légales, images, géolocalisation, marchés, etc.).
3. Vous pouvez également modifier le **taux de commission** spécifique à ce vendeur, qui prend la priorité sur le taux global de la plateforme.
4. Cliquez sur **Enregistrer**.

### I. Supprimer définitivement un vendeur

1. Ouvrez la fiche du vendeur.
2. Faites défiler vers le bas jusqu'à la **Zone Danger**.
3. Choisissez les options :
   - **Supprimer ses produits** : Oui/Non
   - **Supprimer ses commandes** : Oui/Non
4. Saisissez le nom exact du vendeur dans le champ de confirmation.
5. Cliquez sur **Supprimer définitivement**.

*Attention :* Cette action est irréversible. Il est fortement recommandé de suspendre plutôt que de supprimer pour conserver l'historique.

---

## 9. Formulaire d'inscription dynamique (Page Inscription)

Ce plugin permet à l'administrateur de créer un formulaire d'inscription entièrement personnalisé que les vendeurs doivent remplir lors de leur demande d'adhésion. L'administrateur peut ainsi collecter exactement les informations dont il a besoin.

### A. Consulter les champs existants

1. Allez dans **Paramètres → Champs d'inscription** (ou **Registration Fields**).
2. Vous voyez la liste de tous les champs du formulaire d'inscription avec leur type, ordre et état (activé/désactivé).

### B. Créer un nouveau champ

1. Cliquez sur **Créer un champ**.
2. Renseignez :
   - **Nom interne** : Identifiant technique du champ (sans espaces). Ex. : `annee_experience`.
   - **Libellé** : Ce que le vendeur voit sur le formulaire. Ex. : "Depuis combien d'années exercez-vous ?".
   - **Type de champ** :
     - **Texte court** (`text`) : Une ligne de texte. Usage : nom de marque, matricule, etc.
     - **Texte long** (`textarea`) : Un grand bloc de texte. Usage : description d'activité.
     - **Nombre** (`number`) : Un nombre entier ou décimal. Usage : années d'expérience, capacité de stock.
     - **Sélection unique** (`select`) : Un menu déroulant. Ex. : "Secteur d'activité" avec les options "Alimentation", "Électronique", "Mode", etc.
     - **Sélection multiple** (`multiselect`) : Des cases à cocher. Ex. : "Marchés où vous opérez".
     - **Case à cocher** (`checkbox`) : Oui/Non. Ex. : "Acceptez-vous les conditions générales ?".
     - **Date** (`date`) : Un sélecteur de date.
     - **Fichier** (`file`) : Téléchargement de document (PDF, image). Usage : licence commerciale, attestation.
     - **Position GPS** (`gps`) : Permet d'afficher un bouton "Détecter ma position" pour enregistrer les coordonnées GPS du vendeur.
   - **Options** (pour select et multiselect) : Ajoutez chaque option avec un libellé et une valeur.
   - **Obligatoire** : Si coché, le vendeur ne peut pas soumettre le formulaire sans remplir ce champ.
   - **Ordre** : Position dans le formulaire (1 = premier, 2 = deuxième, etc.).
   - **Description** : Texte d'aide affiché sous le champ pour guider le vendeur.
   - **Texte d'exemple (placeholder)** : Texte grisé affiché dans le champ avant que le vendeur ne saisisse.
   - **Configuration de validation** (pour les champs fichier et texte) :
     - Taille maximale du fichier (en octets)
     - Types de fichiers acceptés (ex. : image/jpeg, application/pdf)
     - Longueur minimale / maximale du texte
     - Afficher le bouton de détection GPS (pour le type GPS)
3. Cliquez sur **Créer**.

*Effet sur la plateforme :* Le nouveau champ apparaît immédiatement dans le formulaire d'inscription du portail vendeur. Il est également visible dans la fiche de chaque vendeur sous la section "Informations complémentaires", permettant à l'admin de consulter les réponses.

### C. Modifier un champ d'inscription

1. Cliquez sur le champ dans la liste.
2. Modifiez les paramètres souhaités.
3. Cliquez sur **Enregistrer**.

*Attention :* Modifier un champ existant (surtout ses options ou son type) peut créer des incohérences avec les réponses déjà soumises par les vendeurs.

### D. Désactiver / Supprimer un champ

- **Désactiver** (`enabled = false`) : Le champ disparaît du formulaire mais les réponses historiques sont conservées.
- **Supprimer** : Supprime le champ et toutes les réponses associées. Action irréversible.

### E. Consulter les réponses d'un vendeur

1. Ouvrez la fiche du vendeur.
2. Scrollez vers la section **Informations complémentaires**.
3. Toutes les réponses que le vendeur a soumises lors de son inscription sont affichées champ par champ.

*Usage :* Permet de vérifier les certifications, licences et informations spécifiques que vous avez demandées lors de l'inscription.

---

## 10. Gestion des Commandes et Logistique

La gestion des commandes dans Ahizan combine le système natif de commandes Vendure avec les extensions multivendeurs d'Ahizan. Chaque commande peut impliquer plusieurs vendeurs (sous-commandes).

### A. Consulter la liste des commandes

1. Cliquez sur **Commandes** dans le menu.
2. La liste affiche toutes les commandes avec :
   - Numéro de commande
   - Client (nom et email)
   - Montant total
   - État Vendure (Actif, PaymentSettled, Livré, Annulé, etc.)
   - Statut vendeur agrégé (En attente, Confirmé, Réassignement, etc.)
   - Statut admin agrégé (En cours de livraison, Livré, Annulé, etc.)
   - Date de création
3. Utilisez les **filtres** pour trouver des commandes par :
   - Numéro de commande
   - Client
   - État
   - Plage de dates
   - Vendeur impliqué

### B. Cycle de vie d'une commande sur Ahizan

Une commande passe par plusieurs étapes :

**Étape 1 — Soumission :** Le client passe la commande et choisit le paiement à la livraison. La commande est créée avec l'état **"En attente"** (pending).

**Étape 2 — Confirmation vendeur :** Chaque vendeur impliqué dans la commande reçoit une notification. Il doit accepter ou refuser les lignes qui le concernent.
- Si le vendeur accepte : son sous-statut passe à **"En préparation"** (preparing).
- Si le vendeur refuse : son sous-statut passe à **"Réassignement"** (reassigning).

**Étape 3 — Suivi admin :** Une fois les vendeurs confirmés, l'administrateur gère la logistique de livraison :
- **"Expédiée"** (shipped) : La commande a quitté le vendeur.
- **"En cours de livraison"** (in_transit) : Le livreur est en route.
- **"Livrée"** (delivered) : La commande a été remise au client.
- **"Annulée"** (cancelled) : La commande est annulée à ce stade.

### C. Ouvrir le détail d'une commande

1. Cliquez sur une commande dans la liste.
2. Vous voyez :
   - **Informations client** : Nom, email, adresse de livraison.
   - **Lignes de commande** : Chaque produit commandé avec son nom, quantité, prix unitaire, prix total et le vendeur associé.
   - **Sous-totaux par vendeur** : Montant dû à chaque vendeur impliqué.
   - **Frais de livraison** : Calculés selon la zone géographique du client et la méthode d'expédition.
   - **Total général** de la commande.
   - **Promotions appliquées** (si des promotions étaient actives).
   - **Statuts détaillés** par vendeur : Pour chaque vendeur, son statut individuel (confirme, prépare, expédié, etc.).
   - **Paiement vendeur** : Indique si le montant a été versé au vendeur ou non.

### D. Mettre à jour le statut admin d'une commande

L'administrateur peut changer le statut de livraison d'une commande :
1. Dans le détail de la commande, trouvez le panneau **Statut de livraison**.
2. Cliquez sur **Changer le statut**.
3. Sélectionnez le nouveau statut (Expédiée, En cours de livraison, Livrée, Annulée).
4. Vous pouvez optionnellement cibler un **vendeur spécifique** (pour mettre à jour seulement le statut de sa sous-commande).
5. Confirmez.

*Effet :* Le statut est mis à jour dans le système. Le client et le vendeur concerné reçoivent une notification automatique.

### E. Réassigner une commande à un autre vendeur

Quand un vendeur refuse une commande ou est incapable de la traiter, l'admin peut réassigner les produits commandés à un autre vendeur :

**Réassignment d'une sous-commande entière :**
1. Dans le détail de la commande, trouvez la sous-commande du vendeur qui a refusé.
2. Cliquez sur **Réassigner à un autre vendeur**.
3. Sélectionnez le nouveau vendeur dans la liste déroulante.
4. Confirmez.

*Effet :* Tous les produits de la sous-commande sont transférés au nouveau vendeur. Les statuts sont mis à jour. Les deux vendeurs (ancien et nouveau) reçoivent une notification.

**Réassignment d'une ligne de commande spécifique à un autre produit :**
1. Dans le détail de la commande, cliquez sur la ligne à modifier.
2. Cliquez sur **Réassigner cette ligne**.
3. Vous pouvez :
   - Sélectionner un **nouveau produit existant** dans le catalogue.
   - Ou saisir un **nouveau nom de produit** et **prix** manuellement.
4. Sélectionnez le **vendeur** qui traitera cette ligne.
5. Confirmez.

*Usage :* Utile si le produit exact n'est plus disponible mais qu'un équivalent existe chez un autre vendeur.

### F. Accepter la commande après le refus d'un vendeur

Lorsqu'un vendeur a refusé sa partie et que le client souhaite continuer la commande sans ce vendeur :
1. Dans le détail de la commande, cliquez sur **Continuer sans le vendeur refusant**.
2. Les produits du vendeur refusant sont retirés de la commande.
3. Le total est recalculé automatiquement (produits restants + livraison).
4. La commande continue son cycle avec les autres vendeurs.

### G. Marquer le paiement vendeur

1. Dans le détail de la commande, trouvez le panneau du vendeur.
2. Cliquez sur **Marquer comme payé**.
3. Confirmez.

*Effet :* Le champ "Paiement vendeur" passe à "Payé". Cela déclenche un crédit automatique du montant (montant total de la sous-commande moins la commission) dans le portefeuille du vendeur.

### H. Supprimer une commande (admin)

1. Dans le détail d'une commande, cliquez sur **Supprimer la commande**.
2. Confirmez.

*Attention :* Supprimer une commande est irréversible. À n'utiliser que pour des commandes de test ou manifestement frauduleuses.

### I. Annuler la commande d'un client

1. Dans le détail de la commande, cliquez sur **Annuler la commande**.
2. Confirmez.

*Effet :* Le statut passe à "Annulé". Les stocks sont restaurés automatiquement pour chaque vendeur impliqué. Des notifications sont envoyées au client et aux vendeurs.

---

## 11. Gestion Financière : Portefeuilles, Commissions et Retraits

### A. Fonctionnement des commissions

Ahizan prélève une commission sur chaque vente réalisée par les vendeurs. Deux modes de commission sont disponibles :

**Mode GÉNÉRAL :**
Un taux de commission unique s'applique à toutes les ventes de tous les vendeurs. Ce taux est défini dans les **Paramètres de la Plateforme** (section 23).

**Mode PAR COLLECTION :**
Des taux de commission différents sont définis selon la collection du produit vendu. Exemple : 10% sur les produits Alimentation, 15% sur l'Électronique. Ce mode permet une tarification plus précise et équitable selon les marges des différents secteurs.

La sélection du mode se fait dans **Paramètres de la Plateforme → Mode de commission**.

### B. Taux de commission spécifique à un vendeur

Si un vendeur a un accord commercial spécial, l'administrateur peut lui définir un taux personnalisé :
1. Ouvrez la fiche du vendeur.
2. Modifiez le champ **Taux de commission**.
3. Enregistrez.

*Ce taux prend la priorité absolue sur le taux global de la plateforme et sur les taux par collection.*

### C. Le portefeuille (Wallet)

Chaque vendeur possède un portefeuille virtuel dans Ahizan. Ce portefeuille :
- Reçoit le montant des ventes (montant total - commission) lorsqu'une commande est marquée comme payée par l'admin.
- Peut être débité lors du traitement de demandes de retrait.

**Consulter le solde :** Le solde est visible directement dans la fiche du vendeur, champ **Solde du portefeuille**.

### D. Créditer manuellement un portefeuille

1. Ouvrez la fiche du vendeur.
2. Cliquez sur **Créditer le portefeuille**.
3. Saisissez le **montant** à ajouter (en francs CFA).
4. Saisissez une **note** (ex. : "Correction suite à erreur de commission du 15/08/2026").
5. Confirmez.

*Effet :* Le solde du portefeuille augmente immédiatement. L'opération est journalisée.

### E. Débiter manuellement un portefeuille

1. Ouvrez la fiche du vendeur.
2. Cliquez sur **Débiter le portefeuille**.
3. Saisissez le **montant** à retirer.
4. Saisissez une **note**.
5. Confirmez.

*Effet :* Le solde du portefeuille diminue. Utilisé pour les corrections comptables, frais administratifs, ou remboursements.

### F. Autoriser un solde négatif

Par défaut, un vendeur dont le solde est à zéro ne peut pas avoir de débit supplémentaire. Pour les vendeurs de confiance :
1. Ouvrez la fiche du vendeur.
2. Activez **Autoriser le solde négatif**.
3. Enregistrez.

*Usage :* Permet à un vendeur d'avancer des frais ou de bénéficier d'une avance commerciale. Le solde peut descendre en dessous de zéro.

### G. Gestion des demandes de retrait

Les vendeurs peuvent demander un virement de leur solde via leur portail. Ces demandes apparaissent dans l'admin :
1. Allez dans **Finance → Demandes de retrait**.
2. Vous voyez la liste de toutes les demandes avec :
   - Nom du vendeur
   - Montant demandé
   - Méthode de paiement (Mobile Money ou virement)
   - Numéro de compte
   - Statut (En attente / Approuvé / Rejeté)
   - Date de la demande
3. Pour chaque demande, deux actions sont possibles :

   **Approuver le retrait :**
   1. Cliquez sur la demande.
   2. Effectuez le virement réel via votre outil bancaire ou Mobile Money.
   3. Cliquez sur **Approuver** et saisissez la **référence du transfert** si disponible.
   4. Confirmez.

   *Effet :* Le solde du portefeuille du vendeur est débité du montant demandé. Le statut de la demande passe à "Approuvé". Le vendeur reçoit une notification.

   **Rejeter un retrait :**
   1. Cliquez sur la demande.
   2. Cliquez sur **Rejeter**.
   3. Saisissez le **motif du rejet** (ex. : "Informations bancaires incorrectes").
   4. Confirmez.

   *Effet :* Le solde du portefeuille n'est pas débité. Le vendeur est notifié avec le motif du rejet.

---

## 12. Statuts de commande personnalisés

Ahizan offre un système de statuts de commande entièrement personnalisable. Les statuts par défaut sont : En attente, Confirmée, En préparation, Expédiée, En cours de livraison, Livrée, Annulée. L'administrateur peut modifier, créer ou supprimer des statuts.

### A. Consulter les statuts

1. Allez dans **Paramètres → Statuts de commande**.
2. Vous voyez la liste de tous les statuts dans l'ordre d'affichage, avec leur couleur et leur configuration.

### B. Créer un nouveau statut

1. Cliquez sur **Créer un statut**.
2. Renseignez :
   - **Code** : Identifiant interne unique (ex. : `en_verification`). Sans espaces.
   - **Libellé** : Ce que les utilisateurs voient (ex. : "En vérification").
   - **Couleur** : Code hexadécimal de couleur pour la pastille de statut (ex. : `#F59E0B` pour orange).
   - **Ordre** : Position dans la séquence logique (1 = premier, 10 = dernier).
   - **Vendeur peut définir ce statut** : Si activé, les vendeurs peuvent eux-mêmes passer une commande à ce statut depuis leur portail.
   - **Statut final** : Si activé, aucun changement de statut n'est possible après ce statut (ex. "Livrée" ou "Annulée").
   - **Activé** : Si désactivé, ce statut n'apparaît plus dans les listes de sélection.
3. Cliquez sur **Créer**.

### C. Modifier un statut

1. Cliquez sur le statut dans la liste.
2. Modifiez les champs souhaités.
3. Enregistrez.

*Attention :* Modifier le **code** d'un statut peut créer des incohérences avec les commandes existantes qui utilisent cet ancien code.

### D. Supprimer un statut

1. Cliquez sur le statut.
2. Cliquez sur **Supprimer**.

*Attention :* Ne supprimez pas un statut qui est utilisé par des commandes en cours.

### E. Permissions vendeur sur les statuts

Par défaut :
- Les vendeurs **peuvent** définir : En préparation, Annulée.
- Les vendeurs **ne peuvent pas** définir : En attente, Confirmée, Expédiée, En cours de livraison, Livrée.

Cette configuration garantit que la logistique (expédition, livraison) reste sous le contrôle exclusif de l'admin.

---

## 13. Moteur Géographique (Geo Engine)

Le Geo Engine est l'un des modules les plus puissants d'Ahizan. Il permet de cartographier précisément les zones géographiques, les marchés physiques et les zones de livraison. Il influence directement le contenu affiché aux clients sur le site (sections CMS géolocalisées), les frais de livraison calculés, et la pertinence des vendeurs affichés.

### A. Les GeoZones (Zones Géographiques)

Les GeoZones forment une hiérarchie représentant la géographie administrative : Pays → Département → Commune → Arrondissement → Quartier.

**Consulter les GeoZones :**
1. Allez dans **Géographie → Zones géographiques**.
2. Vous voyez un arbre hiérarchique de toutes les zones.

**Créer une GeoZone :**
1. Cliquez sur **Créer une zone**.
2. Renseignez :
   - **Nom** (obligatoire)
   - **Slug** : Identifiant URL
   - **Code** : Code court de référence (ex. : "BJ" pour Bénin, "COT" pour Cotonou)
   - **Type** : pays / département / commune / arrondissement / quartier
   - **Statut** : Active ou inactive
   - **Latitude du centre** et **Longitude du centre** : Point central de la zone
   - **Rayon (mètres)** : Rayon de couverture si la zone est définie par cercle
   - **Délimitation (boundary)** : Polygone précis des frontières de la zone au format JSON. Peut être importé automatiquement depuis OpenStreetMap (voir ci-dessous).
   - **Zone parente** : La zone géographique qui contient celle-ci.
   - **Image, Bannière, Icône** : Visuels représentant cette zone sur le site client.
   - **SEO** : Titre, description et URL pour le référencement naturel de la page de cette zone sur le site client.
3. Cliquez sur **Créer**.

**Importer les frontières depuis OpenStreetMap :**
Pour remplir automatiquement le polygone de délimitation d'une zone existante :
1. Ouvrez la fiche d'une GeoZone.
2. Cliquez sur **Importer depuis OpenStreetMap**.
3. Saisissez le nom de la zone tel qu'il apparaît sur OSM (ex. : "Cotonou, Bénin").
4. Confirmez. Le polygone est téléchargé et enregistré automatiquement.

**Importer des données en masse :**
Pour créer plusieurs GeoZones d'un coup :
1. Dans la liste des zones, cliquez sur **Importation en masse**.
2. Choisissez le **format** (JSON ou CSV) et le **type** de données.
3. Collez ou téléchargez votre fichier.
4. Lancez l'importation. Un rapport indique le nombre de zones créées ou mises à jour.

**Fusionner des zones :**
Si deux zones doublons existent et doivent être combinées :
1. Dans la liste, sélectionnez les zones à fusionner.
2. Cliquez sur **Fusionner**.
3. Saisissez le nom de la zone résultante.
4. Confirmez. Une seule zone est conservée avec les données combinées.

**Diviser une zone :**
Pour créer plusieurs sous-zones depuis une zone existante :
1. Ouvrez la zone.
2. Cliquez sur **Diviser en sous-zones**.
3. Listez les noms des nouvelles zones.
4. Confirmez. Les nouvelles sous-zones sont créées avec la zone d'origine comme parent.

**Supprimer une zone :**
1. Ouvrez la zone.
2. Cliquez sur **Supprimer**.
3. Confirmez.
*Attention :* Les zones rattachées à des vendeurs, marchés ou zones de livraison ne peuvent pas être supprimées sans avoir d'abord réassigné ces associations.

### B. Les Marchés (Markets)

Les marchés représentent des lieux commerciaux physiques (ex. : Marché Dantokpa, Marché Missèbo, Mall). Chaque marché est rattaché à une GeoZone.

**Consulter les marchés :**
1. Allez dans **Géographie → Marchés**.
2. La liste affiche tous les marchés avec leur zone associée, les statistiques d'activité, et les horaires d'ouverture.

**Créer un marché :**
1. Cliquez sur **Créer un marché**.
2. Renseignez :
   - **Nom** (obligatoire)
   - **Slug** : Identifiant URL
   - **Description** : Texte décrivant le marché pour les clients
   - **Image** et **Icône** : Visuels du marché
   - **Latitude, Longitude, Rayon** : Localisation géographique du marché
   - **Zone géographique** (GeoZone) : La zone administrative dans laquelle se trouve ce marché
   - **Facettes autorisées** : Les catégories de produits vendus dans ce marché (liste d'identifiants de facettes). Permet au site client d'afficher les produits pertinents pour ce marché.
   - **Horaires d'ouverture** : JSON définissant les horaires par jour de semaine (ex. : Lundi 8h-18h, Samedi 8h-13h, Dimanche fermé).
3. Cliquez sur **Créer**.

*Effet sur la plateforme :* Les vendeurs peuvent être associés à un marché principal et à des marchés secondaires. Le site client peut afficher les produits et vendeurs d'un marché spécifique. Le moteur CMS peut générer des pages dédiées à chaque marché.

**Modifier un marché :**
1. Ouvrez le marché.
2. Modifiez les champs.
3. Enregistrez.

**Supprimer un marché :**
1. Ouvrez le marché.
2. Cliquez sur **Supprimer**.

### C. Les Zones de Livraison (Delivery Zones)

Les zones de livraison définissent les tarifs de livraison selon la localisation du client. Elles peuvent appartenir à la plateforme (global) ou à un vendeur spécifique.

**Créer une zone de livraison :**
1. Allez dans **Géographie → Zones de livraison**.
2. Cliquez sur **Créer une zone**.
3. Renseignez :
   - **Propriétaire** : "plateforme" pour une zone globale, ou l'identifiant d'un vendeur pour une zone vendeur.
   - **Nom** : Ex. : "Livraison Cotonou Centre"
   - **Prix de base** : Tarif fixe en francs CFA
   - **Prix maximum** : Plafond si le calcul est dynamique
   - **Type** : Cercle (défini par centre + rayon) ou Polygone (défini par coordonnées)
   - **Latitude, Longitude, Rayon** (pour type Cercle)
   - **Coordonnées du polygone** (pour type Polygone) : JSON de points GPS
   - **Zone géographique** : GeoZone associée
   - **Active** : Oui/Non
4. Cliquez sur **Créer**.

*Effet sur la plateforme :* Lorsqu'un client saisit son adresse lors de la commande, le système Geo Engine identifie sa zone et applique le tarif de livraison correspondant. Si plusieurs zones correspondent, la plus précise (la plus petite) est utilisée en priorité.

**Calcul dynamique des frais de livraison :**
Ahizan dispose de plusieurs calculateurs de livraison :
- **Frais fixes globaux** : Un tarif unique pour toute commande (paramétré dans les Paramètres de la Plateforme).
- **Frais par km** : Calculés selon la distance entre le vendeur et le client (Tarif de base + Tarif/km × distance).
- **Frais par zone** : Tarif défini dans la zone de livraison correspondant à l'adresse du client.

### D. Journaux et Corrections Géographiques

**Journaux de résolution GPS (GeoResolutionLogs) :**
Chaque fois que le système résout une adresse ou des coordonnées GPS en une GeoZone, l'opération est journalisée. Ces journaux permettent de comprendre comment les localisations des clients sont interprétées.
1. Allez dans **Géographie → Journaux**.
2. Vous voyez toutes les résolutions récentes avec :
   - Coordonnées GPS
   - GeoZone identifiée
   - Marché identifié
   - Fournisseur de géocodage utilisé
   - Score de confiance (précision de la résolution)
3. Un faible score de confiance indique que la zone peut être mal identifiée → opportunité de corriger les polygones.

**Corrections utilisateurs :**
Les clients peuvent signaler une mauvaise identification de leur position. Ces signalements apparaissent dans :
1. **Géographie → Corrections utilisateurs**.
2. Pour chaque correction, l'admin peut :
   - **Approuver** : La correction est prise en compte pour améliorer les résolutions futures.
   - **Rejeter** : Le signalement est ignoré.

**Statistiques de couverture :**
1. Allez dans **Géographie → Statistiques de couverture**.
2. Vous voyez un aperçu des zones couvertes, des zones sans marché associé, et des lacunes géographiques à combler.

---

## 14. Moteur d'Expérience et CMS

Le CMS (Content Management System) d'Ahizan est un système avancé permettant de créer et gérer dynamiquement toutes les pages du site client. Il est couplé au moteur géographique pour afficher un contenu personnalisé selon la localisation du visiteur.

### A. Les Pages

Une **Page** est un ensemble de sections organisées qui forment une page du site client (ex. : page d'accueil, page d'un marché, page promotionnelle).

**Consulter les pages :**
1. Allez dans **CMS → Pages**.
2. La liste affiche toutes les pages avec leur slug, titre, type et état (actif/inactif).

**Créer une page :**
1. Cliquez sur **Créer une page**.
2. Renseignez :
   - **Slug** : Identifiant URL de la page (ex. : "home" pour la page d'accueil, "soldes" pour une page de soldes).
   - **Titre** : Titre interne de la page.
   - **Titre SEO** : Titre affiché dans les onglets navigateur et résultats de recherche Google.
   - **Description SEO** : Courte description pour Google (150-160 caractères idéalement).
   - **Mots-clés SEO** : Liste de mots-clés pour le référencement.
   - **Image OG** : Image affichée lors du partage sur les réseaux sociaux.
   - **Image** et **Icône** : Visuels de la page.
   - **Type** : Standard / Marché / Événement, etc.
   - **Active** : Oui/Non
3. Cliquez sur **Créer**.

**Supprimer une page :**
1. Ouvrez la page.
2. Cliquez sur **Supprimer**.
*Attention :* Supprimer la page d'accueil (`home`) affecte l'intégralité du site client.

### B. Les Sections

Une **Section** est un bloc de contenu dans une page. Chaque section a un type qui détermine son comportement et son rendu sur le site.

**Types de sections disponibles :**

| Type | Description |
|---|---|
| `HERO` | Bannière principale en haut de page avec image/vidéo, titre, sous-titre et bouton d'appel à l'action |
| `PRODUCT_CAROUSEL` | Carrousel horizontal de produits |
| `PRODUCT_GRID` | Grille de produits |
| `COLLECTION_GRID` | Grille de catégories |
| `BANNER` | Bannière publicitaire simple |
| `FLASH_SALE` | Compteur et produits en promotion flash |
| `VENDOR_LIST` | Liste ou grille de vendeurs |
| `TEXT_BLOCK` | Bloc de texte riche |
| `MAP` | Carte géographique interactive |
| `CUSTOM` | Section personnalisée libre |

**Créer une section dans une page :**
1. Ouvrez la page.
2. Cliquez sur **Ajouter une section**.
3. Choisissez le type de section.
4. Renseignez :
   - **Titre** : Titre affiché sur le site (ex. : "Produits populaires", "Nos marchés").
   - **Description** : Sous-titre optionnel.
   - **Mise en page (layout)** : La disposition visuelle (grille 2 colonnes, 3 colonnes, carrousel, etc.).
   - **Ordre** : Position dans la page (1 = en haut).
   - **Active** : Oui/Non
   - **Données (dataJson)** : Configuration spécifique au type de section (ex. : liste des produits à inclure, filtres, limites d'affichage).
   - **Règles (rulesJson)** : Règles géographiques et temporelles définissant *quand* et *pour qui* cette section est visible (voir ci-dessous).
   - **Date de début** et **Date de fin** : Pour les sections saisonnières ou temporaires. Passé la date de fin, la section se désactive automatiquement.
5. Cliquez sur **Créer la section**.

**Règles de ciblage (rulesJson) :**
Les règles permettent de personnaliser l'affichage selon le contexte du visiteur :
- **Ciblage géographique** : N'afficher cette section qu'aux visiteurs se trouvant dans une GeoZone spécifique (ex. : uniquement les clients de Cotonou).
- **Ciblage par marché** : N'afficher que si le visiteur est associé à un marché spécifique.
- **Ciblage temporel** : N'afficher qu'à certaines heures de la journée ou certains jours.
- **Ciblage par segment utilisateur** : Afficher uniquement aux nouveaux visiteurs, aux clients récurrents, aux vendeurs, etc.

**Modifier une section :**
1. Ouvrez la page.
2. Cliquez sur la section à modifier.
3. Modifiez les champs et enregistrez.

**Réorganiser les sections :**
Glissez-déposez les sections pour changer leur ordre d'apparition dans la page.

**Activer/Désactiver une section :**
Cliquez sur le bouton bascule à côté d'une section. La section disparaît ou réapparaît immédiatement sur le site client.

**Supprimer une section :**
1. Cliquez sur la section.
2. Cliquez sur **Supprimer**.

### C. Les Préréglages (Presets)

Un préréglage est une configuration de page complète (avec toutes ses sections) que l'on peut sauvegarder et réutiliser. C'est particulièrement utile pour les événements récurrents (Noël, Ramadan, Tabaski).

**Créer un préréglage depuis une page existante :**
1. Ouvrez la page que vous souhaitez sauvegarder.
2. Cliquez sur **Sauvegarder en préréglage**.
3. Saisissez un nom (ex. : "Habillage Noël 2025") et une description.
4. Cliquez sur **Créer**.

**Créer un préréglage depuis zéro :**
1. Allez dans **CMS → Préréglages**.
2. Cliquez sur **Créer un préréglage**.
3. Saisissez le nom, la description et le contenu JSON des sections.
4. Cliquez sur **Créer**.

**Appliquer un préréglage à une page :**
1. Ouvrez la page à modifier.
2. Cliquez sur **Appliquer un préréglage**.
3. Choisissez le préréglage dans la liste.
4. Confirmez.

*Effet :* Les sections de la page sont remplacées par celles du préréglage. L'ancien contenu peut être préservé comme sauvegarde.

**Archiver un préréglage :**
Les préréglages anciens peuvent être archivés pour les conserver sans les afficher dans la liste active.

**Restaurer une version antérieure :**
Chaque préréglage maintient un historique de versions. Pour revenir à une version précédente :
1. Ouvrez le préréglage.
2. Cliquez sur **Restaurer une version précédente**.
3. Sélectionnez la version dans l'historique.

### D. Le Système d'Habillage (Habillage)

L'habillage est un système d'édition en direct permettant de modifier l'apparence du site client sans interrompre le service. C'est l'équivalent d'un "thème saisonnier" qu'on peut activer et désactiver instantanément.

**Créer un habillage instantané :**
1. Allez dans **CMS → Habillages**.
2. Cliquez sur **Créer un habillage**.
3. Saisissez un nom (ex. : "Habillage Noël 2026").
4. L'habillage est créé comme une copie de la page d'accueil actuelle. Vous pouvez la modifier librement.

**Ouvrir et éditer un habillage :**
1. Dans la liste des habillages, cliquez sur **Ouvrir** à côté de l'habillage.
2. Une session d'édition s'ouvre. Modifiez les sections selon vos besoins.
3. Les modifications sont **sauvegardées automatiquement** toutes les quelques minutes (autoSave).

**Prévisualiser un habillage :**
1. Dans l'éditeur, cliquez sur **Prévisualiser**.
2. Une vue du site client s'affiche avec le nouvel habillage sans l'avoir publié.

**Publier un habillage :**
1. Cliquez sur **Publier**.
2. L'habillage est immédiatement appliqué à la page d'accueil du site client.
3. Les visiteurs voient instantanément le nouvel habillage.

**Définir un habillage par défaut :**
1. Dans la liste des habillages, cliquez sur **Définir par défaut** à côté de l'habillage.
2. Cet habillage sera réactivé automatiquement si aucun autre habillage n'est actif.

**Annuler et rétablir des modifications (Undo/Redo) :**
Dans l'éditeur d'habillage, utilisez **Annuler** et **Rétablir** pour naviguer dans l'historique des modifications sans perdre votre travail.

**Sauvegardes :**
Avant chaque publication, le système crée automatiquement une sauvegarde (backup) de la configuration précédente. Vous pouvez revenir à n'importe quelle sauvegarde depuis la liste des habillages.

### E. Saisons et Programmation

**Saisons :**
Une saison est une période définie (ex. : "Été 2026", "Période des fêtes 2026") associée à un préréglage. Quand la saison est active, son préréglage s'applique automatiquement à la page correspondante.

1. Allez dans **CMS → Saisons**.
2. Cliquez sur **Créer une saison**.
3. Renseignez le nom, les dates de début et fin, et le préréglage à utiliser.
4. Activez la saison.

**Programmation de saison (Season Schedule) :**
Pour des événements récurrents ou planifiés à l'avance :
1. Allez dans **CMS → Programmation**.
2. Cliquez sur **Créer une programmation**.
3. Renseignez le nom, les dates et le préréglage associé.
4. Définissez la **priorité** (en cas de chevauchement entre deux programmations, celle avec la priorité la plus haute s'applique).

*Effet :* Le système vérifie régulièrement (toutes les 5 minutes) si une nouvelle saison doit s'activer et applique automatiquement le préréglage correspondant sans intervention manuelle.

### F. Système de brouillon (Draft)

Le système de brouillon permet de préparer et réviser des modifications de page avant de les publier.

**Créer un brouillon depuis une page existante :**
1. Ouvrez la page.
2. Cliquez sur **Créer un brouillon**.
3. Un brouillon de la page actuelle est créé. Vous pouvez le modifier librement sans affecter la version live.

**Modifier un brouillon :**
1. Allez dans **CMS → Brouillons**.
2. Ouvrez votre brouillon.
3. Modifiez les sections une par une.
4. Les modifications sont sauvegardées en temps réel sans publication.

**Publier un brouillon :**
1. Depuis le brouillon, cliquez sur **Publier**.
2. Le brouillon remplace la version live de la page.
3. L'ancien contenu est archivé.

**Sauvegarder un brouillon en préréglage :**
1. Depuis le brouillon, cliquez sur **Sauvegarder en préréglage**.
2. Le brouillon devient un préréglage réutilisable.

### G. Recherche sémantique EMS

Le moteur de recherche CMS (EMS — Experience Management System) permet aux clients de rechercher des produits, collections et marchés avec des termes en langage naturel. L'admin peut consulter les termes recherchés et analyser les résultats.

---

## 15. Gestionnaire de Bannières (Banner Manager)

Le Banner Manager est un module de configuration rapide pour les éléments visuels de la page d'accueil sans passer par l'éditeur CMS complet. Il se divise en plusieurs sections.

### A. Configuration de la Bannière principale

La bannière principale est une bande publicitaire horizontale affichée en haut du site (sous la navigation).

**Configurer la bannière :**
1. Allez dans **Contenu → Bannière principale**.
2. Choisissez le **type de bannière** :
   - **Texte** : Affiche un texte publicitaire simple.
   - **Image** : Affiche une image cliquable.
   - **Vidéo** : Affiche une vidéo en autoplay.
3. Renseignez selon le type choisi :
   - Texte du haut, texte principal, texte du lien
   - URL cible (où le clic redirige)
   - Image desktop (adaptée aux grands écrans)
   - Image mobile (adaptée aux smartphones)
   - URL de la vidéo
4. **Active** : Oui/Non
5. Cliquez sur **Enregistrer**.

### B. Configuration du Héros (Hero)

Le Héros est la grande section visuelle en haut de la page d'accueil après la navigation.

**Choisir le modèle de héros :**
Trois modèles (templates) sont disponibles :
- **Classique** : Grand visuel avec titre, sous-titre, bouton CTA, et une colonne latérale avec des liens d'assistance, WhatsApp et vente.
- **Bento** : Disposition en blocs (style grille bento).
- **Pleine largeur** : Visuel couvrant toute la largeur avec des badges flottants.

**Configurer le modèle Classique :**
- Type de fond : texte coloré / image / vidéo
- URL du fond (image ou vidéo)
- Titre, sous-titre
- Texte et lien du bouton principal
- Couleur du texte (blanc ou noir)
- Section flash ad : titre, pourcentage de réduction, fond couleur/image/vidéo
- Section assistance : titre, description, lien
- Section WhatsApp : titre, description, lien
- Section "Vendre" : titre, description, lien

**Configurer le modèle Bento :**
- Titre et sous-titre principal
- Texte et lien du bouton
- Section flash : titre et description
- Section WhatsApp : titre, description, lien
- Section "Vendre" : titre, description, lien

**Configurer le modèle Pleine largeur :**
- Type de fond (image, vidéo, texte)
- Titre, sous-titre, bouton
- Badges flottants : assistance, WhatsApp, vente (titre, description, lien pour chacun)

### C. Configuration des Flash Sales

Les flash sales sont des ventes promotionnelles à durée limitée avec un compte à rebours.

**Créer une version de Flash Sale :**
1. Allez dans **Contenu → Flash Sales**.
2. Cliquez sur **Créer une version**.
3. Renseignez :
   - **Nom interne** : Pour identification dans l'admin (non visible côté client).
   - **Active** : Oui/Non — seule la version active s'affiche sur le site.
   - **Mode simplifié** : Active un design simplifié de la bannière flash.
   - **Titre** : Affiché sur le site (ex. : "Vente Flash ! -50%").
   - **Sous-titre** : Description courte.
   - **Date/heure de début** et **Date/heure de fin** : Quand le compte à rebours se termine, la flash sale s'arrête automatiquement.
   - **Couleurs** : Couleur de fond, couleur du texte, couleur d'accent.
   - **Image de fond** : Optionnel.
   - **Type de sélection des produits** :
     - **Manuelle** : Saisissez directement les identifiants des produits à inclure.
     - **Filtre** : Les produits sont sélectionnés automatiquement selon des critères :
       - Prix minimum / maximum
       - Valeurs de facettes (ex. : catégorie=Électronique)
       - Collection(s)
       - Remise minimum (ex. : uniquement les produits avec au moins 20% de réduction)
       - Uniquement en stock
       - Nombre maximum de produits à afficher
4. Cliquez sur **Enregistrer**.

*Seulement une version peut être active à la fois.* Pour changer de flash sale, désactivez la version actuelle et activez la nouvelle.

### D. Configuration de Promotion (Promo Config)

La section promotion configure les liens rapides (quick links) et une bannière secondaire :

1. Allez dans **Contenu → Configuration Promo**.
2. Configurez :
   - **Afficher les liens rapides** : Oui/Non
   - **Style des liens rapides** : Cercles / Cartes / Minimal
   - **Médias des facettes** : Associez une image à chaque facette pour les liens rapides (ex. : facette "Mode" → image d'une robe).
   - **Afficher la bannière promo** : Oui/Non
   - **Contenu de la bannière promo** : type (texte/image/vidéo), titre, sous-titre, bouton CTA, fond (couleur/image/vidéo), couleur du texte.

### E. Configuration Générale

La configuration générale contrôle des éléments transversaux du site :

1. Allez dans **Contenu → Configuration générale**.
2. Configurez :
   - **Logo** : URL du logo de la plateforme
   - **Préchargeur (Preloader)** : Animation affichée pendant le chargement du site. Types : par défaut / image personnalisée / vidéo / aucun
   - **Fond du site** : Type de fond (couleur / image / vidéo) et valeur (couleur hex ou URL)
   - **Modale(s)** : Une ou plusieurs fenêtres pop-up qui s'affichent à l'arrivée du visiteur :
     - Activée/désactivée
     - Type (image ou texte)
     - Contenu (URL de l'image ou texte)
     - Lien de redirection au clic
     - Délai d'apparition (en secondes)
     - Durée d'affichage
     - Fermable par le visiteur (Oui/Non)
   - **Consentement aux cookies** :
     - Activé/désactivé
     - Message de consentement
     - Texte et URL du lien "En savoir plus"
     - Texte du bouton "Accepter"
     - Texte du bouton "Refuser"

---

## 16. Système de Notifications

Le plugin Notifications d'Ahizan permet d'envoyer des alertes et messages aux utilisateurs (clients et vendeurs) via plusieurs canaux : SMS, email, notifications in-app, et push web (sur navigateur).

### A. Configuration Brevo (SMS et Email)

Brevo est le service externe utilisé pour envoyer les SMS et emails transactionnels. L'administrateur doit configurer les paramètres de connexion :

1. Allez dans **Paramètres → Notifications → Configuration Brevo**.
2. Renseignez :
   - **Clé API Brevo** : La clé de votre compte Brevo (récupérée sur app.brevo.com).
   - **Indicatif téléphonique par défaut** : Ex. : +229 pour le Bénin.
   - **Méthode d'envoi d'email** :
     - **Brevo API** : Utilise l'API Brevo pour les emails (recommandé).
     - **SMTP** : Utilise un serveur SMTP personnalisé.
   - **Si SMTP choisi** :
     - Hôte SMTP (ex. : smtp.gmail.com)
     - Port SMTP (ex. : 587)
     - Nom d'utilisateur SMTP
     - Mot de passe SMTP
   - **Email expéditeur** : L'adresse email affichée comme expéditeur.
   - **Nom expéditeur** : Le nom affiché (ex. : "Équipe Ahizan").
   - **Configuration des canaux** : JSON avancé pour activer/désactiver SMS, email, push selon le type d'événement.
3. Cliquez sur **Tester la connexion SMTP** pour envoyer un email test avant de sauvegarder.
4. Cliquez sur **Enregistrer**.

### B. Statistiques des notifications

1. Allez dans **Paramètres → Notifications → Statistiques**.
2. Vous voyez :
   - Total des notifications envoyées
   - Nombre de notifications non lues
   - Notifications envoyées dans les dernières 24 heures
   - Notifications en échec d'envoi

### C. Journaux des notifications

1. Allez dans **Paramètres → Notifications → Journaux**.
2. La liste affiche chaque notification envoyée avec :
   - Date
   - Destinataire
   - Type d'événement
   - Titre et contenu
   - Canal utilisé (SMS, email, push)
   - Succès ou échec de l'envoi
   - Message d'erreur en cas d'échec
3. Filtrez par période, type ou état pour analyser les problèmes d'envoi.

### D. Envoyer une notification manuelle à un utilisateur

1. Allez dans **Paramètres → Notifications → Envoyer**.
2. Recherchez l'utilisateur par email via le champ de recherche.
3. Sélectionnez l'utilisateur cible.
4. Renseignez :
   - **Titre** de la notification
   - **Corps** du message
   - **Canal** : SMS, email, notification in-app, push, ou tous.
   - **URL d'action** : Lien vers lequel l'utilisateur est redirigé en cliquant sur la notification.
5. Cliquez sur **Envoyer**.

### E. Diffusion (Broadcast) à plusieurs utilisateurs

1. Allez dans **Paramètres → Notifications → Diffusion**.
2. Sélectionnez plusieurs utilisateurs dans la liste.
3. Renseignez le titre, le corps, le canal et l'URL d'action.
4. Cliquez sur **Envoyer à tous les sélectionnés**.
5. Un rapport s'affiche avec le nombre de notifications envoyées avec succès et le nombre d'échecs.

### F. Emails en masse (Bulk Email)

Pour envoyer un email à un groupe d'utilisateurs prédéfini :
1. Allez dans **Paramètres → Notifications → Email en masse**.
2. Choisissez le **groupe cible** :
   - Tous les clients
   - Tous les vendeurs (approuvés)
   - Tous les vendeurs en attente
   - Adresses email sélectionnées manuellement
3. Prévisualisez la liste des destinataires.
4. Saisissez l'**objet** de l'email.
5. Rédigez le **contenu HTML** de l'email (supporte le formatage riche).
6. Cliquez sur **Envoyer**.

### G. Notifications Push Web

Les notifications push permettent d'envoyer des alertes aux utilisateurs directement sur leur navigateur, même quand ils n'ont pas le site ouvert.

**Prérequis :** La clé VAPID doit être configurée dans l'environnement serveur.

Pour voir la clé VAPID publique :
1. Allez dans **Paramètres → Notifications**.
2. La clé VAPID publique est affichée pour référence.

Les utilisateurs s'abonnent aux notifications push depuis le site client en acceptant la permission navigateur. Leurs abonnements sont automatiquement enregistrés et utilisés lors des diffusions push.

---

## 17. Modération du Chat

Le module chat permet aux clients et aux vendeurs d'échanger des messages en temps réel. L'administrateur peut surveiller et modérer toutes les conversations.

### A. Consulter les conversations

1. Allez dans **Messages → Toutes les conversations**.
2. Vous voyez la liste de toutes les conversations actives entre clients et vendeurs, avec le dernier message.
3. Cliquez sur une conversation pour l'ouvrir et lire l'historique complet.

### B. Conversations directes (Admin ↔ Client ou Admin ↔ Vendeur)

L'administrateur peut envoyer des messages directement à un client ou à un vendeur :
1. Ouvrez une conversation.
2. Cliquez sur **Répondre en tant qu'admin**.
3. Rédigez votre message et envoyez.

### C. Supprimer un message

1. Dans une conversation, cliquez sur le message à supprimer.
2. Cliquez sur **Supprimer ce message**.
3. Confirmez.

*Effet :* Le message est marqué comme supprimé. Un indicateur "Message supprimé" remplace le contenu dans les interfaces du client et du vendeur.

### D. Modifier un message (admin)

1. Cliquez sur le message à modifier.
2. Cliquez sur **Modifier**.
3. Saisissez le nouveau contenu.
4. Validez.

*Effet :* Le message est mis à jour et marqué comme "modifié" dans la conversation.

---

## 18. Gestion des Clients

### A. Consulter la liste des clients

1. Allez dans **Clients**.
2. Vous voyez tous les comptes clients avec :
   - Nom complet
   - Email
   - Nombre de commandes
   - Date d'inscription
3. Filtrez par email, nom ou date.

### B. Ouvrir la fiche d'un client

Cliquez sur un client pour voir :
- Ses informations personnelles (nom, email, téléphone)
- Ses adresses enregistrées
- L'historique de ses commandes
- Ses produits et vendeurs favoris (Likes)
- Le statut de son compte (actif / inactif)

### C. Modifier un client

1. Ouvrez la fiche du client.
2. Modifiez les informations (nom, email, etc.).
3. Enregistrez.

*Attention :* Modifier l'email d'un client peut affecter sa capacité de connexion si la vérification par email est activée.

### D. Supprimer un client

1. Ouvrez la fiche du client.
2. Cliquez sur **Supprimer**.
3. Confirmez.

*Attention :* La suppression est irréversible. L'historique des commandes peut être affecté.

### E. Vérification d'email et rôles

Le système Ahizan supporte les comptes **unifiés** : un même compte peut avoir à la fois le rôle **Client** (acheter) et le rôle **Vendeur** (vendre). L'administrateur peut vérifier et modifier les rôles depuis la fiche de l'utilisateur.

---

## 19. Expédition et Livraison

### A. Méthodes d'expédition

Ahizan utilise plusieurs calculateurs de frais de livraison :

**1. Frais fixe global :**
Un tarif unique pour toutes les commandes, indépendamment de la destination. Configurez ce tarif dans **Paramètres de la Plateforme → Frais de livraison de base**.

**2. Calculateur basé sur les zones (Zone-based) :**
Les frais dépendent de la zone de livraison du client (configurée dans le Geo Engine). Chaque zone a son propre tarif.

**3. Calculateur Geo Engine (km) :**
Les frais sont calculés dynamiquement : Tarif de base + (Tarif par km × distance entre le vendeur et le client). Paramétrez ces valeurs dans les **Paramètres de la Plateforme**.

**4. Frais par défaut Vendure :**
Le calculateur natif Vendure permet de définir des règles d'expédition par poids, montant ou destination.

### B. Gérer les méthodes d'expédition

1. Allez dans **Paramètres → Méthodes d'expédition**.
2. Les méthodes d'expédition actives sont listées.
3. Créez une nouvelle méthode :
   - Choisissez un **calculateur** parmi les disponibles.
   - Choisissez un **vérificateur d'éligibilité** (ex. : la livraison Geo Engine nécessite que le client ait une adresse GPS).
   - Définissez les paramètres (frais de base, tarif/km, etc.).
4. Enregistrez.

### C. Zones d'expédition

Les zones d'expédition Vendure (différentes des zones de livraison Geo Engine) permettent de définir des règles d'expédition par pays ou région. Pour Ahizan qui opère principalement au Bénin :
1. Allez dans **Paramètres → Zones**.
2. Vérifiez que la zone "Bénin" ou "Global" est définie.
3. Assurez-vous que cette zone est liée au canal par défaut.

---

## 20. Taxes et Fiscalité

### A. Fonctionnement du système fiscal Ahizan

Le **Plugin Tax Enforcement** d'Ahizan applique automatiquement et uniformément une politique fiscale de **0% de TVA** sur tous les produits de la plateforme. Ce choix reflète le contexte commercial où la TVA n'est pas applicable aux transactions de la marketplace.

Ce plugin :
- Crée automatiquement au démarrage une catégorie de taxe "Standard Tax" avec un taux de 0%.
- Force tous les nouveaux produits à utiliser cette catégorie de taxe.
- Garantit que la devise du canal principal est le **Franc CFA (XOF)**.

### B. Gérer les catégories de taxes

Bien que le Tax Enforcement gère automatiquement les taxes, l'administrateur peut consulter les catégories dans :
1. **Paramètres → Taxes → Catégories de taxes**.
2. La catégorie "Standard Tax" à 0% est visible.

### C. Gérer les taux de taxes

1. Allez dans **Paramètres → Taxes → Taux de taxes**.
2. Le taux "No Tax Check" à 0% est visible et lié à la catégorie Standard Tax.

*Note :* Il n'est pas recommandé de modifier ces configurations car le plugin Tax Enforcement les restaure automatiquement si elles sont mal configurées.

---

## 21. Promotions et Réductions

### A. Les promotions Vendure

Vendure offre un système natif de promotions permettant d'appliquer des réductions automatiquement lors du passage à la caisse.

**Créer une promotion :**
1. Allez dans **Catalogue → Promotions**.
2. Cliquez sur **Créer une promotion**.
3. Renseignez :
   - **Nom** : Nom interne de la promotion.
   - **Activée** : Oui/Non
   - **Date de début** et **Date de fin** : Durée de validité.
   - **Code promo** : Code que le client saisit à la caisse (ex. : "PROMO10"). Laisser vide pour une promotion automatique.
   - **Conditions** : Règles qui déclenchent la promotion :
     - Montant minimum du panier
     - Nombre minimum d'articles
     - Client spécifique
     - Client avec certaine facette
   - **Actions** : Ce que la promotion applique :
     - Réduction en pourcentage sur tout le panier
     - Réduction en montant fixe
     - Livraison gratuite
     - Réduction sur un produit spécifique
4. Cliquez sur **Créer**.

### B. Les prix promotionnels Ahizan (par variante)

En complément des promotions globales, Ahizan dispose d'un système de prix promotionnels par variante de produit géré par le **Plugin Multivendeur** :

- Chaque variante de produit a les champs **En promotion** et **Prix promotionnel**.
- Quand une variante est marquée "En promotion", le moteur de prix Ahizan (**PromotionalOrderItemPriceCalculationStrategy**) remplace automatiquement le prix affiché par le prix promotionnel lors du calcul du panier.
- L'ancien prix est affiché barré sur le site.

Pour activer le prix promotionnel d'une variante :
1. Ouvrez le produit.
2. Dans la section Variantes, cliquez sur la variante.
3. Cochez **En promotion**.
4. Saisissez le **Prix promotionnel**.
5. Enregistrez.

*Effet sur la plateforme :* Les sections Flash Sale du CMS (configurées avec le filtre "onlyInPromotion" ou "minDiscount") incluent automatiquement ce produit.

---

## 22. Gestion des Actifs (Images et Fichiers)

### A. Consulter la bibliothèque d'actifs

1. Allez dans **Catalogue → Actifs** (ou icône image dans la barre latérale).
2. Vous voyez tous les fichiers téléchargés (images, vidéos, documents) avec :
   - Miniature
   - Nom du fichier
   - Dimensions (pour les images)
   - Taille du fichier
   - Date d'upload

### B. Télécharger des actifs

1. Cliquez sur **Télécharger des actifs**.
2. Glissez-déposez vos fichiers ou cliquez pour sélectionner.
3. Les fichiers sont uploadés et disponibles immédiatement.

*Protection par filigrane :* Les images uploadées par les vendeurs ou utilisées dans les produits peuvent être automatiquement filigranées avec le logo Ahizan (si la stratégie de stockage avec filigrane est activée).

### C. Modifier un actif

1. Cliquez sur un actif pour l'ouvrir.
2. Vous pouvez modifier :
   - Le **nom** du fichier
   - Le **texte alternatif** (alt text, important pour le SEO et l'accessibilité)
3. Enregistrez.

### D. Supprimer un actif

1. Sélectionnez un ou plusieurs actifs.
2. Cliquez sur **Supprimer**.

*Attention :* Supprimer un actif utilisé par un produit ou une page CMS entraîne des images cassées sur le site client. Vérifiez les usages avant de supprimer.

### E. Galerie de bannières

Les images uploadées via le **Banner Manager** sont stockées dans un dossier dédié `/assets/banners/`. Elles sont accessibles via l'URL publique.

---

## 23. Paramètres Généraux de la Plateforme

Cette section regroupe tous les paramètres globaux qui influencent le comportement de l'ensemble de la marketplace.

**Accès :** Menu **Paramètres → Paramètres de la Plateforme**

### Paramètres disponibles :

| Paramètre | Description | Effet sur la plateforme |
|---|---|---|
| **Nom de la plateforme** | Nom affiché dans les notifications et emails | Changé dans tous les messages automatiques |
| **Taux de commission par défaut** | Pourcentage prélevé sur chaque vente (ex. : 10 pour 10%) | S'applique à tous les vendeurs sauf ceux avec un taux personnalisé |
| **Mode de commission** | GÉNÉRAL ou PAR COLLECTION | Définit si le taux est unique ou varie par catégorie |
| **Taux par collection** | JSON définissant les taux par collection (si mode PAR COLLECTION) | Taux spécifiques selon la catégorie du produit vendu |
| **Afficher le contact vendeur** | Oui/Non | Active ou masque les coordonnées du vendeur sur sa page publique |
| **Champs de contact visibles** | JSON : quels champs afficher (téléphone, email, WhatsApp, Facebook, Instagram, site web) | Contrôle la visibilité de chaque champ de contact |
| **Code devise par défaut** | Ex. : XOF | Devise affichée sur tout le site client |
| **Indicatif téléphonique par défaut** | Ex. : +229 | Pré-rempli dans les formulaires téléphoniques |
| **Vérification email obligatoire** | Oui/Non | Si Oui, les nouveaux comptes doivent confirmer leur email avant de se connecter |
| **Approbation automatique des vendeurs** | Oui/Non | Si Oui, les vendeurs sont approuvés instantanément sans modération manuelle |
| **Domaine email fictif** | Ex. : ahizan.com | Domaine utilisé pour créer des emails fictifs pour les vendeurs sans email réel |
| **Frais de livraison de base** | Montant fixe en centimes (ex. : 500 = 500 FCFA) | Frais minimum de livraison appliqués à toutes les commandes |
| **Frais par km** | Montant en centimes par kilomètre | Multiplié par la distance pour les livraisons dynamiques |

**Pour modifier les paramètres :**
1. Accédez à la page **Paramètres de la Plateforme**.
2. Modifiez les champs souhaités.
3. Cliquez sur **Enregistrer**.

*Chaque modification est appliquée immédiatement sur toute la plateforme.*

---

## 24. Rôles et Permissions

Vendure dispose d'un système de rôles permettant de définir précisément ce que chaque administrateur peut faire.

### A. Rôles existants

- **Super Administrateur** : Accès illimité à toutes les fonctionnalités.
- **Rôles personnalisés** : Créés selon les besoins de votre équipe (ex. : Gestionnaire de contenu, Responsable logistique, Comptable).

### B. Créer un rôle personnalisé

1. Allez dans **Paramètres → Rôles**.
2. Cliquez sur **Créer un rôle**.
3. Saisissez le nom et la description.
4. Cochez les **permissions** accordées à ce rôle :
   - Lecture/écriture des produits
   - Lecture/écriture des commandes
   - Lecture/écriture des clients
   - Lecture/écriture des vendeurs
   - Accès aux paramètres
   - Gestion des actifs
   - Etc.
5. Cliquez sur **Créer**.

### C. Attribuer un rôle à un administrateur

1. Allez dans **Paramètres → Administrateurs**.
2. Ouvrez la fiche de l'administrateur.
3. Dans le champ **Rôles**, sélectionnez le ou les rôles à attribuer.
4. Enregistrez.

---

## 25. Recherche et Indexation

### A. Moteur de recherche

Ahizan utilise le **DefaultSearchPlugin** de Vendure pour indexer tous les produits. L'index de recherche est mis à jour automatiquement à chaque modification de produit ou de collection.

### B. Reindexer manuellement

Si des produits n'apparaissent pas correctement dans les résultats de recherche :
1. Allez dans **Paramètres → Moteur de recherche**.
2. Cliquez sur **Réindexer**.
3. Attendez la fin du processus (peut prendre quelques minutes selon le nombre de produits).

### C. Résultats de recherche par contexte géographique

Le moteur EMS d'Ahizan enrichit les résultats de recherche avec le contexte géographique du client. Selon la localisation du visiteur :
- Les produits des vendeurs proches sont mieux classés.
- Les produits associés aux marchés actifs de la zone sont mis en avant.
- Les sections CMS affichant des résultats de recherche s'adaptent automatiquement.

---

## 26. Statistiques et Tableaux de Bord

### A. Statistiques publiques de la plateforme

Des statistiques globales sont disponibles pour les analyses :
- **Nombre de visiteurs** : Compteur global de visites.
- **Nombre de commandes** : Total des commandes passées.
- **Nombre de vendeurs** actifs.
- **Nombre de produits** en ligne.

### B. Statistiques de likes

- **Produits les plus aimés** : Liste des produits triés par nombre de likes.
- **Vendeurs les plus suivis** : Liste des boutiques avec le plus d'abonnés.

### C. Statistiques Geo Engine

- Couverture géographique des zones actives.
- Zones sans vendeurs (potentiel de développement).
- Carte thermique des localisations clients.

---

## 27. Canaux (Channels)

Les canaux Vendure permettent de gérer plusieurs boutiques ou contextes au sein de la même installation. Ahizan utilise principalement un canal unique (**Default Channel**), mais le système supporte l'expansion multi-canal.

### A. Canal par défaut

1. Allez dans **Paramètres → Canaux**.
2. Le canal par défaut est visible avec ses paramètres :
   - Code devise (XOF forcé par le Tax Enforcement Plugin)
   - Zone fiscale
   - Zone d'expédition
   - Langue par défaut

### B. Modifier le canal par défaut

1. Cliquez sur le canal.
2. Modifiez les paramètres nécessaires.
3. Enregistrez.

*Attention :* Le Tax Enforcement Plugin s'assure automatiquement au démarrage que la devise est XOF. Modifier la devise manuellement peut créer des conflits.

---

## 28. Interactions entre modules : guide des effets croisés

Cette section explique comment les actions dans un module affectent les autres modules de la plateforme. C'est le guide de référence pour comprendre les effets de bord de chaque action.

### A. Produits → Collections → Facettes

**Ajouter un produit à une collection :**
- Le CMS affiche le produit dans toutes les sections associées à cette collection.
- Les facettes autorisées de la collection sont automatiquement proposées au produit.
- Le moteur de recherche réindexe le produit avec les nouvelles facettes.

**Retirer un produit d'une collection :**
- Le produit disparaît immédiatement des sections CMS filtrées par cette collection.
- Il reste visible dans le catalogue général.

### B. GeoEngine → CMS → Affichage client

**Quand un client accède au site depuis une localisation détectée :**
1. Le Geo Engine identifie la GeoZone et le marché du visiteur.
2. Le moteur CMS évalue toutes les sections de la page en cours.
3. Pour chaque section avec des règles géographiques :
   - Si la GeoZone du visiteur correspond à la règle → la section s'affiche.
   - Sinon → la section est masquée.
4. Les vendeurs et produits affichés sont filtrés et triés selon la proximité géographique.

**Quand une nouvelle GeoZone est créée :**
- Les vendeurs et marchés peuvent être rattachés à cette zone.
- Les sections CMS peuvent immédiatement cibler cette zone.

### C. Vendeurs → Produits → Site client

**Approbation d'un vendeur :**
- Ses produits précédemment créés peuvent être activés.
- La boutique devient visible dans les listes de vendeurs sur le site client.
- Le vendeur peut désormais créer de nouveaux produits.

**Suspension d'un vendeur :**
- Tous ses produits passent à l'état "Désactivé" automatiquement.
- Sa boutique disparaît des listes de vendeurs.
- Ses commandes en cours restent dans le système et doivent être gérées manuellement.

**Suppression d'un vendeur :**
- Si l'option "Supprimer les produits" est sélectionnée : tous ses produits sont effacés du catalogue.
- Les commandes associées à ce vendeur deviennent orphelines et doivent être réassignées.

### D. Commandes → Portefeuilles → Notifications

**Quand une commande est marquée "Payée" :**
1. La commission est calculée (montant × taux de commission).
2. Le montant net (montant - commission) est crédité automatiquement dans le portefeuille du vendeur.
3. Une notification est envoyée au vendeur.

**Quand un retrait est approuvé :**
1. Le solde du portefeuille est débité.
2. Une notification est envoyée au vendeur avec la confirmation du virement.

### E. Flash Sales (Banner Manager) → Produits (Catalogue) → CMS

**Quand une Flash Sale est activée avec le mode filtre :**
1. Le système interroge le catalogue pour trouver tous les produits correspondant aux critères (facettes, collections, prix, remise minimum).
2. Ces produits sont affichés dans la section Flash Sale du site client.
3. Ils sont dynamiquement mis à jour : si un produit devient hors stock ou sort des critères, il disparaît automatiquement de la Flash Sale.

**Quand un vendeur active le prix promotionnel d'un produit :**
1. Le moteur de prix promotionnel applique le nouveau prix lors du calcul du panier.
2. Si une Flash Sale filtrée par "En promotion" est active, ce produit apparaît automatiquement dans la Flash Sale.

### F. Notifications → Toute action déclenchante

Les notifications sont envoyées automatiquement dans les situations suivantes :

| Événement | Destinataire | Canal |
|---|---|---|
| Nouveau vendeur inscrit | Admin | In-app / Email |
| Vendeur approuvé | Vendeur | SMS / Email / In-app |
| Vendeur rejeté | Vendeur | SMS / Email / In-app |
| Vendeur suspendu | Vendeur | SMS / Email / In-app |
| Nouveau produit créé | Admin | In-app |
| Nouvelle commande | Vendeur(s) concerné(s) | SMS / Email / In-app |
| Statut commande changé | Client + Vendeur | SMS / Email / In-app |
| Demande de retrait | Admin | In-app |
| Retrait approuvé | Vendeur | SMS / Email / In-app |
| Retrait rejeté | Vendeur | SMS / Email / In-app |
| Nouveau message chat | Destinataire du message | In-app / Push |

### G. Inscription dynamique → Fiche vendeur → Validation

**Quand un nouveau champ d'inscription est créé :**
1. Il apparaît immédiatement dans le formulaire d'inscription du portail vendeur.
2. Les vendeurs déjà inscrits qui accèdent à la section "Compléter mon profil" voient ce nouveau champ.
3. L'administrateur voit les réponses dans la fiche de chaque vendeur.

**Quand un champ est rendu obligatoire :**
- Les nouveaux vendeurs ne peuvent pas finaliser leur inscription sans le remplir.
- Les vendeurs existants peuvent ne pas avoir de réponse pour ce champ (vide dans leur fiche).

### H. Collection Facet Map → Portail Vendeur → Filtres site client

**Quand des facettes autorisées sont assignées à une collection :**
1. Immédiatement, les vendeurs créant des produits dans cette collection voient uniquement ces facettes dans leur formulaire de création produit.
2. Sur le site client, les filtres de navigation pour cette collection se limitent aux facettes autorisées.
3. Les produits déjà dans cette collection conservent leurs anciennes facettes même si elles ne sont plus autorisées (cela ne déclenche pas de suppression automatique des associations existantes).

---

*Ce manuel couvre l'intégralité des fonctionnalités disponibles dans le back-office de la plateforme Ahizan au moment de sa rédaction. Pour toute question technique sur l'implémentation ou les configurations avancées, veuillez contacter l'équipe de développement.*
