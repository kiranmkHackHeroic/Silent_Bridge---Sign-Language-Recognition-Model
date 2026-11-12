# Production Dockerfile for Silent Bridge (Node.js 20)
FROM node:20-slim

# Install procps and curl for healthchecks
RUN apt-get update && apt-get install -y --no-install-recommends procps curl && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy dependency manifests
COPY package*.json ./
COPY scripts/copy-mediapipe-wasm.mjs ./scripts/

# Install all dependencies (including devDependencies required for vite build and tsx runtime)
RUN npm install

# Copy application source
COPY . .

# Build Vite frontend and production bundles into dist/
RUN npm run build

# Environment settings
ENV NODE_ENV=production
ENV PORT=3000

# Expose port (Cloud Run sets PORT dynamically)
EXPOSE 3000

# Start production server
CMD ["npm", "start"]
