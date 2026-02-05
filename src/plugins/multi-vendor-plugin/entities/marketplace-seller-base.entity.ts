/**
 * MarketplaceSeller Base Entity
 *
 * Abstract base class defining the GraphQL interface for marketplace sellers.
 * Uses code-first GraphQL with @InterfaceType() to avoid schema parsing issues.
 *
 * Part of Phase 2.3: Polymorphic Seller Types (IndividualSeller & CompanySeller)
 */

import { InterfaceType, Field, ID, registerEnumType } from '@nestjs/graphql';
import type { ID as VendureID } from '@vendure/core';
import { Customer } from '@vendure/core';

/**
 * Seller Type Discriminator
 *
 * Used to distinguish between IndividualSeller and CompanySeller in the database
 */
export enum SellerType {
  INDIVIDUAL = 'INDIVIDUAL',
  COMPANY = 'COMPANY',
}

registerEnumType(SellerType, {
  name: 'SellerType',
  description: 'Type of marketplace seller (individual or company)',
});

/**
 * Seller Verification Status
 *
 * Represents the verification state of a seller account.
 */
export enum SellerVerificationStatus {
  PENDING = 'PENDING',
  VERIFIED = 'VERIFIED',
  REJECTED = 'REJECTED',
  SUSPENDED = 'SUSPENDED',
}

registerEnumType(SellerVerificationStatus, {
  name: 'SellerVerificationStatus',
  description: 'Verification status of a marketplace seller account',
});

/**
 * MarketplaceSeller GraphQL Interface
 *
 * Abstract interface defining common fields for all marketplace seller types.
 * This uses @InterfaceType() decorator for code-first GraphQL, avoiding
 * schema string parsing issues in Vendure plugins.
 *
 * @example GraphQL Query:
 * ```graphql
 * query {
 *   seller(id: "1") {
 *     id
 *     name
 *     email
 *     isActive
 *     ... on IndividualSeller {
 *       firstName
 *       lastName
 *       birthDate
 *     }
 *     ... on CompanySeller {
 *       companyName
 *       vatNumber
 *       legalForm
 *     }
 *   }
 * }
 * ```
 */
@InterfaceType('MarketplaceSellerBase', {
  description: 'Base interface for marketplace sellers (individual or company)',
  resolveType: (value: unknown) => {
    // Type resolution function for GraphQL interface
    const v = value as Record<string, unknown> & {
      constructor?: { name: string };
      sellerType?: SellerType;
    };
    // Check if it's a class instance first (most reliable)
    if (v instanceof Object && v.constructor) {
      if (v.constructor.name === 'IndividualSeller') {
        return 'IndividualSeller';
      }
      if (v.constructor.name === 'CompanySeller') {
        return 'CompanySeller';
      }
    }

    // Check by discriminator field (for plain objects from database)
    if (v.sellerType === SellerType.INDIVIDUAL) {
      return 'IndividualSeller';
    }
    if (v.sellerType === SellerType.COMPANY) {
      return 'CompanySeller';
    }

    // Fallback: check for type-specific fields
    if (v.firstName !== undefined || v.lastName !== undefined) {
      return 'IndividualSeller';
    }
    if (v.companyName !== undefined || v.vatNumber !== undefined) {
      return 'CompanySeller';
    }

    return null;
  },
})
export abstract class MarketplaceSellerBase {
  /**
   * Unique identifier
   */
  @Field(() => ID)
  id!: VendureID;

  /**
   * Display name for the seller shop
   */
  @Field(() => String, { description: 'Display name for the seller shop' })
  name!: string;

  /**
   * Email address of the seller
   */
  @Field(() => String, { description: 'Email address of the seller' })
  email!: string;

  /**
   * Whether the seller account is active
   */
  @Field(() => Boolean, { description: 'Whether the seller account is active' })
  isActive!: boolean;

  /**
   * Seller verification status
   */
  @Field(() => SellerVerificationStatus, {
    description: 'Verification status of the seller account',
  })
  verificationStatus!: SellerVerificationStatus;

  /**
   * Creation timestamp
   */
  @Field(() => Date, { description: 'Creation timestamp' })
  createdAt!: Date;

  /**
   * Last update timestamp
   */
  @Field(() => Date, { description: 'Last update timestamp' })
  updatedAt!: Date;

  /**
   * Discriminator field to distinguish seller types
   * This is used internally for type resolution
   */
  sellerType!: SellerType;

  /**
   * Associated customer account
   */
  customer!: Customer;
  customerId!: VendureID;
}
