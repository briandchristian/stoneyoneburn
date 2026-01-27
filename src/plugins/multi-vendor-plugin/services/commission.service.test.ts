/**
 * Commission Service Tests
 *
 * Tests for commission calculation and configuration.
 * Following TDD principles: Write tests first, then implement.
 *
 * Part of Phase 3.1: Commission Configuration
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { CommissionService } from './commission.service';
import { GlobalSettingsService } from '@vendure/core';
import type { RequestContext } from '@vendure/core';

/**
 * Commission Calculation Tests
 *
 * Tests various commission calculation scenarios:
 * - Standard commission rates
 * - Per-seller commission rates
 * - Edge cases (0%, 100%, negative values)
 */
describe('CommissionService', () => {
  let commissionService: CommissionService;
  let mockGlobalSettingsService: jest.Mocked<GlobalSettingsService>;
  let mockCtx: RequestContext;

  beforeEach(() => {
    // Mock GlobalSettingsService
    const getSettingsMock = jest.fn() as jest.MockedFunction<any>;
    getSettingsMock.mockResolvedValue({
      customFields: {},
    });
    mockGlobalSettingsService = {
      getSettings: getSettingsMock,
    } as any;

    commissionService = new CommissionService(mockGlobalSettingsService);

    // Mock RequestContext
    mockCtx = {
      channel: {} as any,
      languageCode: 'en' as const,
    } as RequestContext;
  });

  describe('calculateCommission', () => {
    it('should calculate commission for standard rate', () => {
      // Standard 15% commission on $100 order
      const orderTotal = 10000; // $100.00 in cents
      const commissionRate = 0.15; // 15%
      const expectedCommission = 1500; // $15.00 in cents

      const result = commissionService.calculateCommission(orderTotal, commissionRate);

      expect(result).toBe(expectedCommission);
    });

    it('should calculate commission for per-seller rate', () => {
      // Per-seller 10% commission on $200 order
      const orderTotal = 20000; // $200.00 in cents
      const commissionRate = 0.1; // 10%
      const expectedCommission = 2000; // $20.00 in cents

      const result = commissionService.calculateCommission(orderTotal, commissionRate);

      expect(result).toBe(expectedCommission);
    });

    it('should return zero commission for 0% rate', () => {
      // 0% commission - seller keeps everything
      const orderTotal = 10000; // $100.00 in cents
      const commissionRate = 0; // 0%

      const result = commissionService.calculateCommission(orderTotal, commissionRate);

      expect(result).toBe(0);
    });

    it('should return full amount for 100% commission rate', () => {
      // 100% commission - marketplace keeps everything
      const orderTotal = 10000; // $100.00 in cents
      const commissionRate = 1.0; // 100%
      const expectedCommission = 10000; // $100.00 in cents

      const result = commissionService.calculateCommission(orderTotal, commissionRate);

      expect(result).toBe(expectedCommission);
    });

    it('should round commission to nearest cent', () => {
      // 13.33% commission on $75.50 order = $10.064915... should round to $10.06
      const orderTotal = 7550; // $75.50 in cents
      const commissionRate = 0.1333; // 13.33%
      const expectedCommission = 1006; // $10.06 in cents (rounded)

      const result = commissionService.calculateCommission(orderTotal, commissionRate);

      expect(result).toBe(expectedCommission);
    });

    it('should handle fractional cents correctly', () => {
      // 7.5% commission on $33.33 order = $2.49975... should round to $2.50
      const orderTotal = 3333; // $33.33 in cents
      const commissionRate = 0.075; // 7.5%
      const expectedCommission = 250; // $2.50 in cents (rounded)

      const result = commissionService.calculateCommission(orderTotal, commissionRate);

      expect(result).toBe(expectedCommission);
    });
  });

  describe('calculateSellerPayout', () => {
    it('should calculate seller payout from order total and commission', () => {
      // $100 order with $15 commission = $85 payout
      const orderTotal = 10000; // $100.00 in cents
      const commission = 1500; // $15.00 in cents
      const expectedPayout = 8500; // $85.00 in cents

      const result = commissionService.calculateSellerPayout(orderTotal, commission);

      expect(result).toBe(expectedPayout);
    });

    it('should handle zero commission payout', () => {
      // $100 order with $0 commission = $100 payout (0% commission rate)
      const orderTotal = 10000; // $100.00 in cents
      const commission = 0;

      const result = commissionService.calculateSellerPayout(orderTotal, commission);

      expect(result).toBe(orderTotal);
    });

    it('should handle full commission (no payout)', () => {
      // $100 order with $100 commission = $0 payout (100% commission rate)
      const orderTotal = 10000; // $100.00 in cents
      const commission = 10000;

      const result = commissionService.calculateSellerPayout(orderTotal, commission);

      expect(result).toBe(0);
    });
  });

  describe('validateCommissionRate', () => {
    it('should validate valid commission rate (0-100%)', () => {
      const validRates = [0, 0.05, 0.15, 0.5, 1.0];

      validRates.forEach((rate) => {
        expect(() => commissionService.validateCommissionRate(rate)).not.toThrow();
      });
    });

    it('should reject negative commission rates', () => {
      const invalidRate = -0.1; // -10%

      expect(() => commissionService.validateCommissionRate(invalidRate)).toThrow();
    });

    it('should reject commission rates greater than 100%', () => {
      const invalidRate = 1.5; // 150%

      expect(() => commissionService.validateCommissionRate(invalidRate)).toThrow();
    });

    it('should reject NaN commission rates', () => {
      const invalidRate = NaN;

      expect(() => commissionService.validateCommissionRate(invalidRate)).toThrow();
    });

    it('should reject Infinity commission rates', () => {
      const invalidRate = Infinity;

      expect(() => commissionService.validateCommissionRate(invalidRate)).toThrow();
    });
  });

  describe('getDefaultCommissionRate', () => {
    it('should return default commission rate from GlobalSettings when configured', async () => {
      mockGlobalSettingsService.getSettings.mockResolvedValue({
        customFields: {
          defaultCommissionRate: 0.2, // 20%
        },
      } as any);

      const defaultRate = await commissionService.getDefaultCommissionRate(mockCtx);

      expect(defaultRate).toBe(0.2);
      expect(defaultRate).toBeGreaterThanOrEqual(0);
      expect(defaultRate).toBeLessThanOrEqual(1);
    });

    it('should return fallback rate when GlobalSettings not configured', async () => {
      mockGlobalSettingsService.getSettings.mockResolvedValue({
        customFields: {},
      } as any);

      const defaultRate = await commissionService.getDefaultCommissionRate(mockCtx);

      expect(defaultRate).toBe(0.15); // DEFAULT_COMMISSION_RATE fallback
    });

    it('should return fallback rate when GlobalSettings access fails', async () => {
      mockGlobalSettingsService.getSettings.mockRejectedValue(new Error('Settings access failed'));

      const defaultRate = await commissionService.getDefaultCommissionRate(mockCtx);

      expect(defaultRate).toBe(0.15); // DEFAULT_COMMISSION_RATE fallback
    });

    it('should return fallback rate synchronously when no context provided', () => {
      const defaultRate = commissionService.getDefaultCommissionRateSync();

      expect(defaultRate).toBe(0.15); // DEFAULT_COMMISSION_RATE fallback
    });
  });

  describe('calculateCommissionForOrderLines', () => {
    it('should calculate commission for multiple order lines', () => {
      // Order with multiple lines from same seller
      const orderLines = [
        {
          linePrice: 5000, // $50.00
          sellerId: '1',
        },
        {
          linePrice: 3000, // $30.00
          sellerId: '1',
        },
      ];
      const commissionRate = 0.15; // 15%
      // Total: $80.00, Commission: $12.00
      const expectedCommission = 1200; // $12.00 in cents

      const result = commissionService.calculateCommissionForOrderLines(orderLines, commissionRate);

      expect(result.totalOrderValue).toBe(8000); // $80.00
      expect(result.commission).toBe(expectedCommission);
      expect(result.sellerPayout).toBe(6800); // $68.00
    });

    it('should handle empty order lines', () => {
      const orderLines: Array<{ linePrice: number; sellerId: string }> = [];
      const commissionRate = 0.15;

      const result = commissionService.calculateCommissionForOrderLines(orderLines, commissionRate);

      expect(result.totalOrderValue).toBe(0);
      expect(result.commission).toBe(0);
      expect(result.sellerPayout).toBe(0);
    });

    it('should handle order lines with zero price', () => {
      const orderLines = [
        {
          linePrice: 0,
          sellerId: '1',
        },
      ];
      const commissionRate = 0.15;

      const result = commissionService.calculateCommissionForOrderLines(orderLines, commissionRate);

      expect(result.totalOrderValue).toBe(0);
      expect(result.commission).toBe(0);
      expect(result.sellerPayout).toBe(0);
    });
  });
});
