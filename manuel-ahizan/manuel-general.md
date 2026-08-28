# MANUEL GÉNÉRAL DE LA PLATEFORME MARKETPLACE AHIZAN
## Synthèse complète des spécifications, workflows, entités et gouvernance

**Version :** 1.0  
**Date :** 26 août 2026  
**Socle Technique :** Vendure (Headless GraphQL Marketplace Framework)  
**Destination :** Document de référence pour les équipes techniques, fonctionnelles et opérationnelles d'Ahizan.

---

## INTRODUCTION
Ahizan est une marketplace multi-vendeurs moderne conçue pour le marché béninois (et à terme régional). L'architecture repose sur une séparation claire entre :
1. **Le moteur e-commerce standard (Vendure)** : gestion des entités de base (produits, variantes, panier, taxes, paiements, clients).
2. **La couche d'intelligence et de gouvernance d'Ahizan** : normalisation par IA, gestion des offres vendeurs (*Seller Offers*), découpage des commandes en sous-commandes vendeurs (*Seller Orders*), moteur de remplacement automatique en cas de rupture, logistique de collecte, de consolidation en hub et de livraison avec validation par OTP, et gestion financière des commissions (*Settlements* et *Payouts*).

Ce manuel général présente de manière exhaustive toutes les fonctionnalités prévues et les actions autorisées pour chaque rôle de la plateforme, avec des exemples et règles de gestion à l'appui.

---

# SECTION 1 : LE PARCOURS ET LES ACTIONS DU CLIENT (L'ACHETEUR)

Le client d'Ahizan bénéficie d'une expérience d'achat fluide, masquant la complexité logistique et multi-vendeurs de la plateforme. Pour lui, il interagit avec une seule enseigne : **Ahizan**.

### 1.1 Recherche, Consultation et Sélection de Produits
* **Recherche intelligente** : Le client peut rechercher des articles via une barre de recherche tolérant les approximations linguistiques ou les formulations locales.
  * *Exemple* : Rechercher « *coca demi litre* » renvoie le produit catalogue **Coca-Cola 50 cl**.
* **Navigation et Filtres Facettes** : Il filtre le catalogue par caractéristiques techniques (Marque, Capacité de stockage, Couleur, Réseau 5G, Garantie, etc.) issues des *Facets* de Vendure.
* **Consultation d'une fiche produit unique** : Le client consulte une fiche descriptive normalisée avec des URLs propres et optimisées (Slugs).
  * *Exemple de Slug* : `ahizan.com/samsung-galaxy-a16-256-go-8-go-ram-noir`
* **Comparaison des offres vendeurs** : Sur la page de la variante sélectionnée, le client voit les différentes offres commerciales disponibles pour cette même variante. Il a la liberté de choisir son vendeur selon le prix, le délai de préparation estimé, la localisation de la boutique ou sa note de fiabilité.
  * *Exemple d'affichage pour le client* :
    * Variante : **Samsung Galaxy A16 - Noir - 256 Go**
    * Offre 1 (Recommandée par défaut) : *Boutique Cotonou Tech* | Prix : **145 000 FCFA** | Délai : **2h** | Note : **4.9/5**
    * Offre 2 (Moins chère) : *Boutique FR Négoce* | Prix : **142 000 FCFA** | Délai : **24h** | Note : **3.2/5** (Plusieurs annulations récentes)

### 1.2 Achat et Paiement Unique (Commande Multi-vendeurs)
* **Panier unique multi-vendeurs** : Le client peut ajouter au panier des produits provenant de différents vendeurs sans aucune restriction.
  * *Exemple de Panier* :
    * 1 × **Samsung Galaxy A16 - Noir** (Vendeur A)
    * 2 × **Chaussures de sport - Pointure 42** (Vendeur B)
    * 10 × **Canettes Coca-Cola - 33 cl** (Vendeur C)
