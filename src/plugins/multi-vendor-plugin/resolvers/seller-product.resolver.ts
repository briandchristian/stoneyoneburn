/**
 * Seller Product Resolver
 *
 * GraphQL resolver for seller product listing with pagination, sorting, and filtering.
 * Provides queries to list products by seller.
 *
 * Part of Phase 2.3: Seller-Product Association
 *
 * Features:
 * - Pagination support (skip, take)
 * - Sorting support (name, createdAt)
 * - Filtering support (enabled status)
 * - Returns ProductList with items and totalItems
 */

import { Resolver, Query, Args, ID } from '@nestjs/graphql';
import type { RequestContext } from '@vendure/core';
import { Ctx, Allow, Permission, Product, TransactionalConnection } from '@vendure/core';

/**
 * ProductListOptions - GraphQL input type for pagination, sorting, and filtering
 * This matches the ProductListOptions type defined in the Vendure GraphQL schema
 */
interface ProductListOptions {
  skip?: number;
  take?: number;
  sort?: {
    name?: 'ASC' | 'DESC';
    createdAt?: 'ASC' | 'DESC';
  };
  filter?: {
    enabled?: {
      eq?: boolean;
    };
  };
}

/**
 * ProductList - GraphQL return type for paginated product lists
 * This matches the ProductList type defined in the Vendure GraphQL schema
 */
interface ProductList {
  items: Product[];
  totalItems: number;
}

/**
 * Seller Product Resolver
 *
 * Handles queries for seller product listings with full pagination support.
 *
 * @example GraphQL Query:
 * ```graphql
 * query {
 *   sellerProducts(sellerId: "1", options: { skip: 0, take: 20, sort: { name: ASC } }) {
 *     items {
 *       id
 *       name
 *       slug
 *       enabled
 *     }
 *     totalItems
 *   }
 * }
 * ```
 */
@Resolver(() => Product)
export class SellerProductResolver {
  constructor(private connection: TransactionalConnection) {}

  /**
   * Get products for a seller with pagination, sorting, and filtering
   *
   * Returns a paginated list of products belonging to the specified seller.
   * Products are filtered by sellerId using the custom field.
   *
   * @param ctx - Request context
   * @param sellerId - Seller ID
   * @param options - Pagination, sorting, and filtering options
   * @returns ProductList with items and totalItems
   */
  @Query(() => 'ProductList' as any, {
    description: 'Get paginated products for a seller',
  })
  @Allow(Permission.Public) // Public access - anyone can view products from verified sellers
  async sellerProducts(
    @Ctx() ctx: RequestContext,
    @Args('sellerId', { type: () => ID }) sellerId: string,
    @Args('options', { type: () => 'ProductListOptions' as any, nullable: true }) options?: ProductListOptions
  ): Promise<ProductList> {
    const sellerIdNum = parseInt(sellerId, 10);

    // Create base query builder with seller filter
    const createBaseQuery = () =>
      this.connection
        .getRepository(ctx, Product)
        .createQueryBuilder('product')
        .where('product.customFieldsSellerid = :sellerId', { sellerId: sellerIdNum });

    // Build query for items with pagination, sorting, and filtering
    const itemsQuery = createBaseQuery();
    this.applyPagination(itemsQuery, options);
    this.applySorting(itemsQuery, options);
    this.applyFiltering(itemsQuery, options);

    // Build query for count (without pagination/sorting, but with filtering)
    const countQuery = createBaseQuery();
    this.applyFiltering(countQuery, options);

    // Execute both queries in parallel
    const [items, totalItems] = await Promise.all([
      itemsQuery.getMany(),
      countQuery.getCount(),
    ]);

    return {
      items,
      totalItems,
    };
  }

  /**
   * Apply pagination to query builder
   */
  private applyPagination(queryBuilder: any, options?: ProductListOptions): void {
    if (options?.skip !== undefined) {
      queryBuilder.skip(options.skip);
    }
    if (options?.take !== undefined) {
      queryBuilder.take(options.take);
    }
  }

  /**
   * Apply sorting to query builder
   */
  private applySorting(queryBuilder: any, options?: ProductListOptions): void {
    if (!options?.sort) {
      return;
    }

    if (options.sort.name) {
      queryBuilder.orderBy('product.name', options.sort.name);
    } else if (options.sort.createdAt) {
      queryBuilder.orderBy('product.createdAt', options.sort.createdAt);
    }
  }

  /**
   * Apply filtering to query builder
   */
  private applyFiltering(queryBuilder: any, options?: ProductListOptions): void {
    if (!options?.filter) {
      return;
    }

    if (options.filter.enabled?.eq !== undefined) {
      queryBuilder.andWhere('product.enabled = :enabled', { enabled: options.filter.enabled.eq });
    }
  }
}
