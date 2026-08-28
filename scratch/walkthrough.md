# Walkthrough de l'Implémentation — Phase 4 (Dashboard Vendeur)

Ce document résume les modifications apportées pour intégrer l'**Assistant d'Onboarding & Carte Leaflet** (`TASK-SEL-01`) ainsi que la **Configuration des Modes de Paiement** (`TASK-CHK-01`) sur le Dashboard Vendeur d'Ahizan.

## 🛠️ Modifications Effectuées

### 1. Backend & Schéma GraphQL (`backend` & `seller`)
* **[queries.ts](file:///srv/ahizan/seller/src/lib/vendure/queries.ts)** : Mise à jour de la query `GetMyVendorFullProfileQuery` pour inclure tous les nouveaux champs du profil vendeur : `latitude`, `longitude`, `location` (relation quartier), `physicalMarket` (marché physique de résidence), `markets` (relation de diffusion secondaire), `paymentMethod`, `mobileMoneyProvider`, `mobileMoneyNumber`, `bankName`, et `bankAccountNumber`.

### 2. Formulaire des Paramètres Vendeur (`seller`)
* **[actions.ts](file:///srv/ahizan/seller/src/app/dashboard/settings/actions.ts)** :
  * Mise à jour de la fonction `updateVendorProfileAction` pour extraire tous les nouveaux champs géographiques, de marchés et de paiement depuis le `FormData`.
  * Transmission correcte et typée de ces informations dans le payload de la mutation `UpdateMyVendorProfileMutation`.
  * Conversion automatique des chaînes vides en valeurs `null` pour le backend afin de permettre aux vendeurs de désélectionner des champs (par ex. pour repasser hors-marché physique).
* **[account-settings-form.tsx](file:///srv/ahizan/seller/src/app/dashboard/settings/account-settings-form.tsx)** :
  * **Jauge d'Onboarding Premium** : Ajout d'une carte d'accueil à indicateur de progression circulaire dynamique (SVG) calculant en temps réel le taux de complétude du profil vendeur (sur 100%).
  * **Carte Interactive Leaflet & OpenStreetMap** : Chargement dynamique de Leaflet côté client (CSS et JS CDN) pour éviter les bugs SSR de Next.js. Intégration d'une carte interactive centrée par défaut sur Cotonou ou sur la position existante du vendeur. Les clics sur la carte ou le déplacement du marqueur modifient en temps réel les coordonnées GPS affichées.
  * **Sélecteurs de Quartier et Marché Principal** : Fetch des marchés et quartiers (`type: "NEIGHBORHOOD"`) directement depuis l'API Shop lors du montage du composant et liaison avec des selects Next.js à design premium.
  * **Marchés de Diffusion Secondaire** : Grille défilante de cases à cocher permettant aux vendeurs de choisir les marchés alternatifs dans lesquels leurs produits seront visibles.
  * **Modes de Règlement Acceptés** : Ajout d'un nouvel onglet "Paiements" affichant par défaut le paiement obligatoire en espèces à la livraison (Cash on Delivery). Sélection d'une méthode alternative principale (Mobile Money ou Virement Bancaire) dévoilant des inputs contextuels (Opérateur Momo, numéro de compte, nom de la banque, RIB) avec animations CSS.
  * **Gestion de l'annulation** : La fonction d'annulation réinitialise tous les états à leurs valeurs initiales, y compris le marqueur Leaflet et les options cochées.

## 🧪 Résultats de la Vérification
* **Reconstruction et Build Docker** : Succès complet de la compilation Next.js en mode production (`docker compose build seller` terminé sans erreurs).
* **Redémarrage** : Relance réussie du conteneur `ahizan_seller` qui est désormais à jour et opérationnel.
