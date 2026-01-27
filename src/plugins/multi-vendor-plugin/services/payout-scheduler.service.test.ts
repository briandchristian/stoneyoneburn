/**
 * Payout Scheduler Service Tests
 *
 * Tests for the PayoutSchedulerService which handles automatic payout transitions.
 * Part of Phase 3.3: Seller Payout System (deferred enhancement)
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import type { RequestContext } from '@vendure/core';
import { TransactionalConnection } from '@vendure/core';
import { PayoutSchedulerService } from './payout-scheduler.service';
import { SellerPayoutService } from './seller-payout.service';
import { SellerPayout, PayoutStatus } from '../entities/seller-payout.entity';

describe('PayoutSchedulerService', () => {
  let service: PayoutSchedulerService;
  let mockConnection: jest.Mocked<TransactionalConnection>;
  let mockSellerPayoutService: jest.Mocked<SellerPayoutService>;
  let mockRepository: any;
  let mockCtx: RequestContext;

  beforeEach(() => {
    // Mock repository
    mockRepository = {
      find: jest.fn(),
      save: jest.fn(),
    };

    // Mock TransactionalConnection
    mockConnection = {
      getRepository: jest.fn().mockReturnValue(mockRepository),
    } as any;

    // Mock SellerPayoutService
    mockSellerPayoutService = {} as any;

    // Create service instance
    service = new PayoutSchedulerService(mockConnection, mockSellerPayoutService);

    // Mock RequestContext
    mockCtx = {
      channel: {} as any,
      languageCode: 'en' as const,
    } as RequestContext;
  });

  describe('processScheduledPayouts', () => {
    it('should return zero stats when no HOLD payouts exist', async () => {
      mockRepository.find.mockResolvedValue([]);

      const result = await service.processScheduledPayouts(mockCtx);

      expect(result).toEqual({
        totalProcessed: 0,
        sellersAffected: 0,
        totalAmount: 0,
      });
      expect(mockRepository.save).not.toHaveBeenCalled();
    });

    it('should transition HOLD payouts to PENDING', async () => {
      const mockPayouts: Partial<SellerPayout>[] = [
        {
          id: 1,
          sellerId: 10,
          amount: 5000, // $50.00
          status: PayoutStatus.HOLD,
          releasedAt: undefined,
        },
        {
          id: 2,
          sellerId: 10,
          amount: 3000, // $30.00
          status: PayoutStatus.HOLD,
          releasedAt: undefined,
        },
        {
          id: 3,
          sellerId: 20,
          amount: 7000, // $70.00
          status: PayoutStatus.HOLD,
          releasedAt: undefined,
        },
      ];

      mockRepository.find.mockResolvedValue(mockPayouts);
      mockRepository.save.mockResolvedValue(mockPayouts);

      const result = await service.processScheduledPayouts(mockCtx);

      expect(result).toEqual({
        totalProcessed: 3,
        sellersAffected: 2, // Two unique sellers (10 and 20)
        totalAmount: 15000, // $150.00 total
      });

      // Verify all payouts were updated to PENDING
      expect(mockPayouts[0].status).toBe(PayoutStatus.PENDING);
      expect(mockPayouts[1].status).toBe(PayoutStatus.PENDING);
      expect(mockPayouts[2].status).toBe(PayoutStatus.PENDING);

      // Verify releasedAt was set
      expect(mockPayouts[0].releasedAt).toBeInstanceOf(Date);
      expect(mockPayouts[1].releasedAt).toBeInstanceOf(Date);
      expect(mockPayouts[2].releasedAt).toBeInstanceOf(Date);

      // Verify save was called with updated payouts
      expect(mockRepository.save).toHaveBeenCalledWith(mockPayouts);
    });

    it('should handle payouts from multiple sellers correctly', async () => {
      const mockPayouts: Partial<SellerPayout>[] = [
        { id: 1, sellerId: 10, amount: 1000, status: PayoutStatus.HOLD, releasedAt: undefined },
        { id: 2, sellerId: 20, amount: 2000, status: PayoutStatus.HOLD, releasedAt: undefined },
        { id: 3, sellerId: 30, amount: 3000, status: PayoutStatus.HOLD, releasedAt: undefined },
      ];

      mockRepository.find.mockResolvedValue(mockPayouts);
      mockRepository.save.mockResolvedValue(mockPayouts);

      const result = await service.processScheduledPayouts(mockCtx);

      expect(result.sellersAffected).toBe(3);
      expect(result.totalProcessed).toBe(3);
      expect(result.totalAmount).toBe(6000);
    });

    it('should only query for HOLD status payouts', async () => {
      mockRepository.find.mockResolvedValue([]);

      await service.processScheduledPayouts(mockCtx);

      // Verify that find() was called with HOLD status filter
      expect(mockRepository.find).toHaveBeenCalledWith({
        where: {
          status: PayoutStatus.HOLD,
        },
      });
    });
  });

  describe('getScheduledPayoutStats', () => {
    it('should return zero stats when no HOLD payouts exist', async () => {
      mockRepository.find.mockResolvedValue([]);

      const result = await service.getScheduledPayoutStats(mockCtx);

      expect(result).toEqual({
        count: 0,
        totalAmount: 0,
        sellersAffected: 0,
      });
    });

    it('should return correct statistics for HOLD payouts', async () => {
      const mockPayouts: Partial<SellerPayout>[] = [
        { id: 1, sellerId: 10, amount: 5000, status: PayoutStatus.HOLD },
        { id: 2, sellerId: 10, amount: 3000, status: PayoutStatus.HOLD },
        { id: 3, sellerId: 20, amount: 7000, status: PayoutStatus.HOLD },
      ];

      mockRepository.find.mockResolvedValue(mockPayouts);

      const result = await service.getScheduledPayoutStats(mockCtx);

      expect(result).toEqual({
        count: 3,
        totalAmount: 15000,
        sellersAffected: 2,
      });
    });

    it('should count unique sellers correctly', async () => {
      const mockPayouts: Partial<SellerPayout>[] = [
        { id: 1, sellerId: 10, amount: 1000, status: PayoutStatus.HOLD },
        { id: 2, sellerId: 10, amount: 2000, status: PayoutStatus.HOLD },
        { id: 3, sellerId: 10, amount: 3000, status: PayoutStatus.HOLD },
      ];

      mockRepository.find.mockResolvedValue(mockPayouts);

      const result = await service.getScheduledPayoutStats(mockCtx);

      expect(result.sellersAffected).toBe(1); // Only one unique seller
      expect(result.count).toBe(3);
      expect(result.totalAmount).toBe(6000);
    });
  });
});
