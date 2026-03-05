# Plan d'Intégration Brevo (Email & SMS) pour AHIZAN

Ce document détaille l'architecture et les étapes d'intégration de **Brevo** pour la gestion des e-mails transactionnels et des notifications SMS au sein de la marketplace AHIZAN. L'objectif est de centraliser toutes les notifications sur la plateforme Brevo tout en respectant l'architecture "backend-first" dictée par le cahier des charges.

## User Review Required
> [!IMPORTANT]
> **Coûts et Limites Brevo** : Le SMS via Brevo est facturé à l'envoi. Il conviendra de valider avec le métier quels événements justifient *absolument* un SMS (ex: validation de commande, compte vendeur approuvé) par rapport à un simple e-mail, afin d'optimiser les coûts.

> [!NOTE]
> **Format des numéros** : L'API SMS de Brevo exige le format international (E.164, e.g. `+229...`). Les données actuelles de la base comportent-elles déjà cet indicatif ou faudra-t-il appliquer une migration/formatage par défaut ?

---

## 1. Architecture Globale

Conformément à la règle "aucune logique métier côté frontend", **toutes** les intégrations Brevo (Email et SMS) seront pilotées par le backend **Vendure**.
Les frontends (Storefront Acheteur et Dashboard Vendeur) se contenteront de fournir des numéros de téléphone bien formatés et de déclencher les mutations GraphQL standards (création de compte, checkout, etc.).

### 1.1 Backend (Vendure)
- **E-mails** : Utilisation du plugin natif `@vendure/email-plugin` configuré pour utiliser le relais SMTP de Brevo.
- **SMS** : Création d'un plugin personnalisé `AhizanSmsNotificationPlugin` (ou service) écoutant l'`EventBus` de Vendure pour déclencher des requêtes HTTP vers l'API SMS de Brevo.

### 1.2 Frontend (Next.js)
- Amélioration de la collecte des numéros de téléphone pour forcer ou faciliter la saisie du code pays (ex: `+229`).

---

## 2. Intégration Backend (Vendure)

### 2.1 E-mails Transactionnels (SMTP Brevo)

#### [MODIFY] `backend/src/vendure-config.ts`
Remplacer la configuration dev de l'`EmailPlugin` par la configuration SMTP production utilisant Brevo.

```typescript
// Exemple de configuration à appliquer selon l'environnement
EmailPlugin.init({
    devMode: process.env.APP_ENV === 'dev' ? true : false,
    outputPath: path.join(__dirname, '../static/email/test-emails'),
    route: 'mailbox',
    handlers: defaultEmailHandlers,
    templateLoader: new FileBasedTemplateLoader(path.join(__dirname, '../static/email/templates')),
    globalTemplateVars: {
        fromAddress: process.env.BREVO_FROM_EMAIL || '"Ahizan" <noreply@ahizan.com>',
        verifyEmailAddressUrl: `${process.env.STOREFRONT_URL}/verify`,
        passwordResetUrl: `${process.env.STOREFRONT_URL}/password-reset`,
        changeEmailAddressUrl: `${process.env.STOREFRONT_URL}/verify-email-address-change`
    },
    transport: {
        type: 'smtp',
        host: process.env.BREVO_SMTP_HOST || 'smtp-relay.brevo.com',
        port: +(process.env.BREVO_SMTP_PORT || 587),
        auth: {
            user: process.env.BREVO_SMTP_USER,
            pass: process.env.BREVO_SMTP_PASSWORD,
        },
    },
})
```

**Événements gérés nativement par `defaultEmailHandlers` :**
- `AccountRegistrationEvent` (Création de compte acheteur/vendeur)
- `PasswordResetEvent` (Mot de passe oublié)
- `EmailAddressChangeEvent`
- `OrderStateTransitionEvent` (Confirmation de commande acheteur)

### 2.2 Table Complète de Mapping des Événements (Email & SMS)

Voici la cartographie EXHAUSTIVE de tous les événements e-commerce du système AHIZAN et leur traduction en notification Brevo.

