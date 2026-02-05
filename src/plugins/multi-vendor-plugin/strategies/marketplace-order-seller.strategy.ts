/**
 * Marketplace Order Seller Strategy
 *
 * Phase 5.4: Backend Order Splitting
 * Implements Vendure OrderSellerStrategy for multi-vendor order splitting.
 *
 * Channel-per-seller: Each MarketplaceSeller has a dedicated Channel. Products
 * are assigned to both default channel and seller's channel. setOrderLineSellerChannel
 * returns the seller's Channel when product has a seller with channelId.
 *
 * @see https://docs.vendure.io/guides/how-to/multi-vendor-marketplaces/
 * @see PHASE5_4_ORDER_SPLITTING.md
 */

import {
  ChannelService,
  Injector,
  TransactionalConnection,
  type RequestContext,
  type Order,
  type OrderLine,
  type Channel,
  type OrderSellerStrategy,
  type SplitOrderContents,
} from '@vendure/core';
import { MarketplaceSeller } from '../entities/seller.entity';

export class MarketplaceOrderSellerStrategy implements OrderSellerStrategy {
  private channelService!: ChannelService;
  private connection!: TransactionalConnection;

  async init(injector: Injector): Promise<void> {
    this.channelService = injector.get(ChannelService);
    this.connection = injector.get(TransactionalConnection);
  }

  /**
   * Assign OrderLine to seller's Channel.
   * Returns seller's Channel when product has a seller with channelId; otherwise default channel.
   */
  async setOrderLineSellerChannel(
    ctx: RequestContext,
    orderLine: OrderLine
  ): Promise<Channel | undefined> {
    const defaultChannel = await this.channelService.getDefaultChannel(ctx);
    const product = orderLine.productVariant?.product as
      | { customFields?: { seller?: number } }
      | undefined;
    const sellerId = product?.customFields?.seller;
    if (!sellerId) {
      return defaultChannel;
    }

    const sellerRepo = this.connection.getRepository(ctx, MarketplaceSeller);
    const seller = await sellerRepo.findOne({ where: { id: sellerId } });
    if (!seller?.channelId) {
      return defaultChannel;
    }

    const channel = await this.channelService.findOne(ctx, seller.channelId);
    return channel ?? defaultChannel;
  }

  /**
   * Split order into sub-orders per seller.
   * Currently returns one group with all lines (channel-per-seller not yet implemented).
   */
  async splitOrder(ctx: RequestContext, order: Order): Promise<SplitOrderContents[]> {
    const defaultChannel = await this.channelService.getDefaultChannel(ctx);

    // Group lines by sellerChannelId (when channel-per-seller is added)
    // For now, all lines go to default channel
    const linesByChannel = new Map<string, OrderLine[]>();

    for (const line of order.lines) {
      const channelId = line.sellerChannelId ?? defaultChannel.id;
      const key = channelId.toString();
      if (!linesByChannel.has(key)) {
        linesByChannel.set(key, []);
      }
      linesByChannel.get(key)!.push(line);
    }

    // If no lines, return single empty group (Vendure expects at least one group when splitting)
    if (order.lines.length === 0) {
      return [
        {
          channelId: defaultChannel.id,
          state: 'ArrangingPayment',
          lines: [],
          shippingLines: [],
        },
      ];
    }

    const result: SplitOrderContents[] = [];
    for (const [channelIdStr, lines] of linesByChannel.entries()) {
      const channelId = parseInt(channelIdStr, 10);
      // Pass empty shipping lines to avoid order_channels_channel duplicate key.
      // Reusing the aggregate order's shipping line refs can cause Vendure to insert
      // duplicate (orderId, channelId) into the join table during seller order creation.
      result.push({
        channelId,
        state: 'ArrangingPayment',
        lines,
        shippingLines: [],
      });
    }

    return result;
  }

  /**
   * Called after seller orders are created.
   * Existing OrderPaymentSubscriber handles payouts on OrderPlacedEvent for the aggregate order.
   * No additional processing needed for now.
   */
  async afterSellerOrdersCreated(
    _ctx: RequestContext,
    _aggregateOrder: Order,
    _sellerOrders: Order[]
  ): Promise<void> {
    // Platform fee surcharges, payment processing could go here.
    // Existing OrderPaymentSubscriber processes the aggregate order.
  }
}
