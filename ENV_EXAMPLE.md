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
# EMAIL_TRANSPORT=smtp
# EMAIL_HOST=smtp.example.com
# EMAIL_PORT=587
# EMAIL_USER=your-email@example.com
# EMAIL_PASSWORD=your-email-password
# EMAIL_FROM=noreply@example.com

# Payment Gateway (when implementing)
# STRIPE_SECRET_KEY=sk_test_...
# STRIPE_PUBLISHABLE_KEY=pk_test_...

# Asset URL Prefix (for production)
# ASSET_URL_PREFIX=https://your-domain.com/assets/
```

