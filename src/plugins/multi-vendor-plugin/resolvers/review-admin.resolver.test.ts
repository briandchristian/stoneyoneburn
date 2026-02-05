/**
 * Review Admin Resolver Tests
 *
 * Test-Driven Development (TDD) for Phase 4: Reviews & Ratings System
 *
 * These tests define the expected behavior of the review admin resolver:
 * - Admins can approve pending reviews
 * - Admins can reject reviews with reason
 * - Admins can query pending reviews for moderation
 * - Proper permission checks
 *
 * Following TDD workflow:
 * 1. Write tests first (RED) ✅
 * 2. Implement minimal code to pass (GREEN)
 * 3. Refactor while keeping tests passing
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import type { RequestContext } from '@vendure/core';
import { ReviewAdminResolver } from './review-admin.resolver';
import { ReviewService } from '../services/review.service';
import { Review, ReviewStatus } from '../entities/review.entity';

// Mock service
jest.mock('../services/review.service');

describe('ReviewAdminResolver - Unit Tests', () => {
  let resolver: ReviewAdminResolver;
  let mockReviewService: jest.Mocked<ReviewService>;
  let mockCtx: RequestContext;

  beforeEach(() => {
    // Create mock service
    mockReviewService = {
      approveReview: jest.fn(),
      rejectReview: jest.fn(),
      getReviews: jest.fn(),
    } as any;

    // Create resolver instance
    resolver = new ReviewAdminResolver(mockReviewService);

    // Create mock request context
    mockCtx = {
      channel: {} as any,
      languageCode: 'en' as const,
    } as RequestContext;
  });

  describe('approveReview mutation', () => {
    it('should allow admin to approve a pending review', async () => {
      // Arrange
      const reviewId = '1';
      const approvedReview: Review = {
        id: '1',
        productId: '100',
        customerId: '5',
        sellerId: 10,
        rating: 5,
        title: 'Great product!',
        body: 'I really enjoyed this product.',
        status: ReviewStatus.APPROVED,
        verified: true,
        helpfulCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as Review;

      mockReviewService.approveReview.mockResolvedValue(approvedReview);

      // Act
      const result = await resolver.approveReview(mockCtx, reviewId);

      // Assert
      expect(mockReviewService.approveReview).toHaveBeenCalledWith(mockCtx, reviewId);
      expect(result).toEqual(approvedReview);
    });

    it('should throw error if review not found', async () => {
      // Arrange
      const reviewId = '999';
      mockReviewService.approveReview.mockRejectedValue(new Error('Review not found'));

      // Act & Assert
      await expect(resolver.approveReview(mockCtx, reviewId)).rejects.toThrow('Review not found');
    });
  });

  describe('rejectReview mutation', () => {
    it('should allow admin to reject a review with reason', async () => {
      // Arrange
      const reviewId = '1';
      const rejectionReason = 'Spam detected';
      const rejectedReview: Review = {
        id: '1',
        productId: '100',
        customerId: '5',
        sellerId: 10,
        rating: 5,
        title: 'Title',
        body: 'Body',
        status: ReviewStatus.REJECTED,
        verified: false,
        helpfulCount: 0,
        rejectionReason,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as Review;

      mockReviewService.rejectReview.mockResolvedValue(rejectedReview);

      // Act
      const result = await resolver.rejectReview(mockCtx, reviewId, rejectionReason);

      // Assert
      expect(mockReviewService.rejectReview).toHaveBeenCalledWith(
        mockCtx,
        reviewId,
        rejectionReason
      );
      expect(result).toEqual(rejectedReview);
      expect(result.status).toBe(ReviewStatus.REJECTED);
      expect(result.rejectionReason).toBe(rejectionReason);
    });

    it('should throw error if review not found', async () => {
      // Arrange
      const reviewId = '999';
      const rejectionReason = 'Spam';
      mockReviewService.rejectReview.mockRejectedValue(new Error('Review not found'));

      // Act & Assert
      await expect(resolver.rejectReview(mockCtx, reviewId, rejectionReason)).rejects.toThrow(
        'Review not found'
      );
    });
  });

  describe('pendingReviews query', () => {
    it('should return pending reviews for moderation', async () => {
      // Arrange
      const pendingReviews: Review[] = [
        {
          id: '1',
          productId: '100',
          customerId: '5',
          sellerId: 10,
          rating: 5,
          title: 'Title 1',
          body: 'Body 1',
          status: ReviewStatus.PENDING,
          verified: true,
          helpfulCount: 0,
        } as Review,
        {
          id: '2',
          productId: '101',
          customerId: '6',
          sellerId: 11,
          rating: 4,
          title: 'Title 2',
          body: 'Body 2',
          status: ReviewStatus.PENDING,
          verified: false,
          helpfulCount: 0,
        } as Review,
      ];

      mockReviewService.getReviews.mockResolvedValue({
        items: pendingReviews,
        totalItems: 2,
      });

      // Act
      const result = await resolver.pendingReviews(mockCtx);

      // Assert
      expect(mockReviewService.getReviews).toHaveBeenCalledWith(mockCtx, {
        status: ReviewStatus.PENDING,
      });
      expect(result.items).toEqual(pendingReviews);
      expect(result.totalItems).toBe(2);
    });

    it('should return empty list when no pending reviews', async () => {
      // Arrange
      mockReviewService.getReviews.mockResolvedValue({
        items: [],
        totalItems: 0,
      });

      // Act
      const result = await resolver.pendingReviews(mockCtx);

      // Assert
      expect(result.items).toEqual([]);
      expect(result.totalItems).toBe(0);
    });
  });
});
