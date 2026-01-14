/**
 * Split Payment Service
 *
 * Service for calculating split payments between marketplace and sellers.
 * Part of Phase 3.2: Split Payment Processing
 *
 * Features:
 * - Split payment calculation (commission + seller payout)
 * - Multi-seller order support
 * - Per-seller commission rates
 * - Split payment validation
 * - Order line aggregation by seller
 */

import { Injectable } from '@nestjs/common';
import type { ID } from '@vendure/core';
import { CommissionService } from './commission.service';

/**
 * Split payment result
 */
export interface SplitPaymentResult {
  totalAmount: number; // Total order amount in cents
  commission: number; // Commission amount in cents
  sellerPayout: number; // Seller payout amount in cents
}

/**
 * Seller split payment detail
 */
export interface SellerSplitPayment {
  sellerId: ID;
  amount: number; // Payout amount for this seller in cents
  commission: number; // Commission deducted from this seller in cents
  lineTotal: number; // Total line value for this seller in cents
}

/**
 * Order split payment result
 */
export interface OrderSplitPaymentResult {
  orderId: ID;
  totalAmount: number; // Total order amount in cents
  commission: number; // Total commission in cents
  sellerPayout: number; // Total seller payout in cents
  sellerSplits: SellerSplitPayment[]; // Per-seller breakdown
}

/**
 * Order line for split payment calculation
 */
export interface OrderLineForSplitPayment {
  id: ID;
  linePrice: number; // Line price in cents
  sellerId: ID; // Seller ID who owns this product
}

/**
 * Order for split payment calculation
 */
export interface OrderForSplitPayment {
  id: ID;
  total: number; // Total order amount in cents
  lines: OrderLineForSplitPayment[];
}

/**
 * Split Payment Service
 *
 * Handles split payment calculations for multi-vendor orders
 */
@Injectable()
export class SplitPaymentService {
  constructor(private commissionService: CommissionService) {}

  /**
   * Calculate split payment for a given order total and commission rate
   *
   * @param orderTotal Order total in cents
   * @param commissionRate Commission rate as decimal (0-1)
   * @returns Split payment result
   */
  calculateSplitPayment(orderTotal: number, commissionRate: number): SplitPaymentResult {
    // Calculate commission
    const commission = this.commissionService.calculateCommission(orderTotal, commissionRate);

    // Calculate seller payout
    const sellerPayout = this.commissionService.calculateSellerPayout(orderTotal, commission);

    return {
      totalAmount: orderTotal,
      commission,
      sellerPayout,
    };
  }

  /**
   * Calculate split payment for an order with a single commission rate
   *
   * @param order Order with lines and total
   * @param commissionRate Commission rate as decimal (0-1)
   * @returns Order split payment result
   */
  calculateSplitPaymentForOrder(
    order: OrderForSplitPayment,
    commissionRate: number
  ): OrderSplitPaymentResult {
    // Group order lines by seller
    const sellerLineTotals = new Map<ID, number>();

    for (const line of order.lines) {
      const currentTotal = sellerLineTotals.get(line.sellerId) || 0;
      sellerLineTotals.set(line.sellerId, currentTotal + line.linePrice);
    }

    // Calculate split for each seller
    const sellerSplits: SellerSplitPayment[] = [];
    let totalCommission = 0;
    let totalSellerPayout = 0;

    for (const [sellerId, lineTotal] of sellerLineTotals.entries()) {
      const split = this.calculateSplitPayment(lineTotal, commissionRate);
      sellerSplits.push({
        sellerId,
        amount: split.sellerPayout,
        commission: split.commission,
        lineTotal,
      });
      totalCommission += split.commission;
      totalSellerPayout += split.sellerPayout;
    }

    return {
      orderId: order.id,
      totalAmount: order.total,
      commission: totalCommission,
      sellerPayout: totalSellerPayout,
      sellerSplits,
    };
  }

  /**
   * Calculate split payment for an order with per-seller commission rates
   *
   * @param order Order with lines and total
   * @param sellerCommissionRates Map of seller ID to commission rate
   * @param defaultCommissionRate Default commission rate if seller not in map
   * @returns Order split payment result
   */
  calculateSplitPaymentForOrderWithRates(
    order: OrderForSplitPayment,
    sellerCommissionRates: Map<ID, number>,
    defaultCommissionRate: number = 0.15
  ): OrderSplitPaymentResult {
    // Group order lines by seller
    const sellerLineTotals = new Map<ID, number>();

    for (const line of order.lines) {
      const currentTotal = sellerLineTotals.get(line.sellerId) || 0;
      sellerLineTotals.set(line.sellerId, currentTotal + line.linePrice);
    }

    // Calculate split for each seller with their specific rate
    const sellerSplits: SellerSplitPayment[] = [];
    let totalCommission = 0;
    let totalSellerPayout = 0;

    for (const [sellerId, lineTotal] of sellerLineTotals.entries()) {
      // Get commission rate for this seller, or use default
      const commissionRate = sellerCommissionRates.get(sellerId) ?? defaultCommissionRate;

      const split = this.calculateSplitPayment(lineTotal, commissionRate);
      sellerSplits.push({
        sellerId,
        amount: split.sellerPayout,
        commission: split.commission,
        lineTotal,
      });
      totalCommission += split.commission;
      totalSellerPayout += split.sellerPayout;
    }

    return {
      orderId: order.id,
      totalAmount: order.total,
      commission: totalCommission,
      sellerPayout: totalSellerPayout,
      sellerSplits,
    };
  }

  /**
   * Validate split payment calculation
   *
   * @param splitPayment Split payment result to validate
   * @throws Error if split payment is invalid
   */
  validateSplitPayment(splitPayment: SplitPaymentResult): void {
    if (splitPayment.commission < 0) {
      throw new Error('Commission cannot be negative');
    }

    if (splitPayment.sellerPayout < 0) {
      throw new Error('Seller payout cannot be negative');
    }

    if (splitPayment.commission > splitPayment.totalAmount) {
      throw new Error('Commission cannot exceed total amount');
    }

    // Verify commission + payout = total (allowing for rounding)
    const calculatedTotal = splitPayment.commission + splitPayment.sellerPayout;
    const difference = Math.abs(calculatedTotal - splitPayment.totalAmount);

    // Allow 1 cent difference for rounding
    if (difference > 1) {
      throw new Error(
        `Split payment amounts do not add up: commission (${splitPayment.commission}) + payout (${splitPayment.sellerPayout}) = ${calculatedTotal}, expected ${splitPayment.totalAmount}`
      );
    }
  }
}
