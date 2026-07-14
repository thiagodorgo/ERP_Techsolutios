# syntax=docker/dockerfile:1
# Ω-INFRA-1 — frontend React/Vite servido como ESTÁTICO por nginx (cache/gzip nativos, desacoplado do backend).

# ---- builder: compila o bundle Vite ----
FROM node:20-bookworm-slim AS builder
WORKDIR /app
# Config de build do Vite (inlined no bundle). API relativa (/api/v1) → mesmo host, nginx faz o proxy.
ARG VITE_API_BASE_URL=/api/v1
ARG VITE_USE_MOCKS=false
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
ENV VITE_USE_MOCKS=$VITE_USE_MOCKS
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

# ---- runtime: nginx servindo o estático + proxy de /api ----
FROM nginx:1.27-alpine AS runtime
# Upstream do proxy configurável por env (envsubst nativo do entrypoint em /etc/nginx/templates).
ENV API_UPSTREAM=http://api:3000
COPY nginx.conf.template /etc/nginx/templates/default.conf.template
COPY --from=builder /app/dist /usr/share/nginx/html
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=4s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1:8080/ >/dev/null 2>&1 || exit 1
