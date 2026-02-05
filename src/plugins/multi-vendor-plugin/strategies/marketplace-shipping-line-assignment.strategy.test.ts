/**
 * Marketplace Shipping Line Assignment Strategy Tests
 *
 * Phase 5.4: Multi-vendor shipping
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import type { RequestContext, ShippingLine, Order } from '@vendure/core';
import { ChannelService, Injector } from '@vendure/core';
import { MarketplaceShippingLineAssignmentStrategy } from './marketplace-shipping-line-assignment.strategy';

describe('MarketplaceShippingLineAssignmentStrategy', () => {
  let strategy: MarketplaceShippingLineAssignmentStrategy;
  let mockChannelService: { getDefaultChannel: ReturnType<typeof jest.fn> };
  let ctx: RequestContext;

  beforeEach(async () => {
    mockChannelService = {
      getDefaultChannel: jest.fn().mockResolvedValue({ id: 1 } as never),
    };
    strategy = new MarketplaceShippingLineAssignmentStrategy();
    const mockInjector = {
      get: jest.fn((token: unknown) => {
        if (token === ChannelService) return mockChannelService;
        return undefined;
      }),
    } as unknown as Injector;
    await strategy.init(mockInjector);
    ctx = {} as RequestContext;
  });

  it('should assign all lines when shipping method has no channels', async () => {
    const line1 = { id: 1, sellerChannelId: 1 } as { id: number; sellerChannelId?: number };
    const line2 = { id: 2, sellerChannelId: 2 } as { id: number; sellerChannelId?: number };
    const shippingLine = {
      shippingMethod: { channels: [] },
    } as unknown as ShippingLine;
    const order = { lines: [line1, line2] } as unknown as Order;

    const result = await strategy.assignShippingLineToOrderLines(ctx, shippingLine, order);

    expect(result).toHaveLength(2);
    expect(result).toEqual([line1, line2]);
  });

  it('should filter lines by matching sellerChannelId', async () => {
    const line1 = { id: 1, sellerChannelId: 1 } as { id: number; sellerChannelId?: number };
    const line2 = { id: 2, sellerChannelId: 2 } as { id: number; sellerChannelId?: number };
    const shippingLine = {
      shippingMethod: { channels: [{ id: 2 }] },
    } as unknown as ShippingLine;
    const order = { lines: [line1, line2] } as unknown as Order;

    const result = await strategy.assignShippingLineToOrderLines(ctx, shippingLine, order);

    expect(result).toHaveLength(1);
    expect(result[0]).toBe(line2);
  });

  it('should use default channel for lines without sellerChannelId', async () => {
    mockChannelService.getDefaultChannel.mockResolvedValue({ id: 1 } as never);
    const line1 = { id: 1 } as { id: number; sellerChannelId?: number };
    const shippingLine = {
      shippingMethod: { channels: [{ id: 1 }] },
    } as unknown as ShippingLine;
    const order = { lines: [line1] } as unknown as Order;

    const result = await strategy.assignShippingLineToOrderLines(ctx, shippingLine, order);

    expect(result).toHaveLength(1);
    expect(result[0]).toBe(line1);
  });
});
