/**
 * Shop Service Tests
 *
 * Test-Driven Development (TDD) for Phase 5.1: Seller Shop Pages
 *
 * These tests define the expected behavior of ShopService:
 * - Getting shop by slug
 * - Getting shop products with pagination
 * - Updating shop customization (banner, description)
 *
 * Following TDD workflow:
 * 1. Write tests first (RED) ✅
 * 2. Implement minimal code to pass (GREEN)
 * 3. Refactor while keeping tests passing
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import type { RequestContext, Product } from '@vendure/core';
import { TransactionalConnection } from '@vendure/core';
import { ShopService } from './shop.service';
import { SellerService } from './seller.service';
import { MarketplaceSeller } from '../entities/seller.entity';

// Mock dependencies
jest.mock('@vendure/core', () => {
  const actual = jest.requireActual('@vendure/core') as any;
  return {
    ...actual,
    TransactionalConnection: jest.fn(),
  };
});

/**
 * Test Suite: Shop Service
 */
describe('ShopService', () => {
  let service: ShopService;
  let mockCtx: RequestContext;
  let mockConnection: jest.Mocked<TransactionalConnection>;
  let mockSellerService: jest.Mocked<SellerService>;
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
      getMany: jest.fn(),
    };

    // Create mock product repository
    mockProductRepository = {
      createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
    };

    // Create mock connection
    mockConnection = {
      getRepository: jest.fn().mockReturnValue(mockProductRepository),
    } as any;

    // Create mock seller service
    mockSellerService = {
      findSellerByShopSlug: jest.fn(),
      updateSellerProfile: jest.fn(),
    } as any;

    // Create service instance
    service = new ShopService(mockConnection, mockSellerService);

    // Create mock request context
    mockCtx = {
      channel: {} as any,
      languageCode: 'en' as any,
      activeUserId: '1',
    } as RequestContext;
  });

  describe('getShopBySlug', () => {
    it('should return shop when slug exists', async () => {
      const mockSeller: MarketplaceSeller = {
        id: '1',
        shopName: 'Test Shop',
        shopSlug: 'test-shop',
        shopDescription: 'A test shop',
        shopBannerAssetId: '100',
        shopLogoAssetId: '101',
        customerId: '1',
        verificationStatus: 'VERIFIED' as any,
        isActive: true,
        commissionRate: 10,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as MarketplaceSeller;

      mockSellerService.findSellerByShopSlug.mockResolvedValue(mockSeller);

      const result = await service.getShopBySlug(mockCtx, 'test-shop');

      expect(result).toEqual(mockSeller);
      expect(mockSellerService.findSellerByShopSlug).toHaveBeenCalledWith(mockCtx, 'test-shop');
    });

    it('should return null when slug does not exist', async () => {
      mockSellerService.findSellerByShopSlug.mockResolvedValue(null);

      const result = await service.getShopBySlug(mockCtx, 'non-existent-shop');

      expect(result).toBeNull();
      expect(mockSellerService.findSellerByShopSlug).toHaveBeenCalledWith(
        mockCtx,
        'non-existent-shop'
      );
    });
  });

  describe('getShopProducts', () => {
    it('should return products for a seller with pagination', async () => {
      const sellerId = '1';
      const mockProducts: Product[] = [
        { id: '1', name: 'Product 1' } as Product,
        { id: '2', name: 'Product 2' } as Product,
      ];

      mockQueryBuilder.getManyAndCount.mockResolvedValue([mockProducts, 2]);

      const result = await service.getShopProducts(mockCtx, sellerId, { skip: 0, take: 10 });

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
      expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith('product.createdAt', 'DESC');
      expect(mockQueryBuilder.skip).toHaveBeenCalledWith(0);
      expect(mockQueryBuilder.take).toHaveBeenCalledWith(10);
    });

    it('should filter out disabled products', async () => {
      const sellerId = '1';
      const mockProducts: Product[] = [{ id: '1', name: 'Product 1' } as Product];

      mockQueryBuilder.getManyAndCount.mockResolvedValue([mockProducts, 1]);

      await service.getShopProducts(mockCtx, sellerId, { skip: 0, take: 10 });

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('product.enabled = :enabled', {
        enabled: true,
      });
    });

    it('should support custom pagination', async () => {
      const sellerId = '1';
      const mockProducts: Product[] = [];

      mockQueryBuilder.getManyAndCount.mockResolvedValue([mockProducts, 0]);

      await service.getShopProducts(mockCtx, sellerId, { skip: 20, take: 5 });

      expect(mockQueryBuilder.skip).toHaveBeenCalledWith(20);
      expect(mockQueryBuilder.take).toHaveBeenCalledWith(5);
    });

    it('should return empty list when seller has no products', async () => {
      const sellerId = '1';

      mockQueryBuilder.getManyAndCount.mockResolvedValue([[], 0]);

      const result = await service.getShopProducts(mockCtx, sellerId, { skip: 0, take: 10 });

      expect(result.items).toEqual([]);
      expect(result.totalItems).toBe(0);
    });
  });

  describe('updateShopCustomization', () => {
    it('should update shop description', async () => {
      const sellerId = '1';
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

      mockSellerService.updateSellerProfile.mockResolvedValue(updatedSeller);

      const result = await service.updateShopCustomization(mockCtx, sellerId, {
        shopDescription: 'New description',
      });

      expect(result.shopDescription).toBe('New description');
      expect(mockSellerService.updateSellerProfile).toHaveBeenCalledWith(mockCtx, sellerId, {
        shopDescription: 'New description',
      });
    });

    it('should update shop banner asset ID', async () => {
      const sellerId = '1';
      const mockSeller: MarketplaceSeller = {
        id: sellerId,
        shopName: 'Test Shop',
        shopSlug: 'test-shop',
        shopBannerAssetId: '100',
        customerId: '1',
        verificationStatus: 'VERIFIED' as any,
        isActive: true,
        commissionRate: 10,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as MarketplaceSeller;

      const updatedSeller: MarketplaceSeller = {
        ...mockSeller,
        shopBannerAssetId: '200',
      };

      mockSellerService.updateSellerProfile.mockResolvedValue(updatedSeller);

      const result = await service.updateShopCustomization(mockCtx, sellerId, {
        shopBannerAssetId: '200',
      });

      expect(result.shopBannerAssetId).toBe('200');
      expect(mockSellerService.updateSellerProfile).toHaveBeenCalledWith(mockCtx, sellerId, {
        shopBannerAssetId: '200',
      });
    });

    it('should update shop logo asset ID', async () => {
      const sellerId = '1';
      const mockSeller: MarketplaceSeller = {
        id: sellerId,
        shopName: 'Test Shop',
        shopSlug: 'test-shop',
        shopLogoAssetId: '101',
        customerId: '1',
        verificationStatus: 'VERIFIED' as any,
        isActive: true,
        commissionRate: 10,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as MarketplaceSeller;

      const updatedSeller: MarketplaceSeller = {
        ...mockSeller,
        shopLogoAssetId: '201',
      };

      mockSellerService.updateSellerProfile.mockResolvedValue(updatedSeller);

      const result = await service.updateShopCustomization(mockCtx, sellerId, {
        shopLogoAssetId: '201',
      });

      expect(result.shopLogoAssetId).toBe('201');
      expect(mockSellerService.updateSellerProfile).toHaveBeenCalledWith(mockCtx, sellerId, {
        shopLogoAssetId: '201',
      });
    });

    it('should update multiple customization fields at once', async () => {
      const sellerId = '1';
      const mockSeller: MarketplaceSeller = {
        id: sellerId,
        shopName: 'Test Shop',
        shopSlug: 'test-shop',
        shopDescription: 'Old description',
        shopBannerAssetId: '100',
        shopLogoAssetId: '101',
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
        shopBannerAssetId: '200',
        shopLogoAssetId: '201',
      };

      mockSellerService.updateSellerProfile.mockResolvedValue(updatedSeller);

      const result = await service.updateShopCustomization(mockCtx, sellerId, {
        shopDescription: 'New description',
        shopBannerAssetId: '200',
        shopLogoAssetId: '201',
      });

      expect(result.shopDescription).toBe('New description');
      expect(result.shopBannerAssetId).toBe('200');
      expect(result.shopLogoAssetId).toBe('201');
      expect(mockSellerService.updateSellerProfile).toHaveBeenCalledWith(mockCtx, sellerId, {
        shopDescription: 'New description',
        shopBannerAssetId: '200',
        shopLogoAssetId: '201',
      });
    });
  });
});
