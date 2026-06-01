# syntax=docker/dockerfile:1

# --- Builder: install deps (incl. native better-sqlite3) and compile TS ---
FROM node:24-bookworm-slim AS builder
WORKDIR /app

# Toolchain for native modules (better-sqlite3 prebuild fallback -> node-gyp).
RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ ca-certificates \
  && rm -rf /var/lib/apt/lists/*

RUN corepack enable

# Install dependencies first (better layer caching).
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
# pnpm-workspace.yaml carries `allowBuilds: better-sqlite3: true`, so the native
# binding is built during install in a non-interactive environment.
RUN pnpm install --frozen-lockfile

# Compile TypeScript.
COPY tsconfig.json ./
COPY src ./src
RUN pnpm build

# Strip dev dependencies for the runtime image.
RUN pnpm prune --prod

# --- Runtime: minimal image with compiled JS + production deps ---
FROM node:24-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production

# Copy production node_modules (with the compiled native binding) and dist.
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY package.json ./

# Persistent data lives here (DB, signing key, archive). Mount a volume.
RUN mkdir -p /app/data && chown -R node:node /app
VOLUME ["/app/data"]

ENV PORT=8787 \
    DB_PATH=/app/data/signatures.db \
    SIGNING_KEY_PATH=/app/data/signing-key.pem \
    ARCHIVE_DIR=/app/data/archive

USER node
EXPOSE 8787

# Liveness probe hits the unauthenticated /health endpoint.
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||8787)+'/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "dist/index.js"]
