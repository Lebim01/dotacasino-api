# syntax=docker/dockerfile:1.7
ARG APP=client-api

FROM node:20-alpine AS base
WORKDIR /app
RUN corepack enable && apk add --no-cache openssl libc6-compat
# ↑ Prisma en Alpine necesita openssl y (a veces) libc6-compat

FROM base AS deps
# Copia mínima para aprovechar caché
COPY package.json yarn.lock nest-cli.json tsconfig*.json ./
COPY apps ./apps
COPY libs ./libs
RUN yarn install --frozen-lockfile
# Generar Prisma (usa schema dentro de libs/db)
RUN yarn prisma generate --schema=libs/db/schema.prisma

FROM deps AS build
# Permite seleccionar el app a compilar
ARG APP
RUN yarn nest build ${APP}

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production TZ=America/Mexico_City
RUN apk add --no-cache openssl libc6-compat

# Solo lo necesario para producción
COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist

# Variables de puertos por si las usas en cada app
ENV PORT_CLIENT=3001 PORT_ADMIN=3002 PORT_WORKERS=3003

# Propaga APP para el CMD (puedes sobreescribir con -e APP=...)
ARG APP
ENV APP=${APP}

# Opcional: HEALTHCHECK (ajusta la ruta)
# HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- http://127.0.0.1:${PORT_CLIENT}/health || exit 1

ENTRYPOINT ["npx", "prisma", "migrate", "deploy"]

CMD ["sh","-lc","node dist/apps/${APP}/apps/${APP}/src/main.js"]
