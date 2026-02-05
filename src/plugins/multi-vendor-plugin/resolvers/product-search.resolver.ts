/**
 * Product Search Resolver
 *
 * GraphQL resolver for product search and filtering by seller.
 * Part of Phase 5.3: Search & Discovery
 *
 * Provides queries for:
 * - Filtering products by seller ID
 * - Searching products by term with seller filter
 */

import { Args, Query, Resolver, InputType, Field, ID, Int, ObjectType } from '@nestjs/graphql';
import type { RequestContext } from '@vendure/core';
import { Ctx, Product } from '@vendure/core';
import { ProductSearchService } from '../services/product-search.service';

/**
 * GraphQL Input Types
 */
@InputType()
export class ProductSearchOptionsInput {
  @Field(() => Int, { nullable: true, defaultValue: 0 })
  skip?: number;

  @Field(() => Int, { nullable: true, defaultValue: 25 })
  take?: number;

  /** Phase 5.3: Minimum price in smallest currency unit (e.g. cents). */
  @Field(() => Int, { nullable: true })
  minPrice?: number;

  /** Phase 5.3: Maximum price in smallest currency unit (e.g. cents). */
  @Field(() => Int, { nullable: true })
  maxPrice?: number;
}

/**
 * GraphQL Result Types
 */
@ObjectType()
export class ProductSearchList {
  @Field(() => [Product])
  items!: Product[];

  @Field(() => Int)
  totalItems!: number;
}

/**
 * Product Search Resolver
 *
 * Provides GraphQL queries for product search and filtering by seller
 */
@Resolver()
export class ProductSearchResolver {
  constructor(private productSearchService: ProductSearchService) {}

  /**
   * Get products filtered by seller (public query)
   *
   * Returns paginated list of enabled products for a specific seller.
   *
   * @example
   * query {
   *   productsBySeller(sellerId: "1", options: { skip: 0, take: 10 }) {
   *     items {
   *       id
   *       name
   *       slug
   *     }
   *     totalItems
   *   }
   * }
   */
  @Query(() => ProductSearchList, { name: 'productsBySeller' })
  async productsBySeller(
    @Ctx() ctx: RequestContext,
    @Args('sellerId', { type: () => ID }) sellerId: string,
    @Args('options', { nullable: true, type: () => ProductSearchOptionsInput })
    options?: ProductSearchOptionsInput
  ): Promise<ProductSearchList> {
    const result = await this.productSearchService.filterProductsBySeller(ctx, sellerId, {
      skip: options?.skip ?? 0,
      take: options?.take ?? 25,
      minPrice: options?.minPrice,
      maxPrice: options?.maxPrice,
    });

    return {
      items: result.items,
      totalItems: result.totalItems,
    };
  }

  /**
   * Search products by term and filter by seller (public query)
   *
   * Searches product name and description for the given term,
   * filtered by seller ID. Returns only enabled products.
   *
   * @example
   * query {
   *   searchBySeller(
   *     sellerId: "1"
   *     searchTerm: "widget"
   *     options: { skip: 0, take: 10 }
   *   ) {
   *     items {
   *       id
   *       name
   *       slug
   *     }
   *     totalItems
   *   }
   * }
   */
  @Query(() => ProductSearchList, { name: 'searchBySeller' })
  async searchBySeller(
    @Ctx() ctx: RequestContext,
    @Args('sellerId', { type: () => ID }) sellerId: string,
    @Args('searchTerm') searchTerm: string,
    @Args('options', { nullable: true, type: () => ProductSearchOptionsInput })
    options?: ProductSearchOptionsInput
  ): Promise<ProductSearchList> {
    const result = await this.productSearchService.searchProductsBySeller(
      ctx,
      sellerId,
      searchTerm,
      {
        skip: options?.skip ?? 0,
        take: options?.take ?? 25,
        minPrice: options?.minPrice,
        maxPrice: options?.maxPrice,
      }
    );

    return {
      items: result.items,
      totalItems: result.totalItems,
    };
  }
}
