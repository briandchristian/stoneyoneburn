# Etsy-Style Marketplace Development Roadmap

**Project:** StoneyOneBurn - Multi-Vendor Marketplace  
**Approach:** Test-Driven Development (TDD)  
**Last Updated:** January 23, 2025

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

### Phase Management
- **Phase Completion**: When a phase is completed, update the roadmap status and add completion date
- **Work Migration**: If work is moved to another phase for efficiency or architectural reasons, document the move in both phases
- **Notifications**: Always notify when:
  - A phase is marked as complete
  - Work is being moved to another phase
  - Moving to the next phase begins

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
**Status:** ✅ Complete (100%)  
**Estimated Time:** 2-3 weeks  
**Started:** 2024  
**Completed:** January 3, 2025

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
  - [x] Add to cart functionality on product pages
- [x] Shopping cart and checkout flow
  - [x] Shopping cart page with add/remove/update items
  - [x] Checkout flow with multi-step process
  - [x] Address form component (shipping & billing)
  - [x] Shipping method selection
  - [x] Payment integration placeholder
  - [x] **Checkout page tests (25 comprehensive tests - COMPLETE)**
- [x] Order management system
  - [x] Order history page (`/orders`)
  - [x] Order detail page (`/orders/[code]`)
  - [x] GraphQL queries (GET_ORDERS, GET_ORDER_BY_CODE)
  - [x] Order history page tests (12 tests)
  - [x] Order detail page tests (15 tests)
  - [x] Backend order management documentation tests
- [x] Customer account management

#### Deliverables
- [x] Working single-vendor storefront (functional)
- [x] Payment processing configured (Stripe integration ready)
- [x] Email notifications functional
- [x] Basic admin dashboard usage
- [x] Test suite for storefront features (Cart, Checkout, AddressForm, ProductDetail, OrderHistory, OrderDetail)

#### Tests Required
- [x] Payment handler tests (backend) - Complete (payment-handler.test.ts - 22 tests)
- [x] Order creation tests (backend) - Complete (order-creation.test.ts - 30 tests)
- [x] Email sending tests (configured)
- [x] Cart functionality tests (CartPage.test.tsx) - Complete
- [x] AddressForm component tests (AddressForm.test.tsx) - Complete
- [x] **Checkout page tests (CheckoutPage.test.tsx) - Complete (25 tests)**
- [x] Product detail page tests (ProductDetailPage.test.tsx) - Complete
- [x] Order history page tests (OrderHistoryPage.test.tsx) - Complete (12 tests)
- [x] Order detail page tests (OrderDetailPage.test.tsx) - Complete (15 tests)
- [x] Backend order management tests (order-management.test.ts) - Complete
- [x] Product search tests (frontend) - Complete (SearchBar.test.tsx - 24 tests)
- [x] Customer registration tests (RegisterPage.test.tsx - complete)
  - [x] Registration page tests
  - [x] Registration form validation tests
  - [x] Registration mutation tests
- [x] Customer login tests (LoginPage.test.tsx - complete)
  - [x] Login page tests
  - [x] Login form validation tests
  - [x] Authentication tests
- [x] Customer logout tests (LogoutPage.test.tsx - complete)
- [x] Email verification tests (VerifyEmailPage.test.tsx - complete)
- [x] Customer account/profile tests (AccountPage.test.tsx - complete)

#### Test Coverage Status (December 2024)
**Status:** ✅ Checkout tests completed retroactively

**Completed Tests:**
- ✅ Shopping cart page (`storefront/app/cart/page.tsx`) - Implemented
- ✅ Checkout page (`storefront/app/checkout/page.tsx`) - Implemented  
- ✅ AddressForm component (`storefront/components/AddressForm.tsx`) - Implemented
- ✅ CartPage tests (`storefront/app/cart/__tests__/CartPage.test.tsx`) - Complete
- ✅ AddressForm tests (`storefront/components/__tests__/AddressForm.test.tsx`) - Complete
- ✅ **CheckoutPage tests** (`storefront/app/checkout/__tests__/CheckoutPage.test.tsx`) - **Complete (25 tests)**

**CheckoutPage Test Coverage:**
- [x] Loading state when fetching order
- [x] Empty cart redirect/display
- [x] Multi-step checkout flow progression
- [x] Shipping address form submission
- [x] Shipping method selection
- [x] Billing address form (same as shipping option)
- [x] Payment step handling
- [x] Order completion state
- [x] Error handling for each step
- [x] Order summary display throughout checkout
- [x] Step indicator updates
- [x] GraphQL mutation error handling
- [x] Test assertion improvements (specific Total vs Subtotal verification)
- [x] Proper use of queryAllByText for better error handling

**Note:** While these tests were added retroactively rather than following strict TDD, comprehensive test coverage has been achieved. Future features should follow TDD principles from the start.

