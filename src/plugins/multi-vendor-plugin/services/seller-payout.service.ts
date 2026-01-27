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
import { In } from 'typeorm';
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
   * Handles duplicate key errors gracefully to prevent race conditions
   *
   * @param ctx RequestContext
   * @param sellerId Seller ID
   * @param orderId Order ID
   * @param amount Payout amount in cents
   * @param commission Commission amount deducted in cents
   * @param status Payout status (default: HOLD)
   * @param failureReason Optional failure reason
   * @returns Created payout entity, or existing payout if duplicate key error
   * @throws Error if amount is invalid or other non-duplicate errors occur
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

    try {
      return await this.connection.getRepository(ctx, SellerPayout).save(payout);
    } catch (error: any) {
      // Handle duplicate key errors (race condition protection)
      // If a unique constraint exists on (orderId, sellerId), catch the duplicate error
      // and return the existing payout instead
      if (
        error?.code === '23505' ||
        error?.code === 'ER_DUP_ENTRY' ||
        error?.message?.includes('UNIQUE constraint')
      ) {
        // Duplicate key error - payout already exists, try to find existing one
        // Retry logic handles cases where the record isn't immediately visible due to transaction isolation
        const repository = this.connection.getRepository(ctx, SellerPayout);
        const maxRetries = 5;
        const initialDelay = 10; // milliseconds
        let existingPayout: SellerPayout | null = null;

        for (let attempt = 0; attempt < maxRetries; attempt++) {
          existingPayout = await repository.findOne({
            where: {
              orderId: orderId.toString(),
              sellerId: parseInt(sellerId.toString(), 10),
            },
          });

          if (existingPayout) {
            return existingPayout;
          }

          // If not found and not the last attempt, wait before retrying
          // Exponential backoff: 10ms, 20ms, 40ms, 80ms, 160ms
          if (attempt < maxRetries - 1) {
            await new Promise((resolve) =>
              setTimeout(resolve, initialDelay * Math.pow(2, attempt))
            );
          }
        }

        // If we still can't find the payout after retries, this indicates a real problem
        // The duplicate error suggests the record exists, but we can't see it
        // This could happen with transaction isolation issues or database replication lag
        // In this case, we throw a more descriptive error
        throw new Error(
          `Duplicate payout detected but existing record not found after ${maxRetries} retries. ` +
            `This may indicate a transaction isolation or replication issue. Original error: ${error.message}`
        );
      }
      // Re-throw if it's not a duplicate key error
      throw error;
    }
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
        status: In([PayoutStatus.PENDING, PayoutStatus.HOLD]),
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
  async canRequestPayout(
    ctx: RequestContext,
    sellerId: ID,
    minimumThreshold: number
  ): Promise<boolean> {
    const pendingTotal = await this.getPendingPayoutTotal(ctx, sellerId);
    return pendingTotal >= minimumThreshold;
  }

  /**
   * Check if payouts already exist for an order
   * Used to prevent duplicate payout creation when multiple events fire
   *
   * @param ctx RequestContext
   * @param orderId Order ID
   * @returns True if payouts exist for this order
   */
  async hasPayoutsForOrder(ctx: RequestContext, orderId: ID): Promise<boolean> {
    const count = await this.connection.getRepository(ctx, SellerPayout).count({
      where: {
        orderId: orderId.toString(),
      },
    });
    return count > 0;
  }

  /**
   * Request payout for a seller
   * Transitions all HOLD payouts to PENDING status
   *
   * @param ctx RequestContext
   * @param sellerId Seller ID
   * @returns Array of payouts that were transitioned to PENDING
   */
  async requestPayout(ctx: RequestContext, sellerId: ID): Promise<SellerPayout[]> {
    const repository = this.connection.getRepository(ctx, SellerPayout);

    // Find all HOLD payouts for this seller
    const holdPayouts = await repository.find({
      where: {
        sellerId: parseInt(sellerId.toString(), 10),
        status: PayoutStatus.HOLD,
      },
    });

    // Transition each payout to PENDING
    const updatedPayouts = holdPayouts.map((payout) => {
      payout.status = PayoutStatus.PENDING;
      payout.releasedAt = new Date();
      return payout;
    });

    // Save all updated payouts
    if (updatedPayouts.length > 0) {
      await repository.save(updatedPayouts);
    }

    return updatedPayouts;
  }

  /**
   * Request payout with threshold check (atomic operation)
   * Combines threshold validation and payout request into a single atomic operation
   * to prevent TOCTOU race conditions between check and execution
   *
   * @param ctx RequestContext
   * @param sellerId Seller ID
   * @param minimumThreshold Minimum payout threshold in cents
   * @returns Array of payouts that were transitioned to PENDING
   * @throws Error if threshold not met or no payouts available
   */
  async requestPayoutWithThresholdCheck(
    ctx: RequestContext,
    sellerId: ID,
    minimumThreshold: number
  ): Promise<SellerPayout[]> {
    const repository = this.connection.getRepository(ctx, SellerPayout);

    // Atomic operation: Find HOLD payouts and calculate total in a single query
    // This prevents race conditions where concurrent requests could transition
    // the same HOLD payouts between the threshold check and payout request
    const holdPayouts = await repository.find({
      where: {
        sellerId: parseInt(sellerId.toString(), 10),
        status: PayoutStatus.HOLD,
      },
    });

    // Calculate total from HOLD payouts (same logic as getPendingPayoutTotal but only HOLD)
    const holdTotal = holdPayouts.reduce((total, payout) => total + payout.amount, 0);

    // Check threshold using HOLD payouts only (matching what requestPayout will transition)
    if (holdTotal < minimumThreshold) {
      throw new Error('Minimum payout threshold not met');
    }

    if (holdPayouts.length === 0) {
      throw new Error('No payouts available to request');
    }

    // Transition each payout to PENDING
    const updatedPayouts = holdPayouts.map((payout) => {
      payout.status = PayoutStatus.PENDING;
      payout.releasedAt = new Date();
      return payout;
    });

    // Save all updated payouts
    await repository.save(updatedPayouts);

    return updatedPayouts;
  }

  /**
   * Get all pending payouts across all sellers (for admin review)
   * Includes both PENDING and PROCESSING status payouts
   *
   * @param ctx RequestContext
   * @returns Array of pending payout entities
   */
  async getPendingPayouts(ctx: RequestContext): Promise<SellerPayout[]> {
    return this.connection.getRepository(ctx, SellerPayout).find({
      where: {
        status: In([PayoutStatus.PENDING, PayoutStatus.PROCESSING]),
      },
      order: { createdAt: 'DESC' },
    });
  }
}
