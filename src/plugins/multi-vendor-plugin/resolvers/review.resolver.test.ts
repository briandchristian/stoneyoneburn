/**
 * Review Resolver Tests
 *
 * Test-Driven Development (TDD) for Phase 4: Reviews & Ratings System
 *
 * These tests define the expected behavior of the review resolver:
 * - Customers can submit reviews for products
 * - Customers can query reviews for products
 * - Reviews require authentication
 * - Purchase verification is handled by service
 *
 * Following TDD workflow:
 * 1. Write tests first (RED) ✅
 * 2. Implement minimal code to pass (GREEN)
 * 3. Refactor while keeping tests passing
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import type { RequestContext, ID } from '@vendure/core';
import { ReviewResolver } from './review.resolver';
import { ReviewService, CreateReviewInput, ReviewListResult } from '../services/review.service';
import { Review, ReviewStatus } from '../entities/review.entity';
import { SellerService } from '../services/seller.service';
import { ProductOwnershipService } from '../services/product-ownership.service';

// Mock services
jest.mock('../services/review.service');
jest.mock('../services/seller.service');
jest.mock('../services/product-ownership.service');

describe('ReviewResolver - Unit Tests', () => {
  let resolver: ReviewResolver;
  let mockReviewService: jest.Mocked<ReviewService>;
  let mockSellerService: jest.Mocked<SellerService>;
  let mockProductOwnershipService: jest.Mocked<ProductOwnershipService>;
  let mockCtx: RequestContext;

  beforeEach(() => {
    // Create mock services
    mockReviewService = {
      createReview: jest.fn(),
      getReviews: jest.fn(),
      approveReview: jest.fn(),
      rejectReview: jest.fn(),
      getSellerRating: jest.fn(),
    } as any;

    mockSellerService = {
      getSellerByCustomerId: jest.fn(),
    } as any;

    mockProductOwnershipService = {
      getProductSellerId: jest.fn(),
    } as any;

    // Create resolver instance
    resolver = new ReviewResolver(
      mockReviewService,
      mockSellerService,
      mockProductOwnershipService
    );

    // Create mock request context with authenticated user
    mockCtx = {
      channel: {} as any,
      languageCode: 'en' as const,
      activeUserId: '5',
    } as RequestContext;
  });

  describe('submitReview mutation', () => {
    it('should allow authenticated customer to submit review', async () => {
      // Arrange
      const input = {
        productId: '100',
        rating: 5,
        title: 'Great product!',
        body: 'I really enjoyed this product.',
      };

      const sellerId = 10;
      const createdReview: Review = {
        id: '1',
        productId: '100',
        customerId: '5',
        sellerId,
        rating: 5,
        title: 'Great product!',
        body: 'I really enjoyed this product.',
        status: ReviewStatus.PENDING,
        verified: true,
        helpfulCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as Review;

      mockProductOwnershipService.getProductSellerId.mockResolvedValue(sellerId.toString());
      mockReviewService.createReview.mockResolvedValue(createdReview);

      // Act
      const result = await resolver.submitReview(mockCtx, input);

      // Assert
      expect(mockProductOwnershipService.getProductSellerId).toHaveBeenCalledWith(mockCtx, '100');
      expect(mockReviewService.createReview).toHaveBeenCalledWith(mockCtx, {
        productId: '100',
        customerId: '5',
        sellerId,
        rating: 5,
        title: 'Great product!',
        body: 'I really enjoyed this product.',
      });
      expect(result).toEqual(createdReview);
    });

    it('should throw error if user is not authenticated', async () => {
      // Arrange
      const input = {
        productId: '100',
        rating: 5,
        title: 'Title',
        body: 'Body',
      };

      const unauthenticatedCtx = {
        ...mockCtx,
        activeUserId: undefined,
      } as unknown as RequestContext;

      // Act & Assert
      await expect(resolver.submitReview(unauthenticatedCtx, input)).rejects.toThrow(
        'You must be logged in to submit a review'
      );
    });

    it('should throw error if product seller not found', async () => {
      // Arrange
      const input = {
        productId: '100',
        rating: 5,
        title: 'Title',
        body: 'Body',
      };

      mockProductOwnershipService.getProductSellerId.mockResolvedValue(null);

      // Act & Assert
      await expect(resolver.submitReview(mockCtx, input)).rejects.toThrow(
        'Product seller not found'
      );
    });

    it('should propagate service validation errors', async () => {
      // Arrange
      const input = {
        productId: '100',
        rating: 0, // Invalid rating
        title: 'Title',
        body: 'Body',
      };

      const sellerId = 10;
      mockProductOwnershipService.getProductSellerId.mockResolvedValue(sellerId.toString());
      mockReviewService.createReview.mockRejectedValue(new Error('Rating must be between 1 and 5'));

      // Act & Assert
      await expect(resolver.submitReview(mockCtx, input)).rejects.toThrow(
        'Rating must be between 1 and 5'
      );
    });
  });

  describe('getReviews query', () => {
    it('should return reviews for a product', async () => {
      // Arrange
      const productId = '100';
      const reviews: Review[] = [
        {
          id: '1',
          productId: '100',
          customerId: '5',
          sellerId: 10,
          rating: 5,
          title: 'Great!',
          body: 'Body',
          status: ReviewStatus.APPROVED,
          verified: true,
          helpfulCount: 0,
        } as Review,
        {
          id: '2',
          productId: '100',
          customerId: '6',
          sellerId: 10,
          rating: 4,
          title: 'Good',
          body: 'Body',
          status: ReviewStatus.APPROVED,
          verified: false,
          helpfulCount: 2,
        } as Review,
      ];

      const reviewListResult: ReviewListResult = {
        items: reviews,
        totalItems: 2,
      };

      mockReviewService.getReviews.mockResolvedValue(reviewListResult);

      // Act
      const result = await resolver.getReviews(mockCtx, { productId });

      // Assert
      expect(mockReviewService.getReviews).toHaveBeenCalledWith(mockCtx, {
        productId: '100',
        status: ReviewStatus.APPROVED,
      });
      expect(result.items).toEqual(reviews);
      expect(result.totalItems).toBe(2);
    });

    it('should support pagination', async () => {
      // Arrange
      const productId = '100';
      const reviews: Review[] = [
        {
          id: '1',
          productId: '100',
          customerId: '5',
          sellerId: 10,
          rating: 5,
          title: 'Title',
          body: 'Body',
          status: ReviewStatus.APPROVED,
        } as Review,
      ];

      mockReviewService.getReviews.mockResolvedValue({
        items: reviews,
        totalItems: 10,
      });

      // Act
      const result = await resolver.getReviews(mockCtx, {
        productId,
        skip: 10,
        take: 20,
      });

      // Assert
      expect(mockReviewService.getReviews).toHaveBeenCalledWith(mockCtx, {
        productId: '100',
        status: ReviewStatus.APPROVED,
        skip: 10,
        take: 20,
      });
      expect(result.items).toEqual(reviews);
      expect(result.totalItems).toBe(10);
    });

    it('should filter by status when provided', async () => {
      // Arrange
      const productId = '100';
      const reviews: Review[] = [
        {
          id: '1',
          productId: '100',
          status: ReviewStatus.PENDING,
        } as Review,
      ];

      mockReviewService.getReviews.mockResolvedValue({
        items: reviews,
        totalItems: 1,
      });

      // Act
      const result = await resolver.getReviews(mockCtx, {
        productId,
        status: ReviewStatus.PENDING,
      });

      // Assert
      expect(mockReviewService.getReviews).toHaveBeenCalledWith(mockCtx, {
        productId: '100',
        status: ReviewStatus.PENDING,
      });
      expect(result.items).toEqual(reviews);
    });
  });
});
