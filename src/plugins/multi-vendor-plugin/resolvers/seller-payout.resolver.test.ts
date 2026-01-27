/**
 * Seller Payout Resolver Tests
 *
 * Test-Driven Development (TDD) for Phase 3.3: Seller Payout System
 *
 * These tests define the expected behavior of the seller payout resolver:
 * - Sellers can request payouts for their pending funds
 * - Admins can approve/reject payout requests
 * - Minimum threshold enforcement
 * - Payout history queries
 *
 * Following TDD workflow:
 * 1. Write tests first (RED) ✅
 * 2. Implement minimal code to pass (GREEN)
 * 3. Refactor while keeping tests passing
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import type { RequestContext, ID } from '@vendure/core';
import { SellerPayoutResolver } from './seller-payout.resolver';
import { SellerPayoutService, PayoutStatus } from '../services/seller-payout.service';
import { SellerService } from '../services/seller.service';
import { SellerPayout } from '../entities/seller-payout.entity';

// Mock services
jest.mock('../services/seller-payout.service');
jest.mock('../services/seller.service');

describe('SellerPayoutResolver - Unit Tests', () => {
  let resolver: SellerPayoutResolver;
  let mockPayoutService: jest.Mocked<SellerPayoutService>;
  let mockSellerService: jest.Mocked<SellerService>;
  let mockCtx: RequestContext;

  beforeEach(() => {
    // Create mock services
    mockPayoutService = {
      getPendingPayoutTotal: jest.fn(),
      canRequestPayout: jest.fn(),
      requestPayout: jest.fn(),
      getPayoutsForSeller: jest.fn(),
      getPayoutById: jest.fn(),
      updatePayoutStatus: jest.fn(),
    } as any;

    mockSellerService = {
      getSellerByCustomerId: jest.fn(),
    } as any;

    // Create resolver instance
    resolver = new SellerPayoutResolver(mockPayoutService, mockSellerService);

    // Create mock request context
    mockCtx = {
      channel: {} as any,
      languageCode: 'en' as const,
    } as RequestContext;
  });

  describe('requestPayout mutation', () => {
    it('should allow seller to request payout when threshold is met', async () => {
      // Arrange
      const sellerId = '5';
      const minimumThreshold = 10000; // $100.00
      const pendingTotal = 15000; // $150.00

      mockPayoutService.canRequestPayout.mockResolvedValue(true);
      mockPayoutService.getPendingPayoutTotal.mockResolvedValue(pendingTotal);
      mockPayoutService.requestPayout.mockResolvedValue([
        {
          id: '1',
          sellerId: parseInt(sellerId, 10),
          orderId: '100',
          amount: 10000,
          commission: 1500,
          status: PayoutStatus.PENDING,
        },
        {
          id: '2',
          sellerId: parseInt(sellerId, 10),
          orderId: '101',
          amount: 5000,
          commission: 750,
          status: PayoutStatus.PENDING,
        },
      ] as SellerPayout[]);

      // Act
      const result = await resolver.requestPayout(mockCtx, sellerId, minimumThreshold);

      // Assert
      expect(mockPayoutService.canRequestPayout).toHaveBeenCalledWith(
        mockCtx,
        sellerId,
        minimumThreshold
      );
      expect(mockPayoutService.requestPayout).toHaveBeenCalledWith(mockCtx, sellerId);
      expect(result).toBeDefined();
      expect(result.status).toBe(PayoutStatus.PENDING);
    });

    it('should reject payout request when threshold is not met', async () => {
      // Arrange
      const sellerId = '5';
      const minimumThreshold = 10000; // $100.00
      const pendingTotal = 5000; // $50.00

      mockPayoutService.canRequestPayout.mockResolvedValue(false);
      mockPayoutService.getPendingPayoutTotal.mockResolvedValue(pendingTotal);

      // Act & Assert
      await expect(resolver.requestPayout(mockCtx, sellerId, minimumThreshold)).rejects.toThrow(
        'Minimum payout threshold not met'
      );
      expect(mockPayoutService.requestPayout).not.toHaveBeenCalled();
    });

    it('should reject payout request when no pending funds exist', async () => {
      // Arrange
      const sellerId = '5';
      const minimumThreshold = 10000;
      const pendingTotal = 0;

      mockPayoutService.canRequestPayout.mockResolvedValue(false);
      mockPayoutService.getPendingPayoutTotal.mockResolvedValue(pendingTotal);

      // Act & Assert
      await expect(resolver.requestPayout(mockCtx, sellerId, minimumThreshold)).rejects.toThrow(
        'Minimum payout threshold not met'
      );
    });
  });

  describe('payoutHistory query', () => {
    it('should return payout history for a seller', async () => {
      // Arrange
      const sellerId = '5';
      const mockPayouts = [
        {
          id: '1',
          sellerId: parseInt(sellerId, 10),
          orderId: '100',
          amount: 5000,
          commission: 500,
          status: PayoutStatus.COMPLETED,
        },
        {
          id: '2',
          sellerId: parseInt(sellerId, 10),
          orderId: '101',
          amount: 3000,
          commission: 300,
          status: PayoutStatus.PENDING,
        },
      ] as SellerPayout[];

      mockPayoutService.getPayoutsForSeller.mockResolvedValue(mockPayouts);

      // Act
      const result = await resolver.payoutHistory(mockCtx, sellerId);

      // Assert
      expect(mockPayoutService.getPayoutsForSeller).toHaveBeenCalledWith(mockCtx, sellerId);
      expect(result).toEqual(mockPayouts);
      expect(result.length).toBe(2);
    });

    it('should return empty array when seller has no payouts', async () => {
      // Arrange
      const sellerId = '5';
      mockPayoutService.getPayoutsForSeller.mockResolvedValue([]);

      // Act
      const result = await resolver.payoutHistory(mockCtx, sellerId);

      // Assert
      expect(result).toEqual([]);
      expect(result.length).toBe(0);
    });
  });

  describe('pendingPayoutTotal query', () => {
    it('should return total pending payout amount for seller', async () => {
      // Arrange
      const sellerId = '5';
      const pendingTotal = 15000; // $150.00

      mockPayoutService.getPendingPayoutTotal.mockResolvedValue(pendingTotal);

      // Act
      const result = await resolver.pendingPayoutTotal(mockCtx, sellerId);

      // Assert
      expect(mockPayoutService.getPendingPayoutTotal).toHaveBeenCalledWith(mockCtx, sellerId);
      expect(result).toBe(pendingTotal);
    });

    it('should return zero when no pending payouts exist', async () => {
      // Arrange
      const sellerId = '5';
      mockPayoutService.getPendingPayoutTotal.mockResolvedValue(0);

      // Act
      const result = await resolver.pendingPayoutTotal(mockCtx, sellerId);

      // Assert
      expect(result).toBe(0);
    });
  });
});
