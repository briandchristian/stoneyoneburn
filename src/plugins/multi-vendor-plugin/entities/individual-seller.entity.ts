/**
 * IndividualSeller Entity
 *
 * Concrete implementation of MarketplaceSeller for individual/personal sellers.
 * Uses code-first GraphQL with @ObjectType() implementing the MarketplaceSeller interface.
 */

import { Column, ChildEntity, Index } from 'typeorm';
import { ObjectType, Field } from '@nestjs/graphql';
import type { ID, DeepPartial } from '@vendure/core';
import {
  MarketplaceSellerBase,
  SellerType,
  SellerVerificationStatus,
} from './marketplace-seller-base.entity';
import { MarketplaceSellerSTIBase } from './marketplace-seller-sti-base.entity';

/**
 * IndividualSeller
 *
 * Represents an individual person selling on the marketplace.
 * Stores personal information like first name, last name, and birth date.
 *
 * Database Strategy: Single Table Inheritance (STI)
 * All seller types share the same table with a discriminator column.
 *
 * @example GraphQL Fragment:
 * ```graphql
 * fragment IndividualSellerFields on IndividualSeller {
 *   firstName
 *   lastName
 *   birthDate
 * }
 * ```
 */
@ChildEntity(SellerType.INDIVIDUAL)
@ObjectType('IndividualSeller', {
  description: 'Individual person selling on the marketplace',
  implements: () => MarketplaceSellerBase,
})
@Index(['customerId'])
export class IndividualSeller extends MarketplaceSellerSTIBase implements MarketplaceSellerBase {
  constructor(input?: DeepPartial<IndividualSeller>) {
    super(input);
    // Always set discriminator - required for TypeORM STI
    this.sellerType = SellerType.INDIVIDUAL;
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

  /**
   * First name of the individual seller
   */
  @Column({ length: 100 })
  @Field(() => String, { description: 'First name of the individual seller' })
  firstName!: string;

  /**
   * Last name of the individual seller
   */
  @Column({ length: 100 })
  @Field(() => String, { description: 'Last name of the individual seller' })
  lastName!: string;

  /**
   * Date of birth (optional, for age verification/legal compliance)
   */
  @Column({ type: 'date', nullable: true })
  @Field(() => Date, {
    nullable: true,
    description: 'Date of birth for age verification and legal compliance',
  })
  birthDate?: Date;
}
