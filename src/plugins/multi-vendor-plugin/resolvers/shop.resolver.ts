/**
 * Shop Resolver
 *
 * GraphQL resolver for shop pages (public shop browsing).
 * Part of Phase 5.1: Seller Shop Pages
 *
 * Provides queries and mutations for:
 * - Viewing shop information by slug
 * - Browsing shop products
 * - Updating shop customization (authenticated sellers only)
 */

import { Args, Mutation, Query, Resolver, InputType, Field, ID, Int, ObjectType } from '@nestjs/graphql';
import type { RequestContext } from '@vendure/core';
import { Ctx, Allow, Permission, CustomerService, Product } from '@vendure/core';
import { MarketplaceSeller } from '../entities/seller.entity';
import { ShopService } from '../services/shop.service';
import { SellerService } from '../services/seller.service';

/**
 * GraphQL Input Types
 */
@InputType()
export class ShopProductsOptionsInput {
  @Field(() => Int, { nullable: true, defaultValue: 0 })
  skip?: number;

  @Field(() => Int, { nullable: true, defaultValue: 25 })
  take?: number;
}

@InputType()
export class UpdateShopCustomizationInput {
  @Field({ nullable: true })
  shopDescription?: string;

  @Field(() => ID, { nullable: true })
  shopBannerAssetId?: string;

  @Field(() => ID, { nullable: true })
  shopLogoAssetId?: string;
}

/**
 * GraphQL Result Types
 */
@ObjectType()
export class ShopProductsList {
  @Field(() => [Product])
  items!: Product[];

  @Field(() => Int)
  totalItems!: number;
}

/**
 * Shop Resolver
 *
 * Provides GraphQL queries and mutations for shop pages
 */
@Resolver()
export class ShopResolver {
  constructor(
    private shopService: ShopService,
    private sellerService: SellerService,
    private customerService: CustomerService
  ) {}

  /**
   * Get shop by slug (public query)
   *
   * Allows anyone to view shop information by slug.
   *
   * @example
   * query {
   *   shop(slug: "test-shop") {
   *     id
   *     shopName
   *     shopDescription
   *     shopBannerAssetId
   *     shopLogoAssetId
   *   }
   * }
   */
  @Query(() => MarketplaceSeller, { nullable: true })
  async shop(
    @Ctx() ctx: RequestContext,
    @Args('slug') slug: string
  ): Promise<MarketplaceSeller | null> {
    return await this.shopService.getShopBySlug(ctx, slug);
  }

  /**
   * Get products for a shop (public query)
   *
   * Returns paginated list of enabled products for a shop.
   *
   * @example
   * query {
   *   shopProducts(slug: "test-shop", options: { skip: 0, take: 10 }) {
   *     items {
   *       id
   *       name
   *       slug
   *     }
   *     totalItems
   *   }
   * }
   */
  @Query(() => ShopProductsList, { name: 'shopProducts' })
  async shopProducts(
    @Ctx() ctx: RequestContext,
    @Args('slug') slug: string,
    @Args('options', { nullable: true, type: () => ShopProductsOptionsInput })
    options?: ShopProductsOptionsInput
  ): Promise<ShopProductsList> {
    // First, get the shop to find the seller ID
    const shop = await this.shopService.getShopBySlug(ctx, slug);
    if (!shop) {
      throw new Error('Shop not found');
    }

    // Get products for this seller
    const result = await this.shopService.getShopProducts(ctx, shop.id, {
      skip: options?.skip ?? 0,
      take: options?.take ?? 25,
    });

    return {
      items: result.items,
      totalItems: result.totalItems,
    };
  }

  /**
   * Update shop customization (authenticated sellers only)
   *
   * Allows sellers to update their shop description, banner, and logo.
   * The sellerId must belong to the authenticated user.
   *
   * @example
   * mutation {
   *   updateShopCustomization(
   *     sellerId: "1"
   *     input: {
   *       shopDescription: "New description"
   *       shopBannerAssetId: "200"
   *     }
   *   ) {
   *     id
   *     shopDescription
   *     shopBannerAssetId
   *   }
   * }
   */
  @Mutation(() => MarketplaceSeller)
  @Allow(Permission.Authenticated)
  async updateShopCustomization(
    @Ctx() ctx: RequestContext,
    @Args('sellerId', { type: () => ID }) sellerId: string,
    @Args('input') input: UpdateShopCustomizationInput
  ): Promise<MarketplaceSeller> {
    if (!ctx.activeUserId) {
      throw new Error('User must be authenticated');
    }

    // Verify that the seller belongs to the authenticated user
    const customer = await this.customerService.findOneByUserId(ctx, ctx.activeUserId);
    if (!customer) {
      throw new Error('Customer not found');
    }

    const seller = await this.sellerService.findSellerByCustomerId(ctx, customer.id);
    if (!seller || seller.id.toString() !== sellerId.toString()) {
      throw new Error('Seller not found or does not belong to authenticated user');
    }

    return await this.shopService.updateShopCustomization(ctx, sellerId, input);
  }
}
