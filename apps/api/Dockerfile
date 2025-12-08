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

# Build the API
RUN pnpm --filter @ux-testing/api build

# Production stage
FROM node:20-slim AS runner

# Install specific pnpm version
RUN npm install -g pnpm@10.24.0

WORKDIR /app

# Copy workspace files
COPY pnpm-workspace.yaml package.json ./
COPY pnpm-lock.yaml* ./
COPY packages/db/package.json ./packages/db/
COPY apps/api/package.json ./apps/api/

# Install ALL dependencies (drizzle-orm etc. are runtime deps)
RUN pnpm install --no-frozen-lockfile

# Copy built files and source (needed for workspace references)
COPY --from=builder /app/packages/db ./packages/db
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/api/package.json ./apps/api/

# Set environment
ENV NODE_ENV=production
ENV PORT=8080

EXPOSE 8080

WORKDIR /app/apps/api

# Start the server
CMD ["node", "dist/index.js"]