| Événement Vendure (Backend) | Acteur Cible | Canal | Déclencheur (Condition) | Contenu / Template |
| :--- | :--- | :--- | :--- | :--- |
| **`AccountRegistrationEvent`** | Acheteur | Email | Création d'un compte sur le Storefront | Bienvenue, confirmation d'adresse e-mail. *(Géré par defaultEmailHandlers)* |
| **`VendorEvent`** | Vendeur | Email (+ SMS) | Formulaire d'inscription Vendeur soumis | "Votre demande de création de boutique est bien enregistrée et en cours d'examen." |
| **`VendorEvent`** | Vendeur | Email + SMS | Validation par l'Admin | Félicitations, compte approuvé. Lien vers le Dashboard. |
| **`PasswordResetEvent`** | Acheteur / Vendeur | Email | Demande de mot de passe oublié | Lien contenant le token de réinitialisation. *(Géré par defaultEmailHandlers)* |
| **`OrderStateTransitionEvent`** | Acheteur | Email + SMS | Commande validée | "Merci de votre achat. Votre commande [Code] est confirmée." |
| **`OrderLineEvent`** | Vendeur | Email + SMS | Nouvelle commande attribuée au vendeur | "Nouvelle vente ! Une commande [Code] est en attente de traitement." |
| **`FulfillmentStateTransitionEvent`** | Acheteur | SMS | Commande expédiée / livrée | Le statut de la livraison (prise en charge par le vendeur). |
| **`OrderStateTransitionEvent`** | Acheteur | Email + SMS | Commande annulée | "Votre commande [Code] a été annulée." (Préciser motif si possible). |
| **`PaymentStateTransitionEvent`** | Acheteur | SMS (Optionnel) | Échec de paiement | "Échec du paiement pour la commande [Code]. Veuillez réessayer." |
| **`RefundStateTransitionEvent`** | Acheteur | Email | Remboursement initié | "Le remboursement de X FCFA pour la commande [Code] a été effectué." |
| **`StockMovementEvent`** | Vendeur | Email | Niveau de stock passe sous un seuil (ex: inférieur à 5) | "Alerte Stock : Le produit [Nom] est presque épuisé (Restant : X)." |
| **`ProductVariantEvent`** | Vendeur | Email | Produit passe 'Out of Stock' | "Rupture de stock : Le produit [Nom] n'est plus disponible à la vente." |

### 2.3 Détails d'Implémentation du Service de Notification

Pour gérer ces nombreux événements en dehors de ceux par défaut, un **SmsAndAlertService** sera créé dans le backend `backend/src/plugins/notifications/notification.service.ts`.

Ce service écoutera l'`EventBus` de Vendure :

```typescript
// Exemple de souscription avancée dans NotificationEventSubscriber
this.eventBus.ofType(StockMovementEvent).subscribe(async event => {
    // Audit du stock restant
    for (const movement of event.stockMovements) {
        const variant = await this.productVariantService.findOne(event.ctx, movement.productVariant.id);
        if (variant && variant.stockLevel <= 5 && variant.stockLevel > 0) {
            // Identifier le vendeur propriétaire du produit et envoyer l'e-mail d'Alerte Stock
        } else if (variant && variant.stockLevel === 0) {
            // Identifier le vendeur et envoyer l'e-mail de Rupture de Stock
        }
    }
});

this.eventBus.ofType(PaymentStateTransitionEvent).subscribe(async event => {
    if (event.toState === 'Declined' || event.toState === 'Error') {
        // Envoi SMS à l'acheteur pour échec de paiement
    }
});
```

Les SMS seront toujours gérés via l'API REST transactionnelle de Brevo (`POST https://api.brevo.com/v3/transactionalSMS/sms`) encapsulée dans ce service.

### 2.4 Configuration Dynamique via le Back-office (Admin UI)

Pour répondre à l'exigence métier de **ne pas coder en dur** les clés API, indicatifs pays et templates SMS dans le code ou le serveur, la configuration sera gérée dynamiquement depuis le panel d'administration Vendure.

