/**
 * Commission History Resolver Unit Tests
 *
 * Test-Driven Development (TDD) for Phase 3.1: Commission History Tracking
 *
 * These are actual unit tests with mocks that test the resolver implementation.
 * Following TDD workflow:
 * 1. Write tests first (RED) ✅
 * 2. Implement minimal code to pass (GREEN)
 * 3. Refactor while keeping tests passing
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import type { RequestContext } from '@vendure/core';
import { CommissionHistoryResolver } from './commission-history.resolver';
import { CommissionHistoryService } from '../services/commission-history.service';
import { CommissionHistoryStatus } from '../entities/commission-history.entity';
import type {
  CommissionHistoryRecord,
  SellerCommissionSummary,
} from '../services/commission-history.service';

// Mock CommissionHistoryService
jest.mock('../services/commission-history.service');

describe('CommissionHistoryResolver - Unit Tests', () => {
  let resolver: CommissionHistoryResolver;
  let mockService: jest.Mocked<CommissionHistoryService>;
  let mockCtx: RequestContext;

  beforeEach(() => {
    // Create mock service
    mockService = {
      getCommissionHistory: jest.fn(),
      getSellerCommissionSummary: jest.fn(),
      createCommissionHistory: jest.fn(),
    } as any;

    // Create resolver instance with mocked service
    resolver = new CommissionHistoryResolver(mockService);

    // Create mock request context
    mockCtx = {
      channel: {} as any,
      languageCode: 'en' as const,
    } as RequestContext;
  });

  describe('commissionHistory Query', () => {
    it('should return commission history list for a seller', async () => {
      // Arrange
      const sellerId = '5';
      const mockRecords: CommissionHistoryRecord[] = [
        {
          id: '1',
          orderId: '100',
          sellerId: '5',
          commissionRate: 0.15,
          orderTotal: 10000,
          commissionAmount: 1500,
          sellerPayout: 8500,
          status: CommissionHistoryStatus.CALCULATED,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockService.getCommissionHistory.mockResolvedValue({
        items: mockRecords,
        totalItems: 1,
      });

      // Act
      const result = await resolver.commissionHistory(mockCtx, sellerId);

      // Assert
      expect(mockService.getCommissionHistory).toHaveBeenCalledWith(mockCtx, sellerId, {
        skip: undefined,
        take: undefined,
        orderId: undefined,
        status: undefined,
        startDate: undefined,
        endDate: undefined,
      });
      expect(result.items).toHaveLength(1);
      expect(result.totalItems).toBe(1);
      expect(result.items[0].id).toBe('1');
      expect(result.items[0].orderId).toBe('100');
      expect(result.items[0].sellerId).toBe('5');
    });

    it('should pass pagination options to service', async () => {
      // Arrange
      const sellerId = '5';
      const options = {
        skip: 10,
        take: 20,
      };

      mockService.getCommissionHistory.mockResolvedValue({
        items: [],
        totalItems: 0,
      });

      // Act
      await resolver.commissionHistory(mockCtx, sellerId, options);

      // Assert
      expect(mockService.getCommissionHistory).toHaveBeenCalledWith(mockCtx, sellerId, {
        skip: 10,
        take: 20,
        orderId: undefined,
        status: undefined,
        startDate: undefined,
        endDate: undefined,
      });
    });

    it('should pass filter options to service', async () => {
      // Arrange
      const sellerId = '5';
      const orderId = '100';
      const status = CommissionHistoryStatus.PAID;
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-12-31');

      const options = {
        filter: {
          orderId,
          status,
          startDate,
          endDate,
        },
      };

      mockService.getCommissionHistory.mockResolvedValue({
        items: [],
        totalItems: 0,
      });

      // Act
      await resolver.commissionHistory(mockCtx, sellerId, options);

      // Assert
      expect(mockService.getCommissionHistory).toHaveBeenCalledWith(mockCtx, sellerId, {
        skip: undefined,
        take: undefined,
        orderId,
        status,
        startDate,
        endDate,
      });
    });

    it('should convert service records to GraphQL types', async () => {
      // Arrange
      const sellerId = '5';
      const mockRecord: CommissionHistoryRecord = {
        id: '1',
        orderId: '100',
        sellerId: '5',
        commissionRate: 0.15,
        orderTotal: 10000,
        commissionAmount: 1500,
        sellerPayout: 8500,
        status: CommissionHistoryStatus.CALCULATED,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-02'),
      };

      mockService.getCommissionHistory.mockResolvedValue({
        items: [mockRecord],
        totalItems: 1,
      });

      // Act
      const result = await resolver.commissionHistory(mockCtx, sellerId);

      // Assert: Verify type conversion
      expect(result.items[0].id).toBe('1');
      expect(result.items[0].orderId).toBe('100');
      expect(result.items[0].sellerId).toBe('5');
      expect(result.items[0].commissionRate).toBe(0.15);
      expect(result.items[0].orderTotal).toBe(10000);
      expect(result.items[0].commissionAmount).toBe(1500);
      expect(result.items[0].sellerPayout).toBe(8500);
      expect(result.items[0].status).toBe(CommissionHistoryStatus.CALCULATED);
      expect(result.items[0].createdAt).toEqual(new Date('2024-01-01'));
      expect(result.items[0].updatedAt).toEqual(new Date('2024-01-02'));
    });
  });

  describe('sellerCommissionSummary Query', () => {
    it('should return commission summary for a seller', async () => {
      // Arrange
      const sellerId = '5';
      const mockSummary: SellerCommissionSummary = {
        sellerId: '5',
        totalCommissions: 15000,
        totalPayouts: 85000,
        totalOrders: 10,
        commissionsByStatus: {
          CALCULATED: 5000,
          PAID: 8000,
          REFUNDED: 2000,
        },
      };

      mockService.getSellerCommissionSummary.mockResolvedValue(mockSummary);

      // Act
      const result = await resolver.sellerCommissionSummary(mockCtx, sellerId);

      // Assert
      expect(mockService.getSellerCommissionSummary).toHaveBeenCalledWith(mockCtx, sellerId, {
        startDate: undefined,
        endDate: undefined,
      });
      expect(result.sellerId).toBe('5');
      expect(result.totalCommissions).toBe(15000);
      expect(result.totalPayouts).toBe(85000);
      expect(result.totalOrders).toBe(10);
      expect(result.commissionsByStatus).toBe(JSON.stringify(mockSummary.commissionsByStatus));
    });

    it('should pass date range to service', async () => {
      // Arrange
      const sellerId = '5';
      const dateRange = {
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-12-31'),
      };

      const mockSummary: SellerCommissionSummary = {
        sellerId: '5',
        totalCommissions: 0,
        totalPayouts: 0,
        totalOrders: 0,
        commissionsByStatus: {
          CALCULATED: 0,
          PAID: 0,
          REFUNDED: 0,
        },
      };

      mockService.getSellerCommissionSummary.mockResolvedValue(mockSummary);

      // Act
      await resolver.sellerCommissionSummary(mockCtx, sellerId, dateRange);

      // Assert
      expect(mockService.getSellerCommissionSummary).toHaveBeenCalledWith(mockCtx, sellerId, {
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
      });
    });

    it('should convert commissionsByStatus object to JSON string', async () => {
      // Arrange
      const sellerId = '5';
      const commissionsByStatus = {
        CALCULATED: 5000,
        PAID: 8000,
        REFUNDED: 2000,
      };

      const mockSummary: SellerCommissionSummary = {
        sellerId: '5',
        totalCommissions: 15000,
        totalPayouts: 85000,
        totalOrders: 10,
        commissionsByStatus,
      };

      mockService.getSellerCommissionSummary.mockResolvedValue(mockSummary);

      // Act
      const result = await resolver.sellerCommissionSummary(mockCtx, sellerId);

      // Assert: Verify JSON string conversion
      expect(result.commissionsByStatus).toBe(JSON.stringify(commissionsByStatus));
      expect(typeof result.commissionsByStatus).toBe('string');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty commission history', async () => {
      // Arrange
      const sellerId = '5';

      mockService.getCommissionHistory.mockResolvedValue({
        items: [],
        totalItems: 0,
      });

      // Act
      const result = await resolver.commissionHistory(mockCtx, sellerId);

      // Assert
      expect(result.items).toEqual([]);
      expect(result.totalItems).toBe(0);
    });

    it('should handle seller with no commission history in summary', async () => {
      // Arrange
      const sellerId = '5';
      const mockSummary: SellerCommissionSummary = {
        sellerId: '5',
        totalCommissions: 0,
        totalPayouts: 0,
        totalOrders: 0,
        commissionsByStatus: {
          CALCULATED: 0,
          PAID: 0,
          REFUNDED: 0,
        },
      };

      mockService.getSellerCommissionSummary.mockResolvedValue(mockSummary);

      // Act
      const result = await resolver.sellerCommissionSummary(mockCtx, sellerId);

      // Assert
      expect(result.totalCommissions).toBe(0);
      expect(result.totalPayouts).toBe(0);
      expect(result.totalOrders).toBe(0);
    });
  });
});
