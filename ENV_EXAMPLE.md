# Environment Variables Example

Copy this to `.env` and fill in your values.

```env
# Application Environment
# Set to 'dev' for development, 'production' for production
APP_ENV=dev

# Server Configuration
PORT=3000

# Authentication
# Superadmin credentials - CHANGE THESE IN PRODUCTION!
SUPERADMIN_USERNAME=superadmin
SUPERADMIN_PASSWORD=changeme

# Cookie Secret
# Must be at least 32 characters long
# Generate a secure random string for production
COOKIE_SECRET=your-secret-cookie-key-at-least-32-characters-long

# Database Configuration
# Development defaults (using docker-compose postgres)
DB_HOST=localhost
DB_PORT=6543
DB_USERNAME=postgres
DB_PASSWORD=postgres
DB_DATABASE=vendure

# Production Database (uncomment and configure for production)
# DB_HOST=your-production-db-host
# DB_PORT=5432
# DB_USERNAME=your-db-username
# DB_PASSWORD=your-secure-db-password
# DB_DATABASE=your-db-name

# Email Configuration (for EmailPlugin)
# In development, emails are written to static/email/test-emails (devMode: true)
# In production, configure SMTP settings below
# EMAIL_HOST=smtp.example.com
# EMAIL_PORT=587 (or 465 for SSL)
# EMAIL_USER=your-email@example.com
# EMAIL_PASSWORD=your-email-password
# EMAIL_FROM=noreply@example.com

# Storefront URL (for email links)
# This will be configured when the storefront is built in Phase 1
# STOREFRONT_URL=http://localhost:8080

# Payment Gateway (Stripe)
# Get these from your Stripe dashboard: https://dashboard.stripe.com/apikeys
# Use test keys (sk_test_... and pk_test_...) for development
# Use live keys (sk_live_... and pk_live_...) for production
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...

# Stripe Webhook Secret (optional but recommended)
# Get this from your Stripe dashboard when setting up webhooks
# Webhook URL should be: https://your-domain.com/payments/stripe
# STRIPE_WEBHOOK_SECRET=whsec_...

# Asset URL Prefix (for production)
# ASSET_URL_PREFIX=https://your-domain.com/assets/
```

