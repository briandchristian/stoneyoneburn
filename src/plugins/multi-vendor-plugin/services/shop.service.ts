/**
 * Shop Service
 *
 * Service for managing seller shop pages and customization.
 * Part of Phase 5.1: Seller Shop Pages
 *
 * This service provides methods for:
 * - Getting shop information by slug
 * - Getting shop products with pagination
 * - Updating shop customization (banner, description, logo)
 */

import { Injectable } from '@nestjs/common';
import type { RequestContext, ID } from '@vendure/core';
import { TransactionalConnection, Product } from '@vendure/core';
import { MarketplaceSeller } from '../entities/seller.entity';
import { SellerService, UpdateSellerProfileInput } from './seller.service';

/**
 * Options for getting shop products
 */
export interface ShopProductsOptions {
  skip?: number;
  take?: number;
}

/**
 * Result for shop products query
 */
export interface ShopProductsResult {
  items: Product[];
  totalItems: number;
}

/**
 * Input for updating shop customization
 */
export interface UpdateShopCustomizationInput {
  shopDescription?: string;
  shopBannerAssetId?: ID;
  shopLogoAssetId?: ID;
}

/**
 * Shop Service
 *
 * Handles shop page data retrieval and customization
 */
@Injectable()
export class ShopService {
  constructor(
    private connection: TransactionalConnection,
    private sellerService: SellerService
  ) {}

  /**
   * Get shop by slug
   *
   * @param ctx Request context
   * @param shopSlug Shop slug
   * @returns MarketplaceSeller or null if not found
   */
  async getShopBySlug(ctx: RequestContext, shopSlug: string): Promise<MarketplaceSeller | null> {
    return await this.sellerService.findSellerByShopSlug(ctx, shopSlug);
  }

  /**
   * Get products for a shop (seller)
   *
   * Returns only enabled products belonging to the seller, ordered by creation date (newest first).
   *
   * @param ctx Request context
   * @param sellerId Seller ID
   * @param options Pagination options
   * @returns Paginated list of products
   */
  async getShopProducts(
    ctx: RequestContext,
    sellerId: ID,
    options: ShopProductsOptions = {}
  ): Promise<ShopProductsResult> {
    const { skip = 0, take = 25 } = options;
    const parsedSellerId = parseInt(sellerId.toString(), 10);

    const productRepository = this.connection.getRepository(ctx, Product);
    const queryBuilder = productRepository
      .createQueryBuilder('product')
      .where('product.customFieldsSellerid = :sellerId', { sellerId: parsedSellerId })
      .andWhere('product.enabled = :enabled', { enabled: true })
      .orderBy('product.createdAt', 'DESC')
      .skip(skip)
      .take(take);

    const [items, totalItems] = await queryBuilder.getManyAndCount();

    return { items, totalItems };
  }

  /**
   * Update shop customization
   *
   * Allows sellers to update their shop description, banner, and logo.
   *
   * @param ctx Request context
   * @param sellerId Seller ID
   * @param input Customization input
   * @returns Updated seller entity
   */
  async updateShopCustomization(
    ctx: RequestContext,
    sellerId: ID,
    input: UpdateShopCustomizationInput
  ): Promise<MarketplaceSeller> {
    const updateInput: UpdateSellerProfileInput = {};

    if (input.shopDescription !== undefined) {
      updateInput.shopDescription = input.shopDescription;
    }

    if (input.shopBannerAssetId !== undefined) {
      updateInput.shopBannerAssetId = input.shopBannerAssetId;
    }

    if (input.shopLogoAssetId !== undefined) {
      updateInput.shopLogoAssetId = input.shopLogoAssetId;
    }

    return await this.sellerService.updateSellerProfile(ctx, sellerId, updateInput);
  }
}
