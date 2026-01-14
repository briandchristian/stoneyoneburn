/**
 * Split Payment Service Tests
 *
 * Tests for split payment calculation and processing.
 * Following TDD principles: Write tests first, then implement.
 *
 * Part of Phase 3.2: Split Payment Processing
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { SplitPaymentService } from './split-payment.service';
import { CommissionService } from './commission.service';
import type { ID } from '@vendure/core';

/**
 * Mock order line for testing
 */
interface MockOrderLine {
  id: ID;
  linePrice: number; // In cents
  sellerId: ID;
}

/**
 * Mock order for testing
 */
interface MockOrder {
  id: ID;
  total: number; // Total order amount in cents
  lines: MockOrderLine[];
}

describe('SplitPaymentService', () => {
  let splitPaymentService: SplitPaymentService;
  let commissionService: CommissionService;

  beforeEach(() => {
    commissionService = new CommissionService();
    splitPaymentService = new SplitPaymentService(commissionService);
  });

  describe('calculateSplitPayment', () => {
    it('should calculate split payment for single seller order', () => {
      // Order with $100 total, 15% commission
      const orderTotal = 10000; // $100.00 in cents
      const commissionRate = 0.15; // 15%
      const expectedCommission = 1500; // $15.00
      const expectedSellerPayout = 8500; // $85.00

      const result = splitPaymentService.calculateSplitPayment(orderTotal, commissionRate);

      expect(result.totalAmount).toBe(orderTotal);
      expect(result.commission).toBe(expectedCommission);
      expect(result.sellerPayout).toBe(expectedSellerPayout);
    });

    it('should calculate split payment for zero commission', () => {
      // Order with $100 total, 0% commission (seller keeps everything)
      const orderTotal = 10000; // $100.00 in cents
      const commissionRate = 0; // 0%

      const result = splitPaymentService.calculateSplitPayment(orderTotal, commissionRate);

      expect(result.totalAmount).toBe(orderTotal);
      expect(result.commission).toBe(0);
      expect(result.sellerPayout).toBe(orderTotal);
    });

    it('should calculate split payment for 100% commission', () => {
      // Order with $100 total, 100% commission (marketplace keeps everything)
      const orderTotal = 10000; // $100.00 in cents
      const commissionRate = 1.0; // 100%

      const result = splitPaymentService.calculateSplitPayment(orderTotal, commissionRate);

      expect(result.totalAmount).toBe(orderTotal);
      expect(result.commission).toBe(orderTotal);
      expect(result.sellerPayout).toBe(0);
    });

    it('should round commission and payout to nearest cent', () => {
      // Order with $75.50 total, 13.33% commission
      const orderTotal = 7550; // $75.50 in cents
      const commissionRate = 0.1333; // 13.33%
      // Commission: $10.064915... should round to $10.06
      const expectedCommission = 1006; // $10.06 in cents
      const expectedSellerPayout = 6544; // $65.44 in cents

      const result = splitPaymentService.calculateSplitPayment(orderTotal, commissionRate);

      expect(result.commission).toBe(expectedCommission);
      expect(result.sellerPayout).toBe(expectedSellerPayout);
      // Verify total is preserved
      expect(result.commission + result.sellerPayout).toBe(orderTotal);
    });
  });

  describe('calculateSplitPaymentForOrder', () => {
    it('should calculate split payment for order with single seller', () => {
      const order: MockOrder = {
        id: '1',
        total: 10000, // $100.00
        lines: [
          {
            id: '1',
            linePrice: 10000,
            sellerId: 'seller-1',
          },
        ],
      };
      const commissionRate = 0.15; // 15%

      const result = splitPaymentService.calculateSplitPaymentForOrder(order, commissionRate);

      expect(result.orderId).toBe(order.id);
      expect(result.totalAmount).toBe(10000);
      expect(result.commission).toBe(1500);
      expect(result.sellerPayout).toBe(8500);
      expect(result.sellerSplits).toHaveLength(1);
      expect(result.sellerSplits[0].sellerId).toBe('seller-1');
      expect(result.sellerSplits[0].amount).toBe(8500);
    });

    it('should calculate split payment for order with multiple sellers', () => {
      // Order with products from two sellers
      const order: MockOrder = {
        id: '2',
        total: 20000, // $200.00
        lines: [
          {
            id: '1',
            linePrice: 10000, // $100.00 from seller-1
            sellerId: 'seller-1',
          },
          {
            id: '2',
            linePrice: 10000, // $100.00 from seller-2
            sellerId: 'seller-2',
          },
        ],
      };
      const commissionRate = 0.15; // 15%

      const result = splitPaymentService.calculateSplitPaymentForOrder(order, commissionRate);

      expect(result.orderId).toBe(order.id);
      expect(result.totalAmount).toBe(20000);
      expect(result.commission).toBe(3000); // 15% of $200
      expect(result.sellerPayout).toBe(17000); // $170 total payout
      expect(result.sellerSplits).toHaveLength(2);
      // Each seller gets $85 (85% of $100)
      expect(result.sellerSplits[0].sellerId).toBe('seller-1');
      expect(result.sellerSplits[0].amount).toBe(8500);
      expect(result.sellerSplits[1].sellerId).toBe('seller-2');
      expect(result.sellerSplits[1].amount).toBe(8500);
    });

    it('should handle order with different commission rates per seller', () => {
      // Order with products from two sellers with different rates
      const order: MockOrder = {
        id: '3',
        total: 20000, // $200.00
        lines: [
          {
            id: '1',
            linePrice: 10000, // $100.00 from seller-1 (10% commission)
            sellerId: 'seller-1',
          },
          {
            id: '2',
            linePrice: 10000, // $100.00 from seller-2 (20% commission)
            sellerId: 'seller-2',
          },
        ],
      };
      const sellerCommissionRates = new Map<ID, number>([
        ['seller-1', 0.1], // 10%
        ['seller-2', 0.2], // 20%
      ]);

      const result = splitPaymentService.calculateSplitPaymentForOrderWithRates(
        order,
        sellerCommissionRates
      );

      expect(result.orderId).toBe(order.id);
      expect(result.totalAmount).toBe(20000);
      // Seller-1: $100 * 10% = $10 commission, $90 payout
      // Seller-2: $100 * 20% = $20 commission, $80 payout
      // Total commission: $30, Total payout: $170
      expect(result.commission).toBe(3000);
      expect(result.sellerPayout).toBe(17000);
      expect(result.sellerSplits).toHaveLength(2);
      expect(result.sellerSplits[0].sellerId).toBe('seller-1');
      expect(result.sellerSplits[0].amount).toBe(9000);
      expect(result.sellerSplits[1].sellerId).toBe('seller-2');
      expect(result.sellerSplits[1].amount).toBe(8000);
    });

    it('should handle empty order lines', () => {
      const order: MockOrder = {
        id: '4',
        total: 0,
        lines: [],
      };
      const commissionRate = 0.15;

      const result = splitPaymentService.calculateSplitPaymentForOrder(order, commissionRate);

      expect(result.orderId).toBe(order.id);
      expect(result.totalAmount).toBe(0);
      expect(result.commission).toBe(0);
      expect(result.sellerPayout).toBe(0);
      expect(result.sellerSplits).toHaveLength(0);
    });
  });

  describe('validateSplitPayment', () => {
    it('should validate correct split payment', () => {
      const splitPayment = {
        totalAmount: 10000,
        commission: 1500,
        sellerPayout: 8500,
      };

      expect(() => splitPaymentService.validateSplitPayment(splitPayment)).not.toThrow();
    });

    it('should reject split payment where amounts do not add up', () => {
      const splitPayment = {
        totalAmount: 10000,
        commission: 1500,
        sellerPayout: 8000, // Should be 8500
      };

      expect(() => splitPaymentService.validateSplitPayment(splitPayment)).toThrow();
    });

    it('should reject negative commission', () => {
      const splitPayment = {
        totalAmount: 10000,
        commission: -100,
        sellerPayout: 10100,
      };

      expect(() => splitPaymentService.validateSplitPayment(splitPayment)).toThrow();
    });

    it('should reject negative seller payout', () => {
      const splitPayment = {
        totalAmount: 10000,
        commission: 11000, // More than total
        sellerPayout: -1000,
      };

      expect(() => splitPaymentService.validateSplitPayment(splitPayment)).toThrow();
    });

    it('should reject commission greater than total', () => {
      const splitPayment = {
        totalAmount: 10000,
        commission: 15000, // More than total
        sellerPayout: -5000,
      };

      expect(() => splitPaymentService.validateSplitPayment(splitPayment)).toThrow();
    });
  });
});
