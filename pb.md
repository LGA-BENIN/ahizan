# Situation Projet Ahizan - Résumé pour Handoff

**Date**: 8 mai 2026
**Environnement**: Serveur Linux, Docker Compose

---

## Contexte Général

Le projet Ahizan est une plateforme e-commerce avec plusieurs services :
- **ahizan_backend** : API Vendure (Up 5 weeks)
- **ahizan_storefront** : Frontend Next.js (Up 5 weeks)
- **ahizan_seller** : Interface vendeur (Up 5 weeks)
- **ahizan_media** : Service média (Up 5 weeks)
- **ahizan_db** : Base de données (Up 3 months)
- **ahizan_frontend** : Frontend alternatif (Up 3 months)
- **ide-server** : IDE code-server (Up 2 months)
- **nginx-proxy** : Reverse proxy SSL (Up 5 weeks)
- **colissur-api** : API Colissur (Up 3 months)
- **colissur-mysql** : DB Colissur (Up 3 months)
- **colissur-queue** : Queue Colissur (Up 3 months)

---

## Problèmes Principaux Identifiés

### 1. Build Storefront échoue constamment

**Symptôme**: `docker compose build storefront` échoue avec erreur de prerendering

**Cause Root**: 
- Next.js 16 avec `cacheComponents: true` activé dans `next.config.ts`
- Le layout `(storefront)/layout.tsx` appelle `getActiveCustomer()` → `cookies()` pendant le prerendering
- Avec `cacheComponents: true`, toutes les routes sont tentées d'être prerendues statiquement
- Les appels à `cookies()` pendant le prerendering causent `HANGING_PROMISE_REJECTION`

**Erreur typique**:
```
Error occurred prerendering page "/account/profile"
Export encountered an error on /(storefront)/account/profile/page: /account/profile, exiting the build.
```

---

## Corrections Apportées

### A. Refactorisation du Layout Storefront

**Fichier**: `/srv/ahizan/Storefront/src/app/(storefront)/layout.tsx`

**Changements**:
1. Séparation en deux composants :
   - `DynamicBranding` : Fetch CMS data (cachable) avec `'use cache'`
   - `AhizanNavbarWithUser` : Fetch user/order (cookies) dans `<Suspense>`

2. Création de `/srv/ahizan/Storefront/src/components/ahizan/AhizanNavbarWrapper.tsx`:
```typescript
export async function AhizanNavbarWithUser({ config }: { config?: any }) {
    await connection(); // Force dynamic rendering
    let customer = null;
    let order = null;
    try {
        [customer, order] = await Promise.all([
            getActiveCustomer(),
            getActiveOrder(),
        ]);
    } catch (e) {
        console.error('AhizanNavbarWithUser: failed to fetch user/order', e);
    }
    return <AhizanNavbar config={config} customer={customer} order={order} />;
}
```

3. Le layout appelle maintenant :
```typescript
<Suspense fallback={<AhizanNavbar config={headerConfig} customer={null} order={null} />}>
    <AhizanNavbarWithUser config={headerConfig} />
</Suspense>
```

---

### B. Correction des Pages Account

**Pattern appliqué**: Wrapper `<Suspense>` + sous-composant async avec `await connection()`

**Pages modifiées**:

1. **`/srv/ahizan/Storefront/src/app/(storefront)/account/profile/page.tsx`**
   - Créé `ProfileContent()` avec `await connection()`
   - Page par défaut synchrone avec `<Suspense>`

2. **`/srv/ahizan/Storefront/src/app/(storefront)/account/orders/page.tsx`**
   - Créé `OrdersContent()` avec `await connection()`
   - Passage de `searchParams` comme Promise

3. **`/srv/ahizan/Storefront/src/app/(storefront)/account/orders/[code]/page.tsx`**
   - Créé `OrderDetailContent()` avec `await connection()`
   - Passage de `params` comme Promise

4. **`/srv/ahizan/Storefront/src/app/(storefront)/account/addresses/page.tsx`**
   - Créé `AddressesContent()` avec `await connection()`

5. **`/srv/ahizan/Storefront/src/app/(storefront)/account/verify-email/page.tsx`**
   - Ajouté `await connection()` dans `VerifyEmailContent()`
   - Rendu page par défaut synchrone

6. **`/srv/ahizan/Storefront/src/app/(storefront)/checkout/page.tsx`**
   - Créé `CheckoutContent()` avec `await connection()`

---

### C. Correction Page Home

**Fichier**: `/srv/ahizan/Storefront/src/app/(storefront)/page.tsx`

