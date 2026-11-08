# syntax=docker/dockerfile:1

FROM node:22-bookworm-slim AS base
RUN npm install -g pnpm@10.34.7
WORKDIR /app

# --- Build -------------------------------------------------------------------
FROM base AS build
# Toolchain for better-sqlite3 in case no prebuilt binary matches.
RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/*

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
RUN pnpm install --frozen-lockfile

COPY . .

# The .env is mounted as a BuildKit secret: Vite inlines only VITE_* vars into
# the client bundle, and the file itself never lands in an image layer.
RUN --mount=type=secret,id=env,target=/app/.env \
  pnpm build \
  && pnpm prune --prod --ignore-scripts

# --- Runtime -----------------------------------------------------------------
FROM node:22-bookworm-slim AS runtime
ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=3000 \
    DATABASE_URL=/data/app.db
WORKDIR /app

# Prod node_modules are only needed by scripts/migrate.mjs; the server bundle
# in .output carries its own traced dependencies.
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/.output ./.output
COPY --from=build /app/drizzle ./drizzle
COPY --from=build /app/scripts/migrate.mjs ./scripts/migrate.mjs
COPY package.json ./

RUN mkdir -p /data && chown node:node /data
USER node
VOLUME ["/data"]
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["sh", "-c", "node scripts/migrate.mjs && exec node .output/server/index.mjs"]
