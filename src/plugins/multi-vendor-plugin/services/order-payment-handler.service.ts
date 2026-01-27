/**
 * Order Payment Handler Service
 *
 * Service for processing order payments and creating seller payouts.
 * Part of Phase 3.2: Split Payment Processing
 *
 * This service:
 * - Calculates split payments when orders are placed
 * - Creates payout records for sellers
 * - Handles escrow/holding funds until fulfillment
 * - Supports per-seller commission rates
 */

import { Injectable } from '@nestjs/common';
import type { ID, RequestContext, Order } from '@vendure/core';
import { Product, ProductVariant } from '@vendure/core';
import { TransactionalConnection } from '@vendure/core';
import {
  SplitPaymentService,
  OrderForSplitPayment,
  OrderLineForSplitPayment,
  OrderSplitPaymentResult,
} from './split-payment.service';
import { SellerPayoutService, PayoutStatus } from './seller-payout.service';
import { SellerPayout } from '../entities/seller-payout.entity';
import { CommissionService, DEFAULT_COMMISSION_RATE } from './commission.service';
import { MarketplaceSeller } from '../entities/seller.entity';

/**
 * Order payment processing result
 */
export interface OrderPaymentProcessingResult {
  orderId: ID;
  totalCommission: number; // Total commission in cents
  payouts: SellerPayout[]; // Created payout records
}

/**
 * Order Payment Handler Service
 *
 * Processes order payments and creates seller payouts
 */
@Injectable()
export class OrderPaymentHandlerService {
  constructor(
    private connection: TransactionalConnection,
    private splitPaymentService: SplitPaymentService,
    private sellerPayoutService: SellerPayoutService,
    private commissionService: CommissionService
  ) {}

  /**
   * Process order payment using Vendure's Order entity
   * This method extracts order lines, gets seller IDs, and creates payout records
   *
   * @param ctx RequestContext
   * @param order Vendure Order entity
   * @returns Promise that resolves with split payment result (for commission history creation)
   */
  async processOrderPayment(
    ctx: RequestContext,
    order: Order
  ): Promise<OrderSplitPaymentResult | null> {
    const orderLinesForSplit: OrderLineForSplitPayment[] = [];
    const sellerCommissionRates = new Map<ID, number>();

    // Collect all unique seller IDs from order lines and their commission rates
    for (const line of order.lines) {
      // Get product from order line
      const productVariant = await this.connection.getRepository(ctx, ProductVariant).findOne({
        where: { id: line.productVariantId },
        relations: ['product'],
      });

      if (!productVariant || !productVariant.product) {
        continue; // Skip lines without products
      }

      // Query product seller ID directly from the custom field column
      // Column name: customFieldsSellerid (Vendure naming convention)
      const productResult = await this.connection
        .getRepository(ctx, Product)
        .createQueryBuilder('product')
        .select('product.customFieldsSellerid', 'sellerId')
        .where('product.id = :productId', { productId: productVariant.product.id })
        .getRawOne();

      if (productResult && productResult.sellerId) {
        const sellerId = productResult.sellerId;
        // Use proratedLinePriceWithTax for the line price (includes tax and discounts)
        const linePrice = line.proratedLinePriceWithTax;

        orderLinesForSplit.push({
          id: line.id,
          linePrice,
          sellerId: sellerId.toString(),
        });

        // Fetch seller's custom commission rate if not already fetched
        if (!sellerCommissionRates.has(sellerId.toString())) {
          const seller = await this.connection
            .getRepository(ctx, MarketplaceSeller)
            .findOne({ where: { id: sellerId } });
          if (seller && seller.commissionRate !== null && seller.commissionRate !== undefined) {
            sellerCommissionRates.set(sellerId.toString(), seller.commissionRate);
          }
        }
      }
    }

    if (orderLinesForSplit.length === 0) {
      // No seller products in this order, no payouts needed
      return null;
    }

    // Convert to OrderForSplitPayment format
    const orderForSplit: OrderForSplitPayment = {
      id: order.id,
      total: order.totalWithTax, // Use totalWithTax for the order total
      lines: orderLinesForSplit,
    };

    // Calculate split payments
    const splitResult = this.splitPaymentService.calculateSplitPaymentForOrderWithRates(
      orderForSplit,
      sellerCommissionRates,
      DEFAULT_COMMISSION_RATE
    );

    // Add commission rate to each seller split for commission history tracking
    // This ensures we store the actual rate used, not a calculated approximation
    for (const sellerSplit of splitResult.sellerSplits) {
      const sellerIdStr = sellerSplit.sellerId.toString();
      const commissionRate = sellerCommissionRates.get(sellerIdStr) ?? DEFAULT_COMMISSION_RATE;
      // Add commission rate to the split for commission history creation
      (sellerSplit as any).commissionRate = commissionRate;

      await this.sellerPayoutService.createPayout(
        ctx,
        sellerSplit.sellerId,
        order.id,
        sellerSplit.amount,
        sellerSplit.commission,
        PayoutStatus.HOLD // Payouts are initially on HOLD
      );
    }

    // Return split result for commission history creation
    return splitResult;
  }

  /**
   * Atomically process order payment with deduplication
   * Prevents race conditions when multiple events fire concurrently for the same order
   *
   * Protection mechanisms:
   * 1. Initial check to avoid unnecessary work (optimistic)
   * 2. Duplicate key error handling in createPayout (pessimistic, primary protection)
   * 3. Recommended: Add unique constraint on (orderId, sellerId) in database
   *
   * @param ctx RequestContext
   * @param order Vendure Order entity
   * @returns Promise that resolves with split payment result, or null if payouts already exist
   */
  async processOrderPaymentAtomically(
    ctx: RequestContext,
    order: Order
  ): Promise<OrderSplitPaymentResult | null> {
    // Optimistic check: if payouts already exist, skip processing
    // This avoids unnecessary work but doesn't prevent race conditions on its own
    const hasPayouts = await this.sellerPayoutService.hasPayoutsForOrder(ctx, order.id);
    if (hasPayouts) {
      return null;
    }

    // Process order payment
    // The createPayout method handles duplicate key errors gracefully as the primary protection
    // If two handlers run concurrently, one will create payouts and the other will catch
    // the duplicate key error and return the existing payout (idempotent behavior)
    try {
      return await this.processOrderPayment(ctx, order);
    } catch (error: any) {
      // Additional error handling: if processOrderPayment throws a duplicate error
      // (shouldn't happen if createPayout handles it, but added as extra safety)
      if (
        error?.code === '23505' ||
        error?.code === 'ER_DUP_ENTRY' ||
        error?.message?.includes('UNIQUE constraint') ||
        error?.message?.includes('duplicate')
      ) {
        // Duplicate detected - another handler created payouts, return null (idempotent)
        return null;
      }
      // Re-throw if it's not a duplicate error
      throw error;
    }
  }
}
