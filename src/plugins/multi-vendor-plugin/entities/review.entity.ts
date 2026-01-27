/**
 * Review Entity
 *
 * Represents a product review written by a customer.
 * Part of Phase 4: Reviews & Ratings System
 *
 * Features:
 * - Product reviews with 1-5 star ratings
 * - Review moderation (PENDING, APPROVED, REJECTED)
 * - Verified purchase reviews
 * - Helpful vote tracking
 * - Seller rating aggregation
 */

import { Entity, Column, Index } from 'typeorm';
import { ObjectType, Field, ID, Int, registerEnumType } from '@nestjs/graphql';
import { VendureEntity } from '@vendure/core';

/**
 * Review moderation status
 */
export enum ReviewStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

registerEnumType(ReviewStatus, {
  name: 'ReviewStatus',
  description: 'Moderation status of a review',
});

/**
 * Review Entity
 *
 * Stores product reviews written by customers.
 * Reviews are linked to products, customers, and sellers.
 */
@Entity('review')
@ObjectType()
@Index(['productId', 'customerId'], { unique: true }) // One review per customer per product
@Index(['sellerId', 'status']) // For seller rating aggregation
@Index(['productId', 'status']) // For product review display
export class Review extends VendureEntity {
  /**
   * Product ID this review is for
   */
  @Column('varchar')
  @Field(() => ID)
  productId!: string;

  /**
   * Customer ID who wrote the review
   */
  @Column('varchar')
  @Field(() => ID)
  customerId!: string;

  /**
   * Seller ID (for rating aggregation)
   */
  @Column('int')
  @Field(() => Int)
  sellerId!: number;

  /**
   * Rating (1-5 stars)
   * Validation is performed in ReviewService
   */
  @Column('int')
  @Field(() => Int)
  rating!: number;

  /**
   * Review title
   */
  @Column('varchar', { length: 200 })
  @Field(() => String)
  title!: string;

  /**
   * Review body text
   */
  @Column('text')
  @Field(() => String)
  body!: string;

  /**
   * Moderation status
   */
  @Column('varchar', { default: ReviewStatus.PENDING })
  @Field(() => ReviewStatus)
  status: ReviewStatus = ReviewStatus.PENDING;

  /**
   * Whether this is a verified purchase review
   * Only customers who purchased the product can have verified reviews
   */
  @Column('boolean', { default: false })
  @Field(() => Boolean)
  verified: boolean = false;

  /**
   * Number of helpful votes
   * Validation is performed in ReviewService
   */
  @Column('int', { default: 0 })
  @Field(() => Int)
  helpfulCount: number = 0;

  /**
   * Rejection reason (if status is REJECTED)
   */
  @Column('text', { nullable: true })
  @Field(() => String, { nullable: true })
  rejectionReason?: string | null;
}
