# Build stage
FROM node:20-slim AS builder

# Install pnpm
RUN npm install -g pnpm

WORKDIR /app

# Copy workspace files
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml* ./
COPY packages/db/package.json ./packages/db/
COPY apps/api/package.json ./apps/api/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY packages/db ./packages/db
COPY apps/api ./apps/api
COPY tsconfig.json ./

# Build the packages
RUN pnpm --filter @ux-testing/db build || true
RUN pnpm --filter @ux-testing/api build

# Production stage
FROM node:20-slim AS runner

# Install pnpm
RUN npm install -g pnpm

WORKDIR /app

# Copy workspace files
COPY pnpm-workspace.yaml package.json ./
COPY packages/db/package.json ./packages/db/
COPY apps/api/package.json ./apps/api/

# Install production dependencies only
RUN pnpm install --prod --frozen-lockfile || pnpm install --prod

# Copy built files
COPY --from=builder /app/packages/db ./packages/db
COPY --from=builder /app/apps/api ./apps/api

# Set environment
ENV NODE_ENV=production
ENV PORT=8080

EXPOSE 8080

# Start the server
CMD ["pnpm", "--filter", "@ux-testing/api", "start"]
