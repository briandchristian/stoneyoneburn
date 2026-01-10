/**
 * Seller Service
 *
 * Service for managing seller accounts, registration, and profile updates.
 * Part of Phase 2.2: Seller Registration & Onboarding
 */

import { Injectable } from '@nestjs/common';
import type { RequestContext, ID } from '@vendure/core';
import {
  TransactionalConnection,
  Transaction,
  CustomerService,
} from '@vendure/core';
import { MarketplaceSeller, SellerVerificationStatus } from '../entities/seller.entity';
import {
  SellerErrorCode,
  SellerRegistrationError,
  SellerUpdateError,
} from '../errors/seller-errors';

/**
 * Input for seller registration
 */
export interface RegisterSellerInput {
  shopName: string;
  shopDescription?: string;
  businessName?: string;
}

/**
 * Input for updating seller profile
 */
export interface UpdateSellerProfileInput {
  shopName?: string;
  shopDescription?: string;
  shopBannerAssetId?: ID;
  shopLogoAssetId?: ID;
  businessName?: string;
  taxId?: string;
}

/**
 * Seller Service
 *
 * Handles seller registration, profile updates, and shop management
 */
@Injectable()
export class SellerService {
  constructor(
    private connection: TransactionalConnection,
    private customerService: CustomerService
  ) {}

  /**
   * Register a customer as a seller
   */
  @Transaction()
  async registerSeller(
    ctx: RequestContext,
    input: RegisterSellerInput
  ): Promise<MarketplaceSeller> {
    // Validate customer is authenticated
    if (!ctx.activeUserId) {
      throw new SellerRegistrationError(
        SellerErrorCode.CUSTOMER_NOT_AUTHENTICATED,
        'Customer must be authenticated to register as a seller'
      );
    }

    // Get customer
    const customer = await this.customerService.findOneByUserId(
      ctx,
      ctx.activeUserId
    );
    if (!customer) {
      throw new SellerRegistrationError(
        SellerErrorCode.CUSTOMER_NOT_FOUND,
        'Customer not found'
      );
    }

    // Check email is verified
    if (!customer.user?.verified) {
      throw new SellerRegistrationError(
        SellerErrorCode.EMAIL_NOT_VERIFIED,
        'Customer email must be verified before registering as a seller'
      );
    }

    // Check if customer already has a seller account
    const existingSeller = await this.findSellerByCustomerId(
      ctx,
      customer.id
    );
    if (existingSeller) {
      throw new SellerRegistrationError(
        SellerErrorCode.SELLER_ALREADY_EXISTS,
        'Customer already has a seller account'
      );
    }

    // Validate shop name
    this.validateShopName(input.shopName);

    // Generate unique shop slug
    const shopSlug = await this.generateUniqueShopSlug(ctx, input.shopName);

    // Create seller entity using repository.create() to avoid protected constructor issue
    const sellerRepository = this.connection.getRepository(ctx, MarketplaceSeller);
    const seller = sellerRepository.create({
      customer,
      customerId: customer.id,
      shopName: input.shopName.trim(),
      shopSlug,
      shopDescription: input.shopDescription,
      businessName: input.businessName,
      verificationStatus: SellerVerificationStatus.PENDING,
      isActive: true,
      commissionRate: 10.0,
    });

    // Save seller
    const savedSeller = await sellerRepository.save(seller);

    // TODO: Send welcome email (Phase 2.2 - future enhancement)

    return savedSeller;
  }

  /**
   * Update seller profile
   */
  @Transaction()
  async updateSellerProfile(
    ctx: RequestContext,
    sellerId: ID,
    input: UpdateSellerProfileInput
  ): Promise<MarketplaceSeller> {
    // Validate customer is authenticated
    if (!ctx.activeUserId) {
      throw new SellerUpdateError(
        SellerErrorCode.CUSTOMER_NOT_AUTHENTICATED,
        'Customer must be authenticated to update seller profile'
      );
    }

    // Get seller
    const seller = await this.connection
      .getRepository(ctx, MarketplaceSeller)
      .findOne({ where: { id: sellerId }, relations: ['customer'] });

    if (!seller) {
      throw new SellerUpdateError(
        SellerErrorCode.SELLER_NOT_FOUND,
        'Seller not found'
      );
    }

    // Verify ownership
    const customer = await this.customerService.findOneByUserId(
      ctx,
      ctx.activeUserId
    );
    if (!customer || seller.customerId !== customer.id) {
      throw new SellerUpdateError(
        SellerErrorCode.NOT_SELLER_OWNER,
        'Only the seller owner can update their profile'
      );
    }

    // Update shop name and regenerate slug if provided
    if (input.shopName !== undefined) {
      this.validateShopName(input.shopName);
      seller.shopName = input.shopName.trim();
      seller.shopSlug = await this.generateUniqueShopSlug(
        ctx,
        input.shopName,
        sellerId // Exclude current seller from uniqueness check
      );
    }

    // Update optional fields
    if (input.shopDescription !== undefined) {
      seller.shopDescription = input.shopDescription;
    }
    if (input.shopBannerAssetId !== undefined) {
      seller.shopBannerAssetId = input.shopBannerAssetId;
    }
    if (input.shopLogoAssetId !== undefined) {
      seller.shopLogoAssetId = input.shopLogoAssetId;
    }
    if (input.businessName !== undefined) {
      seller.businessName = input.businessName;
    }
    if (input.taxId !== undefined) {
      seller.taxId = input.taxId;
    }

    // Save updated seller
    return await this.connection.getRepository(ctx, MarketplaceSeller).save(seller);
  }

