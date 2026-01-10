# Build stage
FROM node:20-slim AS builder

# Install specific pnpm version
RUN npm install -g pnpm@10.24.0

WORKDIR /app

# Copy workspace files
COPY pnpm-workspace.yaml package.json ./
COPY pnpm-lock.yaml* ./
COPY packages/db/package.json ./packages/db/
COPY apps/api/package.json ./apps/api/

# Install ALL dependencies (needed for build)
RUN pnpm install --no-frozen-lockfile

# Copy source code
COPY packages/db ./packages/db
COPY apps/api ./apps/api
COPY tsconfig.json ./

# Build packages in order
RUN pnpm --filter @ux-testing/db build
RUN pnpm --filter @ux-testing/api build

# Production stage
FROM node:20-slim AS runner

# Install curl for health checks and pnpm
RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*
RUN npm install -g pnpm@10.24.0

WORKDIR /app

# Copy workspace files
COPY pnpm-workspace.yaml package.json ./
COPY pnpm-lock.yaml* ./
COPY packages/db/package.json ./packages/db/
COPY apps/api/package.json ./apps/api/

# Install ALL dependencies
RUN pnpm install --no-frozen-lockfile

# Copy built files
COPY --from=builder /app/packages/db/dist ./packages/db/dist
COPY --from=builder /app/apps/api/dist ./apps/api/dist

# Set environment
ENV NODE_ENV=production
ENV PORT=8080

EXPOSE 8080

WORKDIR /app/apps/api

# Start the server
CMD ["node", "dist/index.js"]
