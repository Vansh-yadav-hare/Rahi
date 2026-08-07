# Base image
FROM node:20-alpine AS base
WORKDIR /app
COPY package*.json ./

# Production dependencies
FROM base AS prod-deps
RUN npm ci --only=production

# Development dependencies for building/linting/testing
FROM base AS dev-deps
RUN npm ci

# Run tests and linter
FROM dev-deps AS test
COPY . .
RUN npm run lint

# Production runtime stage
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=prod-deps /app/node_modules ./node_modules
COPY package*.json ./
COPY src/ ./src/

EXPOSE 5000
CMD ["npm", "start"]
