/**
 * Payout Scheduler Service
 *
 * Service for automatically transitioning HOLD payouts to PENDING status
 * on a scheduled basis (weekly/monthly).
 *
 * Part of Phase 3.3: Seller Payout System (deferred enhancement)
 *
 * This service is called by a scheduled task to automatically release
 * payouts that have been held in escrow.
 */

import { Injectable } from '@nestjs/common';
import type { RequestContext } from '@vendure/core';
import { TransactionalConnection } from '@vendure/core';
import { SellerPayoutService } from './seller-payout.service';
import { SellerPayout, PayoutStatus } from '../entities/seller-payout.entity';

/**
 * Payout Scheduler Service
 *
 * Handles automatic payout scheduling and transitions
 */
@Injectable()
export class PayoutSchedulerService {
  constructor(
    private connection: TransactionalConnection,
    private sellerPayoutService: SellerPayoutService
  ) {}

  /**
   * Process scheduled payouts
   * Transitions all HOLD payouts to PENDING status for all sellers
   *
   * This method is called by the scheduled task to automatically release
   * payouts that have been held in escrow.
   *
   * @param ctx RequestContext
   * @returns Summary of processed payouts
   */
  async processScheduledPayouts(ctx: RequestContext): Promise<{
    totalProcessed: number;
    sellersAffected: number;
    totalAmount: number;
  }> {
    const repository = this.connection.getRepository(ctx, SellerPayout);

    // Find all HOLD payouts across all sellers
    const holdPayouts = await repository.find({
      where: {
        status: PayoutStatus.HOLD,
      },
    });

    if (holdPayouts.length === 0) {
      return {
        totalProcessed: 0,
        sellersAffected: 0,
        totalAmount: 0,
      };
    }

    // Group payouts by seller to count unique sellers
    const sellerIds = new Set<number>();
    let totalAmount = 0;

    // Transition each payout to PENDING
    const updatedPayouts = holdPayouts.map((payout) => {
      sellerIds.add(parseInt(payout.sellerId.toString(), 10));
      totalAmount += payout.amount;
      payout.status = PayoutStatus.PENDING;
      payout.releasedAt = new Date();
      return payout;
    });

    // Save all updated payouts
    if (updatedPayouts.length > 0) {
      await repository.save(updatedPayouts);
    }

    return {
      totalProcessed: updatedPayouts.length,
      sellersAffected: sellerIds.size,
      totalAmount,
    };
  }

  /**
   * Get statistics about pending scheduled payouts
   * Returns count and total amount of HOLD payouts that would be processed
   *
   * @param ctx RequestContext
   * @returns Statistics about HOLD payouts
   */
  async getScheduledPayoutStats(ctx: RequestContext): Promise<{
    count: number;
    totalAmount: number;
    sellersAffected: number;
  }> {
    const repository = this.connection.getRepository(ctx, SellerPayout);

    const holdPayouts = await repository.find({
      where: {
        status: PayoutStatus.HOLD,
      },
    });

    const sellerIds = new Set<number>();
    let totalAmount = 0;

    for (const payout of holdPayouts) {
      sellerIds.add(parseInt(payout.sellerId.toString(), 10));
      totalAmount += payout.amount;
    }

    return {
      count: holdPayouts.length,
      totalAmount,
      sellersAffected: sellerIds.size,
    };
  }
}
