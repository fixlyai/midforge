FROM node:20-slim

WORKDIR /app

# Copy package manifests
COPY package.json ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/game-server/package.json ./apps/game-server/

# Install ALL dependencies (including devDeps for tsx)
RUN npm install --workspaces --include-workspace-root --ignore-scripts

# Copy source files
COPY packages/shared/ ./packages/shared/
COPY apps/game-server/ ./apps/game-server/
COPY tsconfig.json ./

EXPOSE 2567
CMD ["node", "--import", "tsx", "apps/game-server/src/index.ts"]
