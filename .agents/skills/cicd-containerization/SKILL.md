---
name: CI/CD & Containerization
description: การตั้งค่า CI/CD Pipeline และ Docker/Container สำหรับ HR-IMS
---

# CI/CD และ Containerization

คู่มือนี้ช่วยให้คุณตั้งค่า Continuous Integration/Continuous Deployment และ Docker สำหรับโปรเจค HR-IMS

## ภาพรวม

- **CI/CD**: GitHub Actions
- **Container**: Docker + Docker Compose
- **Registry**: Docker Hub / GitHub Container Registry

## Docker

### Dockerfile สำหรับ Backend

**ไฟล์:** `backend/Dockerfile`

```dockerfile
# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Build TypeScript
RUN npm run build

# Production stage
FROM node:20-alpine AS production

WORKDIR /app

# Copy built files
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/prisma ./prisma

# Set environment
ENV NODE_ENV=production

EXPOSE 5000

CMD ["node", "dist/index.js"]
```

### Dockerfile สำหรับ Frontend

**ไฟล์:** `frontend/next-app/Dockerfile`

```dockerfile
# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma/

RUN npm ci

COPY . .

# Generate Prisma client
RUN npx prisma generate

# Build Next.js
RUN npm run build

# Production stage
FROM node:20-alpine AS production

WORKDIR /app

ENV NODE_ENV=production

COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

EXPOSE 3000

CMD ["node", "server.js"]
```

### Docker Compose

**ไฟล์:** `docker-compose.yml`

```yaml
version: '3.8'

services:
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    ports:
      - "5000:5000"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=file:./dev.db
    volumes:
      - backend-data:/app/prisma
    depends_on:
      - db

  frontend:
    build:
      context: ./frontend/next-app
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - BACKEND_URL=http://backend:5000
    depends_on:
      - backend

  db:
    image: postgres:15-alpine
    environment:
      POSTGRES_USER: hrims
      POSTGRES_PASSWORD: ${DB_PASSWORD}
      POSTGRES_DB: hrims
    volumes:
      - postgres-data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

volumes:
  backend-data:
  postgres-data:
```

### Docker Commands

```bash
# Build images
docker-compose build

# Start services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down

# Rebuild and restart
docker-compose up -d --build

# Execute command in container
docker-compose exec backend sh
```

## GitHub Actions

### CI Pipeline

**ไฟล์:** `.github/workflows/ci.yml`

```yaml
name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  backend:
    runs-on: ubuntu-latest
    
    defaults:
      run:
        working-directory: ./backend
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
          cache-dependency-path: backend/package-lock.json
      
      - name: Install dependencies
        run: npm ci
      
      - name: Generate Prisma Client
        run: npx prisma generate
      
      - name: Run lint
        run: npm run lint
      
      - name: Run tests
        run: npm test
      
      - name: Build
        run: npm run build

  frontend:
    runs-on: ubuntu-latest
    
    defaults:
      run:
        working-directory: ./frontend/next-app
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
          cache-dependency-path: frontend/next-app/package-lock.json
      
      - name: Install dependencies
        run: npm ci
      
      - name: Generate Prisma Client
        run: npx prisma generate
      
      - name: Run lint
        run: npm run lint
      
      - name: Build
        run: npm run build
```

### CD Pipeline

**ไฟล์:** `.github/workflows/cd.yml`

```yaml
name: CD

on:
  push:
    branches: [main]
    tags: ['v*']

jobs:
  build-and-push:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Login to Docker Hub
        uses: docker/login-action@v3
        with:
          username: ${{ secrets.DOCKER_USERNAME }}
          password: ${{ secrets.DOCKER_TOKEN }}
      
      - name: Build and push Backend
        uses: docker/build-push-action@v5
        with:
          context: ./backend
          push: true
          tags: |
            ${{ secrets.DOCKER_USERNAME }}/hrims-backend:latest
            ${{ secrets.DOCKER_USERNAME }}/hrims-backend:${{ github.sha }}
      
      - name: Build and push Frontend
        uses: docker/build-push-action@v5
        with:
          context: ./frontend/next-app
          push: true
          tags: |
            ${{ secrets.DOCKER_USERNAME }}/hrims-frontend:latest
            ${{ secrets.DOCKER_USERNAME }}/hrims-frontend:${{ github.sha }}

  deploy:
    needs: build-and-push
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    
    steps:
      - name: Deploy to server
        uses: appleboy/ssh-action@v1.0.0
        with:
          host: ${{ secrets.SERVER_HOST }}
          username: ${{ secrets.SERVER_USER }}
          key: ${{ secrets.SERVER_SSH_KEY }}
          script: |
            cd /app/hrims
            docker-compose pull
            docker-compose up -d
```

### GitHub Secrets ที่ต้องตั้งค่า

| Secret | คำอธิบาย |
|--------|----------|
| `DOCKER_USERNAME` | Docker Hub username |
| `DOCKER_TOKEN` | Docker Hub access token |
| `SERVER_HOST` | Production server IP |
| `SERVER_USER` | SSH username |
| `SERVER_SSH_KEY` | SSH private key |
| `DB_PASSWORD` | Database password |

## .dockerignore

**ไฟล์:** `backend/.dockerignore`

```
node_modules
npm-debug.log
.env
.env.local
*.md
.git
.gitignore
dist
coverage
```

**ไฟล์:** `frontend/next-app/.dockerignore`

```
node_modules
npm-debug.log
.env
.env.local
*.md
.git
.gitignore
.next
out
coverage
```

## Environment Variables

### Development

```bash
# backend/.env
NODE_ENV=development
DATABASE_URL=file:./dev.db
PORT=5000

# frontend/next-app/.env.local
NEXT_PUBLIC_API_URL=http://localhost:5000
```

### Production

```bash
# ใช้ Docker secrets หรือ environment variables
NODE_ENV=production
DATABASE_URL=postgresql://user:pass@db:5432/hrims
```

## Multi-Stage Build Benefits

1. **ขนาดเล็ก** - เฉพาะ production files
2. **เร็ว** - cached build layers
3. **ปลอดภัย** - ไม่มี dev dependencies

## แนวปฏิบัติที่ดีที่สุด

1. ✅ ใช้ multi-stage builds
2. ✅ Cache npm dependencies
3. ✅ ใช้ .dockerignore
4. ✅ ตั้งค่า health checks
5. ✅ ใช้ secrets สำหรับข้อมูลลับ
6. ✅ Tag images ด้วย commit SHA
7. ❌ อย่าใส่ secrets ใน Dockerfile
8. ❌ อย่า commit .env files

## อ้างอิงอย่างรวดเร็ว

| Command | คำอธิบาย |
|---------|----------|
| `docker build -t app .` | Build image |
| `docker run -p 3000:3000 app` | Run container |
| `docker-compose up -d` | Start all services |
| `docker-compose down` | Stop all services |
| `docker logs <container>` | View logs |
| `docker exec -it <container> sh` | Shell into container |
