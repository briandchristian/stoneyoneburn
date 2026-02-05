/**
 * Shop Search Resolver Tests
 *
 * Test-Driven Development (TDD) for Phase 5.1: Shop Search Functionality
 *
 * These tests define the expected behavior of ShopSearchResolver:
 * - searchShops query (search shops by term)
 * - Pagination support
 * - Filtering by verification status
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import type { RequestContext } from '@vendure/core';
import { ShopSearchResolver } from './shop-search.resolver';
import { ShopSearchService } from '../services/shop-search.service';

describe('ShopSearchResolver - Unit Tests', () => {
  let resolver: ShopSearchResolver;
  let mockShopSearchService: {
    searchShops: any;
  };
  let mockCtx: RequestContext;

  beforeEach(() => {
    const searchShopsMock = jest.fn();

    mockShopSearchService = {
      searchShops: searchShopsMock,
    };

    resolver = new ShopSearchResolver(mockShopSearchService as unknown as ShopSearchService);

    mockCtx = {
      channel: {} as any,
      languageCode: 'en' as any,
      activeUserId: '1',
    } as RequestContext;
  });

  describe('searchShops query', () => {
    it('should return shops matching search term', async () => {
      const searchTerm = 'test shop';
      const mockResult = {
        items: [
          {
            id: 1,
            shopName: 'Test Shop',
            shopSlug: 'test-shop',
            shopDescription: 'A test shop',
          },
        ],
        totalItems: 1,
      };

      mockShopSearchService.searchShops.mockResolvedValue(mockResult);

      const result = await resolver.searchShops(mockCtx, searchTerm, { skip: 0, take: 10 });

      expect(result).toEqual(mockResult);
      expect(mockShopSearchService.searchShops).toHaveBeenCalledWith(mockCtx, searchTerm, {
        skip: 0,
        take: 10,
        verifiedOnly: false,
      });
    });

    it('should support pagination', async () => {
      const searchTerm = 'shop';
      const mockResult = {
        items: [],
        totalItems: 0,
      };

      mockShopSearchService.searchShops.mockResolvedValue(mockResult);

      await resolver.searchShops(mockCtx, searchTerm, { skip: 20, take: 5 });

      expect(mockShopSearchService.searchShops).toHaveBeenCalledWith(mockCtx, searchTerm, {
        skip: 20,
        take: 5,
        verifiedOnly: false,
      });
    });

    it('should filter by verification status when requested', async () => {
      const searchTerm = 'shop';
      const mockResult = {
        items: [],
        totalItems: 0,
      };

      mockShopSearchService.searchShops.mockResolvedValue(mockResult);

      await resolver.searchShops(mockCtx, searchTerm, { skip: 0, take: 10, verifiedOnly: true });

      expect(mockShopSearchService.searchShops).toHaveBeenCalledWith(mockCtx, searchTerm, {
        skip: 0,
        take: 10,
        verifiedOnly: true,
      });
    });

    it('should return empty list when no shops match', async () => {
      const searchTerm = 'nonexistent';
      const mockResult = {
        items: [],
        totalItems: 0,
      };

      mockShopSearchService.searchShops.mockResolvedValue(mockResult);

      const result = await resolver.searchShops(mockCtx, searchTerm, { skip: 0, take: 10 });

      expect(result.items).toEqual([]);
      expect(result.totalItems).toBe(0);
    });

    it('should use default pagination when options not provided', async () => {
      const searchTerm = 'shop';
      const mockResult = {
        items: [],
        totalItems: 0,
      };

      mockShopSearchService.searchShops.mockResolvedValue(mockResult);

      await resolver.searchShops(mockCtx, searchTerm);

      expect(mockShopSearchService.searchShops).toHaveBeenCalledWith(mockCtx, searchTerm, {
        skip: 0,
        take: 25,
        verifiedOnly: false,
      });
    });
  });
});
