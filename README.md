# Projet E-commerce Ahizan

Ce dépôt contient le code source de la plateforme e-commerce Ahizan.

## 📂 Structure du Dépôt

- `backend/` : Serveur Vendure (API, Admin UI, Worker). Basé sur Node.js / TypeScript.
- `frontend/` : Storefront Next.js.
- `docker/` : Configuration pour le déploiement en production (Docker Compose).

---

## 🚀 Développement Local (Sans Docker)

Pour développer sur votre machine (Windows, Mac, Linux), vous n'avez **pas besoin de Docker**.

### Pré-requis
1.  **Node.js** (v18 ou supérieur)
2.  **PostgreSQL** (installé localement ou accès à une instance distante)

### 1. Backend (Vendure)

Le backend contient l'API GraphQL et le Dashboard Administrateur (React).

1.  Allez dans le dossier backend :
    ```bash
    cd backend
    ```

2.  Installez les dépendances :
    ```bash
    npm install
    ```

3.  Créez votre fichier de configuration locale `.env` (à la racine de `backend/`) :
    ```env
    # Exemple de configuration locale
    APP_ENV=dev
    DB_HOST=localhost
    DB_PORT=5432
    DB_NAME=ahizan_local
    DB_USERNAME=postgres
    DB_PASSWORD=votre_mot_de_passe
    ```

4.  Lancez le serveur :
    ```bash
    npm run dev
    ```
    - **Shop API** : `http://localhost:3000/shop-api`
    - **Admin API** : `http://localhost:3000/admin-api`
    - **Admin Dashboard** : `http://localhost:3000/admin` (Login: superadmin / superadmin)

### 2. Frontend (Next.js)

Le storefront client.

1.  Allez dans le dossier frontend :
    ```bash
    cd frontend
    ```

2.  Installez les dépendances :
    ```bash
    npm install
    ```

3.  Créez votre fichier `.env.local` (à la racine de `frontend/`) :
    ```env
    NEXT_PUBLIC_VENDURE_API_URL=http://localhost:3000/shop-api
    ```

4.  Lancez le frontend :
    ```bash
    npm run dev
    ```
    - Accès : `http://localhost:3001` (ou port affiché dans le terminal)

---

## 🐳 Déploiement / Production (Docker)

La configuration Docker se trouve dans le dossier `docker/` et à la racine.
Pour lancer la stack complète en mode production (ou simulation de prod) :

```bash
docker compose up -d
```
