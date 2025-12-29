# Hosting Guide

**Project:** StoneyOneBurn - Multi-Vendor Marketplace  
**Last Updated:** 2024

---

## 🎯 Overview

This guide provides detailed information about hosting options for the Vendure marketplace, including setup instructions, pros/cons, and migration strategies for each platform.

---

## 📋 Hosting Requirements

### Minimum Requirements

- **Node.js:** 18.x or 20.x (LTS)
- **Database:** PostgreSQL 12+ (recommended 16+)
- **Memory:** 512MB minimum, 1GB+ recommended
- **Storage:** 10GB+ for assets and database
- **Bandwidth:** Sufficient for expected traffic

### Recommended Requirements

- **Node.js:** 20.x LTS
- **Database:** PostgreSQL 16 with connection pooling
- **Memory:** 2GB+ for production
- **Storage:** 50GB+ with automatic backups
- **CDN:** For asset delivery
- **SSL/HTTPS:** Required for production
- **Monitoring:** Application and infrastructure monitoring

---

## 🚀 Hosting Options Comparison

### Option 1: Railway

**Best for:** Quick setup, easy deployments, good for startups

#### Pros
- ✅ Very easy setup and deployment
- ✅ Automatic HTTPS/SSL
- ✅ Built-in PostgreSQL database
- ✅ Automatic deployments from GitHub
- ✅ Free tier available
- ✅ Simple pricing model
- ✅ Good documentation

#### Cons
- ⚠️ Less control over infrastructure
- ⚠️ Can be expensive at scale
- ⚠️ Limited customization options

#### Pricing
- **Hobby:** $5/month (512MB RAM, 1GB storage)
- **Pro:** $20/month (2GB RAM, 10GB storage)
- **Team:** Custom pricing

