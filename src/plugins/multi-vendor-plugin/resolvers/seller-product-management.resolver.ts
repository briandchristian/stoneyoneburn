/**
 * Seller Product Management Resolver
 *
 * GraphQL resolver for seller product management (create, update, delete).
 * Part of Phase 2.3: Seller-Product Association
 *
 * This resolver provides mutations for sellers to manage their products:
 * - createSellerProduct: Create a new product (automatically assigned to seller)
 * - updateSellerProduct: Update seller's product (with ownership validation)
 * - deleteSellerProduct: Delete seller's product (with ownership validation)
 */

import {
  Resolver,
  Mutation,
  Args,
  ID,
  InputType,
  Field as GQLField,
  ObjectType,
} from '@nestjs/graphql';
import type { RequestContext } from '@vendure/core';
import type { UpdateProductInput } from '@vendure/common/lib/generated-types';
import {
  Ctx,
  Allow,
  Permission,
  Product,
  ProductService,
  LanguageCode,
  ProductVariantService,
  CustomerService,
  ChannelService,
  TransactionalConnection,
  Transaction,
} from '@vendure/core';
import { SellerService } from '../services/seller.service';
import {
  ProductOwnershipService,
  ProductOwnershipError,
} from '../services/product-ownership.service';
import { MarketplaceSeller } from '../entities/seller.entity';
import { SellerErrorCode } from '../errors/seller-errors';

/**
 * Deletion Response Type
 */
export enum DeletionResult {
  DELETED = 'DELETED',
  NOT_DELETED = 'NOT_DELETED',
}

@ObjectType()
export class DeletionResponse {
  @GQLField(() => String)
  result!: string;

  @GQLField({ nullable: true })
  message?: string;
}

/**
 * Input for creating a seller product
 */
@InputType()
export class CreateSellerProductInput {
  @GQLField(() => [ProductTranslationInput])
  translations!: ProductTranslationInput[];

  @GQLField({ nullable: true })
  enabled?: boolean;

  @GQLField(() => ID, { nullable: true })
  featuredAssetId?: string;

  @GQLField(() => [ID], { nullable: true })
  assetIds?: string[];

  @GQLField(() => [ID], { nullable: true })
  facetValueIds?: string[];
}

@InputType()
export class ProductTranslationInput {
  @GQLField()
  languageCode!: string;

  @GQLField()
  name!: string;

  @GQLField()
  slug!: string;

  @GQLField({ nullable: true })
  description?: string;
}

/**
 * Input for updating a seller product
 */
@InputType()
export class UpdateSellerProductInput {
  @GQLField(() => ID)
  productId!: string;

  @GQLField(() => [ProductTranslationInput], { nullable: true })
  translations?: ProductTranslationInput[];

  @GQLField({ nullable: true })
  enabled?: boolean;

  @GQLField(() => ID, { nullable: true })
  featuredAssetId?: string;

  @GQLField(() => [ID], { nullable: true })
  assetIds?: string[];

  @GQLField(() => [ID], { nullable: true })
  facetValueIds?: string[];
}

/**
 * Seller Product Management Resolver
 *
 * Handles mutations for sellers to manage their products
 */
@Resolver()
export class SellerProductManagementResolver {
  constructor(
    private productService: ProductService,
    private productVariantService: ProductVariantService,
    private sellerService: SellerService,
    private customerService: CustomerService,
    private productOwnershipService: ProductOwnershipService,
    private channelService: ChannelService,
    private connection: TransactionalConnection
  ) {}

  /**
   * Get the current seller from request context
   */
  private async getCurrentSeller(ctx: RequestContext): Promise<MarketplaceSeller> {
    if (!ctx.activeUserId) {
      throw new ProductOwnershipError(
        SellerErrorCode.CUSTOMER_NOT_AUTHENTICATED,
        'Authentication required'
      );
    }

    const customer = await this.customerService.findOneByUserId(ctx, ctx.activeUserId);
    if (!customer) {
      throw new ProductOwnershipError(SellerErrorCode.CUSTOMER_NOT_FOUND, 'Customer not found');
    }

    const seller = await this.sellerService.findSellerByCustomerId(ctx, customer.id);
    if (!seller) {
      throw new ProductOwnershipError(
        SellerErrorCode.SELLER_NOT_FOUND,
        'Seller account not found. Please register as a seller first.'
      );
    }

    return seller;
  }

