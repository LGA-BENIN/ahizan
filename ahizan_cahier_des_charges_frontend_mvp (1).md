# AHIZAN – Implémentation du Storefront Acheteur Piloté par le Backend (MVP)

## 1. Objectif du document
Ce document définit **comment implémenter dès le MVP** un storefront acheteur flexible, piloté par le backend Vendure, **sans tomber dans un CMS complexe**.

Objectifs clés :
- Éviter le code frontend figé
- Éviter un "mini-Webflow" ingérable
- Poser une base scalable (Amazon-like)

---

## 2. Principe fondamental
Le storefront acheteur est un **CMS léger interprétatif**.

- **Le backend décide** : structure, ordre, activation
- **Le frontend interprète** : rendu, animations, UX

Contraintes volontaires du MVP :
- Types de sections limités
- Pas de création de nouveaux layouts depuis l’admin
- Pas de logique JS dynamique côté admin

---

## 3. Modélisation Backend (Vendure)

### 3.1 Choix technique
✔ Custom Entities Vendure (recommandé)

Entités principales :
- `Page`
- `PageSection`

---

### 3.2 Entité Page
Représente une page logique (home, catégorie, landing, etc.)

Champs :
- `id`
- `slug`
- `type` (HOME | CATEGORY | CUSTOM)
- `isActive`
- `createdAt`
- `updatedAt`

---

### 3.3 Entité PageSection
Représente une section affichée sur une page

Champs :
- `id`
- `pageId`
- `type`
- `order`
- `isActive`
- `data` (JSON)

Exemples de `type` :
- HERO
- PRODUCT_LIST
- CATEGORY_GRID
- PROMO_BANNER
- POPUP

---

### 3.4 Structure JSON des sections

Exemple HERO :
```json
{
  "title": "Achetez local au Bénin",
  "subtitle": "Des vendeurs proches de vous",
  "image": "hero.jpg",
  "ctaText": "Voir les produits",
  "ctaLink": "/categories"
}
```

Exemple PRODUCT_LIST :
```json
{
  "source": "CATEGORY",
  "categoryId": "uuid",
  "limit": 12
}
```

---

## 4. Admin UI Vendure (Extension)

### 4.1 Fonctionnalités MVP
- Créer / modifier une page
- Ajouter des sections prédéfinies
- Réordonner les sections
- Activer / désactiver une section
- Éditer le contenu (JSON assisté par formulaire)

❌ Pas de drag & drop avancé
❌ Pas de création de nouveaux types

---

## 5. API exposée au Frontend

### 5.1 Endpoint conceptuel

`GET /storefront/pages/{slug}`

Réponse :
```json
{
  "slug": "home",
  "sections": [
    {
      "type": "HERO",
      "data": { ... }
    },
    {
      "type": "PRODUCT_LIST",
      "data": { ... }
    }
  ]
}
```

---

## 6. Implémentation Frontend (Next.js)

### 6.1 Section Registry (clé du système)

```ts
const sectionRegistry = {
  HERO: HeroSection,
  PRODUCT_LIST: ProductListSection,
  CATEGORY_GRID: CategoryGridSection,
  PROMO_BANNER: PromoBannerSection,
  POPUP: PopupSection
}
```

---

### 6.2 Rendering générique

```tsx
sections
  .filter(s => s.isActive)
  .sort((a, b) => a.order - b.order)
  .map(section => {
    const Component = sectionRegistry[section.type]
    return Component ? <Component {...section.data} /> : null
  })
```

---

## 7. Gestion des Popups

Backend :
- activation
- période de validité
- contenu

Frontend :
- fréquence d’affichage
- animation
- conditions UX

👉 séparation stricte responsabilité / rendu

---

## 8. Pages Catégories

- Page générée dynamiquement par slug catégorie
- Layout codé
- Sections standards configurables (hero, produits, filtres)

Pas de liberté totale → stabilité garantie

---

## 9. Ce qui est volontairement exclu du MVP

- Drag & drop visuel
- Animations configurables
- Création de layouts custom
- A/B testing

---

## 10. Bénéfices de cette approche

- Évolutif sans refonte
- Compatible multi-frontend
- Rapide à maintenir
- Aligné avec les grosses marketplaces

---

## 11. Évolution post-MVP (plus tard)

- Nouveaux types de sections
- Règles conditionnelles backend
- Pages événementielles
- Personnalisation régionale

---

Ce document sert de **référence d’implémentation** pour le backend ET le frontend dès le MVP.