**Changements**:
```typescript
async function HomeContent() {
    'use cache';
    let sections: any[] = [];
    try {
        const page = await getPageContent('home');
        sections = page?.sections || [];
    } catch (e) {
        console.error('HomeContent: failed to fetch CMS page', e);
    }
    return <AhizanHome sections={sections} />;
}
```

---

### D. Correction Composant AhizanHome

**Fichier**: `/srv/ahizan/Storefront/src/components/ahizan/AhizanHome.tsx`

**Changements**:
- Normalisation de `sections` au début du composant :
```typescript
export function AhizanHome({ sections: sectionsProp }: { sections: CmsSection[] }) {
    const sections = sectionsProp || []; // Défensif
```

---

## Certificats SSL

### Configuration Nginx

**Domaines configurés**:
- `ahizan.com` → `/srv/nginx/conf.d/ahizan.com.conf`
- `api.ahizan.com` → `/srv/nginx/conf.d/api.ahizan.com.conf`
- `seller.ahizan.com` → `/srv/nginx/conf.d/seller.ahizan.com.conf`
- `ide.ahizan.com` → `/srv/nginx/conf.d/ide.ahizan.com.conf`
- `administrator.ahizan.com` → `/srv/nginx/conf.d/administrator.ahizan.com.conf`
- `api.colissur.com` → `/srv/nginx/conf.d/api.colissur.com.conf`

