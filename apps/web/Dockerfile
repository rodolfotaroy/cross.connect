FROM node:20-alpine AS base
RUN npm install -g pnpm@9.15.0

# ─── deps: install all workspace dependencies ────────────────────
FROM base AS deps
WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json     ./apps/api/
COPY apps/web/package.json     ./apps/web/
COPY packages/db/package.json  ./packages/db/
COPY packages/types/package.json ./packages/types/

RUN pnpm install --frozen-lockfile

# ─── build: compile the Next.js app ──────────────────────────────
FROM base AS build
WORKDIR /app

# Restore pnpm virtual store and per-workspace symlinks from the deps stage
COPY --from=deps /app/node_modules             ./node_modules
COPY --from=deps /app/apps/api/node_modules    ./apps/api/node_modules/
COPY --from=deps /app/apps/web/node_modules    ./apps/web/node_modules/
COPY --from=deps /app/packages/db/node_modules ./packages/db/node_modules/
COPY --from=deps /app/packages/types/node_modules ./packages/types/node_modules/

# Copy all source code
COPY . .

# next.config.ts has transpilePackages: ['@xc/types'], so Next.js compiles
# @xc/types directly from source — no separate tsc build step needed.
# `next build` also reads NEXT_TELEMETRY_DISABLED to skip telemetry pings.
ENV NEXT_TELEMETRY_DISABLED=1
ENV STANDALONE_BUILD=1

# NEXT_PUBLIC_* variables are inlined into the JS bundle at build time.
# The default points to the host-mapped port so the user's browser can reach
# the API container. Override at build time for other environments.
ARG NEXT_PUBLIC_API_URL=http://localhost:3100
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}

RUN pnpm --filter @xc/web build
# Ensure public/ exists so COPY --from=build never fails on a missing directory.
RUN mkdir -p /app/apps/web/public

# ─── runner: minimal production image ────────────────────────────
# Next.js `output: 'standalone'` produces a self-contained server bundle
# at apps/web/.next/standalone/. It includes a minimal node_modules with
# only the packages needed at runtime — no source, no dev deps.
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# The standalone directory mirrors the monorepo structure:
#   /app/apps/web/server.js          ← entry point
#   /app/apps/web/.next/server/      ← server-side page bundles
#   /app/node_modules/               ← minimal runtime deps
COPY --from=build /app/apps/web/.next/standalone ./

# Static assets (CSS, JS chunks) are NOT included in standalone —
# they must be copied separately into the expected location.
COPY --from=build /app/apps/web/.next/static ./apps/web/.next/static

# Public folder (favicon, images, etc.)
COPY --from=build /app/apps/web/public ./apps/web/public

# Bind to 0.0.0.0 so the container port is reachable from outside.
# Next.js standalone defaults to 127.0.0.1 (localhost-only), which would
# make the container unreachable even with a published port.
ENV HOSTNAME=0.0.0.0
ENV PORT=3000

EXPOSE 3000

CMD ["node", "apps/web/server.js"]
