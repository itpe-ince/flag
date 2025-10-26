# Deployment Guide - Flag Guessing Game

This guide provides comprehensive instructions for deploying the Flag Guessing Game application in various environments.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Quick Start](#quick-start)
3. [Environment Configuration](#environment-configuration)
4. [Docker Deployment](#docker-deployment)
5. [Production Deployment](#production-deployment)
6. [Cloud Deployment](#cloud-deployment)
7. [Monitoring and Maintenance](#monitoring-and-maintenance)
8. [Troubleshooting](#troubleshooting)

## Prerequisites

### System Requirements

- **Docker**: Version 20.10 or higher
- **Docker Compose**: Version 2.0 or higher
- **Memory**: Minimum 2GB RAM (4GB recommended for production)
- **Storage**: Minimum 5GB free space
- **Network**: Ports 3500 (frontend) and 3501 (backend) available

### Software Dependencies

- **PostgreSQL**: Version 15 (provided via Docker)
- **Redis**: Version 7 (provided via Docker)
- **Node.js**: Version 18 LTS (for development only)

### Installation

1. **Install Docker**
   ```bash
   # Ubuntu/Debian
   curl -fsSL https://get.docker.com -o get-docker.sh
   sudo sh get-docker.sh
   
   # macOS
   brew install docker
   
   # Windows
   # Download Docker Desktop from https://docker.com
   ```

2. **Install Docker Compose**
   ```bash
   # Linux
   sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
   sudo chmod +x /usr/local/bin/docker-compose
   
   # macOS/Windows
   # Included with Docker Desktop
   ```

3. **Verify Installation**
   ```bash
   docker --version
   docker-compose --version
   ```

## Quick Start

### 1. Clone and Setup

```bash
# Clone the repository
git clone <repository-url>
cd flag-guessing-game

# Copy environment configuration
cp .env.production .env

# Edit environment variables (see Environment Configuration section)
nano .env
```

### 2. Deploy with One Command

```bash
# Deploy everything (builds, starts services, runs migrations, seeds data)
./deploy.sh deploy

# Or deploy with specific environment file
./deploy.sh deploy .env.production
```

### 3. Access Application

- **Frontend**: http://localhost:3500
- **Backend API**: http://localhost:3501/api
- **Health Check**: http://localhost:3501/api/health

## Environment Configuration

### Required Environment Variables

Create a `.env` file based on `.env.production`:

```bash
# Application Configuration
NODE_ENV=production
FRONTEND_URL=https://your-domain.com

# Database Configuration
DB_NAME=flag_guessing_game
DB_USER=postgres
DB_PASSWORD=your-secure-database-password

# Redis Configuration
REDIS_PASSWORD=your-secure-redis-password

# JWT Configuration
JWT_SECRET=your-very-secure-jwt-secret-key-at-least-32-characters-long

# API Configuration
VITE_API_URL=https://your-api-domain.com/api
```

### Security Considerations

1. **Generate Secure Passwords**
   ```bash
   # Generate secure JWT secret
   openssl rand -base64 32
   
   # Generate secure database password
   openssl rand -base64 24
   ```

2. **Environment Variable Security**
   - Never commit `.env` files to version control
   - Use different secrets for each environment
   - Rotate secrets regularly in production

### Environment-Specific Configurations

#### Development
```bash
NODE_ENV=development
FRONTEND_URL=http://localhost:3500
DB_PASSWORD=postgres
JWT_SECRET=dev-secret-key
```

#### Staging
```bash
NODE_ENV=staging
FRONTEND_URL=https://staging.your-domain.com
# Use production-like secrets but separate database
```

#### Production
```bash
NODE_ENV=production
FRONTEND_URL=https://your-domain.com
# Use strong, unique secrets
```

## Docker Deployment

### Architecture Overview

```
┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend       │
│   (Nginx)       │◄──►│   (Node.js)     │
│   Port: 3500    │    │   Port: 3501    │
└─────────────────┘    └─────────────────┘
         │                       │
         └───────────┬───────────┘
                     │
         ┌─────────────────┐    ┌─────────────────┐
         │   PostgreSQL    │    │     Redis       │
         │   Port: 5432    │    │   Port: 6379    │
         └─────────────────┘    └─────────────────┘
```

### Service Configuration

#### Frontend Service
- **Base Image**: nginx:alpine
- **Build**: Multi-stage build with Node.js for compilation
- **Features**: Static file serving, API proxying, gzip compression
- **Health Check**: HTTP GET to /health endpoint

#### Backend Service
- **Base Image**: node:18-alpine
- **Build**: Multi-stage build for production optimization
- **Features**: Express API, WebSocket support, JWT authentication
- **Health Check**: HTTP GET to /api/health endpoint

#### Database Services
- **PostgreSQL**: Persistent data storage with automatic migrations
- **Redis**: Session storage and real-time data caching

### Manual Docker Commands

If you prefer manual control over the deployment process:

```bash
# Build images
docker-compose build

# Start services
docker-compose up -d

# Run migrations
docker-compose run --rm migrate

# Seed data
docker-compose run --rm seed

# Check status
docker-compose ps

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

### Development vs Production

#### Development Mode
```bash
# Use development override
docker-compose -f docker-compose.yml -f docker-compose.override.yml up -d

# Features:
# - Hot reload for both frontend and backend
# - Source code mounted as volumes
# - Exposed database ports for debugging
```

#### Production Mode
```bash
# Use production configuration
docker-compose -f docker-compose.yml up -d

# Features:
# - Optimized builds
# - Security hardening
# - Health checks
# - Restart policies
```

## Production Deployment

### Server Requirements

#### Minimum Specifications
- **CPU**: 2 cores
- **RAM**: 4GB
- **Storage**: 20GB SSD
- **Network**: 100 Mbps

#### Recommended Specifications
- **CPU**: 4 cores
- **RAM**: 8GB
- **Storage**: 50GB SSD
- **Network**: 1 Gbps

### SSL/TLS Configuration

#### Using Let's Encrypt with Nginx

1. **Install Certbot**
   ```bash
   sudo apt-get update
   sudo apt-get install certbot python3-certbot-nginx
   ```

2. **Obtain Certificate**
   ```bash
   sudo certbot --nginx -d your-domain.com
   ```

3. **Update Nginx Configuration**
   ```nginx
   server {
       listen 443 ssl http2;
       server_name your-domain.com;
       
       ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
       ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;
       
       # SSL configuration
       ssl_protocols TLSv1.2 TLSv1.3;
       ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512;
       ssl_prefer_server_ciphers off;
       
       # ... rest of configuration
   }
   ```

#### Using Custom SSL Certificates

1. **Place Certificates**
   ```bash
   mkdir -p ./ssl
   cp your-cert.pem ./ssl/
   cp your-key.pem ./ssl/
   ```

2. **Update Docker Compose**
   ```yaml
   frontend:
     volumes:
       - ./ssl:/etc/ssl/certs:ro
   ```

### Reverse Proxy Configuration

#### Nginx Reverse Proxy

```nginx
upstream flag-game-frontend {
    server localhost:3500;
}

upstream flag-game-backend {
    server localhost:3501;
}

server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;
    
    # SSL configuration here
    
    location / {
        proxy_pass http://flag-game-frontend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    location /api/ {
        proxy_pass http://flag-game-backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    location /socket.io/ {
        proxy_pass http://flag-game-backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
    }
}
```

### Database Configuration

#### Production PostgreSQL Settings

```sql
-- Optimize for production
ALTER SYSTEM SET shared_buffers = '256MB';
ALTER SYSTEM SET effective_cache_size = '1GB';
ALTER SYSTEM SET maintenance_work_mem = '64MB';
ALTER SYSTEM SET checkpoint_completion_target = 0.9;
ALTER SYSTEM SET wal_buffers = '16MB';
ALTER SYSTEM SET default_statistics_target = 100;
SELECT pg_reload_conf();
```

#### Backup Strategy

```bash
# Daily backup script
#!/bin/bash
BACKUP_DIR="/backups/$(date +%Y%m%d)"
mkdir -p "$BACKUP_DIR"

# Database backup
docker-compose exec -T postgres pg_dump -U postgres flag_guessing_game | gzip > "$BACKUP_DIR/database.sql.gz"

# Redis backup
docker-compose exec -T redis redis-cli BGSAVE
docker cp "$(docker-compose ps -q redis):/data/dump.rdb" "$BACKUP_DIR/redis.rdb"

# Cleanup old backups (keep 30 days)
find /backups -type d -mtime +30 -exec rm -rf {} \;
```

## Cloud Deployment

### AWS Deployment

#### Using AWS ECS

1. **Create Task Definition**
   ```json
   {
     "family": "flag-guessing-game",
     "networkMode": "awsvpc",
     "requiresCompatibilities": ["FARGATE"],
     "cpu": "512",
     "memory": "1024",
     "containerDefinitions": [
       {
         "name": "frontend",
         "image": "your-registry/flag-game-frontend:latest",
         "portMappings": [{"containerPort": 3500}]
       },
       {
         "name": "backend",
         "image": "your-registry/flag-game-backend:latest",
         "portMappings": [{"containerPort": 3501}]
       }
     ]
   }
   ```

2. **Create Service**
   ```bash
   aws ecs create-service \
     --cluster flag-game-cluster \
     --service-name flag-game-service \
     --task-definition flag-guessing-game \
     --desired-count 2
   ```

#### Using AWS RDS and ElastiCache

```bash
# Environment variables for AWS services
DB_HOST=flag-game.cluster-xyz.us-east-1.rds.amazonaws.com
REDIS_URL=redis://flag-game.abc123.cache.amazonaws.com:6379
```

### Google Cloud Platform

#### Using Cloud Run

```yaml
# cloudrun.yaml
apiVersion: serving.knative.dev/v1
kind: Service
metadata:
  name: flag-guessing-game
spec:
  template:
    metadata:
      annotations:
        autoscaling.knative.dev/maxScale: "10"
    spec:
      containers:
      - image: gcr.io/your-project/flag-game:latest
        ports:
        - containerPort: 3500
        env:
        - name: NODE_ENV
          value: "production"
```

### Digital Ocean

#### Using App Platform

```yaml
# .do/app.yaml
name: flag-guessing-game
services:
- name: frontend
  source_dir: /frontend
  github:
    repo: your-username/flag-guessing-game
    branch: main
  run_command: npm start
  environment_slug: node-js
  instance_count: 1
  instance_size_slug: basic-xxs
  
- name: backend
  source_dir: /backend
  github:
    repo: your-username/flag-guessing-game
    branch: main
  run_command: npm start
  environment_slug: node-js
  instance_count: 1
  instance_size_slug: basic-xxs
  
databases:
- name: postgres
  engine: PG
  version: "15"
  
- name: redis
  engine: REDIS
  version: "7"
```

## Monitoring and Maintenance

### Health Monitoring

#### Application Health Checks

```bash
# Check all services
./deploy.sh health

# Check specific service
curl http://localhost:3501/api/health
curl http://localhost:3500/health
```

#### Monitoring Script

```bash
#!/bin/bash
# monitor.sh - Simple monitoring script

check_service() {
    local service=$1
    local url=$2
    
    if curl -f -s "$url" > /dev/null; then
        echo "✓ $service is healthy"
        return 0
    else
        echo "✗ $service is down"
        return 1
    fi
}

# Check services
check_service "Frontend" "http://localhost:3500/health"
check_service "Backend" "http://localhost:3501/api/health"

# Check Docker containers
docker-compose ps
```

### Log Management

#### Centralized Logging

```yaml
# Add to docker-compose.yml
services:
  backend:
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
```

#### Log Rotation

```bash
# Setup logrotate
sudo tee /etc/logrotate.d/flag-game << EOF
/var/lib/docker/containers/*/*.log {
    daily
    rotate 7
    compress
    delaycompress
    missingok
    notifempty
    create 0644 root root
}
EOF
```

### Performance Monitoring

#### Resource Usage

```bash
# Monitor resource usage
docker stats

# Monitor specific container
docker stats flag-game-backend
```

#### Database Performance

```sql
-- Monitor slow queries
SELECT query, mean_time, calls 
FROM pg_stat_statements 
ORDER BY mean_time DESC 
LIMIT 10;

-- Monitor connections
SELECT count(*) as connections 
FROM pg_stat_activity;
```

### Backup and Recovery

#### Automated Backup

```bash
# Add to crontab
0 2 * * * /path/to/flag-guessing-game/deploy.sh backup
```

#### Recovery Process

```bash
# Stop services
./deploy.sh stop

# Restore from backup
./deploy.sh restore ./backups/20231201_120000

# Start services
./deploy.sh start
```

## Troubleshooting

### Common Issues

#### Service Won't Start

```bash
# Check logs
./deploy.sh logs

# Check specific service
./deploy.sh logs backend

# Check Docker daemon
sudo systemctl status docker
```

#### Database Connection Issues

```bash
# Check database container
docker-compose exec postgres pg_isready -U postgres

# Check connection from backend
docker-compose exec backend npm run migrate
```

#### Memory Issues

```bash
# Check memory usage
free -h
docker stats

# Increase swap if needed
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
```

#### Port Conflicts

```bash
# Check what's using ports
sudo netstat -tulpn | grep :3500
sudo netstat -tulpn | grep :3501

# Kill conflicting processes
sudo kill -9 <PID>
```

### Performance Issues

#### Slow Database Queries

```sql
-- Enable query logging
ALTER SYSTEM SET log_statement = 'all';
ALTER SYSTEM SET log_min_duration_statement = 1000;
SELECT pg_reload_conf();
```

#### High Memory Usage

```bash
# Optimize Docker
docker system prune -f

# Limit container memory
docker-compose up -d --memory=512m backend
```

### Security Issues

#### SSL Certificate Problems

```bash
# Check certificate validity
openssl x509 -in /path/to/cert.pem -text -noout

# Renew Let's Encrypt certificate
sudo certbot renew
```

#### Database Security

```sql
-- Change default passwords
ALTER USER postgres PASSWORD 'new-secure-password';

-- Limit connections
ALTER SYSTEM SET max_connections = 100;
```

### Getting Help

1. **Check Logs**: Always start with service logs
2. **Verify Configuration**: Ensure environment variables are correct
3. **Test Components**: Test each service individually
4. **Check Resources**: Monitor CPU, memory, and disk usage
5. **Community Support**: Check GitHub issues and documentation

---

## Quick Reference

### Deployment Commands

```bash
# Full deployment
./deploy.sh deploy .env.production

# Start services
./deploy.sh start

# Stop services
./deploy.sh stop

# Check status
./deploy.sh status

# View logs
./deploy.sh logs

# Create backup
./deploy.sh backup

# Clean up
./deploy.sh cleanup
```

### Service URLs

- **Frontend**: http://localhost:3500
- **Backend API**: http://localhost:3501/api
- **Health Check**: http://localhost:3501/api/health
- **Database**: localhost:5432 (if exposed)
- **Redis**: localhost:6379 (if exposed)

### Important Files

- `docker-compose.yml` - Main service configuration
- `.env` - Environment variables
- `deploy.sh` - Deployment script
- `DEPLOYMENT.md` - This documentation
- `backend/Dockerfile` - Backend container configuration
- `frontend/Dockerfile` - Frontend container configuration