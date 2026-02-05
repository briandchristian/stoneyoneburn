/**
 * Shop Search Service Tests
 *
 * Test-Driven Development (TDD) for Phase 5.1: Shop Search Functionality
 *
 * These tests define the expected behavior of ShopSearchService:
 * - Search shops by name
 * - Search shops by description
 * - Pagination support
 * - Filtering by verification status
 *
 * Following TDD workflow:
 * 1. Write tests first (RED) ✅
 * 2. Implement minimal code to pass (GREEN)
 * 3. Refactor while keeping tests passing
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import type { RequestContext } from '@vendure/core';
import { ShopSearchService } from './shop-search.service';
import { TransactionalConnection } from '@vendure/core';
import { MarketplaceSeller } from '../entities/seller.entity';

describe('ShopSearchService - Unit Tests', () => {
  let service: ShopSearchService;
  let mockConnection: {
    getRepository: any;
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
        orWhere: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn(),
      };
      return queryBuilder;
    });

    mockRepository.createQueryBuilder = createQueryBuilderMock;

    mockConnection = {
      getRepository: jest.fn().mockReturnValue(mockRepository),
    };

    service = new ShopSearchService(mockConnection as unknown as TransactionalConnection);

    mockCtx = {
      channel: {} as any,
      languageCode: 'en' as any,
      activeUserId: '1',
    } as RequestContext;
  });

  describe('searchShops', () => {
    it('should search shops by name', async () => {
      const searchTerm = 'test shop';
      const mockShops = [
        {
          id: 1,
          shopName: 'Test Shop',
          shopSlug: 'test-shop',
          shopDescription: 'A test shop',
        },
      ];

      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orWhere: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getManyAndCount: jest
          .fn<() => Promise<[any[], number]>>()
          .mockResolvedValue([mockShops, 1]),
      };

      const mockRepository = mockConnection.getRepository();
      mockRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      const result = await service.searchShops(mockCtx, searchTerm, { skip: 0, take: 10 });

      expect(result.items).toEqual(mockShops);
      expect(result.totalItems).toBe(1);
      expect(mockQueryBuilder.where).toHaveBeenCalled();
      expect(mockQueryBuilder.getManyAndCount).toHaveBeenCalled();
    });

    it('should search shops by description', async () => {
      const searchTerm = 'handmade';
      const mockShops = [
        {
          id: 2,
          shopName: 'Artisan Shop',
          shopSlug: 'artisan-shop',
          shopDescription: 'Handmade crafts and art',
        },
      ];

      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orWhere: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getManyAndCount: jest
          .fn<() => Promise<[any[], number]>>()
          .mockResolvedValue([mockShops, 1]),
      };

      const mockRepository = mockConnection.getRepository();
      mockRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      const result = await service.searchShops(mockCtx, searchTerm, { skip: 0, take: 10 });

      expect(result.items).toEqual(mockShops);
      expect(result.totalItems).toBe(1);
      expect(mockQueryBuilder.orWhere).toHaveBeenCalled();
    });

    it('should support pagination', async () => {
      const searchTerm = 'shop';
      const mockShops = [
        {
          id: 1,
          shopName: 'Shop 1',
          shopSlug: 'shop-1',
        },
      ];

      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orWhere: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getManyAndCount: jest
          .fn<() => Promise<[any[], number]>>()
          .mockResolvedValue([mockShops, 1]),
      };

      const mockRepository = mockConnection.getRepository();
      mockRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      await service.searchShops(mockCtx, searchTerm, { skip: 20, take: 5 });

      expect(mockQueryBuilder.skip).toHaveBeenCalledWith(20);
      expect(mockQueryBuilder.take).toHaveBeenCalledWith(5);
    });

    it('should filter by verification status', async () => {
      const searchTerm = 'shop';
      const mockShops: any[] = [];

      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orWhere: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getManyAndCount: jest
          .fn<() => Promise<[any[], number]>>()
          .mockResolvedValue([mockShops, 0]),
      };

      const mockRepository = mockConnection.getRepository();
      mockRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      await service.searchShops(mockCtx, searchTerm, { skip: 0, take: 10, verifiedOnly: true });

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        expect.stringContaining('verificationStatus'),
        expect.objectContaining({ status: 'VERIFIED' })
      );
    });

    it('should return empty list when no shops match', async () => {
      const searchTerm = 'nonexistent';
      const mockShops: any[] = [];

      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orWhere: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getManyAndCount: jest
          .fn<() => Promise<[any[], number]>>()
          .mockResolvedValue([mockShops, 0]),
      };

      const mockRepository = mockConnection.getRepository();
      mockRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      const result = await service.searchShops(mockCtx, searchTerm, { skip: 0, take: 10 });

      expect(result.items).toEqual([]);
      expect(result.totalItems).toBe(0);
    });

    it('should use default pagination when options not provided', async () => {
      const searchTerm = 'shop';
      const mockShops: any[] = [];

      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orWhere: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getManyAndCount: jest
          .fn<() => Promise<[any[], number]>>()
          .mockResolvedValue([mockShops, 0]),
      };

      const mockRepository = mockConnection.getRepository();
      mockRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      await service.searchShops(mockCtx, searchTerm);

      expect(mockQueryBuilder.skip).toHaveBeenCalledWith(0);
      expect(mockQueryBuilder.take).toHaveBeenCalledWith(25);
    });

    it('should filter by minRating when specified (Phase 5.3 advanced filters)', async () => {
      const searchTerm = 'shop';
      const mockShops: MarketplaceSeller[] = [];

      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orWhere: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getManyAndCount: jest
          .fn<() => Promise<[MarketplaceSeller[], number]>>()
          .mockResolvedValue([mockShops, 0]),
      };

      const mockRepository = mockConnection.getRepository();
      mockRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      await service.searchShops(mockCtx, searchTerm, { skip: 0, take: 10, minRating: 4 });

      const minRatingCall = mockQueryBuilder.andWhere.mock.calls.find(
        (call: unknown[]) =>
          typeof call[0] === 'string' && (call[0] as string).toLowerCase().includes('rating')
      );
      expect(minRatingCall).toBeDefined();
    });

    it('should not add minRating filter when not specified', async () => {
      const searchTerm = 'shop';
      const mockShops = [{ id: 1, shopName: 'Shop', shopSlug: 'shop' }];

      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orWhere: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getManyAndCount: jest
          .fn<() => Promise<[unknown[], number]>>()
          .mockResolvedValue([mockShops, 1]),
      };

      const mockRepository = mockConnection.getRepository();
      mockRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      const andWhereCalls = mockQueryBuilder.andWhere.mock.calls;
      const _verifiedOnlyCall = andWhereCalls.find(
        (call: unknown[]) =>
          typeof call[0] === 'string' && (call[0] as string).includes('verificationStatus')
      );

      await service.searchShops(mockCtx, searchTerm, { skip: 0, take: 10 });

      const minRatingCall = mockQueryBuilder.andWhere.mock.calls.find(
        (call: unknown[]) => typeof call[0] === 'string' && (call[0] as string).includes('rating')
      );
      expect(minRatingCall).toBeUndefined();
    });
  });
});
