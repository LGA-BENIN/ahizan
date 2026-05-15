# 🚀 Guide d'Accès aux Applications AHIZAN

## ✅ État des Services

Tous les services sont **opérationnels** :

| Service | Container | Status | Port |
|---------|-----------|--------|------|
| **Backend (Vendure)** | ahizan_backend | ✅ Running | 3000 |
| **Seller (Vendeurs)** | ahizan_seller | ✅ Running | 3000 |
| **Storefront (Boutique)** | ahizan_storefront | ✅ Running | 3000 |
| **Base de données** | ahizan_db | ✅ Running | 5432 |

---

## 🌐 Configuration DNS Requise

Pour accéder aux applications via leurs sous-domaines, vous devez créer les enregistrements DNS suivants dans votre zone DNS (chez votre registrar ou Cloudflare) :

### Enregistrements DNS à créer :

```
Type: A
Nom: api.ahizan.com
Valeur: [VOTRE_IP_SERVEUR]
TTL: 3600

Type: A
Nom: seller.ahizan.com
Valeur: [VOTRE_IP_SERVEUR]
TTL: 3600

Type: A
Nom: ahizan.com
Valeur: [VOTRE_IP_SERVEUR]
TTL: 3600

Type: A
Nom: www.ahizan.com
Valeur: [VOTRE_IP_SERVEUR]
TTL: 3600
```

**Note:** Remplacez `[VOTRE_IP_SERVEUR]` par l'adresse IP publique de votre VPS.

---

## 📍 URLs d'Accès

Une fois la configuration DNS propagée (5-30 minutes), vos applications seront accessibles via :

### 🏪 Storefront (Boutique Publique)
- **URL principale:** https://ahizan.com
- **URL alternative:** https://www.ahizan.com
- **Description:** Interface publique où les clients font leurs achats

### 👔 Seller (Espace Vendeurs)
- **URL:** https://seller.ahizan.com
- **Description:** Interface pour les vendeurs pour gérer leurs produits, commandes, profil

### ⚙️ Backend API (Vendure)
- **Shop API:** https://api.ahizan.com/shop-api
- **Admin API:** https://api.ahizan.com/admin-api
- **Dashboard Admin:** https://api.ahizan.com/admin
- **GraphiQL Shop:** https://api.ahizan.com/graphiql/shop
- **GraphiQL Admin:** https://api.ahizan.com/graphiql/admin
- **Assets:** https://api.ahizan.com/assets

---

## 🔍 Vérification des Services

### Vérifier que tous les containers tournent :
```bash
docker compose ps
```

### Vérifier les logs en temps réel :
```bash
# Backend
docker logs -f ahizan_backend

# Seller
docker logs -f ahizan_seller

# Storefront
docker logs -f ahizan_storefront
```

### Vérifier les labels nginx-proxy :
```bash
docker inspect ahizan_backend ahizan_seller ahizan_storefront | grep -A 2 '"VIRTUAL_HOST"'
```

---

## 🔧 Commandes Utiles

### Redémarrer un service spécifique :
```bash
docker compose restart vendure    # Backend
docker compose restart seller     # Seller
docker compose restart storefront # Storefront
```

### Redémarrer tous les services :
```bash
docker compose restart
```

### Voir les logs d'un service :
```bash
docker compose logs -f [service_name]
```

### Reconstruire et redémarrer un service :
```bash
docker compose up -d --build [service_name]
```

---

## 🛡️ SSL/HTTPS (Recommandé)

Pour activer HTTPS sur vos domaines, vous devez :

1. **Si vous utilisez déjà Let's Encrypt avec nginx-proxy :**
   - Les certificats devraient se générer automatiquement
   - Vérifiez avec : `docker logs nginx-proxy | grep -i "acme"`

2. **Si vous n'avez pas encore SSL :**
   - Installez le companion nginx-proxy-acme
   - Ou configurez Cloudflare en mode Proxy avec SSL

---

## ✅ Checklist de Mise en Production

- [x] Build des images Docker réussi
- [x] Tous les containers démarrés
- [x] Labels VIRTUAL_HOST configurés
- [x] nginx-proxy détecte les containers
- [ ] Enregistrements DNS créés et propagés
- [ ] Certificats SSL actifs
- [ ] Test d'accès à chaque URL
- [ ] Vérification des fonctionnalités (login, ajout produit, commande)

---

## 📞 Résolution de Problèmes

### Les URLs ne sont pas accessibles :

1. **Vérifier la propagation DNS :**
   ```bash
   nslookup api.ahizan.com
   nslookup administrator.ahizan.com
   nslookup seller.ahizan.com
   nslookup ahizan.com
   ```

2. **Vérifier que nginx-proxy tourne :**
   ```bash
   docker ps | grep nginx-proxy
   ```

3. **Redémarrer nginx-proxy :**
   ```bash
   docker restart nginx-proxy
   ```

4. **Vérifier les logs nginx-proxy :**
   ```bash
   docker logs nginx-proxy --tail 50
   ```

### Un service ne démarre pas :

1. **Voir les logs détaillés :**
   ```bash
   docker compose logs [service_name]
   ```

2. **Reconstruire l'image :**
   ```bash
   docker compose build --no-cache [service_name]
   docker compose up -d [service_name]
   ```

---

## 📊 Monitoring

Pour surveiller l'état de vos applications :

```bash
# Utilisation CPU/RAM des containers
docker stats

# Espace disque
df -h

# Logs système
journalctl -u docker -f
```

---

**Date de création:** 27 mars 2026  
**Status:** ✅ Tous les services sont opérationnels et prêts pour l'accès via sous-domaines
