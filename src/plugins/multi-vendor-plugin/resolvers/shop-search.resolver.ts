/**
 * Shop Search Resolver
 *
 * GraphQL resolver for searching shops (sellers).
 * Phase 5.1: Shop Search Functionality
 *
 * Provides queries for:
 * - Searching shops by name or description
 * - Filtering by verification status
 * - Pagination support
 */

import { Resolver, Query, Args, Int, InputType, Field, ObjectType } from '@nestjs/graphql';
import type { RequestContext } from '@vendure/core';
import { Ctx, Allow, Permission } from '@vendure/core';
import { MarketplaceSeller } from '../entities/seller.entity';
import { ShopSearchService } from '../services/shop-search.service';

/**
 * GraphQL Input Types
 */
@InputType()
export class ShopSearchOptionsInput {
  @Field(() => Int, { nullable: true, defaultValue: 0 })
  skip?: number;

  @Field(() => Int, { nullable: true, defaultValue: 25 })
  take?: number;

  @Field({ nullable: true, defaultValue: false })
  verifiedOnly?: boolean;

  /** Phase 5.3: Minimum average rating (1-5). Only shops with approved reviews meeting this threshold. */
  @Field(() => Int, { nullable: true })
  minRating?: number;
}

/**
 * GraphQL Result Types
 */
@ObjectType()
export class ShopSearchList {
  @Field(() => [MarketplaceSeller])
  items!: MarketplaceSeller[];

  @Field(() => Int)
  totalItems!: number;
}

/**
 * Shop Search Resolver
 *
 * Provides GraphQL queries for searching shops
 */
@Resolver()
export class ShopSearchResolver {
  constructor(private shopSearchService: ShopSearchService) {}

  /**
   * Search shops by name or description (public query)
   *
   * Returns paginated list of shops matching the search term.
   * Searches both shop name and description fields.
   *
   * @example
   * query {
   *   searchShops(searchTerm: "handmade", options: { skip: 0, take: 10, verifiedOnly: true }) {
   *     items {
   *       id
   *       shopName
   *       shopSlug
   *       shopDescription
   *       rating {
   *         averageRating
   *         totalReviews
   *       }
   *     }
   *     totalItems
   *   }
   * }
   */
  @Query(() => ShopSearchList, { name: 'searchShops' })
  @Allow(Permission.Public)
  async searchShops(
    @Ctx() ctx: RequestContext,
    @Args('searchTerm') searchTerm: string,
    @Args('options', { nullable: true, type: () => ShopSearchOptionsInput })
    options?: ShopSearchOptionsInput
  ): Promise<ShopSearchList> {
    const result = await this.shopSearchService.searchShops(ctx, searchTerm, {
      skip: options?.skip ?? 0,
      take: options?.take ?? 25,
      verifiedOnly: options?.verifiedOnly ?? false,
      minRating: options?.minRating,
    });

    return {
      items: result.items,
      totalItems: result.totalItems,
    };
  }
}
