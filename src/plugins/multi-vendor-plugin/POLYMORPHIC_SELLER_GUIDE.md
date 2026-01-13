# Polymorphic MarketplaceSeller Implementation Guide

This document explains the code-first polymorphic MarketplaceSeller implementation using GraphQL interfaces and TypeORM Single Table Inheritance (STI).

## Overview

The MarketplaceSeller system uses a polymorphic pattern where:
- **MarketplaceSellerBase** is the GraphQL interface (abstract base class)
- **IndividualSeller** and **CompanySeller** are concrete implementations

This approach avoids schema parsing issues in Vendure plugins by using code-first GraphQL decorators instead of schema strings with union types.

## Architecture

### Database Structure (Single Table Inheritance)

All seller types share the same `marketplace_seller` table with a `sellerType` discriminator column:

```sql
CREATE TABLE marketplace_seller (
  id SERIAL PRIMARY KEY,
  sellerType VARCHAR(20) NOT NULL, -- Discriminator: 'INDIVIDUAL' or 'COMPANY'
  customerId INTEGER NOT NULL,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(200) NOT NULL,
  isActive BOOLEAN DEFAULT true,
  verificationStatus VARCHAR(20) DEFAULT 'PENDING',
  
  -- IndividualSeller fields (nullable for CompanySeller)
  firstName VARCHAR(100),
  lastName VARCHAR(100),
  birthDate DATE,
  
  -- CompanySeller fields (nullable for IndividualSeller)
  companyName VARCHAR(200),
  vatNumber VARCHAR(100),
  legalForm VARCHAR(50),
  
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (customerId) REFERENCES customer(id) ON DELETE CASCADE
);
```

### GraphQL Schema (Auto-generated from decorators)

```graphql
interface MarketplaceSeller {
  id: ID!
  name: String!
  email: String!
  isActive: Boolean!
  verificationStatus: SellerVerificationStatus!
  createdAt: DateTime!
  updatedAt: DateTime!
}

type IndividualSeller implements MarketplaceSeller {
  id: ID!
  name: String!
  email: String!
  isActive: Boolean!
  verificationStatus: SellerVerificationStatus!
  createdAt: DateTime!
  updatedAt: DateTime!
  firstName: String!
  lastName: String!
  birthDate: Date
}

type CompanySeller implements MarketplaceSeller {
  id: ID!
  name: String!
  email: String!
  isActive: Boolean!
  verificationStatus: SellerVerificationStatus!
  createdAt: DateTime!
  updatedAt: DateTime!
  companyName: String!
  vatNumber: String!
  legalForm: String
}

type Query {
  seller(id: ID!): MarketplaceSeller
  sellers: [MarketplaceSeller!]!
}
```

## GraphQL Query Examples

### Basic Query with Type Fragments

```graphql
query {
  seller(id: "1") {
    id
    name
    email
    isActive
    verificationStatus
    
    # Use inline fragments to access type-specific fields
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

### Using Named Fragments

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

fragment MarketplaceSellerFields on MarketplaceSeller {
  id
  name
  email
  isActive
  verificationStatus
  createdAt
  updatedAt
}

query GetSeller($id: ID!) {
  seller(id: $id) {
    ...MarketplaceSellerFields
    ... on IndividualSeller {
      ...IndividualSellerFields
    }
    ... on CompanySeller {
      ...CompanySellerFields
    }
  }
}
```

### Query Multiple Sellers

```graphql
query GetAllSellers {
  sellers {
    id
    name
    email
    ... on IndividualSeller {
      firstName
      lastName
    }
    ... on CompanySeller {
      companyName
      vatNumber
    }
  }
}
```

## Type Resolution (Interface resolveType)

**IMPORTANT:** In NestJS GraphQL (not TypeGraphQL), type resolution for interfaces is handled in the `@InterfaceType()` decorator's `resolveType` option, NOT via `@ResolveType()` decorator.

The type resolution function is defined in `marketplace-seller-base.entity.ts`:

```typescript
@InterfaceType('MarketplaceSeller', {
  description: 'Base interface for marketplace sellers (individual or company)',
  resolveType: (value: any) => {
    // Check if it's a class instance first (most reliable)
    if (value instanceof Object && value.constructor) {
      if (value.constructor.name === 'IndividualSeller') {
        return 'IndividualSeller';
      }
      if (value.constructor.name === 'CompanySeller') {
        return 'CompanySeller';
      }
    }
    
    // Check by discriminator field (for plain objects from database)
    if (value.sellerType === SellerType.INDIVIDUAL) {
      return 'IndividualSeller';
    }
    if (value.sellerType === SellerType.COMPANY) {
      return 'CompanySeller';
    }
    
    // Fallback: check for type-specific fields
    if (value.firstName !== undefined || value.lastName !== undefined) {
      return 'IndividualSeller';
    }
    if (value.companyName !== undefined || value.vatNumber !== undefined) {
      return 'CompanySeller';
    }
    
    return null;
  },
})
```

**Critical Points:**
1. Must return **type name strings** (not class constructors) for NestJS GraphQL
2. Check `constructor.name` first for class instances (most reliable)
3. Check discriminator field (`sellerType`) for plain objects from database
4. Fallback to checking type-specific fields if discriminator is missing
5. Return `null` if type cannot be determined (GraphQL will throw an error)

