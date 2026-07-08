FROM node:18-alpine AS frontend-builder
WORKDIR /app

COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci --no-audit --no-fund 2>&1 || npm install --no-audit 2>&1

COPY frontend/ ./
RUN npm run build && echo "Frontend built successfully"

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

# Verify frontend build exists
RUN test -f /app/backend/public/index.html && echo "Frontend build verified" || echo "WARNING: No frontend build"

# Set working directory so bare imports (database, routers, etc.) resolve
WORKDIR /app/backend

EXPOSE 8000

# Use shell form so shell variable expansion works for $PORT
# Railway injects PORT at runtime - shell form expands it
CMD /bin/sh -c "python -m uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}"