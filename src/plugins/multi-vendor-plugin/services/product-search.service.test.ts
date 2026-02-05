/**
 * Product Search Service Tests
 *
 * Test-Driven Development (TDD) for Phase 5.3: Search & Discovery
 *
 * These tests define the expected behavior of ProductSearchService:
 * - Filtering products by seller ID
 * - Searching products by term with seller filter
 * - Combining seller filter with other filters
 *
 * Following TDD workflow:
 * 1. Write tests first (RED) ✅
 * 2. Implement minimal code to pass (GREEN)
 * 3. Refactor while keeping tests passing
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import type { RequestContext, Product } from '@vendure/core';
import { TransactionalConnection } from '@vendure/core';
import { ProductSearchService } from './product-search.service';

// Mock TransactionalConnection
jest.mock('@vendure/core', () => {
  const actual = jest.requireActual('@vendure/core') as any;
  return {
    ...actual,
    TransactionalConnection: jest.fn(),
  };
});

/**
 * Test Suite: Product Search Service
 */
describe('ProductSearchService', () => {
  let service: ProductSearchService;
  let mockCtx: RequestContext;
  let mockConnection: jest.Mocked<TransactionalConnection>;
  let mockProductRepository: any;
  let mockQueryBuilder: any;

  beforeEach(() => {
    // Create mock query builder
    mockQueryBuilder = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn(),
    };

    // Create mock product repository
    mockProductRepository = {
      createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
    };

    // Create mock connection
    mockConnection = {
      getRepository: jest.fn().mockReturnValue(mockProductRepository),
    } as any;

    // Create service instance
    service = new ProductSearchService(mockConnection);

    // Create mock request context (channelId required for price filter)
    mockCtx = {
      channel: {} as any,
      channelId: 1,
      languageCode: 'en' as any,
      activeUserId: '1',
    } as RequestContext;
  });

  describe('filterProductsBySeller', () => {
    it('should return products filtered by seller ID', async () => {
      const sellerId = '1';
      const mockProducts: Product[] = [
        { id: '1', name: 'Product 1' } as Product,
        { id: '2', name: 'Product 2' } as Product,
      ];

      mockQueryBuilder.getManyAndCount.mockResolvedValue([mockProducts, 2]);

      const result = await service.filterProductsBySeller(mockCtx, sellerId, {
        skip: 0,
        take: 10,
      });

      expect(result.items).toEqual(mockProducts);
      expect(result.totalItems).toBe(2);
      expect(mockProductRepository.createQueryBuilder).toHaveBeenCalledWith('product');
      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        'product.customFieldsSellerid = :sellerId',
        { sellerId: 1 }
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('product.enabled = :enabled', {
        enabled: true,
      });
    });

    it('should support pagination', async () => {
      const sellerId = '1';
      const mockProducts: Product[] = [];

      mockQueryBuilder.getManyAndCount.mockResolvedValue([mockProducts, 0]);

      await service.filterProductsBySeller(mockCtx, sellerId, { skip: 20, take: 5 });

      expect(mockQueryBuilder.skip).toHaveBeenCalledWith(20);
      expect(mockQueryBuilder.take).toHaveBeenCalledWith(5);
    });

    it('should only return enabled products', async () => {
      const sellerId = '1';
      const mockProducts: Product[] = [];

      mockQueryBuilder.getManyAndCount.mockResolvedValue([mockProducts, 0]);

      await service.filterProductsBySeller(mockCtx, sellerId, { skip: 0, take: 10 });

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('product.enabled = :enabled', {
        enabled: true,
      });
    });
  });

  describe('searchProductsBySeller', () => {
    it('should search products by term and filter by seller', async () => {
      const sellerId = '1';
      const searchTerm = 'widget';
      const mockProducts: Product[] = [{ id: '1', name: 'Widget Product' } as Product];

      mockQueryBuilder.getManyAndCount.mockResolvedValue([mockProducts, 1]);

      const result = await service.searchProductsBySeller(mockCtx, sellerId, searchTerm, {
        skip: 0,
        take: 10,
      });

      expect(result.items).toEqual(mockProducts);
      expect(result.totalItems).toBe(1);
      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        'product.customFieldsSellerid = :sellerId',
        { sellerId: 1 }
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('product.enabled = :enabled', {
        enabled: true,
      });
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        '(product.name ILIKE :searchTerm OR product.description ILIKE :searchTerm)',
        { searchTerm: '%widget%' }
      );
    });

    it('should return empty list when no products match search term', async () => {
      const sellerId = '1';
      const searchTerm = 'nonexistent';

      mockQueryBuilder.getManyAndCount.mockResolvedValue([[], 0]);

      const result = await service.searchProductsBySeller(mockCtx, sellerId, searchTerm, {
        skip: 0,
        take: 10,
      });

      expect(result.items).toEqual([]);
      expect(result.totalItems).toBe(0);
    });

    it('should support pagination in search', async () => {
      const sellerId = '1';
      const searchTerm = 'widget';

      mockQueryBuilder.getManyAndCount.mockResolvedValue([[], 0]);

      await service.searchProductsBySeller(mockCtx, sellerId, searchTerm, { skip: 10, take: 5 });

      expect(mockQueryBuilder.skip).toHaveBeenCalledWith(10);
      expect(mockQueryBuilder.take).toHaveBeenCalledWith(5);
    });
  });

  describe('filterProductsBySeller - price range (Phase 5.3 advanced filters)', () => {
    it('should filter by minPrice when specified', async () => {
      const sellerId = '1';
      const mockProducts: Product[] = [];

      mockQueryBuilder.getManyAndCount.mockResolvedValue([mockProducts, 0]);

      await service.filterProductsBySeller(mockCtx, sellerId, {
        skip: 0,
        take: 10,
        minPrice: 1000,
      });

      const priceCall = mockQueryBuilder.andWhere.mock.calls.find(
        (call: unknown[]) =>
          typeof call[0] === 'string' && (call[0] as string).toLowerCase().includes('price')
      );
      expect(priceCall).toBeDefined();
    });

    it('should filter by maxPrice when specified', async () => {
      const sellerId = '1';
      const mockProducts: Product[] = [];

      mockQueryBuilder.getManyAndCount.mockResolvedValue([mockProducts, 0]);

      await service.filterProductsBySeller(mockCtx, sellerId, {
        skip: 0,
        take: 10,
        maxPrice: 5000,
      });

      const priceCall = mockQueryBuilder.andWhere.mock.calls.find(
        (call: unknown[]) =>
          typeof call[0] === 'string' && (call[0] as string).toLowerCase().includes('price')
      );
      expect(priceCall).toBeDefined();
    });

    it('should not add price filter when neither minPrice nor maxPrice specified', async () => {
      const sellerId = '1';
      const mockProducts: Product[] = [{ id: '1', name: 'Product 1' } as Product];

      mockQueryBuilder.getManyAndCount.mockResolvedValue([mockProducts, 1]);

      await service.filterProductsBySeller(mockCtx, sellerId, { skip: 0, take: 10 });

      const priceCall = mockQueryBuilder.andWhere.mock.calls.find(
        (call: unknown[]) =>
          typeof call[0] === 'string' && (call[0] as string).toLowerCase().includes('price')
      );
      expect(priceCall).toBeUndefined();
    });
  });
});
