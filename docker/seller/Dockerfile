FROM node:20-alpine AS builder
WORKDIR /app
COPY seller/package*.json ./
RUN npm install --legacy-peer-deps
COPY seller/ .
# Inject ENV variables for build if needed
ARG VENDURE_SHOP_API_URL=http://ahizan_backend:3000/shop-api
ARG NEXT_PUBLIC_VENDURE_SHOP_API_URL=https://api.ahizan.com/shop-api
ENV VENDURE_SHOP_API_URL=$VENDURE_SHOP_API_URL
ENV NEXT_PUBLIC_VENDURE_SHOP_API_URL=$NEXT_PUBLIC_VENDURE_SHOP_API_URL
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/next.config.ts ./

EXPOSE 3000
CMD ["npm", "start"]
