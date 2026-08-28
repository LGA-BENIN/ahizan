

**AHIZAN**

**MARKETPLACE & SOCIAL COMMERCE**

**Cahier des charges produit**

Module Social Commerce — Découverte de produits par contenus courts

*Product Requirements Document (PRD)*

**Version 1.0**

Document de référence — Équipe Produit, Design, Architecture, Ingénierie, QA

Destinataires : Product Managers · UX/UI Designers · Architectes logiciels · Développeurs Front-end · Développeurs Back-end · DevOps · QA

*Marché cible : Bénin — Afrique de l'Ouest*

# **Comment lire ce document**

Ce cahier des charges décrit, de bout en bout, la transformation d'Ahizan en plateforme de Social Commerce. Il est structuré en seize chapitres autonomes, chacun pouvant être assigné à une ou plusieurs squads de développement sans dépendre d'une lecture linéaire intégrale, à condition que les chapitres 1, 2 et 6 (Vision, Architecture générale, Architecture technique) aient été lus en amont par toute personne rejoignant le projet.

**CONVENTIONS UTILISÉES**

* Besoin : le problème utilisateur ou business que la fonctionnalité résout.

* Objectifs : les résultats mesurables attendus.

* Fonctionnement : la description du comportement attendu du système.

* Parcours utilisateur : les scénarios pas-à-pas vécus par l'utilisateur.

* Cas particuliers : les situations limites à gérer explicitement.

* Règles métier : les contraintes non négociables, à coder en dur dans la logique métier.

* Impacts sur l'architecture existante : ce qui doit évoluer dans le système actuel.

* Implications techniques : choix d'implémentation, structures de données, API.

* Implications UX/UI : exigences d'interface et d'expérience.

* Risques : ce qui peut mal tourner, avec sa gravité.

* Recommandations : la position du Produit sur la manière de procéder.

Les schémas de flux et d'architecture sont représentés sous forme de blocs structurés (diagrammes textuels) afin de rester éditables et versionnables au même titre que le reste du document. Les équipes Architecture sont invitées à les reproduire dans l'outil de modélisation de leur choix (Excalidraw, Lucidchart, dbdiagram.io) dès le démarrage du chantier.

Toutes les tables de base de données sont des propositions de référence : les noms de colonnes et types doivent être validés avec le schéma Postgres réellement en production avant implémentation, mais la structure relationnelle et les contraintes métier qu'elles encodent sont, elles, normatives.

# **Table des matières**

# **1\. Vision du projet**

## **1.1 Le constat**

Ahizan fonctionne aujourd'hui comme une marketplace e-commerce classique : les vendeurs publient des fiches produits, les acheteurs recherchent, comparent, ajoutent au panier et commandent. Ce modèle suppose une intention d'achat déjà formée chez l'utilisateur au moment où il ouvre l'application.

Or l'observation des usages réels au Bénin — et plus largement en Afrique de l'Ouest — montre que la découverte de produits se fait très majoritairement en dehors des marketplaces : sur le fil Facebook, dans les Stories WhatsApp, sur TikTok, sur Instagram. Le consommateur voit un produit avant de chercher où l'acheter. La recherche active sur une marketplace est devenue une étape secondaire, parfois inexistante : l'utilisateur contacte directement le vendeur en message privé après avoir vu une vidéo ou une photo.

**Conséquence directe :** une marketplace qui n'investit que dans la recherche et la fiche produit optimise une étape du parcours d'achat que de plus en plus d'utilisateurs ne traversent plus dans cet ordre. Elle capte mal la phase de découverte, qui est pourtant celle où la décision d'achat se forme réellement.

## **1.2 Le positionnement stratégique**

Ahizan ne devient pas un réseau social. Aucune fonctionnalité de contenu libre, de statut personnel ou de fil social généraliste ne sera introduite. Le principe directeur, non négociable, est le suivant :

***« Tout contenu publié sur Ahizan doit être obligatoirement rattaché à un produit existant du catalogue. Aucun contenu libre n'est autorisé. »***

Cette règle structure l'intégralité du document : elle conditionne le modèle de données, les permissions, la modération, l'algorithme de recommandation et l'expérience vendeur. Un contenu sans produit associé est un état invalide du système, pas une simple anomalie à modérer après coup.

Le contenu est un canal de découverte du produit, jamais une finalité en soi. Concrètement, cela signifie que chaque écran de visionnage de contenu donne un accès immédiat à la fiche produit, aux variantes, au panier et à l'achat — sans rupture de parcours, sans redirection lente, sans recherche manuelle.

## **1.3 Le problème résolu**

**POUR LES VENDEURS**

* Ils utilisent déjà TikTok, Facebook et WhatsApp pour vendre, mais en dehors de tout cadre transactionnel structuré : pas de panier, pas de gestion de stock liée au contenu, pas de paiement sécurisé, pas de suivi de commande, pas de preuve sociale centralisée (avis).

* Ils perdent une partie de leurs ventes potentielles dans les échanges manuels en messagerie privée (négociation de prix par message, absence de paiement en ligne, livraison non trackée).

* Ils n'ont aucune vision consolidée de la performance de leurs contenus (vues, taux de clic vers le produit, taux de conversion).

**POUR LES ACHETEURS**

* Ils veulent découvrir des produits de la même façon qu'ils découvrent du contenu sur les réseaux sociaux qu'ils utilisent déjà au quotidien : par défilement vertical, en vidéo, sans recherche active.

* Ils veulent pouvoir acheter immédiatement ce qu'ils voient, sans devoir quitter l'application, retrouver le vendeur, puis chercher le produit manuellement.

* Ils veulent une expérience fluide même avec une connexion 2G/3G instable et un forfait de données limité.

**POUR AHIZAN (BUSINESS)**

* Augmenter le taux de découverte de produits sans dépendre uniquement de la recherche active, qui plafonne mécaniquement le nombre de transactions possibles.

* Augmenter le temps passé dans l'application et la fréquence de visite, deux leviers directs de la valeur vie client (LTV).

* Créer une boucle vertueuse où les meilleurs contenus génèrent des ventes, les ventes financent plus de contenus, et l'algorithme apprend à mieux faire correspondre offre et demande.

## **1.4 Objectifs business et UX**

**Objectifs business et indicateurs associés**

| Objectif business | Indicateur (KPI) | Cible indicative MVP |
| :---- | :---- | :---- |
| Augmenter la découverte de produits hors recherche | % de vues produit issues du flux Découvrir vs recherche | ≥ 20% à 6 mois |
| Réduire la friction entre découverte et achat | Délai médian entre 1ère vue d'un contenu et ajout au panier | \< 90 secondes |
| Augmenter la fréquence de visite | Sessions / utilisateur actif / semaine | \+30% vs baseline marketplace |
| Augmenter la rétention vendeur | % de vendeurs publiant au moins 1 contenu / semaine | ≥ 40% des vendeurs actifs |
| Maîtriser le coût de la donnée pour l'utilisateur | Mo consommés par session de visionnage (10 contenus) | \< 15 Mo en qualité standard |

Sur le plan UX, l'expérience cible doit atteindre un niveau de fluidité perçu équivalent aux applications de référence (TikTok, Reels) tout en conservant, à chaque instant, un accès en un geste vers l'achat — ce que ces applications, par construction, ne proposent pas nativement.

## **1.5 Ce que cette fonctionnalité n'est pas**

**HORS PÉRIMÈTRE, EXPLICITEMENT**

* Un réseau social généraliste : pas de statut libre, pas de publication sans produit, pas de messagerie de masse de type fil d'actualité personnel.

* Un concurrent direct de TikTok ou Instagram en tant que plateforme de divertissement : la rétention n'est pas recherchée pour elle-même, mais comme moyen d'augmenter la conversion marchande.

* Une fonctionnalité isolée : elle doit consommer et enrichir le catalogue, les comptes, les commandes et les statistiques existants, jamais les dupliquer dans un système parallèle.

## **1.6 Principes directeurs de conception**

* Le produit reste toujours au centre : aucune action de contenu n'existe sans qu'un produit soit atteignable en un tap.

* Mobile-first et low-bandwidth-first : toute décision technique est évaluée d'abord sous la contrainte d'une connexion 3G instable et d'un appareil d'entrée de gamme.

* Évolution progressive : un MVP exploitable doit pouvoir être livré avant que l'ensemble des fonctionnalités avancées (algorithme de recommandation complet, live shopping, IA générative) ne soit développé.

* Réutilisation maximale de l'existant : catalogue produits, comptes, panier, commandes, paiement et livraison ne sont pas reconstruits ; ils sont étendus.

* Mesurabilité dès le premier jour : chaque fonctionnalité expose les événements nécessaires à son évaluation (vues, clics, ajouts panier, conversions) avant même que l'algorithme de recommandation avancé n'existe.

# **2\. Architecture générale**

## **2.1 Principe d'intégration : extension, pas refonte**

