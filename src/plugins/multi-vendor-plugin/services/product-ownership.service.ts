/**
 * Product Ownership Service
 *
 * Service for validating product ownership and seller permissions.
 * Part of Phase 2.3: Seller-Product Association
 *
 * This service provides validation methods to ensure:
 * - Products belong to sellers
 * - Sellers can only manage their own products
 * - Sellers must be verified to create products
 */

import { Injectable } from '@nestjs/common';
import type { RequestContext, ID } from '@vendure/core';
import { TransactionalConnection, Product, SellerVerificationStatus } from '@vendure/core';
import { MarketplaceSeller } from '../entities/seller.entity';
import { SellerErrorCode } from '../errors/seller-errors';

/**
 * Product Ownership Error
 *
 * Thrown when product ownership validation fails
 */
export class ProductOwnershipError extends Error {
  constructor(
    public readonly errorCode: SellerErrorCode,
    message: string
  ) {
    super(message);
    this.name = 'ProductOwnershipError';
  }
}

/**
 * Product Ownership Service
 *
 * Handles validation of product ownership and seller permissions
 */
@Injectable()
export class ProductOwnershipService {
  constructor(private connection: TransactionalConnection) {}

  /**
   * Validate that a seller can create products
   *
   * Checks:
   * - Seller exists
   * - Seller is verified (VERIFIED status)
   * - Seller is active
   *
   * @throws ProductOwnershipError if seller cannot create products
   */
  async validateSellerCanCreateProducts(
    ctx: RequestContext,
    sellerId: ID
  ): Promise<void> {
    const seller = await this.connection
      .getRepository(ctx, MarketplaceSeller)
      .findOne({ where: { id: sellerId } });

    if (!seller) {
      throw new ProductOwnershipError(
        SellerErrorCode.SELLER_NOT_FOUND,
        'Seller not found'
      );
    }

    if (seller.verificationStatus !== SellerVerificationStatus.VERIFIED) {
      throw new ProductOwnershipError(
        SellerErrorCode.SELLER_NOT_VERIFIED,
        'Seller must be verified to create products'
      );
    }

    if (!seller.isActive) {
      throw new ProductOwnershipError(
        SellerErrorCode.SELLER_NOT_ACTIVE,
        'Seller is not active'
      );
    }
  }

  /**
   * Validate that a product belongs to a seller
   *
   * @throws ProductOwnershipError if product does not belong to seller
   */
  async validateProductOwnership(
    ctx: RequestContext,
    productId: ID,
    sellerId: ID
  ): Promise<void> {
    const product = await this.connection
      .getRepository(ctx, Product)
      .findOne({
        where: { id: productId },
        relations: ['customFields'],
      });

    if (!product) {
      throw new ProductOwnershipError(
        SellerErrorCode.PRODUCT_NOT_FOUND,
        'Product not found'
      );
    }

    // Check if product has a seller
    const productSellerId = (product.customFields as any)?.sellerId;
    if (!productSellerId) {
      throw new ProductOwnershipError(
        SellerErrorCode.PRODUCT_OWNERSHIP_REQUIRED,
        'Product must belong to a seller'
      );
    }

    // Check if product belongs to the specified seller
    if (productSellerId.toString() !== sellerId.toString()) {
      throw new ProductOwnershipError(
        SellerErrorCode.PRODUCT_NOT_OWNED_BY_SELLER,
        'Product does not belong to this seller'
      );
    }
  }

  /**
   * Validate that a product has a seller (ownership required)
   *
   * @throws ProductOwnershipError if product has no seller
   */
  async validateProductHasSeller(ctx: RequestContext, productId: ID): Promise<void> {
    const product = await this.connection
      .getRepository(ctx, Product)
      .findOne({
        where: { id: productId },
        relations: ['customFields'],
      });

    if (!product) {
      throw new ProductOwnershipError(
        SellerErrorCode.PRODUCT_NOT_FOUND,
        'Product not found'
      );
    }

    const productSellerId = (product.customFields as any)?.sellerId;
    if (!productSellerId) {
      throw new ProductOwnershipError(
        SellerErrorCode.PRODUCT_OWNERSHIP_REQUIRED,
        'Product must belong to a seller'
      );
    }
  }

  /**
   * Get the seller ID for a product
   *
   * @returns Seller ID if product has a seller, null otherwise
   */
  async getProductSellerId(ctx: RequestContext, productId: ID): Promise<ID | null> {
    const product = await this.connection
      .getRepository(ctx, Product)
      .findOne({
        where: { id: productId },
        relations: ['customFields'],
      });

    if (!product) {
      return null;
    }

    return (product.customFields as any)?.sellerId || null;
  }

  /**
   * Check if a user is an admin
   *
   * Admins bypass product ownership validation
   */
  isAdmin(ctx: RequestContext): boolean {
    // In Vendure, admins have different user context
    // This is a simplified check - in practice, you'd check ctx.user?.roles
    // For now, we assume admins use Admin API and sellers use Shop API
    // Shop API requests are from customers/sellers
    return false; // Always false for Shop API (seller context)
  }
}
