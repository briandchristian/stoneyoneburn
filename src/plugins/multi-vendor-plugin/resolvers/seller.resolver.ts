/**
 * Seller Resolver
 *
 * GraphQL resolver for seller-related queries and mutations.
 * Part of Phase 2.2: Seller Registration & Onboarding
 */

import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { InputType, Field as GQLField, ID } from '@nestjs/graphql';
import type { RequestContext } from '@vendure/core';
import { Ctx, Allow, Permission, CustomerService } from '@vendure/core';
import { MarketplaceSeller } from '../entities/seller.entity';
import { SellerService } from '../services/seller.service';

/**
 * GraphQL Input Types
 */
@InputType()
export class RegisterSellerInput {
  @GQLField()
  shopName!: string;

  @GQLField({ nullable: true })
  shopDescription?: string;

  @GQLField({ nullable: true })
  businessName?: string;
}

@InputType()
export class UpdateSellerProfileInput {
  @GQLField(() => ID)
  sellerId!: string;

  @GQLField({ nullable: true })
  shopName?: string;

  @GQLField({ nullable: true })
  shopDescription?: string;

  @GQLField(() => ID, { nullable: true })
  shopBannerAssetId?: string;

  @GQLField(() => ID, { nullable: true })
  shopLogoAssetId?: string;

  @GQLField({ nullable: true })
  businessName?: string;

  @GQLField({ nullable: true })
  taxId?: string;
}

// Note: Using standard GraphQL error handling (throwing errors) instead of union types
// This avoids schema parsing issues where types aren't registered yet when Vendure parses the schema string
// The service already throws SellerRegistrationError and SellerUpdateError which will be properly handled by GraphQL

/**
 * Seller Resolver
 *
 * Provides GraphQL mutations and queries for seller management
 */
@Resolver()
export class SellerResolver {
  constructor(
    private sellerService: SellerService,
    private customerService: CustomerService
  ) {}

  /**
   * Register the current customer as a seller
   *
   * Errors are thrown as SellerRegistrationError exceptions which GraphQL will handle
   */
  @Mutation(() => MarketplaceSeller)
  @Allow(Permission.Authenticated)
  async registerAsSeller(
    @Ctx() ctx: RequestContext,
    @Args('input') input: RegisterSellerInput
  ): Promise<MarketplaceSeller> {
    // Service throws SellerRegistrationError on validation failures
    // GraphQL will automatically convert these to proper error responses
    return await this.sellerService.registerSeller(ctx, {
      shopName: input.shopName,
      shopDescription: input.shopDescription,
      businessName: input.businessName,
    });
  }

  /**
   * Update seller profile
   *
   * Errors are thrown as SellerUpdateError exceptions which GraphQL will handle
   */
  @Mutation(() => MarketplaceSeller)
  @Allow(Permission.Authenticated)
  async updateSellerProfile(
    @Ctx() ctx: RequestContext,
    @Args('input') input: UpdateSellerProfileInput
  ): Promise<MarketplaceSeller> {
    // Service throws SellerUpdateError on validation failures
    // GraphQL will automatically convert these to proper error responses
    return await this.sellerService.updateSellerProfile(ctx, input.sellerId, {
      shopName: input.shopName,
      shopDescription: input.shopDescription,
      shopBannerAssetId: input.shopBannerAssetId,
      shopLogoAssetId: input.shopLogoAssetId,
      businessName: input.businessName,
      taxId: input.taxId,
    });
  }

  /**
   * Get the current customer's seller account
   */
  @Query(() => MarketplaceSeller, { nullable: true })
  @Allow(Permission.Authenticated)
  async activeSeller(@Ctx() ctx: RequestContext): Promise<MarketplaceSeller | null> {
    if (!ctx.activeUserId) {
      return null;
    }

    const customer = await this.customerService.findOneByUserId(ctx, ctx.activeUserId);

    if (!customer) {
      return null;
    }

    return await this.sellerService.findSellerByCustomerId(ctx, customer.id);
  }

  /**
   * Get seller by shop slug (public query for shop pages)
   */
  @Query(() => MarketplaceSeller, { nullable: true })
  @Allow(Permission.Public)
  async sellerBySlug(
    @Ctx() ctx: RequestContext,
    @Args('slug') slug: string
  ): Promise<MarketplaceSeller | null> {
    return await this.sellerService.findSellerByShopSlug(ctx, slug);
  }
}