Le module Social Commerce (nom de code interne : « Découvrir ») est conçu comme une couche additive au-dessus du cœur marketplace existant (catalogue, comptes, panier, commandes, paiement, livraison, avis). Aucune table existante n'est remplacée ; de nouvelles tables et de nouveaux services viennent s'y rattacher par clé étrangère, principalement vers \`products\`, \`sellers\` (comptes vendeurs) et \`users\` (comptes clients).

Cette approche limite le risque de régression sur les parcours d'achat actuels, permet un déploiement progressif derrière des feature flags, et garantit que toute commande générée depuis un contenu suit exactement le même pipeline (stock, paiement, livraison, facturation) qu'une commande générée depuis la recherche classique.

## **2.2 Vue d'ensemble des modules**

   
\+-------------------------------------------------------------------------+  
|                         AHIZAN — VUE D'ENSEMBLE                         |  
\+-------------------------------------------------------------------------+  
|                                                                         |  
|   MODULES EXISTANTS                  NOUVEAUX MODULES (SOCIAL COMMERCE) |  
|   \-------------------                \----------------------------------|  
|   \- Catalogue produits   \<---FK------ Contenus (vidéo / image / carrou.)|  
|   \- Comptes vendeurs     \<---FK------ Profil créateur vendeur          |  
|   \- Comptes clients      \<---FK------ Interactions (vue/like/share)    |  
|   \- Panier / Commandes   \<---events-- Achat depuis contenu             |  
|   \- Paiement / Livraison              Commentaires & modération        |  
|   \- Avis clients                      Flux "Decouvrir" \+ algorithme    |  
|   \- Recherche                         Notifications contenu            |  
|   \- Notifications                     Statistiques créateur            |  
|   \- Back-office Admin    \<---ext----- Back-office Modération/Tendances |  
|                                                                         |  
\+-------------------------------------------------------------------------+  
        Tous les nouveaux modules consomment l'API catalogue/commande       
        existante. Aucune duplication de la logique de stock, prix,        
        paiement ou livraison.                                             
 

## 

## 

## 

## 

## 

## **2.3 Schéma d'architecture logique**

   
  \[App mobile / Web client\]                \[App vendeur (création contenu)\]  
           |                                            |  
           v                                            v  
  \+-------------------------- API Gateway \--------------------------+  
  |   /catalog  /cart  /orders  /search   |  /content  /feed  /reco |  
  \+------------------+-------------------------------+--------------+  
                     |                                |  
        \+------------v-----------+        \+-----------v-----------+  
        |  Services existants    |        |  Services Social      |  
        |  \- Catalog Service     |\<-------\>|  Commerce (nouveaux)  |  
        |  \- Order Service       |  FK /   |  \- Content Service    |  
        |  \- Cart Service        | events  |  \- Feed/Reco Service  |  
        |  \- Payment Service     |         |  \- Interaction Service|  
        |  \- Seller Service      |         |  \- Moderation Service |  
        |  \- Notification Svc    |         |  \- Stats Service      |  
        \+------------+-----------+        \+-----------+-----------+  
                     |                                |  
                     v                                v  
        \+----------------------------------------------------------+  
        |     PostgreSQL (transactionnel : produits, commandes,    |  
        |     contenus, interactions)                              |  
        \+----------------------------------------------------------+  
                     |                                |  
                     v                                v  
        \+------------------------+      \+----------------------------+  
        |  Cache Redis (sessions,|      |  CDN (vidéos, images,      |  
        |  feed pré-calculé,      |      |  miniatures) \+ stockage    |  
        |  compteurs temps réel)  |      |  objet (S3-compatible)     |  
        \+------------------------+      \+----------------------------+  
 

## **2.4 Interactions avec les domaines existants**

**Matrice d'intégration avec l'existant**

| Domaine existant | Nature de l'intégration | Modification requise |
| :---- | :---- | :---- |
| Catalogue produits | Chaque contenu référence un product\_id (et éventuellement des variant\_id). Le contenu lit le catalogue en lecture seule. | Ajout d'index et d'un compteur dénormalisé content\_count sur products. |
| Comptes vendeurs | Le profil vendeur s'enrichit d'un profil créateur (bio courte, contenus publiés, abonnés). | Nouvelle table seller\_creator\_profile liée 1-1 à sellers. |
| Comptes clients | Chaque interaction (vue, like, commentaire, abonnement) est rattachée à un user\_id existant. | Aucune modification du schéma users ; ajout de tables d'interaction. |
| Panier / Commandes | L'ajout au panier depuis un contenu utilise l'API panier existante, avec un paramètre source=content pour la traçabilité. | Ajout d'une colonne source\_content\_id (nullable) sur order\_items. |
| Paiement / Livraison | Aucun changement : le tunnel de paiement et de livraison est strictement identique, quelle que soit l'origine de la commande. | Aucune. |
| Avis clients | Les avis existants peuvent être affichés en résumé sur la fiche produit accessible depuis un contenu. | Aucune modification de structure. |
| Recherche | Les contenus deviennent indexables par produit, catégorie et hashtag dans le moteur de recherche existant. | Extension de l'index de recherche (voir chapitre 8 — SEO interne). |
| Notifications | Le service de notifications existant est réutilisé pour les notifications liées au contenu (nouveau post d'un vendeur suivi, etc.). | Ajout de nouveaux types de notification dans le service existant. |
| Back-office Admin | Le back-office existant s'enrichit d'un module Modération et d'un module Tendances/Mise en avant. | Nouvel onglet et nouvelles permissions de rôle (voir chapitre 13). |

## **2.5 Nouveaux services applicatifs**

**Découpage en services (recommandé en architecture micro-service ou modulaire)**

| Service | Responsabilité | Dépend de |
| :---- | :---- | :---- |
| Content Service | CRUD des contenus, association produit, statuts (brouillon, publié, archivé, supprimé), upload vers le pipeline média. | Catalog Service, Seller Service, Media Pipeline |
| Media Pipeline | Réception de l'upload brut, transcodage multi-résolution, génération de miniatures, compression, publication sur CDN. | Stockage objet, file de jobs asynchrones |
| Feed / Reco Service | Construction du flux "Découvrir" personnalisé, scoring des contenus, mise en cache du feed par utilisateur. | Interaction Service, Content Service, Catalog Service |
| Interaction Service | Enregistrement des vues, likes, partages, temps de visionnage, ajouts au panier depuis un contenu, abonnements. | Content Service, Order Service (événements) |
| Moderation Service | File de modération (auto \+ manuelle), signalements, règles de blocage automatique, audit trail. | Content Service, fournisseur de modération automatique (texte/image/vidéo) |
| Stats Service | Agrégation des indicateurs vendeur (vues, CTR, taux de conversion, revenus générés par contenu). | Interaction Service, Order Service |
| Notification Service (extension) | Émission des notifications liées au contenu vers le service de notification existant. | Notification Service existant |

## **2.6 Permissions et rôles — vue d'ensemble**

Le système de rôles existant (client, vendeur, administrateur) est conservé et étendu. Le détail des permissions par fonctionnalité est précisé dans chaque chapitre concerné ; la table ci-dessous donne la vue d'ensemble transverse.

**Rôles et capacités au niveau module Social Commerce**

| Rôle | Capacités principales |
| :---- | :---- |
| Client (acheteur) | Voir le flux Découvrir, liker, commenter, partager, s'abonner à un vendeur, acheter depuis un contenu, signaler un contenu. |
| Vendeur | Créer/éditer/publier/dépublier ses propres contenus, voir ses statistiques, répondre aux commentaires sur ses contenus, gérer ses abonnés (lecture seule). |
| Modérateur (équipe Ahizan) | Voir la file de modération, approuver/rejeter un contenu, suspendre un compte vendeur du module contenu, traiter les signalements. |
| Administrateur | Toutes les capacités modérateur, plus la gestion des tendances, la mise en avant éditoriale, l'accès aux statistiques globales, la configuration de l'algorithme. |

## **2.7 Risques transverses liés à l'architecture**

**RISQUES**

* Couplage trop fort entre Content Service et Catalog Service pouvant fragiliser le catalogue existant en cas de pic de charge sur le flux Découvrir — mitigation : files asynchrones et cache, jamais d'appel synchrone bloquant sur le catalogue pour la lecture du feed.

* Dérive vers un système de contenu "libre" sous la pression produit (ex. demande future de publier sans produit) — mitigation : contrainte NOT NULL sur product\_id dès le schéma initial, décision produit déjà actée au chapitre 1\.

* Duplication de données entre catalogue et contenu (ex. prix figé dans le contenu) créant des incohérences si le prix change — mitigation : le contenu ne stocke jamais de prix, il référence toujours le produit en temps réel.

**RECOMMANDATIONS**

* Démarrer avec une architecture modulaire au sein du même backend que l'existant (modules logiques séparés) plutôt qu'une bascule immédiate en microservices indépendants, afin de limiter la complexité opérationnelle pendant le MVP.

* Isoler dès le départ le Media Pipeline (transcodage vidéo) comme un service à part, car ses besoins en ressources (CPU/GPU, stockage, scalabilité) sont très différents du reste du backend.

* Mettre en place des feature flags par fonctionnalité (flux Découvrir, achat in-content, commentaires, etc.) pour permettre des rollouts progressifs et des rollbacks instantanés.

# **3\. Expérience vendeur**

Ce chapitre couvre l'ensemble du parcours du vendeur, depuis la création d'un contenu jusqu'à l'analyse de sa performance. L'enjeu central est de reproduire la simplicité de publication d'un TikTok ou d'un Facebook, tout en imposant l'association obligatoire à un produit du catalogue, sans que cette contrainte ne soit perçue comme un frein par le vendeur.

### **3.1 Création d'un contenu**

**BESOIN**

Le vendeur doit pouvoir publier un contenu (vidéo, photo, carrousel) présentant un produit aussi rapidement et naturellement qu'il le ferait sur un réseau social, sans courbe d'apprentissage.

**OBJECTIFS**

* Réduire le temps moyen de publication à moins de 90 secondes pour un vendeur déjà équipé d'un média.

* Garantir que 100% des contenus publiés sont rattachés à un produit valide et actif du catalogue.

* Permettre la réutilisation de contenus déjà tournés pour d'autres réseaux (import direct depuis la galerie du téléphone).

**FONCTIONNEMENT**

Le vendeur initie la création via un bouton flottant « \+ Publier » visible sur son espace vendeur et sur la page Découvrir.

Étape 1 — Média : capture via l'appareil photo intégré ou import depuis la galerie (vidéo jusqu'à 90 secondes en MVP, photo, ou jusqu'à 10 médias pour un carrousel).

Étape 2 — Association produit (obligatoire) : recherche dans son propre catalogue par nom, catégorie ou scan du code produit interne ; sélection éventuelle d'une ou plusieurs variantes mises en avant.

Étape 3 — Habillage : légende, hashtags suggérés automatiquement à partir de la catégorie et du titre du produit, sélection d'une miniature (auto-générée ou choisie manuellement sur la timeline vidéo).

Étape 4 — Édition légère intégrée : recadrage, ajustement de la durée, ajout d'un texte superposé, sélection d'une vignette "prix" optionnelle générée automatiquement à partir du prix catalogue.

Étape 5 — Aperçu fidèle au rendu final dans le flux, puis publication immédiate ou enregistrement en brouillon.

**PARCOURS UTILISATEUR**

* Un vendeur de prêt-à-porter filme une vidéo de 30 secondes montrant un boubou. Il ouvre Ahizan, appuie sur Publier, sélectionne la vidéo dans sa galerie, recherche "Boubou wax bleu" dans son catalogue, sélectionne la variante Taille L, ajoute la légende, vérifie l'aperçu et publie. Le contenu apparaît dans le flux Découvrir et sur sa page boutique en moins de 2 minutes.

* Un vendeur sans produit encore catalogué tente de publier : le système l'interrompt avant l'étape média et le redirige vers la création de fiche produit, avec reprise automatique du flux de publication une fois la fiche créée.

**CAS PARTICULIERS**

* Produit en rupture de stock au moment de la publication : la publication est autorisée mais le contenu affiche un badge "Rupture de stock" et le bouton d'achat est désactivé jusqu'au réapprovisionnement.

* Produit désactivé ou supprimé après la publication du contenu : le contenu passe automatiquement en statut "Masqué" et n'apparaît plus dans le flux tant que le produit n'est pas réactivé.

* Vendeur tentant d'associer un produit appartenant à un autre vendeur : refusé au niveau API (le product\_id doit appartenir au seller\_id authentifié).

* Connexion interrompue pendant l'upload : le brouillon est conservé localement et l'upload reprend automatiquement (chunked upload avec reprise) dès le retour du réseau.

**RÈGLES MÉTIER**

* Un contenu ne peut être publié sans product\_id valide, actif, et appartenant au vendeur authentifié — contrainte appliquée au niveau base de données (NOT NULL \+ clé étrangère) et non uniquement côté interface.

* Durée vidéo maximale en Phase 1 (MVP) : 90 secondes. Poids maximal en entrée avant compression : 200 Mo.

* Un carrousel contient entre 2 et 10 médias, tous rattachés au même produit principal (des variantes différentes peuvent être illustrées).

* La langue de modération automatique (texte de légende, audio transcrit) couvre a minima le français en MVP.

**IMPACTS SUR L'ARCHITECTURE EXISTANTE**

* Nouvelle table contents avec clé étrangère obligatoire vers products et vers sellers.

* Nouveau pipeline asynchrone de traitement média (upload brut \-\> file de transcodage \-\> publication CDN) découplé du service de création de contenu pour ne pas bloquer l'interface vendeur.

**IMPLICATIONS TECHNIQUES**

* Upload en chunks (ex. tus.io ou équivalent) pour supporter la reprise sur connexion instable.

* Génération automatique de 3 résolutions vidéo (voir chapitre 7\) et d'au moins 2 miniatures candidates dès la fin du transcodage.

* API POST /v1/contents en statut draft dès l'étape média, puis PATCH successifs à chaque étape pour ne jamais perdre la progression du vendeur.

**IMPLICATIONS UX / UI**

* Flux de création en plein écran, en 5 étapes maximum, avec barre de progression visible et possibility de revenir en arrière sans perte de données.

* Recherche produit instantanée (debounce 200 ms) avec affichage de la photo, du nom et du prix du produit pour confirmation visuelle avant association.

* Aucun écran ne doit jamais permettre de passer à l'étape suivante sans qu'un produit soit sélectionné — le bouton "Suivant" reste désactivé.

**RISQUES**

* Frein à l'adoption si le flux de création est perçu comme plus lourd que TikTok/Facebook — mitigation : recherche produit ultra-rapide et mémorisation du dernier produit publié pour pré-remplissage.

* Vendeurs publiant des contenus de mauvaise qualité technique (vidéo très lourde, mal cadrée) dégradant l'expérience globale — mitigation : compression automatique côté serveur quoi qu'il arrive, recommandations à l'écran de capture.

**RECOMMANDATIONS**

* Livrer dès le MVP un mode "republication rapide" permettant de dupliquer un contenu existant en ne changeant que le média, pour les vendeurs publiant des variations régulières du même produit.

* Prioriser l'import direct depuis la galerie plutôt que la capture intégrée pour la Phase 1, la majorité des vendeurs ayant déjà l'habitude de filmer pour TikTok/Facebook avant de republier ailleurs.

### **3.2 Gestion des brouillons**

**BESOIN**

Permettre au vendeur d'interrompre une création de contenu et de la reprendre plus tard, notamment en contexte de connexion instable ou de disponibilité limitée.

**FONCTIONNEMENT**

Tout contenu non publié est automatiquement sauvegardé en statut draft après chaque étape complétée.

Une section "Brouillons" dans l'espace vendeur liste les contenus non publiés, triés par date de dernière modification.

Un brouillon peut être édité, dupliqué ou supprimé.

**RÈGLES MÉTIER**

* Un brouillon sans produit associé ne peut pas exister au-delà de l'étape 1 du flux de création (voir 3.1) — l'association produit est forcée avant toute autre sauvegarde de contenu réel.

* Les brouillons sont conservés 90 jours puis supprimés automatiquement avec notification préalable au vendeur 7 jours avant suppression.

**IMPLICATIONS UX / UI**

* Badge visuel "Brouillon" distinct sur la vignette dans l'espace vendeur pour éviter toute confusion avec un contenu publié.

**RECOMMANDATIONS**

* Limiter à 20 le nombre de brouillons simultanés par vendeur en MVP pour contenir le stockage média non publié.

### **3.3 Publication, dépublication et statuts**

**BESOIN**

Donner au vendeur un contrôle clair sur la visibilité de ses contenus dans le temps, en cohérence avec la disponibilité réelle du produit.

**FONCTIONNEMENT**

Statuts possibles : brouillon (draft), en cours de traitement média (processing), en attente de modération (pending\_review — voir chapitre 10), publié (published), masqué automatiquement (auto\_hidden, ex. rupture de stock), dépublié manuellement (unpublished), supprimé (deleted, soft-delete avec rétention 30 jours).

**RÈGLES MÉTIER**

* Le passage automatique published \-\> auto\_hidden intervient en moins de 5 minutes après que le produit associé passe en rupture de stock ou en statut inactif.

* Un contenu supprimé par le vendeur n'est pas immédiatement effacé (soft-delete) afin de permettre une restauration en cas d'erreur et de conserver l'historique statistique.

**IMPACTS SUR L'ARCHITECTURE EXISTANTE**

* Colonne status sur la table contents avec index pour les requêtes de flux ne portant que sur status \= 'published'.

**IMPLICATIONS UX / UI**

* Le vendeur peut dépublier/republier en un tap depuis la liste de ses contenus, sans repasser par le flux de création.

### **3.4 Statistiques de contenu (vue vendeur)**

**BESOIN**

Le vendeur doit comprendre la performance commerciale réelle de chaque contenu, pas seulement son audience, pour orienter ses prochaines publications.

**OBJECTIFS**

* Faire apparaître un lien direct entre publication de contenu et chiffre d'affaires généré, afin de renforcer l'engagement des vendeurs sur le module.

**FONCTIONNEMENT**

Chaque contenu publié dispose d'une fiche statistique individuelle : vues, temps de visionnage moyen, taux de complétion, likes, partages, commentaires, clics vers la fiche produit, ajouts au panier, commandes générées, chiffre d'affaires attribué.

Une vue agrégée "Tableau de bord créateur" présente l'évolution sur 7/30/90 jours et le classement des contenus les plus performants par taux de conversion.

**RÈGLES MÉTIER**

* L'attribution d'une commande à un contenu suit une fenêtre d'attribution de 24 heures après le dernier clic depuis ce contenu (dernier clic gagnant). Si l'utilisateur a vu plusieurs contenus du même produit, c'est le dernier cliqué qui est crédité.

**IMPACTS SUR L'ARCHITECTURE EXISTANTE**

* S'appuie sur le Stats Service décrit en 2.5, alimenté par les événements de l'Interaction Service et par les commandes marquées source\_content\_id.

**IMPLICATIONS UX / UI**

* Visualisations simples (courbes, barres) lisibles sur petit écran, avec export CSV pour les vendeurs souhaitant une analyse plus poussée (Phase 2).

**RECOMMANDATIONS**

* En MVP, livrer uniquement les métriques essentielles (vues, ajouts panier, commandes, CA) ; reporter les analyses comportementales fines (heatmap de rétention vidéo) en Phase 2 — voir chapitre 12 pour le détail complet.

### **3.5 Modération côté vendeur**

**BESOIN**

Le vendeur doit savoir à tout moment si un contenu est conforme, en attente, ou rejeté, et comprendre pourquoi en cas de rejet.

**FONCTIONNEMENT**

Statut de modération visible directement sur chaque contenu dans l'espace vendeur, avec motif explicite en cas de rejet (ex. "Produit non identifiable dans la vidéo", "Contenu trompeur sur le prix").

Possibilité de corriger et resoumettre un contenu rejeté sans recommencer la création depuis zéro.

**IMPACTS SUR L'ARCHITECTURE EXISTANTE**

* Renvoie vers le Moderation Service détaillé au chapitre 10\.

### **3.6 Gestion des commentaires (vue vendeur)**

**BESOIN**

Le vendeur doit pouvoir répondre rapidement aux questions posées en commentaire sous ses contenus, ces questions étant souvent des signaux d'achat direct ("Disponible en taille M ?").

**FONCTIONNEMENT**

Liste centralisée de tous les commentaires reçus sur l'ensemble de ses contenus, avec tri par "non répondu" en priorité.

Réponse directe depuis cette liste, sans ouvrir chaque contenu individuellement.

Possibilité d'épingler un commentaire (ex. une question fréquente déjà répondue) en tête des commentaires visibles publiquement.

**RÈGLES MÉTIER**

* Le vendeur peut masquer un commentaire sur ses propres contenus, mais ne peut pas le supprimer définitivement ni bloquer un utilisateur sans passer par un signalement traité par la modération (voir chapitre 10).

**IMPLICATIONS UX / UI**

* Notification en temps quasi-réel (push) lors d'un nouveau commentaire, avec regroupement si plusieurs commentaires arrivent en rafale, pour ne pas saturer le vendeur de notifications.

## **3.7 Bonnes pratiques recommandées au vendeur (contenu in-app)**

Un guide court doit être intégré directement dans le flux de création (et non comme une page séparée que personne ne lit), sous forme de conseils contextuels affichés au bon moment :

* Filmer en vertical (9:16), produit visible dans les 2 premières secondes.

* Montrer le produit en usage réel plutôt qu'en photo statique pour augmenter le taux de conversion.

* Mentionner le prix ou la fourchette de prix à l'oral ou en superposition texte, même si le prix réel reste celui du catalogue (évite les abandons liés à un prix perçu comme caché).

* Publier régulièrement plutôt qu'en rafale : l'algorithme de recommandation (chapitre 9\) favorise la régularité dans le scoring de fraîcheur.

# **4\. Expérience client**

Ce chapitre détaille le parcours de l'acheteur, de la découverte d'un produit en flux vertical jusqu'à l'achat, en passant par toutes les interactions sociales qui soutiennent la décision (favoris, partage, commentaires, abonnement). L'objectif constant : ne jamais interrompre le défilement pour accomplir une action d'achat.

### **4.1 Nouvelle page « Découvrir »**

**BESOIN**

Offrir un point d'entrée dédié à la découverte de produits par contenu, distinct de la recherche, accessible en un tap depuis la navigation principale.

**OBJECTIFS**

* Devenir, à terme, l'un des deux points d'entrée principaux de l'application aux côtés de la recherche/catalogue.

* Maximiser le temps avant la première interaction d'achat sans dégrader le taux de conversion global.

**FONCTIONNEMENT**

Nouvel onglet « Découvrir » dans la barre de navigation principale (icône dédiée, ex. boussole ou éclair), positionné de manière à ne pas reléguer la recherche/catalogue en second plan.

Ouverture sur un flux vertical plein écran de contenus, lecture automatique au premier contenu visible.

La page d'accueil de la marketplace conserve un bandeau "aperçu" (carrousel horizontal de 6 à 10 contenus tendance) renvoyant vers le flux complet — voir 4.2.

**PARCOURS UTILISATEUR**

* Un utilisateur ouvre l'application, tape sur l'onglet Découvrir, et commence à faire défiler verticalement comme sur un réseau social classique. Au bout du troisième contenu, il voit un sac à dos en vidéo, tape sur la fiche produit superposée, sélectionne une couleur, l'ajoute au panier sans quitter le flux, et continue de défiler.

**IMPACTS SUR L'ARCHITECTURE EXISTANTE**

* Nouvel onglet de navigation au niveau de l'application (Front-end), aucune nouvelle entité de données propre — s'appuie sur le Content Service et le Feed/Reco Service.

**IMPLICATIONS UX / UI**

* Lecture automatique du contenu visible à l'écran, pause automatique de tout contenu qui sort du cadre, pour économiser bande passante et batterie (voir chapitre 7).

**RECOMMANDATIONS**

* En MVP, le flux peut être trié par fraîcheur \+ popularité simple (voir 9.1) avant que l'algorithme de recommandation personnalisé complet ne soit disponible (Phase 3).

### **4.2 Aperçu en page d'accueil**

**BESOIN**

Donner de la visibilité au module Découvrir sans en faire le point d'entrée unique, pour les utilisateurs qui arrivent encore avec une intention de recherche.

**FONCTIONNEMENT**

Un bandeau "Tendances en vidéo" ou équivalent, positionné après les premières sections de la page d'accueil existante, affiche un carrousel horizontal de 6 à 10 vignettes de contenus.

Le tap sur une vignette ouvre directement le flux vertical complet, positionné sur ce contenu.

**IMPLICATIONS UX / UI**

* Vignettes avec lecture en boucle silencieuse de 2-3 secondes (aperçu) uniquement en Wi-Fi ou si le mode économie de données est désactivé — sinon image statique avec icône de lecture.

### **4.3 Flux vertical et lecture de contenu**

**BESOIN**

Reproduire la fluidité de défilement des standards du marché (TikTok, Reels) tout en conservant la marchandisation native.

**FONCTIONNEMENT**

Défilement vertical par swipe, un contenu occupe l'intégralité de l'écran.

Lecture automatique sans son par défaut (voir chapitre 7), activation du son par tap.

Boutons d'action latéraux : like, commentaires, partage, favoris, profil vendeur (avec bouton suivre).

Superposition produit en bas d'écran : photo miniature, nom du produit, prix, bouton "Voir le produit" et bouton rapide "Ajouter au panier".

**PARCOURS UTILISATEUR**

* Défilement passif : l'utilisateur regarde plusieurs contenus à la suite sans interagir — le système enregistre uniquement le temps de visionnage et la complétion pour alimenter l'algorithme.

* Intention d'achat immédiate : l'utilisateur tape directement sur "Ajouter au panier" depuis la superposition, sans ouvrir la fiche produit complète, si une seule variante existe ou si la dernière variante consultée peut être présélectionnée.

* Exploration produit : l'utilisateur tape sur "Voir le produit", la fiche produit s'ouvre en panneau superposé (bottom sheet) sans quitter le contexte vidéo, qui continue de jouer en arrière-plan réduit.

**CAS PARTICULIERS**

* Contenu de type carrousel associé à un produit avec variantes : le swipe horizontal à l'intérieur du contenu change l'image, tandis que le swipe vertical change de contenu — ces deux gestes doivent être distingués sans ambiguïté côté UX.

* Vidéo qui se termine avant que l'utilisateur ne swipe : lecture en boucle automatique tant que le contenu reste à l'écran.

* Perte de connexion en cours de visionnage : affichage d'un indicateur discret de qualité réduite plutôt qu'un blocage total (voir chapitre 7).

**IMPLICATIONS TECHNIQUES**

* Préchargement du contenu suivant uniquement (jamais plus, en mode économie de données) dès que le contenu courant atteint 50% de lecture.

* Lazy unmount des contenus précédents au-delà d'une fenêtre de 2 positions pour limiter la consommation mémoire sur appareils d'entrée de gamme.

**IMPLICATIONS UX / UI**

* La fiche produit en bottom sheet ne doit jamais masquer entièrement le contenu vidéo : hauteur maximale de 70% de l'écran, fond du contenu visible et assourdi en arrière-plan.

**RISQUES**

* Confusion gestuelle entre swipe horizontal (carrousel) et swipe vertical (changement de contenu) pouvant frustrer l'utilisateur — mitigation : zone de detection de geste avec seuil d'angle, tests utilisateurs dédiés avant le lancement.

### **4.4 Achat sans quitter le contenu**

**BESOIN**

Supprimer toute friction entre le moment où le désir d'achat se forme (en regardant le contenu) et l'action d'achat.

**OBJECTIFS**

* Permettre un ajout au panier en un seul tap depuis le flux pour au moins 60% des cas (produits à variante unique ou variante par défaut déterminable).

**FONCTIONNEMENT**

Bouton "Ajouter au panier" toujours visible en superposition.

Si le produit a plusieurs variantes (taille, couleur), un tap ouvre un sélecteur compact en bottom sheet plutôt que la fiche produit complète, pour rester rapide.

Une icône panier persistante (badge avec compteur) reste visible en haut du flux, permettant d'accéder au panier et de finaliser la commande sans perdre sa position dans le flux (retour automatique au même contenu après paiement ou abandon).

**RÈGLES MÉTIER**

* L'ajout au panier depuis un contenu enregistre systématiquement le content\_id source pour l'attribution statistique (voir 3.4) et pour l'algorithme de recommandation.

* Le contrôle de stock au moment de l'ajout au panier suit exactement la même logique que le reste de la marketplace : aucune règle de stock spécifique au module contenu.

**IMPACTS SUR L'ARCHITECTURE EXISTANTE**

* Réutilisation intégrale du Cart Service existant ; seul un paramètre de traçabilité est ajouté à l'appel API d'ajout au panier.

**IMPLICATIONS UX / UI**

* Confirmation visuelle légère (micro-animation, pas de redirection de page) lors de l'ajout au panier, pour que l'utilisateur puisse immédiatement reprendre son défilement.

### **4.5 Favoris**

**BESOIN**

Permettre à l'utilisateur de sauvegarder un produit découvert en vidéo pour un achat différé, comportement d'achat très fréquent en social commerce ("je regarde, je réfléchis, j'achète plus tard").

**FONCTIONNEMENT**

Le bouton favoris sur un contenu ajoute le produit associé (pas le contenu lui-même) à la liste de favoris existante de la marketplace.

**IMPACTS SUR L'ARCHITECTURE EXISTANTE**

* Réutilisation complète du système de favoris existant — le contenu n'est qu'un point d'entrée supplémentaire vers l'ajout en favoris, aucune nouvelle table de favoris liée au contenu n'est nécessaire.

**RECOMMANDATIONS**

* Utiliser les ajouts en favoris depuis un contenu comme signal fort (supérieur au like) dans l'algorithme de recommandation, car il traduit une intention d'achat différé plus qu'un simple engagement social.

### **4.6 Partage**

**BESOIN**

Exploiter la viralité native des réseaux sociaux comme canal d'acquisition gratuit, en permettant le partage d'un contenu hors de l'application.

**FONCTIONNEMENT**

Bouton de partage générant un lien profond (deep link) vers le contenu, exploitable sur WhatsApp, Facebook, Messenger ou par copie de lien.

Un utilisateur sans l'application qui ouvre ce lien est redirigé vers une page web légère présentant le contenu et le produit, avec incitation à installer l'application pour acheter.

**IMPLICATIONS TECHNIQUES**

* Génération de deep links via un service de liens dynamiques compatible iOS/Android/Web, avec tracking de la source de partage pour mesurer la viralité (Phase 2).

**RECOMMANDATIONS**

* Prioriser le partage WhatsApp en premier dans la liste des options, WhatsApp étant le canal social dominant au Bénin.

### **4.7 Commentaires (vue client)**

**BESOIN**

Permettre les questions publiques sous un contenu, qui servent à la fois de support d'achat (réponses du vendeur visibles par tous) et de preuve sociale.

**FONCTIONNEMENT**

Zone de commentaires accessible en bottom sheet depuis le flux, sans interrompre la lecture du contenu en arrière-plan.

Réponses du vendeur affichées avec un badge "Vendeur" distinctif.

Possibilité de liker un commentaire.

**CAS PARTICULIERS**

* Un utilisateur tente de publier un numéro de téléphone ou un lien externe en commentaire pour court-circuiter la transaction in-app : ce comportement doit être détecté et limité (voir 10.4) sans pour autant bloquer les échanges légitimes.

**RÈGLES MÉTIER**

* Tout commentaire passe par les filtres de modération automatique de base (anti-spam, anti-injure) avant publication — voir chapitre 10\.

### **4.8 Abonnement aux vendeurs**

**BESOIN**

Permettre à un utilisateur de suivre les vendeurs dont il apprécie les produits ou le style de présentation, pour recevoir leurs nouvelles publications en priorité.

**FONCTIONNEMENT**

Bouton "Suivre" sur le profil vendeur accessible depuis tout contenu.

Les contenus des vendeurs suivis bénéficient d'un boost de visibilité dans le flux personnalisé (voir chapitre 9\) et déclenchent une notification optionnelle à chaque nouvelle publication.

**IMPACTS SUR L'ARCHITECTURE EXISTANTE**

* Nouvelle table follows (user\_id, seller\_id, created\_at), indépendante du compte vendeur lui-même.

**IMPLICATIONS UX / UI**

* Le profil vendeur, accessible en un tap, affiche en grille l'ensemble de ses contenus publiés, son nombre d'abonnés, et un résumé (nombre de produits, note moyenne).

### **4.9 Recommandations affichées au client**

**BESOIN**

Maintenir l'engagement du flux en proposant une suite cohérente de contenus pertinents, sans que l'utilisateur n'ait à formuler de recherche.

**FONCTIONNEMENT**

Le contenu suivant dans le flux est déterminé par le Feed/Reco Service (détaillé au chapitre 9), combinant fraîcheur, popularité, pertinence par rapport à l'historique de l'utilisateur, et diversité (catégories variées pour éviter la lassitude).

**IMPACTS SUR L'ARCHITECTURE EXISTANTE**

* Le flux est pré-calculé et mis en cache (Redis) par utilisateur, avec rafraîchissement incrémental, pour garantir un temps de chargement quasi instantané malgré la complexité du scoring.

## **4.10 Schéma du parcours client de bout en bout**

   
\[Accueil\] \--tap Decouvrir--\> \[Flux vertical plein ecran\]  
                                   |  
                    \+--------------+---------------+  
                    |                               |  
              \[Defilement passif\]            \[Interaction\]  
                    |                               |  
         (vue, like, temps de visionnage      \+-----+-----+-----+-----+  
          enregistres pour la reco)            |     |     |     |  
                                              Favoris Partage Suivre Commenter  
                                                |  
                                          \[Voir le produit\] \-- bottom sheet  
                                                |  
                                    \+-----------+-----------+  
                                    |                       |  
                          \[Ajouter au panier\]        \[Continuer a explorer\]  
                                    |                       |  
                          \[Panier existant\]          (retour au flux,  
                                    |                  meme position)  
                          \[Paiement / Livraison  
                           \-- pipeline existant \--\]  
                                    |  
                          \[Confirmation commande\]  
                                    |  
                          (retour automatique au flux,  
                           position conservee)  
 

# **5\. Types de contenus**

Tous les types de contenus listés ci-dessous partagent la même contrainte fondamentale : association obligatoire à un produit. Ils se distinguent par leur format et leur usage commercial. Le MVP ne couvre qu'un sous-ensemble ; le reste est introduit progressivement (voir chapitre 14).

## **5.1 Vue d'ensemble et priorisation**

**Types de contenus et phase de livraison cible**

| Type de contenu | Description | Phase de livraison |
| :---- | :---- | :---- |
| Vidéo courte | Vidéo verticale jusqu'à 90s en MVP (extensible à 3 min en Phase 2), lecture en boucle. | Phase 1 — MVP |
| Photo | Image unique mettant en avant le produit, avec légende. | Phase 1 — MVP |
| Carrousel | 2 à 10 médias (photo et/ou vidéo courte) navigables horizontalement au sein d'un même contenu. | Phase 1 — MVP |
| Démonstration produit | Vidéo orientée usage réel du produit (mode d'emploi, test, comparatif). | Phase 2 |
| Avant / Après | Format à deux temps mettant en valeur un résultat (ex. produits cosmétiques, rénovation). | Phase 2 |
| Témoignage client | Contenu intégrant un avis client filmé ou une citation d'avis existant, relié au produit et à l'avis source. | Phase 2 |
| Unboxing | Vidéo de déballage, format à forte valeur de réassurance pré-achat. | Phase 2 |
| Promotion / Offre limitée | Contenu lié à une remise ou une offre à durée déterminée sur le produit, avec compte à rebours visuel. | Phase 2 |
| Live Shopping | Diffusion en direct avec vente en temps réel, chat live, mise en avant dynamique de produits. | Phase 5 |

### **5.2 Vidéo courte**

**BESOIN**

Format de référence du social commerce, le plus engageant et le plus proche des usages déjà existants des vendeurs sur TikTok et Facebook.

**RÈGLES MÉTIER**

* Durée : 5 à 90 secondes en Phase 1\.

* Format vertical 9:16 recommandé ; un format paysage importé est automatiquement recadré ou bordé (letterboxing) selon le choix du vendeur à l'étape d'édition.

* Une seule vidéo source par contenu (le multi-clip relève du format Carrousel).

**IMPLICATIONS TECHNIQUES**

* Voir chapitre 6 et 7 pour le pipeline de transcodage et les profils de compression spécifiques à ce format.

### **5.3 Photo**

**BESOIN**

Format le plus rapide à produire, adapté aux vendeurs sans matériel ou compétence vidéo, et historiquement déjà utilisé sur la marketplace existante pour les fiches produits.

**FONCTIONNEMENT**

Une image haute résolution est compressée en plusieurs tailles (voir 6.4) et affichée en plein écran dans le flux, avec une durée d'affichage par défaut de 5 secondes avant transition automatique si l'utilisateur n'interagit pas — comportement désactivable par préférence utilisateur.

**IMPLICATIONS UX / UI**

* Le format photo doit rester aussi engageant que la vidéo dans le flux : légère animation de zoom (effet Ken Burns) à la lecture pour éviter un rendu statique en rupture avec le reste du flux.

### **5.4 Carrousel**

**BESOIN**

Permettre de présenter plusieurs angles, variantes ou étapes d'usage d'un même produit sans multiplier les publications.

**RÈGLES MÉTIER**

* 2 à 10 médias par carrousel, tous rattachés au même produit principal.

* Chaque média du carrousel peut être tagué avec une variante spécifique (ex. image 1 \= couleur bleue, image 2 \= couleur rouge) pour présélectionner automatiquement la variante correspondante si l'utilisateur ajoute au panier depuis ce média précis.

**IMPLICATIONS UX / UI**

* Indicateur de position (points) en haut du contenu, navigation par swipe horizontal explicitement distincte du swipe vertical de changement de contenu (voir 4.3).

### **5.5 Démonstration produit, Avant/Après, Unboxing**

**BESOIN**

Ces formats répondent à des objections d'achat spécifiques ("Comment ça marche ?", "Est-ce que ça fonctionne vraiment ?", "À quoi ça ressemble une fois reçu ?") et augmentent statistiquement la confiance pré-achat.

**FONCTIONNEMENT**

Techniquement identiques à une vidéo courte ou un carrousel ; ils se distinguent uniquement par un tag de sous-type (content\_subtype) utilisé pour le filtrage, les suggestions de format à la création, et l'algorithme de recommandation (un utilisateur indécis peut se voir proposer en priorité des démonstrations plutôt que des contenus purement esthétiques).

**RECOMMANDATIONS**

* Proposer ces sous-types comme suggestions contextuelles à l'étape d'habillage du flux de création (3.1), en fonction de la catégorie du produit sélectionné (ex. suggérer "Démonstration" pour l'électronique, "Avant/Après" pour la beauté).

### **5.6 Témoignage client**

**BESOIN**

Renforcer la preuve sociale en intégrant la voix du client dans le contenu marchand, au-delà des avis textuels déjà présents sur la fiche produit.

**RÈGLES MÉTIER**

* Un témoignage filmé par un client nécessite son consentement explicite avant publication par le vendeur (case à cocher obligatoire avec horodatage de consentement conservé).

**IMPACTS SUR L'ARCHITECTURE EXISTANTE**

* Lien optionnel vers une review\_id existante du système d'avis, pour relier le contenu vidéo à un avis textuel déjà modéré et publié.

### **5.7 Promotion / Offre limitée**

**BESOIN**

Créer un sentiment d'urgence directement dans le flux de découverte, format à très forte conversion dans le social commerce.

**FONCTIONNEMENT**

Le contenu référence, en plus du produit, une promotion active (table promotions existante ou à créer en lien avec la table products) avec une date de fin. Un compte à rebours est affiché en superposition.

**CAS PARTICULIERS**

* Le vendeur modifie ou annule la promotion après publication du contenu : le contenu doit refléter l'état réel de la promotion en temps réel (lecture dynamique, jamais de prix figé dans le contenu — cohérent avec la règle énoncée en 2.7).

**RÈGLES MÉTIER**

* Si la promotion expire, le contenu reste visible mais bascule automatiquement à l'affichage du prix standard, sans afficher de compte à rebours expiré.

### **5.8 Live Shopping (vision Phase 5\)**

**BESOIN**

Format le plus engageant du social commerce mature, combinant interaction en temps réel et vente directe, mais nécessitant une infrastructure de streaming et une base d'utilisateurs suffisante pour être pertinent.

**FONCTIONNEMENT**

Diffusion vidéo en direct par le vendeur, avec mise en avant dynamique d'un ou plusieurs produits du catalogue pendant le live.

Chat en direct, achat possible sans quitter le live, notification aux abonnés au démarrage du live.

**RISQUES**

* Charge serveur et exigences de latence très supérieures aux contenus pré-enregistrés ; nécessite une infrastructure de streaming dédiée (RTMP/WebRTC \+ CDN de diffusion en direct) non requise pour les phases précédentes — voir chapitre 14 pour le séquencement.

**RECOMMANDATIONS**

* Ne pas anticiper l'infrastructure live avant la Phase 5 : le coût d'opportunité de la construire trop tôt dépasse largement sa valeur tant que la base d'utilisateurs et de vendeurs actifs n'est pas suffisante pour garantir une audience en direct.

# **6\. Architecture technique**

Ce chapitre constitue la référence technique normative pour les équipes Backend, Architecture et DevOps. Il détaille le modèle de données, les API, la stratégie de cache, le CDN, la compression et le streaming adaptatif. Les choix de nommage (tables, colonnes, endpoints) sont des propositions de référence destinées à être validées en revue d'architecture avant le premier sprint d'implémentation.

## **6.1 Modèle de données — vue relationnelle**

   
  products (existant)              sellers (existant)         users (existant)  
  \+----------------+               \+----------------+         \+----------------+  
  | id PK          |\<---+      \+--\>| id PK          |         | id PK          |  
  | seller\_id FK   |    |      |   | ...            |         | ...            |  
  | name           |    |      |   \+----------------+         \+----------------+  
  | price          |    |      |          ^                          ^  
  | stock          |    |      |          |                          |  
  | category\_id    |    |      |   seller\_creator\_profile            |  
  | status         |    |      |   \+----------------------+          |  
  \+----------------+    |      |   | seller\_id PK/FK      |          |  
         ^               |      |   | bio                  |          |  
         |               |      |   | followers\_count      |          |  
         |               |      |   \+----------------------+          |  
         |               |      |                                     |  
  \+------+--------+      |      |       \+-----------------------------+----+  
  |   contents     |-----+      |       |          interactions             |  
  \+----------------+            |       \+------------------------------------+  
  | id PK          |            |       | id PK                              |  
  | seller\_id FK   |------------+       | user\_id FK                         |  
  | product\_id FK  | (NOT NULL)         | content\_id FK                      |  
  | type           |                    | type (view/like/share/fav/cart)    |  
  | status         |                    | watch\_seconds                      |  
  | media\_url(s)   |                    | created\_at                         |  
  | thumbnail\_url  |                    \+------------------------------------+  
  | caption        |  
  | hashtags\[\]     |          comments                    follows  
  | created\_at     |          \+------------------+        \+------------------+  
  | published\_at   |          | id PK            |        | user\_id FK       |  
  \+----------------+          | content\_id FK    |        | seller\_id FK     |  
         ^                    | user\_id FK       |        | created\_at       |  
         |                    | parent\_id FK null|        \+------------------+  
  content\_variants            | body             |  
  \+----------------+          | status           |        moderation\_flags  
  | content\_id FK  |          \+------------------+        \+------------------+  
  | variant\_id FK  |                                       | content\_id FK    |  
  \+----------------+          content\_stats\_daily           | reason           |  
                              \+------------------+          | status           |  
  order\_items (existant,      | content\_id FK    |          \+------------------+  
  étendu)                     | date             |  
  \+----------------+          | views/likes/...  |  
  | source\_content\_id (FK,    \+------------------+  
  |   nullable, ajout)|  
  \+----------------+  
 

## **6.2 Tables principales — spécification détaillée**

**Table : contents**

| Colonne | Type | Description |
| :---- | :---- | :---- |
| id | UUID, PK | Identifiant unique du contenu. |
| seller\_id | UUID, FK \-\> sellers.id, NOT NULL | Vendeur propriétaire du contenu. |
| product\_id | UUID, FK \-\> products.id, NOT NULL | Produit obligatoirement associé. Contrainte centrale du système. |
| type | ENUM | video | photo | carousel. |
| subtype | ENUM, nullable | demo | before\_after | testimonial | unboxing | promo | standard. |
| status | ENUM | draft | processing | pending\_review | published | auto\_hidden | unpublished | deleted. |
| caption | TEXT | Légende rédigée par le vendeur. |
| hashtags | TEXT\[\] | Liste de hashtags, générés en partie automatiquement (voir chapitre 8). |
| thumbnail\_url | TEXT | URL CDN de la miniature sélectionnée. |
| media\_master\_url | TEXT | URL du média source post-transcodage (référence interne, non servie directement). |
| duration\_seconds | INTEGER, nullable | Durée pour les contenus vidéo. |
| promotion\_id | UUID, FK nullable | Référence à une promotion active (type promo uniquement). |
| view\_count | BIGINT, dénormalisé | Compteur de vues, mis à jour de manière asynchrone depuis l'Interaction Service. |
| like\_count | BIGINT, dénormalisé | Compteur de likes, idem. |
| created\_at / updated\_at / published\_at | TIMESTAMP | Horodatages standard. |

**Table : content\_media (pour les carrousels et les multi-résolutions)**

| Colonne | Type | Description |
| :---- | :---- | :---- |
| id | UUID, PK | Identifiant du média. |
| content\_id | UUID, FK \-\> contents.id, NOT NULL | Contenu parent. |
| position | SMALLINT | Ordre d'affichage dans le carrousel (0 pour photo/vidéo simple). |
| variant\_id | UUID, FK \-\> product\_variants.id, nullable | Variante spécifique illustrée par ce média, le cas échéant. |
| resolution | ENUM | low (360p) | medium (480p) | high (720p) — vidéo uniquement, voir 6.4. |
| url | TEXT | URL CDN du fichier servi. |
| format | ENUM | mp4\_h264 | webp | jpeg. |
| size\_bytes | INTEGER | Poids du fichier, utilisé pour les décisions de chargement adaptatif côté client. |

**Table : interactions**

| Colonne | Type | Description |
| :---- | :---- | :---- |
| id | BIGINT, PK | Identifiant, volume élevé attendu — utiliser un type auto-incrémenté plutôt qu'UUID pour la performance d'écriture. |
| user\_id | UUID, FK \-\> users.id, NOT NULL | Utilisateur ayant réalisé l'interaction. |
| content\_id | UUID, FK \-\> contents.id, NOT NULL | Contenu concerné. |
| type | ENUM | view | like | unlike | share | favorite | add\_to\_cart | follow\_from\_content | comment. |
| watch\_seconds | SMALLINT, nullable | Temps de visionnage cumulé pour ce passage (type \= view). |
| completed | BOOLEAN, nullable | Vrai si la vidéo a été visionnée jusqu'à la fin. |
| created\_at | TIMESTAMP | Horodatage, partitionné par mois pour la performance (voir 6.5). |

**Tables annexes — référence rapide**

| Table | Rôle |
| :---- | :---- |
| seller\_creator\_profile | Profil créateur étendu du vendeur : bio courte, photo de couverture, compteur d'abonnés dénormalisé. |
| follows | Relation d'abonnement user\_id \-\> seller\_id, contrainte d'unicité (user\_id, seller\_id). |
| comments | Commentaires sur un contenu, support de réponses imbriquées via parent\_id, statut de modération propre. |
| content\_stats\_daily | Agrégat journalier pré-calculé par contenu (vues, likes, clics produit, ajouts panier, commandes, CA) pour alimenter le tableau de bord vendeur sans recalcul à la volée. |
| moderation\_flags | Signalements et décisions de modération, voir chapitre 10\. |
| hashtags / content\_hashtags | Référentiel de hashtags et table de liaison many-to-many avec contents, voir chapitre 8\. |
| recommendation\_features (Phase 3+) | Table de features pré-calculées par utilisateur/contenu pour le modèle de recommandation, voir chapitre 9\. |

## **6.3 Extensions sur les tables existantes**

Conformément au principe d'extension posé au chapitre 2, les seules modifications sur le schéma existant sont des ajouts non destructifs :

* products : ajout de content\_count (compteur dénormalisé, nullable, défaut 0\) et d'un index composite (category\_id, status) déjà potentiellement existant mais à vérifier pour soutenir les requêtes du Feed/Reco Service.

* order\_items : ajout de source\_content\_id (UUID, FK nullable vers contents.id) pour l'attribution statistique décrite en 3.4.

* sellers : aucune modification de structure ; la relation 1-1 avec seller\_creator\_profile suffit à porter les nouvelles données.

* notifications (table/service existant) : ajout de nouveaux types d'événement dans l'énumération existante (voir chapitre 11), sans changement de structure.

## **6.4 API — nouveaux endpoints**

Les endpoints ci-dessous s'ajoutent à l'API existante (REST, authentification par token déjà en place). Le versionnement /v1 est conservé par cohérence avec l'API catalogue actuelle.

**API — Gestion de contenu (vendeur)**

| Méthode & route | Description | Permissions |
| :---- | :---- | :---- |
| POST /v1/contents | Crée un contenu en statut draft, retourne une URL d'upload signée pour le média. | Vendeur authentifié |
| PATCH /v1/contents/{id} | Met à jour un contenu (produit associé, légende, hashtags, statut). | Vendeur propriétaire |
| POST /v1/contents/{id}/publish | Fait passer un contenu de draft à pending\_review puis published après modération auto. | Vendeur propriétaire |
| POST /v1/contents/{id}/unpublish | Dépublie un contenu sans le supprimer. | Vendeur propriétaire |
| DELETE /v1/contents/{id} | Soft-delete d'un contenu. | Vendeur propriétaire / Admin |
| GET /v1/sellers/{id}/contents | Liste paginée des contenus d'un vendeur (tous statuts pour le propriétaire, published uniquement pour les tiers). | Public (filtré) / Vendeur propriétaire (complet) |
| GET /v1/contents/{id}/stats | Statistiques détaillées d'un contenu (voir 3.4). | Vendeur propriétaire / Admin |

**API — Flux et lecture (client)**

| Méthode & route | Description | Permissions |
| :---- | :---- | :---- |
| GET /v1/feed/discover | Retourne une page du flux personnalisé (curseur de pagination, voir 6.6). Paramètre cursor, limit (défaut 5). | Utilisateur authentifié ou anonyme (flux non personnalisé) |
| GET /v1/contents/{id} | Détail d'un contenu publié, incluant produit résumé, vendeur, compteurs. | Public |
| POST /v1/contents/{id}/interactions | Enregistre une interaction (view, like, share, favorite, add\_to\_cart). Body : {type, watch\_seconds?, completed?}. | Utilisateur authentifié (anonyme accepté pour view uniquement, agrégé par device\_id) |
| GET /v1/contents/{id}/comments | Liste paginée des commentaires. | Public |
| POST /v1/contents/{id}/comments | Publie un commentaire (passe par la modération automatique synchrone, voir chapitre 10). | Utilisateur authentifié |
| POST /v1/sellers/{id}/follow | S'abonne à un vendeur. | Utilisateur authentifié |
| DELETE /v1/sellers/{id}/follow | Se désabonne. | Utilisateur authentifié |

**API — Modération et administration**

| Méthode & route | Description | Permissions |
| :---- | :---- | :---- |
| GET /v1/admin/moderation/queue | File de contenus/commentaires en attente de revue manuelle. | Modérateur / Admin |
| POST /v1/admin/moderation/{content\_id}/decision | Approuve ou rejette un contenu, avec motif. | Modérateur / Admin |
| POST /v1/admin/trends/feature | Met en avant éditorialement un contenu (boost manuel dans le flux). | Admin |
| GET /v1/admin/social-commerce/overview | Statistiques globales du module (voir chapitre 13). | Admin |

Chaque appel d'écriture (POST/PATCH/DELETE) doit être idempotent côté client via un identifiant de requête (Idempotency-Key) pour tolérer les retransmissions automatiques dues à une connexion instable, comportement déjà standard sur l'API commandes existante et à répliquer ici à l'identique.

## **6.5 Stratégie de cache**

**Couches de cache**

| Donnée | Emplacement | TTL / stratégie d'invalidation |
| :---- | :---- | :---- |
| Flux personnalisé pré-calculé (feed) | Redis, clé par user\_id | Recalcul incrémental toutes les 5 minutes ou à chaque interaction significative (like, achat) ; TTL de secours 30 minutes. |
| Détail d'un contenu publié | Redis \+ cache CDN (edge) | Invalidation active à chaque PATCH/unpublish ; TTL 10 minutes en secours. |
| Compteurs (vues, likes) | Redis (compteurs atomiques), synchronisation différée vers Postgres toutes les 60 secondes | Pas de TTL ; écriture en continu, lecture en temps réel depuis Redis. |
| Statistiques vendeur agrégées | Table content\_stats\_daily, recalcul batch nocturne \+ incrémental léger en journée | Recalcul complet quotidien à 3h locales (faible trafic). |
| Médias (vidéo, image, miniature) | CDN (CloudFront ou équivalent) | Cache long (30 jours), invalidation par changement d'URL versionnée plutôt que purge active. |

## **6.6 Pagination du flux (curseur)**

Le flux Découvrir utilise une pagination par curseur opaque plutôt que par numéro de page, car le classement évolue en continu (nouveaux contenus, scoring dynamique) et une pagination par offset produirait des doublons ou des sauts visibles à l'utilisateur.

* Le client envoie le curseur reçu à la requête précédente ; le serveur renvoie la page suivante du flux déjà scoré et figé pour la session en cours (snapshot de 50 à 100 contenus renouvelé toutes les 5-10 minutes ou à la fin du snapshot).

* Ce figeage par snapshot évite la réorganisation surprenante du flux pendant qu'un utilisateur le parcourt, tout en gardant une fraîcheur acceptable.

## **6.7 CDN et stockage média**

   
  \[Vendeur\] \--upload chunked--\> \[Media Pipeline\]  
                                      |  
                          \+-----------+-----------+  
                          |  Transcodage multi-res |  
                          |  (360p / 480p / 720p)  |  
                          |  \+ extraction miniature |  
                          \+-----------+-----------+  
                                      |  
                          \+-----------v-----------+  
                          |  Stockage objet (S3)   |  
                          |  bucket: ahizan-content |  
                          \+-----------+-----------+  
                                      |  
                          \+-----------v-----------+  
                          |  CDN (CloudFront ou eq.)|  
                          |  \- cache edge proche du |  
                          |    Benin/Afrique de     |  
                          |    l'Ouest si disponible|  
                          |  \- compression Brotli/  |  
                          |    gzip sur les assets  |  
                          |    statiques associés   |  
                          \+-----------+-----------+  
                                      |  
                          \[App cliente \-- lecture adaptative\]  
 

Le choix du point de présence CDN le plus proche du Bénin doit être validé en amont avec le fournisseur retenu (AWS CloudFront, Cloudflare, ou équivalent) : à défaut de point de présence local, privilégier le edge le plus proche disponible (Afrique du Sud, Europe de l'Ouest) et compenser par une stratégie de cache local agressive côté client (voir chapitre 7).

## **6.8 Profils de compression et streaming adaptatif**

La spécification produit complète de l'optimisation faible connexion (comportement attendu côté utilisateur, mode économie de données, gestion 2G/3G/4G) est détaillée au chapitre 7\. Cette section fixe les paramètres techniques normatifs du pipeline de transcodage.

**Profils d'encodage vidéo générés à l'upload**

| Profil | Résolution | Bitrate cible | Usage |
| :---- | :---- | :---- | :---- |
| low | 360p | \~400 kbps (H.264) | Connexion 2G/3G dégradée, mode économie de données activé. |
| medium | 480p | \~800 kbps (H.264) | Profil par défaut sur 3G/4G standard. |
| high | 720p | \~1.5 Mbps (H.264) | Wi-Fi ou 4G stable, activé manuellement ou détecté automatiquement. |

* Format de conteneur : MP4 (H.264 \+ AAC) pour compatibilité maximale avec les appareils Android d'entrée de gamme dominants sur le marché béninois.

* Génération automatique de 2 miniatures candidates par vidéo (capture à 10% et 50% de la durée) au format WebP avec repli JPEG, compressées sous 30 Ko.

* Streaming adaptatif : implémentation HLS (HTTP Live Streaming) en Phase 2, le MVP pouvant se contenter d'une sélection de profil statique côté client basée sur la détection de type de connexion (voir 7.4), pour limiter la complexité initiale du pipeline.

* Toute image statique (photo, miniature) est servie en WebP avec repli automatique JPEG pour les navigateurs/appareils non compatibles, à des poids cibles de 50-150 Ko pour les photos plein écran.

## **6.9 Performances attendues**

**Objectifs de performance technique**

| Indicateur | Cible MVP | Cible cible (Phase 3+) |
| :---- | :---- | :---- |
| Temps avant première image (TTFF) du premier contenu du flux | \< 1.5 s sur 4G, \< 3 s sur 3G | \< 1 s sur 4G, \< 2 s sur 3G |
| Temps de chargement d'une page de flux (5 contenus) | \< 2 s sur 4G | \< 1.5 s sur 4G |
| Disponibilité du Feed/Reco Service | 99.5% | 99.9% |
| Latence API GET /v1/feed/discover (p95) | \< 400 ms | \< 200 ms |
| Consommation de données pour 10 contenus vidéo vus (profil medium) | \< 15 Mo | \< 10 Mo (grâce au HLS adaptatif fin) |

## **6.10 Sécurité et conformité des données**

* Les médias uploadés sont scannés automatiquement (antivirus / détection de format) avant d'entrer dans le pipeline de transcodage.

* Les URLs de média servies par le CDN sont signées avec expiration pour les contenus non publics (ex. aperçu en attente de modération), et publiques en cache long une fois le contenu publié.

* Les données de localisation éventuellement utilisées pour l'algorithme de recommandation (chapitre 9\) sont anonymisées au niveau ville/quartier, jamais stockées en coordonnées précises associées à l'historique de navigation au-delà de la durée nécessaire au calcul du score.

* Conformité avec le cadre béninois de protection des données personnelles (APDP) à valider formellement avec l'équipe juridique avant le lancement public, notamment sur la conservation des données comportementales (interactions) utilisées pour la recommandation.

## **6.11 Risques et recommandations transverses (architecture technique)**

**RISQUES**

* Sous-dimensionnement du Media Pipeline au lancement, créant des files d'attente de transcodage longues en cas de pic de publication — mitigation : auto-scaling horizontal dédié à ce service, indépendant du reste du backend.

* Explosion du volume de la table interactions sans partitionnement, dégradant les performances de lecture du Stats Service et du Feed/Reco Service au bout de quelques mois — mitigation : partitionnement mensuel dès la conception initiale, pas en correctif a posteriori.

* Dépendance à un unique point de présence CDN éloigné du Bénin, dégradant les temps de chargement malgré une bonne compression — mitigation : benchmark comparatif des fournisseurs CDN sur le marché ouest-africain avant engagement contractuel.

**RECOMMANDATIONS**

* Découpler dès le MVP le Media Pipeline du reste du backend (déploiement et scaling indépendants), même si le reste du module reste dans un backend modulaire unique.

* Mettre en place le partitionnement de la table interactions et l'agrégation journalière (content\_stats\_daily) dès le premier sprint technique, avant même l'ouverture du module au public.

* Lancer un test de charge réseau réel (simulation 3G béninoise, via outils de débit limité) avant chaque mise en production majeure, en complément des tests de charge serveur classiques.

# **7\. Optimisation pour les réalités africaines (faible connexion)**

Ce chapitre n'est pas une section technique annexe : c'est une contrainte de conception de premier rang, au même titre que la règle « pas de contenu sans produit ». Une fonctionnalité de social commerce qui consomme trop de données ou se charge trop lentement sur une connexion 3G béninoise échouera commercialement, indépendamment de la qualité de son algorithme de recommandation.

### **7.1 Lecture automatique sans son**

**BESOIN**

Éviter une consommation de données et de batterie inutile sur des contenus que l'utilisateur ne fait que survoler en défilant, tout en conservant l'effet d'engagement de la lecture automatique.

**FONCTIONNEMENT**

Seul le contenu actuellement visible à l'écran (au moins 70% de sa surface) déclenche la lecture.

Le son est désactivé par défaut sur tout l'écosystème ; un tap active le son et mémorise la préférence pour la session.

Tout contenu qui quitte le cadre visible est immédiatement mis en pause (pas seulement coupé du son).

**RÈGLES MÉTIER**

* La préférence "son activé" n'est jamais persistée au-delà de la session pour éviter qu'un utilisateur en lieu public ne soit surpris par un son lors de l'ouverture suivante de l'application.

### **7.2 Préchargement intelligent (une seule vidéo à l'avance)**

**BESOIN**

Garantir une transition fluide entre deux contenus sans pour autant télécharger des contenus que l'utilisateur ne verra peut-être jamais.

**FONCTIONNEMENT**

Seul le contenu suivant immédiat est préchargé, et seulement à partir de 50% de lecture du contenu courant (pas dès l'arrivée sur l'écran).

En mode économie de données (voir 7.6), le préchargement se limite à la miniature \+ les 2 premières secondes du contenu suivant, le reste étant chargé à la demande.

**RÈGLES MÉTIER**

* Aucun préchargement n'est déclenché au-delà d'une position N+1 dans le flux, quelle que soit la qualité de connexion détectée — règle fixe, non configurable côté utilisateur, pour protéger le forfait de données par défaut.

**RISQUES**

* Un préchargement trop agressif côté développement (ex. par souci de fluidité perçue en test sur Wi-Fi de bureau) qui ne serait pas testé en conditions 3G réelles avant mise en production — mitigation : test de charge réseau simulé obligatoire avant chaque release (voir 6.11).

### **7.3 Cache local**

**BESOIN**

Éviter de retélécharger un contenu déjà vu récemment, notamment lors d'un retour en arrière dans le flux.

**FONCTIONNEMENT**

Cache local (disque) des derniers contenus visionnés, avec une taille plafonnée (ex. 100-150 Mo) et une politique d'éviction LRU (least recently used).

Les miniatures du flux affiché restent en cache mémoire pendant toute la session pour un défilement arrière instantané.

**IMPLICATIONS TECHNIQUES**

* Implémentation côté client (cache disque applicatif), indépendante du cache CDN serveur décrit en 6.5 — les deux couches sont complémentaires.

### **7.4 Détection de connexion et qualité adaptative**

**BESOIN**

Adapter automatiquement la qualité servie au type de connexion réel de l'utilisateur, sans action manuelle requise dans le cas général.

**FONCTIONNEMENT**

Détection du type de réseau (Wi-Fi, 4G, 3G, 2G) via les API natives de la plateforme (Network Information API / équivalents iOS-Android).

Sélection automatique du profil d'encodage le plus adapté (voir 6.8) : low sur 2G/3G dégradée, medium par défaut sur 3G/4G, high sur Wi-Fi/4G stable.

Mesure continue du débit effectif pendant la lecture (et non uniquement au démarrage) pour ajuster dynamiquement le profil en cours de session si la qualité de connexion se dégrade — bascule complète vers HLS adaptatif prévue en Phase 2 (voir 6.8).

**CAS PARTICULIERS**

* Connexion qui bascule de 4G à 3G en plein visionnage : le contenu en cours continue sur le profil déjà chargé (pas d'interruption), seul le contenu suivant adopte le nouveau profil détecté.

### **7.5 Miniatures optimisées et chargement progressif**

**BESOIN**

Donner une perception de rapidité même quand le média complet n'est pas encore chargé.

**FONCTIONNEMENT**

Affichage immédiat de la miniature compressée (\< 30 Ko, voir 6.8) en flou progressif (technique blur-up) pendant le chargement du média complet.

Chargement progressif des images (JPEG/WebP progressif) plutôt que ligne par ligne classique, pour une perception de netteté croissante plutôt qu'un chargement par bandes.

### **7.6 Mode économie de données**

**BESOIN**

Donner à l'utilisateur un contrôle explicite sur sa consommation de données, certains forfaits prépayés béninois étant limités en volume journalier.

**FONCTIONNEMENT**

Option activable dans les réglages de l'application (et suggérée automatiquement la première fois qu'une connexion 2G/3G est détectée).

En mode actif : lecture automatique désactivée par défaut (l'utilisateur doit taper pour lancer chaque vidéo), profil low systématique, préchargement réduit au strict minimum (voir 7.2), images systématiquement compressées au maximum.

**IMPLICATIONS UX / UI**

* Indicateur visuel discret et permanent (icône) signalant que le mode économie de données est actif, pour que l'utilisateur garde le contrôle conscient de son expérience dégradée volontairement.

### **7.7 Gestion des connexions instables et reprise**

**BESOIN**

Éviter qu'une coupure réseau temporaire (fréquente sur les réseaux mobiles ouest-africains) ne casse l'expérience ou ne fasse perdre une action en cours (publication, ajout au panier).

**FONCTIONNEMENT**

Toute requête d'écriture (publication, like, ajout au panier, commentaire) est mise en file locale et rejouée automatiquement au retour du réseau, avec idempotence garantie côté API (voir 6.4).

En cas de coupure pendant la lecture, le contenu affiche un indicateur de mise en mémoire tampon discret plutôt qu'une erreur bloquante, et reprend automatiquement dès que possible.

**RISQUES**

* Doubles soumissions (ex. double ajout au panier) en cas de rejeu automatique mal implémenté — mitigation : clé d'idempotence systématique sur toutes les écritures, comme déjà pratiqué sur l'API commandes existante.

### **7.8 Optimisation pour appareils peu puissants**

**BESOIN**

Garantir une fluidité d'animation et de défilement acceptable sur des appareils Android d'entrée de gamme largement répandus sur le marché.

**FONCTIONNEMENT**

Limitation stricte du nombre de contenus montés en mémoire simultanément dans le flux (fenêtre de 3 : précédent, courant, suivant — voir 4.3).

Décodage vidéo matériel privilégié (pas de décodage logiciel coûteux en CPU), avec repli vers une qualité réduite si le décodage matériel n'est pas disponible sur l'appareil détecté.

Animations d'interface limitées à des transformations GPU peu coûteuses (translation, opacité) ; éviter tout effet nécessitant un recalcul de mise en page complexe à chaque frame.

## **7.9 Synthèse des cibles de performance réseau**

**Cibles par type de connexion**

| Type de connexion | Profil vidéo servi par défaut | Préchargement | Lecture auto |
| :---- | :---- | :---- | :---- |
| Wi-Fi / 4G stable | high (720p) | Contenu N+1 dès 50% de lecture | Activée, son désactivé par défaut |
| 4G instable / 3G | medium (480p) | Contenu N+1 dès 50% de lecture | Activée, son désactivé par défaut |
| 3G dégradée / 2G | low (360p) | Miniature \+ 2s seulement | Activée sauf si mode économie de données actif |
| Mode économie de données (manuel) | low (360p) | Minimal (à la demande) | Désactivée par défaut, tap requis |

# **8\. SEO interne (indexation et découvrabilité au sein d'Ahizan)**

Le terme « SEO » est entendu ici au sens de référencement interne : la capacité du moteur de recherche et du système de catégorisation d'Ahizan à faire remonter les bons contenus et produits face à une requête ou une navigation par catégorie, à ne pas confondre avec le référencement externe sur Google (hors périmètre de ce chapitre, bien que les pages web légères de partage — voir 4.6 — y contribuent indirectement).

### **8.1 Indexation des contenus**

**BESOIN**

Rendre chaque contenu publié immédiatement et correctement indexable par le moteur de recherche existant, au même titre qu'une fiche produit.

**FONCTIONNEMENT**

À la publication, le contenu est indexé avec : nom et catégorie du produit associé, légende, hashtags, sous-type de contenu, nom du vendeur.

La recherche existante peut ainsi remonter, pour une requête produit classique, à la fois la fiche produit et les contenus qui le présentent (affichage enrichi avec un badge "voir en vidéo").

**IMPACTS SUR L'ARCHITECTURE EXISTANTE**

* Extension de l'index de recherche existant (ex. Elasticsearch/Postgres full-text déjà en place) avec un nouveau type de document content, lié au document product existant plutôt que dupliqué.

### **8.2 Mots-clés et catégories**

**BESOIN**

Garantir la cohérence entre la catégorisation produit (déjà existante et maîtrisée par le catalogue) et la découvrabilité des contenus, sans demander un effort de catégorisation supplémentaire au vendeur.

**FONCTIONNEMENT**

La catégorie d'un contenu est héritée automatiquement de la catégorie de son produit associé ; aucune sélection de catégorie manuelle n'est demandée au vendeur lors de la création de contenu.

**RÈGLES MÉTIER**

* Si la catégorie du produit change après publication du contenu, le contenu est automatiquement réindexé sous la nouvelle catégorie sans action du vendeur.

### **8.3 Hashtags**

**BESOIN**

Offrir un système de découverte transversal aux catégories formelles du catalogue, plus proche des usages sociaux familiers aux vendeurs et acheteurs.

**FONCTIONNEMENT**

Suggestions automatiques de hashtags à la création, dérivées du nom du produit, de la catégorie et des hashtags déjà performants sur des produits similaires.

Le vendeur peut ajouter jusqu'à 8 hashtags personnalisés en plus des suggestions.

Une page dédiée par hashtag (accessible en tap depuis tout contenu) liste tous les contenus publiés associés.

**RÈGLES MÉTIER**

* Les hashtags sont normalisés (minuscules, sans accents, sans espaces) pour éviter la fragmentation entre variantes orthographiques du même mot-clé.

**RISQUES**

* Détournement de hashtags populaires sans rapport avec le produit réel pour gonfler artificiellement la visibilité — mitigation : pénalité de scoring (voir 9.4) en cas de fort taux de rebond immédiat sur un contenu utilisant un hashtag à fort trafic sans rapport sémantique avec sa catégorie produit.

### **8.4 Suggestions automatiques et recherche intelligente**

**BESOIN**

Aider l'utilisateur à formuler une recherche efficace même avec une intention encore vague, comportement fréquent chez un public découvrant le format vidéo-achat.

**FONCTIONNEMENT**

Auto-complétion de la barre de recherche existante intégrant désormais hashtags et noms de vendeurs créateurs, en plus des produits et catégories déjà couverts.

Page de résultats de recherche enrichie d'un onglet "Vidéos" à côté de l'onglet "Produits" existant, pour un même mot-clé.

**RECOMMANDATIONS**

* En Phase 2, exploiter l'historique de recherche pour pré-pondérer le flux Découvrir (un utilisateur ayant cherché "chaussures running" voit davantage de contenus de cette catégorie dans les heures suivantes) — détail au chapitre 9\.

# **9\. Algorithme de recommandation**

L'algorithme de recommandation est le moteur de la promesse centrale du module : permettre à l'utilisateur de découvrir des produits pertinents sans recherche active. Ce chapitre décrit une trajectoire progressive, du tri simple du MVP jusqu'au modèle d'apprentissage automatique complet, conformément au principe d'évolution progressive posé au chapitre 1\.

## **9.1 Approche progressive en trois paliers**

**Paliers de sophistication de l'algorithme**

| Palier | Méthode | Phase de livraison |
| :---- | :---- | :---- |
| Palier 1 — Tri par règles | Score \= pondération simple de fraîcheur \+ popularité \+ diversité de catégorie, sans personnalisation individuelle fine. | Phase 1 — MVP |
| Palier 2 — Personnalisation par signaux explicites | Ajout de la pondération par centres d'intérêt déclarés, historique d'achat, abonnements, catégories consultées récemment. | Phase 3 |
| Palier 3 — Modèle d'apprentissage automatique | Modèle de scoring entraîné sur l'historique d'interactions à grande échelle (collaborative filtering \+ features de contenu), affiné en continu. | Phase 6 |

Cette progression évite l'écueil classique consistant à vouloir construire un système de recommandation sophistiqué avant d'avoir suffisamment de données d'interaction pour l'entraîner utilement : un modèle d'apprentissage automatique lancé avec un volume de données insuffisant produit des recommandations moins bonnes qu'un tri par règles bien calibré.

### **9.2 Palier 1 — Tri par règles (MVP)**

**BESOIN**

Fournir un flux pertinent et engageant dès le lancement, sans dépendre d'un historique d'interaction encore inexistant.

**FONCTIONNEMENT**

Score(contenu) \= w1 × fraîcheur \+ w2 × popularité \+ w3 × taux de conversion historique du contenu \+ w4 × pénalité de sur-exposition récente du même vendeur.

Fraîcheur : décroissance exponentielle depuis la publication, avec un plateau pour éviter de pénaliser excessivement les contenus de qualité légèrement plus anciens.

Popularité : combinaison normalisée de vues, likes, partages et ajouts au panier sur les dernières 48 heures.

Diversité forcée : au sein de chaque page de 5 contenus servie, au maximum 2 contenus du même vendeur et au maximum 3 de la même catégorie, pour éviter la monotonie du flux.

**RÈGLES MÉTIER**

* Un contenu en statut auto\_hidden (rupture de stock, voir 3.3) est exclu du calcul de score, quel que soit son historique de popularité.

**IMPLICATIONS TECHNIQUES**

* Calcul du score effectué en batch toutes les 5-10 minutes (pas en temps réel à chaque requête), stocké en cache Redis sous forme de liste triée par utilisateur ou par segment, conformément à la stratégie de cache du chapitre 6\.

### **9.3 Palier 2 — Personnalisation par signaux explicites**

**BESOIN**

Affiner la pertinence individuelle du flux une fois qu'un volume suffisant de données comportementales est disponible (cible indicative : au moins 90 jours de trafic et plusieurs dizaines de milliers d'interactions enregistrées).

**FONCTIONNEMENT**

Pondération additionnelle par : catégories de produits consultés récemment, historique d'achat, recherches récentes (voir 8.4), centres d'intérêt déclarés à l'inscription (si collectés), localisation à l'échelle de la ville (pour favoriser des vendeurs proposant une livraison locale rapide).

Boost explicite pour les contenus des vendeurs suivis par l'utilisateur (voir 4.8), avec un plafond pour ne pas transformer le flux en simple liste chronologique des abonnements.

**IMPACTS SUR L'ARCHITECTURE EXISTANTE**

* Introduction de la table recommendation\_features (voir 6.2) recalculée en batch nocturne, séparant le calcul lourd des features du calcul léger du score à la demande.

### **9.4 Signaux d'interaction pris en compte (vue d'ensemble)**

**FONCTIONNEMENT**

Le tableau ci-dessous synthétise l'ensemble des signaux mentionnés dans le contexte projet et leur poids relatif indicatif, à calibrer empiriquement après les premières semaines de données réelles.

**Signaux d'interaction et poids indicatif**

| Signal | Force du signal | Justification |
| :---- | :---- | :---- |
| Achat généré depuis le contenu | Très fort | Signal de conversion réelle, objectif final du système. |
| Ajout au panier depuis le contenu | Fort | Intention d'achat avérée, même sans conversion finale. |
| Ajout en favoris | Fort | Intention d'achat différé (voir 4.5). |
| Temps de visionnage / taux de complétion | Moyen-fort | Indicateur d'engagement réel, distingue le défilement passif de l'intérêt véritable. |
| Partage | Moyen | Signal social fort mais ne traduit pas toujours une intention d'achat personnelle. |
| Like | Faible-moyen | Signal d'engagement facile à émettre, donc moins discriminant. |
| Vue simple sans autre interaction | Faible | Signal de base, utile en volume agrégé mais peu discriminant individuellement. |
| Commande passée historiquement dans une catégorie | Fort (Palier 2+) | Prédicteur robuste de pertinence catégorielle à moyen terme. |

### **9.5 Palier 3 — Modèle d'apprentissage automatique (vision Phase 6\)**

**BESOIN**

Maximiser la pertinence individuelle et la valeur business (conversion, panier moyen) au-delà de ce que des règles manuelles peuvent capturer, une fois un volume de données suffisant accumulé.

**FONCTIONNEMENT**

Approche recommandée : modèle hybride combinant filtrage collaboratif (similarité de comportement entre utilisateurs) et filtrage par contenu (similarité entre produits/contenus), avec ré-entraînement périodique sur les interactions accumulées.

Le scoring final reste exposé via la même interface de cache/flux que les paliers précédents, pour ne pas nécessiter de refonte du Front-end lors de la montée en sophistication.

**IMPACTS SUR L'ARCHITECTURE EXISTANTE**

* Introduction d'un pipeline de Machine Learning séparé (entraînement offline, inférence batch ou quasi temps réel selon les contraintes de latence mesurées), avec gouvernance de données et tests A/B systématiques avant tout déploiement d'une nouvelle version du modèle.

**RISQUES**

* Sur-optimisation du modèle pour l'engagement pur (temps passé) au détriment de la conversion réelle, risque classique des systèmes de recommandation de contenu — mitigation : la fonction d'optimisation du modèle doit explicitement intégrer le chiffre d'affaires généré et pas uniquement l'engagement, conformément à la vision posée au chapitre 1 (le produit reste toujours au centre).

**RECOMMANDATIONS**

* Ne pas lancer ce chantier avant d'avoir un historique d'interaction représentatif sur au moins deux à trois cycles saisonniers complets, pour éviter un modèle biaisé par une période non représentative.

## **9.6 Schéma de flux du calcul de score**

   
  \[Interactions temps reel\] \--\> \[Interaction Service\] \--\> \[File d'evenements\]  
                                                                |  
                                                  \+-------------v-------------+  
                                                  |  Agregation batch (5-10min)|  
                                                  |  (Palier 1\) ou pipeline ML  |  
                                                  |  (Palier 3, batch nocturne) |  
                                                  \+-------------+-------------+  
                                                                |  
                                                  \+-------------v-------------+  
                                                  |  Cache Redis : feed trie   |  
                                                  |  par utilisateur/segment   |  
                                                  \+-------------+-------------+  
                                                                |  
                                                  \[GET /v1/feed/discover\]  
                                                  servi en \< 400ms (p95)  
 

# **10\. Modération**

La modération protège trois choses à la fois : les utilisateurs (contenu inapproprié, arnaques), les vendeurs sérieux (concurrence déloyale par contenu trompeur) et la plateforme elle-même (réputation, conformité légale). Le système combine une modération automatique en amont (rapide, peu coûteuse) et une modération humaine ciblée sur les cas ambigus ou signalés.

### **10.1 Détection automatique**

**BESOIN**

Filtrer la majorité des contenus non conformes avant publication, sans imposer un délai de validation manuelle systématique qui découragerait la publication régulière.

**FONCTIONNEMENT**

À la soumission (statut pending\_review), le contenu passe par une chaîne de vérifications automatiques : détection de nudité/violence sur l'image et la vidéo (échantillonnage de frames), analyse de la légende et des hashtags (mots interdits, promesses trompeuses du type "gratuit" sur un produit payant), vérification de cohérence entre le produit déclaré et la catégorie détectée visuellement (alerte, pas blocage automatique, en cas d'incohérence forte).

Si aucun signal de risque n'est détecté, le contenu passe automatiquement en published. En cas de signal faible à moyen, il est mis en file de revue manuelle prioritaire. En cas de signal fort (nudité explicite détectée, mots strictement interdits), il est automatiquement rejeté avec motif notifié au vendeur.

**RÈGLES MÉTIER**

* Aucun contenu n'est publié sans être passé par la détection automatique de base, y compris pour les vendeurs ayant un historique de confiance élevé — seul le délai de revue manuelle peut être réduit pour ces vendeurs (voir 10.5).

* Les commentaires (voir 4.7) passent par une modération automatique synchrone plus légère (anti-spam, anti-injure, détection de coordonnées de contact visant à contourner la transaction) avant publication immédiate.

**IMPLICATIONS TECHNIQUES**

* Recours à un fournisseur tiers spécialisé en modération automatique de contenu (image/vidéo/texte) plutôt qu'un développement interne en MVP, pour bénéficier de modèles déjà entraînés et limiter le délai de mise en œuvre.

### **10.2 Validation manuelle**

**BESOIN**

Traiter les cas ambigus que la détection automatique ne peut trancher avec confiance, et constituer un filet de sécurité humain.

**FONCTIONNEMENT**

File de modération accessible aux modérateurs (back-office, voir chapitre 13), affichant le contenu, le produit associé, le vendeur, et les signaux automatiques détectés.

Décision en un clic : approuver, rejeter (avec motif prédéfini ou libre), ou escalader à un superviseur pour les cas les plus sensibles.

**IMPACTS SUR L'ARCHITECTURE EXISTANTE**

* Table moderation\_flags (voir 6.2) journalisant chaque décision avec l'identité du modérateur, pour audit et amélioration continue des règles automatiques.

### **10.3 Signalement par les utilisateurs**

**BESOIN**

Permettre à la communauté de signaler un contenu ou un commentaire problématique non détecté automatiquement.

**FONCTIONNEMENT**

Bouton de signalement accessible sur tout contenu et tout commentaire, avec motif à sélectionner (contenu trompeur, produit non conforme à la description, contenu choquant, spam, autre).

Un contenu ayant reçu un nombre de signalements dépassant un seuil dans une fenêtre courte est automatiquement remonté en tête de la file de modération manuelle (sans dépublication automatique, pour éviter les signalements abusifs coordonnés).

**CAS PARTICULIERS**

* Signalements massifs coordonnés visant à faire dépublier abusivement le contenu d'un concurrent : le seuil de remontée prioritaire ne déclenche jamais de dépublication automatique, uniquement une priorisation de la revue humaine.

### **10.4 Limitation du spam**

**BESOIN**

Empêcher les comportements visant à manipuler artificiellement la visibilité (publication en rafale, faux engagement) ou à détourner la transaction hors de la plateforme.

**FONCTIONNEMENT**

Limitation du nombre de publications par vendeur par fenêtre de temps (ex. seuil raisonnable par heure) pour empêcher le flood du flux.

Détection de schémas de commentaires automatisés (même texte répété, fréquence anormale) avec limitation progressive (ralentissement puis blocage temporaire du compte concerné).

Détection de tentatives de partage de coordonnées de contact en commentaire pour contourner le paiement in-app (voir 4.7), avec avertissement au premier cas et limitation progressive en cas de récidive.

**RISQUES**

* Faux positifs pénalisant des vendeurs légitimes très actifs — mitigation : seuils calibrés par retour d'expérience progressif, avec possibilité de contestation manuelle auprès du support.

### **10.5 Protection des utilisateurs et niveaux de confiance vendeur**

**BESOIN**

Différencier le traitement entre vendeurs ayant un historique de conformité long et nouveaux vendeurs ou vendeurs à historique problématique, pour optimiser le compromis vitesse de publication / sécurité.

**FONCTIONNEMENT**

Un score de confiance interne (non visible du vendeur) basé sur l'historique de modération, le taux de signalement et l'ancienneté ajuste le délai de revue manuelle et le seuil de déclenchement automatique des alertes.

**RECOMMANDATIONS**

* Ne pas exposer publiquement ce score de confiance ni ses critères exacts, pour éviter les tentatives de manipulation du système — communiquer uniquement les règles de conformité générales aux vendeurs.

## **10.6 Schéma du flux de modération**

   
  \[Vendeur publie\] \--\> \[Detection automatique\]  
                              |  
        \+---------------------+----------------------+  
        |                     |                       |  
   Signal fort           Signal faible/moyen      Aucun signal  
        |                     |                       |  
   \[Rejet auto              \[File de revue          \[Publication  
    \+ motif notifie\]         manuelle\]                automatique\]  
                              |  
                    \+---------+---------+  
                    |                   |  
               \[Approuve\]          \[Rejete \+ motif\]  
                    |                   |  
              \[Publication\]      \[Notification vendeur  
                                  \+ possibilite de  
                                  corriger et resoumettre\]  
 

# **11\. Notifications**

Le module Social Commerce réutilise intégralement le service de notifications existant d'Ahizan (push, in-app, et le cas échéant SMS/WhatsApp Business selon les canaux déjà connectés). Ce chapitre se limite donc à définir les nouveaux types d'événements à ajouter à l'énumération existante, ainsi que les règles de fréquence pour éviter la sursollicitation.

### **11.1 Nouveau contenu d'un vendeur suivi**

**BESOIN**

Faire revenir dans l'application les utilisateurs ayant manifesté un intérêt explicite pour un vendeur (abonnement), au moment où ce vendeur publie.

**RÈGLES MÉTIER**

* Regroupement (digest) si un même vendeur publie plusieurs contenus dans un court intervalle, pour éviter une notification par publication.

**IMPLICATIONS UX / UI**

* Notification désactivable indépendamment des autres types de notifications, dans les réglages existants.

### **11.2 Promotions et offres limitées**

**BESOIN**

Créer un rappel d'urgence pour les contenus de type promotion (voir 5.7) proches de leur expiration, sur les produits déjà consultés ou mis en favoris par l'utilisateur.

**RÈGLES MÉTIER**

* Déclenchement uniquement si l'utilisateur a déjà interagi avec le produit concerné (vue prolongée, favori, panier abandonné) — pas d'envoi de masse non ciblé, pour préserver la confiance dans le canal de notification.

### **11.3 Produits similaires**

**BESOIN**

Relancer un utilisateur ayant montré un intérêt pour une catégorie sans avoir converti, en lui signalant un nouveau contenu pertinent.

**FONCTIONNEMENT**

S'appuie sur les mêmes signaux que l'algorithme de recommandation (chapitre 9), avec un seuil de pertinence plus strict que pour le flux lui-même, pour ne déclencher une notification que sur les correspondances les plus fortes.

**RECOMMANDATIONS**

* Limiter strictement la fréquence (ex. pas plus d'une notification de ce type par jour et par utilisateur) pour éviter la lassitude et la désactivation des notifications dans leur ensemble.

### **11.4 Stories (vision Phase 4\)**

**BESOIN**

Format de contenu éphémère (24h) pouvant être introduit en Phase 4 pour les annonces courtes (réassort, nouveauté, coulisses), avec la même contrainte d'association produit que les contenus permanents.

**IMPACTS SUR L'ARCHITECTURE EXISTANTE**

* Réutilise la même table contents avec un champ expires\_at, plutôt qu'une structure de données séparée — cohérent avec le principe de non-duplication posé au chapitre 2\.

### **11.5 Lives (vision Phase 5\)**

**BESOIN**

Notification de démarrage de diffusion en direct aux abonnés d'un vendeur, élément clé de l'efficacité du Live Shopping (voir 5.8).

**RÈGLES MÉTIER**

* Notification envoyée uniquement aux abonnés ayant activé les notifications de live spécifiquement (opt-in distinct des notifications de nouveau contenu standard, le live étant plus intrusif par nature).

## **11.6 Tableau de synthèse des types de notification**

**Types de notification et fenêtre de pertinence**

| Type | Déclencheur | Fréquence maximale recommandée |
| :---- | :---- | :---- |
| Nouveau contenu (vendeur suivi) | Publication d'un contenu par un vendeur suivi | Regroupée, 1 digest max / heure / vendeur |
| Promotion sur produit suivi | Produit en favori/panier proche de la fin d'une promotion | Selon l'événement, non périodique |
| Produit similaire suggéré | Fort score de correspondance avec l'historique récent | 1 / jour / utilisateur maximum |
| Nouveau commentaire (vue vendeur) | Commentaire reçu sur un contenu du vendeur | Temps réel, avec regroupement en cas de rafale |
| Décision de modération | Approbation ou rejet d'un contenu soumis | Temps réel, événementielle |
| Démarrage d'un live (Phase 5\) | Vendeur suivi démarrant une diffusion | Temps réel, opt-in spécifique |

# **12\. Statistiques vendeur**

Ce chapitre détaille, au-delà de la vue d'ensemble déjà posée en 3.4, l'ensemble des indicateurs mis à disposition du vendeur, leur définition exacte et leur séquencement de livraison. La discipline de mesure est volontairement progressive : exposer trop d'indicateurs dès le MVP dilue l'attention du vendeur sur ce qui compte réellement (la conversion en chiffre d'affaires).

## **12.1 Indicateurs par contenu — définitions normatives**

**Indicateurs individuels par contenu**

| Indicateur | Définition | Phase |
| :---- | :---- | :---- |
| Vues | Nombre de fois où le contenu a été affiché à l'écran pendant au moins 1 seconde. | MVP |
| Temps moyen de visionnage | Durée moyenne cumulée de visionnage par vue, plafonnée à la durée du contenu. | MVP |
| Taux de complétion | % de vues ayant atteint la fin du contenu (ou la dernière image du carrousel). | Phase 2 |
| Taux d'ajout au panier | Ajouts au panier depuis ce contenu ÷ vues. | MVP |
| Taux de conversion | Commandes attribuées à ce contenu (voir règle d'attribution 3.4) ÷ vues. | MVP |
| Chiffre d'affaires généré | Somme des montants des commandes attribuées à ce contenu. | MVP |
| Engagement | Somme normalisée des likes, commentaires et partages rapportée aux vues. | Phase 2 |

## **12.2 Tableau de bord créateur (vue agrégée)**

* Évolution sur 7 / 30 / 90 jours des vues, ajouts au panier, commandes et chiffre d'affaires générés par l'ensemble des contenus du vendeur.

* Classement des contenus par taux de conversion et par chiffre d'affaires généré, pour identifier les formats qui fonctionnent et orienter les prochaines publications.

* Comparaison simple entre la performance du canal Découvrir et celle de la recherche/catalogue classique pour les mêmes produits, afin que le vendeur perçoive concrètement la valeur ajoutée du module (Phase 2).

## **12.3 Implications techniques et architecture**

* Les indicateurs MVP s'appuient sur la table content\_stats\_daily (voir 6.2), recalculée par agrégation batch nocturne, complétée par une lecture en temps réel des compteurs Redis pour les vues/likes du jour courant (cohérent avec la stratégie de cache du chapitre 6).

* Aucun calcul d'indicateur ne doit nécessiter un scan complet de la table interactions à la demande : tout indicateur affiché au vendeur doit provenir d'une table pré-agrégée ou d'un compteur dénormalisé, pour garantir un temps de chargement du tableau de bord inférieur à 1 seconde même pour un vendeur avec un historique important.

## **12.4 Recommandations**

* Limiter le tableau de bord MVP aux six indicateurs essentiels listés ci-dessus en colonne "MVP" : vues, temps moyen de visionnage, taux d'ajout au panier, taux de conversion, chiffre d'affaires généré, et classement simple des contenus.

* Introduire l'export CSV et les analyses comportementales avancées (heatmap de rétention vidéo seconde par seconde) uniquement à partir de la Phase 2, une fois la valeur du tableau de bord de base validée par l'usage réel des vendeurs.

# **13\. Administration**

Le back-office existant d'Ahizan s'enrichit de trois nouveaux espaces : un tableau de bord de pilotage global du module, un espace de modération (extension opérationnelle du chapitre 10\) et un espace de gestion éditoriale (mise en avant, tendances).

### **13.1 Tableau de bord global**

**BESOIN**

Donner à l'équipe Ahizan une vision consolidée de la santé et de la performance du module Social Commerce, au même niveau de exigence que les tableaux de bord existants pour la marketplace classique.

**FONCTIONNEMENT**

Indicateurs clés : nombre de contenus publiés (jour/semaine/mois), nombre de vendeurs actifs sur le module, vues totales, taux de conversion global du canal Découvrir, chiffre d'affaires généré, comparaison avec le canal recherche/catalogue.

Vue de santé technique : volume en file de modération, délai moyen de traitement, taux de rejet automatique vs manuel, latence du Feed/Reco Service.

**IMPACTS SUR L'ARCHITECTURE EXISTANTE**

* S'appuie sur l'agrégation déjà décrite en 12.3, étendue à l'échelle de la plateforme plutôt que par vendeur individuel.

### **13.2 Modération (espace opérationnel)**

**BESOIN**

Donner aux modérateurs un outil de traitement efficace de la file décrite au chapitre 10, avec un débit de traitement suffisant pour ne jamais devenir un goulot d'étranglement pour les vendeurs.

**FONCTIONNEMENT**

File priorisée (signal fort automatique en premier, puis signalements communautaires, puis revue standard), avec actions en un clic et raccourcis clavier pour les modérateurs traitant un volume élevé.

**RECOMMANDATIONS**

* Dimensionner l'équipe de modération humaine en fonction du volume de publication observé en MVP avant d'investir dans une automatisation plus poussée, le volume initial étant probablement gérable manuellement avec un effectif réduit.

### **13.3 Statistiques globales et tendances**

**BESOIN**

Identifier les catégories, hashtags et formats de contenu qui fonctionnent le mieux, pour orienter les communications faites aux vendeurs (conseils, campagnes d'incitation à publier dans telle catégorie sous-représentée).

### **13.4 Mise en avant de contenus (éditorial)**

**BESOIN**

Permettre à l'équipe Ahizan de booster manuellement la visibilité d'un contenu dans le flux, pour des opérations commerciales (lancement, partenariat, événement saisonnier) indépendamment du score algorithmique naturel.

**FONCTIONNEMENT**

Sélection manuelle d'un contenu et application d'un boost de score temporaire et borné dans le temps, visible comme tel dans les outils d'administration (traçabilité de toute intervention manuelle sur le classement).

**RÈGLES MÉTIER**

* Un contenu mis en avant reste soumis aux mêmes règles de modération que tout autre contenu ; la mise en avant ne contourne jamais la validation de conformité.

### **13.5 Gestion des tendances**

**BESOIN**

Faire émerger automatiquement les catégories, hashtags ou produits en forte croissance d'engagement, pour informer aussi bien l'équipe éditoriale que, à terme, l'algorithme de recommandation lui-même (signal de tendance, voir 9.4).

**FONCTIONNEMENT**

Calcul périodique (quotidien) de la variation relative de vues/interactions par catégorie et par hashtag sur une fenêtre glissante de 7 jours, avec seuil de significativité pour éviter de faire remonter du bruit statistique sur de petits volumes.

## **13.6 Rôles et permissions détaillées**

**Permissions par rôle back-office**

| Action | Modérateur | Admin |
| :---- | :---- | :---- |
| Voir la file de modération | Oui | Oui |
| Approuver / rejeter un contenu | Oui | Oui |
| Voir les statistiques globales | Lecture restreinte | Oui, complet |
| Mettre en avant un contenu | Non | Oui |
| Configurer les poids de l'algorithme (Phase 2+) | Non | Oui |
| Suspendre un compte vendeur du module contenu | Non (escalade requise) | Oui |

# **14\. Phases de déploiement**

Conformément au principe d'évolution progressive posé au chapitre 1, le module Social Commerce se déploie en six phases. Chaque phase est conçue pour être livrable et utile de manière autonome : aucune phase ne dépend de fonctionnalités d'une phase ultérieure pour apporter de la valeur.

## **14.1 Vue d'ensemble des phases**

**Synthèse des six phases**

| Phase | Nom | Objectif principal |
| :---- | :---- | :---- |
| Phase 1 | MVP | Prouver la valeur du parcours découverte-vers-achat avec le minimum de fonctionnalités fiables. |
| Phase 2 | Engagement | Approfondir l'engagement social (commentaires enrichis, nouveaux formats, statistiques avancées). |
| Phase 3 | Personnalisation | Passer du tri par règles à un flux personnalisé par signaux explicites (Palier 2, chapitre 9). |
| Phase 4 | Créateurs et influenceurs | Renforcer l'identité de créateur du vendeur, formats éphémères (stories), programmes d'incitation. |
| Phase 5 | Live Shopping | Introduire la diffusion en direct avec vente en temps réel. |
| Phase 6 | Intelligence artificielle | Modèle de recommandation par apprentissage automatique (Palier 3\) et assistance à la création de contenu par IA. |

### **14.2 Phase 1 — MVP**

Périmètre fonctionnel minimal permettant de valider l'hypothèse centrale du projet : un flux de découverte par contenu augmente la conversion sans dégrader l'expérience existante.

**INCLUS DANS LE MVP**

* Création de contenu vendeur : vidéo courte, photo, carrousel, avec association produit obligatoire (chapitre 3.1 à 3.3).

* Page Découvrir avec flux vertical, lecture automatique sans son, achat sans quitter le contenu (chapitre 4.1 à 4.4).

* Favoris, partage, abonnement vendeur (chapitre 4.5, 4.6, 4.8) — commentaires inclus en version basique (chapitre 4.7).

* Algorithme Palier 1 (tri par règles, chapitre 9.2).

* Modération automatique de base \+ file de revue manuelle (chapitre 10.1, 10.2).

* Statistiques vendeur essentielles : vues, ajouts panier, conversions, chiffre d'affaires (chapitre 12.4).

* Optimisations réseau fondamentales : compression vidéo, lecture sans son, préchargement limité à un contenu, mode économie de données (chapitre 7, intégralement — non négociable dès le MVP compte tenu du marché cible).

**EXPLICITEMENT EXCLU DU MVP**

* Personnalisation algorithmique avancée (Palier 2 et 3).

* Formats avancés : démonstration, avant/après, témoignage, unboxing, promotion (Phase 2), stories (Phase 4), live (Phase 5).

* Statistiques comportementales fines (heatmap de rétention, export CSV).

* Streaming adaptatif HLS complet (le MVP utilise une sélection de profil statique, voir 6.8).

### **14.3 Phase 2 — Engagement**

**CONTENU DE LA PHASE**

* Nouveaux types de contenu : démonstration, avant/après, témoignage, unboxing, promotion avec compte à rebours (chapitre 5.5 à 5.7).

* Streaming adaptatif HLS complet (chapitre 6.8).

* Statistiques vendeur avancées : taux de complétion, engagement, export CSV, comparaison canal Découvrir vs recherche (chapitre 12).

* Enrichissement SEO interne : onglet vidéos dans la recherche, pages hashtag (chapitre 8).

### **14.4 Phase 3 — Personnalisation**

**CONTENU DE LA PHASE**

* Algorithme Palier 2 : personnalisation par historique d'achat, recherches, catégories consultées, localisation (chapitre 9.3).

* Notifications de produits similaires basées sur ce nouveau scoring (chapitre 11.3).

### **14.5 Phase 4 — Créateurs et influenceurs**

**CONTENU DE LA PHASE**

* Stories éphémères (24h), réutilisant la table contents existante (chapitre 11.4).

* Profil créateur enrichi (badges, mise en avant des meilleurs vendeurs créateurs).

* Programme d'incitation à la publication régulière (à définir conjointement avec l'équipe Croissance/Marketing, hors périmètre technique de ce document).

### **14.6 Phase 5 — Live Shopping**

**CONTENU DE LA PHASE**

* Infrastructure de diffusion en direct (RTMP/WebRTC \+ CDN live), chat en direct, achat en direct (chapitre 5.8).

* Notifications de démarrage de live (chapitre 11.5).

Cette phase ne doit être engagée qu'après validation d'une base critique de vendeurs actifs et d'utilisateurs réguliers sur le module, le live shopping n'étant efficace qu'avec une audience suffisante pour créer l'effet d'urgence et d'interaction recherché.

### **14.7 Phase 6 — Intelligence artificielle**

**CONTENU DE LA PHASE**

* Algorithme Palier 3 : modèle d'apprentissage automatique de recommandation (chapitre 9.5).

* Assistance à la création de contenu par IA : suggestions de légende, de hashtags, voire génération de sous-titres automatiques pour l'accessibilité et l'engagement.

* Détection automatique avancée de tendances émergentes pour orienter proactivement les vendeurs.

# **15\. Roadmap technique**

Ce chapitre traduit les phases produit du chapitre 14 en séquencement d'ingénierie : priorités, dépendances entre chantiers, ordres de grandeur de temps (en semaines-équipe, à affiner par l'équipe d'ingénierie lors du cadrage de sprint), et risques de planning.

## **15.1 Séquencement détaillé — Phase 1 (MVP)**

**Chantiers techniques du MVP, par ordre de dépendance**

| Ordre | Chantier | Dépend de | Estimation indicative |
| :---- | :---- | :---- | :---- |
| 1 | Modèle de données : tables contents, content\_media, interactions, follows, comments \+ extensions products/order\_items (chapitre 6.1-6.3) | Aucune (point de départ) | 1-2 semaines |
| 2 | Media Pipeline : upload chunké, transcodage multi-résolution, miniatures (chapitre 6.4, 6.8) | Modèle de données | 3-4 semaines |
| 3 | Content Service \+ API CRUD contenu (chapitre 6.4, tables Gestion de contenu) | Modèle de données, Media Pipeline (en parallèle possible) | 2-3 semaines |
| 4 | Interaction Service : enregistrement vues/likes/partages/favoris/ajouts panier (chapitre 6.2, 6.4) | Content Service | 2 semaines |
| 5 | Moderation Service : détection automatique de base \+ file manuelle (chapitre 10.1, 10.2) | Content Service | 2-3 semaines (selon fournisseur tiers retenu) |
| 6 | Feed/Reco Service Palier 1 (tri par règles, chapitre 9.2) \+ cache Redis du flux (chapitre 6.5-6.6) | Interaction Service, Content Service | 2-3 semaines |
| 7 | Front-end : flux de création vendeur (chapitre 3.1-3.3) | API Content Service disponible | 3 semaines |
| 8 | Front-end : page Découvrir, lecture vidéo, achat in-content (chapitre 4.1-4.4, 7.1-7.8) | API Feed/Reco \+ Interaction Service disponibles | 4-5 semaines |
| 9 | Front-end : favoris, partage, abonnement, commentaires basiques (chapitre 4.5-4.8) | Front-end flux \+ Interaction Service | 2 semaines (en parallèle du point 8 possible) |
| 10 | Stats Service MVP \+ tableau de bord vendeur (chapitre 3.4, 12.4) | Interaction Service, Order Service (attribution) | 2 semaines |
| 11 | Back-office : file de modération, tableau de bord global de base (chapitre 13.1, 13.2) | Moderation Service, Stats Service | 2 semaines |
| 12 | Tests de charge réseau (simulation 3G), QA bout en bout, feature flags, rollout progressif | Tous les chantiers précédents | 2-3 semaines |

Estimation totale indicative du MVP : 16 à 20 semaines-équipe en tenant compte du parallélisme possible entre certains chantiers (ex. chantiers 3 et 4 peuvent démarrer dès que le modèle de données est stabilisé, sans attendre la fin complète du Media Pipeline), avec une équipe pluridisciplinaire complète (Backend, Front-end mobile/web, DevOps, QA) mobilisée en continu. Cette estimation est indicative et doit être validée par l'équipe d'ingénierie lors du cadrage de sprint détaillé.

## **15.2 Dépendances critiques à anticiper**

**DÉPENDANCES BLOQUANTES**

* Le choix du fournisseur de modération automatique tierce (chapitre 10.1) doit être validé en amont du chantier 5, son délai d'intégration pouvant varier fortement selon le fournisseur retenu.

* Le choix et la validation du fournisseur CDN (chapitre 6.7), en particulier la qualité de desserte du marché ouest-africain, doit être tranché avant le chantier 2, le Media Pipeline étant conçu en fonction du fournisseur retenu.

* L'extension du moteur de recherche existant pour l'indexation des contenus (chapitre 8.1) peut être menée en parallèle du MVP et reportée en tout début de Phase 2 sans bloquer le lancement, la recherche produit classique restant pleinement fonctionnelle sans elle.

## **15.3 Priorités d'arbitrage en cas de contrainte de planning**

Si le planning du MVP doit être réduit, l'ordre de priorité ci-dessous reflète la position du Produit sur ce qui peut être différé sans compromettre la validation de l'hypothèse centrale du projet :

* Non négociable : association produit obligatoire, achat sans quitter le contenu, optimisations réseau de base (chapitre 7), modération automatique de base.

* Différable en premier : commentaires (peuvent être livrés en lecture seule au tout premier lancement, l'écriture suivant à J+2-3 semaines).

* Différable ensuite : tableau de bord vendeur détaillé (un export de données brut peut suffire transitoirement le temps de construire l'interface).

* Jamais différable : tests de charge réseau réel avant mise en production, compte tenu du marché cible — un module qui fonctionne mal en 3G échoue commercialement quelle que soit la qualité de ses autres fonctionnalités.

## **15.4 Risques de planning**

**RISQUES**

* Sous-estimation du temps d'intégration du Media Pipeline si l'équipe n'a pas d'expérience préalable du transcodage vidéo à l'échelle — recommandé : prévoir un spike technique de 1 semaine en tout début de chantier 2 pour valider l'approche avant de s'engager sur l'estimation.

* Dépendance à un fournisseur tiers de modération automatique pouvant introduire un délai externe non maîtrisé par l'équipe d'ingénierie — recommandé : identifier un plan de repli (modération 100% manuelle temporaire) permettant de ne pas bloquer le lancement du MVP en cas de retard du fournisseur.

* Risque de périmètre croissant ("scope creep") sur le flux de création de contenu vendeur, fonctionnalité la plus visible et donc la plus sujette aux demandes d'enrichissement en cours de développement — recommandé : geler le périmètre du chantier 7 dès le cadrage et router toute demande d'enrichissement vers la Phase 2\.

## **15.5 Architecture évolutive**

Les choix d'architecture du chapitre 6 sont conçus pour absorber les phases ultérieures sans refonte majeure :

* Le découplage du Media Pipeline permet d'y ajouter la diffusion en direct (Phase 5\) comme un mode de fonctionnement supplémentaire plutôt qu'un nouveau service indépendant à intégrer après coup.

* Le Feed/Reco Service expose une interface de scoring stable depuis le MVP ; faire évoluer le calcul interne du Palier 1 vers le Palier 2 puis le Palier 3 (chapitre 9\) ne nécessite aucune modification côté Front-end ni côté API publique.

* La table contents, déjà conçue avec un champ subtype et une structure extensible (chapitre 6.2), absorbe nativement les nouveaux formats des Phases 2 et 4 (démonstration, avant/après, stories) sans migration de schéma lourde.

# **16\. Vision à long terme**

Ce chapitre trace la trajectoire d'Ahizan Social Commerce au-delà de la phase de stabilisation et de la roadmap initiale. Il présente les évolutions technologiques et fonctionnelles majeures qui permettront de consolider le positionnement d'Ahizan comme leader régional du commerce conversationnel et social en Afrique de l'Ouest.

## **16.1 Le Live Shopping à l'échelle régionale**

La diffusion vidéo en direct interactive représente l'évolution naturelle du commerce basé sur les contenus courts. À long terme, Ahizan permettra aux vendeurs certifiés d'animer des sessions de vente en direct.

* Intégration d'un serveur de streaming à ultra-faible latence (WebRTC) couplé à un CDN vidéo mondial optimisé pour l'Afrique.

* Superposition interactive d'achat (overlays) : les spectateurs cliquent sur les produits présentés en direct et effectuent l'achat sans quitter le flux vidéo.

* Messagerie instantanée en direct et réactions (likes, émojis) optimisées pour supporter des milliers d'utilisateurs simultanés avec un minimum de bande passante.

## **16.2 Moteur de recommandation par IA multimodale**

En s'appuyant sur les données récoltées lors des premières phases, le moteur de recommandation passera d'un système de filtrage collaboratif de base à un modèle d'apprentissage profond multimodal :

* Analyse automatique du contenu vidéo et des images par vision par ordinateur pour classifier automatiquement les produits présentés (couleurs, styles, catégories).

* Traitement du langage naturel (NLP) adapté aux langues locales d'Afrique de l'Ouest (Fon, Yoruba, Wolof, Mina) pour analyser le contenu audio des vidéos et les commentaires.

* Graphes de connaissances reliant les comportements de navigation sur le flux social aux intentions d'achat réelles sur la marketplace.

## **16.3 Modération automatisée et détection des fraudes avancées**

Pour garantir la confiance et la sécurité sur la plateforme à grande échelle, le système de modération intégrera des outils d'IA prédictive :

* Détection automatique des contrefaçons par comparaison d'images avec les banques de données de marques officielles.

* Analyse comportementale des vendeurs pour identifier les faux avis, les manipulations de likes ou les escroqueries de livraison.

* Système d'évaluation de la réputation des créateurs de contenu, limitant automatiquement la visibilité des comptes suspects ou signalés de manière répétée.

## **16.4 Programme d'affiliation et Creator Economy**

Ahizan encouragera la création de contenus par des tiers (influenceurs, clients ambassadeurs) via un programme d'affiliation natif et automatisé :

* Un utilisateur ou influenceur peut créer un contenu en associant le produit d'un vendeur tiers.

* Chaque vente générée via ce contenu attribue automatiquement une commission au créateur, gérée par smart contracts ou via les APIs de Mobile Money intégrées.

* Tableau de bord dédié aux créateurs pour suivre leurs revenus d'affiliation et la performance de leurs vidéos.

## **16.5 Expansion transfrontalière et logistique intégrée**

La vision long terme d'Ahizan est d'unifier le commerce social dans l'espace UEMOA (Union Économique et Monétaire Ouest-Africaine) :

* Interopérabilité totale des systèmes de paiement : paiements transfrontaliers fluides entre pays (ex. un client au Togo achetant à un vendeur au Bénin).

* Partenariats logistiques régionaux avec suivi en temps réel pour assurer des délais de livraison transfrontaliers compétitifs.

* Gestion multi-devises et conformité réglementaire automatique avec les directives de la BCEAO.

