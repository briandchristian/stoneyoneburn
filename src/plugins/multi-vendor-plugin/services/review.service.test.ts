/**
 * Review Service Tests
 *
 * Test-Driven Development (TDD) for Phase 4: Reviews & Ratings System
 *
 * These tests define the expected behavior of ReviewService:
 * - Creating reviews with validation
 * - Verifying purchase requirements
 * - Querying reviews with filtering
 * - Moderation (approve/reject)
 * - Seller rating aggregation
 *
 * Following TDD workflow:
 * 1. Write tests first (RED) ✅
 * 2. Implement minimal code to pass (GREEN)
 * 3. Refactor while keeping tests passing
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import type { RequestContext, Order, OrderLine, ProductVariant } from '@vendure/core';
import { TransactionalConnection } from '@vendure/core';
import { ReviewService } from './review.service';
import { Review, ReviewStatus } from '../entities/review.entity';

// Mock TransactionalConnection
jest.mock('@vendure/core', () => {
  const actual = jest.requireActual('@vendure/core') as any;
  return {
    ...actual,
    TransactionalConnection: jest.fn(),
  };
});

/**
 * Test Suite: Review Service
 */
describe('ReviewService', () => {
  let service: ReviewService;
  let mockCtx: RequestContext;
  let mockConnection: jest.Mocked<TransactionalConnection>;
  let mockReviewRepository: any;
  let mockOrderRepository: any;
  let mockProductVariantRepository: any;
  let mockQueryBuilder: any;

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
      getManyAndCount: jest.fn(),
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockReturnThis(),
      getRawMany: jest.fn(),
    };

    // Create mock repositories
    mockReviewRepository = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      find: jest.fn(),
      createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
    };

    mockOrderRepository = {
      find: jest.fn(),
      createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
    };

    mockProductVariantRepository = {
      findOne: jest.fn(),
    };

    // Create mock connection
    mockConnection = {
      getRepository: jest.fn((ctx: RequestContext, entity: any) => {
        if (entity === Review) {
          return mockReviewRepository;
        }
        if (entity.name === 'Order') {
          return mockOrderRepository;
        }
        if (entity.name === 'ProductVariant') {
          return mockProductVariantRepository;
        }
        return mockReviewRepository;
      }),
    } as any;

    // Create service instance with mocked connection
    service = new ReviewService(mockConnection);

    // Create mock request context
    mockCtx = {
      channel: {} as any,
      languageCode: 'en' as const,
    } as RequestContext;
  });

  describe('createReview', () => {
    it('should create a review with valid input', async () => {
      // Arrange
      const input = {
        productId: '100',
        customerId: '5',
        sellerId: 10,
        rating: 5,
        title: 'Great product!',
        body: 'I really enjoyed this product.',
      };

      const savedReview = {
        id: '1',
        ...input,
        status: ReviewStatus.PENDING,
        verified: false,
        helpfulCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockReviewRepository.findOne.mockResolvedValue(null); // No existing review
      mockOrderRepository.find.mockResolvedValue([]); // No orders (not verified)
      mockReviewRepository.save.mockResolvedValue(savedReview);
      mockReviewRepository.create.mockReturnValue(savedReview);

      // Act
      const result = await service.createReview(mockCtx, input);

      // Assert
      expect(result).toEqual(savedReview);
      expect(mockReviewRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          productId: '100',
          customerId: '5',
          sellerId: 10,
          rating: 5,
          title: 'Great product!',
          body: 'I really enjoyed this product.',
          status: ReviewStatus.PENDING,
          verified: false,
          helpfulCount: 0,
        })
      );
      expect(mockReviewRepository.save).toHaveBeenCalled();
    });

    it('should throw error if rating is less than 1', async () => {
      // Arrange
      const input = {
        productId: '100',
        customerId: '5',
        sellerId: 10,
        rating: 0,
        title: 'Bad rating',
        body: 'Invalid rating',
      };

      // Act & Assert
      await expect(service.createReview(mockCtx, input)).rejects.toThrow(
        'Rating must be between 1 and 5'
      );
    });

    it('should throw error if rating is greater than 5', async () => {
      // Arrange
      const input = {
        productId: '100',
        customerId: '5',
        sellerId: 10,
        rating: 6,
        title: 'Bad rating',
        body: 'Invalid rating',
      };

      // Act & Assert
      await expect(service.createReview(mockCtx, input)).rejects.toThrow(
        'Rating must be between 1 and 5'
      );
    });

    it('should throw error if title is empty', async () => {
      // Arrange
      const input = {
        productId: '100',
        customerId: '5',
        sellerId: 10,
        rating: 5,
        title: '',
        body: 'Body text',
      };

      // Act & Assert
      await expect(service.createReview(mockCtx, input)).rejects.toThrow('Title is required');
    });

    it('should throw error if body is empty', async () => {
      // Arrange
      const input = {
        productId: '100',
        customerId: '5',
        sellerId: 10,
        rating: 5,
        title: 'Title',
        body: '',
      };

      // Act & Assert
      await expect(service.createReview(mockCtx, input)).rejects.toThrow('Body is required');
    });

    it('should throw error if customer already reviewed this product', async () => {
      // Arrange
      const input = {
        productId: '100',
        customerId: '5',
        sellerId: 10,
        rating: 5,
        title: 'Title',
        body: 'Body',
      };

      const existingReview = {
        id: '1',
        productId: '100',
        customerId: '5',
      };

      mockReviewRepository.findOne.mockResolvedValue(existingReview);

      // Act & Assert
      await expect(service.createReview(mockCtx, input)).rejects.toThrow(
        'Customer has already reviewed this product'
      );
    });

    it('should set verified=true if customer purchased the product', async () => {
      // Arrange
      const input = {
        productId: '100',
        customerId: '5',
        sellerId: 10,
        rating: 5,
        title: 'Title',
        body: 'Body',
      };

      const mockOrder: Partial<Order> = {
        id: '1',
        customerId: '5',
        state: 'PaymentSettled',
        lines: [
          {
            productVariantId: '200',
            productVariant: {
              id: '200',
              productId: '100',
            } as ProductVariant,
          } as OrderLine,
        ],
      };

      mockReviewRepository.findOne.mockResolvedValue(null); // No existing review
      mockOrderRepository.find.mockResolvedValue([mockOrder]);

      const savedReview = {
        id: '1',
        ...input,
        verified: true,
        status: ReviewStatus.PENDING,
        helpfulCount: 0,
      };

      mockReviewRepository.save.mockResolvedValue(savedReview);
      mockReviewRepository.create.mockReturnValue(savedReview);

      // Act
      const result = await service.createReview(mockCtx, input);

      // Assert
      expect(result.verified).toBe(true);
    });

    it('should set verified=false if customer did not purchase the product', async () => {
      // Arrange
      const input = {
        productId: '100',
        customerId: '5',
        sellerId: 10,
        rating: 5,
        title: 'Title',
        body: 'Body',
      };

      mockReviewRepository.findOne.mockResolvedValue(null); // No existing review
      mockOrderRepository.find.mockResolvedValue([]); // No orders

      const savedReview = {
        id: '1',
        ...input,
        verified: false,
        status: ReviewStatus.PENDING,
        helpfulCount: 0,
      };

      mockReviewRepository.save.mockResolvedValue(savedReview);
      mockReviewRepository.create.mockReturnValue(savedReview);

      // Act
      const result = await service.createReview(mockCtx, input);

      // Assert
      expect(result.verified).toBe(false);
    });
  });

  describe('getReviews', () => {
    it('should return reviews for a product', async () => {
      // Arrange
      const productId = '100';
      const reviews = [
        {
          id: '1',
          productId: '100',
          customerId: '5',
          rating: 5,
          title: 'Great!',
          body: 'Body',
          status: ReviewStatus.APPROVED,
        },
        {
          id: '2',
          productId: '100',
          customerId: '6',
          rating: 4,
          title: 'Good',
          body: 'Body',
          status: ReviewStatus.APPROVED,
        },
      ];

      mockQueryBuilder.getManyAndCount.mockResolvedValue([reviews, 2]);

      // Act
      const result = await service.getReviews(mockCtx, { productId });

      // Assert
      expect(result.items).toEqual(reviews);
      expect(result.totalItems).toBe(2);
      expect(mockQueryBuilder.where).toHaveBeenCalledWith('review.productId = :productId', {
        productId: '100',
      });
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('review.status = :status', {
        status: ReviewStatus.APPROVED,
      });
    });

    it('should filter by status', async () => {
      // Arrange
      const productId = '100';
      const reviews = [
        {
          id: '1',
          productId: '100',
          status: ReviewStatus.PENDING,
        },
      ];

      mockQueryBuilder.getManyAndCount.mockResolvedValue([reviews, 1]);

      // Act
      const result = await service.getReviews(mockCtx, {
        productId,
        status: ReviewStatus.PENDING,
      });

      // Assert
      expect(result.items).toEqual(reviews);
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('review.status = :status', {
        status: ReviewStatus.PENDING,
      });
    });

    it('should support pagination', async () => {
      // Arrange
      const productId = '100';
      const reviews = [{ id: '1', productId: '100' }];

      mockQueryBuilder.getManyAndCount.mockResolvedValue([reviews, 10]);

      // Act
      const result = await service.getReviews(mockCtx, {
        productId,
        skip: 10,
        take: 20,
      });

      // Assert
      expect(result.items).toEqual(reviews);
      expect(mockQueryBuilder.skip).toHaveBeenCalledWith(10);
      expect(mockQueryBuilder.take).toHaveBeenCalledWith(20);
    });
  });

  describe('approveReview', () => {
    it('should approve a pending review', async () => {
      // Arrange
      const reviewId = '1';
      const review = {
        id: '1',
        status: ReviewStatus.PENDING,
        productId: '100',
        customerId: '5',
        rating: 5,
        title: 'Title',
        body: 'Body',
      };

      mockReviewRepository.findOne.mockResolvedValue(review);
      mockReviewRepository.save.mockResolvedValue({
        ...review,
        status: ReviewStatus.APPROVED,
      });

      // Act
      const result = await service.approveReview(mockCtx, reviewId);

      // Assert
      expect(result.status).toBe(ReviewStatus.APPROVED);
      expect(review.status).toBe(ReviewStatus.APPROVED);
      expect(mockReviewRepository.save).toHaveBeenCalled();
    });

    it('should throw error if review not found', async () => {
      // Arrange
      const reviewId = '999';
      mockReviewRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.approveReview(mockCtx, reviewId)).rejects.toThrow('Review not found');
    });
  });

  describe('rejectReview', () => {
    it('should reject a review with reason', async () => {
      // Arrange
      const reviewId = '1';
      const rejectionReason = 'Spam detected';
      const review = {
        id: '1',
        status: ReviewStatus.PENDING,
        productId: '100',
        customerId: '5',
        rating: 5,
        title: 'Title',
        body: 'Body',
      };

      mockReviewRepository.findOne.mockResolvedValue(review);
      mockReviewRepository.save.mockResolvedValue({
        ...review,
        status: ReviewStatus.REJECTED,
        rejectionReason,
      });

      // Act
      const result = await service.rejectReview(mockCtx, reviewId, rejectionReason);

      // Assert
      expect(result.status).toBe(ReviewStatus.REJECTED);
      expect(result.rejectionReason).toBe(rejectionReason);
      expect(mockReviewRepository.save).toHaveBeenCalled();
    });

    it('should throw error if review not found', async () => {
      // Arrange
      const reviewId = '999';
      mockReviewRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.rejectReview(mockCtx, reviewId, 'Reason')).rejects.toThrow(
        'Review not found'
      );
    });
  });

  describe('getSellerRating', () => {
    it('should calculate average rating for a seller', async () => {
      // Arrange
      const sellerId = 10;
      const mockResult = [
        {
          averageRating: 4.5,
          totalReviews: 10,
        },
      ];

      mockQueryBuilder.getRawMany.mockResolvedValue(mockResult);

      // Act
      const result = await service.getSellerRating(mockCtx, sellerId);

      // Assert
      expect(result.averageRating).toBe(4.5);
      expect(result.totalReviews).toBe(10);
      expect(mockQueryBuilder.where).toHaveBeenCalledWith('review.sellerId = :sellerId', {
        sellerId: 10,
      });
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('review.status = :status', {
        status: ReviewStatus.APPROVED,
      });
    });

    it('should return zero rating if no reviews exist', async () => {
      // Arrange
      const sellerId = 10;
      mockQueryBuilder.getRawMany.mockResolvedValue([]);

      // Act
      const result = await service.getSellerRating(mockCtx, sellerId);

      // Assert
      expect(result.averageRating).toBe(0);
      expect(result.totalReviews).toBe(0);
    });
  });
});
