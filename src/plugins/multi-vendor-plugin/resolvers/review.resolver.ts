/**
 * Review Resolver
 *
 * GraphQL resolver for product review operations (Shop API).
 * Part of Phase 4: Reviews & Ratings System
 *
 * This resolver provides:
 * - submitReview: Mutation for customers to submit product reviews
 * - getReviews: Query for retrieving product reviews
 */

import {
  Resolver,
  Query,
  Mutation,
  Args,
  ID,
  Int,
  InputType,
  Field,
  ObjectType,
} from '@nestjs/graphql';
import type { RequestContext } from '@vendure/core';
import { Ctx, Allow, Permission } from '@vendure/core';
import { ReviewService, CreateReviewInput } from '../services/review.service';
import { SellerService } from '../services/seller.service';
import { ProductOwnershipService } from '../services/product-ownership.service';
import { Review, ReviewStatus } from '../entities/review.entity';

/**
 * Input for submitting a review
 */
@InputType()
export class SubmitReviewInput {
  @Field(() => ID)
  productId!: string;

  @Field(() => Int)
  rating!: number;

  @Field(() => String)
  title!: string;

  @Field(() => String)
  body!: string;
}

/**
 * Input for querying reviews
 */
@InputType()
export class ReviewListOptionsInput {
  @Field(() => ID, { nullable: true })
  productId?: string;

  @Field(() => Int, { nullable: true })
  sellerId?: number;

  @Field(() => ID, { nullable: true })
  customerId?: string;

  @Field(() => ReviewStatus, { nullable: true })
  status?: ReviewStatus;

  @Field(() => Int, { nullable: true })
  skip?: number;

  @Field(() => Int, { nullable: true })
  take?: number;
}

/**
 * Review list result
 */
@ObjectType()
export class ReviewList {
  @Field(() => [Review])
  items!: Review[];

  @Field(() => Int)
  totalItems!: number;
}

/**
 * Review Resolver
 *
 * Handles product review submissions and queries
 */
@Resolver()
export class ReviewResolver {
  constructor(
    private reviewService: ReviewService,
    private sellerService: SellerService,
    private productOwnershipService: ProductOwnershipService
  ) {}

  /**
   * Submit a review for a product
   *
   * Requires authentication. Automatically verifies purchase and sets seller ID.
   *
   * @param ctx RequestContext
   * @param input Review submission input
   * @returns Created review entity
   * @throws Error if user not authenticated, product seller not found, or validation fails
   */
  @Mutation()
  @Allow(Permission.Owner)
  async submitReview(
    @Ctx() ctx: RequestContext,
    @Args('input') input: SubmitReviewInput
  ): Promise<Review> {
    // Check authentication
    if (!ctx.activeUserId) {
      throw new Error('You must be logged in to submit a review');
    }

    // Get seller ID for the product
    const sellerIdStr = await this.productOwnershipService.getProductSellerId(ctx, input.productId);

    if (!sellerIdStr) {
      throw new Error('Product seller not found');
    }

    // Convert seller ID to number (sellerId is stored as number in Review entity)
    const sellerId = parseInt(sellerIdStr.toString(), 10);

    // Create review input
    const createInput: CreateReviewInput = {
      productId: input.productId,
      customerId: ctx.activeUserId.toString(),
      sellerId,
      rating: input.rating,
      title: input.title,
      body: input.body,
    };

    // Create review (service handles purchase verification and validation)
    return this.reviewService.createReview(ctx, createInput);
  }

  /**
   * Get reviews for products
   *
   * Supports filtering by product, seller, customer, and status.
   * Defaults to showing only APPROVED reviews for public queries.
   *
   * @param ctx RequestContext
   * @param options Review list options
   * @returns Review list result
   */
  @Query()
  @Allow(Permission.Public)
  async getReviews(
    @Ctx() ctx: RequestContext,
    @Args('options') options: ReviewListOptionsInput
  ): Promise<ReviewList> {
    // Default to APPROVED status for public queries if not specified
    const status = options.status ?? ReviewStatus.APPROVED;

    // Convert input to service options
    const serviceOptions = {
      productId: options.productId,
      sellerId: options.sellerId,
      customerId: options.customerId,
      status,
      skip: options.skip,
      take: options.take,
    };

    const result = await this.reviewService.getReviews(ctx, serviceOptions);

    return {
      items: result.items,
      totalItems: result.totalItems,
    };
  }
}
