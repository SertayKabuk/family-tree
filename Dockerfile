# Multi-stage build for Next.js 16 application
FROM node:24-alpine AS base

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Install dependencies only when needed
FROM base AS deps
WORKDIR /app

# Copy package files and Prisma schema needed by postinstall
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY prisma ./prisma
COPY prisma.config.ts ./prisma.config.ts

# Install dependencies
RUN pnpm install --frozen-lockfile

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Set environment variables for build
# Next.js collects anonymous telemetry data about general usage
ENV NEXT_TELEMETRY_DISABLED=1
# Skip env validation during build — real env vars are provided at runtime
ENV NEXT_PHASE=phase-production-build

# Generate Prisma client
RUN pnpm prisma generate

# Build the application
RUN pnpm build

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME/bin:$PATH"

# Install wget for healthcheck
RUN apk add --no-cache wget

# Create a non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Setup pnpm global bin and install prisma CLI for runtime migrations
RUN mkdir -p "$PNPM_HOME/bin" \
 && pnpm config set global-bin-dir "$PNPM_HOME/bin" \
 && pnpm add -g prisma \
 && chown -R nextjs:nodejs "$PNPM_HOME"

# Copy necessary files
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
RUN rm -f ./prisma.config.ts

# Copy prisma schema and config for migrations
COPY --from=builder /app/prisma ./prisma

# Copy startup script
COPY scripts/start.sh ./start.sh
RUN chmod +x ./start.sh

# Create uploads directory with correct permissions
RUN mkdir -p /app/uploads && chown -R nextjs:nodejs /app/uploads

# Set correct permissions
RUN chown -R nextjs:nodejs /app

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["./start.sh"]