#### Recommendations
- Start with Stripe for payments (well-documented, widely used)
- Use Next.js for storefront (good Vendure integration examples) ✅ Implemented
- Implement email templates early ✅ Configured
- **Always write tests first (TDD)** - While checkout tests were added retroactively, comprehensive coverage has been achieved. Future features should follow TDD from the start.

---

### Phase 2: Multi-Vendor Core Plugin
**Status:** ✅ Complete (2.1–2.4)  
**Estimated Time:** 3-4 weeks

**Goal:** Build the foundation for multi-vendor functionality

#### 2.1: Seller Entity & Database Schema
**Status:** ✅ Complete (ready for migration)  
- [x] Design seller entity schema
- [x] Create Seller entity with custom fields
- [x] Seller-Customer relationship
- [x] Seller verification status field
- [x] Seller shop information fields
- [x] GraphQL decorators added
- [x] Entity tests fixed (database constraints documented, not unit tested)
- [ ] Generate database migration (manual step - run `npx vendure migrate`)

**Tests:**
- [x] Seller entity creation tests (18 contract tests - fixed)
- [x] Seller validation tests (database constraints documented)
- [ ] Database migration tests (pending migration generation)

#### 2.2: Seller Registration & Onboarding
**Status:** ✅ Complete (ready for testing)  
- [x] Seller registration API endpoint
- [x] Seller service with registration logic
- [x] Shop creation process (automatic slug generation)
- [x] Seller profile management
- [x] GraphQL resolver with mutations/queries
- [x] Error handling and validation
- [ ] Document upload for verification (future enhancement)

**Tests:**
- [x] Seller registration tests (30 contract tests)
- [x] Shop slug generation tests
- [x] Validation tests for required fields
- [ ] Integration tests (pending migration)

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
**Status:** ✅ Complete
- [x] Custom Vendure plugin for seller dashboard (dashboard extension + Marketplace nav)
- [x] Seller list (marketplace sellers, paginated) and detail view
- [x] Seller stats, product summary, recent orders on detail page
- [x] Admin verification UI (Verify/Reject/Suspend) with UpdateAdministrator guard
- [x] Seller analytics (basic): revenue, AOV, orders by status, products by status
- [ ] Seller settings page (deferred)

**Tests:**
- [x] Contract tests for marketplaceSellers, marketplaceSeller, dashboard stats/summaries, updateVerificationStatus
- [ ] Dashboard access control tests (manual)
- [ ] Permission boundary tests (manual)

---

### Phase 3: Commission & Payment System
**Status:** ✅ Complete (3.1, 3.2, 3.3, 3.4, 3.6)  
**Estimated Time:** 2-3 weeks  
**Completed:** January 2025

**Goal:** Implement split payments and commission tracking

#### 3.1: Commission Configuration
**Status:** ✅ Complete
- [x] Commission rate (default 15%, configurable per-seller via custom fields)
- [x] Commission calculation (CommissionService), validation
- [x] Commission history (entity, service, resolver, dashboard on seller detail)

**Tests:**
- [x] Commission calculation tests (commission.service, split-payment, order-payment-handler)
- [x] Commission rate validation tests
- [x] Edge case tests (0%, 100%, etc.)

#### 3.2: Split Payment Processing
**Status:** ✅ Complete
- [x] Order payment handler (OrderPlaced / PaymentSettled), split payments
- [x] Platform commission deduction, seller payout calculation
- [x] Payment status (HOLD, PENDING, PROCESSING, COMPLETED, FAILED), escrow

**Tests:**
- [x] Split payment and payment-handler unit tests
- [x] Order payment subscriber tests
- [ ] Edge cases (partial refunds, disputes) — deferred

#### 3.3: Seller Payout System
**Status:** ✅ Complete
- [x] Payout request (Shop API: requestPayout, minimum threshold)
- [x] Payout approval workflow (Admin: approvePayout, rejectPayout, pendingPayouts)
- [x] Payout history (payoutHistory, pendingPayoutTotal)
- [x] Dashboard: Pending Payouts page (list, approve/reject)
- [x] Payout scheduling (weekly via ScheduledTask: `process-scheduled-payouts`)

**Tests:**
- [x] Payout service and resolver tests
- [x] Payout workflow tests
- [x] Payout scheduler service tests

#### 3.4: Configurable Default Commission Rate
**Status:** ✅ Complete
- [x] GlobalSettings custom field: `defaultCommissionRate` (float, 0-1, default 0.15)
- [x] CommissionService: `getDefaultCommissionRate(ctx)` reads from GlobalSettings
- [x] OrderPaymentHandlerService: uses configured rate instead of hardcoded constant
- [x] Admin UI: Available via Vendure's built-in GlobalSettings page

**Tests:**
- [x] CommissionService tests (21 tests passing)
- [x] OrderPaymentHandlerService tests (6 tests passing)

---

### Phase 4: Reviews & Ratings System
**Status:** 🚧 In Progress  
**Estimated Time:** 1-2 weeks  
**Started:** January 2025