#### [NEW] `backend/src/plugins/notifications/notifications.plugin.ts`
Ce plugin déclarera une nouvelle entité `BrevoSettings` (ou étendra les `GlobalSettings` de Vendure avec des `customFields`) pour stocker en base de données :
- `brevoApiKey` (Clé API pour les SMS Brevo)
- `defaultPhonePrefix` (L'indicatif par défaut, ex: `+229`)
- `enableOrderSms`, `enableVendorSms`, etc. (Toggles d'activation)
- `templateOrderConfirmed`, `templateStockAlert`, etc. (Texte des templates avec support de variables dynamiques type `{{ orderCode }}`)

#### [NEW] Extension de l'Admin UI Vendure
Le plugin fournira une interface graphique intégrée au Back-office (Admin UI) sous un nouvel onglet **"Notifications Brevo"**.
- Les administrateurs pourront y configurer leur Clé API sans toucher au `.env`.
- Ils pourront écrire, modifier, et personnaliser les textes des SMS directement depuis l'interface (ex: *"Ahizan: Merci pour l'achat ! Commande: {{ orderCode }}"*).
- Le service backend lira cette configuration en temps réel en base de données avant chaque envoi.

> **Note SMTP** : La fonctionnalité d'envoi d'**e-mails** native de Vendure (`@vendure/email-plugin`) nécessitera toujours de s'initialiser au démarrage du serveur avec les identifiants SMTP. Ces variables spécifiques resteront dans le fichier de configuration.

---

## 3. Intégration Frontend (Next.js)

Bien que le backend s'occupe de l'envoi, le frontend est garant de la **qualité de la donnée** collectée (les numéros de téléphone).

### 3.1 Storefront Acheteur
**Fichiers impactés (exemples probables) :**
- Formulaire d'inscription Acheteur.
- Formulaire de Checkout (Adresse / Contact de livraison).

**Actions :**
- Ajouter un composant d'input de numéro de téléphone avec un sélecteur de préfixe pays (ex: `react-phone-number-input`).
- Validation côté client pour s'assurer que le numéro fait la bonne longueur avant soumission.

### 3.2 Dashboard Vendeur
**Fichiers impactés (exemples probables) :**
- Formulaire de demande de création de compte vendeur (Inscription).
- Paramètres du profil vendeur.

**Actions :**
- Garantir de la même façon que le numéro soumis dans le champ `phoneNumber` de la mutation `registerVendor` est au format international (E.164).

---

## 4. Configuration SMTP et API

Auparavant centralisée dans le `.env`, la configuration est désormais hybride pour donner plus de flexibilité aux administrateurs :

**1. E-mails (Fixé au démarrage via `.env`) :**
Le plugin natif Vendure pour les e-mails nécessite ses identifiants dès le lancement de l'application :

```env
# Brevo SMTP Configuration (pour les E-mails uniquements)
BREVO_SMTP_HOST=smtp-relay.brevo.com
BREVO_SMTP_PORT=587
BREVO_SMTP_USER=votre_email_compte_brevo
BREVO_SMTP_PASSWORD=votre_mot_de_passe_smtp_brevo
BREVO_FROM_EMAIL="Ahizan" <noreply@ahizan.com>
```

**2. SMS et Templates (100% Dynamique via Back-office) :**
La clé d'API Brevo (`BREVO_API_KEY`), l'indicatif téléphonique (`+229`), l'activation des alertes, et **tous les textes (templates) des SMS** seront saisis et modifiables par l'administrateur directement sur l'interface du Dashboard Admin de Vendure, via l'extension UI décrite en Section 2.4. **Le fichier `.env` n'est plus requis pour la partie SMS.**

---

## 5. Cadrage et Planning de mise en œuvre

1. **Validation métier** : 
   - Valider la liste des SMS à envoyer (voir Section 2.2).
   - Définir les *Templates* / Textes exacts des SMS.
   - Trancher sur l'indicatif pays fixe ou dynamique pour les numéros existants (ex: +229).
2. **Implémentation Backend** : 
   - Application de la config SMTP.
   - Création du `BrevoSmsService`.
   - Création du ou des subscribers aux `EventBus`.
3. **Implémentation Frontend** :
   - Update des champs `phoneNumber` avec forçage du format international.
4. **Tests** :
   - Tester le workflow complet d'achat et d'inscription avec la console de dev Brevo.
