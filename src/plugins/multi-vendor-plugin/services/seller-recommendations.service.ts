/**
 * Seller Recommendations Service
 *
 * Service for recommending sellers to users.
 * Phase 5.3: Seller Recommendations
 *
 * Provides methods for:
 * - Recommending sellers based on ratings
 * - Recommending popular sellers
 * - Recommending recently verified sellers
 */

import { Injectable } from '@nestjs/common';
import type { RequestContext } from '@vendure/core';
import { TransactionalConnection } from '@vendure/core';
import { MarketplaceSeller } from '../entities/seller.entity';
import { ReviewService } from './review.service';

/**
 * Options for seller recommendations
 */
export interface SellerRecommendationsOptions {
  limit?: number;
}

/**
 * Seller recommendation with rating
 */
export interface SellerRecommendation extends MarketplaceSeller {
  rating?: {
    averageRating: number;
    totalReviews: number;
  } | null;
}

/**
 * Seller Recommendations Service
 *
 * Handles recommending sellers to users
 */
@Injectable()
export class SellerRecommendationsService {
  constructor(
    private connection: TransactionalConnection,
    private reviewService: ReviewService
  ) {}

  /**
   * Get recommended sellers
   *
   * Returns sellers sorted by rating (highest rated first).
   * Only includes verified and active sellers.
   *
   * @param ctx Request context
   * @param options Recommendation options
   * @returns List of recommended sellers with ratings
   */
  async getRecommendedSellers(
    ctx: RequestContext,
    options: SellerRecommendationsOptions = {}
  ): Promise<SellerRecommendation[]> {
    const { limit = 10 } = options;

    const repository = this.connection.getRepository(ctx, MarketplaceSeller);
    const queryBuilder = repository.createQueryBuilder('seller');

    // Only verified and active sellers
    queryBuilder.where('seller.verificationStatus = :status', { status: 'VERIFIED' });
    queryBuilder.andWhere('seller.isActive = :isActive', { isActive: true });

    // Order by creation date (newest first) as a simple recommendation strategy
    // In a more sophisticated implementation, this could be based on:
    // - Average rating
    // - Number of orders
    // - Recent activity
    queryBuilder.orderBy('seller.createdAt', 'DESC');

    // Limit results
    queryBuilder.limit(limit);

    const sellers = await queryBuilder.getMany();

    // Enrich with ratings
    const sellersWithRatings = await Promise.all(
      sellers.map(async (seller) => {
        // Convert ID (string | number) to number for getSellerRating
        const sellerIdNum = typeof seller.id === 'string' ? parseInt(seller.id, 10) : seller.id;
        const rating = await this.reviewService.getSellerRating(ctx, sellerIdNum);
        return {
          ...seller,
          rating: rating || null,
        } as SellerRecommendation;
      })
    );

    // Sort by rating (highest first), then by total reviews
    sellersWithRatings.sort((a, b) => {
      const ratingA = a.rating?.averageRating || 0;
      const ratingB = b.rating?.averageRating || 0;
      const reviewsA = a.rating?.totalReviews || 0;
      const reviewsB = b.rating?.totalReviews || 0;

      // First sort by rating
      if (ratingA !== ratingB) {
        return ratingB - ratingA;
      }
      // Then by number of reviews
      return reviewsB - reviewsA;
    });

    return sellersWithRatings;
  }
}
