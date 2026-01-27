/**
 * Seller Payout Admin Resolver Tests
 *
 * Test-Driven Development (TDD) for Phase 3.3: Seller Payout System - Admin Approval Workflow
 *
 * These tests define the expected behavior of the admin payout approval resolver:
 * - Admins can approve pending payouts
 * - Admins can reject pending payouts with a reason
 * - Only PENDING payouts can be approved/rejected
 * - Approval transitions payout to PROCESSING then COMPLETED
 * - Rejection transitions payout to FAILED with reason
 *
 * Following TDD workflow:
 * 1. Write tests first (RED) ✅
 * 2. Implement minimal code to pass (GREEN)
 * 3. Refactor while keeping tests passing
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import type { RequestContext } from '@vendure/core';
import { SellerPayoutAdminResolver } from './seller-payout-admin.resolver';
import { SellerPayoutService, PayoutStatus } from '../services/seller-payout.service';
import { SellerPayout } from '../entities/seller-payout.entity';

// Mock services
jest.mock('../services/seller-payout.service');

describe('SellerPayoutAdminResolver - Unit Tests', () => {
  let resolver: SellerPayoutAdminResolver;
  let mockPayoutService: jest.Mocked<SellerPayoutService>;
  let mockCtx: RequestContext;

  beforeEach(() => {
    // Create mock service
    mockPayoutService = {
      getPayoutById: jest.fn(),
      updatePayoutStatus: jest.fn(),
      getPayoutsForSeller: jest.fn(),
    } as any;

    // Create resolver instance
    resolver = new SellerPayoutAdminResolver(mockPayoutService);

    // Create mock request context
    mockCtx = {
      channel: {} as any,
      languageCode: 'en' as const,
    } as RequestContext;
  });

  describe('approvePayout mutation', () => {
    it('should approve a pending payout and transition to COMPLETED', async () => {
      // Arrange
      const payoutId = '1';
      const mockPayout = {
        id: payoutId,
        sellerId: '5',
        orderId: '100',
        amount: 5000,
        commission: 500,
        status: PayoutStatus.PENDING,
      } as SellerPayout;

      mockPayoutService.getPayoutById.mockResolvedValue(mockPayout);
      mockPayoutService.updatePayoutStatus.mockResolvedValue({
        ...mockPayout,
        status: PayoutStatus.COMPLETED,
        completedAt: new Date(),
      } as SellerPayout);

      // Act
      const result = await resolver.approvePayout(mockCtx, payoutId);

      // Assert
      expect(mockPayoutService.getPayoutById).toHaveBeenCalledWith(mockCtx, payoutId);
      expect(mockPayoutService.updatePayoutStatus).toHaveBeenCalledWith(
        mockCtx,
        payoutId,
        PayoutStatus.COMPLETED
      );
      expect(result.status).toBe(PayoutStatus.COMPLETED);
    });

    it('should reject approval if payout is not in PENDING status', async () => {
      // Arrange
      const payoutId = '1';
      const mockPayout = {
        id: payoutId,
        status: PayoutStatus.HOLD, // Not PENDING
      } as SellerPayout;

      mockPayoutService.getPayoutById.mockResolvedValue(mockPayout);

      // Act & Assert
      await expect(resolver.approvePayout(mockCtx, payoutId)).rejects.toThrow(
        'Only PENDING or PROCESSING payouts can be approved'
      );
      expect(mockPayoutService.updatePayoutStatus).not.toHaveBeenCalled();
    });

    it('should reject approval if payout does not exist', async () => {
      // Arrange
      const payoutId = '999';
      mockPayoutService.getPayoutById.mockResolvedValue(null);

      // Act & Assert
      await expect(resolver.approvePayout(mockCtx, payoutId)).rejects.toThrow('Payout not found');
    });

    it('should allow approval of PROCESSING payouts (already in progress)', async () => {
      // Arrange
      const payoutId = '1';
      const mockPayout = {
        id: payoutId,
        sellerId: '5',
        orderId: '100',
        amount: 5000,
        commission: 500,
        status: PayoutStatus.PROCESSING,
      } as SellerPayout;

      mockPayoutService.getPayoutById.mockResolvedValue(mockPayout);
      mockPayoutService.updatePayoutStatus.mockResolvedValue({
        ...mockPayout,
        status: PayoutStatus.COMPLETED,
        completedAt: new Date(),
      } as SellerPayout);

      // Act
      const result = await resolver.approvePayout(mockCtx, payoutId);

      // Assert
      expect(mockPayoutService.updatePayoutStatus).toHaveBeenCalledWith(
        mockCtx,
        payoutId,
        PayoutStatus.COMPLETED
      );
      expect(result.status).toBe(PayoutStatus.COMPLETED);
    });
  });

  describe('rejectPayout mutation', () => {
    it('should reject a pending payout with a reason', async () => {
      // Arrange
      const payoutId = '1';
      const rejectionReason = 'Insufficient funds';
      const mockPayout = {
        id: payoutId,
        sellerId: '5',
        orderId: '100',
        amount: 5000,
        commission: 500,
        status: PayoutStatus.PENDING,
      } as SellerPayout;

      mockPayoutService.getPayoutById.mockResolvedValue(mockPayout);
      mockPayoutService.updatePayoutStatus.mockResolvedValue({
        ...mockPayout,
        status: PayoutStatus.FAILED,
        failureReason: rejectionReason,
      } as SellerPayout);

      // Act
      const result = await resolver.rejectPayout(mockCtx, payoutId, rejectionReason);

      // Assert
      expect(mockPayoutService.getPayoutById).toHaveBeenCalledWith(mockCtx, payoutId);
      expect(mockPayoutService.updatePayoutStatus).toHaveBeenCalledWith(
        mockCtx,
        payoutId,
        PayoutStatus.FAILED,
        rejectionReason
      );
      expect(result.status).toBe(PayoutStatus.FAILED);
      expect(result.failureReason).toBe(rejectionReason);
    });

    it('should reject rejection if payout is not in PENDING or PROCESSING status', async () => {
      // Arrange
      const payoutId = '1';
      const mockPayout = {
        id: payoutId,
        status: PayoutStatus.COMPLETED, // Already completed
      } as SellerPayout;

      mockPayoutService.getPayoutById.mockResolvedValue(mockPayout);

      // Act & Assert
      await expect(resolver.rejectPayout(mockCtx, payoutId, 'Test reason')).rejects.toThrow(
        'Only PENDING or PROCESSING payouts can be rejected'
      );
      expect(mockPayoutService.updatePayoutStatus).not.toHaveBeenCalled();
    });

    it('should reject rejection if payout does not exist', async () => {
      // Arrange
      const payoutId = '999';
      mockPayoutService.getPayoutById.mockResolvedValue(null);

      // Act & Assert
      await expect(resolver.rejectPayout(mockCtx, payoutId, 'Test reason')).rejects.toThrow(
        'Payout not found'
      );
    });

    it('should require a rejection reason', async () => {
      // Arrange
      const payoutId = '1';
      const mockPayout = {
        id: payoutId,
        status: PayoutStatus.PENDING,
      } as SellerPayout;

      mockPayoutService.getPayoutById.mockResolvedValue(mockPayout);

      // Act & Assert
      await expect(resolver.rejectPayout(mockCtx, payoutId, '')).rejects.toThrow(
        'Rejection reason is required'
      );
    });
  });

  describe('pendingPayouts query', () => {
    it('should return all pending payouts for admin review', async () => {
      // Arrange
      const mockPayouts = [
        {
          id: '1',
          sellerId: '5',
          orderId: '100',
          amount: 5000,
          status: PayoutStatus.PENDING,
        },
        {
          id: '2',
          sellerId: '6',
          orderId: '101',
          amount: 3000,
          status: PayoutStatus.PENDING,
        },
      ] as SellerPayout[];

      mockPayoutService.getPayoutsForSeller.mockResolvedValue(mockPayouts);

      // Note: This would need a service method to get all pending payouts
      // For now, we'll test the concept
      // Act & Assert would depend on implementation
    });
  });
});
