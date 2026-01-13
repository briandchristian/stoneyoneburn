# Polymorphic MarketplaceSeller Implementation Summary

## Problem Solved

**Original Issue:** Schema-first union types (`MarketplaceSeller | SellerRegistrationError`) caused "Must provide valid Document AST" errors because Vendure parses schema strings before NestJS decorators register types.

**Solution:** Implemented code-first polymorphic GraphQL interface pattern using `@InterfaceType()` and `@ObjectType()` decorators. This avoids schema parsing issues entirely.

## Implementation Overview

### Files Created

1. **`entities/marketplace-seller-base.entity.ts`**
   - Abstract base class with `@InterfaceType('MarketplaceSeller')`
   - Contains type resolution logic in `resolveType` function
   - Defines common fields: `id`, `name`, `email`, `isActive`, `verificationStatus`, `createdAt`, `updatedAt`
   - Exports `SellerType` enum for discriminator

2. **`entities/individual-seller.entity.ts`**
   - Concrete implementation with `@ObjectType('IndividualSeller')`
   - TypeORM `@Entity('marketplace_seller')` with STI discriminator
   - Fields: `firstName`, `lastName`, `birthDate`
   - Implements `MarketplaceSellerBase` interface

3. **`entities/company-seller.entity.ts`**
   - Concrete implementation with `@ObjectType('CompanySeller')`
   - TypeORM `@Entity('marketplace_seller')` with STI discriminator
   - Fields: `companyName`, `vatNumber`, `legalForm`
   - Implements `MarketplaceSellerBase` interface

4. **`resolvers/marketplace-seller.resolver.ts`**
   - GraphQL resolver for polymorphic queries
   - `@Query(() => MarketplaceSellerBase)` - returns interface type
   - `seller(id: ID!)` - get single seller (returns IndividualSeller or CompanySeller)
   - `sellers` - get all sellers (returns array of polymorphic types)
   - Ensures class instances are returned (critical for type resolution)

5. **`services/seller.service.ts`** (updated)
   - Added `findSellerById()` - returns polymorphic type
   - Added `findAllSellers()` - returns array of polymorphic types
   - Supports both IndividualSeller and CompanySeller repositories

6. **`multi-vendor.plugin.ts`** (updated)
   - Registers both `IndividualSeller` and `CompanySeller` entities
   - Registers `MarketplaceSellerResolver`
   - Minimal schema string (only declares Query extensions)
   - Types auto-discovered from decorators

## Key Technical Decisions

### 1. TypeORM Single Table Inheritance (STI)

**Why STI?**
- Single table is simpler for queries (no JOINs needed)
- All seller types share most fields (name, email, verificationStatus, etc.)
- Discriminator column (`sellerType`) distinguishes types
- Efficient for reads and writes

**Implementation:**
```typescript
@Entity('marketplace_seller')
@TableInheritance({ column: { type: 'varchar', name: 'sellerType' } })
@ChildEntity(SellerType.INDIVIDUAL)
@ObjectType('IndividualSeller', {
  implements: () => MarketplaceSellerBase,
})
export class IndividualSeller extends VendureEntity implements MarketplaceSellerBase { ... }
```

### 2. Code-First GraphQL (Not Schema-First)

**Why Code-First?**
- Avoids schema parsing issues in Vendure plugins
- Types are registered by decorators before schema extension
- Better TypeScript type safety
- IDE autocompletion support

**Implementation:**
```typescript
@InterfaceType('MarketplaceSeller', {
  resolveType: (value: any) => {
    if (value.sellerType === SellerType.INDIVIDUAL) return 'IndividualSeller';
    if (value.sellerType === SellerType.COMPANY) return 'CompanySeller';
    return null;
  },
})
export abstract class MarketplaceSellerBase { ... }
```

### 3. Type Resolution Strategy

**NestJS GraphQL Pattern:**
- Type resolution in `@InterfaceType()` decorator (not `@ResolveType()`)
- Returns type name strings (not class constructors)
- Checks multiple strategies: `constructor.name`, `sellerType` discriminator, type-specific fields

**Critical:** Always return class instances from resolvers (not plain objects). TypeORM returns instances by default, but raw queries require conversion.

## GraphQL Query Examples

### Basic Query

```graphql
query {
  seller(id: "1") {
    id
    name
    email
    isActive
    ... on IndividualSeller {
      firstName
      lastName
      birthDate
    }
    ... on CompanySeller {
      companyName
      vatNumber
      legalForm
    }
  }
}
```

### Using Fragments

```graphql
fragment IndividualSellerFields on IndividualSeller {
  firstName
  lastName
  birthDate
}

fragment CompanySellerFields on CompanySeller {
  companyName
  vatNumber
  legalForm
}

query GetSeller($id: ID!) {
  seller(id: $id) {
    id
    name
    email
    ... on IndividualSeller {
      ...IndividualSellerFields
    }
    ... on CompanySeller {
      ...CompanySellerFields
    }
  }
}
```

