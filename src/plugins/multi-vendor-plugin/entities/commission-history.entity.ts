/**
 * Commission History Entity
 *
 * Entity for tracking commission calculations and payments.
 * Part of Phase 3.1: Commission Configuration
 *
 * This entity tracks:
 * - Commission calculations for each order
 * - Commission rate used (per-seller or default)
 * - Order details (order ID, order total, commission amount, seller payout)
 * - Status (calculated, paid, refunded)
 * - Timestamps for audit trail
 */

import { Entity, Column, ManyToOne, Index, Check } from 'typeorm';
import { VendureEntity } from '@vendure/core';
import type { ID } from '@vendure/core';
import { ObjectType, Field, ID as GraphQLID, registerEnumType } from '@nestjs/graphql';
import { MarketplaceSeller } from './seller.entity';

/**
 * Commission History Status Enum
 */
export enum CommissionHistoryStatus {
  CALCULATED = 'CALCULATED', // Commission calculated but not yet paid
  PAID = 'PAID', // Commission paid to platform
  REFUNDED = 'REFUNDED', // Commission refunded (order cancelled/refunded)
}

// Register enum with GraphQL
registerEnumType(CommissionHistoryStatus, {
  name: 'CommissionHistoryStatus',
  description: 'Status of commission history record',
});

/**
 * Commission History Entity
 *
 * Tracks commission calculations and payments for audit trail and reporting.
 */
@Entity('commission_history')
@ObjectType()
@Index('IDX_commission_history_sellerId', ['sellerId'])
@Index('IDX_commission_history_orderId', ['orderId'])
@Index('IDX_commission_history_status', ['status'])
@Index('IDX_commission_history_sellerId_status', ['sellerId', 'status'])
@Index('IDX_commission_history_createdAt', ['createdAt'])
@Check('CHK_commission_history_commissionRate', `"commissionRate" >= 0 AND "commissionRate" <= 1`)
@Check('CHK_commission_history_orderTotal', `"orderTotal" >= 0`)
@Check('CHK_commission_history_commissionAmount', `"commissionAmount" >= 0`)
@Check('CHK_commission_history_sellerPayout', `"sellerPayout" >= 0`)
@Check('CHK_commission_history_amounts', `"commissionAmount" + "sellerPayout" = "orderTotal"`)
export class CommissionHistory extends VendureEntity {
  constructor(input?: any) {
    super(input);
  }

  /**
   * Order ID this commission is from
   * Note: Stored as string to match Vendure's ID format
   * We don't create a foreign key relationship to avoid type conflicts
   */
  @Column('varchar', { length: 100 })
  @Field(() => GraphQLID)
  orderId!: string;

  /**
   * Associated seller
   */
  @ManyToOne(() => MarketplaceSeller, { nullable: false, onDelete: 'CASCADE' })
  seller!: MarketplaceSeller;

  @Column({ type: 'int' })
  @Field(() => GraphQLID)
  sellerId!: ID;

  /**
   * Commission rate used (0.0 to 1.0, e.g., 0.15 = 15%)
   */
  @Column({ type: 'decimal', precision: 5, scale: 4 })
  @Field(() => Number)
  commissionRate!: number;

  /**
   * Order total in cents
   */
  @Column({ type: 'int' })
  @Field(() => Number)
  orderTotal!: number;

  /**
   * Commission amount in cents
   */
  @Column({ type: 'int' })
  @Field(() => Number)
  commissionAmount!: number;

  /**
   * Seller payout amount in cents
   */
  @Column({ type: 'int' })
  @Field(() => Number)
  sellerPayout!: number;

  /**
   * Commission status
   */
  @Column({
    type: 'varchar',
    length: 20,
    default: CommissionHistoryStatus.CALCULATED,
  })
  @Field(() => CommissionHistoryStatus)
  status!: CommissionHistoryStatus;
}
