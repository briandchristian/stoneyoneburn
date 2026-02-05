/**
 * Product Seller Field Resolver Tests
 *
 * Tests for exposing seller information on Product type in Shop API.
 * Phase 5.2: Multi-Seller Cart - Seller information display
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import type { RequestContext, Product } from '@vendure/core';
import { ProductSellerResolver } from './product-seller.resolver';
import { SellerService } from '../services/seller.service';

describe('ProductSellerResolver', () => {
  let resolver: ProductSellerResolver;
  let mockSellerService: {
    findMarketplaceSellerById: any;
  };
  let mockCtx: RequestContext;

  beforeEach(() => {
    const findMarketplaceSellerByIdMock = jest.fn();

    mockSellerService = {
      findMarketplaceSellerById: findMarketplaceSellerByIdMock,
    };

    resolver = new ProductSellerResolver(mockSellerService as unknown as SellerService);

    mockCtx = {
      channel: {} as any,
      languageCode: 'en' as any,
      activeUserId: '1',
    } as RequestContext;
  });

  describe('seller field resolver', () => {
    it('should return seller information when product has a seller', async () => {
      const product = {
        id: '100',
        customFields: {
          seller: { id: 1 },
        },
      } as any as Product;

      const mockSeller = {
        id: 1,
        shopName: 'Test Shop',
        shopSlug: 'test-shop',
      };

      mockSellerService.findMarketplaceSellerById.mockResolvedValue(mockSeller);

      const result = await resolver.seller(mockCtx, product);

      expect(result).toEqual(mockSeller);
      expect(mockSellerService.findMarketplaceSellerById).toHaveBeenCalledWith(mockCtx, 1);
    });

    it('should return null when product has no seller', async () => {
      const product = {
        id: '100',
        customFields: {},
      } as any as Product;

      const result = await resolver.seller(mockCtx, product);

      expect(result).toBeNull();
      expect(mockSellerService.findMarketplaceSellerById).not.toHaveBeenCalled();
    });

    it('should return null when product customFields is null', async () => {
      const product = {
        id: '100',
        customFields: null,
      } as any as Product;

      const result = await resolver.seller(mockCtx, product);

      expect(result).toBeNull();
      expect(mockSellerService.findMarketplaceSellerById).not.toHaveBeenCalled();
    });

    it('should handle seller ID as string', async () => {
      const product = {
        id: '100',
        customFields: {
          seller: { id: '1' },
        },
      } as any as Product;

      const mockSeller = {
        id: 1,
        shopName: 'Test Shop',
        shopSlug: 'test-shop',
      };

      mockSellerService.findMarketplaceSellerById.mockResolvedValue(mockSeller);

      const result = await resolver.seller(mockCtx, product);

      expect(result).toEqual(mockSeller);
      expect(mockSellerService.findMarketplaceSellerById).toHaveBeenCalledWith(mockCtx, 1);
    });

    it('should return null when seller is not found', async () => {
      const product = {
        id: '100',
        customFields: {
          seller: { id: 999 },
        },
      } as any as Product;

      mockSellerService.findMarketplaceSellerById.mockResolvedValue(null);

      const result = await resolver.seller(mockCtx, product);

      expect(result).toBeNull();
      expect(mockSellerService.findMarketplaceSellerById).toHaveBeenCalledWith(mockCtx, 999);
    });
  });
});
