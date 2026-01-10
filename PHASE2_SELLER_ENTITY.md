# Phase 2.1: Seller Entity Schema Design

## Overview

The Seller entity represents vendors in our multi-vendor marketplace. Each seller is associated with a Customer account and can manage their own products and shop.

## Entity Schema Design

### Core Fields

- **id**: `ID!` - Unique identifier (Vendure standard)
- **createdAt**: `DateTime!` - Creation timestamp (Vendure standard)
- **updatedAt**: `DateTime!` - Last update timestamp (Vendure standard)
- **customerId**: `ID!` - Reference to Customer entity (one-to-one relationship)
- **customer**: `Customer!` - Customer relationship object

### Verification Status

- **verificationStatus**: `SellerVerificationStatus!` - Current verification state
  - `PENDING` - Initial state, awaiting verification
  - `VERIFIED` - Approved and can sell
  - `REJECTED` - Verification failed
  - `SUSPENDED` - Temporarily suspended by admin

### Shop Information

- **shopName**: `String!` - Display name of the seller's shop
- **shopSlug**: `String!` - URL-friendly identifier (unique)
- **shopDescription**: `String` - Optional shop description/mission statement
- **shopBannerAssetId**: `ID` - Optional banner image asset
- **shopLogoAssetId**: `ID` - Optional logo image asset

### Business Information

- **businessName**: `String` - Legal business name (optional, for tax purposes)
- **taxId**: `String` - Tax identification number (optional, encrypted)
- **paymentAccountId**: `String` - External payment account ID (e.g., Stripe Connect account)

### Status & Settings

- **isActive**: `Boolean!` - Whether seller account is active (default: true)
- **commissionRate**: `Float!` - Platform commission percentage (0-100, default: platform default)

### Relationships

- **One-to-One**: Seller ↔ Customer (each customer can have at most one seller account)
- **One-to-Many**: Seller → Products (products will have a sellerId field in Phase 2.3)
- **One-to-Many**: Seller → Channels (sellers can have their own sales channels)

### Constraints

1. **Unique Constraints**:
   - `shopSlug` must be unique across all sellers
   - `customerId` must be unique (one seller per customer)

2. **Validation Rules**:
   - `shopName`: Required, 3-100 characters
   - `shopSlug`: Required, 3-100 characters, alphanumeric and hyphens only, URL-safe
   - `verificationStatus`: Required, must be valid enum value
   - `commissionRate`: Must be between 0 and 100

3. **Indexes**:
   - Index on `customerId` for fast lookups
   - Index on `shopSlug` for fast shop page lookups
   - Index on `verificationStatus` for filtering verified sellers

### Database Considerations

- Soft deletes: Not needed (sellers can be deactivated via `isActive`)
- Timestamps: Handled by Vendure base entity
- Encrypted fields: `taxId` should be encrypted at rest
- Audit trail: Vendure's HistoryEntry will track changes

## Implementation Approach

1. Create Seller entity extending Vendure's base `VendureEntity`
2. Define `SellerVerificationStatus` enum
3. Create custom fields in Vendure config for Customer-Seller relationship
4. Generate TypeORM migration
5. Register entity in multi-vendor plugin

## Future Enhancements (Not in Phase 2.1)

- Seller ratings aggregation
- Payout history
- Seller analytics metrics
- Document uploads for verification
- Multi-currency support
