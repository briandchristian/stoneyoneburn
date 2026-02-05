/**
 * Seller Payout Service Unit Tests
 *
 * Test-Driven Development (TDD) for Phase 3.3: Seller Payout System
 *
 * These are actual unit tests with mocks that test the service implementation.
 * Following TDD workflow:
 * 1. Write tests first (RED) ✅
 * 2. Implement minimal code to pass (GREEN)
 * 3. Refactor while keeping tests passing
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import type { RequestContext } from '@vendure/core';
import { TransactionalConnection } from '@vendure/core';
import { In } from 'typeorm';
import { SellerPayoutService, PayoutStatus } from './seller-payout.service';
import { SellerPayout } from '../entities/seller-payout.entity';

// Mock TransactionalConnection
jest.mock('@vendure/core', () => {
  const actual = jest.requireActual('@vendure/core') as any;
  return {
    ...actual,
    TransactionalConnection: jest.fn(),
  };
});

describe('SellerPayoutService - Unit Tests', () => {
  let service: SellerPayoutService;
  let mockConnection: jest.Mocked<TransactionalConnection>;
  let mockRepository: any;
  let mockCtx: RequestContext;

  beforeEach(() => {
    // Create mock repository
    mockRepository = {
      save: jest.fn(),
      findOne: jest.fn(),
      find: jest.fn(),
      count: jest.fn(),
    };

    // Create mock connection
    mockConnection = {
      getRepository: jest.fn().mockReturnValue(mockRepository),
    } as any;

    // Create service instance
    service = new SellerPayoutService(mockConnection);

    // Create mock request context
    mockCtx = {
      channel: {} as any,
      languageCode: 'en' as const,
    } as RequestContext;
  });

  describe('createPayout', () => {
    it('should create a payout for seller from order', async () => {
      // Arrange
      const sellerId = '5';
      const orderId = '100';
      const amount = 8500; // $85.00
      const commission = 1500; // $15.00

      const mockPayout = new SellerPayout({
        sellerId: parseInt(sellerId, 10),
        orderId: orderId,
        amount,
        commission,
        status: PayoutStatus.HOLD,
      });
      mockPayout.id = 1;
      mockPayout.createdAt = new Date();
      mockPayout.updatedAt = new Date();

      mockRepository.save.mockResolvedValue(mockPayout);

      // Act
      const result = await service.createPayout(mockCtx, sellerId, orderId, amount, commission);

      // Assert
      expect(mockRepository.save).toHaveBeenCalled();
      expect(result).toBeDefined();
      expect(result.amount).toBe(amount);
      expect(result.commission).toBe(commission);
      expect(result.status).toBe(PayoutStatus.HOLD);
    });

    it('should create payout with HOLD status by default', async () => {
      // Arrange
      const sellerId = '5';
      const orderId = '100';
      const amount = 8500;
      const commission = 1500;

      const mockPayout = new SellerPayout({
        sellerId: parseInt(sellerId, 10),
        orderId: orderId,
        amount,
        commission,
        status: PayoutStatus.HOLD,
      });
      mockPayout.id = 1;

      mockRepository.save.mockResolvedValue(mockPayout);

      // Act
      const result = await service.createPayout(mockCtx, sellerId, orderId, amount, commission);

      // Assert
      expect(result.status).toBe(PayoutStatus.HOLD);
    });

    it('should create payout with specified status', async () => {
      // Arrange
      const sellerId = '5';
      const orderId = '100';
      const amount = 8500;
      const commission = 1500;
      const status = PayoutStatus.PENDING;

      const mockPayout = new SellerPayout({
        sellerId: parseInt(sellerId, 10),
        orderId: orderId,
        amount,
        commission,
        status,
      });
      mockPayout.id = 1;

      mockRepository.save.mockResolvedValue(mockPayout);

      // Act
      const result = await service.createPayout(
        mockCtx,
        sellerId,
        orderId,
        amount,
        commission,
        status
      );

      // Assert
      expect(result.status).toBe(PayoutStatus.PENDING);
    });

    it('should reject zero payout amount', async () => {
      // Arrange
      const sellerId = '5';
      const orderId = '100';
      const amount = 0;
      const commission = 0;

      // Act & Assert
      await expect(
        service.createPayout(mockCtx, sellerId, orderId, amount, commission)
      ).rejects.toThrow('Payout amount must be greater than zero');
    });

    it('should reject negative payout amount', async () => {
      // Arrange
      const sellerId = '5';
      const orderId = '100';
      const amount = -100;
      const commission = 0;

      // Act & Assert
      await expect(
        service.createPayout(mockCtx, sellerId, orderId, amount, commission)
      ).rejects.toThrow('Payout amount must be greater than zero');
    });

    it('should store failure reason when provided', async () => {
      // Arrange
      const sellerId = '5';
      const orderId = '100';
      const amount = 8500;
      const commission = 1500;
      const failureReason = 'Payment gateway error';

      const mockPayout = new SellerPayout({
        sellerId: parseInt(sellerId, 10),
        orderId: orderId,
        amount,
        commission,
        status: PayoutStatus.FAILED,
        failureReason,
      });
      mockPayout.id = 1;

      mockRepository.save.mockResolvedValue(mockPayout);

      // Act
      const result = await service.createPayout(
        mockCtx,
        sellerId,
        orderId,
        amount,
        commission,
        PayoutStatus.FAILED,
        failureReason
      );

      // Assert
      expect(result.failureReason).toBe(failureReason);
    });

    it('should return existing payout when duplicate key error occurs (PostgreSQL)', async () => {
      // Arrange
      const sellerId = '5';
      const orderId = '100';
      const amount = 8500;
      const commission = 1500;

      const existingPayout = new SellerPayout({
        sellerId: parseInt(sellerId, 10),
        orderId: orderId,
        amount,
        commission,
        status: PayoutStatus.HOLD,
      });
      existingPayout.id = 1;
      existingPayout.createdAt = new Date();
      existingPayout.updatedAt = new Date();

      // Simulate duplicate key error (PostgreSQL error code 23505)
      const duplicateError = new Error('duplicate key value violates unique constraint');
      (duplicateError as any).code = '23505';

      mockRepository.save.mockRejectedValueOnce(duplicateError);
      mockRepository.findOne.mockResolvedValue(existingPayout);

      // Act
      const result = await service.createPayout(mockCtx, sellerId, orderId, amount, commission);

      // Assert
      expect(mockRepository.save).toHaveBeenCalled();
      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: {
          orderId: orderId,
          sellerId: parseInt(sellerId, 10),
        },
      });
      expect(result).toEqual(existingPayout);
      expect(result.id).toBe(1);
    });

    it('should return existing payout when duplicate key error occurs (MySQL)', async () => {
      // Arrange
      const sellerId = '5';
      const orderId = '100';
      const amount = 8500;
      const commission = 1500;

      const existingPayout = new SellerPayout({
        sellerId: parseInt(sellerId, 10),
        orderId: orderId,
        amount,
        commission,
        status: PayoutStatus.HOLD,
      });
      existingPayout.id = 1;

      // Simulate duplicate key error (MySQL error code ER_DUP_ENTRY)
      const duplicateError = new Error('Duplicate entry');
      (duplicateError as any).code = 'ER_DUP_ENTRY';

      mockRepository.save.mockRejectedValueOnce(duplicateError);
      mockRepository.findOne.mockResolvedValue(existingPayout);

      // Act
      const result = await service.createPayout(mockCtx, sellerId, orderId, amount, commission);

      // Assert
      expect(mockRepository.findOne).toHaveBeenCalled();
      expect(result).toEqual(existingPayout);
    });

    it('should retry findOne with delay if it returns null after duplicate error (race condition)', async () => {
      // Arrange
      const sellerId = '5';
      const orderId = '100';
      const amount = 8500;
      const commission = 1500;

      const existingPayout = new SellerPayout({
        sellerId: parseInt(sellerId, 10),
        orderId: orderId,
        amount,
        commission,
        status: PayoutStatus.HOLD,
      });
      existingPayout.id = 1;

      // Simulate duplicate key error
      const duplicateError = new Error('UNIQUE constraint violation');
      (duplicateError as any).code = '23505';

      // First findOne returns null (record not yet visible due to transaction isolation)
      // Second findOne returns the existing payout (after retry)
      mockRepository.save.mockRejectedValueOnce(duplicateError);
      mockRepository.findOne
        .mockResolvedValueOnce(null) // First attempt: not found
        .mockResolvedValueOnce(existingPayout); // Second attempt: found

      // Act
      const result = await service.createPayout(mockCtx, sellerId, orderId, amount, commission);

      // Assert
      expect(mockRepository.findOne).toHaveBeenCalledTimes(2);
      expect(result).toEqual(existingPayout);
    });

    it('should throw descriptive error if findOne fails after duplicate error and retries exhausted', async () => {
      // Arrange
      const sellerId = '5';
      const orderId = '100';
      const amount = 8500;
      const commission = 1500;

      // Simulate duplicate key error
      const duplicateError = new Error('UNIQUE constraint violation');
      (duplicateError as any).code = '23505';

      mockRepository.save.mockRejectedValueOnce(duplicateError);
      // findOne keeps returning null (record never becomes visible)
      mockRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      // After retries are exhausted, should throw a descriptive error
      // This indicates a real problem (transaction isolation or replication issue)
      await expect(
        service.createPayout(mockCtx, sellerId, orderId, amount, commission)
      ).rejects.toThrow('Duplicate payout detected but existing record not found after');
      expect(mockRepository.findOne).toHaveBeenCalledTimes(5); // Max retries
    });

    it('should handle duplicate error with message containing "UNIQUE constraint"', async () => {
      // Arrange
      const sellerId = '5';
      const orderId = '100';
      const amount = 8500;
      const commission = 1500;

      const existingPayout = new SellerPayout({
        sellerId: parseInt(sellerId, 10),
        orderId: orderId,
        amount,
        commission,
        status: PayoutStatus.HOLD,
      });
      existingPayout.id = 1;

      // Simulate duplicate error with message (no error code)
      const duplicateError = new Error(
        'UNIQUE constraint "idx_seller_payout_order_seller_unique" violated'
      );

      mockRepository.save.mockRejectedValueOnce(duplicateError);
      mockRepository.findOne.mockResolvedValue(existingPayout);

      // Act
      const result = await service.createPayout(mockCtx, sellerId, orderId, amount, commission);

      // Assert
      expect(result).toEqual(existingPayout);
    });

    it('should re-throw non-duplicate errors', async () => {
      // Arrange
      const sellerId = '5';
      const orderId = '100';
      const amount = 8500;
      const commission = 1500;

      const otherError = new Error('Database connection failed');
      (otherError as any).code = 'ECONNREFUSED';

      mockRepository.save.mockRejectedValueOnce(otherError);

      // Act & Assert
      await expect(
        service.createPayout(mockCtx, sellerId, orderId, amount, commission)
      ).rejects.toThrow('Database connection failed');
      expect(mockRepository.findOne).not.toHaveBeenCalled();
    });
  });

  describe('updatePayoutStatus', () => {
    it('should update payout status from HOLD to PENDING', async () => {
      // Arrange
      const payoutId = '1';
      const existingPayout = new SellerPayout({
        sellerId: 5,
        orderId: '100',
        amount: 8500,
        commission: 1500,
        status: PayoutStatus.HOLD,
      });
      existingPayout.id = 1;

      const updatedPayout = {
        ...existingPayout,
        status: PayoutStatus.PENDING,
        releasedAt: new Date(),
      };

      mockRepository.findOne.mockResolvedValue(existingPayout);
      mockRepository.save.mockResolvedValue(updatedPayout);

      // Act
      const result = await service.updatePayoutStatus(mockCtx, payoutId, PayoutStatus.PENDING);

      // Assert
      expect(mockRepository.findOne).toHaveBeenCalledWith({ where: { id: payoutId } });
      expect(result.status).toBe(PayoutStatus.PENDING);
      expect(result.releasedAt).toBeDefined();
    });

    it('should update payout status to COMPLETED and set completedAt', async () => {
      // Arrange
      const payoutId = '1';
      const existingPayout = new SellerPayout({
        sellerId: 5,
        orderId: '100',
        amount: 8500,
        commission: 1500,
        status: PayoutStatus.PENDING,
      });
      existingPayout.id = 1;

      const updatedPayout = {
        ...existingPayout,
        status: PayoutStatus.COMPLETED,
        completedAt: new Date(),
      };

      mockRepository.findOne.mockResolvedValue(existingPayout);
      mockRepository.save.mockResolvedValue(updatedPayout);

      // Act
      const result = await service.updatePayoutStatus(mockCtx, payoutId, PayoutStatus.COMPLETED);

      // Assert
      expect(result.status).toBe(PayoutStatus.COMPLETED);
      expect(result.completedAt).toBeDefined();
    });

    it('should set releasedAt when transitioning from HOLD to PENDING', async () => {
      // Arrange: Test the bug fix - original status must be captured before reassignment
      const payoutId = '1';
      const existingPayout = new SellerPayout({
        sellerId: 5,
        orderId: '100',
        amount: 8500,
        commission: 1500,
        status: PayoutStatus.HOLD, // Original status is HOLD
      });
      existingPayout.id = 1;
      existingPayout.releasedAt = undefined; // Not yet released

      // Mock save to capture what was actually saved
      const savedPayouts: SellerPayout[] = [];
      mockRepository.findOne.mockResolvedValue(existingPayout);
      mockRepository.save.mockImplementation((payout: any) => {
        savedPayouts.push(payout as SellerPayout);
        return Promise.resolve(payout);
      });

      // Act: Transition from HOLD to PENDING
      const result = await service.updatePayoutStatus(mockCtx, payoutId, PayoutStatus.PENDING);

      // Assert: releasedAt should be set because original status was HOLD
      expect(result.status).toBe(PayoutStatus.PENDING);
      expect(savedPayouts).toHaveLength(1);
      expect(savedPayouts[0].releasedAt).toBeDefined();
      expect(savedPayouts[0].releasedAt).toBeInstanceOf(Date);
    });

    it('should set releasedAt when updating to PENDING if not already set (even if not from HOLD)', async () => {
      // Arrange: Test the else branch - PENDING status but releasedAt not set
      const payoutId = '1';
      const existingPayout = new SellerPayout({
        sellerId: 5,
        orderId: '100',
        amount: 8500,
        commission: 1500,
        status: PayoutStatus.PROCESSING, // Not HOLD, but will transition to PENDING
      });
      existingPayout.id = 1;
      existingPayout.releasedAt = undefined; // Not yet released

      // Mock save to capture what was actually saved
      const savedPayouts: SellerPayout[] = [];
      mockRepository.findOne.mockResolvedValue(existingPayout);
      mockRepository.save.mockImplementation((payout: any) => {
        savedPayouts.push(payout as SellerPayout);
        return Promise.resolve(payout);
      });

      // Act: Transition from PROCESSING to PENDING
      const result = await service.updatePayoutStatus(mockCtx, payoutId, PayoutStatus.PENDING);

      // Assert: releasedAt should be set via the else branch
      expect(result.status).toBe(PayoutStatus.PENDING);
      expect(savedPayouts).toHaveLength(1);
      expect(savedPayouts[0].releasedAt).toBeDefined();
      expect(savedPayouts[0].releasedAt).toBeInstanceOf(Date);
    });

    it('should update payout status to FAILED and store failure reason', async () => {
      // Arrange
      const payoutId = '1';
      const failureReason = 'Payment gateway timeout';
      const existingPayout = new SellerPayout({
        sellerId: 5,
        orderId: '100',
        amount: 8500,
        commission: 1500,
        status: PayoutStatus.PROCESSING,
      });
      existingPayout.id = 1;

      const updatedPayout = { ...existingPayout, status: PayoutStatus.FAILED, failureReason };

      mockRepository.findOne.mockResolvedValue(existingPayout);
      mockRepository.save.mockResolvedValue(updatedPayout);

      // Act
      const result = await service.updatePayoutStatus(
        mockCtx,
        payoutId,
        PayoutStatus.FAILED,
        failureReason
      );

      // Assert
      expect(result.status).toBe(PayoutStatus.FAILED);
      expect(result.failureReason).toBe(failureReason);
    });

    it('should throw error if payout not found', async () => {
      // Arrange
      const payoutId = '999';
      mockRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.updatePayoutStatus(mockCtx, payoutId, PayoutStatus.PENDING)
      ).rejects.toThrow(`Payout with ID ${payoutId} not found`);
    });
  });

  describe('getPayoutById', () => {
    it('should return payout by ID', async () => {
      // Arrange
      const payoutId = '1';
      const mockPayout = new SellerPayout({
        sellerId: 5,
        orderId: '100',
        amount: 8500,
        commission: 1500,
        status: PayoutStatus.HOLD,
      });
      mockPayout.id = 1;

      mockRepository.findOne.mockResolvedValue(mockPayout);

      // Act
      const result = await service.getPayoutById(mockCtx, payoutId);

      // Assert
      expect(mockRepository.findOne).toHaveBeenCalledWith({ where: { id: payoutId } });
      expect(result).toBeDefined();
      expect(result?.id).toBe(1);
    });

    it('should return null if payout not found', async () => {
      // Arrange
      const payoutId = '999';
      mockRepository.findOne.mockResolvedValue(null);

      // Act
      const result = await service.getPayoutById(mockCtx, payoutId);

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('getPayoutsForSeller', () => {
    it('should return all payouts for a seller ordered by creation date DESC', async () => {
      // Arrange
      const sellerId = '5';
      const mockPayouts = [
        new SellerPayout({
          sellerId: 5,
          orderId: '100',
          amount: 8500,
          commission: 1500,
          status: PayoutStatus.HOLD,
        }),
        new SellerPayout({
          sellerId: 5,
          orderId: '101',
          amount: 12000,
          commission: 2000,
          status: PayoutStatus.PENDING,
        }),
      ];
      mockPayouts[0].id = 1;
      mockPayouts[1].id = 2;

      mockRepository.find.mockResolvedValue(mockPayouts);

      // Act
      const result = await service.getPayoutsForSeller(mockCtx, sellerId);

      // Assert
      expect(mockRepository.find).toHaveBeenCalledWith({
        where: { sellerId: 5 },
        order: { createdAt: 'DESC' },
      });
      expect(result).toHaveLength(2);
      expect(result[0].sellerId).toBe(5);
      expect(result[1].sellerId).toBe(5);
    });

    it('should return empty array if seller has no payouts', async () => {
      // Arrange
      const sellerId = '999';
      mockRepository.find.mockResolvedValue([]);

      // Act
      const result = await service.getPayoutsForSeller(mockCtx, sellerId);

      // Assert
      expect(result).toEqual([]);
    });
  });

  describe('getTotalPayoutAmount', () => {
    it('should calculate total payout amount for seller', () => {
      // Arrange
      const sellerId = '5';
      const payouts = [
        new SellerPayout({
          sellerId: 5,
          orderId: '100',
          amount: 8500,
          commission: 1500,
          status: PayoutStatus.HOLD,
        }),
        new SellerPayout({
          sellerId: 5,
          orderId: '101',
          amount: 12000,
          commission: 2000,
          status: PayoutStatus.PENDING,
        }),
      ];

      // Act
      const total = service.getTotalPayoutAmount(payouts, sellerId);

      // Assert
      expect(total).toBe(20500); // $205.00
    });

    it('should return zero for seller with no payouts', () => {
      // Arrange
      const sellerId = '5';
      const payouts: SellerPayout[] = [];

      // Act
      const total = service.getTotalPayoutAmount(payouts, sellerId);

      // Assert
      expect(total).toBe(0);
    });

    it('should only sum payouts for specified seller', () => {
      // Arrange
      const sellerId = '5';
      const payouts = [
        new SellerPayout({
          sellerId: 5,
          orderId: '100',
          amount: 8500,
          commission: 1500,
          status: PayoutStatus.HOLD,
        }),
        new SellerPayout({
          sellerId: 6, // Different seller
          orderId: '101',
          amount: 12000,
          commission: 2000,
          status: PayoutStatus.PENDING,
        }),
      ];

      // Act
      const total = service.getTotalPayoutAmount(payouts, sellerId);

      // Assert
      expect(total).toBe(8500); // Only seller 5's payout
    });
  });

  describe('getPayoutsByStatus', () => {
    it('should filter payouts by status', () => {
      // Arrange
      const payouts = [
        new SellerPayout({
          sellerId: 5,
          orderId: '100',
          amount: 8500,
          commission: 1500,
          status: PayoutStatus.HOLD,
        }),
        new SellerPayout({
          sellerId: 5,
          orderId: '101',
          amount: 12000,
          commission: 2000,
          status: PayoutStatus.PENDING,
        }),
        new SellerPayout({
          sellerId: 6,
          orderId: '102',
          amount: 5000,
          commission: 1000,
          status: PayoutStatus.HOLD,
        }),
      ];

      // Act
      const holdPayouts = service.getPayoutsByStatus(payouts, PayoutStatus.HOLD);

      // Assert
      expect(holdPayouts).toHaveLength(2);
      expect(holdPayouts.every((p) => p.status === PayoutStatus.HOLD)).toBe(true);
    });
  });

  describe('canReleasePayout', () => {
    it('should allow release from HOLD status', () => {
      // Arrange
      const payout = new SellerPayout({
        sellerId: 5,
        orderId: '100',
        amount: 8500,
        commission: 1500,
        status: PayoutStatus.HOLD,
      });

      // Act
      const canRelease = service.canReleasePayout(payout);

      // Assert
      expect(canRelease).toBe(true);
    });

    it('should allow release from PENDING status', () => {
      // Arrange
      const payout = new SellerPayout({
        sellerId: 5,
        orderId: '100',
        amount: 8500,
        commission: 1500,
        status: PayoutStatus.PENDING,
      });

      // Act
      const canRelease = service.canReleasePayout(payout);

      // Assert
      expect(canRelease).toBe(true);
    });

    it('should not allow release from COMPLETED status', () => {
      // Arrange
      const payout = new SellerPayout({
        sellerId: 5,
        orderId: '100',
        amount: 8500,
        commission: 1500,
        status: PayoutStatus.COMPLETED,
      });

      // Act
      const canRelease = service.canReleasePayout(payout);

      // Assert
      expect(canRelease).toBe(false);
    });

    it('should not allow release from FAILED status', () => {
      // Arrange
      const payout = new SellerPayout({
        sellerId: 5,
        orderId: '100',
        amount: 8500,
        commission: 1500,
        status: PayoutStatus.FAILED,
      });

      // Act
      const canRelease = service.canReleasePayout(payout);

      // Assert
      expect(canRelease).toBe(false);
    });

    it('should not allow release from PROCESSING status', () => {
      // Arrange
      const payout = new SellerPayout({
        sellerId: 5,
        orderId: '100',
        amount: 8500,
        commission: 1500,
        status: PayoutStatus.PROCESSING,
      });

      // Act
      const canRelease = service.canReleasePayout(payout);

      // Assert
      expect(canRelease).toBe(false);
    });
  });

  describe('releasePayout', () => {
    it('should release payout from HOLD to PENDING', async () => {
      // Arrange
      const payoutId = '1';
      const existingPayout = new SellerPayout({
        sellerId: 5,
        orderId: '100',
        amount: 8500,
        commission: 1500,
        status: PayoutStatus.HOLD,
      });
      existingPayout.id = 1;

      const updatedPayout = {
        ...existingPayout,
        status: PayoutStatus.PENDING,
        releasedAt: new Date(),
      };

      mockRepository.findOne.mockResolvedValue(existingPayout);
      mockRepository.save.mockResolvedValue(updatedPayout);

      // Act
      const result = await service.releasePayout(mockCtx, payoutId);

      // Assert
      expect(mockRepository.findOne).toHaveBeenCalledWith({ where: { id: payoutId } });
      expect(result.status).toBe(PayoutStatus.PENDING);
      expect(result.releasedAt).toBeDefined();
    });
  });

  describe('getPendingPayoutTotal', () => {
    it('should calculate total pending payouts for a seller (includes both PENDING and HOLD)', async () => {
      // Arrange
      const sellerId = '5';
      // Both PENDING and HOLD payouts are included in the total
      const mockPayouts = [
        new SellerPayout({
          sellerId: 5,
          orderId: '100',
          amount: 8500,
          commission: 1500,
          status: PayoutStatus.PENDING,
        }),
        new SellerPayout({
          sellerId: 5,
          orderId: '101',
          amount: 12000,
          commission: 2000,
          status: PayoutStatus.PENDING,
        }),
        new SellerPayout({
          sellerId: 5,
          orderId: '102',
          amount: 5000,
          commission: 1000,
          status: PayoutStatus.HOLD,
        }),
      ];

      mockRepository.find.mockResolvedValue(mockPayouts);

      // Act
      const total = await service.getPendingPayoutTotal(mockCtx, sellerId);

      // Assert: Verify query includes both PENDING and HOLD statuses
      expect(mockRepository.find).toHaveBeenCalledWith({
        where: {
          sellerId: 5,
          status: expect.objectContaining({
            _type: 'in',
            _value: [PayoutStatus.PENDING, PayoutStatus.HOLD],
          }),
        },
      });
      expect(total).toBe(25500); // $255.00 (8500 + 12000 + 5000)
    });

    it('should return zero if seller has no pending or hold payouts', async () => {
      // Arrange
      const sellerId = '5';
      mockRepository.find.mockResolvedValue([]);

      // Act
      const total = await service.getPendingPayoutTotal(mockCtx, sellerId);

      // Assert
      expect(total).toBe(0);
    });

    it('should include HOLD payouts in the total', async () => {
      // Arrange
      const sellerId = '5';
      // Only HOLD payouts (funds in escrow)
      const mockPayouts = [
        new SellerPayout({
          sellerId: 5,
          orderId: '100',
          amount: 10000,
          commission: 1500,
          status: PayoutStatus.HOLD,
        }),
        new SellerPayout({
          sellerId: 5,
          orderId: '101',
          amount: 5000,
          commission: 750,
          status: PayoutStatus.HOLD,
        }),
      ];

      mockRepository.find.mockResolvedValue(mockPayouts);

      // Act
      const total = await service.getPendingPayoutTotal(mockCtx, sellerId);

      // Assert: HOLD payouts should be included
      expect(total).toBe(15000); // $150.00 (10000 + 5000)
    });
  });

  describe('canRequestPayout', () => {
    it('should return true if pending payout total meets minimum threshold', async () => {
      // Arrange
      const sellerId = '5';
      const minimumThreshold = 10000; // $100.00
      const mockPayouts = [
        new SellerPayout({
          sellerId: 5,
          orderId: '100',
          amount: 8500,
          commission: 1500,
          status: PayoutStatus.PENDING,
        }),
        new SellerPayout({
          sellerId: 5,
          orderId: '101',
          amount: 12000,
          commission: 2000,
          status: PayoutStatus.PENDING,
        }),
      ];

      mockRepository.find.mockResolvedValue(mockPayouts);

      // Act
      const canRequest = await service.canRequestPayout(mockCtx, sellerId, minimumThreshold);

      // Assert
      expect(canRequest).toBe(true); // Total is 20500, exceeds 10000 threshold
    });

    it('should return false if pending payout total is below minimum threshold', async () => {
      // Arrange
      const sellerId = '5';
      const minimumThreshold = 10000; // $100.00
      const mockPayouts = [
        new SellerPayout({
          sellerId: 5,
          orderId: '100',
          amount: 5000,
          commission: 1000,
          status: PayoutStatus.PENDING,
        }),
      ];

      mockRepository.find.mockResolvedValue(mockPayouts);

      // Act
      const canRequest = await service.canRequestPayout(mockCtx, sellerId, minimumThreshold);

      // Assert
      expect(canRequest).toBe(false); // Total is 5000, below 10000 threshold
    });

    it('should return true if pending payout total exactly equals minimum threshold', async () => {
      // Arrange
      const sellerId = '5';
      const minimumThreshold = 10000; // $100.00
      const mockPayouts = [
        new SellerPayout({
          sellerId: 5,
          orderId: '100',
          amount: 10000,
          commission: 0,
          status: PayoutStatus.PENDING,
        }),
      ];

      mockRepository.find.mockResolvedValue(mockPayouts);

      // Act
      const canRequest = await service.canRequestPayout(mockCtx, sellerId, minimumThreshold);

      // Assert
      expect(canRequest).toBe(true); // Total equals threshold
    });
  });

  describe('hasPayoutsForOrder', () => {
    it('should return true if payouts exist for an order', async () => {
      // Arrange
      const orderId = '100';
      mockRepository.count.mockResolvedValue(2); // 2 payouts exist

      // Act
      const hasPayouts = await service.hasPayoutsForOrder(mockCtx, orderId);

      // Assert
      expect(mockRepository.count).toHaveBeenCalledWith({
        where: {
          orderId: orderId.toString(),
        },
      });
      expect(hasPayouts).toBe(true);
    });

    it('should return false if no payouts exist for an order', async () => {
      // Arrange
      const orderId = '100';
      mockRepository.count.mockResolvedValue(0); // No payouts exist

      // Act
      const hasPayouts = await service.hasPayoutsForOrder(mockCtx, orderId);

      // Assert
      expect(mockRepository.count).toHaveBeenCalledWith({
        where: {
          orderId: orderId.toString(),
        },
      });
      expect(hasPayouts).toBe(false);
    });
  });

  describe('requestPayout', () => {
    it('should transition all HOLD payouts to PENDING for seller', async () => {
      // Arrange
      const sellerId = '5';
      const holdPayouts = [
        {
          id: '1',
          sellerId: parseInt(sellerId, 10),
          orderId: '100',
          amount: 5000,
          commission: 500,
          status: PayoutStatus.HOLD,
        },
        {
          id: '2',
          sellerId: parseInt(sellerId, 10),
          orderId: '101',
          amount: 3000,
          commission: 300,
          status: PayoutStatus.HOLD,
        },
      ] as SellerPayout[];

      mockRepository.find.mockResolvedValue(holdPayouts);
      mockRepository.save.mockImplementation((payout: SellerPayout | SellerPayout[]) =>
        Promise.resolve(payout)
      );

      // Act
      const result = await service.requestPayout(mockCtx, sellerId);

      // Assert
      expect(mockRepository.find).toHaveBeenCalledWith({
        where: {
          sellerId: parseInt(sellerId, 10),
          status: PayoutStatus.HOLD,
        },
      });
      expect(mockRepository.save).toHaveBeenCalledTimes(1);
      expect(mockRepository.save).toHaveBeenCalledWith(expect.arrayContaining(holdPayouts));
      expect(result.length).toBe(2);
      result.forEach((payout) => {
        expect(payout.status).toBe(PayoutStatus.PENDING);
        expect(payout.releasedAt).toBeDefined();
      });
    });

    it('should return empty array when seller has no HOLD payouts', async () => {
      // Arrange
      const sellerId = '5';
      mockRepository.find.mockResolvedValue([]);

      // Act
      const result = await service.requestPayout(mockCtx, sellerId);

      // Assert
      expect(mockRepository.find).toHaveBeenCalledWith({
        where: {
          sellerId: parseInt(sellerId, 10),
          status: PayoutStatus.HOLD,
        },
      });
      expect(mockRepository.save).not.toHaveBeenCalled();
      expect(result).toEqual([]);
    });

    it('should only transition HOLD payouts, not PENDING ones', async () => {
      // Arrange
      const sellerId = '5';
      const holdPayouts = [
        {
          id: '1',
          sellerId: parseInt(sellerId, 10),
          orderId: '100',
          amount: 5000,
          commission: 500,
          status: PayoutStatus.HOLD,
        },
      ] as SellerPayout[];

      mockRepository.find.mockResolvedValue(holdPayouts);
      mockRepository.save.mockImplementation((payout: SellerPayout | SellerPayout[]) =>
        Promise.resolve(payout)
      );

      // Act
      const result = await service.requestPayout(mockCtx, sellerId);

      // Assert
      expect(mockRepository.find).toHaveBeenCalledWith({
        where: {
          sellerId: parseInt(sellerId, 10),
          status: PayoutStatus.HOLD,
        },
      });
      expect(result.length).toBe(1);
      expect(result[0].status).toBe(PayoutStatus.PENDING);
    });
  });

  describe('getPendingPayouts', () => {
    it('should return all pending payouts across all sellers', async () => {
      // Arrange
      const mockPayouts = [
        {
          id: '1',
          sellerId: 5,
          orderId: '100',
          amount: 5000,
          status: PayoutStatus.PENDING,
        },
        {
          id: '2',
          sellerId: 6,
          orderId: '101',
          amount: 3000,
          status: PayoutStatus.PENDING,
        },
      ] as SellerPayout[];

      mockRepository.find.mockResolvedValue(mockPayouts);

      // Act
      const result = await service.getPendingPayouts(mockCtx);

      // Assert
      expect(mockRepository.find).toHaveBeenCalledWith({
        where: {
          status: In([PayoutStatus.PENDING, PayoutStatus.PROCESSING]),
        },
        order: { createdAt: 'DESC' },
      });
      expect(result).toEqual(mockPayouts);
      expect(result.length).toBe(2);
    });

    it('should return empty array when no pending payouts exist', async () => {
      // Arrange
      mockRepository.find.mockResolvedValue([]);

      // Act
      const result = await service.getPendingPayouts(mockCtx);

      // Assert
      expect(result).toEqual([]);
    });
  });
});
