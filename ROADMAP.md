# Etsy-Style Marketplace Development Roadmap

**Project:** StoneyOneBurn - Multi-Vendor Marketplace  
**Approach:** Test-Driven Development (TDD)  
**Last Updated:** 2024

---

## 🎯 Project Overview

Build a secure, scalable, multi-vendor marketplace platform similar to Etsy using Vendure as the foundation. This roadmap follows TDD principles: write tests first, implement minimal code to pass, then refactor.

---

## 📋 Development Principles

### TDD Workflow for Each Feature
1. **Write documentation/comments** describing the feature
2. **Write comprehensive unit tests** that fail (red)
3. **Implement minimal code** to make tests pass (green)
4. **Refactor** while keeping tests passing
5. **Run tests frequently** and fix any failures before continuing

### Code Quality Standards
- ✅ Minimum 80% test coverage
- ✅ All tests must pass before merging
- ✅ Code reviews required for each phase
- ✅ Documentation updated with each feature

---

## 🗺️ Phase Roadmap

### Phase 0: Foundation & Setup ✅
**Status:** ✅ Complete  
**Estimated Time:** 1 week  
**Completed:** 2024

#### Tasks
- [x] Initial Vendure setup
- [x] PostgreSQL database configured
- [x] Basic plugins installed
- [x] Production security configuration
- [x] CI/CD pipeline setup
- [x] Testing framework configured (Jest)
- [x] Code quality tools (ESLint, Prettier)
- [x] Environment variable management
- [x] Database migration setup

#### Deliverables
- [x] All environment variables documented in `ENV_EXAMPLE.md`
- [x] Jest test suite configured
- [x] ESLint and Prettier configured
- [x] GitHub Actions or CI pipeline working
- [x] `synchronize: false` in production config
- [x] Migration system in place

#### Tests Required
- [x] Database connection tests
- [x] Environment variable validation tests
- [x] Migration rollback tests

---

### Phase 1: Single-Vendor MVP (Learning Phase)
**Status:** In Progress (85% Complete)  
**Estimated Time:** 2-3 weeks  
**Started:** 2024  
**Last Updated:** December 2024

**Goal:** Master Vendure basics before building multi-vendor features

#### Tasks
- [x] Enable EmailPlugin with proper configuration
- [x] Integrate real payment gateway (Stripe recommended)
- [x] Build basic storefront (Next.js/React)
- [x] Product catalog functionality
  - [x] Product listing with pagination
  - [x] Product search functionality
  - [x] Product filtering by facets/categories
  - [x] Product sorting (name, price, date)
  - [x] Category/collection browsing
  - [x] Product detail pages
- [x] Shopping cart and checkout flow (Implementation complete, tests incomplete)
  - [x] Shopping cart page with add/remove/update items
  - [x] Checkout flow with multi-step process
  - [x] Address form component (shipping & billing)
  - [x] Shipping method selection
  - [x] Payment integration placeholder
  - [ ] **Checkout page tests (MISSING - TDD gap)**
- [ ] Order management system
- [ ] Customer account management

#### Deliverables
- [x] Working single-vendor storefront (functional)
- [x] Payment processing configured (Stripe integration ready)
- [x] Email notifications functional
- [x] Basic admin dashboard usage
- [ ] Test suite for all features (Partially complete - checkout tests missing)

#### Tests Required
- [ ] Payment handler tests (backend)
- [ ] Order creation tests (backend)
- [x] Email sending tests (configured)
- [x] Cart functionality tests (CartPage.test.tsx)
- [x] AddressForm component tests (AddressForm.test.tsx)
- [ ] **Checkout page tests (CRITICAL MISSING - must complete before Phase 1 done)**
- [ ] Product search tests (frontend)

#### Current TDD Gap (December 2024)
**Issue:** Shopping cart and checkout flow were implemented without following TDD principles. Tests were added retroactively, but checkout page tests were never completed.

**What's Done:**
- ✅ Shopping cart page (`storefront/app/cart/page.tsx`) - Implemented
- ✅ Checkout page (`storefront/app/checkout/page.tsx`) - Implemented  
- ✅ AddressForm component (`storefront/components/AddressForm.tsx`) - Implemented
- ✅ CartPage tests (`storefront/app/cart/__tests__/CartPage.test.tsx`) - Complete
- ✅ AddressForm tests (`storefront/components/__tests__/AddressForm.test.tsx`) - Complete

**What's Missing:**
- ❌ **CheckoutPage tests** (`storefront/app/checkout/__tests__/CheckoutPage.test.tsx`) - **CRITICAL GAP**

