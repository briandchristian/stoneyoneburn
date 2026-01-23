/**
 * Seller Product Resolver Unit Tests
 *
 * Test-Driven Development (TDD) for Phase 2.3: Seller-Product Association
 *
 * These are actual unit tests with mocks that test the implementation.
 * Following TDD workflow:
 * 1. Write tests first (RED) ✅
 * 2. Implement minimal code to pass (GREEN)
 * 3. Refactor while keeping tests passing
 *
 * These tests verify:
 * - Pagination support (skip, take)
 * - Sorting support (name, createdAt)
 * - Filtering support (enabled status)
 * - ProductList return type with items and totalItems
 * - Seller filtering (products filtered by sellerId)
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import type { RequestContext, ID, ProductListOptions, ProductList } from '@vendure/core';
import { Product } from '@vendure/core';
import { SellerProductResolver } from './seller-product.resolver';
import { TransactionalConnection } from '@vendure/core';

// Mock TransactionalConnection
jest.mock('@vendure/core', () => {
  const actual = jest.requireActual('@vendure/core');
  return {
    ...actual,
    TransactionalConnection: jest.fn(),
  };
});

describe('SellerProductResolver - Unit Tests', () => {
  let resolver: SellerProductResolver;
  let mockConnection: jest.Mocked<TransactionalConnection>;
  let mockCtx: RequestContext;
  let mockQueryBuilder: any;
  let mockRepository: any;

  beforeEach(() => {
    // Create mock query builder
    mockQueryBuilder = {
      where: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getMany: jest.fn(),
      getCount: jest.fn(),
    };

    // Create mock repository
    mockRepository = {
      createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
    };

    // Create mock connection
    mockConnection = {
      getRepository: jest.fn().mockReturnValue(mockRepository),
    } as any;

    // Create resolver instance
    resolver = new SellerProductResolver(mockConnection);

    // Create mock request context
    mockCtx = {
      channel: {} as any,
      languageCode: 'en' as const,
    } as RequestContext;
  });

  describe('sellerProducts - Pagination Support', () => {
    it('should support skip and take for pagination', async () => {
      // Arrange: Setup mock to return products
      const mockProducts = [
        { id: '1', name: 'Product 1', enabled: true },
        { id: '2', name: 'Product 2', enabled: true },
      ];
      mockQueryBuilder.getMany.mockResolvedValue(mockProducts);
      mockQueryBuilder.getCount.mockResolvedValue(10); // Total items

      const sellerId = '10';
      const options: ProductListOptions = {
        skip: 5,
        take: 2,
      };

      // Act: Call resolver (this will fail initially - RED)
      const result = await resolver.sellerProducts(mockCtx, sellerId, options);

      // Assert: Verify pagination was applied
      expect(mockQueryBuilder.skip).toHaveBeenCalledWith(5);
      expect(mockQueryBuilder.take).toHaveBeenCalledWith(2);
      expect(result.items).toHaveLength(2);
      expect(result.totalItems).toBe(10);
    });

    it('should return ProductList type with items and totalItems', async () => {
      // Arrange
      const mockProducts = [
        { id: '1', name: 'Product 1', enabled: true },
      ];
      mockQueryBuilder.getMany.mockResolvedValue(mockProducts);
      mockQueryBuilder.getCount.mockResolvedValue(1);

      const sellerId = '10';

      // Act
      const result = await resolver.sellerProducts(mockCtx, sellerId);

      // Assert: Verify return type is ProductList
      expect(result).toHaveProperty('items');
      expect(result).toHaveProperty('totalItems');
      expect(Array.isArray(result.items)).toBe(true);
      expect(typeof result.totalItems).toBe('number');
    });

    it('should default to no pagination when options not provided', async () => {
      // Arrange
      const mockProducts = [
        { id: '1', name: 'Product 1', enabled: true },
        { id: '2', name: 'Product 2', enabled: true },
      ];
      mockQueryBuilder.getMany.mockResolvedValue(mockProducts);
      mockQueryBuilder.getCount.mockResolvedValue(2);

      const sellerId = '10';

      // Act
      const result = await resolver.sellerProducts(mockCtx, sellerId);

      // Assert: Should not call skip/take when options not provided
      expect(mockQueryBuilder.skip).not.toHaveBeenCalled();
      expect(mockQueryBuilder.take).not.toHaveBeenCalled();
      expect(result.items).toHaveLength(2);
      expect(result.totalItems).toBe(2);
    });
  });

  describe('sellerProducts - Sorting Support', () => {
    it('should support sorting by name ASC', async () => {
      // Arrange
      const mockProducts = [
        { id: '1', name: 'A Product', enabled: true },
        { id: '2', name: 'B Product', enabled: true },
      ];
      mockQueryBuilder.getMany.mockResolvedValue(mockProducts);
      mockQueryBuilder.getCount.mockResolvedValue(2);

      const sellerId = '10';
      const options: ProductListOptions = {
        sort: { name: 'ASC' },
      };

      // Act
      await resolver.sellerProducts(mockCtx, sellerId, options);

      // Assert: Verify sorting was applied
      expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith('product.name', 'ASC');
    });

    it('should support sorting by name DESC', async () => {
      // Arrange
      const mockProducts = [
        { id: '1', name: 'B Product', enabled: true },
        { id: '2', name: 'A Product', enabled: true },
      ];
      mockQueryBuilder.getMany.mockResolvedValue(mockProducts);
      mockQueryBuilder.getCount.mockResolvedValue(2);

      const sellerId = '10';
      const options: ProductListOptions = {
        sort: { name: 'DESC' },
      };

      // Act
      await resolver.sellerProducts(mockCtx, sellerId, options);

      // Assert
      expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith('product.name', 'DESC');
    });

    it('should support sorting by createdAt DESC', async () => {
      // Arrange
      const mockProducts = [
        { id: '1', name: 'Product 1', enabled: true, createdAt: new Date('2024-01-02') },
        { id: '2', name: 'Product 2', enabled: true, createdAt: new Date('2024-01-01') },
      ];
      mockQueryBuilder.getMany.mockResolvedValue(mockProducts);
      mockQueryBuilder.getCount.mockResolvedValue(2);

      const sellerId = '10';
      const options: ProductListOptions = {
        sort: { createdAt: 'DESC' },
      };

      // Act
      await resolver.sellerProducts(mockCtx, sellerId, options);

      // Assert
      expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith('product.createdAt', 'DESC');
    });
  });

  describe('sellerProducts - Filtering Support', () => {
    it('should filter products by enabled status (true)', async () => {
      // Arrange
      const mockProducts = [
        { id: '1', name: 'Product 1', enabled: true },
      ];
      mockQueryBuilder.getMany.mockResolvedValue(mockProducts);
      mockQueryBuilder.getCount.mockResolvedValue(1);

      const sellerId = '10';
      const options: ProductListOptions = {
        filter: { enabled: { eq: true } },
      };

      // Act
      await resolver.sellerProducts(mockCtx, sellerId, options);

      // Assert: Verify filtering was applied
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('product.enabled = :enabled', { enabled: true });
    });

    it('should filter products by enabled status (false)', async () => {
      // Arrange
      const mockProducts: Product[] = [];
      mockQueryBuilder.getMany.mockResolvedValue(mockProducts);
      mockQueryBuilder.getCount.mockResolvedValue(0);

      const sellerId = '10';
      const options: ProductListOptions = {
        filter: { enabled: { eq: false } },
      };

      // Act
      await resolver.sellerProducts(mockCtx, sellerId, options);

      // Assert
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('product.enabled = :enabled', { enabled: false });
    });
  });

  describe('sellerProducts - Seller Filtering', () => {
    it('should filter products by sellerId', async () => {
      // Arrange
      const mockProducts = [
        { id: '1', name: 'Product 1', enabled: true },
      ];
      mockQueryBuilder.getMany.mockResolvedValue(mockProducts);
      mockQueryBuilder.getCount.mockResolvedValue(1);

      const sellerId = '10';

      // Act
      await resolver.sellerProducts(mockCtx, sellerId);

      // Assert: Verify seller filtering was applied
      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        'product.customFieldsSellerid = :sellerId',
        { sellerId: 10 }
      );
    });

    it('should only return products belonging to the specified seller', async () => {
      // Arrange
      const mockProducts = [
        { id: '1', name: 'Product 1', enabled: true, customFields: { sellerId: '10' } },
        { id: '2', name: 'Product 2', enabled: true, customFields: { sellerId: '10' } },
      ];
      mockQueryBuilder.getMany.mockResolvedValue(mockProducts);
      mockQueryBuilder.getCount.mockResolvedValue(2);

      const sellerId = '10';

      // Act
      const result = await resolver.sellerProducts(mockCtx, sellerId);

      // Assert: All products should belong to seller 10
      result.items.forEach((product) => {
        expect((product as any).customFields?.sellerId).toBe('10');
      });
    });
  });

  describe('sellerProducts - Edge Cases', () => {
    it('should return empty list when seller has no products', async () => {
      // Arrange
      mockQueryBuilder.getMany.mockResolvedValue([]);
      mockQueryBuilder.getCount.mockResolvedValue(0);

      const sellerId = '10';

      // Act
      const result = await resolver.sellerProducts(mockCtx, sellerId);

      // Assert
      expect(result.items).toHaveLength(0);
      expect(result.totalItems).toBe(0);
    });

    it('should handle pagination beyond available items', async () => {
      // Arrange
      mockQueryBuilder.getMany.mockResolvedValue([]);
      mockQueryBuilder.getCount.mockResolvedValue(5);

      const sellerId = '10';
      const options: ProductListOptions = {
        skip: 10,
        take: 5,
      };

      // Act
      const result = await resolver.sellerProducts(mockCtx, sellerId, options);

      // Assert: Should return empty items but correct totalItems
      expect(result.items).toHaveLength(0);
      expect(result.totalItems).toBe(5);
    });
  });
});
