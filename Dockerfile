FROM node:22-slim

WORKDIR /app

# Non-interactive environment for stable debian package handling
ENV DEBIAN_FRONTEND=noninteractive

# Copy package manifests first for optimal Docker layer caching
COPY package*.json ./

# Install ALL dependencies (including build tools like Vite, Tailwind, TypeScript)
RUN npm install --include=dev

# Copy application source files
COPY . .

# Compile production Vite client bundle (outputs to ./dist)
RUN npm run build

# Set production runtime environment
ENV NODE_ENV=production
ENV PORT=8080

# Clean npm cache to minimize image size
RUN npm cache clean --force

EXPOSE 8080

# Run full-stack engine via tsx
CMD ["npm", "start"]
