/**
 * Review Service
 *
 * Service for managing product reviews and seller ratings.
 * Part of Phase 4: Reviews & Ratings System
 *
 * Features:
 * - Create reviews with validation
 * - Verify purchase requirements
 * - Query reviews with filtering and pagination
 * - Review moderation (approve/reject)
 * - Seller rating aggregation
 */

import { Injectable } from '@nestjs/common';
import type { ID, RequestContext } from '@vendure/core';
import { TransactionalConnection, Order as OrderEntity } from '@vendure/core';
import { Review, ReviewStatus } from '../entities/review.entity';

/**
 * Review creation input
 */
export interface CreateReviewInput {
  productId: ID;
  customerId: ID;
  sellerId: number;
  rating: number;
  title: string;
  body: string;
}

/**
 * Review list options
 */
export interface ReviewListOptions {
  productId?: ID;
  sellerId?: number;
  customerId?: ID;
  status?: ReviewStatus;
  skip?: number;
  take?: number;
}

/**
 * Review list result
 */
export interface ReviewListResult {
  items: Review[];
  totalItems: number;
}

/**
 * Seller rating result
 */
export interface SellerRatingResult {
  averageRating: number;
  totalReviews: number;
}

/**
 * Review Service
 *
 * Manages product reviews and seller ratings
 */
@Injectable()
export class ReviewService {
  constructor(private connection: TransactionalConnection) {}

  /**
   * Create a review for a product
   *
   * Validates input, checks for duplicate reviews, and verifies purchase
   * to determine if review should be marked as verified.
   *
   * @param ctx RequestContext
   * @param input Review creation input
   * @returns Created review entity
   * @throws Error if validation fails or duplicate review exists
   */
  async createReview(ctx: RequestContext, input: CreateReviewInput): Promise<Review> {
    // Validate rating
    if (input.rating < 1 || input.rating > 5) {
      throw new Error('Rating must be between 1 and 5');
    }

    // Validate title
    if (!input.title || input.title.trim().length === 0) {
      throw new Error('Title is required');
    }

    // Validate body
    if (!input.body || input.body.trim().length === 0) {
      throw new Error('Body is required');
    }

    // Check for existing review
    const repository = this.connection.getRepository(ctx, Review);
    const existingReview = await repository.findOne({
      where: {
        productId: input.productId.toString(),
        customerId: input.customerId.toString(),
      },
    });

    if (existingReview) {
      throw new Error('Customer has already reviewed this product');
    }

    // Verify purchase
    const verified = await this.verifyPurchase(ctx, input.customerId, input.productId);

    // Create review
    const review = repository.create({
      productId: input.productId.toString(),
      customerId: input.customerId.toString(),
      sellerId: input.sellerId,
      rating: input.rating,
      title: input.title.trim(),
      body: input.body.trim(),
      status: ReviewStatus.PENDING,
      verified,
      helpfulCount: 0,
    });

    return repository.save(review);
  }

  /**
   * Verify if a customer has purchased a product
   *
   * Checks if the customer has any settled orders containing the product.
   *
   * @param ctx RequestContext
   * @param customerId Customer ID
   * @param productId Product ID
   * @returns True if customer purchased the product
   */
  private async verifyPurchase(
    ctx: RequestContext,
    customerId: ID,
    productId: ID
  ): Promise<boolean> {
    const orderRepository = this.connection.getRepository(ctx, OrderEntity);

    // Find all settled orders for this customer
    const orders = await orderRepository.find({
      where: {
        customerId: customerId.toString(),
        state: 'PaymentSettled',
      },
      relations: ['lines', 'lines.productVariant', 'lines.productVariant.product'],
    });

    // Check if any order contains the product
    if (orders && Array.isArray(orders)) {
      for (const order of orders) {
        if (order.lines && Array.isArray(order.lines)) {
          for (const line of order.lines) {
            if (line.productVariant?.productId === productId.toString()) {
              return true;
            }
          }
        }
      }
    }

    return false;
  }

