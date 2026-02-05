/**
 * Marketplace Shipping Line Assignment Strategy
 *
 * Phase 5.4: Multi-vendor shipping
 * Assigns ShippingLines to OrderLines based on sellerChannelId.
 * A shipping line applies to order lines whose sellerChannelId matches one of the
 * shipping method's channels.
 *
 * @see https://docs.vendure.io/guides/how-to/multi-vendor-marketplaces/
 */

import {
  ShippingLineAssignmentStrategy,
  ChannelService,
  Injector,
  idsAreEqual,
  type RequestContext,
  type Order,
  type OrderLine,
  type ShippingLine,
} from '@vendure/core';

export class MarketplaceShippingLineAssignmentStrategy implements ShippingLineAssignmentStrategy {
  private channelService!: ChannelService;

  async init(injector: Injector): Promise<void> {
    this.channelService = injector.get(ChannelService);
  }

  async assignShippingLineToOrderLines(
    ctx: RequestContext,
    shippingLine: ShippingLine,
    order: Order
  ): Promise<OrderLine[]> {
    const method = shippingLine.shippingMethod;
    const channels = (method as { channels?: { id: number }[] }).channels;
    if (!channels || channels.length === 0) {
      return order.lines;
    }

    const defaultChannel = await this.channelService.getDefaultChannel(ctx);
    const defaultChannelId = defaultChannel.id;

    return order.lines.filter((line) => {
      const lineChannelId = line.sellerChannelId ?? defaultChannelId;
      return channels.some((ch) => idsAreEqual(ch.id, lineChannelId));
    });
  }
}
