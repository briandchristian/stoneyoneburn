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

import { Resolver, Mutation, Args, ID, InputType, Field as GQLField } from '@nestjs/graphql';
import type { RequestContext } from '@vendure/core';
import {
  Ctx,
  Allow,
  Permission,
  Product,
  ProductService,
  CustomerService,
  TransactionalConnection,
  Transaction,
  DeletionResponse,
} from '@vendure/core';
import { SellerService } from '../services/seller.service';
import { ProductOwnershipService, ProductOwnershipError } from '../services/product-ownership.service';
import { MarketplaceSeller } from '../entities/seller.entity';
import { SellerErrorCode } from '../errors/seller-errors';

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
    private sellerService: SellerService,
    private customerService: CustomerService,
    private productOwnershipService: ProductOwnershipService,
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

    // Create product using ProductService
    // Include seller in customFields to assign product to seller
    const product = await this.productService.create(ctx, {
      translations: input.translations.map((t) => ({
        languageCode: t.languageCode as any,
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

    // Reload product to ensure custom fields are properly loaded
    return (await this.productService.findOne(ctx, product.id)) || product;
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
    await this.productOwnershipService.validateProductOwnership(
      ctx,
      input.productId,
      seller.id
    );

    // Build update input
    const updateInput: any = {
      id: input.productId,
    };

    if (input.translations) {
      updateInput.translations = input.translations.map((t) => ({
        languageCode: t.languageCode as any,
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

    // Delete product
    return await this.productService.delete(ctx, productId);
  }
}
