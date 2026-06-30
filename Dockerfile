# Stage 1: Build frontend
FROM node:20-alpine AS frontend-build

WORKDIR /app

# Bypass SSL certificate issues in Docker build env
RUN npm config set strict-ssl false

COPY frontend/package.json ./
RUN npm install --prefer-offline --no-audit --no-fund

COPY frontend/ ./
RUN npm run build

# Stage 2: Backend runtime
FROM python:3.11-slim

WORKDIR /app

# Configure pip with timeout and mirror
RUN pip config set global.timeout 120 && \
    pip config set global.index-url https://mirrors.aliyun.com/pypi/simple/

# Install backend dependencies
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend source
COPY backend/ .

# Copy built frontend from stage 1
COPY --from=frontend-build /app/dist /app/static

# Expose port
EXPOSE 5000

# Run backend
CMD ["python", "app.py"]
