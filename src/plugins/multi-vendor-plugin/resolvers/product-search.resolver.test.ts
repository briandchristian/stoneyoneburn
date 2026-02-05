/**
 * Product Search Resolver Tests
 *
 * Test-Driven Development (TDD) for Phase 5.3: Search & Discovery
 *
 * These tests define the expected behavior of ProductSearchResolver:
 * - productsBySeller query (filter products by seller)
 * - searchBySeller query (search products by term and seller)
 *
 * Following TDD workflow:
 * 1. Write tests first (RED) ✅
 * 2. Implement minimal code to pass (GREEN)
 * 3. Refactor while keeping tests passing
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import type { RequestContext, Product } from '@vendure/core';
import { ProductSearchResolver } from './product-search.resolver';
import { ProductSearchService } from '../services/product-search.service';

/**
 * Test Suite: Product Search Resolver
 */
describe('ProductSearchResolver - Unit Tests', () => {
  let resolver: ProductSearchResolver;
  let mockProductSearchService: {
    filterProductsBySeller: any;
    searchProductsBySeller: any;
  };
  let mockCtx: RequestContext;

  beforeEach(() => {
    // Create mock product search service
    const filterProductsBySellerMock = jest.fn();
    const searchProductsBySellerMock = jest.fn();

    mockProductSearchService = {
      filterProductsBySeller: filterProductsBySellerMock,
      searchProductsBySeller: searchProductsBySellerMock,
    };

    resolver = new ProductSearchResolver(
      mockProductSearchService as unknown as ProductSearchService
    );

    // Create mock request context
    mockCtx = {
      channel: {} as any,
      languageCode: 'en' as any,
      activeUserId: '1',
    } as RequestContext;
  });

  describe('productsBySeller query', () => {
    it('should return products filtered by seller ID', async () => {
      const sellerId = '1';
      const mockProducts: Product[] = [
        { id: '1', name: 'Product 1' } as Product,
        { id: '2', name: 'Product 2' } as Product,
      ];

      mockProductSearchService.filterProductsBySeller.mockResolvedValue({
        items: mockProducts,
        totalItems: 2,
      });

      const result = await resolver.productsBySeller(mockCtx, sellerId, { skip: 0, take: 10 });

      expect(result.items).toEqual(mockProducts);
      expect(result.totalItems).toBe(2);
      expect(mockProductSearchService.filterProductsBySeller).toHaveBeenCalledWith(
        mockCtx,
        sellerId,
        { skip: 0, take: 10 }
      );
    });

    it('should support pagination', async () => {
      const sellerId = '1';
      const mockProducts: Product[] = [];

      mockProductSearchService.filterProductsBySeller.mockResolvedValue({
        items: mockProducts,
        totalItems: 0,
      });

      await resolver.productsBySeller(mockCtx, sellerId, { skip: 20, take: 5 });

      expect(mockProductSearchService.filterProductsBySeller).toHaveBeenCalledWith(
        mockCtx,
        sellerId,
        { skip: 20, take: 5 }
      );
    });

    it('should return empty list when seller has no products', async () => {
      const sellerId = '1';

      mockProductSearchService.filterProductsBySeller.mockResolvedValue({
        items: [],
        totalItems: 0,
      });

      const result = await resolver.productsBySeller(mockCtx, sellerId, { skip: 0, take: 10 });

      expect(result.items).toEqual([]);
      expect(result.totalItems).toBe(0);
    });
  });

  describe('searchBySeller query', () => {
    it('should search products by term and filter by seller', async () => {
      const sellerId = '1';
      const searchTerm = 'widget';
      const mockProducts: Product[] = [{ id: '1', name: 'Widget Product' } as Product];

      mockProductSearchService.searchProductsBySeller.mockResolvedValue({
        items: mockProducts,
        totalItems: 1,
      });

      const result = await resolver.searchBySeller(mockCtx, sellerId, searchTerm, {
        skip: 0,
        take: 10,
      });

      expect(result.items).toEqual(mockProducts);
      expect(result.totalItems).toBe(1);
      expect(mockProductSearchService.searchProductsBySeller).toHaveBeenCalledWith(
        mockCtx,
        sellerId,
        searchTerm,
        { skip: 0, take: 10 }
      );
    });

    it('should return empty list when no products match search term', async () => {
      const sellerId = '1';
      const searchTerm = 'nonexistent';

      mockProductSearchService.searchProductsBySeller.mockResolvedValue({
        items: [],
        totalItems: 0,
      });

      const result = await resolver.searchBySeller(mockCtx, sellerId, searchTerm, {
        skip: 0,
        take: 10,
      });

      expect(result.items).toEqual([]);
      expect(result.totalItems).toBe(0);
    });

    it('should support pagination in search', async () => {
      const sellerId = '1';
      const searchTerm = 'widget';

      mockProductSearchService.searchProductsBySeller.mockResolvedValue({
        items: [],
        totalItems: 0,
      });

      await resolver.searchBySeller(mockCtx, sellerId, searchTerm, { skip: 10, take: 5 });

      expect(mockProductSearchService.searchProductsBySeller).toHaveBeenCalledWith(
        mockCtx,
        sellerId,
        searchTerm,
        { skip: 10, take: 5 }
      );
    });
  });
});
