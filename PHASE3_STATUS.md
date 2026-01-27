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
- **Payout Scheduling**: Scheduled task (`processScheduledPayoutsTask`) runs weekly, automatically transitions HOLD → PENDING
  - PayoutSchedulerService: `processScheduledPayouts()`, `getScheduledPayoutStats()`
  - Registered in `vendure-config.ts` schedulerOptions
  - Tests: payout-scheduler.service.test.ts

## ✅ Phase 3.4: Configurable Default Commission Rate - COMPLETE
- GlobalSettings custom field: `defaultCommissionRate` (float, 0-1, default 0.15)
- CommissionService: `getDefaultCommissionRate(ctx)` reads from GlobalSettings, falls back to 0.15
- OrderPaymentHandlerService: uses async `getDefaultCommissionRate(ctx)` instead of constant
- Tests: Updated commission.service.test.ts (21 tests passing)
- **Note**: Admin UI for configuring this field is available via Vendure's built-in GlobalSettings page

## ✅ Phase 3.6: Configurable Payout Schedule Frequency - COMPLETE
- GlobalSettings custom field: `payoutScheduleFrequency` (string: 'weekly' | 'monthly', default 'weekly')
- Payout scheduler task reads frequency from GlobalSettings and respects configured interval
- Task runs daily but only processes payouts when configured interval has elapsed
- Tests: payout-scheduler.task.test.ts (8 tests passing)
- **Note**: Admin UI for configuring this field is available via Vendure's built-in GlobalSettings page

## ✅ Phase 3: COMPLETE
All Phase 3 sub-phases (3.1, 3.2, 3.3, 3.4, 3.6) are complete.

**Note**: Partial refunds and disputes edge cases have been moved to Phase 7.3: Dispute Resolution for better architectural alignment.

## GraphQL (Admin)
- `commissionHistory`, `sellerCommissionSummary`
- `pendingPayouts`, `approvePayout`, `rejectPayout`

## GraphQL (Shop)
- `requestPayout`, `payoutHistory`, `pendingPayoutTotal`
