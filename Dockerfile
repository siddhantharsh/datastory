# syntax=docker/dockerfile:1

# ---- Stage 1: build the React client ----
FROM node:22-bookworm-slim AS client-build
WORKDIR /app/client
COPY client/package*.json ./
RUN npm ci
COPY client/ ./
RUN npm run build

# ---- Stage 2: install server production dependencies ----
# better-sqlite3 has no matching prebuilt binary here, so it compiles from
# source via node-gyp — these build tools are only needed in this discarded
# stage, not the final runtime image.
FROM node:22-bookworm-slim AS server-deps
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app/server
COPY server/package*.json ./
RUN npm ci --omit=dev

# ---- Stage 3: runtime ----
FROM node:22-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production
ENV DATA_DIR=/app/data

RUN mkdir -p /app/data \
    && useradd --system --create-home --shell /usr/sbin/nologin appuser \
    && chown -R appuser:appuser /app

COPY --chown=appuser:appuser server/ ./server/
COPY --from=server-deps --chown=appuser:appuser /app/server/node_modules ./server/node_modules
COPY --chown=appuser:appuser sample-datasets/ ./sample-datasets/
COPY --from=client-build --chown=appuser:appuser /app/client/dist ./client/dist

USER appuser
EXPOSE 3001
CMD ["node", "server/index.js"]
