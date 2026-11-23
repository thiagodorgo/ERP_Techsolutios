# syntax=docker/dockerfile:1
# Ω-INFRA-1 — imagem do backend (Node 20 + TS + Prisma). Multi-stage, runtime slim, usuário não-root.

# ---- builder: compila TS e gera o Prisma Client ----
FROM node:20-bookworm-slim AS builder
WORKDIR /app
ENV NODE_ENV=development
# Prisma 7 detecta a versão do OpenSSL pelo binário (para o engine de migrate).
RUN apt-get update -y && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
RUN npm ci
# prisma.config.ts (Prisma 7) carrega o datasource url via env — necessário p/ migrate deploy (runtime).
COPY prisma.config.ts ./
COPY prisma ./prisma
# `generate` NÃO conecta ao banco, mas prisma.config.ts exige a env resolvível → dummy só no build.
# O `migrate deploy` (runtime) usa a DATABASE_URL real injetada pelo ambiente.
RUN DATABASE_URL="postgresql://build:build@localhost:5432/build?schema=public" npx prisma generate
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# ---- runtime: só deps de produção + client Prisma gerado + dist ----
FROM node:20-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
# Metadados de build (SEM segredo) expostos pelo /health. Injetados pelo CI (--build-arg).
ARG APP_VERSION=0.0.0
ARG GIT_COMMIT=unknown
ENV APP_VERSION=$APP_VERSION
ENV GIT_COMMIT=$GIT_COMMIT
ENV PORT=3000

COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force
# Prisma Client gerado (com engine) vem do builder — evita reinstalar a CLI no runtime.
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma

# B-INFRA-RDS-CA — o driver pg trata sslmode=require como verify-full, e o Node não conhece a
# autoridade certificadora do RDS: sem isto a API recusa a conexão ao banco no boot. O pacote
# público do RDS (todas as regiões, docker/certs/) entra na imagem e o Node passa a confiar nele,
# sem desligar a verificação. A DATABASE_URL de produção usa sslmode=verify-full com o host real.
COPY docker/certs/rds-global-bundle.pem /etc/ssl/certs/rds-global-bundle.pem
ENV NODE_EXTRA_CA_CERTS=/etc/ssl/certs/rds-global-bundle.pem

# Usuário não-root (o node:20 já traz o user `node`).
USER node
EXPOSE 3000

# Healthcheck = readiness real (ping Postgres+Redis). fetch é global no Node 20.
HEALTHCHECK --interval=30s --timeout=5s --start-period=25s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/api/v1/health/ready').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "dist/server.js"]