## Vendure-Specific Considerations

### 1. Plugin Initialization Order

**Problem:** Vendure parses schema strings before decorators register types.

**Solution:** Use code-first decorators (`@ObjectType()`, `@InterfaceType()`) instead of schema strings. Only use schema strings for Query/Mutation extensions (which reference already-registered types).

### 2. Entity Registration

**Important:** Register both concrete entities (`IndividualSeller`, `CompanySeller`) in the plugin:

```typescript
entities: [IndividualSeller, CompanySeller],
```

TypeORM STI requires both child entities to be registered.

### 3. Custom Fields

For Customer entity custom field relation, use one of the concrete types (TypeORM will handle the polymorphic nature):

```typescript
config.customFields.Customer.push({
  entity: IndividualSeller, // Use one of the concrete implementations
  // TypeORM STI will handle polymorphic queries automatically
});
```

## Migration from Legacy MarketplaceSeller

If migrating from the old `MarketplaceSeller` entity:

1. **Database Migration:**
   ```sql
   ALTER TABLE marketplace_seller 
   ADD COLUMN sellerType VARCHAR(20) DEFAULT 'INDIVIDUAL',
   ADD COLUMN firstName VARCHAR(100),
   ADD COLUMN lastName VARCHAR(100),
   ADD COLUMN birthDate DATE,
   ADD COLUMN companyName VARCHAR(200),
   ADD COLUMN vatNumber VARCHAR(100),
   ADD COLUMN legalForm VARCHAR(50);
   ```

2. **Data Migration:**
   - Migrate existing records to IndividualSeller (default)
   - Or classify based on existing `businessName` field (if present = CompanySeller)

3. **Code Migration:**
   - Update all references from `MarketplaceSeller` to `MarketplaceSellerBase`
   - Update queries to use polymorphic resolver
   - Update TypeORM repositories to use concrete types

4. **Backward Compatibility:**
   - Keep legacy `MarketplaceSeller` entity temporarily
   - Service methods can handle both during migration
   - Gradually migrate to new polymorphic system

## Testing Checklist

- [ ] Test `seller(id)` query returns IndividualSeller
- [ ] Test `seller(id)` query returns CompanySeller
- [ ] Test `sellers` query returns array with both types
- [ ] Test fragment queries work correctly
- [ ] Test type resolution with class instances
- [ ] Test type resolution with plain objects (database fallback)
- [ ] Test creating IndividualSeller via service
- [ ] Test creating CompanySeller via service
- [ ] Test TypeORM STI discriminator column behavior
- [ ] Test GraphQL schema generation includes interface and implementations

## Production Readiness Checklist

- [ ] Add database migration for sellerType column
- [ ] Add indexes on sellerType discriminator column
- [ ] Add validation for seller-specific fields
- [ ] Add proper error handling for invalid seller types
- [ ] Add integration tests for polymorphic queries
- [ ] Document API changes in GraphQL schema documentation
- [ ] Update frontend/client code to use new queries
- [ ] Consider backward compatibility period
- [ ] Add monitoring/logging for type resolution failures

## Gotchas & Tips

1. **Always Return Class Instances:** GraphQL type resolution requires class instances. Use `Object.assign(new IndividualSeller(), plainObject)` if needed.

2. **Discriminator Column:** TypeORM manages `sellerType` automatically with STI. Don't manually set it unless necessary.

3. **Type Resolution Order:** Check `constructor.name` first (most reliable), then discriminator, then type-specific fields.

4. **Fragment Type Safety:** Use GraphQL codegen tools (gql.tada, graphql-codegen) for TypeScript type safety with fragments.

5. **Vendure Schema Strings:** Keep minimal - only declare Query/Mutation extensions. Types come from decorators.

## Next Steps

1. Write comprehensive tests for polymorphic type resolution
2. Create database migration for sellerType column
3. Update service methods to handle polymorphic types properly
4. Add validation for seller-specific fields (firstName/lastName for Individual, companyName/vatNumber for Company)
5. Implement seller registration mutations that accept type-specific inputs
6. Add GraphQL schema documentation for new types
7. Update frontend code to use new polymorphic queries

## Files Modified

- ✅ `entities/marketplace-seller-base.entity.ts` (new)
- ✅ `entities/individual-seller.entity.ts` (new)
- ✅ `entities/company-seller.entity.ts` (new)
- ✅ `resolvers/marketplace-seller.resolver.ts` (new)
- ✅ `services/seller.service.ts` (updated - added polymorphic methods)
- ✅ `multi-vendor.plugin.ts` (updated - registered new entities/resolvers)
- ✅ `index.ts` (updated - exported new types)

## Files NOT Modified (Backward Compatibility)

- ⚠️ `entities/seller.entity.ts` (legacy - kept for backward compatibility)
- ⚠️ `resolvers/seller.resolver.ts` (legacy - still works with old MarketplaceSeller)

This allows gradual migration without breaking existing functionality.
