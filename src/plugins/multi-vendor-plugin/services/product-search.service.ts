/**
 * Product Search Service
 *
 * Service for searching and filtering products by seller.
 * Part of Phase 5.3: Search & Discovery
 *
 * This service provides methods for:
 * - Filtering products by seller ID
 * - Searching products by term with seller filter
 * - Combining seller filter with pagination
 */

import { Injectable } from '@nestjs/common';
import type { RequestContext } from '@vendure/core';
import { TransactionalConnection, Product } from '@vendure/core';

/**
 * Options for product search/filter
 */
export interface ProductSearchOptions {
  skip?: number;
  take?: number;
  /** Phase 5.3: Minimum price in smallest currency unit (e.g. cents). Filters products with at least one variant in range. */
  minPrice?: number;
  /** Phase 5.3: Maximum price in smallest currency unit (e.g. cents). Filters products with at least one variant in range. */
  maxPrice?: number;
}

/**
 * Result for product search/filter query
 */
export interface ProductSearchResult {
  items: Product[];
  totalItems: number;
}

/**
 * Product Search Service
 *
 * Handles product search and filtering by seller
 */
@Injectable()
export class ProductSearchService {
  constructor(private connection: TransactionalConnection) {}

  /**
   * Filter products by seller ID
   *
   * Returns only enabled products belonging to the specified seller.
   *
   * @param ctx Request context
   * @param sellerId Seller ID
   * @param options Pagination options
   * @returns Paginated list of products
   */
  async filterProductsBySeller(
    ctx: RequestContext,
    sellerId: string | number,
    options: ProductSearchOptions = {}
  ): Promise<ProductSearchResult> {
    const { skip = 0, take = 25, minPrice, maxPrice } = options;
    const parsedSellerId = typeof sellerId === 'string' ? parseInt(sellerId, 10) : sellerId;

    const productRepository = this.connection.getRepository(ctx, Product);
    const queryBuilder = productRepository
      .createQueryBuilder('product')
      .where('product.customFieldsSellerid = :sellerId', { sellerId: parsedSellerId })
      .andWhere('product.enabled = :enabled', { enabled: true });

    // Phase 5.3: Filter by price range (products with at least one variant in range for current channel)
    if ((minPrice != null && minPrice >= 0) || (maxPrice != null && maxPrice >= 0)) {
      if (ctx.channelId) {
        const conditions: string[] = ['pvp."channelId" = :channelId'];
        const params: Record<string, number | string> = { channelId: ctx.channelId };
        if (minPrice != null && minPrice >= 0) {
          conditions.push('pvp.price >= :minPrice');
          params.minPrice = minPrice;
        }
        if (maxPrice != null && maxPrice >= 0) {
          conditions.push('pvp.price <= :maxPrice');
          params.maxPrice = maxPrice;
        }
        queryBuilder.andWhere(
          `product.id IN (
          SELECT pv."productId" FROM product_variant pv
          INNER JOIN product_variant_price pvp ON pvp."variantId" = pv.id
          WHERE ${conditions.join(' AND ')}
        )`,
          params
        );
      }
    }

    queryBuilder.orderBy('product.createdAt', 'DESC').skip(skip).take(take);

    const [items, totalItems] = await queryBuilder.getManyAndCount();

    return { items, totalItems };
  }

  /**
   * Search products by term and filter by seller
   *
   * Searches product name and description for the given term,
   * filtered by seller ID. Returns only enabled products.
   *
   * @param ctx Request context
   * @param sellerId Seller ID
   * @param searchTerm Search term (searches name and description)
   * @param options Pagination options
   * @returns Paginated list of matching products
   */
  async searchProductsBySeller(
    ctx: RequestContext,
    sellerId: string | number,
    searchTerm: string,
    options: ProductSearchOptions = {}
  ): Promise<ProductSearchResult> {
    const { skip = 0, take = 25, minPrice, maxPrice } = options;
    const parsedSellerId = typeof sellerId === 'string' ? parseInt(sellerId, 10) : sellerId;

    const productRepository = this.connection.getRepository(ctx, Product);
    const queryBuilder = productRepository
      .createQueryBuilder('product')
      .where('product.customFieldsSellerid = :sellerId', { sellerId: parsedSellerId })
      .andWhere('product.enabled = :enabled', { enabled: true })
      .andWhere('(product.name ILIKE :searchTerm OR product.description ILIKE :searchTerm)', {
        searchTerm: `%${searchTerm}%`,
      });

    // Phase 5.3: Filter by price range (same logic as filterProductsBySeller)
    if ((minPrice != null && minPrice >= 0) || (maxPrice != null && maxPrice >= 0)) {
      if (ctx.channelId) {
        const conditions: string[] = ['pvp."channelId" = :channelId'];
        const params: Record<string, number | string> = { channelId: ctx.channelId };
        if (minPrice != null && minPrice >= 0) {
          conditions.push('pvp.price >= :minPrice');
          params.minPrice = minPrice;
        }
        if (maxPrice != null && maxPrice >= 0) {
          conditions.push('pvp.price <= :maxPrice');
          params.maxPrice = maxPrice;
        }
        queryBuilder.andWhere(
          `product.id IN (
          SELECT pv."productId" FROM product_variant pv
          INNER JOIN product_variant_price pvp ON pvp."variantId" = pv.id
          WHERE ${conditions.join(' AND ')}
        )`,
          params
        );
      }
    }

    queryBuilder.orderBy('product.createdAt', 'DESC').skip(skip).take(take);

    const [items, totalItems] = await queryBuilder.getManyAndCount();

    return { items, totalItems };
  }
}
