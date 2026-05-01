# ─── Stage 1: Build ──────────────────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci --frozen-lockfile

COPY . .
RUN node ace build

# ─── Stage 2: Production ─────────────────────────────────────────────────────
FROM node:20-alpine AS production
WORKDIR /app

ENV NODE_ENV=production

COPY package*.json ./
RUN npm ci --frozen-lockfile --omit=dev

COPY --from=builder /app/build .

EXPOSE 3333

CMD ["node", "bin/server.js"]
