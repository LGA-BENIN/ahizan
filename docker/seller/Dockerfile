FROM node:20-slim
WORKDIR /app

COPY seller/package.json ./
RUN npm install

COPY seller/ .

# Variables d'environnement
ENV VENDURE_SHOP_API_URL=http://ahizan_backend:3000/shop-api
ENV NEXT_PUBLIC_VENDURE_SHOP_API_URL=https://api.ahizan.com/shop-api
ENV NODE_ENV=development

EXPOSE 3000
ENV PORT 3000

# Lancer en mode dev pour éviter les problèmes de prerendering
CMD ["npm", "run", "dev", "--", "--port", "3000"]
