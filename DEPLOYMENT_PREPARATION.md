# Deployment Preparation Guide

**Project:** StoneyOneBurn - Multi-Vendor Marketplace  
**Purpose:** Comprehensive guide for preparing and executing deployments  
**Last Updated:** 2024

---

## 🎯 Overview

This document provides a step-by-step guide for preparing your Vendure marketplace for deployment to a hosted environment. It covers pre-deployment checks, environment setup, and post-deployment verification.

---

## 📋 Pre-Deployment Checklist

### Code Quality

- [ ] All tests passing (`npm test`)
- [ ] Code coverage ≥ 80% (`npm run test:coverage`)
- [ ] No linting errors (`npm run lint`)
- [ ] Code properly formatted (`npm run format:check`)
- [ ] TypeScript compiles without errors (`npm run type-check`)
- [ ] No security vulnerabilities (`npm audit`)
- [ ] All environment variables documented

### Database

- [ ] Database migrations tested
- [ ] Migration rollback tested
- [ ] Database backup strategy in place
- [ ] Connection pooling configured
- [ ] Database credentials secure

### Configuration

- [ ] Production environment variables set
- [ ] `APP_ENV=production` configured
- [ ] `synchronize: false` in production
- [ ] Debug modes disabled
- [ ] Logging configured appropriately
- [ ] Email service configured (if using)
- [ ] Payment gateway configured (if using)

### Security

- [ ] All secrets in environment variables (not in code)
- [ ] HTTPS/SSL configured
- [ ] Cookie secrets strong (32+ characters)
- [ ] Passwords meet requirements
- [ ] API keys secured
- [ ] CORS configured correctly
- [ ] Rate limiting configured (if applicable)

### Assets

- [ ] Asset storage configured
- [ ] CDN configured (if using)
- [ ] Asset URL prefix set correctly
- [ ] Image optimization configured

---

## 🚀 Hosting Platform Selection

### Decision Matrix

Consider these factors when choosing a hosting platform:

| Factor | Railway | Render | AWS | DigitalOcean | Vercel |
|--------|---------|--------|-----|--------------|--------|
| **Ease of Setup** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ |
| **Cost (Start)** | $ | $ | $$$ | $$ | $ |
| **Scalability** | ⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ |
| **PostgreSQL** | ✅ Built-in | ✅ Built-in | ✅ Managed | ✅ Managed | ❌ External |
| **CI/CD Integration** | ✅ Excellent | ✅ Good | ⭐ Custom | ⭐ Custom | ✅ Excellent |
| **Free Tier** | ✅ Limited | ✅ Limited | ❌ | ❌ | ✅ Generous |

### Recommended Platforms by Use Case

**For Quick Start / MVP:**
- **Railway** - Easiest setup, good for getting started
- **Render** - Similar to Railway, good free tier

**For Production / Scale:**
- **AWS** - Most scalable, enterprise-grade
- **DigitalOcean** - Good balance of control and ease

**For Serverless / Edge:**
- **Vercel** - Best for frontend, requires external DB

---

## 📦 Deployment Packages

### Package 1: Railway Deployment

**Best for:** Quick setup, automatic deployments

**Setup Steps:**
1. Create Railway account
2. Connect GitHub repository
3. Create new project
4. Add PostgreSQL service
5. Configure environment variables
6. Deploy

**Configuration Files Needed:**
- `railway.json` (optional)
- Environment variables in Railway dashboard

### Package 2: Render Deployment

**Best for:** Free tier, good documentation

**Setup Steps:**
1. Create Render account
2. Create new Web Service
3. Connect GitHub repository
4. Add PostgreSQL database
5. Configure build and start commands
6. Set environment variables
7. Deploy

**Configuration Files Needed:**
- `render.yaml` (optional)
- Environment variables in Render dashboard

### Package 3: AWS Deployment

**Best for:** Enterprise, maximum control

**Setup Steps:**
1. Create AWS account
2. Set up EC2 or ECS
3. Configure RDS PostgreSQL
4. Set up load balancer
5. Configure security groups
6. Set up CI/CD pipeline
7. Deploy

**Configuration Files Needed:**
- `Dockerfile`
- `docker-compose.yml` (optional)
- AWS-specific configuration files