#### Tasks
- [x] Review entity design (Review entity with ReviewStatus enum)
- [x] ReviewService with TDD (createReview, getReviews, approveReview, rejectReview, getSellerRating)
- [x] ReviewResolver for Shop API (submitReview, getReviews mutations/queries)
- [ ] ReviewAdminResolver for Admin API (approveReview, rejectReview mutations)
- [ ] Seller rating aggregation display (on seller profiles)
- [ ] Review display on product pages (storefront)
- [x] Review verification (purchase required - implemented in ReviewService)

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
- [ ] Refund processing (including partial refunds from Phase 3)
- [ ] Dispute history
- [ ] Partial refunds edge cases (moved from Phase 3 for architectural alignment)

**Tests:**
- [ ] Dispute workflow tests
- [ ] Refund processing tests (including partial refunds)
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
- **Completed Phases:** 2/8 (25%) - Phase 0 and Phase 1 complete
- **In Progress:** None
- **Not Started:** Phases 2-8

### Phase 1 Current Status
- ✅ **Completed:** Product catalog, shopping cart UI, checkout flow UI, AddressForm component, Header with search and cart count
- ✅ **Tests Written:** CartPage tests, AddressForm tests, ProductDetailPage tests, CheckoutPage tests (25 tests)
- ✅ **Test Coverage:** All storefront components have comprehensive test coverage
- ✅ **Features:** Product search, filtering, sorting, pagination, collections browsing, add to cart, order management
- ✅ **Order Management:** Order history page, order detail page, comprehensive test coverage (27 tests)
- ✅ **Backend Tests:** Payment handler tests (22 tests), Order creation tests (30 tests)
- ✅ **Frontend Tests:** Product search tests (SearchBar.test.tsx - 24 tests)

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

### Frontend
- **Framework:** Next.js 16.1.1
- **Styling:** Tailwind CSS 4
- **State Management:** Apollo Client 3.14.0
- **Testing:** Jest 30.2.0, React Testing Library 16.3.1
- **Language:** TypeScript 5

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
- **December 29, 2024:** Checkout page tests completed
  - ✅ CheckoutPage tests written (25 comprehensive tests)
  - ✅ Test assertion improvements (specific Total vs Subtotal verification)
  - ✅ Fixed test to use queryAllByText for better error handling
  - ✅ All storefront tests passing
  - ✅ Product catalog features completed (search, filter, sort, pagination, collections)
  - ✅ Header component enhanced with search bar and cart count badge
  - ✅ Product detail page with add to cart functionality
- **December 31, 2024:** Order Management System completed
  - ✅ Order history page implemented (`/orders`)
  - ✅ Order detail page implemented (`/orders/[code]`)
  - ✅ GraphQL queries added (GET_ORDERS, GET_ORDER_BY_CODE)
  - ✅ Order history page tests written (12 comprehensive tests)
  - ✅ Order detail page tests written (15 comprehensive tests)
  - ✅ Backend order management documentation tests written
  - ✅ All order management tests following TDD principles
  - ✅ Fixed test bugs (text matching, pagination format, date formatting)
- **January 3, 2025:** Phase 1 Completion - Missing Test Suites Added
  - ✅ Payment handler tests written (src/plugins/payment-handler.test.ts - 22 tests)
  - ✅ Order creation integration tests written (src/plugins/order-creation.test.ts - 30 tests)
  - ✅ Product search tests written (storefront/components/__tests__/SearchBar.test.tsx - 24 tests)
  - ✅ All backend tests passing (52 tests total)
  - ✅ Phase 1 marked as 100% complete
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
- [x] Product catalog fully functional (search, filter, sort, pagination, collections)
- [x] Shopping cart UI implemented
- [x] Checkout flow UI implemented
- [x] CartPage tests written and passing
- [x] AddressForm tests written and passing
- [x] **CheckoutPage tests written and passing (25 tests)**
- [x] ProductDetailPage tests written and passing
- [x] All storefront tests passing
- [ ] Backend payment handler tests
- [x] Order management UI (OrderHistoryPage, OrderDetailPage)
- [x] Order management tests (27 tests total)
- [x] Backend payment handler tests (payment-handler.test.ts - 22 tests)
- [x] Backend order creation tests (order-creation.test.ts - 30 tests)
- [x] Product search tests (SearchBar.test.tsx - 24 tests)
- [x] Customer account management
  - [x] Customer registration page and tests (RegisterPage.test.tsx - complete)
  - [x] Customer login page and tests (LoginPage.test.tsx - complete)
  - [x] Customer logout functionality (LogoutPage.test.tsx - complete)
  - [x] Email verification flow (VerifyEmailPage.test.tsx - complete)
  - [x] Customer account/profile page (AccountPage.test.tsx - complete with address management)

---

**Note:** This roadmap is a living document. Update it as requirements change or new insights are gained during development.