* **Paiement unique** : Le client effectue un seul paiement global pour l'intégralité de sa commande (via Mobile Money comme MTN MoMo ou Moov Money, ou par carte bancaire). Il ne paie pas chaque vendeur séparément.

### 1.3 Suivi en Temps Réel et Réception
* **Timeline de suivi** : Le client suit l'avancement de son colis sur une interface claire, de la confirmation par les vendeurs à la livraison finale, en passant par la collecte et la consolidation au hub d'Ahizan.
* **Réception sécurisée par code OTP** : Lors de la livraison par le coursier, le client reçoit un code SMS unique (OTP). Il doit transmettre ce code au livreur pour valider la réception conforme. Cette action confirme le statut « Livré » et déclenche le processus de reversement aux vendeurs.

### 1.4 Retours, Remboursements et Litiges
* **Demande de retour** : En cas de produit non conforme ou défectueux, le client formule une demande de retour dans son espace personnel en joignant des photos.
* **Ouverture de litige (*Dispute*)** : Si le client estime qu'il y a eu tromperie (produit d'occasion vendu pour du neuf, contrefaçon, etc.), il ouvre un litige. Il interagit alors avec le service client d'Ahizan pour obtenir arbitrage et remboursement (total ou partiel).

---

# SECTION 2 : LE PARCOURS ET LES ACTIONS DU VENDEUR (SELLER)

Le vendeur est un commerçant béninois (boutique physique, grossiste, distributeur ou artisan) qui utilise la marketplace d'Ahizan comme canal de vente. Il dispose d'un **Seller Portal** simplifié.

