FROM node:20-alpine

WORKDIR /usr/src/app

# Installation des dépendances système nécessaires pour certaines libs natives (sharp, etc.)
RUN apk add --no-cache libc6-compat python3 make g++

# On copie d'abord les fichiers de dépendances pour le cache Docker
COPY backend/package*.json ./

# Installation des dépendances
# Note: On utilise npm ci si le package-lock.json existe, sinon npm install
RUN if [ -f package-lock.json ]; then npm ci; else npm install; fi

# Copie du reste du code source
COPY backend/ .

# Compilation (si TypeScript)
RUN if [ -f tsconfig.json ]; then npm run build; fi

EXPOSE 3000

CMD ["npm", "run", "start:server"]
