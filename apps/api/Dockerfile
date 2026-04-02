FROM node:20-alpine AS base
RUN npm install -g pnpm@9.15.0

# ─── deps: install all workspace dependencies ────────────────────
# Copy only package manifests first — this layer is cached and only
# re-runs when a package.json or the lockfile changes, not on source changes.
FROM base AS deps
WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json     ./apps/api/
COPY apps/web/package.json     ./apps/web/
COPY packages/db/package.json  ./packages/db/
COPY packages/types/package.json ./packages/types/

RUN pnpm install --frozen-lockfile

# ─── build: compile all packages and the API ─────────────────────
FROM base AS build
WORKDIR /app

# Restore the pnpm virtual store and per-workspace symlinks from the deps stage
COPY --from=deps /app/node_modules          ./node_modules
COPY --from=deps /app/apps/api/node_modules ./apps/api/node_modules/
COPY --from=deps /app/packages/db/node_modules  ./packages/db/node_modules/
COPY --from=deps /app/packages/types/node_modules ./packages/types/node_modules/

# Copy all source code
COPY . .

# 1. Generate Prisma client -> packages/db/src/generated/client/
RUN pnpm --filter @xc/db db:generate

# 2. Compile shared types -> packages/types/dist/
RUN pnpm --filter @xc/types build

# 3. Compile the NestJS API -> apps/api/dist/
#    rootDir is the repo root, so output lands at apps/api/dist/apps/api/src/...
RUN pnpm --filter @xc/api build

# 4. Create a self-contained production bundle at /deploy.
#    pnpm copies the API package files (including dist/) + all production
#    node_modules, with @xc/db and @xc/types resolved from the local workspace
#    (so their generated/compiled files are included automatically).
RUN pnpm deploy --filter @xc/api --prod /deploy

# ─── runner: minimal production image ───────────────────────────
FROM node:20-alpine AS runner

# Prisma CLI is required at container startup to run `prisma migrate deploy`.
# It is a devDependency of @xc/db so it is not included in the production
# bundle — we install it globally here as a single explicit layer.
RUN npm install -g prisma@6

WORKDIR /app
ENV NODE_ENV=production

# Self-contained deployment from the build stage:
#   /app/dist/              — compiled NestJS application
#   /app/node_modules/      — production deps incl. @xc/db (with generated client)
#                             and @xc/types (with compiled dist/)
COPY --from=build /deploy ./

# Prisma schema is needed by `prisma migrate deploy` at startup.
# By default the CLI looks for ./prisma/schema.prisma relative to CWD.
COPY --from=build /app/packages/db/prisma ./prisma

EXPOSE 3001

# On startup:
#   1. Wait for the database to be reachable, then apply any pending migrations
#   2. Start the NestJS server
#
# The compiled entry is at dist/apps/api/src/main.js because:
#   - nest build ran from apps/api/ with outDir=./dist and rootDir=../../(repo root)
#   - pnpm deploy copied the entire apps/api/ package (including dist/) to /deploy
CMD ["sh", "-c", "until prisma migrate deploy; do echo 'DB not ready, retrying in 3s...'; sleep 3; done && node dist/apps/api/src/main"]
