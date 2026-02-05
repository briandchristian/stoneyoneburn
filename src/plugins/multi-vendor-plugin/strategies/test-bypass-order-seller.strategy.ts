/**
 * Test Bypass Order Seller Strategy
 *
 * When APP_ENV=test, this strategy is used to avoid the order_channels_channel
 * duplicate key error in Vendure's OrderSplitter during integration tests.
 * splitOrder returns [] so no seller orders are created.
 *
 * @see PHASE5_4_ORDER_SPLITTING.md - order splitting integration test troubleshooting
 */

import {
  ChannelService,
  Injector,
  TransactionalConnection,
  type RequestContext,
  type OrderLine,
  type Channel,
  type OrderSellerStrategy,
} from '@vendure/core';

export class TestBypassOrderSellerStrategy implements OrderSellerStrategy {
  private channelService!: ChannelService;
  private connection!: TransactionalConnection;

  async init(injector: Injector): Promise<void> {
    this.channelService = injector.get(ChannelService);
    this.connection = injector.get(TransactionalConnection);
  }

  async setOrderLineSellerChannel(
    ctx: RequestContext,
    _orderLine: OrderLine
  ): Promise<Channel | undefined> {
    return this.channelService.getDefaultChannel(ctx);
  }

  async splitOrder(): Promise<never[]> {
    return [];
  }

  async afterSellerOrdersCreated(): Promise<void> {
    // no-op
  }
}
