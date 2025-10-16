# Multi-stage build for Social Media Agent
# Stage 1: Build React frontend
FROM node:20-alpine AS frontend-builder
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies (including dev dependencies needed for build)
RUN npm install

# Copy frontend source
COPY . .

# Build the frontend
RUN npm run build

# Stage 2: Python backend with static files
FROM python:3.11-slim AS backend

# Set environment variables
ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    libpq-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Create app directory
WORKDIR /app

# Copy backend requirements and install dependencies
COPY server/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend source
COPY server/ .

# Copy built frontend from previous stage
COPY --from=frontend-builder /app/dist ./static

# Create uploads directory
RUN mkdir -p ./public

# Expose port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

# Copy startup script
COPY server/startup.sh ./startup.sh
RUN chmod +x ./startup.sh

# Start command with Reddit auto-setup
CMD ["./startup.sh"]
