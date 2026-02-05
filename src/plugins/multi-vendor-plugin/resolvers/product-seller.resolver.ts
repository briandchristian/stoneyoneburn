/**
 * Product Seller Field Resolver
 *
 * Exposes seller information on Product type in Shop API.
 * Phase 5.2: Multi-Seller Cart - Seller information display
 *
 * This resolver adds a `seller` field to Product that returns the MarketplaceSeller
 * who owns the product, allowing the storefront to display seller information
 * and group cart items by seller.
 */

import { Resolver, ResolveField, Root } from '@nestjs/graphql';
import type { RequestContext } from '@vendure/core';
import { Ctx, Allow, Permission, Product } from '@vendure/core';
import { MarketplaceSeller } from '../entities/seller.entity';
import { SellerService } from '../services/seller.service';

/**
 * Product Seller Field Resolver
 *
 * Adds a `seller` field to Product type in Shop API.
 * This field is public and can be queried by anyone.
 */
@Resolver(() => Product)
export class ProductSellerResolver {
  constructor(private sellerService: SellerService) {}

  /**
   * Resolve seller field on Product
   *
   * Returns the MarketplaceSeller who owns this product.
   * Returns null if the product has no seller assigned.
   *
   * @param ctx - Request context
   * @param product - Product entity
   * @returns MarketplaceSeller or null
   *
   * @example GraphQL Query:
   * ```graphql
   * query {
   *   product(slug: "example-product") {
   *     id
   *     name
   *     seller {
   *       id
   *       shopName
   *       shopSlug
   *     }
   *   }
   * }
   * ```
   */
  @ResolveField(() => MarketplaceSeller, {
    nullable: true,
    description: 'The marketplace seller who owns this product',
  })
  @Allow(Permission.Public)
  async seller(
    @Ctx() ctx: RequestContext,
    @Root() product: Product
  ): Promise<MarketplaceSeller | null> {
    // Check if product has seller custom field
    const customFields = product.customFields as Record<string, unknown> | null | undefined;
    if (!customFields || !customFields.seller) {
      return null;
    }

    // Get seller ID (handle both object with id property and direct ID)
    const sellerObj = customFields.seller as { id?: string } | string | number | null | undefined;
    const rawId =
      typeof sellerObj === 'object' && sellerObj !== null && 'id' in sellerObj
        ? sellerObj.id
        : sellerObj;

    if (rawId == null || (typeof rawId !== 'string' && typeof rawId !== 'number')) {
      return null;
    }

    // Convert to number if string (ID is string | number in Vendure)
    const sellerIdNum: number = typeof rawId === 'string' ? parseInt(rawId, 10) : (rawId as number);

    // Fetch seller from service
    const seller = await this.sellerService.findMarketplaceSellerById(ctx, sellerIdNum);

    return seller;
  }
}
