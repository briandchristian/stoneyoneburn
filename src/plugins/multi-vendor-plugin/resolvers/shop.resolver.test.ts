/**
 * Shop Resolver Tests
 *
 * Test-Driven Development (TDD) for Phase 5.1: Seller Shop Pages
 *
 * These tests define the expected behavior of ShopResolver:
 * - shop query (get shop by slug)
 * - shopProducts query (get products for a shop)
 * - updateShopCustomization mutation
 *
 * Following TDD workflow:
 * 1. Write tests first (RED) ✅
 * 2. Implement minimal code to pass (GREEN)
 * 3. Refactor while keeping tests passing
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import type { RequestContext, Product } from '@vendure/core';
import { ShopResolver } from './shop.resolver';
import { ShopService } from '../services/shop.service';
import { SellerService } from '../services/seller.service';
import { CustomerService } from '@vendure/core';
import { MarketplaceSeller } from '../entities/seller.entity';

/**
 * Test Suite: Shop Resolver
 */
describe('ShopResolver - Unit Tests', () => {
  let resolver: ShopResolver;
  let mockShopService: {
    getShopBySlug: any;
    getShopProducts: any;
    updateShopCustomization: any;
  };
  let mockSellerService: {
    findSellerByCustomerId: any;
  };
  let mockCustomerService: {
    findOneByUserId: any;
  };
  let mockCtx: RequestContext;

  beforeEach(() => {
    // Create mock shop service
    const getShopBySlugMock = jest.fn();
    const getShopProductsMock = jest.fn();
    const updateShopCustomizationMock = jest.fn();

    mockShopService = {
      getShopBySlug: getShopBySlugMock,
      getShopProducts: getShopProductsMock,
      updateShopCustomization: updateShopCustomizationMock,
    };

    // Create mock seller service
    const findSellerByCustomerIdMock = jest.fn();
    mockSellerService = {
      findSellerByCustomerId: findSellerByCustomerIdMock,
    };

    // Create mock customer service
    const findOneByUserIdMock = jest.fn();
    mockCustomerService = {
      findOneByUserId: findOneByUserIdMock,
    };

    resolver = new ShopResolver(
      mockShopService as unknown as ShopService,
      mockSellerService as unknown as SellerService,
      mockCustomerService as unknown as CustomerService
    );

    // Create mock request context
    mockCtx = {
      channel: {} as any,
      languageCode: 'en' as any,
      activeUserId: '1',
    } as RequestContext;
  });

  describe('shop query', () => {
    it('should return shop when slug exists', async () => {
      const mockSeller: MarketplaceSeller = {
        id: '1',
        shopName: 'Test Shop',
        shopSlug: 'test-shop',
        shopDescription: 'A test shop',
        customerId: '1',
        verificationStatus: 'VERIFIED' as any,
        isActive: true,
        commissionRate: 10,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as MarketplaceSeller;

      mockShopService.getShopBySlug.mockResolvedValue(mockSeller);

      const result = await resolver.shop(mockCtx, 'test-shop');

      expect(result).toEqual(mockSeller);
      expect(mockShopService.getShopBySlug).toHaveBeenCalledWith(mockCtx, 'test-shop');
    });

    it('should return null when slug does not exist', async () => {
      mockShopService.getShopBySlug.mockResolvedValue(null);

      const result = await resolver.shop(mockCtx, 'non-existent-shop');

      expect(result).toBeNull();
      expect(mockShopService.getShopBySlug).toHaveBeenCalledWith(mockCtx, 'non-existent-shop');
    });
  });

  describe('shopProducts query', () => {
    it('should return products for a shop with pagination', async () => {
      const shopSlug = 'test-shop';
      const mockSeller: MarketplaceSeller = {
        id: '1',
        shopName: 'Test Shop',
        shopSlug,
        customerId: '1',
        verificationStatus: 'VERIFIED' as any,
        isActive: true,
        commissionRate: 10,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as MarketplaceSeller;

      const mockProducts: Product[] = [
        { id: '1', name: 'Product 1' } as Product,
        { id: '2', name: 'Product 2' } as Product,
      ];

      mockShopService.getShopBySlug.mockResolvedValue(mockSeller);
      mockShopService.getShopProducts.mockResolvedValue({
        items: mockProducts,
        totalItems: 2,
      });

      const result = await resolver.shopProducts(mockCtx, shopSlug, { skip: 0, take: 10 });

      expect(result.items).toEqual(mockProducts);
      expect(result.totalItems).toBe(2);
      expect(mockShopService.getShopBySlug).toHaveBeenCalledWith(mockCtx, shopSlug);
      expect(mockShopService.getShopProducts).toHaveBeenCalledWith(mockCtx, '1', {
        skip: 0,
        take: 10,
      });
    });

    it('should return empty list when shop has no products', async () => {
      const shopSlug = 'test-shop';
      const mockSeller: MarketplaceSeller = {
        id: '1',
        shopName: 'Test Shop',
        shopSlug,
        customerId: '1',
        verificationStatus: 'VERIFIED' as any,
        isActive: true,
        commissionRate: 10,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as MarketplaceSeller;

      mockShopService.getShopBySlug.mockResolvedValue(mockSeller);
      mockShopService.getShopProducts.mockResolvedValue({
        items: [],
        totalItems: 0,
      });

      const result = await resolver.shopProducts(mockCtx, shopSlug, { skip: 0, take: 10 });

      expect(result.items).toEqual([]);
      expect(result.totalItems).toBe(0);
    });

    it('should throw error when shop does not exist', async () => {
      const shopSlug = 'non-existent-shop';

      mockShopService.getShopBySlug.mockResolvedValue(null);

      await expect(resolver.shopProducts(mockCtx, shopSlug, { skip: 0, take: 10 })).rejects.toThrow(
        'Shop not found'
      );
    });

    it('should support custom pagination', async () => {
      const shopSlug = 'test-shop';
      const mockSeller: MarketplaceSeller = {
        id: '1',
        shopName: 'Test Shop',
        shopSlug,
        customerId: '1',
        verificationStatus: 'VERIFIED' as any,
        isActive: true,
        commissionRate: 10,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as MarketplaceSeller;

      mockShopService.getShopBySlug.mockResolvedValue(mockSeller);
      mockShopService.getShopProducts.mockResolvedValue({
        items: [],
        totalItems: 0,
      });

      await resolver.shopProducts(mockCtx, shopSlug, { skip: 20, take: 5 });

      expect(mockShopService.getShopProducts).toHaveBeenCalledWith(mockCtx, '1', {
        skip: 20,
        take: 5,
      });
    });
  });

  describe('updateShopCustomization mutation', () => {
    it('should allow seller to update shop customization', async () => {
      const sellerId = '1';
      const mockCustomer = { id: '1' } as any;
      const mockSeller: MarketplaceSeller = {
        id: sellerId,
        shopName: 'Test Shop',
        shopSlug: 'test-shop',
        shopDescription: 'Old description',
        customerId: '1',
        verificationStatus: 'VERIFIED' as any,
        isActive: true,
        commissionRate: 10,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as MarketplaceSeller;

      const updatedSeller: MarketplaceSeller = {
        ...mockSeller,
        shopDescription: 'New description',
      };

      // Create new context with authenticated user
      const authenticatedCtx = {
        ...mockCtx,
        activeUserId: '1',
      } as RequestContext;
      mockCustomerService.findOneByUserId.mockResolvedValue(mockCustomer);
      mockSellerService.findSellerByCustomerId.mockResolvedValue(mockSeller);
      mockShopService.updateShopCustomization.mockResolvedValue(updatedSeller);

      const result = await resolver.updateShopCustomization(authenticatedCtx, sellerId, {
        shopDescription: 'New description',
      });

      expect(result.shopDescription).toBe('New description');
      expect(mockCustomerService.findOneByUserId).toHaveBeenCalledWith(authenticatedCtx, '1');
      expect(mockSellerService.findSellerByCustomerId).toHaveBeenCalledWith(authenticatedCtx, '1');
      expect(mockShopService.updateShopCustomization).toHaveBeenCalledWith(
        authenticatedCtx,
        sellerId,
        {
          shopDescription: 'New description',
        }
      );
    });

    it('should throw error if user is not authenticated', async () => {
      const unauthenticatedCtx = {
        ...mockCtx,
        activeUserId: undefined,
      } as RequestContext;

      await expect(
        resolver.updateShopCustomization(unauthenticatedCtx, '1', {
          shopDescription: 'New description',
        })
      ).rejects.toThrow('User must be authenticated');
    });
  });
});
