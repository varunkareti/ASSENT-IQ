ARG BUILD_TIMESTAMP
FROM node:18-alpine AS frontend-builder
WORKDIR /app

# Force fresh npm install by touching package files
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci --no-audit --no-fund 2>&1 || npm install --no-audit 2>&1

COPY frontend/ ./
RUN npm run build

FROM python:3.11-slim
WORKDIR /app

# Install build dependencies for cryptography package
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    libssl-dev \
    libffi-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

COPY backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY backend/ ./backend/
COPY --from=frontend-builder /app/dist ./backend/public
RUN ls -la /app/backend/public/ && head -5 /app/backend/public/index.html

# Set working directory so bare imports (database, routers, etc.) resolve
WORKDIR /app/backend

# Do NOT hardcode PORT - let Railway inject it at runtime
# Expose the default port for local dev
EXPOSE 8000

# Use shell form so $PORT from Railway is expanded
CMD python -m uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}