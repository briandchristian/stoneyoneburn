/**
 * Commission History Service Tests
 *
 * Test-Driven Development (TDD) for Phase 3.1: Commission History Tracking
 *
 * These tests define the expected behavior of CommissionHistoryService:
 * - Creating commission history records
 * - Querying commission history
 * - Aggregating commission data
 * - Filtering and pagination
 *
 * Following TDD workflow:
 * 1. Write tests first (RED) ✅
 * 2. Implement minimal code to pass (GREEN)
 * 3. Refactor while keeping tests passing
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import type { ID, RequestContext } from '@vendure/core';
import { TransactionalConnection } from '@vendure/core';
import { CommissionHistoryService } from './commission-history.service';
import { CommissionHistory, CommissionHistoryStatus } from '../entities/commission-history.entity';

// Mock TransactionalConnection
jest.mock('@vendure/core', () => {
  const actual = jest.requireActual('@vendure/core');
  return {
    ...actual,
    TransactionalConnection: jest.fn(),
  };
});

/**
 * Test Suite: Commission History Service
 */
describe('CommissionHistoryService', () => {
  let service: CommissionHistoryService;
  let mockCtx: RequestContext;
  let mockConnection: jest.Mocked<TransactionalConnection>;
  let mockQueryBuilder: any;
  let mockRepository: any;

  beforeEach(() => {
    // Create mock query builder
    mockQueryBuilder = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      getMany: jest.fn(),
      getCount: jest.fn(),
    };

    // Create mock repository
    mockRepository = {
      create: jest.fn(),
      save: jest.fn(),
      createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
    };

    // Create mock connection
    mockConnection = {
      getRepository: jest.fn().mockReturnValue(mockRepository),
    } as any;

    // Create service instance with mocked connection
    service = new CommissionHistoryService(mockConnection);

    // Create mock request context
    mockCtx = {
      channel: {} as any,
      languageCode: 'en' as const,
    } as RequestContext;
  });

  describe('createCommissionHistory', () => {
    it('should create a commission history record', async () => {
      // Arrange: Setup mock to return saved entity
      const input = {
        orderId: '100' as ID,
        sellerId: '5' as ID,
        commissionRate: 0.15, // 15%
        orderTotal: 10000, // $100.00
        commissionAmount: 1500, // $15.00
        sellerPayout: 8500, // $85.00
        status: CommissionHistoryStatus.CALCULATED,
      };

      const mockEntity = new CommissionHistory();
      mockEntity.id = 1;
      mockEntity.orderId = String(input.orderId);
      mockEntity.sellerId = input.sellerId as any;
      mockEntity.commissionRate = input.commissionRate;
      mockEntity.orderTotal = input.orderTotal;
      mockEntity.commissionAmount = input.commissionAmount;
      mockEntity.sellerPayout = input.sellerPayout;
      mockEntity.status = input.status;
      mockEntity.createdAt = new Date();
      mockEntity.updatedAt = new Date();

      mockRepository.create.mockReturnValue(mockEntity);
      mockRepository.save.mockResolvedValue(mockEntity);

      // Act: Service should create and return the record
      const result = await service.createCommissionHistory(mockCtx, input);

      // Assert: Verify the record was created correctly
      expect(mockRepository.create).toHaveBeenCalled();
      expect(mockRepository.save).toHaveBeenCalled();
      expect(result).toBeDefined();
      expect(result.orderId).toBe(String(input.orderId));
      expect(result.sellerId).toBe(String(input.sellerId));
      expect(result.commissionRate).toBe(input.commissionRate);
      expect(result.orderTotal).toBe(input.orderTotal);
      expect(result.commissionAmount).toBe(input.commissionAmount);
      expect(result.sellerPayout).toBe(input.sellerPayout);
      expect(result.status).toBe(input.status);
    });

    it('should default status to CALCULATED if not provided', async () => {
      // Arrange
      const input = {
        orderId: '100' as ID,
        sellerId: '5' as ID,
        commissionRate: 0.15,
        orderTotal: 10000,
        commissionAmount: 1500,
        sellerPayout: 8500,
        // status not provided
      };

      const mockEntity = new CommissionHistory();
      mockEntity.id = 1;
      mockEntity.orderId = String(input.orderId);
      mockEntity.sellerId = input.sellerId as any;
      mockEntity.commissionRate = input.commissionRate;
      mockEntity.orderTotal = input.orderTotal;
      mockEntity.commissionAmount = input.commissionAmount;
      mockEntity.sellerPayout = input.sellerPayout;
      mockEntity.status = CommissionHistoryStatus.CALCULATED;
      mockEntity.createdAt = new Date();
      mockEntity.updatedAt = new Date();

      mockRepository.create.mockReturnValue(mockEntity);
      mockRepository.save.mockResolvedValue(mockEntity);

      // Act
      const result = await service.createCommissionHistory(mockCtx, input);

      // Assert
      expect(result.status).toBe(CommissionHistoryStatus.CALCULATED);
      expect(mockRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          status: CommissionHistoryStatus.CALCULATED,
        })
      );
    });

    it('should validate commission calculation accuracy', async () => {
      // Arrange: Contract test - Ensures commissionAmount + sellerPayout = orderTotal
      const input = {
        orderId: '100' as ID,
        sellerId: '5' as ID,
        commissionRate: 0.15,
        orderTotal: 10000,
        commissionAmount: 1500,
        sellerPayout: 8500,
      };

      const mockEntity = new CommissionHistory();
      mockEntity.id = 1;
      mockEntity.orderId = String(input.orderId);
      mockEntity.sellerId = input.sellerId as any;
      mockEntity.commissionRate = input.commissionRate;
      mockEntity.orderTotal = input.orderTotal;
      mockEntity.commissionAmount = input.commissionAmount;
      mockEntity.sellerPayout = input.sellerPayout;
      mockEntity.status = CommissionHistoryStatus.CALCULATED;
      mockEntity.createdAt = new Date();
      mockEntity.updatedAt = new Date();

      mockRepository.create.mockReturnValue(mockEntity);
      mockRepository.save.mockResolvedValue(mockEntity);

      // Act
      const result = await service.createCommissionHistory(mockCtx, input);

      // Assert: Verify calculation integrity
      expect(result.commissionAmount + result.sellerPayout).toBe(result.orderTotal);
    });

    it('should throw error if commission calculation is invalid', async () => {
      // Arrange: Invalid calculation - amounts don't add up
      const input = {
        orderId: '100' as ID,
        sellerId: '5' as ID,
        commissionRate: 0.15,
        orderTotal: 10000,
        commissionAmount: 1500,
        sellerPayout: 8000, // Should be 8500 to equal 10000
      };

      // Act & Assert: Should throw validation error
      await expect(service.createCommissionHistory(mockCtx, input)).rejects.toThrow(
        'Commission calculation error'
      );
    });
  });

  describe('getCommissionHistory', () => {
    it('should return commission history for a seller', async () => {
      // Arrange: Setup mock to return commission history
      const sellerId = '5' as ID;
      const mockEntities = [
        {
          id: 1,
          orderId: '100',
          sellerId: sellerId as any,
          commissionRate: 0.15,
          orderTotal: 10000,
          commissionAmount: 1500,
          sellerPayout: 8500,
          status: CommissionHistoryStatus.CALCULATED,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockQueryBuilder.getMany.mockResolvedValue(mockEntities);
      mockQueryBuilder.getCount.mockResolvedValue(1);

      // Act
      const result = await service.getCommissionHistory(mockCtx, sellerId);

      // Assert: Verify return structure
      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        'commissionHistory.sellerId = :sellerId',
        { sellerId }
      );
      expect(result).toBeDefined();
      expect(result.items).toBeDefined();
      expect(Array.isArray(result.items)).toBe(true);
      expect(result.totalItems).toBeDefined();
      expect(typeof result.totalItems).toBe('number');
      expect(result.items).toHaveLength(1);
    });

    it('should support pagination', async () => {
      // Arrange
      const sellerId = '5' as ID;
      const options = {
        skip: 10,
        take: 20,
      };

      mockQueryBuilder.getMany.mockResolvedValue([]);
      mockQueryBuilder.getCount.mockResolvedValue(30);

      // Act
      const result = await service.getCommissionHistory(mockCtx, sellerId, options);

      // Assert: Verify pagination was applied
      expect(mockQueryBuilder.skip).toHaveBeenCalledWith(10);
      expect(mockQueryBuilder.take).toHaveBeenCalledWith(20);
      expect(result.items.length).toBeLessThanOrEqual(options.take);
    });

    it('should filter by order ID', async () => {
      // Arrange
      const sellerId = '5' as ID;
      const orderId = '100' as ID;
      const options = {
        orderId,
      };

      const mockEntities = [
        {
          id: 1,
          orderId: String(orderId),
          sellerId: sellerId as any,
          commissionRate: 0.15,
          orderTotal: 10000,
          commissionAmount: 1500,
          sellerPayout: 8500,
          status: CommissionHistoryStatus.CALCULATED,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockQueryBuilder.getMany.mockResolvedValue(mockEntities);
      mockQueryBuilder.getCount.mockResolvedValue(1);

      // Act
      const result = await service.getCommissionHistory(mockCtx, sellerId, options);

      // Assert: Verify filter was applied
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'commissionHistory.orderId = :orderId',
        { orderId }
      );
      result.items.forEach((item) => {
        expect(item.orderId).toBe(String(orderId));
      });
    });

    it('should filter by status', async () => {
      // Arrange
      const sellerId = '5' as ID;
      const status = CommissionHistoryStatus.PAID;
      const options = {
        status,
      };

      const mockEntities = [
        {
          id: 1,
          orderId: '100',
          sellerId: sellerId as any,
          commissionRate: 0.15,
          orderTotal: 10000,
          commissionAmount: 1500,
          sellerPayout: 8500,
          status: CommissionHistoryStatus.PAID,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockQueryBuilder.getMany.mockResolvedValue(mockEntities);
      mockQueryBuilder.getCount.mockResolvedValue(1);

      // Act
      const result = await service.getCommissionHistory(mockCtx, sellerId, options);

      // Assert: Verify status filter was applied
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'commissionHistory.status = :status',
        { status }
      );
      result.items.forEach((item) => {
        expect(item.status).toBe(status);
      });
    });

    it('should filter by date range', async () => {
      // Arrange
      const sellerId = '5' as ID;
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-12-31');
      const options = {
        startDate,
        endDate,
      };

      const mockEntities = [
        {
          id: 1,
          orderId: '100',
          sellerId: sellerId as any,
          commissionRate: 0.15,
          orderTotal: 10000,
          commissionAmount: 1500,
          sellerPayout: 8500,
          status: CommissionHistoryStatus.CALCULATED,
          createdAt: new Date('2024-06-15'),
          updatedAt: new Date(),
        },
      ];

      mockQueryBuilder.getMany.mockResolvedValue(mockEntities);
      mockQueryBuilder.getCount.mockResolvedValue(1);

      // Act
      const result = await service.getCommissionHistory(mockCtx, sellerId, options);

      // Assert: Verify date filters were applied
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'commissionHistory.createdAt >= :startDate',
        { startDate }
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'commissionHistory.createdAt <= :endDate',
        { endDate }
      );
      result.items.forEach((item) => {
        expect(item.createdAt.getTime()).toBeGreaterThanOrEqual(startDate.getTime());
        expect(item.createdAt.getTime()).toBeLessThanOrEqual(endDate.getTime());
      });
    });
  });

  describe('getSellerCommissionSummary', () => {
    it('should return commission summary for a seller', async () => {
      // Arrange: Setup mock to return commission records
      const sellerId = '5' as ID;
      const mockEntities = [
        {
          id: 1,
          orderId: '100',
          sellerId: sellerId as any,
          commissionRate: 0.15,
          orderTotal: 10000,
          commissionAmount: 1500,
          sellerPayout: 8500,
          status: CommissionHistoryStatus.CALCULATED,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockQueryBuilder.getMany.mockResolvedValue(mockEntities);

      // Act
      const result = await service.getSellerCommissionSummary(mockCtx, sellerId);

      // Assert: Verify return structure
      expect(result).toBeDefined();
      expect(result.sellerId).toBe(sellerId);
      expect(result.totalCommissions).toBeDefined();
      expect(typeof result.totalCommissions).toBe('number');
      expect(result.totalPayouts).toBeDefined();
      expect(typeof result.totalPayouts).toBe('number');
      expect(result.totalOrders).toBeDefined();
      expect(typeof result.totalOrders).toBe('number');
      expect(result.commissionsByStatus).toBeDefined();
      expect(typeof result.commissionsByStatus).toBe('object');
    });

    it('should aggregate total commissions correctly', async () => {
      // Arrange
      const sellerId = '5' as ID;
      const mockEntities = [
        {
          id: 1,
          orderId: '100',
          sellerId: sellerId as any,
          commissionRate: 0.15,
          orderTotal: 10000,
          commissionAmount: 1500,
          sellerPayout: 8500,
          status: CommissionHistoryStatus.CALCULATED,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 2,
          orderId: '101',
          sellerId: sellerId as any,
          commissionRate: 0.20,
          orderTotal: 20000,
          commissionAmount: 4000,
          sellerPayout: 16000,
          status: CommissionHistoryStatus.PAID,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockQueryBuilder.getMany.mockResolvedValue(mockEntities);

      // Act
      const result = await service.getSellerCommissionSummary(mockCtx, sellerId);

      // Assert: Total commissions should be sum of all commission amounts (1500 + 4000 = 5500)
      expect(result.totalCommissions).toBe(5500);
    });

    it('should aggregate total payouts correctly', async () => {
      // Arrange
      const sellerId = '5' as ID;
      const mockEntities = [
        {
          id: 1,
          orderId: '100',
          sellerId: sellerId as any,
          commissionRate: 0.15,
          orderTotal: 10000,
          commissionAmount: 1500,
          sellerPayout: 8500,
          status: CommissionHistoryStatus.CALCULATED,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 2,
          orderId: '101',
          sellerId: sellerId as any,
          commissionRate: 0.20,
          orderTotal: 20000,
          commissionAmount: 4000,
          sellerPayout: 16000,
          status: CommissionHistoryStatus.PAID,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockQueryBuilder.getMany.mockResolvedValue(mockEntities);

      // Act
      const result = await service.getSellerCommissionSummary(mockCtx, sellerId);

      // Assert: Total payouts should be sum of all seller payout amounts (8500 + 16000 = 24500)
      expect(result.totalPayouts).toBe(24500);
    });

    it('should count total orders correctly', async () => {
      // Arrange
      const sellerId = '5' as ID;
      const mockEntities = [
        {
          id: 1,
          orderId: '100',
          sellerId: sellerId as any,
          commissionRate: 0.15,
          orderTotal: 10000,
          commissionAmount: 1500,
          sellerPayout: 8500,
          status: CommissionHistoryStatus.CALCULATED,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 2,
          orderId: '101',
          sellerId: sellerId as any,
          commissionRate: 0.20,
          orderTotal: 20000,
          commissionAmount: 4000,
          sellerPayout: 16000,
          status: CommissionHistoryStatus.PAID,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockQueryBuilder.getMany.mockResolvedValue(mockEntities);

      // Act
      const result = await service.getSellerCommissionSummary(mockCtx, sellerId);

      // Assert: Total orders should be count of unique order IDs (2 unique orders)
      expect(result.totalOrders).toBe(2);
    });

    it('should group commissions by status', async () => {
      // Arrange
      const sellerId = '5' as ID;
      const mockEntities = [
        {
          id: 1,
          orderId: '100',
          sellerId: sellerId as any,
          commissionRate: 0.15,
          orderTotal: 10000,
          commissionAmount: 1500,
          sellerPayout: 8500,
          status: CommissionHistoryStatus.CALCULATED,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 2,
          orderId: '101',
          sellerId: sellerId as any,
          commissionRate: 0.20,
          orderTotal: 20000,
          commissionAmount: 4000,
          sellerPayout: 16000,
          status: CommissionHistoryStatus.PAID,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 3,
          orderId: '102',
          sellerId: sellerId as any,
          commissionRate: 0.10,
          orderTotal: 5000,
          commissionAmount: 500,
          sellerPayout: 4500,
          status: CommissionHistoryStatus.REFUNDED,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockQueryBuilder.getMany.mockResolvedValue(mockEntities);

      // Act
      const result = await service.getSellerCommissionSummary(mockCtx, sellerId);

      // Assert: Should have entries for each status with correct totals
      expect(result.commissionsByStatus).toHaveProperty('CALCULATED');
      expect(result.commissionsByStatus).toHaveProperty('PAID');
      expect(result.commissionsByStatus).toHaveProperty('REFUNDED');
      expect(result.commissionsByStatus.CALCULATED).toBe(1500);
      expect(result.commissionsByStatus.PAID).toBe(4000);
      expect(result.commissionsByStatus.REFUNDED).toBe(500);
    });

    it('should support date range filtering', async () => {
      // Arrange
      const sellerId = '5' as ID;
      const dateRange = {
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-12-31'),
      };

      const mockEntities = [
        {
          id: 1,
          orderId: '100',
          sellerId: sellerId as any,
          commissionRate: 0.15,
          orderTotal: 10000,
          commissionAmount: 1500,
          sellerPayout: 8500,
          status: CommissionHistoryStatus.CALCULATED,
          createdAt: new Date('2024-06-15'),
          updatedAt: new Date(),
        },
      ];

      mockQueryBuilder.getMany.mockResolvedValue(mockEntities);

      // Act
      const result = await service.getSellerCommissionSummary(mockCtx, sellerId, dateRange);

      // Assert: Verify date filters were applied
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'commissionHistory.createdAt >= :startDate',
        { startDate: dateRange.startDate }
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'commissionHistory.createdAt <= :endDate',
        { endDate: dateRange.endDate }
      );
      expect(result).toBeDefined();
      // Summary should only include records within date range
    });
  });

  describe('Edge Cases', () => {
    it('should handle seller with no commission history', async () => {
      // Arrange: Non-existent seller with no records
      const sellerId = '999' as ID;

      mockQueryBuilder.getMany.mockResolvedValue([]);
      mockQueryBuilder.getCount.mockResolvedValue(0);

      // Act
      const result = await service.getCommissionHistory(mockCtx, sellerId);

      // Assert: Should return empty result
      expect(result.items).toEqual([]);
      expect(result.totalItems).toBe(0);
    });

    it('should handle zero commission rate', async () => {
      // Arrange: 0% commission - seller gets full order total
      const input = {
        orderId: '100' as ID,
        sellerId: '5' as ID,
        commissionRate: 0, // 0% commission
        orderTotal: 10000,
        commissionAmount: 0,
        sellerPayout: 10000,
      };

      const mockEntity = new CommissionHistory();
      mockEntity.id = 1;
      mockEntity.orderId = String(input.orderId);
      mockEntity.sellerId = input.sellerId as any;
      mockEntity.commissionRate = input.commissionRate;
      mockEntity.orderTotal = input.orderTotal;
      mockEntity.commissionAmount = input.commissionAmount;
      mockEntity.sellerPayout = input.sellerPayout;
      mockEntity.status = CommissionHistoryStatus.CALCULATED;
      mockEntity.createdAt = new Date();
      mockEntity.updatedAt = new Date();

      mockRepository.create.mockReturnValue(mockEntity);
      mockRepository.save.mockResolvedValue(mockEntity);

      // Act
      const result = await service.createCommissionHistory(mockCtx, input);

      // Assert: Seller gets full amount, no commission
      expect(result.commissionAmount).toBe(0);
      expect(result.sellerPayout).toBe(input.orderTotal);
    });

    it('should handle 100% commission rate', async () => {
      // Arrange: 100% commission - platform gets full order total
      const input = {
        orderId: '100' as ID,
        sellerId: '5' as ID,
        commissionRate: 1.0, // 100% commission
        orderTotal: 10000,
        commissionAmount: 10000,
        sellerPayout: 0,
      };

      const mockEntity = new CommissionHistory();
      mockEntity.id = 1;
      mockEntity.orderId = String(input.orderId);
      mockEntity.sellerId = input.sellerId as any;
      mockEntity.commissionRate = input.commissionRate;
      mockEntity.orderTotal = input.orderTotal;
      mockEntity.commissionAmount = input.commissionAmount;
      mockEntity.sellerPayout = input.sellerPayout;
      mockEntity.status = CommissionHistoryStatus.CALCULATED;
      mockEntity.createdAt = new Date();
      mockEntity.updatedAt = new Date();

      mockRepository.create.mockReturnValue(mockEntity);
      mockRepository.save.mockResolvedValue(mockEntity);

      // Act
      const result = await service.createCommissionHistory(mockCtx, input);

      // Assert: Platform gets full amount, seller gets nothing
      expect(result.commissionAmount).toBe(input.orderTotal);
      expect(result.sellerPayout).toBe(0);
    });

    it('should handle duplicate order IDs in summary (count unique orders)', async () => {
      // Arrange: Multiple records for same order (should count as 1 order)
      const sellerId = '5' as ID;
      const mockEntities = [
        {
          id: 1,
          orderId: '100',
          sellerId: sellerId as any,
          commissionRate: 0.15,
          orderTotal: 10000,
          commissionAmount: 1500,
          sellerPayout: 8500,
          status: CommissionHistoryStatus.CALCULATED,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 2,
          orderId: '100', // Same order ID
          sellerId: sellerId as any,
          commissionRate: 0.15,
          orderTotal: 10000,
          commissionAmount: 1500,
          sellerPayout: 8500,
          status: CommissionHistoryStatus.PAID,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockQueryBuilder.getMany.mockResolvedValue(mockEntities);

      // Act
      const result = await service.getSellerCommissionSummary(mockCtx, sellerId);

      // Assert: Should count unique order IDs (1 unique order, not 2)
      expect(result.totalOrders).toBe(1);
    });
  });
});