  /**
   * Find seller by customer ID
   */
  async findSellerByCustomerId(
    ctx: RequestContext,
    customerId: ID
  ): Promise<MarketplaceSeller | null> {
    return (
      (await this.connection
        .getRepository(ctx, MarketplaceSeller)
        .findOne({ where: { customerId } })) || null
    );
  }

  /**
   * Find seller by shop slug
   */
  async findSellerByShopSlug(
    ctx: RequestContext,
    shopSlug: string
  ): Promise<MarketplaceSeller | null> {
    return (
      (await this.connection
        .getRepository(ctx, MarketplaceSeller)
        .findOne({ where: { shopSlug } })) || null
    );
  }

  /**
   * Generate a URL-safe shop slug from shop name
   */
  generateShopSlug(shopName: string): string {
    // Convert to lowercase
    let slug = shopName.toLowerCase();

    // Replace spaces and special characters with hyphens
    slug = slug.replace(/[^a-z0-9-]/g, '-');

    // Remove multiple consecutive hyphens
    slug = slug.replace(/-+/g, '-');

    // Trim leading and trailing hyphens
    slug = slug.replace(/^-+|-+$/g, '');

    // Validate minimum length
    if (slug.length < 3) {
      throw new SellerRegistrationError(
        SellerErrorCode.INVALID_SHOP_NAME,
        'Shop name must be at least 3 characters long'
      );
    }

    // Truncate to maximum length (reserve space for potential numeric suffix)
    if (slug.length > 95) {
      slug = slug.substring(0, 95);
      // Remove trailing hyphen if truncated in middle of word
      slug = slug.replace(/-+$/, '');
    }

    return slug;
  }

  /**
   * Generate a unique shop slug, appending number suffix if needed
   */
  private async generateUniqueShopSlug(
    ctx: RequestContext,
    shopName: string,
    excludeSellerId?: ID
  ): Promise<string> {
    const baseSlug = this.generateShopSlug(shopName);
    let slug = baseSlug;
    let counter = 2;

      // Check uniqueness and append number if needed
    while (true) {
      const existing = await this.connection
        .getRepository(ctx, MarketplaceSeller)
        .findOne({ where: { shopSlug: slug } });

      // If no existing seller with this slug, or it's the same seller, we're done
      if (!existing || (excludeSellerId && existing.id === excludeSellerId)) {
        return slug;
      }

      // Try next number suffix
      slug = `${baseSlug}-${counter}`;
      counter++;

      // Safety check to prevent infinite loop
      if (counter > 1000) {
        throw new SellerRegistrationError(
          SellerErrorCode.SHOP_SLUG_GENERATION_FAILED,
          'Unable to generate unique shop slug after multiple attempts'
        );
      }
    }
  }

  /**
   * Validate shop name
   */
  private validateShopName(shopName: string): void {
    const trimmed = shopName.trim();

    if (!trimmed || trimmed.length === 0) {
      throw new SellerRegistrationError(
        SellerErrorCode.INVALID_SHOP_NAME,
        'Shop name is required'
      );
    }

    if (trimmed.length < 3) {
      throw new SellerRegistrationError(
        SellerErrorCode.INVALID_SHOP_NAME,
        'Shop name must be at least 3 characters long'
      );
    }

    if (trimmed.length > 100) {
      throw new SellerRegistrationError(
        SellerErrorCode.INVALID_SHOP_NAME,
        'Shop name must be at most 100 characters long'
      );
    }
  }
}
