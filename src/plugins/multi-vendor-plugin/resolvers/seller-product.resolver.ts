/**
 * Seller Product Resolver
 *
 * GraphQL resolver for seller product listing.
 * Provides queries to list products by seller.
 *
 * Part of Phase 2.3: Seller-Product Association
 */

import { Resolver, Query, Args, ID } from '@nestjs/graphql';
import type { RequestContext } from '@vendure/core';
import { Ctx, Allow, Permission, Product, TransactionalConnection } from '@vendure/core';

/**
 * Seller Product Resolver
 *
 * Handles queries for seller product listings.
 *
 * @example GraphQL Query:
 * ```graphql
 * query {
 *   sellerProducts(sellerId: "1") {
 *     id
 *     name
 *     slug
 *     enabled
 *   }
 * }
 * ```
 */
@Resolver(() => Product)
export class SellerProductResolver {
  constructor(private connection: TransactionalConnection) {}

  /**
   * Get products for a seller
   *
   * Returns a list of products belonging to the specified seller.
   * Products are filtered by sellerId using the custom field.
   *
   * @param ctx - Request context
   * @param sellerId - Seller ID
   * @returns Array of products for the seller
   */
  @Query(() => [Product], {
    description: 'Get all products for a seller',
  })
  @Allow(Permission.Public) // Public access - anyone can view products from verified sellers
  async sellerProducts(
    @Ctx() ctx: RequestContext,
    @Args('sellerId', { type: () => ID }) sellerId: string
  ): Promise<Product[]> {
    // Query products filtered by sellerId custom field
    // Using TypeORM's custom field column name: customFieldsSellerid
    const sellerIdNum = parseInt(sellerId, 10);
    const products = await this.connection
      .getRepository(ctx, Product)
      .createQueryBuilder('product')
      .where('product.customFieldsSellerid = :sellerId', { sellerId: sellerIdNum })
      .getMany();

    return products;
  }
}