**Required Tests for CheckoutPage:**
- [ ] Loading state when fetching order
- [ ] Empty cart redirect/display
- [ ] Multi-step checkout flow progression
- [ ] Shipping address form submission
- [ ] Shipping method selection
- [ ] Billing address form (same as shipping option)
- [ ] Payment step handling
- [ ] Order completion state
- [ ] Error handling for each step
- [ ] Order summary display throughout checkout
- [ ] Step indicator updates
- [ ] GraphQL mutation error handling

**Next Steps:**
1. Write comprehensive CheckoutPage tests following TDD principles
2. Ensure all tests pass
3. Verify test coverage meets 80%+ requirement
4. Complete Phase 1 checklist

#### Recommendations
- Start with Stripe for payments (well-documented, widely used)
- Use Next.js for storefront (good Vendure integration examples)
- Implement email templates early
- **Always write tests first (TDD)** - This gap demonstrates why TDD is critical

---

### Phase 2: Multi-Vendor Core Plugin
**Status:** Not Started  
**Estimated Time:** 3-4 weeks

**Goal:** Build the foundation for multi-vendor functionality

#### 2.1: Seller Entity & Database Schema
- [ ] Design seller entity schema
- [ ] Create Seller entity with custom fields
- [ ] Seller-Customer relationship
- [ ] Seller verification status field
- [ ] Seller shop information fields

**Tests:**
- [ ] Seller entity creation tests
- [ ] Seller validation tests
- [ ] Database migration tests

#### 2.2: Seller Registration & Onboarding
- [ ] Seller registration API endpoint
- [ ] Seller verification workflow
- [ ] Shop creation process
- [ ] Seller profile management
- [ ] Document upload for verification

**Tests:**
- [ ] Seller registration tests
- [ ] Email verification tests
- [ ] Shop creation tests
- [ ] Validation tests for required fields

#### 2.3: Seller-Product Association
- [ ] Link products to sellers
- [ ] Seller product management permissions
- [ ] Product ownership validation
- [ ] Seller product listing API

**Tests:**
- [ ] Product-seller association tests
- [ ] Permission checks for product management
- [ ] Product ownership validation tests

#### 2.4: Seller Dashboard Plugin
- [ ] Custom Vendure plugin for seller dashboard
- [ ] Seller-specific product list
- [ ] Seller order management
- [ ] Seller analytics (basic)
- [ ] Seller settings page

**Tests:**
- [ ] Dashboard access control tests
- [ ] Seller data filtering tests
- [ ] Permission boundary tests

---

### Phase 3: Commission & Payment System
**Status:** Not Started  
**Estimated Time:** 2-3 weeks

**Goal:** Implement split payments and commission tracking

#### 3.1: Commission Configuration
- [ ] Commission rate configuration
- [ ] Per-seller commission rates
- [ ] Commission calculation logic
- [ ] Commission history tracking

**Tests:**
- [ ] Commission calculation tests (various scenarios)
- [ ] Commission rate validation tests
- [ ] Edge case tests (0%, 100%, negative values)

#### 3.2: Split Payment Processing
- [ ] Modify payment handler for split payments
- [ ] Platform commission deduction
- [ ] Seller payout calculation
- [ ] Payment status tracking
- [ ] Escrow/holding funds until fulfillment

**Tests:**
- [ ] Split payment calculation tests
- [ ] Payment handler integration tests
- [ ] Edge cases (partial refunds, disputes)
- [ ] Transaction logging tests

#### 3.3: Seller Payout System
- [ ] Payout request system
- [ ] Payout approval workflow
- [ ] Payout history
- [ ] Minimum payout threshold
- [ ] Payout scheduling (weekly/monthly)

**Tests:**
- [ ] Payout calculation tests
- [ ] Payout request validation tests
- [ ] Payout workflow tests

---

### Phase 4: Reviews & Ratings System
**Status:** Not Started  
**Estimated Time:** 1-2 weeks

#### Tasks
- [ ] Review entity design
- [ ] Product review system
- [ ] Seller rating aggregation
- [ ] Review moderation tools
- [ ] Review display on product pages
- [ ] Review verification (purchase required)

#### Tests Required
- [ ] Review creation tests
- [ ] Rating calculation tests
- [ ] Review moderation tests
- [ ] Verification tests (only buyers can review)
- [ ] Spam prevention tests

---

### Phase 5: Enhanced Storefront Features
**Status:** Not Started  
**Estimated Time:** 2-3 weeks

#### 5.1: Seller Shop Pages
- [ ] Individual seller shop pages
- [ ] Seller profile display
- [ ] Shop product listings
- [ ] Shop customization (banner, description)
- [ ] Shop search functionality

