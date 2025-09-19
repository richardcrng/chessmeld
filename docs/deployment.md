# Deployment Guide

This guide covers deploying the Chessmeld unified application to various platforms.

## 🚀 Vercel (Recommended)

Vercel is the recommended deployment platform for Next.js applications.

### Prerequisites

- Vercel account
- GitHub repository with the code
- Environment variables configured

### Automatic Deployment

1. **Connect Repository**
   ```bash
   # Install Vercel CLI
   npm i -g vercel
   
   # Login to Vercel
   vercel login
   
   # Deploy from project directory
   cd chessmeld-unified
   vercel
   ```

2. **GitHub Integration**
   - Connect your GitHub repository to Vercel
   - Enable automatic deployments on push to main branch
   - Configure branch protection rules

### Manual Deployment

```bash
# Build the application
pnpm build

# Deploy to Vercel
vercel --prod
```

### Environment Variables

Configure in Vercel dashboard or via CLI:

```bash
# Set environment variables
vercel env add REPLICATE_API_TOKEN
vercel env add WHISPERX_MODEL
vercel env add MAX_FILE_SIZE
```

### Vercel Configuration

The `vercel.json` file is already configured:

```json
{
  "buildCommand": "next build",
  "outputDirectory": ".next",
  "installCommand": "pnpm install",
  "framework": "nextjs"
}
```

## 🐳 Docker Deployment

### Dockerfile

```dockerfile
# Use Node.js 18 Alpine image
FROM node:18-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Install dependencies
COPY package.json pnpm-lock.yaml* ./
RUN corepack enable pnpm && pnpm i --frozen-lockfile

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build the application
RUN corepack enable pnpm && pnpm build

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public

# Set the correct permission for prerender cache
RUN mkdir .next
RUN chown nextjs:nodejs .next

# Automatically leverage output traces to reduce image size
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

CMD ["node", "server.js"]
```

### Docker Compose

```yaml
version: '3.8'

services:
  chessmeld:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - REPLICATE_API_TOKEN=${REPLICATE_API_TOKEN}
    volumes:
      - ./uploads:/app/uploads
    restart: unless-stopped

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - chessmeld
    restart: unless-stopped
```

### Build and Run

```bash
# Build Docker image
docker build -t chessmeld .

# Run container
docker run -p 3000:3000 \
  -e REPLICATE_API_TOKEN=your_token \
  chessmeld

# Or use Docker Compose
docker-compose up -d
```

## ☁️ AWS Deployment

### AWS Amplify

1. **Connect Repository**
   - Go to AWS Amplify Console
   - Connect your GitHub repository
   - Select the main branch

2. **Build Settings**
   ```yaml
   version: 1
   frontend:
     phases:
       preBuild:
         commands:
           - npm install -g pnpm
           - pnpm install
       build:
         commands:
           - pnpm build
     artifacts:
       baseDirectory: .next
       files:
         - '**/*'
     cache:
       paths:
         - node_modules/**/*
         - .next/cache/**/*
   ```

3. **Environment Variables**
   - Set in Amplify Console
   - `REPLICATE_API_TOKEN`
   - `WHISPERX_MODEL`
   - `MAX_FILE_SIZE`

### AWS ECS with Fargate

1. **Create Task Definition**
   ```json
   {
     "family": "chessmeld",
     "networkMode": "awsvpc",
     "requiresCompatibilities": ["FARGATE"],
     "cpu": "256",
     "memory": "512",
     "executionRoleArn": "arn:aws:iam::account:role/ecsTaskExecutionRole",
     "containerDefinitions": [
       {
         "name": "chessmeld",
         "image": "your-account.dkr.ecr.region.amazonaws.com/chessmeld:latest",
         "portMappings": [
           {
             "containerPort": 3000,
             "protocol": "tcp"
           }
         ],
         "environment": [
           {
             "name": "NODE_ENV",
             "value": "production"
           }
         ],
         "secrets": [
           {
             "name": "REPLICATE_API_TOKEN",
             "valueFrom": "arn:aws:secretsmanager:region:account:secret:chessmeld/api-token"
           }
         ],
         "logConfiguration": {
           "logDriver": "awslogs",
           "options": {
             "awslogs-group": "/ecs/chessmeld",
             "awslogs-region": "us-east-1",
             "awslogs-stream-prefix": "ecs"
           }
         }
       }
     ]
   }
   ```

