/**
 * Marketplace Shipping Eligibility Checker Tests
 *
 * Phase 5.4: Multi-vendor shipping
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import type { RequestContext, Order, ShippingMethod } from '@vendure/core';
import { Injector } from '@vendure/core';
import { marketplaceShippingEligibilityChecker } from './marketplace-shipping-eligibility.checker';

describe('marketplaceShippingEligibilityChecker', () => {
  const ctx = { channelId: 1 } as unknown as RequestContext;

  beforeEach(async () => {
    const mockInjector = {
      get: jest.fn().mockReturnValue({ get: jest.fn(), set: jest.fn() }),
    } as unknown as Injector;
    await marketplaceShippingEligibilityChecker.init(mockInjector);
  });

  it('should be eligible when method has channel matching a line', async () => {
    const order = {
      lines: [
        { sellerChannelId: 1 } as { sellerChannelId?: number },
        { sellerChannelId: 2 } as { sellerChannelId?: number },
      ],
    } as unknown as Order;
    const method = { channels: [{ id: 2, code: 'seller-2' }] } as unknown as ShippingMethod;

    const result = await marketplaceShippingEligibilityChecker.check(ctx, order, [], method);

    expect(result).toBe(true);
  });

  it('should not be eligible when no line matches method channels', async () => {
    const order = {
      lines: [{ sellerChannelId: 1 } as { sellerChannelId?: number }],
    } as unknown as Order;
    const method = { channels: [{ id: 2, code: 'seller-2' }] } as unknown as ShippingMethod;

    const result = await marketplaceShippingEligibilityChecker.check(ctx, order, [], method);

    expect(result).toBe(false);
  });

  it('should be eligible when method has no channels (backward compat)', async () => {
    const order = {
      lines: [{ sellerChannelId: 1 } as { sellerChannelId?: number }],
    } as unknown as Order;
    const method = {} as unknown as ShippingMethod;

    const result = await marketplaceShippingEligibilityChecker.check(ctx, order, [], method);

    expect(result).toBe(true);
  });
});