### 2.1 Inscription, Onboarding et Profil Vendeur
* **Création de compte** : Le vendeur saisit ses informations de contact, le nom commercial de sa boutique et télécharge ses pièces justificatives (registre de commerce IFU, pièce d'identité).
* **Configuration de sa boutique** : Il renseigne ses adresses physiques (qui seront créées comme des *Stock Locations* dans Vendure), ses horaires d'ouverture, son logo et ses coordonnées de paiement Mobile Money ou bancaires pour les virements de reversement.

### 2.2 Gestion des Offres Commerciales (*Seller Offers*)
* **Liaison au catalogue existant (Règle d'or anti-doublon)** : Le vendeur n'a pas le droit de créer une nouvelle fiche produit si l'article existe déjà dans le catalogue central d'Ahizan. Il doit simplement rattacher son offre commerciale à la variante correspondante.
  * *Exemple* : Si le vendeur veut vendre de l'« *Huile Dinor 1 L* », il recherche le produit dans la base centrale d'Ahizan et clique sur « *Vendre ce produit* ».
* **Création d'une offre spécifique** : Pour chaque variante qu'il possède en stock, le vendeur définit :
  * Son **prix de vente** en FCFA (ex: *2 500 FCFA*).
  * Son **stock disponible** pour chaque entrepôt ou boutique physique (*Stock Location*).
  * Son **SKU vendeur** (sa référence interne, ex: *DIN-1L-BOUTIQUE*).
  * Le **délai de préparation** (ex: *15 minutes* pour l'alimentaire, *2h* pour les smartphones).
  * L'état du produit (Neuf ou Occasion, avec détails sur l'état général si occasion).

### 2.3 Traitement des Commandes (*Seller Orders*)
* **Réception et Confirmation (Délai limité)** : Lorsqu'un client commande un produit du vendeur, celui-ci reçoit une notification pour sa sous-commande (*Seller Order*). Il doit confirmer qu'il dispose bien du stock et qu'il accepte la transaction dans un délai patrimonial/imparti (ex: *30 minutes*).
* **Préparation et Emballage** : Une fois la commande acceptée, le vendeur prépare physiquement les articles et les emballe.
* **Déclenchement de la collecte** : Le vendeur marque la commande comme « *Prête pour collecte* » (*Ready for pickup*). Cette action alerte automatiquement le système d'Ahizan pour envoyer un livreur collecter le colis.
* **Remise du colis au livreur** : Le vendeur remet le colis au livreur d'Ahizan après avoir scanné le code de collecte ou fait signer le livreur sur son application.

### 2.4 Suivi Financier (*Settlements & Payouts*)
* **Visualisation du solde** : Le vendeur accède à son relevé financier où il voit le montant brut de ses ventes, la commission prélevée par Ahizan (ex: *10%*), les frais opérationnels éventuels (ex: *frais de collecte*), et le montant net qui lui est dû (*Settlement*).
* **Demande de virement (*Payout*)** : Le vendeur peut suivre l'état de ses paiements. Une fois le délai de contestation client passé (ex: *48h après livraison*), le statut du *Settlement* passe à « *Libérable* », et Ahizan déclenche le *Payout* vers son compte Mobile Money ou bancaire.

### 2.5 Indicateurs de Performance
* Le vendeur consulte son tableau de bord de performance mesuré par Ahizan :
  * **Taux d'acceptation** (doit être supérieur à *95%*).
  * **Taux d'annulation / refus** (doit être le plus bas possible).
  * **Temps moyen de préparation**.
  * **Taux de rupture de stock** signalé lors de la préparation.
  * **Note moyenne des avis clients**.

---

# SECTION 3 : LE PARCOURS ET LES ACTIONS DU SUPERADMIN (ADMINISTRATEUR SYSTÈME)

Le Superadmin possède les privilèges les plus élevés sur la plateforme. Il gère l'infrastructure technique, la configuration de base de Vendure et la sécurité globale. Il n'intervient pas dans les opérations quotidiennes de vente ou de logistique.

### 3.1 Configuration de l'Infrastructure et du Framework Vendure
* **Gestion des Canaux (*Channels*)** : Il configure les différents canaux commerciaux (ex: *Ahizan B2C*, *Ahizan B2B*, *Canal Grossistes*).
* **Gestion des Plugins et Extensions** : Il installe, configure et met à jour les plugins techniques (plugin IA, plugin Logistique, passerelle de paiement Mobile Money FedaPay/Kkiapay, etc.).
* **Gestion du Schéma de Données (Custom Fields)** : Il définit les champs personnalisés (*Custom Fields*) sur les entités de Vendure.
  * *Exemple* : Ajouter un champ `latitude` / `longitude` sur l'entité *StockLocation* ou un champ `gtin` sur *ProductVariant*.
* **Gestion des Tâches Asynchrones (Workers)** : Il supervise la file d'attente des tâches complexes gérées par le *Worker* (générations d'images, calculs de tournées logistiques, imports massifs).

### 3.2 Contrôle d'Accès et Matrice des Permissions (Least Privilege)
* **Création de rôles personnalisés** : Le Superadmin configure les rôles des équipes internes d'Ahizan en leur associant des permissions limitées.
* **Attribution des permissions** : Il veille à ce qu'aucun rôle ne dispose de droits excessifs.
  * *Exemple* : Il s'assure que le rôle *Catalogue Operator* ne possède pas la permission `ManageSettlement` (Finance) ni `ApprovePayout`.
* **Gouvernance et audit** : Il configure et consulte le journal d'audit global (*Audit Log*), qui enregistre chaque modification critique effectuée par n'importe quel utilisateur du back-office (qui, quoi, quand, ancienne valeur, nouvelle valeur).

---

# SECTION 4 : LES ACTIONS DES PROFILS OPÉRATIONNELS INTERNES (AUTRES RÔLES)

Ahizan emploie plusieurs profils spécialisés pour piloter la marketplace au quotidien via le back-office d'administration.

## 4.1 Équipe Catalogue (Manager & Opérateurs)
L'équipe catalogue est la garante de la qualité du référentiel produit d'Ahizan. Elle utilise des outils d'assistance par Intelligence Artificielle.

* **Normalisation des fiches produits** : L'opérateur catalogue reçoit les propositions de fiches soumises par les vendeurs (données brutes, souvent informelles et mal orthographiées). Il utilise le pipeline IA pour les transformer en données propres et structurées.
  * *Exemple d'action* : Le vendeur a saisi : « *samsung galaxy a16 bleu 256go 8g ram garanti 12 mois* ». L'opérateur applique la normalisation IA qui génère :
    * Titre normalisé : **Samsung Galaxy A16 256 Go – 8 Go RAM – Bleu**
    * Attributs de Facettes : Marque = *Samsung* | Couleur = *Bleu* | Stockage = *256 Go* | RAM = *8 Go*
    * Custom Fields : Garantie = *12 mois*
* **Détection des doublons** : L'opérateur catalogue utilise l'outil de déduplication automatique pour fusionner les fiches identiques créées par erreur.
* **Modération des médias** : Il rejette les images floues, non conformes (ex: avec des filigranes de prix ou des textes publicitaires excessifs) et valide l'image principale sur fond neutre.
* **Approbation finale (*Publish*)** : Le *Catalogue Manager* vérifie le *Score de Qualité de la Fiche* (calculé automatiquement sur 100 points). Si le score est supérieur à 75%, il valide la fiche produit pour la rendre visible en ligne.

## 4.2 Équipe Marketplace (Responsable Vendeurs & Commandes)
Cette équipe gère la relation avec les commerçants et résout les incidents commerciaux.

* **Validation des vendeurs (KYC)** : Le *Seller Manager* examine les documents légaux soumis par les nouveaux vendeurs. Il valide ou rejette leur inscription.
* **Supervision des boutiques** : Il surveille le score de performance des vendeurs. Si une boutique accumule les retards de préparation ou les refus de commandes, le *Seller Manager* applique des sanctions (avertissement, restriction d'offres ou suspension temporaire de la boutique).
* **Gestion des litiges (*Disputes*)** : Le gestionnaire de litiges analyse les plaintes des clients (produit défectueux, erreur de livraison) et les réponses des vendeurs. Il tranche en faveur de l'une des parties et ordonne s'il y a lieu un remboursement.
* **Gestion des Remplacements (Le "Replacement Engine")** : Si un vendeur refuse une commande ou se déclare en rupture après paiement, la commande est bloquée temporairement logistiquement (*Delivery Hold*). Le *Order Manager* supervise le processus de réaffectation :
  * Le système recherche automatiquement les offres alternatives pour la même variante en stock chez d'autres vendeurs.
  * Si la différence de prix est inférieure au seuil autorisé (ex: *< 5%*), le système réaffecte automatiquement la ligne à la nouvelle offre et Ahizan prend la différence de coût à sa charge.
  * Si la différence est supérieure (ex: *+15%*), l'opérateur intervient pour proposer l'alternative au client ou procéder à un remboursement partiel.

## 4.3 Équipe Logistique (Logistics Manager, Livreurs & Opérateurs Hub)
L'équipe logistique orchestre le flux physique des produits des boutiques des vendeurs jusqu'aux clients.

* **Assignation des Missions de Collecte (*Pickup Missions*)** : Dès qu'un vendeur confirme qu'un colis est prêt, le gestionnaire logistique attribue une mission de collecte au livreur le plus proche via l'application mobile.
* **Consolidation au Hub (Opérateur Hub)** : L'opérateur reçoit les colis acheminés par les livreurs de collecte. Il scanne les codes-barres pour valider l'arrivée au hub d'Ahizan. En cas de commande multi-vendeurs, il regroupe les colis des différents vendeurs pour former l'expédition finale unique destinée au client.
* **Assignation des Missions de Livraison (*Delivery Missions*)** : Une fois le colis consolidé, le logisticien l'attribue à un coursier pour la livraison finale.
* **Gestion des échecs de livraison** : Si le client est absent ou injoignable, le livreur signale l'échec. Le logisticien planifie une nouvelle tentative ou ordonne le retour du colis au hub, puis le retour de chaque article à son vendeur d'origine si la livraison est définitivement impossible.

## 4.5 Équipe Financière (Finance Manager & Opérateurs)
Cette équipe contrôle les flux monétaires de la plateforme et garantit la sécurité financière.

* **Approbation des règlements vendeurs (*Settlements*)** : L'opérateur financier vérifie les montants calculés automatiquement par le système pour chaque vente finalisée (Prix de vente - Commission Ahizan - Frais).
* **Génération et exécution des Payouts** : Le système regroupe les settlements validés d'un vendeur pour générer un ordre de paiement (*Payout*).
* **Validation à double niveau (Sécurité financière)** : Pour tout paiement ou remboursement sensible (ex: *supérieur à 25 000 FCFA*), une double validation est obligatoire : l'opérateur financier saisit la demande, et le *Finance Manager* doit l'approuver dans le système pour qu'elle soit exécutée par les APIs de paiement.

---

# SECTION 5 : LES MOTEURS INTELLIGENTS ET ALGORITHMES D'AHIZAN

Pour automatiser les processus et optimiser les coûts, Ahizan implémente plusieurs moteurs logiques au-dessus de Vendure.

### 5.1 Le Pipeline de Normalisation IA
1. **Extraction** : L'IA extrait les entités clés du texte brut fourni par le vendeur (Marque, Modèle, Capacité, Couleur, etc.).
2. **Recherche de correspondance** : Elle vérifie si ces caractéristiques correspondent à des valeurs de Facettes ou catégories existantes dans la base d'Ahizan.
3. **Rédaction** : Elle rédige une description courte et une description détaillée structurée sous forme de points forts et spécifications techniques.
4. **Calcul du score de confiance** : Elle attribue un score de confiance à chaque donnée extraite. Si une information essentielle a un score de confiance trop faible (ex: *< 60%*), l'IA ne l'invente pas. Elle marque la donnée comme « *Non fournie / À valider* » et génère une alerte pour l'opérateur catalogue.

### 5.2 L'Algorithme de Remplacement de Vendeur (Rupture post-paiement)
Lorsqu'une offre acceptée est annulée par un vendeur pour rupture, le système calcule un score d'éligibilité pour chaque vendeur alternatif possédant la même variante en stock :

$$\text{Score Remplacement} = f(\text{Disponibilité stock}, \text{Prix de l'offre}, \text{Distance du vendeur}, \text{Note de performance du vendeur})$$

* Le système sélectionne l'offre ayant le score le plus élevé.
* **Règle de gestion financière** : 
  * Si le nouveau prix est inférieur : Le client conserve son prix d'achat initial, et la différence est créditée à Ahizan.
  * Si le nouveau prix est supérieur mais dans la limite tolérée (ex: *différence < 5%* ou *< 2000 FCFA*) : Le client ne paie rien de plus. Ahizan prend à sa charge la différence (déduite de sa marge de commission).
  * Si aucune alternative n'est viable ou si la différence de prix est trop élevée : Le système bloque la commande et notifie un opérateur pour contacter le client (proposition d'annulation avec remboursement ou acceptation de la différence par le client).

### 5.3 L'Algorithme de Sélection Logistique (Sélection du Stock)
Lorsqu'un client passe commande d'un produit disponible chez plusieurs vendeurs, et qu'il choisit l'option « *Livraison optimisée par Ahizan* », le système sélectionne automatiquement le vendeur selon l'algorithme de priorité suivant :
1. **Priorité 1** : Vendeur déjà sélectionné pour un autre produit de la même commande (pour minimiser les points de collecte et regrouper les colis).
2. **Priorité 2** : Proximité géographique (boutique du vendeur la plus proche de l'adresse de livraison du client).
3. **Priorité 3** : Note de fiabilité et temps de préparation historique du vendeur.
4. **Priorité 4** : Prix de l'offre.

---

# SECTION 6 : TABLEAU DE SYNTHÈSE DES DROITS ET ACTIONS PAR RÔLE

Le tableau ci-dessous résume de manière non exhaustive les droits d'accès aux fonctionnalités clés d'Ahizan pour les principaux profils.

| Fonctionnalité | Client | Vendeur | Opérateur Catalogue | Responsable Marketplace | Opérateur Financier | Responsable Financier | Superadmin |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **Recherche & Achat** | **✓** | — | — | — | — | — | — |
| **Créer une offre commerciale** | — | **✓** | — | — | — | — | — |
| **Modifier ses prix & stocks** | — | **✓** | — | — | — | — | — |
| **Créer / Normaliser une fiche produit** | — | Proposer | **✓** | — | — | — | — |
| **Approuver / Publier un produit** | — | — | — | **✓** (Manager) | — | — | — |
| **Confirmer / Préparer sa sous-commande**| — | **✓** | — | — | — | — | — |
| **Gérer les incidents & Remplacements** | — | — | — | **✓** | — | — | — |
| **Consulter les relevés financiers** | — | Limité | — | — | **✓** | **✓** | — |
| **Créer un ordre de reversement (Payout)**| — | — | — | — | **✓** | — | — |
| **Approuver un Payout / Remboursement** | — | — | — | — | — | **✓** (Seuils) | — |
| **Modifier la configuration technique** | — | — | — | — | — | — | **✓** |
| **Attribuer des rôles & permissions** | — | — | — | — | — | — | **✓** |

---

# SECTION 7 : LES 10 RÈGLES D'OR DE LA MARKETPLACE AHIZAN

1. **Unicité du Produit Catalogue** : Un même produit physique (ex: *Coca-Cola 50 cl* ou *Samsung Galaxy A16 Noir 256 Go*) ne doit jamais exister en double dans la base de données. Il y a un seul produit catalogue, auquel sont rattachées plusieurs offres de vendeurs différents.
2. **La Variante est l'unité vendable** : C'est la `ProductVariant` de Vendure qui porte le SKU, le prix de vente, et le stock, car c'est elle qui est ajoutée au panier par le client.
3. **Le Stock à une source de vérité unique** : Le stock opérationnel disponible à la vente sur la marketplace est géré en temps réel par Vendure (Stock physique - Stock alloué). Aucune autre base de données externe ne doit faire foi sans synchronisation transactionnelle stricte.
4. **Le Paiement client est distinct du règlement vendeur** : L'argent payé par le client va sur le compte d'Ahizan. Le reversement au vendeur (*Payout*) ne s'effectue qu'après validation de la livraison et expiration du délai de rétractation.
5. **Isolation stricte des données vendeurs** : Un vendeur ne doit jamais avoir accès, directement ou via l'API, aux données de vente, aux prix d'achat, aux stocks ou aux relevés financiers d'un autre vendeur de la plateforme.
6. **Le client ne subit pas la complexité multi-vendeurs** : Même si sa commande contient des articles de 5 vendeurs différents, le client effectue un seul paiement et reçoit une livraison unique consolidée (sauf demande contraire de sa part).
7. **Règles métier configurables** : Aucun paramètre commercial (taux de commission, délai de confirmation d'une commande, écart maximal de prix pour le remplacement) ne doit être écrit en dur dans le code. Ils doivent tous être modifiables via l'interface d'administration.
8. **Double validation pour les flux financiers** : Aucun virement de reversement (*Payout*) ou remboursement client d'un montant significatif ne doit être exécuté sans validation par un second utilisateur de l'équipe financière.
9. **Archivage plutôt que suppression** : Les entités critiques (vendeurs, offres, commandes, paiements) ne sont jamais supprimées physiquement de la base de données afin de préserver l'historique comptable et opérationnel. Elles sont désactivées ou archivées logiquement (*Soft Delete*).
10. **Vendure est le moteur, Ahizan est l'intelligence** : Le code spécifique développé pour Ahizan ne doit pas modifier le cœur de Vendure. Il doit s'intégrer sous forme de plugins, écouter les événements via l'EventBus et étendre les APIs existantes.

---
**Fin du Manuel Général Ahizan**
