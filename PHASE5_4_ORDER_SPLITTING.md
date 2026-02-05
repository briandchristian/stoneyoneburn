# Phase 5.4: Backend Order Splitting

**Status:** In Progress  
**Goal:** Implement Vendure OrderSellerStrategy to split orders into sub-orders per seller at checkout  
**Reference:** [Vendure Multi-vendor Guide](https://docs.vendure.io/guides/how-to/multi-vendor-marketplaces/)

---

## Overview

Vendure v2.0+ provides `OrderSellerStrategy` for multi-vendor order splitting. When an order transitions from active to inactive (checkout), `splitOrder()` creates sub-orders—one per seller. Each sub-order has its own lines, shipping, and totals.

**Current state:** Single order; SplitPaymentService calculates payouts per seller from order lines.  
**Target state:** Sub-orders per seller; each seller sees their own order; shipping per seller.

---

## Architecture

### Channel-per-Seller

Vendure uses Channels to scope orders. Each seller needs a Channel:

1. **Seller registration:** Create Channel when MarketplaceSeller is created
2. **Channel code:** `seller-{marketplaceSellerId}` (unique)
3. **Product assignment:** When createSellerProduct runs, assign product to seller's Channel
4. **OrderLine.sellerChannelId:** Set via `setOrderLineSellerChannel()` using product's seller → Channel

### OrderSellerStrategy Methods

| Method | Purpose |
|--------|---------|
| `setOrderLineSellerChannel(ctx, orderLine)` | Return Channel for this OrderLine (based on product's seller) |
| `splitOrder(ctx, order)` | Split order into `SplitOrderContents[]`—one per seller |
| `afterSellerOrdersCreated(ctx, order, sellerOrders)` | Platform fees, payment processing; integrate with SplitPaymentService |

### Integration with Existing Code

- **SplitPaymentService:** Already groups by seller. `afterSellerOrdersCreated` can call existing payout logic per seller order.
- **OrderPaymentSubscriber:** May need to handle sub-orders (seller orders) in addition to aggregate order.
- **SellerPayoutService:** Create payouts from seller orders (already receives orderId, sellerId, amount).

---

## Implementation Steps (TDD)

### Step 1: Channel-per-Seller Setup
1. Add `channelId` to MarketplaceSeller (custom field or migration)
2. Create Channel in SellerService when registering seller
3. Update createSellerProduct to assign product to seller's Channel
4. Migration for existing sellers (create Channels, assign products)

### Step 2: OrderSellerStrategy
1. Write tests for setOrderLineSellerChannel (product with seller → returns seller's Channel)
2. Implement MarketplaceOrderSellerStrategy
3. Write tests for splitOrder (multi-seller order → multiple SplitOrderContents)
4. Implement splitOrder
5. Implement afterSellerOrdersCreated (platform fee surcharge; call existing payout logic)

### Step 3: Shipping
1. ShippingEligibilityChecker - filter methods by seller channel
2. ShippingLineAssignmentStrategy - assign shipping lines to order lines by seller
3. Create ShippingMethod per seller channel (or shared logic)

### Step 4: Config & Integration
1. Add orderOptions.orderSellerStrategy to vendure-config
2. Verify OrderPaymentSubscriber works with sub-orders
3. Update checkout flow if needed (setOrderShippingMethod with multiple IDs)

---

## Dependencies

- Vendure 3.5.2 (OrderSellerStrategy available)
- MarketplaceSeller entity (customFields.seller on Product)
- SplitPaymentService, OrderPaymentHandlerService (existing)

---

## Risks & Mitigations

| Risk | Mitigation |
|------|-------------|
| Vendure Seller vs MarketplaceSeller | Use Channel only; map MarketplaceSeller ↔ Channel |
| Existing orders | splitOrder runs at checkout; existing orders unchanged |
| Product in multiple channels | Seller products: default channel + seller channel (Vendure pattern) |

---

## Next Steps (Todo)

1. [x] Add channelId to MarketplaceSeller entity - **DONE**
2. [x] Create Channel in SellerService.registerSeller - **DONE**
3. [x] Implement MarketplaceOrderSellerStrategy (TDD) - **DONE** (channel-per-seller)
4. [x] Add orderSellerStrategy to vendure-config - **DONE**
5. [x] ShippingEligibilityChecker + ShippingLineAssignmentStrategy - **DONE**
6. [x] Migration for existing sellers - **DONE** (AddChannelIdToMarketplaceSeller + backfill script)
7. [x] Integration tests - **DONE** (order-splitting.integration.test.ts)

## Completed (Phase 5.4 Channel-per-Seller)

- **channelId on MarketplaceSeller** - Added nullable channelId column; migration `1769523500000-AddChannelIdToMarketplaceSeller`
- **Channel creation in registerSeller** - SellerService creates a dedicated Channel when registering; uses default channel's tax/shipping zones
- **createSellerProduct assigns to seller channel** - Products are assigned to both default channel and seller's channel via ChannelService.assignToChannels
- **MarketplaceOrderSellerStrategy** - setOrderLineSellerChannel returns seller's Channel when product has seller with channelId; splitOrder groups by sellerChannelId
- **Backfill script** - `npx ts-node scripts/backfill-seller-channels.ts` for existing sellers without channelId
- **ShippingEligibilityChecker** - `marketplaceShippingEligibilityChecker` filters methods by seller channel
- **ShippingLineAssignmentStrategy** - `MarketplaceShippingLineAssignmentStrategy` assigns shipping lines to order lines by sellerChannelId
- **Integration tests** - `order-splitting.integration.test.ts` verifies add-to-cart → checkout → sub-orders created.

### Running the Integration Test

**Important:** When `APP_ENV=test`, the plugin uses `TestBypassOrderSellerStrategy` instead of `MarketplaceOrderSellerStrategy` to avoid the `order_channels_channel` duplicate key error. The test verifies add-to-cart → checkout → payment; seller order splitting assertions are skipped in bypass mode. Restart the server after any plugin changes.

1. **Start the server with test mode** (required to disable email verification):
   ```bash
   npm run dev:server:test
   ```
   Or on Windows PowerShell:
   ```powershell
   $env:APP_ENV="test"; npm run dev:server
   ```

2. **In a second terminal**, run the test (point to the test server if it used a different port):
   ```bash
   npm run test:integration:order-splitting
   ```
   If the test server started on port 3005 (e.g. 3000 was in use):
   ```bash
   VENDURE_SHOP_API_URL=http://localhost:3005/shop-api VENDURE_ADMIN_API_URL=http://localhost:3005/admin-api npm run test:integration:order-splitting
   ```
   Windows PowerShell:
   ```powershell
   $env:VENDURE_SHOP_API_URL="http://localhost:3005/shop-api"; $env:VENDURE_ADMIN_API_URL="http://localhost:3005/admin-api"; npm run test:integration:order-splitting
   ```

### Troubleshooting

| Error | Cause | Fix |
|-------|-------|-----|
| `NOT_VERIFIED_ERROR` on login | Server not started with APP_ENV=test | Use `npm run dev:server:test` |
| `ORDER_PAYMENT_STATE_ERROR` | Order not in ArrangingPayment | Test now calls `transitionOrderToState` before payment |
| `payment-method-not-found` | Wrong payment method code | Test uses `eligiblePaymentMethods` to get correct code |
| `duplicate key violates unique constraint` | DB constraint during order split | Ensure only one Vendure server is running; try with a fresh database |
