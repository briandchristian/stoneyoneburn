/**
 * MarketplaceSeller Entity
 *
 * Represents a marketplace seller/vendor (different from Vendure's built-in Seller entity).
 * Each marketplace seller is associated with one Customer account and can manage products and orders.
 *
 * This entity is part of Phase 2.1: Multi-Vendor Core Plugin
 *
 * NOTE: Named MarketplaceSeller to avoid conflict with Vendure's built-in Seller entity
 */

import { Entity, Column, ManyToOne, Index, Unique, Check } from 'typeorm';
import { ObjectType, Field, registerEnumType } from '@nestjs/graphql';
import type { ID, DeepPartial } from '@vendure/core';
import { VendureEntity } from '@vendure/core';
import { Customer } from '@vendure/core';

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

// Register enum with GraphQL
registerEnumType(SellerVerificationStatus, {
  name: 'SellerVerificationStatus',
  description: 'Verification status of a seller account',
});

/**
 * MarketplaceSeller Entity
 *
 * Represents a marketplace seller in the multi-vendor platform. Each marketplace seller:
 * - Is linked to exactly one Customer account
 * - Has a unique shop name and slug
 * - Has a verification status (pending, verified, rejected, suspended)
 * - Can have optional business information for tax/payout purposes
 */
@Entity('marketplace_seller')
@ObjectType('MarketplaceSeller')
@Index(['customerId'])
@Index(['shopSlug'])
@Index(['verificationStatus'])
@Unique(['customerId']) // One seller per customer
@Unique(['shopSlug']) // Unique shop slugs
@Check(`"shopName" IS NOT NULL AND LENGTH("shopName") >= 3 AND LENGTH("shopName") <= 100`)
@Check(`"shopSlug" IS NOT NULL AND LENGTH("shopSlug") >= 3 AND LENGTH("shopSlug") <= 100`)
@Check(`"commissionRate" >= 0 AND "commissionRate" <= 100`)
export class MarketplaceSeller extends VendureEntity {
  // Public constructor required for TypeORM and Vendure plugin registration
  // We use repository.create() in services to avoid decorator metadata issues
  constructor(input?: DeepPartial<MarketplaceSeller>) {
    super(input);
  }

  /**
   * One-to-One relationship with Customer
   * Each seller is associated with exactly one customer account
   */
  @ManyToOne(() => Customer, { nullable: false, onDelete: 'CASCADE' })
  @Index()
  customer: Customer;

  @Column()
  @Field(() => String)
  customerId: ID;

  /**
   * Verification status of the seller account
   * Default: PENDING
   */
  @Column({
    type: 'varchar',
    length: 20,
    default: SellerVerificationStatus.PENDING,
  })
  @Field(() => SellerVerificationStatus)
  verificationStatus: SellerVerificationStatus;

  /**
   * Shop name (display name)
   * Required, 3-100 characters
   */
  @Column({ length: 100 })
  @Field()
  shopName: string;

  /**
   * Shop slug (URL-friendly identifier)
   * Required, 3-100 characters, alphanumeric and hyphens only
   * Unique across all sellers
   */
  @Column({ length: 100 })
  @Field()
  shopSlug: string;

  /**
   * Optional shop description/mission statement
   */
  @Column({ type: 'text', nullable: true })
  @Field({ nullable: true })
  shopDescription?: string;

  /**
   * Optional banner image asset ID
   */
  @Column({ type: 'int', nullable: true })
  @Field(() => String, { nullable: true })
  shopBannerAssetId?: ID;

  /**
   * Optional logo image asset ID
   */
  @Column({ type: 'int', nullable: true })
  @Field(() => String, { nullable: true })
  shopLogoAssetId?: ID;

  /**
   * Optional legal business name (for tax purposes)
   */
  @Column({ length: 200, nullable: true })
  @Field({ nullable: true })
  businessName?: string;

  /**
   * Optional tax identification number
   * Should be encrypted at rest in production
   */
  @Column({ length: 100, nullable: true })
  @Field({ nullable: true })
  taxId?: string;

  /**
   * External payment account ID (e.g., Stripe Connect account)
   */
  @Column({ length: 200, nullable: true })
  @Field({ nullable: true })
  paymentAccountId?: string;

  /**
   * Whether the seller account is active
   * Default: true
   */
  @Column({ default: true })
  @Field()
  isActive: boolean;

  /**
   * Platform commission rate percentage (0-100)
   * Default: platform default (can be configured per seller)
   */
  @Column({ type: 'decimal', precision: 5, scale: 2, default: 10.0 })
  @Field(() => Number)
  commissionRate: number;
}
