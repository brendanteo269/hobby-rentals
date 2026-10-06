# Stage 1: Install dependencies
FROM node:20-slim AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

# Stage 2: Build Next.js
FROM node:20-slim AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1

# Supply placeholder values so static prerendering succeeds during build
ENV NEXT_PUBLIC_SUPABASE_URL="https://placeholder.supabase.co"
ENV NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY="placeholder-key"

RUN npm run build

# Stage 3: Production runtime
FROM node:20-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]