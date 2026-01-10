# Phase 2.1: Seller Entity Migration Guide

## Status: ✅ Ready for Migration Generation

**Completed:**
- ✅ Seller entity with GraphQL decorators
- ✅ Multi-Vendor plugin registered
- ✅ Contract tests written (29 tests)
- ✅ All compilation issues resolved

## Generate Migration

```bash
npx vendure migrate
```

**What it does:**
- Analyzes current database schema
- Compares with entity definitions (including Seller)
- Generates migration file in `src/migrations/`

**Verify migration includes:**
- `seller` table with all fields
- Unique constraints: `customerId`, `shopSlug`
- Indexes: `customerId`, `shopSlug`, `verificationStatus`
- Foreign key: `customerId` → `customer.id`
- Check constraints: field lengths, commissionRate range (0-100)

**After generation:**
- Migration runs automatically on server start
- Or review file first, then start server

## Entity Schema

See `PHASE2_SELLER_ENTITY.md` for complete schema details.

**Key fields:**
- Core: id, timestamps, customerId (unique FK), verificationStatus enum
- Shop: shopName, shopSlug (unique), description, banner, logo
- Business: businessName, taxId, paymentAccountId
- Settings: isActive (default: true), commissionRate (default: 10.0)

**Constraints:**
- Unique: customerId, shopSlug
- Check: shopName/shopSlug length (3-100), commissionRate (0-100)
- Indexes: customerId, shopSlug, verificationStatus
