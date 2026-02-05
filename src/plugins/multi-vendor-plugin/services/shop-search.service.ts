/**
 * Shop Search Service
 *
 * Service for searching shops (sellers) by name and description.
 * Phase 5.1: Shop Search Functionality
 *
 * Provides methods for:
 * - Searching shops by name
 * - Searching shops by description
 * - Filtering by verification status
 * - Pagination support
 */

import { Injectable } from '@nestjs/common';
import type { RequestContext } from '@vendure/core';
import { TransactionalConnection } from '@vendure/core';
import { MarketplaceSeller } from '../entities/seller.entity';

/**
 * Options for shop search
 */
export interface ShopSearchOptions {
  skip?: number;
  take?: number;
  verifiedOnly?: boolean;
  /** Phase 5.3: Minimum average rating (1-5). Only shops with approved reviews meeting this threshold. */
  minRating?: number;
}

/**
 * Result for shop search query
 */
export interface ShopSearchResult {
  items: MarketplaceSeller[];
  totalItems: number;
}

/**
 * Shop Search Service
 *
 * Handles searching shops by name and description
 */
@Injectable()
export class ShopSearchService {
  constructor(private connection: TransactionalConnection) {}

  /**
   * Search shops by name or description
   *
   * Searches both shopName and shopDescription fields using case-insensitive LIKE matching.
   * Results are ordered by shop name alphabetically.
   *
   * @param ctx Request context
   * @param searchTerm Search term to match against shop name or description
   * @param options Search options (pagination, filters)
   * @returns Paginated list of matching shops
   */
  async searchShops(
    ctx: RequestContext,
    searchTerm: string,
    options: ShopSearchOptions = {}
  ): Promise<ShopSearchResult> {
    const { skip = 0, take = 25, verifiedOnly = false, minRating } = options;

    const repository = this.connection.getRepository(ctx, MarketplaceSeller);
    const queryBuilder = repository.createQueryBuilder('seller');

    // Search in shopName or shopDescription
    const searchPattern = `%${searchTerm}%`;
    queryBuilder.where('LOWER(seller.shopName) LIKE LOWER(:searchTerm)', {
      searchTerm: searchPattern,
    });
    queryBuilder.orWhere('LOWER(seller.shopDescription) LIKE LOWER(:searchTerm)', {
      searchTerm: searchPattern,
    });

    // Filter by verification status if requested
    if (verifiedOnly) {
      queryBuilder.andWhere('seller.verificationStatus = :status', { status: 'VERIFIED' });
    }

    // Phase 5.3: Filter by minimum average rating (shops with approved reviews >= minRating)
    if (minRating != null && minRating >= 1 && minRating <= 5) {
      queryBuilder.andWhere(
        `seller.id IN (
          SELECT r."sellerId" FROM review r
          WHERE r.status = 'APPROVED'
          GROUP BY r."sellerId"
          HAVING AVG(r.rating) >= :minRating
        )`,
        { minRating }
      );
    }

    // Only show active shops
    queryBuilder.andWhere('seller.isActive = :isActive', { isActive: true });

    // Order by shop name
    queryBuilder.orderBy('seller.shopName', 'ASC');

    // Pagination
    queryBuilder.skip(skip).take(take);

    const [items, totalItems] = await queryBuilder.getManyAndCount();

    return { items, totalItems };
  }
}
