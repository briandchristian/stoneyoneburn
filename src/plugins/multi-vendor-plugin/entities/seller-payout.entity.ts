/**
 * Seller Payout Entity
 *
 * Entity for tracking seller payouts from orders.
 * Part of Phase 3.2: Split Payment Processing
 *
 * This entity tracks:
 * - Payout amounts for each seller from each order
 * - Payout status (HOLD, PENDING, PROCESSING, COMPLETED, FAILED)
 * - Commission deducted
 * - Timestamps for lifecycle tracking
 */

import { Entity, Column, ManyToOne, Index } from 'typeorm';
import { VendureEntity } from '@vendure/core';
import type { ID } from '@vendure/core';
import { ObjectType, Field, ID as GraphQLID } from '@nestjs/graphql';
import { MarketplaceSeller } from './seller.entity';

/**
 * Payout status enum
 */
export enum PayoutStatus {
  PENDING = 'PENDING', // Ready to be processed
  HOLD = 'HOLD', // Held in escrow until fulfillment
  PROCESSING = 'PROCESSING', // Currently being processed
  COMPLETED = 'COMPLETED', // Successfully paid out
  FAILED = 'FAILED', // Payment failed
}

/**
 * Seller Payout Entity
 *
 * Tracks payouts to sellers from order payments.
 * Supports escrow/holding funds until fulfillment.
 */
@Entity('seller_payout')
@ObjectType()
@Index(['sellerId'])
@Index(['orderId'])
@Index(['status'])
@Index(['sellerId', 'status'])
export class SellerPayout extends VendureEntity {
  constructor(input?: any) {
    super(input);
  }
  /**
   * Associated seller
   */
  @ManyToOne(() => MarketplaceSeller, { nullable: false, onDelete: 'CASCADE' })
  seller!: MarketplaceSeller;

  @Column({ type: 'int' })
  @Field(() => GraphQLID)
  sellerId!: ID;

  /**
   * Order ID this payout is from
   */
  @Column({ type: 'varchar', length: 100 })
  @Field(() => GraphQLID)
  orderId!: ID;

  /**
   * Payout amount in cents
   */
  @Column({ type: 'int' })
  @Field(() => Number)
  amount!: number;

  /**
   * Commission deducted in cents
   */
  @Column({ type: 'int', default: 0 })
  @Field(() => Number)
  commission!: number;

  /**
   * Payout status
   */
  @Column({
    type: 'varchar',
    length: 20,
    default: PayoutStatus.HOLD,
  })
  @Field(() => String)
  status!: PayoutStatus;

  /**
   * When payout was released from HOLD
   */
  @Column({ type: 'timestamp', nullable: true })
  @Field(() => Date, { nullable: true })
  releasedAt?: Date;

  /**
   * When payout was completed
   */
  @Column({ type: 'timestamp', nullable: true })
  @Field(() => Date, { nullable: true })
  completedAt?: Date;

  /**
   * Failure reason if status is FAILED
   */
  @Column({ type: 'text', nullable: true })
  @Field(() => String, { nullable: true })
  failureReason?: string;
}
