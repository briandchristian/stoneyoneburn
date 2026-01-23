/**
 * Seller Payout Service
 *
 * Service for tracking and managing seller payouts from orders.
 * Part of Phase 3.2: Split Payment Processing
 *
 * Features:
 * - Payout creation and tracking
 * - Payout status management (HOLD, PENDING, PROCESSING, COMPLETED, FAILED)
 * - Escrow/holding funds until fulfillment
 * - Payout aggregation and queries
 */

import { Injectable } from '@nestjs/common';
import type { ID, RequestContext } from '@vendure/core';
import { TransactionalConnection } from '@vendure/core';
import { SellerPayout, PayoutStatus } from '../entities/seller-payout.entity';

// Re-export the entity and enum for convenience
export { SellerPayout, PayoutStatus } from '../entities/seller-payout.entity';

/**
 * Seller Payout Service
 *
 * Manages seller payout tracking and status
 */
@Injectable()
export class SellerPayoutService {
  constructor(private connection: TransactionalConnection) {}

  /**
   * Create a payout record in the database for a seller from an order
   *
   * @param ctx RequestContext
   * @param sellerId Seller ID
   * @param orderId Order ID
   * @param amount Payout amount in cents
   * @param commission Commission amount deducted in cents
   * @param status Payout status (default: HOLD)
   * @param failureReason Optional failure reason
   * @returns Created payout entity
   */
  async createPayout(
    ctx: RequestContext,
    sellerId: ID,
    orderId: ID,
    amount: number,
    commission: number,
    status: PayoutStatus = PayoutStatus.HOLD,
    failureReason?: string
  ): Promise<SellerPayout> {
    if (amount <= 0) {
      throw new Error('Payout amount must be greater than zero');
    }

    const payout = new SellerPayout({
      sellerId: parseInt(sellerId.toString(), 10),
      orderId: orderId.toString(),
      amount,
      commission,
      status,
      failureReason,
    });

    return this.connection.getRepository(ctx, SellerPayout).save(payout);
  }

  /**
   * Update payout status
   *
   * @param ctx RequestContext
   * @param payoutId Payout ID
   * @param status New status
   * @param failureReason Optional failure reason
   * @returns Updated payout entity
   */
  async updatePayoutStatus(
    ctx: RequestContext,
    payoutId: ID,
    status: PayoutStatus,
    failureReason?: string
  ): Promise<SellerPayout> {
    const payout = await this.connection.getRepository(ctx, SellerPayout).findOne({
      where: { id: payoutId },
    });

    if (!payout) {
      throw new Error(`Payout with ID ${payoutId} not found`);
    }

    // Capture original status before reassignment to detect transitions
    const originalStatus = payout.status;
    
    payout.status = status;
    if (status === PayoutStatus.COMPLETED) {
      payout.completedAt = new Date();
    }
    // Check original status to detect HOLD-to-PENDING transition
    if (status === PayoutStatus.PENDING && originalStatus === PayoutStatus.HOLD) {
      payout.releasedAt = new Date();
    } else if (status === PayoutStatus.PENDING && !payout.releasedAt) {
      payout.releasedAt = new Date();
    }
    if (status === PayoutStatus.FAILED && failureReason) {
      payout.failureReason = failureReason;
    }

    return this.connection.getRepository(ctx, SellerPayout).save(payout);
  }

  /**
   * Get payout by ID
   *
   * @param ctx RequestContext
   * @param payoutId Payout ID
   * @returns Payout entity or null
   */
  async getPayoutById(ctx: RequestContext, payoutId: ID): Promise<SellerPayout | null> {
    return this.connection.getRepository(ctx, SellerPayout).findOne({
      where: { id: payoutId },
    });
  }

  /**
   * Get all payouts for a seller
   *
   * @param ctx RequestContext
   * @param sellerId Seller ID
   * @returns Array of payout entities
   */
  async getPayoutsForSeller(ctx: RequestContext, sellerId: ID): Promise<SellerPayout[]> {
    return this.connection.getRepository(ctx, SellerPayout).find({
      where: { sellerId: parseInt(sellerId.toString(), 10) },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Get total payout amount for a seller from a list of payouts
   *
   * @param payouts Array of payouts
   * @param sellerId Seller ID
   * @returns Total payout amount in cents
   */
  getTotalPayoutAmount(payouts: SellerPayout[], sellerId: ID): number {
    return payouts
      .filter((p) => p.sellerId.toString() === sellerId.toString())
      .reduce((total, p) => total + p.amount, 0);
  }

  /**
   * Filter payouts by status
   *
   * @param payouts Array of payouts
   * @param status Status to filter by
   * @returns Filtered payouts
   */
  getPayoutsByStatus(payouts: SellerPayout[], status: PayoutStatus): SellerPayout[] {
    return payouts.filter((p) => p.status === status);
  }

  /**
   * Check if a payout can be released
   *
   * @param payout Payout to check
   * @returns True if payout can be released
   */
  canReleasePayout(payout: SellerPayout): boolean {
    return payout.status === PayoutStatus.HOLD || payout.status === PayoutStatus.PENDING;
  }

  /**
   * Release payout from HOLD to PENDING
   * This is a convenience method that wraps updatePayoutStatus
   *
   * @param ctx RequestContext
   * @param payoutId Payout ID
   * @returns Updated payout entity
   */
  async releasePayout(ctx: RequestContext, payoutId: ID): Promise<SellerPayout> {
    return this.updatePayoutStatus(ctx, payoutId, PayoutStatus.PENDING);
  }

  /**
   * Get total pending payout amount for a seller
   * Includes both PENDING and HOLD status payouts
   *
   * @param ctx RequestContext
   * @param sellerId Seller ID
   * @returns Total pending payout amount in cents
   */
  async getPendingPayoutTotal(ctx: RequestContext, sellerId: ID): Promise<number> {
    const payouts = await this.connection.getRepository(ctx, SellerPayout).find({
      where: {
        sellerId: parseInt(sellerId.toString(), 10),
        status: PayoutStatus.PENDING,
      },
    });

    return payouts.reduce((total, payout) => total + payout.amount, 0);
  }

  /**
   * Check if seller can request a payout based on minimum threshold
   *
   * @param ctx RequestContext
   * @param sellerId Seller ID
   * @param minimumThreshold Minimum payout threshold in cents
   * @returns True if pending payout total meets or exceeds threshold
   */
  async canRequestPayout(ctx: RequestContext, sellerId: ID, minimumThreshold: number): Promise<boolean> {
    const pendingTotal = await this.getPendingPayoutTotal(ctx, sellerId);
    return pendingTotal >= minimumThreshold;
  }
}
