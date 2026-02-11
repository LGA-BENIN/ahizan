FROM node:20-slim AS builder
WORKDIR /app
COPY frontend/package.json ./
RUN npm install
COPY frontend/ .
# Build command (adapter si besoin)
RUN npm run build

FROM node:20-slim AS runner
WORKDIR /app
ENV NODE_ENV production

# Création user non-root
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/package.json ./package.json

# Si utilsation de 'output: standalone' dans next.config.js
# COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
# COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Pour l'instant, copie simple pour démarrage standard (adapter pour prod optimisée)
COPY --from=builder --chown=nextjs:nodejs /app ./

USER nextjs

EXPOSE 3000

CMD ["npm", "start"]
