# 🗺️ Guide Métier et Fonctionnel Complet de la Plateforme Ahizan

Bienvenue dans ce guide de référence destiné aux gestionnaires, administrateurs et coordinateurs de la plateforme **Ahizan**. 

Ce document explique en détail, et dans un langage simple et sans jargon informatique, le fonctionnement global de notre plateforme e-commerce multi-vendeurs. Il détaille chaque module de la plateforme, explique comment les utiliser, et décrit précisément les interactions et impacts croisés de chaque fonctionnalité sur les différents aspects du site (storefront client, portail vendeur et back-office administrateur).

---

## 📋 Table des Matières
1. [Introduction et Choix de Conception de la Plateforme](#1-introduction-et-choix-de-conception-de-la-plateforme)
2. [Gestion Multi-Vendeurs et Flux Financiers (Portefeuilles et Retraits)](#2-gestion-multi-vendeurs-et-flux-financiers-portefeuilles-et-retraits)
3. [Le Moteur Géographique (Geo Engine) et la Livraison](#3-le-moteur-géographique-geo-engine-et-la-livraison)
4. [Le Système d'Expérience et de Contenu (EMS)](#4-le-système-dexpérience-et-de-contenu-ems)
5. [Le Moteur de Promotions et de Ventes Flash](#5-le-moteur-de-promotions-et-de-ventes-flash)
6. [Organisation du Catalogue : Collections et Facettes (Filtres)](#6-organisation-du-catalogue--collections-et-facettes-filtres)
7. [Gestion Dynamique de l'Inscription des Vendeurs](#7-gestion-dynamique-de-linscription-des-vendeurs)
8. [Le Système de Notifications et de Discussions (Chat)](#8-le-système-de-notifications-et-de-discussions-chat)
9. [Gestion et Importation en Masse du Catalogue (Excel Bulk Import)](#9-gestion-et-importation-en-masse-du-catalogue-excel-bulk-import)
10. [Synthèse des Impacts Croisés entre Fonctionnalités](#10-synthèse-des-impacts-croisés-entre-fonctionnalités)

---

## 1. Introduction et Choix de Conception de la Plateforme

La plateforme **Ahizan** a été conçue pour répondre spécifiquement aux réalités du marché e-commerce béninois et africain. Contrairement aux solutions occidentales classiques, elle intègre des mécanismes simplifiés et adaptés au contexte local :

*   **Monnaie Unique en FCFA (XOF)** : Toutes les transactions, les prix des produits, les frais de livraison et les portefeuilles des vendeurs sont exclusivement gérés en FCFA.
*   **Politique fiscale à 0%** : Afin d'éviter la complexité administrative et de s'adapter au commerce local (souvent informel ou semi-formel), la plateforme applique automatiquement une taxe de 0% sur tous les produits et transactions. Les prix affichés sur le site sont nets et correspondent exactement à ce que le client paie et à ce que le vendeur facture.
*   **Paiement en Espèces à la Livraison (Cash on Delivery)** : Activé par défaut, ce mode permet aux clients de régler leur achat directement auprès du livreur lors du dépôt du colis. Le livreur collecte les fonds qui sont ensuite reversés sur le portefeuille virtuel du vendeur par la plateforme.

---

## 2. Gestion Multi-Vendeurs et Flux Financiers (Portefeuilles et Retraits)

La marketplace d'Ahizan permet à plusieurs boutiques indépendantes de vendre sur le même site. L'administration contrôle les accès et régule les flux financiers.

### A. Inscription et Validation des Boutiques
Lorsqu'un vendeur s'inscrit, son compte est mis **En attente**. L'administrateur examine les informations fournies (pièce d'identité, identifiant fiscal unique, etc.) depuis le panneau d'administration :
*   **Approuver** : Active la boutique et rend ses produits immédiatement visibles sur le site.
*   **Rejeter** : Désactive le profil en spécifiant un motif (ex. : *"document d'identité illisible"*). Le vendeur reçoit une notification, corrige ses erreurs sur son tableau de bord et renvoie sa demande.
*   **Suspendre** : Désactive temporairement une boutique approuvée en cas de non-respect des règles de la plateforme. Ses produits sont instantanément retirés du site client.

### B. Configuration de la Commission
La plateforme perçoit une rémunération sur chaque vente. L'administrateur peut configurer :
*   Un **Taux de commission général** (par défaut pour toute la plateforme).
*   Un **Taux de commission personnalisé** sur la fiche d'un vendeur spécifique (ex. : 8,5% pour un vendeur partenaire au lieu des 10% standards). Ce taux personnalisé prévaut automatiquement lors de la répartition des gains des futures ventes de ce vendeur.

### C. Le Portefeuille Virtuel (Wallet)
Chaque vendeur possède un portefeuille sur son tableau de bord exprimé en FCFA. Son solde évolue selon les règles suivantes :
*   **Encaissement des gains** : Lorsqu'une commande est livrée au client, l'administrateur confirme la transaction dans le back-office. Le système calcule automatiquement la commission d'Ahizan, la retient et verse le montant net (prix de l'article moins la commission) sur le portefeuille virtuel du vendeur. Le solde passe alors au statut **Retirable**.
*   **Autorisation de solde négatif (Découvert / Overdraft)** : L'administrateur peut autoriser une boutique à avoir un solde négatif. Cela permet au vendeur de continuer à utiliser son compte et à recevoir des commandes même s'il doit de l'argent à la plateforme (par exemple suite à des retours de produits ou des frais d'ajustement). Si cette option est désactivée, un solde négatif peut bloquer les actions du vendeur.
*   **Ajustements manuels** : L'administrateur peut créditer (remboursement, bonus) ou débiter (régularisation d'erreur) manuellement le portefeuille d'un vendeur en ajoutant une note explicative obligatoire.

### D. Processus de Retrait des Gains (Withdrawals)
Lorsqu'un vendeur souhaite récupérer son argent :
1.  Il effectue une **demande de retrait** depuis son portail en indiquant le montant souhaité et son mode de réception : **Mobile Money** (MTN, Moov, Celtiis) ou **Virement Bancaire**.
2.  La demande apparaît dans le back-office de l'administrateur sous le statut **En attente**.
3.  L'administrateur effectue le transfert réel d'argent (via son terminal Mobile Money ou sa banque) vers le vendeur.
4.  Une fois le transfert effectué, l'administrateur clique sur **Approuver** et saisit obligatoirement la **Référence de transaction** (fournie par l'opérateur ou la banque) pour assurer la traçabilité. Le montant est alors déduit du portefeuille virtuel du vendeur.
5.  Si les coordonnées sont fausses ou le solde insuffisant, l'administrateur clique sur **Rejeter** en saisissant un motif. L'argent réservé est immédiatement réintégré dans le solde disponible du vendeur.

### E. Suivi et Division des Commandes Multi-Vendeurs
Un client peut acheter dans un même panier des produits provenant de vendeurs différents. 
*   Le système crée une commande globale pour le client, mais la divise en plusieurs lignes de commande distinctes pour chaque vendeur concerné.
*   Chaque vendeur reçoit une alerte uniquement pour les articles qui le concernent et doit soit **Confirmer** la disponibilité (pour lancer la préparation du colis), soit **Refuser** (en cas de rupture de stock).
*   **Processus de Réassignation** : Si un vendeur refuse un article ou ne répond pas dans les délais impartis, la ligne de commande passe au statut **Réassignation**. L'administrateur peut alors transférer manuellement la commande à une autre boutique située dans la même zone géographique et proposant le même produit, évitant ainsi d'annuler l'achat du client.

---

## 3. Le Moteur Géographique (Geo Engine) et la Livraison

Le **Geo Engine** est le cœur décisionnel géographique d'Ahizan. Au lieu de se fier à des adresses textuelles imprécises, il utilise des coordonnées GPS réelles et une hiérarchie structurée.

### A. Hiérarchie Géographique
Le moteur gère l'organisation du territoire béninois selon la structure suivante :
`Pays` ➔ `Département` ➔ `Commune` ➔ `Arrondissement` ➔ `Quartier ou Village` ➔ `Marché` ➔ `Boutique`.
Le **Marché** (ex. : *Marché Dantokpa, Marché Ganhi, Marché Ouando*) est une entité commerciale propre à Ahizan permettant de regrouper les vendeurs physiques afin que les clients puissent faire leurs achats "par marché".

### B. Configuration GPS des Boutiques (Vendeurs)
Lors de la configuration de son profil, le vendeur doit impérativement zoomer sur une carte interactive et placer un marqueur rouge (épingle) sur l'emplacement exact de son stock ou de son magasin. Les coordonnées GPS (Latitude et Longitude) sont alors enregistrées. 
*   **Impact majeur** : Si le vendeur positionne mal son épingle GPS, tous les calculs de distance de livraison seront faux, ce qui entraînera des tarifs aberrants pour les clients et des annulations de commande.

### C. Calcul Automatique des Frais de Livraison
Lors du passage à la caisse, le client saisit son adresse de livraison (également géolocalisée). Le système calcule la distance routière ou à vol d'oiseau exacte entre la boutique du vendeur et l'adresse du client :
1.  Il multiplie cette distance par le **Tarif par kilomètre** défini par l'administrateur (ex. : 100 FCFA/km).
2.  Il compare le résultat avec le **Frais de base de livraison** (ex. : 500 FCFA).
3.  Le prix final appliqué est le montant le plus élevé des deux (la livraison ne peut jamais coûter moins que le frais de base).
4.  Si la commande contient des articles de plusieurs vendeurs, le système calcule le trajet pour chaque vendeur afin d'établir un tarif de livraison de départ optimal pour couvrir le déplacement des livreurs.

---

## 4. Le Système d'Expérience et de Contenu (EMS)

Le CMS traditionnel a été remplacé par un **Système de Gestion d'Expérience (EMS)**. Il permet aux administrateurs de modifier la mise en page du site et de l'application en temps réel et de personnaliser l'affichage selon le profil géographique et temporel du client.

### A. Les Deux Composants Maîtres Unifiés
Pour éviter la complexité, la mise en page s'appuie uniquement sur deux types de sections universelles configurables dans l'éditeur visuel (Universal Builder) :

#### 1. Universal Product Collection (Collections de Produits)
Cette section affiche des listes de produits selon l'une des 5 stratégies choisies par l'administrateur :
*   ⏱️ **Vente Flash (FLASH_SALE)** : Affiche des produits à prix réduit avec un compte à rebours visuel (Chrono). L'admin configure le titre de la campagne, le style du badge (Néon, Glassmorphism, Bold) et l'option de **masquage automatique** (la section disparaît du site dès que le compte à rebours atteint zéro).
*   📍 **Découverte Locale (LOCAL_DISCOVERY)** : Utilise la position GPS du client pour n'afficher que les produits des vendeurs situés à proximité (ex. : dans un rayon de 5 km). L'admin configure le rayon et le mode de repli (si aucun vendeur n'est trouvé dans le rayon de 5 km, le système s'élargit à toute la ville ou affiche des produits populaires nationaux).
*   🏷️ **Catalogue (CATALOG)** : Affiche une catégorie ou collection de produits classique avec la possibilité d'activer des onglets de filtres.
*   👤 **Flux Personnel (HOME_FEED)** : Génère une liste de produits personnalisée selon l'historique de navigation du client. L'admin définit un quota maximum d'articles par vendeur pour éviter qu'une seule grande boutique ne monopolise tout l'écran d'accueil.
*   🔥 **Tendances (TRENDING)** : Affiche les produits les plus vendus et les mieux notés de la zone géographique du client.

#### 2. Category Collection (Collections de Catégories)
Cette section permet d'organier et d'afficher les raccourcis de navigation pour le client :
*   Elle peut être rendue sous forme de **Grille d'images** classique ou de **Carrousel défilant de raccourcis rapides (Quick Links)**.
*   L'administrateur sélectionne les catégories ou marchés à mettre en avant.

### B. Paramétrage des Conditions d'Affichage (Rules)
Chaque section de la page peut être soumise à des règles de visibilité. L'administrateur dispose d'un sélecteur de zones géographiques synchronisé avec la base de données :
*   Si une section (par exemple, "Produits Frais de Calavi") est configurée avec la zone "Calavi", elle ne s'affichera sur le site **que** pour les utilisateurs situés à Calavi ou ayant sélectionné Calavi dans l'en-tête du site. Elle sera invisible pour un utilisateur naviguant depuis Cotonou.
*   Le changement de ville par le client dans l'en-tête du site met à jour instantanément les sections affichées sans recharger la page.

### C. Habillages (Presets) et Gestion des Saisons (Season Manager)
*   **Habillages (Presets)** : L'administrateur peut concevoir une page d'accueil thématique entière (ex. : design "Saint-Valentin" ou "Black Friday"), l'enregistrer comme un modèle et l'activer en un clic.
*   **Gestionnaire de Saisons (Season Manager)** : Permet de programmer à l'avance l'activation d'un habillage. L'admin définit une date/heure de début et une date/heure de fin (ex. : le thème "Rentrée Scolaire" s'active automatiquement le 15 août à 08h00 et se désactive le 15 septembre à minuit pour laisser place au thème classique), sans intervention manuelle.

---

## 5. Le Moteur de Promotions et de Ventes Flash

Le système gère les réductions de prix et les met en avant de manière dynamique.

### A. Configuration d'une Promotion par le Vendeur
Depuis sa fiche produit, le vendeur coche la case **En Promotion** et saisit un **Prix promotionnel** (inférieur au prix normal).
*   **Impact visuel** : Sur le site, le produit affiche le prix d'origine barré, le nouveau prix et un badge de réduction calculé automatiquement (ex. : -20%).
*   **Impact sur le Panier** : Lorsque le client ajoute ce produit au panier, le moteur de tarification applique automatiquement le prix promotionnel au lieu du prix standard lors du calcul du total.

### B. Ventes Flash (Synergie avec l'EMS)
Lorsqu'un produit en promotion est intégré dans une section de type **Vente Flash (FLASH_SALE)** sur la page d'accueil :
*   Il bénéficie d'une visibilité maximale associée au compte à rebours général de la campagne promotionnelle.
*   Dès que le chrono arrive à expiration, la section de vente flash disparaît, et le produit retourne à son affichage standard dans le catalogue classique (ou son prix repasse au prix normal si la promotion du produit a été configurée pour expirer en même temps).

---

## 6. Organisation du Catalogue : Collections et Facettes (Filtres)

Pour faciliter la recherche des clients, Ahizan utilise un système structuré pour catégoriser les produits et leur appliquer des filtres intelligents.

### A. Collections (Catégories)
Les collections représentent l'arborescence des catégories de produits (ex. : *Mode ➔ Vêtements Homme ➔ Chemises*). Elles guident la navigation des clients.

### B. Facettes et Valeurs de Facettes (Filtres)
Les **Facettes** sont des critères de filtrage (ex. : *Taille, Couleur, Capacité de stockage, Marque*). Chaque facette contient des **Valeurs** spécifiques (ex. : la facette *Taille* contient les valeurs *S, M, L, XL* ; la facette *Stockage* contient *64 Go, 128 Go, 256 Go*).

### C. Restriction et Association des Facettes (Collection Facet Map)
Par défaut, pour éviter qu'un vendeur ne choisisse des filtres inappropriés ou farfelus lors de la création de son produit, l'administrateur associe les facettes autorisées à des collections spécifiques :
*   La facette *Taille* est autorisée pour la collection *Mode*.
*   La facette *Capacité de stockage* est autorisée pour la collection *Téléphones & Tablettes*.
*   **Héritage** : Les sous-collections héritent automatiquement des facettes configurées sur les collections parentes.
*   **Impact Vendeur** : Lorsque le vendeur crée ou modifie son produit, dès qu'il sélectionne la catégorie de son article, le formulaire affiche **uniquement** les facettes qui y sont associées. S'il crée une robe, il verra les filtres de taille et couleur, mais pas les filtres de mémoire RAM ou de puissance électrique. Cela garantit la propreté et la pertinence du catalogue de recherche pour les clients.

---

## 7. Gestion Dynamique de l'Inscription des Vendeurs

L'inscription des vendeurs (Onboarding) n'est pas figée dans le code. L'administrateur peut modifier la structure du formulaire de demande d'adhésion en temps réel depuis son panneau de contrôle.

### A. Création de Champs Personnalisés (Registration Fields)
L'administrateur peut créer, modifier ou supprimer des champs requis pour l'inscription :
*   **Types de champs supportés** : Texte simple, Sélecteurs (menus déroulants), Téléchargement de fichiers (images, PDF) ou coordonnées géographiques.
*   **Règles de validation configurables** : Taille maximale de fichier (ex. : 5 Mo max pour les pièces d'identité), formats autorisés (ex. : uniquement PDF et PNG pour le document fiscal), longueur minimale ou maximale du texte.
*   **Configuration pratique** : Les documents réglementaires comme l'**IFU (Identifiant Fiscal Unique)**, le **RCCM (Registre du Commerce)** et la **CNI (Carte d'Identité Nationale)** sont configurés de cette manière dynamique. L'admin peut à tout moment décider de demander un nouveau document (ex. : *"Photo de la devanture physique de la boutique"*) en ajoutant simplement un champ dans le back-office.

### B. Soumission et Modération
*   Le candidat vendeur remplit les champs configurés sur son interface d'inscription.
*   L'administrateur consulte l'ensemble des réponses et documents fournis pour chaque candidat.
*   En cas de rejet de la candidature, le motif saisi par l'admin est affiché au vendeur sur son portail afin qu'il puisse téléverser de nouveaux fichiers conformes ou corriger ses saisies.

---

## 8. Le Système de Notifications et de Discussions (Chat)

Les notifications et les discussions instantanées maintiennent l'activité de la plateforme, informent les utilisateurs en temps réel et sécurisent les échanges.

### A. Canaux de Notification
*   **SMS** : Envoyés via l'opérateur Brevo. Très important au Bénin pour toucher directement les utilisateurs sur leur mobile sans dépendre d'une connexion internet permanente.
*   **E-mail** : Pour les récapitulatifs de commandes ou les documents officiels.
*   **Notifications SSE (In-App)** : Alertes visuelles instantanées apparaissant directement sur le navigateur ou l'application du client ou du vendeur tant qu'il est connecté.
*   **Web Push** : Notifications du navigateur, même si le site de la plateforme est fermé.

### B. Événements Déclencheurs et Actions Automatiques
Le système écoute en permanence les actions sur le site pour envoyer des alertes ciblées :
*   💬 **Nouveau message dans le Chat** : Si un client pose une question à un vendeur concernant un produit, ou si le vendeur répond, le destinataire reçoit une alerte instantanée (SSE ou SMS) pour poursuivre la discussion.
*   🛒 **Suivi des Commandes** :
    *   *Création de commande* ➔ Le vendeur reçoit immédiatement une notification SSE et un SMS lui demandant de confirmer la commande sous peine de réassignation.
    *   *Validation logistique* ➔ Le client reçoit un SMS/SSE lorsque sa commande passe au statut *Expédié*, puis *En transit*, et enfin *Livré*.
*   💰 **Mouvements Financiers** :
    *   L'administrateur reçoit une alerte lors d'une nouvelle demande de retrait d'un vendeur.
    *   Le vendeur reçoit un SMS/SSE lorsque son retrait est approuvé (avec la référence de transaction réelle) ou rejeté (avec le motif).
*   🔑 **Sécurité et Authentification** :
    *   Lors de l'inscription ou d'un oubli de mot de passe, l'utilisateur reçoit un **code numérique court à usage unique (SMS/Email)** au lieu d'un long lien hypertexte complexe. L'utilisateur saisit ce code sur l'interface pour valider son identité, ce qui est beaucoup plus ergonomique sur smartphone.

### C. Contrôle de l'Historique (Notification Logs)
L'administrateur dispose d'un journal des notifications dans son back-office qui affiche l'historique complet des messages envoyés, leur canal (SMS, Email, SSE), leur contenu exact, le destinataire, la date et le statut de réception. Les clés d'accès et configurations SMS de l'opérateur Brevo sont modifiables directement dans l'interface d'administration.

---

## 9. Gestion et Importation en Masse du Catalogue (Excel Bulk Import)

La saisie manuelle de centaines de catégories (collections) et de filtres (facettes) peut être longue et sujette aux erreurs. Ahizan intègre un outil d'importation et d'exportation en masse via des fichiers Excel.

### A. Exportation de la Structure
L'administrateur peut exporter l'intégralité de l'arborescence des catégories et des filtres existants dans un fichier Excel. Cela permet d'avoir un aperçu clair de l'organisation actuelle hors ligne.

### B. Mode Simulation (Dry-Run / Validation)
Avant d'appliquer des modifications massives qui pourraient perturber le catalogue en ligne :
1.  L'administrateur charge le fichier Excel modifié.
2.  Il lance une **validation de fichier** (Dry-Run).
3.  Le système analyse le fichier ligne par ligne sans rien enregistrer en base de données et retourne un rapport détaillé listant les erreurs détectées (ex. : *"Ligne 45, Onglet Catégories : la catégorie parente 'Électronique' n'existe pas"*, *"Ligne 12, champ requis manquant"*).
4.  L'administrateur peut corriger son fichier Excel jusqu'à obtenir un rapport indiquant zéro erreur.

### C. Importation Réelle
Une fois le fichier Excel validé, l'administrateur valide l'importation. Le système crée ou met à jour simultanément les collections, les facettes et les valeurs de facettes, et affiche les statistiques finales (nombre d'éléments créés et mis à jour).

---

## 10. Synthèse des Impacts Croisés entre Fonctionnalités

Pour bien administrer la plateforme, il est crucial de comprendre comment les différents modules interagissent entre eux au quotidien :

### 1. Position GPS Vendeur ➔ Calculs de Livraison ➔ Expérience Client
Si le vendeur place par erreur son épingle GPS dans une zone éloignée ou incorrecte, le client verra des frais de livraison déraisonnables lors du checkout. Le livreur partenaire d'Ahizan sera également envoyé à la mauvaise adresse pour récupérer le colis, bloquant ainsi le traitement de la commande.

### 2. Choix de Ville du Client ➔ EMS Page d'Accueil ➔ Visibilité des Vendeurs
Lorsqu'un client sélectionne sa ville (ex. Cotonou) :
*   Les sections EMS configurées avec la stratégie `LOCAL_DISCOVERY` se mettent à jour pour afficher uniquement les boutiques situées dans un rayon de 5 km autour de lui.
*   Les bannières promotionnelles ou sections de catégories associées à des zones spécifiques (ex. Porto-Novo uniquement) se masquent automatiquement pour lui.
*   Si le vendeur n'a pas configuré sa géolocalisation ou s'il est hors du rayon, ses produits deviennent invisibles dans le flux de proximité du client.

### 3. Association Facettes-Collections ➔ Saisie Vendeur ➔ Filtres de Recherche
L'administrateur utilise la configuration de filtre de collection pour lier les facettes aux collections.
*   *Impact vendeur* : Simplifie la création de fiches produits en masquant les filtres inutiles.
*   *Impact client* : Permet des filtres précis lors des recherches de produits. Si l'admin associe mal une facette (ex : associer la pointure aux téléphones), le vendeur pourra saisir des pointures sur un smartphone, ce qui polluera les résultats de recherche des clients.

### 4. Promotion Produit Vendeur ➔ CMS d'Accueil (EMS Vente Flash) ➔ Total Panier
*   Le vendeur configure un prix promotionnel.
*   L'administrateur l'intègre dans une section de type `FLASH_SALE` sur la page d'accueil avec un compte à rebours visuel.
*   Pendant la durée du compte à rebours, le client voit le chrono défiler et le prix barré.
*   Le système de panier applique le prix promotionnel lors du calcul du total de la commande.
*   À la fin du chrono, la section EMS disparaît automatiquement du site, protégeant le vendeur contre des achats tardifs au tarif réduit si la promotion prend fin.

### 5. Validation Financière ➔ Calcul de Commission Vendeur ➔ Demande de Retrait
Lorsqu'un colis est marqué comme livré :
*   L'administrateur valide le paiement du vendeur (`isVendorPaid = true`).
*   Le système applique le taux de commission (standard ou personnalisé du vendeur) sur le total des articles.
*   Le gain net est crédité sur le portefeuille virtuel du vendeur.
*   Le vendeur est notifié et peut soumettre une demande de retrait vers son numéro Mobile Money ou compte bancaire.
*   L'admin effectue le transfert d'argent réel et l'enregistre avec la référence de transaction pour clore le dossier.

### 6. Inscription Dynamique Vendeur ➔ Modération Administrative ➔ Notifications
*   L'admin modifie les pièces requises à l'inscription (ex. ajout d'un champ PDF obligatoire pour la CNI).
*   Le nouveau vendeur doit fournir ce document lors de sa candidature.
*   L'admin examine le document dans son espace de modération.
*   Si le document est valide, l'admin approuve la boutique, ce qui déclenche l'envoi d'un SMS de bienvenue au vendeur et active ses produits sur le site.
*   Si le document est invalide, l'admin rejette la boutique en saisissant un motif. Le vendeur reçoit un SMS avec le motif et son profil repasse en mode édition pour qu'il puisse corriger sa pièce d'identité.
