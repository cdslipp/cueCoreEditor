# Build stage - use Bun for fast dependency installation and building
FROM oven/bun:1-alpine AS builder

WORKDIR /app

# Copy package files
COPY package.json bun.lock ./

# Install dependencies with Bun (much faster than npm/yarn)
RUN bun install --frozen-lockfile

# Copy source code
COPY . .

# Build the SvelteKit app
RUN bun run build

# Production stage - use Node for running (adapter-node compatibility)
FROM node:22-alpine AS runner

WORKDIR /app

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 sveltekit

# Copy built application from builder
COPY --from=builder --chown=sveltekit:nodejs /app/build ./build
COPY --from=builder --chown=sveltekit:nodejs /app/package.json ./

# Install only production dependencies (if any runtime deps exist)
# For adapter-node, the build is self-contained, but we keep this for safety
ENV NODE_ENV=production

USER sveltekit

EXPOSE 3000

# adapter-node serves from build/index.js
CMD ["node", "build"]