  /**
   * Get reviews with filtering and pagination
   *
   * @param ctx RequestContext
   * @param options Review list options
   * @returns Review list result
   */
  async getReviews(ctx: RequestContext, options: ReviewListOptions): Promise<ReviewListResult> {
    const repository = this.connection.getRepository(ctx, Review);
    const queryBuilder = repository.createQueryBuilder('review');

    // Filter by product ID
    if (options.productId) {
      queryBuilder.where('review.productId = :productId', {
        productId: options.productId.toString(),
      });
    }

    // Filter by seller ID
    if (options.sellerId !== undefined) {
      if (options.productId) {
        queryBuilder.andWhere('review.sellerId = :sellerId', { sellerId: options.sellerId });
      } else {
        queryBuilder.where('review.sellerId = :sellerId', { sellerId: options.sellerId });
      }
    }

    // Filter by customer ID
    if (options.customerId) {
      const whereClause =
        options.productId || options.sellerId !== undefined ? 'andWhere' : 'where';
      queryBuilder[whereClause]('review.customerId = :customerId', {
        customerId: options.customerId.toString(),
      });
    }

    // Filter by status (default to APPROVED for public queries)
    const status = options.status ?? ReviewStatus.APPROVED;
    const statusWhereClause =
      options.productId || options.sellerId !== undefined || options.customerId
        ? 'andWhere'
        : 'where';
    queryBuilder[statusWhereClause]('review.status = :status', { status });

    // Pagination
    if (options.skip !== undefined) {
      queryBuilder.skip(options.skip);
    }
    if (options.take !== undefined) {
      queryBuilder.take(options.take);
    }

    // Order by creation date (newest first)
    queryBuilder.orderBy('review.createdAt', 'DESC');

    // Execute query
    const [items, totalItems] = await queryBuilder.getManyAndCount();

    return {
      items,
      totalItems,
    };
  }

  /**
   * Approve a review
   *
   * @param ctx RequestContext
   * @param reviewId Review ID
   * @returns Approved review entity
   * @throws Error if review not found
   */
  async approveReview(ctx: RequestContext, reviewId: ID): Promise<Review> {
    const repository = this.connection.getRepository(ctx, Review);
    const review = await repository.findOne({
      where: { id: reviewId },
    });

    if (!review) {
      throw new Error('Review not found');
    }

    review.status = ReviewStatus.APPROVED;
    return repository.save(review);
  }

  /**
   * Reject a review
   *
   * @param ctx RequestContext
   * @param reviewId Review ID
   * @param rejectionReason Reason for rejection
   * @returns Rejected review entity
   * @throws Error if review not found
   */
  async rejectReview(ctx: RequestContext, reviewId: ID, rejectionReason: string): Promise<Review> {
    const repository = this.connection.getRepository(ctx, Review);
    const review = await repository.findOne({
      where: { id: reviewId },
    });

    if (!review) {
      throw new Error('Review not found');
    }

    review.status = ReviewStatus.REJECTED;
    review.rejectionReason = rejectionReason;
    return repository.save(review);
  }

  /**
   * Get seller rating aggregation
   *
   * Calculates average rating and total review count for a seller.
   * Only includes approved reviews.
   *
   * @param ctx RequestContext
   * @param sellerId Seller ID
   * @returns Seller rating result
   */
  async getSellerRating(ctx: RequestContext, sellerId: number): Promise<SellerRatingResult> {
    const repository = this.connection.getRepository(ctx, Review);
    const queryBuilder = repository
      .createQueryBuilder('review')
      .select('AVG(review.rating)', 'averageRating')
      .addSelect('COUNT(review.id)', 'totalReviews')
      .where('review.sellerId = :sellerId', { sellerId })
      .andWhere('review.status = :status', { status: ReviewStatus.APPROVED });

    const result = await queryBuilder.getRawMany();

    if (result.length === 0 || !result[0].averageRating) {
      return {
        averageRating: 0,
        totalReviews: 0,
      };
    }

    return {
      averageRating: parseFloat(result[0].averageRating) || 0,
      totalReviews: parseInt(result[0].totalReviews, 10) || 0,
    };
  }
}
