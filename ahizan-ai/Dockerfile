# P5-1 : Dockerfile multi-stage production pour Ahizan AI Service.
# Build du backend TypeScript et du frontend Vite dans une étape,
# puis image runtime minimale sans devDependencies ni sources.

# ---- Stage 1 : Build ----
FROM node:22-alpine AS builder
WORKDIR /app

# Copier les package.json et installer TOUTES les deps (dev incluses pour le build)
COPY package.json package-lock.json* ./
COPY web/package.json web/package-lock.json* ./web/
RUN npm install --no-audit --no-fund
RUN cd web && npm install --no-audit --no-fund

# Copier les sources et compiler
COPY tsconfig.json ./
COPY src/ ./src/
RUN npm run build

# Compiler le frontend
COPY web/ ./web/
RUN cd web && npm run build

# ---- Stage 2 : Runtime ----
FROM node:22-alpine AS runtime

# P5-2 : utilisateur non-root
RUN addgroup -S ahizan && adduser -S ahizan -G ahizan
WORKDIR /app

# Installer uniquement les dépendances de production
COPY package.json package-lock.json* ./
RUN npm install --omit=dev --no-audit --no-fund && npm cache clean --force

# Copier les artefacts de build
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/web/dist ./web/dist

# Fichiers de configuration runtime
COPY config/ ./config/

# P5-2 : propriétés non-root
RUN chown -R ahizan:ahizan /app
USER ahizan

EXPOSE 3005

# P5-3 : health check intégré
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3005/api/health').then(r=>r.ok?process.exit(0):process.exit(1)).catch(()=>process.exit(1))"

CMD ["node", "dist/index.js"]
