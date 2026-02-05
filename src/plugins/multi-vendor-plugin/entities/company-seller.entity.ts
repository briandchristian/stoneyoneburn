/**
 * CompanySeller Entity
 *
 * Concrete implementation of MarketplaceSeller for company/business sellers.
 * Uses code-first GraphQL with @ObjectType() implementing the MarketplaceSeller interface.
 */

import { Column, ChildEntity, Index } from 'typeorm';
import { ObjectType, Field, registerEnumType } from '@nestjs/graphql';
import type { ID, DeepPartial } from '@vendure/core';
import type { DeepPartial as TypeOrmDeepPartial } from 'typeorm';
import type { MarketplaceSellerSTIBase as STIBase } from './marketplace-seller-sti-base.entity';
import {
  MarketplaceSellerBase,
  SellerType,
  SellerVerificationStatus,
} from './marketplace-seller-base.entity';
import { MarketplaceSellerSTIBase } from './marketplace-seller-sti-base.entity';

/**
 * Legal form types for company registration
 */
export enum CompanyLegalForm {
  LLC = 'LLC',
  INC = 'INC',
  CORPORATION = 'CORPORATION',
  PARTNERSHIP = 'PARTNERSHIP',
  SOLE_PROPRIETORSHIP = 'SOLE_PROPRIETORSHIP',
  OTHER = 'OTHER',
}

registerEnumType(CompanyLegalForm, {
  name: 'CompanyLegalForm',
  description: 'Legal form of a company seller',
});

/**
 * CompanySeller
 *
 * Represents a company/business selling on the marketplace.
 * Stores business information like company name, VAT number, and legal form.
 *
 * Database Strategy: Single Table Inheritance (STI)
 * All seller types share the same table with a discriminator column.
 *
 * @example GraphQL Fragment:
 * ```graphql
 * fragment CompanySellerFields on CompanySeller {
 *   companyName
 *   vatNumber
 *   legalForm
 * }
 * ```
 */
@ChildEntity(SellerType.COMPANY)
@ObjectType('CompanySeller', {
  description: 'Company/business selling on the marketplace',
  implements: () => MarketplaceSellerBase,
})
@Index(['customerId'])
export class CompanySeller extends MarketplaceSellerSTIBase implements MarketplaceSellerBase {
  constructor(input?: DeepPartial<CompanySeller>) {
    super(input as TypeOrmDeepPartial<STIBase> | undefined);
    // Always set discriminator - required for TypeORM STI
    this.sellerType = SellerType.COMPANY;
  }

  /**
   * Common fields inherited from MarketplaceSellerSTIBase (with @Column() decorators):
   * - sellerType, customer, customerId, name, email, verificationStatus, isActive, createdAt, updatedAt
   *
   * These are defined in the base class for TypeORM STI.
   * We add @Field() decorators here for GraphQL only (NOT @Column() - that would duplicate).
   */
  @Field(() => String, { description: 'Customer ID' })
  declare customerId: ID;

  @Field(() => String, { description: 'Display name for the seller shop' })
  declare name: string;

  @Field(() => String, { description: 'Email address of the seller' })
  declare email: string;

  @Field(() => SellerVerificationStatus, {
    description: 'Verification status of the seller account',
  })
  declare verificationStatus: SellerVerificationStatus;

  @Field(() => Boolean, { description: 'Whether the seller account is active' })
  declare isActive: boolean;

  @Field(() => Date, { description: 'Creation timestamp' })
  declare createdAt: Date;

  @Field(() => Date, { description: 'Last update timestamp' })
  declare updatedAt: Date;

  @Field(() => Number, {
    nullable: true,
    description:
      'Commission rate for this seller (0.0 to 1.0, e.g., 0.15 = 15%). If null, uses default rate.',
  })
  declare commissionRate?: number;

  /**
   * Legal company name (registered business name)
   */
  @Column({ length: 200 })
  @Field(() => String, {
    description: 'Legal registered name of the company',
  })
  companyName!: string;

  /**
   * VAT/Tax identification number
   * Should be encrypted at rest in production
   */
  @Column({ length: 100 })
  @Field(() => String, {
    description: 'VAT or Tax Identification Number',
  })
  vatNumber!: string;

  /**
   * Legal form of the company (LLC, INC, etc.)
   */
  @Column({ type: 'varchar', length: 50, nullable: true })
  @Field(() => String, {
    nullable: true,
    description: 'Legal form of the company (LLC, INC, Corporation, etc.)',
  })
  legalForm?: string;
}
