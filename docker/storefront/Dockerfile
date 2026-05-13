FROM node:20-slim AS builder
WORKDIR /app
COPY Storefront/package.json ./
RUN npm install
COPY Storefront/ .

# Variables d'environnement nécessaires au build
ARG VENDURE_SHOP_API_URL=http://ahizan_backend:3000/shop-api
ARG NEXT_PUBLIC_VENDURE_SHOP_API_URL=https://api.ahizan.com/shop-api
ENV VENDURE_SHOP_API_URL=$VENDURE_SHOP_API_URL
ENV NEXT_PUBLIC_VENDURE_SHOP_API_URL=$NEXT_PUBLIC_VENDURE_SHOP_API_URL

RUN npm run build

FROM node:20-slim AS runner
WORKDIR /app
ENV NODE_ENV production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/package.json ./package.json
COPY --from=builder --chown=nextjs:nodejs /app ./

USER nextjs

EXPOSE 3000

CMD ["npm", "start"]
