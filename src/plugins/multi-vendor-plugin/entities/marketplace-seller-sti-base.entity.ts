/**
 * MarketplaceSeller STI Base Entity
 *
 * Base entity class for TypeORM Single Table Inheritance (STI).
 * This is separate from the GraphQL interface (MarketplaceSellerBase)
 * to allow proper TypeORM STI setup while maintaining code-first GraphQL.
 *
 * Part of Phase 2.3: Polymorphic Seller Types
 */

import { Entity, TableInheritance, Column, ManyToOne, Index, type DeepPartial } from 'typeorm';
import { VendureEntity } from '@vendure/core';
import type { ID } from '@vendure/core';
import { Customer } from '@vendure/core';
import { SellerType, SellerVerificationStatus } from './marketplace-seller-base.entity';

/**
 * MarketplaceSellerSTIBase
 *
 * Base entity class for TypeORM Single Table Inheritance.
 * IndividualSeller and CompanySeller extend this class.
 *
 * NOTE: For TypeORM STI, ALL common fields must be in the base class
 * with proper @Column() decorators. Child entities only define type-specific fields.
 *
 * NOTE: This is a concrete class (not abstract) because TypeORM/Vendure
 * requires concrete classes in the entities array. This class should
 * never be instantiated directly - only IndividualSeller and CompanySeller
 * should be used.
 *
 * NOTE: This is separate from MarketplaceSellerBase (GraphQL interface)
 * because TypeORM STI requires an @Entity() decorated base class,
 * while GraphQL interfaces use @InterfaceType() on abstract classes.
 */
@Entity('marketplace_seller')
@TableInheritance({ column: { type: 'varchar', name: 'sellerType' } })
@Index(['customerId'])
export class MarketplaceSellerSTIBase extends VendureEntity {
  constructor(input?: DeepPartial<MarketplaceSellerSTIBase>) {
    super(input);
  }

  /**
   * Discriminator column for TypeORM STI
   * This is managed automatically by TypeORM based on @ChildEntity() decorator
   * NOTE: Child entities override this with their own @Column() decorator
   */
  @Column({
    type: 'varchar',
    length: 20,
    default: SellerType.INDIVIDUAL,
    insert: false,
    update: false,
  })
  sellerType!: SellerType;

  /**
   * Associated customer account
   * Common to both IndividualSeller and CompanySeller
   */
  @ManyToOne(() => Customer, { nullable: false, onDelete: 'CASCADE' })
  customer!: Customer;

  @Column({ type: 'int' })
  customerId!: ID;

  /**
   * Shop display name (common to both types)
   */
  @Column({ type: 'varchar', length: 100 })
  name!: string;

  /**
   * Email address (common to both types)
   */
  @Column({ type: 'varchar', length: 200 })
  email!: string;

  /**
   * Verification status (common to both types)
   */
  @Column({
    type: 'varchar',
    length: 20,
    default: SellerVerificationStatus.PENDING,
  })
  verificationStatus!: SellerVerificationStatus;

  /**
   * Whether account is active (common to both types)
   */
  @Column({ type: 'boolean', default: true })
  isActive!: boolean;

  /**
   * Commission rate for this seller (0.0 to 1.0, e.g., 0.15 = 15%)
   * If null, uses the default commission rate
   * Part of Phase 3.1: Commission Configuration
   */
  @Column({ type: 'float', nullable: true })
  commissionRate?: number;

  /**
   * Timestamps (inherited from VendureEntity but need explicit columns for STI)
   */
  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt!: Date;

  @Column({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
    onUpdate: 'CURRENT_TIMESTAMP',
  })
  updatedAt!: Date;
}
