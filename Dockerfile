# Multi-stage Dockerfile for BenchOS Web (Vertra Cloud compatible)
# Note: Vertra Cloud mounts /app as a persistent volume and requires non-root UID 1000:1000.
# All runtime artifacts therefore live under /opt/benchos-web.

FROM node:22-alpine AS deps
WORKDIR /build
COPY package.json package-lock.json ./
RUN npm ci

FROM node:22-alpine AS builder
WORKDIR /build
COPY --from=deps /build/node_modules ./node_modules
COPY . .

ARG NEXT_PUBLIC_TRACKING_BASE_URL=https://api.benchos.app.br/track
ARG NEXT_PUBLIC_APP_NAME=BenchOS
ENV NEXT_PUBLIC_TRACKING_BASE_URL=${NEXT_PUBLIC_TRACKING_BASE_URL}
ENV NEXT_PUBLIC_APP_NAME=${NEXT_PUBLIC_APP_NAME}
ENV NEXT_TELEMETRY_DISABLED=1

RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /opt/benchos-web

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV HOSTNAME=0.0.0.0
ENV PORT=3000

COPY --from=builder --chown=1000:1000 /build/.next/standalone ./
COPY --from=builder --chown=1000:1000 /build/.next/static ./.next/static
COPY --from=builder --chown=1000:1000 /build/public ./public

USER 1000:1000

EXPOSE 3000

CMD ["node", "server.js"]
