# ── Stage 1: Build everything ─────────────────────────────────────────────────
FROM node:22-alpine AS builder
WORKDIR /app

# Build tools required by better-sqlite3 (node-gyp native addon)
RUN apk add --no-cache python3 make g++

COPY . .
RUN npm ci
RUN npm run build:packages
RUN npm run build --workspace @arweb/server
RUN ./node_modules/.bin/vite build

# ── Stage 2: Node sidecar runtime ────────────────────────────────────────────
FROM node:22-alpine AS sidecar
WORKDIR /app

# Runtime lib needed by the compiled better-sqlite3 native addon
RUN apk add --no-cache libstdc++

# Monorepo: workspace symlinks in node_modules point into packages/
COPY --from=builder /app/package.json        ./package.json
COPY --from=builder /app/packages            ./packages
COPY --from=builder /app/server/dist         ./server/dist
COPY --from=builder /app/server/package.json ./server/package.json
COPY --from=builder /app/node_modules        ./node_modules

RUN mkdir -p /app/data

ENV NODE_ENV=production
ENV SIDECAR_HOST=0.0.0.0
ENV SIDECAR_PORT=8787

EXPOSE 8787
CMD ["node", "server/dist/index.js"]

# ── Stage 3: nginx + React build ─────────────────────────────────────────────
FROM nginx:alpine AS frontend
COPY --from=builder /app/dist /usr/share/nginx/html
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