**Tests:**
- [ ] Shop page rendering tests
- [ ] Shop data fetching tests
- [ ] Shop customization tests

#### 5.2: Multi-Seller Cart
- [ ] Cart with products from multiple sellers
- [ ] Seller grouping in cart
- [ ] Split checkout by seller
- [ ] Shipping calculation per seller
- [ ] Order splitting logic

**Tests:**
- [ ] Multi-seller cart tests
- [ ] Cart grouping tests
- [ ] Checkout flow tests
- [ ] Order splitting tests

#### 5.3: Search & Discovery
- [ ] Search by seller
- [ ] Filter by seller
- [ ] Seller recommendations
- [ ] Category browsing
- [ ] Advanced search filters

**Tests:**
- [ ] Search functionality tests
- [ ] Filter combination tests
- [ ] Performance tests for search

---

### Phase 6: Security & Production Hardening
**Status:** Not Started  
**Estimated Time:** 2 weeks

#### 6.1: Security Enhancements
- [ ] Rate limiting implementation
- [ ] Input validation and sanitization
- [ ] SQL injection prevention (verify TypeORM usage)
- [ ] XSS protection
- [ ] CSRF protection
- [ ] Authentication security (JWT best practices)
- [ ] API key management for sellers

**Tests:**
- [ ] Security vulnerability tests
- [ ] Rate limiting tests
- [ ] Input validation tests
- [ ] Penetration testing (basic)

#### 6.2: Production Configuration
- [ ] Environment-specific configs
- [ ] Logging and monitoring setup
- [ ] Error tracking (Sentry)
- [ ] Performance monitoring
- [ ] Database backup strategy
- [ ] SSL/HTTPS configuration
- [ ] CDN setup for assets

**Tests:**
- [ ] Configuration validation tests
- [ ] Logging tests
- [ ] Error handling tests

#### 6.3: Compliance
- [ ] GDPR compliance features
- [ ] Data export functionality
- [ ] Privacy policy integration
- [ ] Terms of service
- [ ] Tax calculation (basic)
- [ ] Invoice generation

**Tests:**
- [ ] GDPR compliance tests
- [ ] Data export tests
- [ ] Tax calculation tests

---

### Phase 7: Advanced Features
**Status:** Not Started  
**Estimated Time:** 3-4 weeks

#### 7.1: Seller Analytics
- [ ] Sales dashboard for sellers
- [ ] Revenue reports
- [ ] Product performance metrics
- [ ] Customer insights
- [ ] Export reports (CSV/PDF)

**Tests:**
- [ ] Analytics calculation tests
- [ ] Report generation tests
- [ ] Data accuracy tests

#### 7.2: Messaging System
- [ ] Buyer-seller messaging
- [ ] Order-related messaging
- [ ] Notification system
- [ ] Message history