## Creating Seller Instances

### Creating an IndividualSeller

```typescript
const individualRepo = connection.getRepository(ctx, IndividualSeller);
const seller = individualRepo.create({
  sellerType: SellerType.INDIVIDUAL,
  customerId: customer.id,
  name: 'John\'s Shop',
  email: 'john@example.com',
  firstName: 'John',
  lastName: 'Doe',
  birthDate: new Date('1990-01-01'),
  isActive: true,
  verificationStatus: SellerVerificationStatus.PENDING,
});
await individualRepo.save(seller);
```

### Creating a CompanySeller

```typescript
const companyRepo = connection.getRepository(ctx, CompanySeller);
const seller = companyRepo.create({
  sellerType: SellerType.COMPANY,
  customerId: customer.id,
  name: 'Acme Corp Shop',
  email: 'contact@acme.com',
  companyName: 'Acme Corporation',
  vatNumber: 'US-123456789',
  legalForm: 'LLC',
  isActive: true,
  verificationStatus: SellerVerificationStatus.PENDING,
});
await companyRepo.save(seller);
```

## Vendure Plugin Registration

```typescript
@VendurePlugin({
  imports: [PluginCommonModule],
  // Register BOTH concrete entities for TypeORM STI
  entities: [IndividualSeller, CompanySeller],
  providers: [SellerService],
  shopApiExtensions: {
    resolvers: [MarketplaceSellerResolver],
    // Minimal schema string - only declares Query extensions
    // Types are auto-discovered from decorators
    schema: `
      extend type Query {
        seller(id: ID!): MarketplaceSeller
        sellers: [MarketplaceSeller!]!
      }
    `,
  },
})
export class MultiVendorPlugin {}
```

## Important Gotchas & Tips

### 1. Always Return Class Instances

GraphQL's type resolution requires **class instances**, not plain objects. When fetching from the database, ensure TypeORM returns class instances:

```typescript
// ✅ GOOD: TypeORM returns class instances by default
const seller = await repo.findOne({ where: { id } });
return seller; // This is an IndividualSeller or CompanySeller instance

// ❌ BAD: Raw queries return plain objects
const seller = await queryRunner.query('SELECT * FROM marketplace_seller WHERE id = $1', [id]);
// Must convert to class instance:
return Object.assign(new IndividualSeller(), seller);
```

### 2. TypeORM STI Discriminator Column

The discriminator column (`sellerType`) must be set correctly:

```typescript
@Entity('marketplace_seller')
@TableInheritance({ column: { type: 'varchar', name: 'sellerType' } })
@ChildEntity(SellerType.INDIVIDUAL) // This sets the discriminator value
export class IndividualSeller { ... }
```

### 3. Code-First vs Schema-First in Vendure

- **Code-First**: Types defined with `@ObjectType()`, `@InterfaceType()`, `@InputType()` decorators
- **Schema-First**: Types defined in GraphQL schema strings

For Vendure plugins:
- ✅ Use code-first for **type definitions** (avoid schema parsing issues)
- ✅ Use minimal schema strings only for **Query/Mutation extensions**
- ❌ Avoid union types in schema strings (types aren't registered yet)

### 4. Fragment Type Safety in TypeScript

When using GraphQL codegen tools (like `gql.tada` or `graphql-codegen`), fragments provide type safety:

```typescript
import { graphql } from './graphql';

const sellerQuery = graphql(`
  query GetSeller($id: ID!) {
    seller(id: $id) {
      id
      name
      ... on IndividualSeller {
        firstName
        lastName
      }
      ... on CompanySeller {
        companyName
        vatNumber
      }
    }
  }
`);

// TypeScript knows the return type based on the query
type SellerResult = ResultOf<typeof sellerQuery>;
```

### 5. Migration from Legacy MarketplaceSeller

If migrating from the old `MarketplaceSeller` entity:

1. Add `sellerType` column to existing table
2. Migrate existing records to `IndividualSeller` or `CompanySeller`
3. Update all code references
4. Remove old `MarketplaceSeller` entity

## Testing

```typescript
describe('MarketplaceSellerResolver', () => {
  it('should resolve IndividualSeller type correctly', async () => {
    const seller = await service.findSellerById(ctx, individualSellerId);
    expect(seller).toBeInstanceOf(IndividualSeller);
    expect(seller.sellerType).toBe(SellerType.INDIVIDUAL);
  });

  it('should resolve CompanySeller type correctly', async () => {
    const seller = await service.findSellerById(ctx, companySellerId);
    expect(seller).toBeInstanceOf(CompanySeller);
    expect(seller.sellerType).toBe(SellerType.COMPANY);
  });

  it('should return correct type in GraphQL query', async () => {
    const result = await graphqlClient.query({
      query: GET_SELLER_QUERY,
      variables: { id: individualSellerId },
    });
    
    expect(result.data.seller.__typename).toBe('IndividualSeller');
    expect(result.data.seller.firstName).toBeDefined();
  });
});
```

## Summary

This polymorphic implementation:
- ✅ Uses code-first GraphQL (no schema parsing issues)
- ✅ Supports type-safe queries with fragments
- ✅ Uses TypeORM STI for efficient database storage
- ✅ Works perfectly with Vendure's plugin system
- ✅ Provides proper TypeScript type safety
