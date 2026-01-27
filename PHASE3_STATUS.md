# Phase 3: Commission & Payment System - Status

## ✅ Phase 3.1: Commission Configuration - COMPLETE
- CommissionService: default rate 15%, per-seller rates via custom fields
- Commission calculation, validation, history (CommissionHistoryService, entity)
- Admin API: `commissionHistory(sellerId, options)`, `sellerCommissionSummary(sellerId, dateRange)`
- Dashboard: Commission card on seller detail (summary + recent history table)

## ✅ Phase 3.2: Split Payment Processing - COMPLETE
- OrderPaymentHandlerService, SplitPaymentService
- Order payment subscriber (OrderPlaced, PaymentSettled) → processOrderPaymentAtomically
- Seller payouts (SellerPayoutService), commission history recorded
- Escrow: HOLD until request → PENDING → approve/reject

## ✅ Phase 3.3: Seller Payout System - COMPLETE
- Shop API: `requestPayout(sellerId, minimumThreshold)`, `payoutHistory`, `pendingPayoutTotal`
- Admin API: `approvePayout`, `rejectPayout`, `pendingPayouts`
- Dashboard: **Pending Payouts** page (Marketplace → Pending Payouts): list, Approve/Reject with reason

## Deferred
- Payout scheduling (weekly/monthly)
- Configurable default commission rate (admin UI)
- Partial refunds / disputes edge cases

## GraphQL (Admin)
- `commissionHistory`, `sellerCommissionSummary`
- `pendingPayouts`, `approvePayout`, `rejectPayout`

## GraphQL (Shop)
- `requestPayout`, `payoutHistory`, `pendingPayoutTotal`
