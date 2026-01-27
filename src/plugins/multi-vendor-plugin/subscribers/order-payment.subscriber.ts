/**
 * Order Payment Event Subscriber
 *
 * Subscribes to Vendure order and payment events to automatically:
 * - Create seller payouts when orders are paid
 * - Create commission history records for tracking
 *
 * Part of Phase 3.2: Split Payment Processing Integration
 */

import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import type { RequestContext, Order, Payment } from '@vendure/core';
import { EventBus, OrderPlacedEvent, PaymentStateTransitionEvent } from '@vendure/core';
import { filter } from 'rxjs/operators';
import { OrderPaymentHandlerService } from '../services/order-payment-handler.service';
import { CommissionHistoryService } from '../services/commission-history.service';
import { SellerPayoutService } from '../services/seller-payout.service';
import { CommissionHistoryStatus } from '../entities/commission-history.entity';
import type { OrderSplitPaymentResult } from '../services/split-payment.service';

/**
 * Order Payment Event Subscriber
 *
 * Listens to order and payment events to process split payments
 * Implements OnApplicationBootstrap to register event subscriptions when the application starts
 */
@Injectable()
export class OrderPaymentSubscriber implements OnApplicationBootstrap {
  constructor(
    private eventBus: EventBus,
    private orderPaymentHandlerService: OrderPaymentHandlerService,
    private commissionHistoryService: CommissionHistoryService,
    private sellerPayoutService: SellerPayoutService
  ) {}

  /**
   * Subscribe to events when the application bootstraps
   * This is called automatically by NestJS when the application starts
   */
  async onApplicationBootstrap() {
    // Subscribe to OrderPlacedEvent - fires when order transitions to PaymentAuthorized or PaymentSettled
    this.eventBus.ofType(OrderPlacedEvent).subscribe(async (event) => {
      await this.handleOrderPlaced(event.ctx, event.order);
    });

    // Subscribe to PaymentStateTransitionEvent - fires when payment state changes
    // We specifically want to handle when payment transitions to "Settled"
    this.eventBus
      .ofType(PaymentStateTransitionEvent)
      .pipe(filter((event) => event.toState === 'Settled'))
      .subscribe(async (event) => {
        await this.handlePaymentSettled(event.ctx, event.payment);
      });
  }

  /**
   * Handle OrderPlacedEvent
   * Creates seller payouts and commission history when an order is placed
   * Uses atomic processing to prevent race conditions when both events fire concurrently
   */
  private async handleOrderPlaced(ctx: RequestContext, order: Order): Promise<void> {
    try {
      // Use atomic processing to prevent race conditions
      // This wraps the check-and-create in a transaction, making it atomic
      const splitResult = await this.orderPaymentHandlerService.processOrderPaymentAtomically(
        ctx,
        order
      );

      // Create commission history records if split payment was processed
      if (splitResult) {
        await this.createCommissionHistoryRecords(ctx, splitResult);
      }
    } catch (error) {
      // Log error but don't throw - we don't want to break the order placement flow
      console.error(`Failed to process order payment for order ${order.id}:`, error);
    }
  }

  /**
   * Handle PaymentStateTransitionEvent when payment is settled
   * Creates seller payouts and commission history when payment is settled
   * Uses atomic processing to prevent race conditions when both events fire concurrently
   */
  private async handlePaymentSettled(ctx: RequestContext, payment: Payment): Promise<void> {
    try {
      // Payment entity should have order attached
      if (!payment.order) {
        console.warn(`Payment ${payment.id} has no order attached, skipping payout processing`);
        return;
      }

      // Use atomic processing to prevent race conditions
      // This wraps the check-and-create in a transaction, making it atomic
      const splitResult = await this.orderPaymentHandlerService.processOrderPaymentAtomically(
        ctx,
        payment.order
      );

      // Create commission history records if split payment was processed
      if (splitResult) {
        await this.createCommissionHistoryRecords(ctx, splitResult);
      }
    } catch (error) {
      // Log error but don't throw - we don't want to break the payment settlement flow
      console.error(`Failed to process payment settlement for payment ${payment.id}:`, error);
    }
  }

  /**
   * Create commission history records for each seller in the split payment result
   */
  private async createCommissionHistoryRecords(
    ctx: RequestContext,
    splitResult: any
  ): Promise<void> {
    try {
      for (const sellerSplit of splitResult.sellerSplits) {
        // Use commission rate from split result if available, otherwise calculate backwards
        // The OrderPaymentHandlerService adds commissionRate to each sellerSplit
        const commissionRate =
          (sellerSplit as any).commissionRate ??
          (sellerSplit.lineTotal > 0 ? sellerSplit.commission / sellerSplit.lineTotal : 0);

        await this.commissionHistoryService.createCommissionHistory(ctx, {
          orderId: splitResult.orderId,
          sellerId: sellerSplit.sellerId,
          commissionRate,
          orderTotal: sellerSplit.lineTotal,
          commissionAmount: sellerSplit.commission,
          sellerPayout: sellerSplit.amount,
          status: CommissionHistoryStatus.CALCULATED,
        });
      }
    } catch (error) {
      // Log error but don't throw - commission history is for tracking, not critical path
      console.error(`Failed to create commission history for order ${splitResult.orderId}:`, error);
    }
  }
}