**Certs Let's Encrypt existants** (dans `/etc/letsencrypt/live/`):
- `api.ahizan.com` - Valide jusqu'au 5 août 2026
- `ide.ahizan.com` - Valide jusqu'au 10 mai 2026 (renouvelé aujourd'hui)
- `seller.ahizan.com` - Valide jusqu'au 25 juin 2026
- `api.colissur.com` - EXPIRÉ depuis le 22 avril (renouvelé aujourd'hui)

**Certs manquants**:
- `administrator.ahizan.com` - Utilise le cert `api.ahizan.com` (couvre `ahizan.com`, `api.ahizan.com`, `www.ahizan.com` mais PAS `administrator.ahizan.com`)

---

## Actions SSL Effectuées

### 1. Renouvellement `api.colissur.com`

**Problème**: Cert expiré le 22 avril 2026
**Solution**:
1. Temporairement désactivé le redirect 301 dans `/srv/nginx/conf.d/api.colissur.com.conf`
2. Rechargé nginx
3. Exécuté: `sudo certbot certonly --webroot -w /srv/nginx/webroot -d api.colissur.com --non-interactive --agree-tos -m admin@ahizan.com --deploy-hook /srv/nginx/certs-sync.sh`
4. Restauré la conf nginx
5. **Résultat**: Cert valide jusqu'au 6 août 2026

### 2. Renouvellement `ide.ahizan.com`

**Problème**: Cert expire dans 2 jours (10 mai 2026)
**Solution**:
1. Temporairement désactivé le redirect 301 dans `/srv/nginx/conf.d/ide.ahizan.com.conf`
2. Rechargé nginx
3. Exécuté: `sudo certbot renew --cert-name ide.ahizan.com --webroot -w /srv/nginx/webroot --force-renewal --deploy-hook /srv/nginx/certs-sync.sh`
4. Restauré la conf nginx
5. **Résultat**: Cert renouvelé avec succès

---

## État Actuel du Build

### Dernière tentative de build

**Commande**: `docker compose build --no-cache storefront`
**Résultat**: ÉCHEC

**Erreur restante**:
```
Error occurred prerendering page "/account/profile"
Export encountered an error on /(storefront)/account/profile/page: /account/profile, exiting the build.
```

**Stack trace**:
```
at x (src/lib/auth.ts:11:31)
at <unknown> (src/lib/vendure/actions.ts:11:25)
at i (src/components/ahizan/AhizanNavbarWrapper.tsx:13:13)
```

**Analyse**: Même après l'ajout de `await connection()` dans `AhizanNavbarWrapper`, le prerendering échoue toujours sur `/account/profile`.

---

## Problème Persistant

Le pattern `await connection()` + `<Suspense>` ne semble pas suffire. Le build échoue toujours sur les pages account.

**Hypothèse**: 
- Le layout avec `'use cache'` + Suspense boundary pourrait causer des conflits
- Il faudrait peut-être marquer toutes les pages account comme `export const dynamic = 'force-dynamic'` au lieu d'utiliser `connection()`

---

## Ce qui reste à faire

### Priorité 1: Fixer le build Storefront

**Options à explorer**:
1. **Option A**: Ajouter `export const dynamic = 'force-dynamic'` à toutes les pages account au lieu de `connection()`
2. **Option B**: Désactiver `cacheComponents` temporairement dans `next.config.ts`
3. **Option C**: Vérifier si d'autres pages (product, collection, search) ont le même problème
4. **Option D**: Utiliser `next build --debug-prerender` pour plus de détails

**Pages potentiellement problématiques**:
- Toutes les pages avec `useAuthToken: true`
- Pages qui fetchent des données dynamiques
- Pages dans `/account/`, `/checkout/`, `/cart/`

---

### Priorité 2: Certificats SSL

**À faire**:
1. Créer un cert pour `administrator.ahizan.com` (actuellement utilise un cert qui ne le couvre pas)
2. Vérifier si `api.ahizan.com` couvre bien tous les sous-domaines nécessaires
3. Configurer le renouvellement automatique pour tous les certs

---

### Priorité 3: Nettoyage

**Espace disque**: 135 GB disponibles (32% utilisé) - OK
**Docker cleanup**: Effectué - 1.124 GB libéré

---

## Commandes utiles

```bash
# Build storefront
cd /srv/ahizan
docker compose build --no-cache storefront

# Debug build
docker compose build --no-cache storefront 2>&1 | tee /tmp/storefront-build.log

# Vérifier les certs
sudo openssl x509 -in /etc/letsencrypt/live/<domain>/cert.pem -noout -enddate -subject

# Renouveler cert
sudo certbot renew --cert-name <domain> --webroot -w /srv/nginx/webroot --force-renewal --deploy-hook /srv/nginx/certs-sync.sh

# Recharger nginx
sudo docker exec nginx-proxy nginx -s reload

# Vérifier services
docker ps --format '{{.Names}}\t{{.Status}}'
```

---

## Fichiers modifiés

1. `/srv/ahizan/Storefront/src/app/(storefront)/layout.tsx` - Refactorisé avec Suspense
2. `/srv/ahizan/Storefront/src/components/ahizan/AhizanNavbarWrapper.tsx` - Créé avec `connection()`
3. `/srv/ahizan/Storefront/src/app/(storefront)/page.tsx` - Ajouté `'use cache'` + try/catch
4. `/srv/ahizan/Storefront/src/components/ahizan/AhizanHome.tsx` - Normalisé `sections`
5. `/srv/ahizan/Storefront/src/app/(storefront)/account/profile/page.tsx` - Pattern Suspense + connection()
6. `/srv/ahizan/Storefront/src/app/(storefront)/account/orders/page.tsx` - Pattern Suspense + connection()
7. `/srv/ahizan/Storefront/src/app/(storefront)/account/orders/[code]/page.tsx` - Pattern Suspense + connection()
8. `/srv/ahizan/Storefront/src/app/(storefront)/account/addresses/page.tsx` - Pattern Suspense + connection()
9. `/srv/ahizan/Storefront/src/app/(storefront)/account/verify-email/page.tsx` - Ajouté connection()
10. `/srv/ahizan/Storefront/src/app/(storefront)/checkout/page.tsx` - Pattern Suspense + connection()
11. `/srv/nginx/conf.d/api.colissur.com.conf` - Temporairement modifié pour renouvellement
12. `/srv/nginx/conf.d/ide.ahizan.com.conf` - Temporairement modifié pour renouvellement

---

## Notes importantes pour le développeur suivant

1. **Next.js 16 + cacheComponents**: C'est une nouvelle fonctionnalité qui change le comportement du prerendering. Tous les composants async qui appellent `cookies()` ou `headers()` doivent être dans `<Suspense>` avec `await connection()` ou marqués comme `dynamic = 'force-dynamic'`.

2. **Pattern recommandé**:
   ```typescript
   // Pour les pages avec cookies
   async function PageContent() {
       await connection(); // OU export const dynamic = 'force-dynamic'
       const data = await getDynamicData();
       return <Component data={data} />;
   }
   
   export default function Page() {
       return <Suspense fallback={...}><PageContent /></Suspense>;
   }
   ```

3. **SSL**: Le script `/srv/nginx/certs-sync.sh` synchronise les certs de `/etc/letsencrypt/` vers `/srv/nginx/certs/` après chaque renouvellement.

4. **Espace disque**: Suffisant, pas de problème imminent.

---

## Contact

**Projet**: Ahizan E-commerce Platform
**Date handoff**: 8 mai 2026
**Environnement**: Serveur de production
