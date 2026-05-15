#!/bin/bash
set -e

echo "🏗️  Build séquentiel des services Ahizan..."
echo ""

# 1. Build et démarrer le backend
echo "📦 Build du backend (Vendure)..."
docker compose build vendure

echo "🚀 Démarrage du backend et de la base de données..."
docker compose up -d vendure db

echo "⏳ Attente du backend (20 secondes)..."
sleep 20

# Vérifier que le backend est prêt
echo "🔍 Vérification du backend..."
docker logs --tail 10 ahizan_backend

# 2. Build le storefront
echo ""
echo "📦 Build du storefront..."
docker compose build storefront

# 3. Build le seller
echo ""
echo "📦 Build du seller..."
docker compose build seller

# 4. Démarrer tous les services
echo ""
echo "🚀 Démarrage de tous les services..."
docker compose up -d

echo ""
echo "✅ Build terminé !"
echo ""
echo "📊 État des conteneurs :"
docker compose ps