---

## 🔧 Environment Configuration

### Required Environment Variables

```bash
# Application
APP_ENV=production
PORT=3000

# Authentication
SUPERADMIN_USERNAME=your-admin-username
SUPERADMIN_PASSWORD=your-strong-password-min-12-chars
COOKIE_SECRET=your-very-long-cookie-secret-at-least-32-characters

# Database
DB_HOST=your-db-host
DB_PORT=5432
DB_USERNAME=your-db-username
DB_PASSWORD=your-db-password
DB_DATABASE=your-db-name

# Email (if using EmailPlugin)
EMAIL_TRANSPORT=smtp
EMAIL_HOST=smtp.example.com
EMAIL_PORT=587
EMAIL_USER=your-email@example.com
EMAIL_PASSWORD=your-email-password
EMAIL_FROM=noreply@example.com

# Payment Gateway (when implemented)
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_live_...

# Assets
ASSET_URL_PREFIX=https://your-domain.com/assets/
```

### Environment-Specific Configurations

**Development:**
- `APP_ENV=dev`
- `synchronize: true` (auto-create tables)
- Debug modes enabled
- Detailed logging

**Staging:**
- `APP_ENV=staging`
- `synchronize: false` (use migrations)
- Debug modes disabled
- Moderate logging

**Production:**
- `APP_ENV=production`
- `synchronize: false` (use migrations)
- Debug modes disabled
- Minimal logging
- All security features enabled

---

## 🗄️ Database Migration Strategy

### Pre-Deployment

1. **Test Migrations Locally**
   ```bash
   npm run build
   npx vendure migrate
   ```

2. **Verify Migration Files**
   - Check syntax
   - Test rollback
   - Verify data integrity

3. **Create Backup Plan**
   - Document rollback steps
   - Prepare backup script
   - Test backup restoration

### During Deployment

1. **Backup Database**
   ```bash
   pg_dump -h $DB_HOST -U $DB_USERNAME -d $DB_DATABASE > backup.sql
   ```

2. **Run Migrations**
   ```bash
   npx vendure migrate
   ```

3. **Verify Migrations**
   - Check migration status
   - Verify schema changes
   - Test application functionality

### Post-Deployment

1. **Monitor for Issues**
   - Check error logs
   - Monitor database performance
   - Verify data integrity

2. **Rollback if Needed**
   - Stop application
   - Restore database backup
   - Revert code deployment

---

## 🐳 Docker Deployment

### Dockerfile Optimization

```dockerfile
# Multi-stage build for smaller image
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm ci

# Copy source and build
COPY . .
RUN npm run build
RUN npm run build:dashboard

# Production image
FROM node:20-alpine

WORKDIR /app

# Copy package files and install production deps
COPY package*.json ./
RUN npm ci --only=production

# Copy built files
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/dist/dashboard ./dist/dashboard

# Expose port
EXPOSE 3000

# Start application
CMD ["node", "dist/index.js"]
```

### Docker Compose for Production

```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - APP_ENV=production
      - DB_HOST=postgres
      - DB_PORT=5432
    depends_on:
      - postgres
    restart: unless-stopped

  worker:
    build: .
    command: node dist/index-worker.js
    environment:
      - APP_ENV=production
      - DB_HOST=postgres
      - DB_PORT=5432
    depends_on:
      - postgres
    restart: unless-stopped

  postgres:
    image: postgres:16-alpine
    environment:
      - POSTGRES_DB=vendure
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    restart: unless-stopped

volumes:
  postgres_data:
```

---

## 📊 Health Checks

### Health Check Endpoint

Create a simple health check endpoint:

```typescript
// src/health-check.ts (example)
export function healthCheck() {
  return {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  };
}
```

### Monitoring Endpoints

- `/health` - Basic health check
- `/health/db` - Database connection check
- `/health/ready` - Readiness probe
- `/health/live` - Liveness probe

### Health Check Script

```bash
#!/bin/bash
# scripts/health-check.sh

HEALTH_URL="${1:-http://localhost:3000/health}"

response=$(curl -s -o /dev/null -w "%{http_code}" $HEALTH_URL)

if [ $response -eq 200 ]; then
  echo "✅ Health check passed"
  exit 0
else
  echo "❌ Health check failed (HTTP $response)"
  exit 1
fi
```

