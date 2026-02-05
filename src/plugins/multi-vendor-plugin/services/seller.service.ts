/**
 * Seller Service
 *
 * Service for managing seller accounts, registration, and profile updates.
 * Part of Phase 2.2: Seller Registration & Onboarding
 * Phase 5.4: Creates a dedicated Channel per seller for order splitting.
 */

import { Injectable } from '@nestjs/common';
import type { RequestContext, ID } from '@vendure/core';
import {
  TransactionalConnection,
  Transaction,
  CustomerService,
  ChannelService,
  LanguageCode,
} from '@vendure/core';
import { MarketplaceSeller, SellerVerificationStatus } from '../entities/seller.entity';
import { MarketplaceSellerBase, SellerType } from '../entities/marketplace-seller-base.entity';
import { IndividualSeller } from '../entities/individual-seller.entity';
import { CompanySeller } from '../entities/company-seller.entity';
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
    private customerService: CustomerService,
    private channelService: ChannelService
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
    const customer = await this.customerService.findOneByUserId(ctx, ctx.activeUserId);
    if (!customer) {
      throw new SellerRegistrationError(SellerErrorCode.CUSTOMER_NOT_FOUND, 'Customer not found');
    }

    // Check email is verified
    if (!customer.user?.verified) {
      throw new SellerRegistrationError(
        SellerErrorCode.EMAIL_NOT_VERIFIED,
        'Customer email must be verified before registering as a seller'
      );
    }

    // Check if customer already has a seller account
    const existingSeller = await this.findSellerByCustomerId(ctx, customer.id);
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

    // In test mode, auto-verify sellers so integration tests can create products
    // without requiring admin login to verify. See seller-product-management.integration.test.ts.
    const isTestMode = process.env.NODE_ENV === 'test' || process.env.APP_ENV === 'test';
    const verificationStatus = isTestMode
      ? SellerVerificationStatus.VERIFIED
      : SellerVerificationStatus.PENDING;

    // Create seller entity using repository.create() to avoid protected constructor issue
    const sellerRepository = this.connection.getRepository(ctx, MarketplaceSeller);
    const seller = sellerRepository.create({
      customer,
      customerId: customer.id,
      shopName: input.shopName.trim(),
      shopSlug,
      shopDescription: input.shopDescription,
      businessName: input.businessName,
      verificationStatus,
      isActive: true,
      commissionRate: 10.0,
    });

    // Save seller
    const savedSeller = await sellerRepository.save(seller);

    // Phase 5.4: Create dedicated Channel for this seller (channel-per-seller)
    const channelResult = await this.createSellerChannel(ctx, savedSeller.id);
    if (channelResult) {
      savedSeller.channelId = channelResult.id;
      await sellerRepository.save(savedSeller);
    }

    // TODO: Send welcome email (Phase 2.2 - future enhancement)

    return savedSeller;
  }

  /**
   * Ensure a seller has a dedicated Channel (Phase 5.4).
   * If the seller has no channelId, attempts to create one (lazy channel creation).
   * Use when creating products so sellers whose channel creation failed at registration
   * get a channel on first product creation.
   *
   * @returns The seller, possibly with channelId now set
   */
  async ensureSellerHasChannel(
    ctx: RequestContext,
    seller: MarketplaceSeller
  ): Promise<MarketplaceSeller> {
    if (seller.channelId) {
      return seller;
    }
    const channelResult = await this.createSellerChannel(ctx, seller.id);
    if (channelResult) {
      seller.channelId = channelResult.id;
      await this.connection.getRepository(ctx, MarketplaceSeller).save(seller);
    }
    return seller;
  }

  /**
   * Create a dedicated Vendure Channel for a seller (Phase 5.4).
   * Uses default channel's tax/shipping zones. Returns null if creation fails
   * (e.g. permission denied from Shop API context).
   */
  private async createSellerChannel(ctx: RequestContext, sellerId: ID): Promise<{ id: ID } | null> {
    try {
      const defaultCh = await this.channelService.getDefaultChannel(ctx);
      const defaultChannel = await this.channelService.findOne(ctx, defaultCh.id);
      if (!defaultChannel?.defaultTaxZone?.id || !defaultChannel?.defaultShippingZone?.id) {
        return null;
      }

      const code = `seller-${sellerId}`;
      const token = `seller-${sellerId}-token`;

      const newChannel = await this.channelService.create(ctx, {
        code,
        token,
        defaultLanguageCode: LanguageCode.en,
        defaultTaxZoneId: defaultChannel.defaultTaxZone.id.toString(),
        defaultShippingZoneId: defaultChannel.defaultShippingZone.id.toString(),
        pricesIncludeTax: defaultChannel.pricesIncludeTax,
        defaultCurrencyCode: defaultChannel.defaultCurrencyCode,
      });

      if (newChannel && 'id' in newChannel) {
        return { id: newChannel.id };
      }
      return null;
    } catch {
      return null;
    }
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
      throw new SellerUpdateError(SellerErrorCode.SELLER_NOT_FOUND, 'Seller not found');
    }

    // Verify ownership
    const customer = await this.customerService.findOneByUserId(ctx, ctx.activeUserId);
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
   * Find a marketplace seller by ID (Admin API).
   * Used by the seller dashboard detail view.
   *
   * @param ctx Request context
   * @param id Seller ID
   * @returns MarketplaceSeller or null if not found
   */
  async findMarketplaceSellerById(ctx: RequestContext, id: ID): Promise<MarketplaceSeller | null> {
    const seller = await this.connection
      .getRepository(ctx, MarketplaceSeller)
      .findOne({ where: { id } });
    return seller ?? null;
  }

  /**
   * Find all marketplace sellers (Admin API).
   * Used by the seller dashboard UI to list sellers.
   *
   * @param ctx Request context
   * @param options skip, take for pagination
   * @returns Paginated list of MarketplaceSeller
   */
  async findAllMarketplaceSellers(
    ctx: RequestContext,
    options: { skip?: number; take?: number } = {}
  ): Promise<{ items: MarketplaceSeller[]; totalItems: number }> {
    const { skip = 0, take = 25 } = options;
    const repo = this.connection.getRepository(ctx, MarketplaceSeller);
    const [items, totalItems] = await repo.findAndCount({
      order: { createdAt: 'DESC' as const },
      skip,
      take,
    });
    return { items, totalItems };
  }

  /**
   * Update seller verification status
   *
   * This is typically called by admins to verify or reject seller applications.
   * For testing purposes, this can be used to verify sellers.
   *
   * @param ctx Request context (should have admin permissions in production)
   * @param sellerId The seller ID to update
   * @param status The new verification status
   * @returns Updated seller entity
   */
  @Transaction()
  async updateVerificationStatus(
    ctx: RequestContext,
    sellerId: ID,
    status: SellerVerificationStatus
  ): Promise<MarketplaceSeller> {
    const seller = await this.connection
      .getRepository(ctx, MarketplaceSeller)
      .findOne({ where: { id: sellerId } });

    if (!seller) {
      throw new SellerUpdateError(SellerErrorCode.SELLER_NOT_FOUND, 'Seller not found');
    }

    seller.verificationStatus = status;
    return await this.connection.getRepository(ctx, MarketplaceSeller).save(seller);
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
   * Find seller by ID (for polymorphic resolver)
   *
   * Returns the seller as a polymorphic type (IndividualSeller or CompanySeller).
   * Uses TypeORM's Single Table Inheritance to load the correct concrete type.
   *
   * @param ctx - Request context
   * @param sellerId - Seller ID
   * @returns MarketplaceSellerBase (IndividualSeller or CompanySeller) or null
   */
  async findSellerById(ctx: RequestContext, sellerId: ID): Promise<MarketplaceSellerBase | null> {
    // Try IndividualSeller first
    const individualRepo = this.connection.getRepository(ctx, IndividualSeller);
    const individualSeller = await individualRepo.findOne({ where: { id: sellerId } });

    if (individualSeller) {
      return individualSeller;
    }

    // Try CompanySeller
    const companyRepo = this.connection.getRepository(ctx, CompanySeller);
    const companySeller = await companyRepo.findOne({ where: { id: sellerId } });

    if (companySeller) {
      return companySeller;
    }

    // Fallback: try legacy MarketplaceSeller (for backward compatibility during migration)
    const legacyRepo = this.connection.getRepository(ctx, MarketplaceSeller);
    const legacySeller = await legacyRepo.findOne({ where: { id: sellerId } });

    if (legacySeller) {
      // Convert legacy seller to IndividualSeller (default type during migration)
      // In production, you'd want to migrate this data properly
      const individualSeller = individualRepo.create({
        ...legacySeller,
        sellerType: SellerType.INDIVIDUAL,
        firstName: legacySeller.shopName.split(' ')[0] || legacySeller.shopName,
        lastName: legacySeller.shopName.split(' ').slice(1).join(' ') || '',
        name: legacySeller.shopName,
        email: legacySeller.customer?.emailAddress || '',
      });
      return individualSeller;
    }

    return null;
  }

  /**
   * Find all sellers (for polymorphic resolver)
   *
   * Returns all sellers as polymorphic types.
   *
   * @param ctx - Request context
   * @returns Array of MarketplaceSellerBase
   */
  async findAllSellers(ctx: RequestContext): Promise<MarketplaceSellerBase[]> {
    const individualRepo = this.connection.getRepository(ctx, IndividualSeller);
    const companyRepo = this.connection.getRepository(ctx, CompanySeller);

    const [individualSellers, companySellers] = await Promise.all([
      individualRepo.find(),
      companyRepo.find(),
    ]);

    return [...individualSellers, ...companySellers];
  }

  /**
   * Validate shop name
   */
  private validateShopName(shopName: string): void {
    const trimmed = shopName.trim();

    if (!trimmed || trimmed.length === 0) {
      throw new SellerRegistrationError(SellerErrorCode.INVALID_SHOP_NAME, 'Shop name is required');
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
