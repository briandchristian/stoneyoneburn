/**
 * Seller Recommendations Resolver
 *
 * GraphQL resolver for seller recommendations.
 * Phase 5.3: Seller Recommendations
 *
 * Provides queries for:
 * - Getting recommended sellers
 */

import { Resolver, Query, Args, Int, InputType, Field } from '@nestjs/graphql';
import type { RequestContext } from '@vendure/core';
import { Ctx, Allow, Permission } from '@vendure/core';
import { MarketplaceSeller } from '../entities/seller.entity';
import { SellerRecommendationsService } from '../services/seller-recommendations.service';

/**
 * GraphQL Input Types
 */
@InputType()
export class SellerRecommendationsOptionsInput {
  @Field(() => Int, { nullable: true, defaultValue: 10 })
  limit?: number;
}

/**
 * Seller Recommendations Resolver
 *
 * Provides GraphQL queries for seller recommendations
 */
@Resolver()
export class SellerRecommendationsResolver {
  constructor(private sellerRecommendationsService: SellerRecommendationsService) {}

  /**
   * Get recommended sellers (public query)
   *
   * Returns a list of recommended sellers sorted by rating.
   * Only includes verified and active sellers.
   *
   * @example
   * query {
   *   recommendedSellers(options: { limit: 5 }) {
   *     id
   *     shopName
   *     shopSlug
   *     shopDescription
   *     rating {
   *       averageRating
   *       totalReviews
   *     }
   *   }
   * }
   */
  @Query(() => [MarketplaceSeller], { name: 'recommendedSellers' })
  @Allow(Permission.Public)
  async recommendedSellers(
    @Ctx() ctx: RequestContext,
    @Args('options', { nullable: true, type: () => SellerRecommendationsOptionsInput })
    options?: SellerRecommendationsOptionsInput
  ): Promise<MarketplaceSeller[]> {
    const result = await this.sellerRecommendationsService.getRecommendedSellers(ctx, {
      limit: options?.limit ?? 10,
    });

    // Return sellers (ratings are already included via field resolver on MarketplaceSeller)
    return result as MarketplaceSeller[];
  }
}
