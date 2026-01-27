/**
 * Review Admin Resolver
 *
 * GraphQL resolver for review moderation operations (Admin API).
 * Part of Phase 4: Reviews & Ratings System
 *
 * This resolver provides:
 * - approveReview: Mutation for admins to approve pending reviews
 * - rejectReview: Mutation for admins to reject reviews with reason
 * - pendingReviews: Query for admins to view pending reviews for moderation
 */

import { Resolver, Query, Mutation, Args, ID, ObjectType, Field } from '@nestjs/graphql';
import type { RequestContext } from '@vendure/core';
import { Ctx, Allow, Permission } from '@vendure/core';
import { ReviewService, ReviewListResult } from '../services/review.service';
import { Review, ReviewStatus } from '../entities/review.entity';

/**
 * Review list result for Admin API
 */
@ObjectType()
export class ReviewList {
  @Field(() => [Review])
  items!: Review[];

  @Field(() => Number)
  totalItems!: number;
}

/**
 * Review Admin Resolver
 *
 * Handles review moderation operations for administrators
 */
@Resolver()
export class ReviewAdminResolver {
  constructor(private reviewService: ReviewService) {}

  /**
   * Approve a pending review
   * Transitions review from PENDING to APPROVED status
   *
   * @param ctx RequestContext
   * @param reviewId Review ID
   * @returns Approved review entity
   * @throws Error if review not found
   */
  @Mutation()
  @Allow(Permission.UpdateProduct)
  async approveReview(
    @Ctx() ctx: RequestContext,
    @Args('reviewId', { type: () => ID }) reviewId: string
  ): Promise<Review> {
    return this.reviewService.approveReview(ctx, reviewId);
  }

  /**
   * Reject a review
   * Transitions review from PENDING to REJECTED status with rejection reason
   *
   * @param ctx RequestContext
   * @param reviewId Review ID
   * @param rejectionReason Reason for rejection
   * @returns Rejected review entity
   * @throws Error if review not found
   */
  @Mutation()
  @Allow(Permission.UpdateProduct)
  async rejectReview(
    @Ctx() ctx: RequestContext,
    @Args('reviewId', { type: () => ID }) reviewId: string,
    @Args('rejectionReason', { type: () => String }) rejectionReason: string
  ): Promise<Review> {
    return this.reviewService.rejectReview(ctx, reviewId, rejectionReason);
  }

  /**
   * Get pending reviews for moderation
   * Returns all reviews with PENDING status
   *
   * @param ctx RequestContext
   * @returns Review list result
   */
  @Query()
  @Allow(Permission.ReadProduct)
  async pendingReviews(@Ctx() ctx: RequestContext): Promise<ReviewList> {
    const result: ReviewListResult = await this.reviewService.getReviews(ctx, {
      status: ReviewStatus.PENDING,
    });

    return {
      items: result.items,
      totalItems: result.totalItems,
    };
  }
}
