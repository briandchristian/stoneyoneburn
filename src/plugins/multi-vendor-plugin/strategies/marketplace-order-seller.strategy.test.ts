/**
 * Marketplace Order Seller Strategy Tests
 *
 * Phase 5.4: Backend Order Splitting
 * TDD: Tests for OrderSellerStrategy implementation
 *
 * Channel-per-seller: Returns seller's channel when product has seller with channelId.
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import type { RequestContext } from '@vendure/core';
import {
  Channel,
  ChannelService,
  Injector,
  Order,
  OrderLine,
  TransactionalConnection,
} from '@vendure/core';
import { MarketplaceSeller } from '../entities/seller.entity';
import { MarketplaceOrderSellerStrategy } from './marketplace-order-seller.strategy';

describe('MarketplaceOrderSellerStrategy', () => {
  let strategy: MarketplaceOrderSellerStrategy;
  let mockChannelService: {
    getDefaultChannel: ReturnType<typeof jest.fn>;
    findOne: ReturnType<typeof jest.fn>;
  };
  let mockConnection: { getRepository: ReturnType<typeof jest.fn> };
  let ctx: RequestContext;

  beforeEach(async () => {
    mockChannelService = {
      getDefaultChannel: jest.fn(),
      findOne: jest.fn(),
    };
    mockConnection = {
      getRepository: jest.fn().mockReturnValue({
        findOne: jest.fn<() => Promise<MarketplaceSeller | null>>().mockResolvedValue(null),
      }),
    };
    strategy = new MarketplaceOrderSellerStrategy();
    const mockInjector = {
      get: jest.fn((token: unknown) => {
        if (token === ChannelService) return mockChannelService;
        if (token === TransactionalConnection) return mockConnection;
        return undefined;
      }),
    } as unknown as Injector;
    await strategy.init(mockInjector);
    ctx = {} as RequestContext;
  });

  describe('setOrderLineSellerChannel', () => {
    it('should return default channel when product has no seller', async () => {
      const defaultChannel = { id: 1, code: 'default' } as Channel;
      mockChannelService.getDefaultChannel.mockResolvedValue(defaultChannel);

      const orderLine = {
        productVariantId: 100,
        productVariant: { product: { customFields: {} } },
      } as unknown as OrderLine;

      const result = await strategy.setOrderLineSellerChannel?.(ctx, orderLine);

      expect(result).toBe(defaultChannel);
      expect(mockChannelService.getDefaultChannel).toHaveBeenCalledWith(ctx);
    });

    it('should return default channel when product has seller but no channel (legacy)', async () => {
      const defaultChannel = { id: 1, code: 'default' } as Channel;
      mockChannelService.getDefaultChannel.mockResolvedValue(defaultChannel);
      const mockRepo = {
        findOne: jest
          .fn<() => Promise<MarketplaceSeller | null>>()
          .mockResolvedValue({ id: 5, channelId: undefined } as MarketplaceSeller),
      };
      mockConnection.getRepository.mockReturnValue(mockRepo);

      const orderLine = {
        productVariantId: 100,
        productVariant: {
          product: { customFields: { seller: 5 } },
        },
      } as unknown as OrderLine;

      const result = await strategy.setOrderLineSellerChannel?.(ctx, orderLine);

      expect(result).toBe(defaultChannel);
    });

    it('should return seller channel when product has seller with channelId', async () => {
      const defaultChannel = { id: 1, code: 'default' } as Channel;
      const sellerChannel = { id: 2, code: 'seller-5' } as Channel;
      mockChannelService.getDefaultChannel.mockResolvedValue(defaultChannel);
      mockChannelService.findOne.mockResolvedValue(sellerChannel);
      const mockRepo = {
        findOne: jest
          .fn<() => Promise<MarketplaceSeller | null>>()
          .mockResolvedValue({ id: 5, channelId: 2 } as MarketplaceSeller),
      };
      mockConnection.getRepository.mockReturnValue(mockRepo);

      const orderLine = {
        productVariantId: 100,
        productVariant: {
          product: { customFields: { seller: 5 } },
        },
      } as unknown as OrderLine;

      const result = await strategy.setOrderLineSellerChannel?.(ctx, orderLine);

      expect(result).toBe(sellerChannel);
      expect(mockChannelService.findOne).toHaveBeenCalledWith(ctx, 2);
    });
  });

  describe('splitOrder', () => {
    it('should return single group with all lines when using default channel', async () => {
      const defaultChannel = { id: 1, code: 'default' } as Channel;
      mockChannelService.getDefaultChannel.mockResolvedValue(defaultChannel);

      const line1 = { id: 1, sellerChannelId: 1 } as OrderLine;
      const line2 = { id: 2, sellerChannelId: 1 } as OrderLine;
      const order = {
        id: 100,
        lines: [line1, line2],
        shippingLines: [],
      } as unknown as Order;

      const result = await strategy.splitOrder?.(ctx, order);

      expect(result).toHaveLength(1);
      expect(result![0].channelId).toBe(1);
      expect(result![0].lines).toEqual([line1, line2]);
      expect(result![0].shippingLines).toEqual([]);
      expect(result![0].state).toBe('ArrangingPayment');
    });

    it('should handle empty order lines', async () => {
      mockChannelService.getDefaultChannel.mockResolvedValue({
        id: 1,
        code: 'default',
      } as Channel);

      const order = {
        id: 100,
        lines: [],
        shippingLines: [],
      } as unknown as Order;

      const result = await strategy.splitOrder?.(ctx, order);

      expect(result).toHaveLength(1);
      expect(result![0].lines).toEqual([]);
    });

    it('should split order into multiple groups when lines have different sellerChannelIds', async () => {
      mockChannelService.getDefaultChannel.mockResolvedValue({
        id: 1,
        code: 'default',
      } as Channel);

      const line1 = { id: 1, sellerChannelId: 1 } as OrderLine;
      const line2 = { id: 2, sellerChannelId: 2 } as OrderLine;
      const line3 = { id: 3, sellerChannelId: 2 } as OrderLine;
      const order = {
        id: 100,
        lines: [line1, line2, line3],
        shippingLines: [],
      } as unknown as Order;

      const result = await strategy.splitOrder?.(ctx, order);

      expect(result).toHaveLength(2);
      const ch1 = result!.find((g) => g.channelId === 1);
      const ch2 = result!.find((g) => g.channelId === 2);
      expect(ch1?.lines).toEqual([line1]);
      expect(ch2?.lines).toEqual([line2, line3]);
    });
  });
});