2. **Deploy Service**
   ```bash
   # Create ECS service
   aws ecs create-service \
     --cluster your-cluster \
     --service-name chessmeld \
     --task-definition chessmeld:1 \
     --desired-count 1 \
     --launch-type FARGATE \
     --network-configuration "awsvpcConfiguration={subnets=[subnet-12345],securityGroups=[sg-12345],assignPublicIp=ENABLED}"
   ```

## 🌐 Nginx Configuration

### Production Nginx Config

```nginx
upstream chessmeld {
    server localhost:3000;
}

server {
    listen 80;
    server_name your-domain.com;
    
    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;
    
    # SSL Configuration
    ssl_certificate /etc/nginx/ssl/cert.pem;
    ssl_certificate_key /etc/nginx/ssl/key.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512;
    ssl_prefer_server_ciphers off;
    
    # Security Headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    
    # Gzip Compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;
    
    # Static Files
    location /_next/static/ {
        alias /app/.next/static/;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    location /public/ {
        alias /app/public/;
        expires 1y;
        add_header Cache-Control "public";
    }
    
    # API Routes
    location /api/ {
        proxy_pass http://chessmeld;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # File upload limits
        client_max_body_size 25M;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }
    
    # Main Application
    location / {
        proxy_pass http://chessmeld;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## 🔧 Environment Configuration

### Production Environment Variables

```env
# Application
NODE_ENV=production
PORT=3000
HOSTNAME=0.0.0.0

# API Keys
REPLICATE_API_TOKEN=your_replicate_token
WHISPERX_MODEL=whisperx
WHISPER_MODEL=whisper-1

# File Upload
MAX_FILE_SIZE=26214400
UPLOAD_DIR=/app/uploads

# Rate Limiting
RATE_LIMIT_REQUESTS=10
RATE_LIMIT_WINDOW=60000

# Database (if using)
DATABASE_URL=postgresql://user:password@localhost:5432/chessmeld

# Redis (if using)
REDIS_URL=redis://localhost:6379
```

### Development Environment

```env
# Application
NODE_ENV=development
PORT=3000

# API Keys (optional for development)
REPLICATE_API_TOKEN=your_token_here

# File Upload
MAX_FILE_SIZE=26214400
UPLOAD_DIR=./uploads
```

## 📊 Monitoring and Logging

### Health Checks

```typescript
// Add to your API routes
export async function GET() {
  return Response.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version
  });
}
```

### Logging Configuration

```typescript
// lib/logger.ts
import winston from 'winston';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
  ],
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple()
  }));
}

export default logger;
```

## 🔄 CI/CD Pipeline

### GitHub Actions

```yaml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'pnpm'
      
      - run: npm install -g pnpm
      - run: pnpm install
      - run: pnpm test:run
      - run: pnpm build

  deploy:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'pnpm'
      
      - run: npm install -g pnpm
      - run: pnpm install
      - run: pnpm build
      
      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v20
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.ORG_ID }}
          vercel-project-id: ${{ secrets.PROJECT_ID }}
          vercel-args: '--prod'
```

## 🚨 Troubleshooting

### Common Issues

1. **Build Failures**
   ```bash
   # Clear cache and reinstall
   rm -rf node_modules .next
   pnpm install
   pnpm build
   ```

2. **Memory Issues**
   ```bash
   # Increase Node.js memory limit
   NODE_OPTIONS="--max-old-space-size=4096" pnpm build
   ```

3. **File Upload Issues**
   - Check file size limits
   - Verify upload directory permissions
   - Ensure proper MIME type handling

4. **API Timeout Issues**
   - Increase proxy timeout settings
   - Optimize transcription processing
   - Implement proper error handling

### Performance Optimization

1. **Enable Compression**
   ```javascript
   // next.config.js
   const nextConfig = {
     compress: true,
     poweredByHeader: false,
   };
   ```

2. **Optimize Images**
   ```typescript
   import Image from 'next/image';
   
   <Image
     src="/chess-board.png"
     alt="Chess Board"
     width={400}
     height={400}
     priority
   />
   ```

3. **Bundle Analysis**
   ```bash
   # Analyze bundle size
   pnpm build
   pnpm analyze
   ```

## 📚 Additional Resources

- [Next.js Deployment Documentation](https://nextjs.org/docs/deployment)
- [Vercel Documentation](https://vercel.com/docs)
- [Docker Documentation](https://docs.docker.com/)
- [AWS ECS Documentation](https://docs.aws.amazon.com/ecs/)
