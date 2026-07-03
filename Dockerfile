# syntax=docker/dockerfile:1

# ---- Frontend build ----
FROM node:22-slim AS frontend-builder
WORKDIR /app/frontend
ENV NEXT_TELEMETRY_DISABLED=1

COPY frontend/package.json frontend/package-lock.json ./
RUN --mount=type=cache,target=/root/.npm npm ci

COPY frontend ./
RUN --mount=type=cache,target=/root/.npm npm run build
RUN npm prune --omit=dev

# ---- Backend build ----
FROM python:3.12-slim AS backend-builder
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /usr/local/bin/
WORKDIR /app/backend

COPY backend/pyproject.toml backend/uv.lock ./
RUN --mount=type=cache,target=/root/.cache/uv uv sync --frozen --no-dev

# ---- Runtime image ----
FROM python:3.12-slim

RUN --mount=type=cache,target=/var/cache/apt,sharing=locked \
    --mount=type=cache,target=/var/lib/apt,sharing=locked \
    apt-get update && apt-get install -y --no-install-recommends curl ca-certificates gnupg \
    && curl -fsSL https://deb.nodesource.com/setup_22.x | bash - \
    && apt-get install -y --no-install-recommends nodejs

COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /usr/local/bin/

WORKDIR /app

COPY templates ./templates
COPY catalog.json ./catalog.json

COPY --from=backend-builder /app/backend/.venv ./backend/.venv
COPY backend ./backend

COPY --from=frontend-builder /app/frontend/node_modules ./frontend/node_modules
COPY --from=frontend-builder /app/frontend/.next ./frontend/.next
COPY --from=frontend-builder /app/frontend/public ./frontend/public
COPY frontend/package.json frontend/next.config.ts ./frontend/

COPY scripts/docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

EXPOSE 8000 3000

CMD ["/usr/local/bin/docker-entrypoint.sh"]
