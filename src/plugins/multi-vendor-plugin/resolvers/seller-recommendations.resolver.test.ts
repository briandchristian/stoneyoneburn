/**
 * Seller Recommendations Resolver Tests
 *
 * Test-Driven Development (TDD) for Phase 5.3: Seller Recommendations
 *
 * These tests define the expected behavior of SellerRecommendationsResolver:
 * - recommendedSellers query
 * - Limit parameter support
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import type { RequestContext } from '@vendure/core';
import { SellerRecommendationsResolver } from './seller-recommendations.resolver';
import { SellerRecommendationsService } from '../services/seller-recommendations.service';

describe('SellerRecommendationsResolver - Unit Tests', () => {
  let resolver: SellerRecommendationsResolver;
  let mockSellerRecommendationsService: {
    getRecommendedSellers: any;
  };
  let mockCtx: RequestContext;

  beforeEach(() => {
    const getRecommendedSellersMock = jest.fn();

    mockSellerRecommendationsService = {
      getRecommendedSellers: getRecommendedSellersMock,
    };

    resolver = new SellerRecommendationsResolver(
      mockSellerRecommendationsService as unknown as SellerRecommendationsService
    );

    mockCtx = {
      channel: {} as any,
      languageCode: 'en' as any,
      activeUserId: '1',
    } as RequestContext;
  });

  describe('recommendedSellers query', () => {
    it('should return recommended sellers', async () => {
      const mockSellers = [
        {
          id: 1,
          shopName: 'Top Shop',
          shopSlug: 'top-shop',
          rating: { averageRating: 4.8, totalReviews: 50 },
        },
        {
          id: 2,
          shopName: 'Another Shop',
          shopSlug: 'another-shop',
          rating: { averageRating: 4.5, totalReviews: 30 },
        },
      ];

      mockSellerRecommendationsService.getRecommendedSellers.mockResolvedValue(mockSellers);

      const result = await resolver.recommendedSellers(mockCtx, { limit: 5 });

      expect(result).toEqual(mockSellers);
      expect(mockSellerRecommendationsService.getRecommendedSellers).toHaveBeenCalledWith(mockCtx, {
        limit: 5,
      });
    });

    it('should use default limit when not specified', async () => {
      const mockSellers: any[] = [];

      mockSellerRecommendationsService.getRecommendedSellers.mockResolvedValue(mockSellers);

      await resolver.recommendedSellers(mockCtx);

      expect(mockSellerRecommendationsService.getRecommendedSellers).toHaveBeenCalledWith(mockCtx, {
        limit: 10,
      });
    });

    it('should return empty list when no sellers available', async () => {
      mockSellerRecommendationsService.getRecommendedSellers.mockResolvedValue([]);

      const result = await resolver.recommendedSellers(mockCtx, { limit: 5 });

      expect(result).toEqual([]);
    });
  });
});
