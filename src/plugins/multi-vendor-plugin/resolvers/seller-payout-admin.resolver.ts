/**
 * Seller Payout Admin Resolver
 *
 * GraphQL resolver for admin payout approval operations (Admin API).
 * Part of Phase 3.3: Seller Payout System - Admin Approval Workflow
 *
 * This resolver provides:
 * - approvePayout: Mutation for admins to approve pending payouts
 * - rejectPayout: Mutation for admins to reject pending payouts
 * - pendingPayouts: Query for admins to view all pending payouts
 */

import { Resolver, Query, Mutation, Args, ID, ObjectType, Field } from '@nestjs/graphql';
import type { RequestContext } from '@vendure/core';
import { Ctx, Allow, Permission } from '@vendure/core';
import { SellerPayoutService, PayoutStatus } from '../services/seller-payout.service';
import { SellerPayout } from '../entities/seller-payout.entity';

/**
 * GraphQL Types for Admin Payout Operations
 */
@ObjectType()
export class PayoutApprovalResult {
  @Field(() => ID)
  id!: string;

  @Field(() => ID)
  sellerId!: string;

  @Field(() => ID)
  orderId!: string;

  @Field(() => Number)
  amount!: number;

  @Field(() => String)
  status!: PayoutStatus;

  @Field(() => String, { nullable: true })
  failureReason?: string;
}

/**
 * Seller Payout Admin Resolver
 *
 * Handles admin payout approval and rejection
 */
@Resolver()
export class SellerPayoutAdminResolver {
  constructor(private payoutService: SellerPayoutService) {}

  /**
   * Approve a pending payout
   * Transitions payout from PENDING/PROCESSING to COMPLETED
   *
   * @param ctx RequestContext
   * @param payoutId Payout ID
   * @returns Approved payout result
   */
  @Mutation()
  @Allow(Permission.UpdateOrder, Permission.UpdatePaymentMethod)
  async approvePayout(
    @Ctx() ctx: RequestContext,
    @Args('payoutId', { type: () => ID }) payoutId: string
  ): Promise<PayoutApprovalResult> {
    const payout = await this.payoutService.getPayoutById(ctx, payoutId);

    if (!payout) {
      throw new Error('Payout not found');
    }

    // Only PENDING or PROCESSING payouts can be approved
    if (payout.status !== PayoutStatus.PENDING && payout.status !== PayoutStatus.PROCESSING) {
      throw new Error('Only PENDING or PROCESSING payouts can be approved');
    }

    // Update to COMPLETED status
    const updatedPayout = await this.payoutService.updatePayoutStatus(
      ctx,
      payoutId,
      PayoutStatus.COMPLETED
    );

    return {
      id: updatedPayout.id.toString(),
      sellerId: updatedPayout.sellerId.toString(),
      orderId: updatedPayout.orderId.toString(),
      amount: updatedPayout.amount,
      status: updatedPayout.status,
    };
  }

  /**
   * Reject a pending payout
   * Transitions payout from PENDING/PROCESSING to FAILED with reason
   *
   * @param ctx RequestContext
   * @param payoutId Payout ID
   * @param reason Rejection reason (required)
   * @returns Rejected payout result
   */
  @Mutation()
  @Allow(Permission.UpdateOrder, Permission.UpdatePaymentMethod)
  async rejectPayout(
    @Ctx() ctx: RequestContext,
    @Args('payoutId', { type: () => ID }) payoutId: string,
    @Args('reason', { type: () => String }) reason: string
  ): Promise<PayoutApprovalResult> {
    if (!reason || reason.trim().length === 0) {
      throw new Error('Rejection reason is required');
    }

    const payout = await this.payoutService.getPayoutById(ctx, payoutId);

    if (!payout) {
      throw new Error('Payout not found');
    }

    // Only PENDING or PROCESSING payouts can be rejected
    if (payout.status !== PayoutStatus.PENDING && payout.status !== PayoutStatus.PROCESSING) {
      throw new Error('Only PENDING or PROCESSING payouts can be rejected');
    }

    // Update to FAILED status with reason
    const updatedPayout = await this.payoutService.updatePayoutStatus(
      ctx,
      payoutId,
      PayoutStatus.FAILED,
      reason.trim()
    );

    return {
      id: updatedPayout.id.toString(),
      sellerId: updatedPayout.sellerId.toString(),
      orderId: updatedPayout.orderId.toString(),
      amount: updatedPayout.amount,
      status: updatedPayout.status,
      failureReason: updatedPayout.failureReason,
    };
  }

  /**
   * Get all pending payouts for admin review
   * Includes both PENDING and PROCESSING status payouts
   *
   * @param ctx RequestContext
   * @returns Array of pending payout entities
   */
  @Query()
  @Allow(Permission.ReadOrder, Permission.ReadPaymentMethod)
  async pendingPayouts(@Ctx() ctx: RequestContext): Promise<SellerPayout[]> {
    return this.payoutService.getPendingPayouts(ctx);
  }
}
