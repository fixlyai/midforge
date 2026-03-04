FROM node:20-slim

WORKDIR /app

# Copy root package files
COPY package.json ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/game-server/package.json ./apps/game-server/

# Install all dependencies
RUN npm install --workspaces --include-workspace-root

# Copy source
COPY packages/shared/ ./packages/shared/
COPY apps/game-server/ ./apps/game-server/
COPY tsconfig.json ./

# Build and start
EXPOSE 2567
CMD ["npx", "tsx", "apps/game-server/src/index.ts"]
