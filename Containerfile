# syntax=docker/dockerfile:1
# Garap API — image produksi. Build: podman build -t garap-be:latest -f Containerfile .
# Dipakai oleh .github/workflows/deploy.yml (container berjalan dengan --network=host di port PORT, bawaan 3001).

# ---------- build ----------
FROM node:22-bookworm-slim AS build
WORKDIR /app
# openssl: dibutuhkan Prisma. python3/make/g++: cadangan bila bcrypt harus dikompilasi.
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates python3 make g++ \
  && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npx prisma generate && npm run build && npm prune --omit=dev

# ---------- runtime ----------
FROM node:22-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production PORT=3001 UPLOAD_DIR=/app/uploads
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates tini \
  && rm -rf /var/lib/apt/lists/* \
  && mkdir -p /app/uploads && chown node:node /app/uploads
COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/dist ./dist
COPY --from=build --chown=node:node /app/prisma ./prisma
COPY --from=build --chown=node:node /app/prisma.config.ts /app/package.json ./
USER node
EXPOSE 3001
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3001)+'/api/v1/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
# Migrasi dijalankan terpisah sebelum container ini mulai (lihat deploy.yml): npx prisma migrate deploy
# tini meneruskan SIGTERM agar API berhenti dengan rapi.
ENTRYPOINT ["/usr/bin/tini", "--"]
CMD ["node", "dist/main"]