#### Setup Steps
1. Sign up at [railway.app](https://railway.app)
2. Create new project
3. Connect GitHub repository
4. Add PostgreSQL service
5. Configure environment variables
6. Deploy

**Documentation:** [Railway Docs](https://docs.railway.app)

---

### Option 2: Render

**Best for:** Balanced features, good developer experience

#### Pros
- ✅ Free tier available
- ✅ Automatic SSL
- ✅ Built-in PostgreSQL
- ✅ GitHub integration
- ✅ Docker support
- ✅ Good for small to medium projects

#### Cons
- ⚠️ Free tier has limitations (spins down after inactivity)
- ⚠️ Can be slower on free tier
- ⚠️ Limited customization

#### Pricing
- **Free:** Limited resources, spins down
- **Starter:** $7/month (512MB RAM)
- **Standard:** $25/month (2GB RAM)

#### Setup Steps
1. Sign up at [render.com](https://render.com)
2. Create new Web Service
3. Connect GitHub repository
4. Add PostgreSQL database
5. Configure build and start commands
6. Set environment variables
7. Deploy

**Documentation:** [Render Docs](https://render.com/docs)

---

### Option 3: DigitalOcean App Platform

**Best for:** More control, scalable, good pricing

#### Pros
- ✅ Good pricing for resources
- ✅ Automatic SSL
- ✅ Built-in PostgreSQL
- ✅ GitHub integration
- ✅ Good documentation
- ✅ Scalable

#### Cons
- ⚠️ Slightly more complex setup
- ⚠️ Requires more configuration

#### Pricing
- **Basic:** $5/month (512MB RAM)
- **Professional:** $12/month (1GB RAM)
- **Database:** $15/month (1GB RAM, 10GB storage)

#### Setup Steps
1. Sign up at [digitalocean.com](https://digitalocean.com)
2. Create App Platform app
3. Connect GitHub repository
4. Add PostgreSQL database component
5. Configure environment variables
6. Set up build and run commands
7. Deploy

**Documentation:** [DigitalOcean App Platform Docs](https://docs.digitalocean.com/products/app-platform/)

---

### Option 4: AWS (Elastic Beanstalk / ECS)

**Best for:** Enterprise, maximum control, scalability

#### Pros
- ✅ Maximum control and flexibility
- ✅ Highly scalable
- ✅ Enterprise-grade infrastructure
- ✅ Many services available
- ✅ Global CDN (CloudFront)

#### Cons
- ⚠️ Complex setup
- ⚠️ Steeper learning curve
- ⚠️ Can be expensive
- ⚠️ Requires AWS knowledge

#### Pricing
- **Varies:** Pay for what you use
- **Estimated:** $30-100/month for small to medium traffic

#### Setup Steps
1. Create AWS account
2. Set up Elastic Beanstalk or ECS
3. Configure RDS PostgreSQL
4. Set up CloudFront for CDN
5. Configure environment variables
6. Set up CI/CD pipeline
7. Deploy

**Documentation:** [AWS Elastic Beanstalk Docs](https://docs.aws.amazon.com/elasticbeanstalk/)

---

### Option 5: Heroku

**Best for:** Legacy support, familiar platform

#### Pros
- ✅ Easy deployment
- ✅ Add-ons ecosystem
- ✅ Good documentation
- ✅ Automatic SSL

#### Cons
- ⚠️ Expensive
- ⚠️ Limited free tier
- ⚠️ Dyno sleep on free tier

#### Pricing
- **Eco:** $5/month (sleeps after 30 min inactivity)
- **Basic:** $7/month (always on)
- **Standard:** $25/month (better performance)

#### Setup Steps
1. Sign up at [heroku.com](https://heroku.com)
2. Create new app
3. Add PostgreSQL add-on
4. Connect GitHub repository
5. Configure environment variables
6. Deploy

**Documentation:** [Heroku Docs](https://devcenter.heroku.com/)

---

### Option 6: Self-Hosted (VPS)

**Best for:** Maximum control, cost-effective at scale

#### Pros
- ✅ Full control
- ✅ Cost-effective for high traffic
- ✅ No vendor lock-in
- ✅ Custom configurations

#### Cons
- ⚠️ Requires server management
- ⚠️ Security responsibility
- ⚠️ Manual updates
- ⚠️ No managed services

#### Recommended Providers
- **DigitalOcean Droplets:** $6/month (1GB RAM)
- **Linode:** $5/month (1GB RAM)
- **Vultr:** $6/month (1GB RAM)
- **Hetzner:** €4.15/month (2GB RAM)

#### Setup Steps
1. Provision VPS
2. Install Node.js and PostgreSQL
3. Set up Nginx reverse proxy
4. Configure SSL with Let's Encrypt
5. Set up PM2 for process management
6. Configure firewall
7. Set up monitoring
8. Deploy application

---

## 🏆 Recommended Hosting Strategy

### For Development/Staging
**Recommended:** Railway or Render (free tier)

- Quick setup
- Easy deployments
- Good for testing

### For Production (Small to Medium)
**Recommended:** Railway or DigitalOcean App Platform

- Good balance of features and cost
- Easy management
- Scalable

### For Production (Large Scale)
**Recommended:** AWS or Self-Hosted VPS

- Maximum control
- Cost-effective at scale
- Enterprise features

---

## 🔧 Environment Configuration

### Required Environment Variables

All hosting platforms will need these environment variables configured:

```env
# Application
APP_ENV=production
PORT=3000

# Database
DB_HOST=<database-host>
DB_PORT=5432
DB_USERNAME=<database-user>
DB_PASSWORD=<database-password>
DB_DATABASE=<database-name>

# Authentication
SUPERADMIN_USERNAME=<admin-username>
SUPERADMIN_PASSWORD=<secure-password>
COOKIE_SECRET=<32-char-minimum-secret>

# Assets (if using CDN)
ASSET_URL_PREFIX=https://your-domain.com/assets/

# Email (when EmailPlugin is enabled)
EMAIL_TRANSPORT=smtp
EMAIL_HOST=smtp.example.com
EMAIL_PORT=587
EMAIL_USER=<email-user>
EMAIL_PASSWORD=<email-password>
EMAIL_FROM=noreply@your-domain.com

# Payment Gateway (when implemented)
STRIPE_SECRET_KEY=<stripe-secret>
STRIPE_PUBLISHABLE_KEY=<stripe-publishable>
```

### Platform-Specific Configuration

Each platform has different ways to set environment variables:
- **Railway:** Project Settings → Variables
- **Render:** Environment → Environment Variables
- **DigitalOcean:** App Settings → Environment Variables
- **AWS:** Elastic Beanstalk Configuration → Environment Properties
- **Heroku:** Settings → Config Vars

---

## 📦 Deployment Configuration

### Build Commands

All platforms should use:

```bash
# Install dependencies
npm ci

# Build TypeScript
npm run build

# Build dashboard
npm run build:dashboard
```

### Start Commands

**Server:**
```bash
npm run start:server
```

**Worker:** (if running separately)
```bash
npm run start:worker
```

**Both:** (if running together)
```bash
npm start
```

### Health Check Endpoints

Configure health checks to:
- **Path:** `/admin-api/health` or `/shop-api/health`
- **Interval:** 30 seconds
- **Timeout:** 5 seconds
- **Retries:** 3

---

## 🗄️ Database Setup

### Managed Database Options

Most platforms offer managed PostgreSQL:

1. **Railway:** Built-in PostgreSQL service
2. **Render:** Managed PostgreSQL add-on
3. **DigitalOcean:** Managed Database
4. **AWS:** RDS PostgreSQL
5. **Heroku:** Postgres add-on

### Database Configuration

- **Version:** PostgreSQL 16 (recommended) or 14+
- **Connection Pooling:** Enable if available
- **Backups:** Enable automatic backups
- **SSL:** Require SSL connections in production

### Migration Strategy

1. Run migrations as part of deployment
2. Test migrations on staging first
3. Backup database before production migrations
4. Have rollback plan ready

---

## 🔒 Security Considerations

### SSL/HTTPS

- All platforms provide automatic SSL
- Ensure HTTPS is enforced
- Use HSTS headers

### Database Security

- Use SSL connections
- Restrict database access to application servers only
- Use strong passwords
- Enable connection pooling

### Application Security

- Set `APP_ENV=production`
- Use strong secrets (32+ characters)
- Enable security headers
- Regular security updates

---

## 📊 Monitoring & Logging

### Application Monitoring

Recommended tools:
- **Sentry:** Error tracking
- **DataDog:** Full-stack monitoring
- **New Relic:** Application performance
- **LogRocket:** User session replay

### Infrastructure Monitoring

Most platforms provide:
- Uptime monitoring
- Resource usage metrics
- Log aggregation
- Alert notifications

---

## 💰 Cost Estimation

### Small Traffic (< 1,000 users/month)
- **Railway/Render:** $5-10/month
- **DigitalOcean:** $7-12/month
- **Total:** ~$10-15/month

### Medium Traffic (< 10,000 users/month)
- **Railway/Render:** $20-30/month
- **DigitalOcean:** $25-40/month
- **Database:** $15-25/month
- **CDN:** $5-10/month
- **Total:** ~$45-75/month

### Large Traffic (< 100,000 users/month)
- **AWS/Self-Hosted:** $100-300/month
- **Database:** $50-100/month
- **CDN:** $20-50/month
- **Monitoring:** $20-50/month
- **Total:** ~$190-500/month

---

## 🚀 Quick Start Recommendations

### For Immediate Deployment

1. **Choose Railway or Render** (easiest setup)
2. **Follow platform-specific setup guide**
3. **Configure environment variables**
4. **Deploy from GitHub**
5. **Set up database**
6. **Run migrations**
7. **Test deployment**

### For Long-Term Production

1. **Start with Railway/Render** for MVP
2. **Monitor costs and performance**
3. **Migrate to DigitalOcean or AWS** when scaling
4. **Set up proper monitoring**
5. **Implement CDN for assets**
6. **Set up automated backups**

---

## 📚 Additional Resources

- [Vendure Deployment Guide](https://docs.vendure.io/guides/deployment/)
- [Railway Documentation](https://docs.railway.app)
- [Render Documentation](https://render.com/docs)
- [DigitalOcean App Platform](https://docs.digitalocean.com/products/app-platform/)
- [AWS Elastic Beanstalk](https://docs.aws.amazon.com/elasticbeanstalk/)

---

**Next Steps:** See [HOSTING_MIGRATION_PLAN.md](./HOSTING_MIGRATION_PLAN.md) for detailed migration strategies.