  /**
   * Create a new product for the current seller
   *
   * Automatically assigns the product to the seller and validates
   * that the seller is verified and active.
   */
  @Mutation(() => Product)
  @Allow(Permission.Authenticated)
  @Transaction()
  async createSellerProduct(
    @Ctx() ctx: RequestContext,
    @Args('input') input: CreateSellerProductInput
  ): Promise<Product> {
    // Get current seller
    const seller = await this.getCurrentSeller(ctx);

    // Validate seller can create products (verified and active)
    await this.productOwnershipService.validateSellerCanCreateProducts(ctx, seller.id);

    // Phase 5.4: Ensure seller has a channel (lazy creation if registration failed)
    const sellerWithChannel = await this.sellerService.ensureSellerHasChannel(ctx, seller);

    // Create product using ProductService
    // Include seller in customFields to assign product to seller
    const product = await this.productService.create(ctx, {
      translations: input.translations.map((t) => ({
        languageCode: t.languageCode as LanguageCode,
        name: t.name,
        slug: t.slug,
        description: t.description || '',
      })),
      enabled: input.enabled ?? true,
      featuredAssetId: input.featuredAssetId,
      assetIds: input.assetIds,
      facetValueIds: input.facetValueIds,
      customFields: {
        seller: seller.id, // Assign seller to product via custom field
      },
    });

    // Phase 5.4: Always assign product to channels so it's findable in the storefront.
    // Assign to default channel + seller's channel (if any). If seller has no channel,
    // assign to default only so the product is at least visible.
    const defaultChannel = await this.channelService.getDefaultChannel(ctx);
    const channelIds = sellerWithChannel.channelId
      ? [defaultChannel.id, sellerWithChannel.channelId]
      : [defaultChannel.id];
    await this.channelService.assignToChannels(ctx, Product, product.id, channelIds);

    // Create default variant so the product can be added to cart (products need at least one variant)
    const sku = `SKU-${product.id}-${Date.now()}`;
    const [variant] = await this.productVariantService.create(ctx, [
      {
        productId: product.id,
        sku,
        translations: input.translations.map((t) => ({
          languageCode: t.languageCode as LanguageCode,
          name: t.name,
        })),
        price: 999, // Default 9.99 in minor units
        stockOnHand: 10,
      },
    ]);
    await this.productVariantService.assignProductVariantsToChannel(ctx, {
      productVariantIds: [variant.id],
      channelId: defaultChannel.id,
    });
    if (sellerWithChannel.channelId) {
      await this.productVariantService.assignProductVariantsToChannel(ctx, {
        productVariantIds: [variant.id],
        channelId: sellerWithChannel.channelId,
      });
    }

    // Reload product with variants
    return (await this.productService.findOne(ctx, product.id, ['variants'])) || product;
  }

  /**
   * Update a seller's product
   *
   * Validates that the product belongs to the seller before allowing update.
   */
  @Mutation(() => Product)
  @Allow(Permission.Authenticated)
  @Transaction()
  async updateSellerProduct(
    @Ctx() ctx: RequestContext,
    @Args('input') input: UpdateSellerProductInput
  ): Promise<Product> {
    // Get current seller
    const seller = await this.getCurrentSeller(ctx);

    // Validate product ownership
    await this.productOwnershipService.validateProductOwnership(ctx, input.productId, seller.id);

    // Build update input
    const updateInput: UpdateProductInput = {
      id: input.productId,
    };

    if (input.translations) {
      updateInput.translations = input.translations.map((t) => ({
        languageCode: t.languageCode as LanguageCode,
        name: t.name,
        slug: t.slug,
        description: t.description || '',
      }));
    }

    if (input.enabled !== undefined) {
      updateInput.enabled = input.enabled;
    }

    if (input.featuredAssetId !== undefined) {
      updateInput.featuredAssetId = input.featuredAssetId;
    }

    if (input.assetIds !== undefined) {
      updateInput.assetIds = input.assetIds;
    }

    if (input.facetValueIds !== undefined) {
      updateInput.facetValueIds = input.facetValueIds;
    }

    // Update product
    return await this.productService.update(ctx, updateInput);
  }

  /**
   * Delete a seller's product
   *
   * Validates that the product belongs to the seller before allowing deletion.
   * Note: Product deletion in Vendure typically requires Admin API access.
   * This is a simplified implementation that marks the product as disabled.
   */
  @Mutation(() => DeletionResponse)
  @Allow(Permission.Authenticated)
  @Transaction()
  async deleteSellerProduct(
    @Ctx() ctx: RequestContext,
    @Args('productId', { type: () => ID }) productId: string
  ): Promise<DeletionResponse> {
    // Get current seller
    const seller = await this.getCurrentSeller(ctx);

    // Validate product ownership
    await this.productOwnershipService.validateProductOwnership(ctx, productId, seller.id);

    // For Shop API, we'll disable the product instead of deleting it
    // Full deletion requires Admin API access
    const product = await this.productService.findOne(ctx, productId);
    if (product) {
      await this.productService.update(ctx, {
        id: productId,
        enabled: false,
      });
      return {
        result: DeletionResult.DELETED,
        message: 'Product disabled successfully',
      };
    }

    return {
      result: DeletionResult.NOT_DELETED,
      message: 'Product not found',
    };
  }
}
