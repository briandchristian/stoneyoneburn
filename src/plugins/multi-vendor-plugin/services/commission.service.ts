/**
 * Commission Service
 *
 * Service for calculating commissions, seller payouts, and managing commission rates.
 * Part of Phase 3.1: Commission Configuration
 *
 * Features:
 * - Commission rate validation
 * - Commission calculation from order totals
 * - Seller payout calculation
 * - Per-seller commission rates support
 * - Order line aggregation for commission calculation
 */

import { Injectable } from '@nestjs/common';

/**
 * Default commission rate (15%)
 * This can be overridden per-seller via custom fields
 */
export const DEFAULT_COMMISSION_RATE = 0.15;

/**
 * Commission calculation result
 */
export interface CommissionCalculationResult {
  totalOrderValue: number; // Total order value in cents
  commission: number; // Commission amount in cents
  sellerPayout: number; // Seller payout amount in cents
}

/**
 * Order line for commission calculation
 */
export interface OrderLineForCommission {
  linePrice: number; // Line price in cents
  sellerId: string; // Seller ID who owns this product
}

/**
 * Commission Service
 *
 * Handles commission calculations and validation
 */
@Injectable()
export class CommissionService {
  /**
   * Default commission rate
   */
  private readonly defaultCommissionRate = DEFAULT_COMMISSION_RATE;

  /**
   * Calculate commission from order total and commission rate
   *
   * @param orderTotal Order total in cents (e.g., 10000 = $100.00)
   * @param commissionRate Commission rate as decimal (e.g., 0.15 = 15%)
   * @returns Commission amount in cents
   */
  calculateCommission(orderTotal: number, commissionRate: number): number {
    this.validateCommissionRate(commissionRate);

    // Calculate commission: orderTotal * commissionRate
    // Round to nearest cent
    const commission = Math.round(orderTotal * commissionRate);
    return commission;
  }

  /**
   * Calculate seller payout from order total and commission
   *
   * @param orderTotal Order total in cents
   * @param commission Commission amount in cents
   * @returns Seller payout amount in cents
   */
  calculateSellerPayout(orderTotal: number, commission: number): number {
    if (commission < 0 || commission > orderTotal) {
      throw new Error('Invalid commission: commission must be between 0 and order total');
    }

    return orderTotal - commission;
  }

  /**
   * Validate commission rate
   *
   * @param commissionRate Commission rate as decimal (0-1)
   * @throws Error if commission rate is invalid
   */
  validateCommissionRate(commissionRate: number): void {
    if (isNaN(commissionRate)) {
      throw new Error('Commission rate cannot be NaN');
    }

    if (!isFinite(commissionRate)) {
      throw new Error('Commission rate must be a finite number');
    }

    if (commissionRate < 0) {
      throw new Error('Commission rate cannot be negative');
    }

    if (commissionRate > 1) {
      throw new Error('Commission rate cannot exceed 100% (1.0)');
    }
  }

  /**
   * Get default commission rate
   *
   * @returns Default commission rate as decimal (0-1)
   */
  getDefaultCommissionRate(): number {
    return this.defaultCommissionRate;
  }

  /**
   * Calculate commission for multiple order lines from the same seller
   *
   * @param orderLines Array of order lines with prices and seller IDs
   * @param commissionRate Commission rate as decimal (0-1)
   * @returns Commission calculation result
   */
  calculateCommissionForOrderLines(
    orderLines: OrderLineForCommission[],
    commissionRate: number
  ): CommissionCalculationResult {
    this.validateCommissionRate(commissionRate);

    // Sum all order line prices
    const totalOrderValue = orderLines.reduce((sum, line) => sum + line.linePrice, 0);

    // Calculate commission
    const commission = this.calculateCommission(totalOrderValue, commissionRate);

    // Calculate seller payout
    const sellerPayout = this.calculateSellerPayout(totalOrderValue, commission);

    return {
      totalOrderValue,
      commission,
      sellerPayout,
    };
  }
}
