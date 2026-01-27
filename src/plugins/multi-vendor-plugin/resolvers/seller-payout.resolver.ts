/**
 * Seller Payout Resolver
 *
 * GraphQL resolver for seller payout operations (Shop API).
 * Part of Phase 3.3: Seller Payout System
 *
 * This resolver provides:
 * - requestPayout: Mutation for sellers to request payouts
 * - payoutHistory: Query for seller payout history
 * - pendingPayoutTotal: Query for total pending payout amount
 */

import { Resolver, Query, Mutation, Args, ID, ObjectType, Field, Int } from '@nestjs/graphql';
import type { RequestContext } from '@vendure/core';
import { Ctx, Allow, Permission } from '@vendure/core';
import { SellerPayoutService, PayoutStatus } from '../services/seller-payout.service';
import { SellerService } from '../services/seller.service';
import { SellerPayout } from '../entities/seller-payout.entity';

/**
 * GraphQL Types for Seller Payout
 */
@ObjectType()
export class PayoutRequestResult {
  @Field(() => ID)
  id!: string;

  @Field(() => ID)
  sellerId!: string;

  @Field(() => Int)
  amount!: number;

  @Field(() => String)
  status!: PayoutStatus;
}

/**
 * Seller Payout Resolver
 *
 * Handles seller payout requests and queries
 */
@Resolver()
export class SellerPayoutResolver {
  constructor(
    private payoutService: SellerPayoutService,
    private sellerService: SellerService
  ) {}

  /**
   * Request payout for seller
   * Transitions all HOLD payouts to PENDING status
   *
   * @param ctx RequestContext
   * @param sellerId Seller ID
   * @param minimumThreshold Minimum payout threshold in cents
   * @returns Payout request result
   */
  @Mutation()
  @Allow(Permission.Owner)
  async requestPayout(
    @Ctx() ctx: RequestContext,
    @Args('sellerId', { type: () => ID }) sellerId: string,
    @Args('minimumThreshold', { type: () => Int, defaultValue: 0 }) minimumThreshold: number
  ): Promise<PayoutRequestResult> {
    // Check if seller can request payout (meets minimum threshold)
    const canRequest = await this.payoutService.canRequestPayout(ctx, sellerId, minimumThreshold);

    if (!canRequest) {
      throw new Error('Minimum payout threshold not met');
    }

    // Request payout (transitions HOLD to PENDING)
    const updatedPayouts = await this.payoutService.requestPayout(ctx, sellerId);

    if (updatedPayouts.length === 0) {
      throw new Error('No payouts available to request');
    }

    // Calculate total amount
    const totalAmount = updatedPayouts.reduce((sum, payout) => sum + payout.amount, 0);

    return {
      id: updatedPayouts[0].id.toString(),
      sellerId: sellerId,
      amount: totalAmount,
      status: PayoutStatus.PENDING,
    };
  }

  /**
   * Get payout history for a seller
   *
   * @param ctx RequestContext
   * @param sellerId Seller ID
   * @returns Array of payout entities
   */
  @Query()
  @Allow(Permission.Owner)
  async payoutHistory(
    @Ctx() ctx: RequestContext,
    @Args('sellerId', { type: () => ID }) sellerId: string
  ): Promise<SellerPayout[]> {
    return this.payoutService.getPayoutsForSeller(ctx, sellerId);
  }

  /**
   * Get total pending payout amount for a seller
   *
   * @param ctx RequestContext
   * @param sellerId Seller ID
   * @returns Total pending payout amount in cents
   */
  @Query()
  @Allow(Permission.Owner)
  async pendingPayoutTotal(
    @Ctx() ctx: RequestContext,
    @Args('sellerId', { type: () => ID }) sellerId: string
  ): Promise<number> {
    return this.payoutService.getPendingPayoutTotal(ctx, sellerId);
  }
}