**Tests:**
- [ ] Messaging functionality tests
- [ ] Notification delivery tests
- [ ] Privacy tests (sellers can't see buyer emails)

#### 7.3: Dispute Resolution
- [ ] Dispute creation system
- [ ] Dispute workflow
- [ ] Admin dispute management
- [ ] Refund processing
- [ ] Dispute history

**Tests:**
- [ ] Dispute workflow tests
- [ ] Refund processing tests
- [ ] Admin intervention tests

---

### Phase 8: Performance & Scalability
**Status:** Not Started  
**Estimated Time:** 2 weeks

#### Tasks
- [ ] Database query optimization
- [ ] Caching strategy (Redis)
- [ ] Image optimization and CDN
- [ ] API response time optimization
- [ ] Load testing
- [ ] Horizontal scaling preparation
- [ ] Search index optimization

#### Tests Required
- [ ] Performance benchmarks
- [ ] Load tests
- [ ] Stress tests
- [ ] Database query performance tests

---

## 📊 Progress Tracking

### Overall Progress
- **Completed Phases:** 0/8 (0%)
- **In Progress:** Phase 1 (Single-Vendor MVP) - 85% complete
- **Not Started:** Phases 2-8

### Phase 1 Current Status
- ✅ **Completed:** Product catalog, shopping cart UI, checkout flow UI, AddressForm component
- ✅ **Tests Written:** CartPage tests, AddressForm tests, ProductDetailPage tests
- ❌ **Missing:** Checkout page tests (critical TDD gap - must complete before Phase 1 completion)
- ⚠️ **Note:** Shopping cart and checkout were implemented without following TDD. Tests were added retroactively for cart and AddressForm, but checkout page tests were never completed.

### Key Metrics
- Total Estimated Time: 18-26 weeks (4.5-6.5 months)
- Test Coverage Target: 80%+
- Current Test Coverage: TBD

---

## 🛠️ Technology Stack

### Backend
- **Framework:** Vendure (v3.5.2)
- **Language:** TypeScript
- **Database:** PostgreSQL
- **API:** GraphQL
- **Testing:** Jest

### Frontend (To Be Built)
- **Framework:** Next.js (recommended) or React
- **Styling:** Tailwind CSS (recommended)
- **State Management:** React Query / Apollo Client

### Infrastructure
- **Hosting:** TBD (AWS, DigitalOcean, Railway, etc.)
- **CDN:** Cloudflare or AWS CloudFront
- **Email:** SendGrid, AWS SES, or similar
- **Payments:** Stripe (recommended)
- **Monitoring:** Sentry, DataDog, or similar

---

## 📝 Recommendations

### Development Best Practices
1. **Start Small:** Complete Phase 1 fully before moving to Phase 2
2. **Test Coverage:** Never skip writing tests - it will save time later
3. **Code Reviews:** Review each phase before moving to the next
4. **Documentation:** Document APIs and complex logic as you go
5. **Version Control:** Use feature branches and meaningful commit messages

### Security Priorities
1. **Never commit secrets** - use environment variables
2. **Validate all inputs** - especially payment and user data
3. **Use HTTPS everywhere** - especially in production
4. **Regular security audits** - review dependencies monthly
5. **Keep dependencies updated** - use `npm audit` regularly

### Performance Considerations
1. **Database indexing** - add indexes for frequently queried fields
2. **Caching strategy** - implement early, optimize later
3. **Image optimization** - compress and serve via CDN
4. **API pagination** - always paginate large result sets
5. **Lazy loading** - load data only when needed

### Business Considerations
1. **Legal compliance** - consult lawyer for terms, privacy policy
2. **Payment processing** - ensure PCI compliance
3. **Tax handling** - may need tax calculation service
4. **Seller verification** - implement KYC if handling large transactions
5. **Dispute resolution** - have clear policies and workflows

---

## 🚀 Getting Started

### Next Steps (Phase 0)
1. Set up testing framework (Jest)
2. Configure ESLint and Prettier
3. Set up CI/CD pipeline
4. Create `.env.example` file
5. Disable `synchronize` and set up migrations
6. Write first tests for database connection

### Resources
- [Vendure Documentation](https://docs.vendure.io)
- [Vendure Discord Community](https://www.vendure.io/community)
- [Vendure GitHub](https://github.com/vendure-ecommerce/vendure)
- [Plugin Development Guide](https://docs.vendure.io/guides/developer-guide/plugins/)

---

## 📅 Milestones

### MVP Milestone (Phases 0-3)
**Target Date:** TBD  
**Goal:** Basic multi-vendor marketplace with payments

### Beta Launch (Phases 0-5)
**Target Date:** TBD  
**Goal:** Full-featured marketplace ready for limited beta testing

### Production Launch (All Phases)
**Target Date:** TBD  
**Goal:** Production-ready, secure, scalable marketplace

---

## 🔄 Update Log

- **2024:** Roadmap created
- **2024:** Phase 0 started
- **2024:** Phase 0 completed (Foundation & Setup)
- **2024:** Phase 1 started (Single-Vendor MVP)
- **December 2024:** Shopping cart and checkout flow implemented
  - ⚠️ **TDD Gap Identified:** Implementation was done without tests first
  - ✅ CartPage tests created retroactively
  - ✅ AddressForm tests created retroactively
  - ❌ **CheckoutPage tests never completed** (blocking Phase 1 completion)
- _(Add updates as phases are completed)_

---

## ✅ Phase Completion Checklist

When completing a phase, ensure:
- [ ] All tests passing (100%)
- [ ] Code reviewed
- [ ] Documentation updated
- [ ] No linter errors
- [ ] Security review completed
- [ ] Performance benchmarks met
- [ ] Phase marked as complete in this document

### Phase 1 Specific Checklist
- [x] Product catalog fully functional
- [x] Shopping cart UI implemented
- [x] Checkout flow UI implemented
- [x] CartPage tests written and passing
- [x] AddressForm tests written and passing
- [ ] **CheckoutPage tests written and passing (BLOCKING)**
- [ ] All storefront tests passing
- [ ] Backend payment handler tests
- [ ] Order management UI
- [ ] Customer account management

---

**Note:** This roadmap is a living document. Update it as requirements change or new insights are gained during development.

