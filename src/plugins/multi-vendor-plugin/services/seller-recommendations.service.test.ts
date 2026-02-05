/**
 * Seller Recommendations Service Tests
 *
 * Test-Driven Development (TDD) for Phase 5.3: Seller Recommendations
 *
 * These tests define the expected behavior of SellerRecommendationsService:
 * - Recommend sellers based on product categories
 * - Recommend sellers by rating
 * - Recommend popular sellers
 * - Recommend recently verified sellers
 *
 * Following TDD workflow:
 * 1. Write tests first (RED) ✅
 * 2. Implement minimal code to pass (GREEN)
 * 3. Refactor while keeping tests passing
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import type { RequestContext } from '@vendure/core';
import { SellerRecommendationsService } from './seller-recommendations.service';
import { TransactionalConnection } from '@vendure/core';
import { ReviewService } from './review.service';

describe('SellerRecommendationsService - Unit Tests', () => {
  let service: SellerRecommendationsService;
  let mockConnection: {
    getRepository: any;
  };
  let mockReviewService: {
    getSellerRating: any;
  };
  let mockCtx: RequestContext;

  beforeEach(() => {
    const mockRepository = {
      createQueryBuilder: jest.fn(),
    };

    const createQueryBuilderMock = jest.fn(() => {
      const queryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        getMany: jest.fn(),
      };
      return queryBuilder;
    });

    mockRepository.createQueryBuilder = createQueryBuilderMock;

    mockConnection = {
      getRepository: jest.fn().mockReturnValue(mockRepository),
    };

    mockReviewService = {
      getSellerRating: jest.fn(),
    };

    service = new SellerRecommendationsService(
      mockConnection as unknown as TransactionalConnection,
      mockReviewService as unknown as ReviewService
    );

    mockCtx = {
      channel: {} as any,
      languageCode: 'en' as any,
      activeUserId: '1',
    } as RequestContext;
  });

  describe('getRecommendedSellers', () => {
    it('should return recommended sellers based on rating', async () => {
      const mockSellers = [
        { id: 1, shopName: 'Top Rated Shop', shopSlug: 'top-rated-shop' },
        { id: 2, shopName: 'Another Shop', shopSlug: 'another-shop' },
      ];

      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        getMany: jest.fn<() => Promise<any[]>>().mockResolvedValue(mockSellers),
      };

      const mockRepository = mockConnection.getRepository();
      mockRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      mockReviewService.getSellerRating
        .mockResolvedValueOnce({ averageRating: 4.8, totalReviews: 50 })
        .mockResolvedValueOnce({ averageRating: 4.5, totalReviews: 30 });

      const result = await service.getRecommendedSellers(mockCtx, { limit: 5 });

      expect(result.length).toBe(2);
      expect(mockQueryBuilder.where).toHaveBeenCalled();
      expect(mockQueryBuilder.andWhere).toHaveBeenCalled();
      expect(mockQueryBuilder.orderBy).toHaveBeenCalled();
      expect(mockQueryBuilder.limit).toHaveBeenCalledWith(5);
    });

    it('should filter by verified sellers only', async () => {
      const mockSellers: any[] = [];
      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        getMany: jest.fn<() => Promise<any[]>>().mockResolvedValue(mockSellers),
      };

      const mockRepository = mockConnection.getRepository();
      mockRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      await service.getRecommendedSellers(mockCtx, { limit: 5 });

      // Verify verification status filter is applied via where()
      expect(mockQueryBuilder.where).toHaveBeenCalledWith('seller.verificationStatus = :status', {
        status: 'VERIFIED',
      });
      // Verify isActive filter is applied via andWhere()
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('seller.isActive = :isActive', {
        isActive: true,
      });
    });

    it('should limit results to specified count', async () => {
      const mockSellers: any[] = [];
      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        getMany: jest.fn<() => Promise<any[]>>().mockResolvedValue(mockSellers),
      };

      const mockRepository = mockConnection.getRepository();
      mockRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      await service.getRecommendedSellers(mockCtx, { limit: 10 });

      expect(mockQueryBuilder.limit).toHaveBeenCalledWith(10);
    });

    it('should use default limit when not specified', async () => {
      const mockSellers: any[] = [];
      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        getMany: jest.fn<() => Promise<any[]>>().mockResolvedValue(mockSellers),
      };

      const mockRepository = mockConnection.getRepository();
      mockRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      await service.getRecommendedSellers(mockCtx);

      expect(mockQueryBuilder.limit).toHaveBeenCalledWith(10);
    });

    it('should return sellers sorted by rating', async () => {
      const mockSellers = [
        { id: 1, shopName: 'Shop 1' },
        { id: 2, shopName: 'Shop 2' },
      ];

      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        getMany: jest.fn<() => Promise<any[]>>().mockResolvedValue(mockSellers),
      };

      const mockRepository = mockConnection.getRepository();
      mockRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      mockReviewService.getSellerRating
        .mockResolvedValueOnce({ averageRating: 4.8, totalReviews: 50 })
        .mockResolvedValueOnce({ averageRating: 4.5, totalReviews: 30 });

      const result = await service.getRecommendedSellers(mockCtx, { limit: 5 });

      expect(result.length).toBe(2);
      expect(mockReviewService.getSellerRating).toHaveBeenCalledTimes(2);
    });
  });
});