---

## 🔍 Post-Deployment Verification

### Verification Checklist

- [ ] Application starts successfully
- [ ] Health check endpoint responds
- [ ] Database connection works
- [ ] API endpoints accessible
- [ ] Admin dashboard loads
- [ ] Assets serve correctly
- [ ] Email sending works (if configured)
- [ ] Payment processing works (if configured)
- [ ] Search functionality works
- [ ] No errors in logs

### Smoke Tests

```bash
# Test API
curl https://your-domain.com/admin-api

# Test health
curl https://your-domain.com/health

# Test shop API
curl https://your-domain.com/shop-api
```

### Performance Checks

- [ ] Page load times acceptable
- [ ] API response times < 500ms
- [ ] Database query times reasonable
- [ ] No memory leaks
- [ ] CPU usage normal

---

## 🚨 Rollback Procedures

### Quick Rollback Steps

1. **Stop Current Deployment**
   ```bash
   # Platform-specific command
   ```

2. **Restore Previous Version**
   ```bash
   # Revert to previous Git commit
   git revert HEAD
   ```

3. **Restore Database** (if needed)
   ```bash
   psql -h $DB_HOST -U $DB_USERNAME -d $DB_DATABASE < backup.sql
   ```

4. **Verify Rollback**
   - Check application health
   - Verify functionality
   - Monitor for issues

### Rollback Testing

- Test rollback procedure monthly
- Document rollback steps
- Keep previous versions available
- Maintain database backups

---

## 📈 Monitoring & Alerts

### Key Metrics to Monitor

**Application Metrics:**
- Response times
- Error rates
- Request throughput
- Memory usage
- CPU usage

**Database Metrics:**
- Connection pool usage
- Query performance
- Database size
- Replication lag (if applicable)

**Business Metrics:**
- Active users
- Orders per hour
- Revenue
- Conversion rate

### Alert Thresholds

- **Critical:** Application down, database unavailable
- **Warning:** High error rate (>5%), slow responses (>2s)
- **Info:** Deployment completed, backup successful

---

## 📚 Platform-Specific Guides

### Railway

See: `HOSTING_GUIDE.md` - Railway section

**Quick Start:**
1. Install Railway CLI: `npm i -g @railway/cli`
2. Login: `railway login`
3. Initialize: `railway init`
4. Deploy: `railway up`

### Render

See: `HOSTING_GUIDE.md` - Render section

**Quick Start:**
1. Create account at render.com
2. Connect GitHub repository
3. Create new Web Service
4. Configure and deploy

### AWS

See: `HOSTING_GUIDE.md` - AWS section

**Quick Start:**
1. Set up AWS account
2. Configure IAM roles
3. Set up EC2/ECS
4. Configure RDS
5. Deploy via CI/CD

---

## ✅ Deployment Readiness Checklist

Before deploying to production, ensure:

- [ ] All Phase 0 tasks completed
- [ ] CI/CD pipeline working
- [ ] All tests passing
- [ ] Security configuration verified
- [ ] Environment variables set
- [ ] Database migrations tested
- [ ] Backup strategy in place
- [ ] Monitoring configured
- [ ] Rollback plan documented
- [ ] Team trained on deployment process

---

## 🔄 Continuous Improvement

### Regular Reviews

- **Weekly:** Review deployment logs, optimize slow steps
- **Monthly:** Review deployment process, update documentation
- **Quarterly:** Security audit, infrastructure review

### Optimization Opportunities

- Parallel deployment steps
- Caching strategies
- Build optimization
- Deployment speed improvements

---

## 📞 Support & Resources

### Documentation

- [Vendure Deployment Guide](https://docs.vendure.io/guides/deployment/)
- [CI/CD Plan](./CI_CD_PLAN.md)
- [Hosting Guide](./HOSTING_GUIDE.md)
- [Migration Plan](./HOSTING_MIGRATION_PLAN.md)

### Community

- [Vendure Discord](https://www.vendure.io/community)
- [Vendure GitHub](https://github.com/vendure-ecommerce/vendure)

---

**Note:** This is a living document. Update as deployment processes evolve.

