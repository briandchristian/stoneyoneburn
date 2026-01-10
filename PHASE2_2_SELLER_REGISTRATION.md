# Phase 2.2: Seller Registration & Onboarding

## Overview

This phase implements the seller registration and onboarding workflow, allowing customers to become sellers and create their shops.

## Workflow Design

### 1. Seller Registration Process

**Prerequisites:**
- Customer must be authenticated (logged in)
- Customer must not already have a seller account
- Customer must have a verified email address

**Registration Steps:**
1. Customer submits registration request with:
   - Shop name (3-100 characters)
   - Optional shop description
   - Business information (optional)

2. System validates input:
   - Shop name validation (required, 3-100 chars)
   - Shop slug generation (auto-generated from shop name, URL-safe)
   - Slug uniqueness check

3. System creates Seller entity:
   - Links to current Customer
   - Sets verification status to PENDING
   - Sets default values (isActive: true, commissionRate: 10.0)
   - Generates unique shop slug

4. System sends confirmation email:
   - Welcome email with seller account details
   - Instructions for next steps (verification process)

**GraphQL Mutation:**
```graphql
mutation RegisterAsSeller($input: RegisterSellerInput!) {
  registerAsSeller(input: $input) {
    ... on Seller {
      id
      shopName
      shopSlug
      verificationStatus
    }
    ... on ErrorResult {
      errorCode
      message
    }
  }
}
```

### 2. Shop Creation Process

The shop is automatically created during seller registration. The shop slug is generated from the shop name and made URL-safe and unique.

**Shop Slug Generation:**
- Convert shop name to lowercase
- Replace spaces and special characters with hyphens
- Remove multiple consecutive hyphens
- Ensure minimum length (3 characters)
- Ensure uniqueness (append number if needed)

**Example:**
- "My Awesome Shop!" → "my-awesome-shop"
- "My Awesome Shop!" (if taken) → "my-awesome-shop-2"

### 3. Seller Verification Workflow

**Verification States:**
- `PENDING` - Initial state after registration
- `VERIFIED` - Admin has verified the seller (can list products)
- `REJECTED` - Admin rejected the seller application
- `SUSPENDED` - Admin temporarily suspended the seller

**Admin Actions:**
- Admin can verify sellers through admin dashboard
- Admin can reject sellers (with reason)
- Admin can suspend active sellers

**Note:** Admin verification interface will be in Phase 2.4 (Seller Dashboard Plugin).

### 4. Seller Profile Management

**Updatable Fields:**
- Shop name (requires slug regeneration if changed)
- Shop description
- Shop banner image
- Shop logo image
- Business name
- Tax ID (encrypted)

**GraphQL Mutation:**
```graphql
mutation UpdateSellerProfile($input: UpdateSellerProfileInput!) {
  updateSellerProfile(input: $input) {
    ... on Seller {
      id
      shopName
      shopDescription
      # ... other fields
    }
    ... on ErrorResult {
      errorCode
      message
    }
  }
}
```

### 5. Document Upload for Verification

**Future Enhancement (Not in Phase 2.2):**
- Document upload functionality will be added in a future phase
- For now, verification is manual by admin

## API Design

### Input Types

**RegisterSellerInput:**
```typescript
{
  shopName: string;           // Required, 3-100 chars
  shopDescription?: string;   // Optional
  businessName?: string;      // Optional
}
```

**UpdateSellerProfileInput:**
```typescript
{
  shopName?: string;          // Optional, if provided will regenerate slug
  shopDescription?: string;   // Optional
  shopBannerAssetId?: ID;     // Optional, asset ID
  shopLogoAssetId?: ID;       // Optional, asset ID
  businessName?: string;      // Optional
  taxId?: string;             // Optional
}
```

### Error Codes

**SellerRegistrationError:**
- `CUSTOMER_NOT_FOUND` - Customer doesn't exist
- `CUSTOMER_NOT_AUTHENTICATED` - Not logged in
- `SELLER_ALREADY_EXISTS` - Customer already has a seller account
- `EMAIL_NOT_VERIFIED` - Customer email not verified
- `INVALID_SHOP_NAME` - Shop name validation failed
- `SHOP_SLUG_TAKEN` - Generated shop slug already exists (should be auto-handled)

**SellerUpdateError:**
- `SELLER_NOT_FOUND` - Seller account doesn't exist
- `NOT_SELLER_OWNER` - Not the owner of this seller account
- `INVALID_INPUT` - Input validation failed

## Validation Rules

### Shop Name
- Required
- 3-100 characters
- Cannot be empty or whitespace only
- Trimmed before validation

### Shop Slug
- Auto-generated from shop name
- Must be unique
- URL-safe (lowercase, alphanumeric, hyphens only)
- 3-100 characters
- If collision, append numeric suffix

### Business Information
- All optional
- No special validation in Phase 2.2 (will be added for tax compliance in future)

## Security Considerations

1. **Authentication Required:**
   - All seller operations require authenticated customer
   - Only owner can update their own seller profile

2. **One Seller Per Customer:**
   - Enforced at database level (unique constraint)
   - Checked in service layer before creation

3. **Email Verification:**
   - Customers must verify email before registering as seller
   - Prevents spam/fake accounts

4. **Input Sanitization:**
   - Shop names sanitized before slug generation
   - Prevent XSS in shop descriptions (future: HTML sanitization)

## Database Considerations

- Seller creation is a transaction (atomic)
- Shop slug uniqueness checked before insert
- If collision during insert, transaction rolls back and retry with new slug

## Email Notifications

**Seller Registration Email:**
- Welcome message
- Shop details (name, slug)
- Next steps (verification process)
- Link to seller dashboard (Phase 2.4)

## Future Enhancements

- Document upload for verification (KYC)
- Automated verification workflows
- Seller onboarding wizard/step-by-step guide
- Business license verification
- Multi-language shop descriptions
