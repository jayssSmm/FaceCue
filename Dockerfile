# syntax=docker/dockerfile:1
ARG PYTHON_VERSION=3.12.3
# ---- Stage 1: build the React frontend ----
FROM node:20-slim AS frontend-build
WORKDIR /app

COPY package.json package-lock.json vite.config.js index.html ./
COPY src ./src
RUN npm ci && npm run build
# vite.config.js -> build.outDir: "templates", emptyOutDir: true
# so this produces /app/templates/index.html + /app/templates/assets/*

# ---- Stage 2: Python backend ----

FROM python:${PYTHON_VERSION}-slim AS base

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    MPLCONFIGDIR=/tmp/matplotlib

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1 \
    libegl1 \
    libgles2 \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender1 \
    libgbm1 \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

ARG UID=10001
RUN adduser \
    --disabled-password \
    --gecos "" \
    --home "/nonexistent" \
    --shell "/sbin/nologin" \
    --no-create-home \
    --uid "${UID}" \
    appuser

RUN --mount=type=cache,target=/root/.cache/pip \
    pip install --upgrade pip && \
    pip install torch torchvision --index-url https://download.pytorch.org/whl/cpu

RUN --mount=type=cache,target=/root/.cache/pip \
    --mount=type=bind,source=requirements.txt,target=requirements.txt \
    pip install -r requirements.txt

COPY . .
COPY --from=frontend-build /app/templates ./templates

USER appuser

EXPOSE 8000
CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000} --workers 1"]