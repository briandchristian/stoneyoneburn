# Phase 3.1: Commission History Tracking

## Overview

Commission history tracking allows the platform to maintain a complete audit trail of all commission calculations and payments. This is essential for:
- Financial reporting and reconciliation
- Dispute resolution
- Tax compliance
- Seller transparency
- Platform analytics

## Requirements

### Functional Requirements

1. **Record Commission Events**
   - Track commission calculation for each order
   - Record commission rate used (per-seller or default)
   - Store order details (order ID, order total, commission amount, seller payout)
   - Timestamp all commission events

2. **Query Commission History**
   - Query by seller ID
   - Query by date range
   - Query by order ID
   - Support pagination

3. **Commission Aggregation**
   - Total commissions per seller
   - Total commissions by time period
   - Commission trends over time

### Technical Requirements

1. **Data Model**
   - CommissionHistory entity with:
     - Order reference
     - Seller reference
     - Commission rate used
     - Order total
     - Commission amount
     - Seller payout amount
     - Timestamp
     - Status (calculated, paid, refunded)

2. **Service Layer**
   - CommissionHistoryService for:
     - Creating commission history records
     - Querying commission history
     - Aggregating commission data

3. **GraphQL API**
   - Query: `commissionHistory(sellerId: ID!, options: CommissionHistoryListOptions)`
   - Query: `sellerCommissionSummary(sellerId: ID!, dateRange: DateRange)`

## TDD Approach

Following Test-Driven Development:

1. **Write Tests First (RED)**
   - Unit tests for CommissionHistoryService
   - Contract tests for GraphQL API
   - Integration tests for end-to-end flow

2. **Implement Minimal Code (GREEN)**
   - Create CommissionHistory entity
   - Implement CommissionHistoryService
   - Create GraphQL resolver

3. **Refactor**
   - Optimize queries
   - Add indexes
   - Improve error handling

## Database Schema

```sql
CREATE TABLE commission_history (
  id SERIAL PRIMARY KEY,
  order_id INTEGER NOT NULL REFERENCES "order"(id),
  seller_id INTEGER NOT NULL REFERENCES marketplace_seller(id),
  commission_rate DECIMAL(5,4) NOT NULL, -- e.g., 0.1500 for 15%
  order_total INTEGER NOT NULL, -- in cents
  commission_amount INTEGER NOT NULL, -- in cents
  seller_payout INTEGER NOT NULL, -- in cents
  status VARCHAR(20) NOT NULL DEFAULT 'calculated', -- calculated, paid, refunded
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_commission_history_seller_id ON commission_history(seller_id);
CREATE INDEX idx_commission_history_order_id ON commission_history(order_id);
CREATE INDEX idx_commission_history_created_at ON commission_history(created_at);
```

## GraphQL Schema

```graphql
type CommissionHistory implements Node {
  id: ID!
  createdAt: DateTime!
  updatedAt: DateTime!
  order: Order!
  seller: MarketplaceSeller!
  commissionRate: Float!
  orderTotal: Money!
  commissionAmount: Money!
  sellerPayout: Money!
  status: CommissionHistoryStatus!
}

enum CommissionHistoryStatus {
  CALCULATED
  PAID
  REFUNDED
}

type CommissionHistoryList implements PaginatedList {
  items: [CommissionHistory!]!
  totalItems: Int!
}

input CommissionHistoryListOptions {
  skip: Int
  take: Int
  sort: CommissionHistorySortParameter
  filter: CommissionHistoryFilterParameter
}

input CommissionHistoryFilterParameter {
  sellerId: IDOperators
  orderId: IDOperators
  status: StringOperators
  createdAt: DateOperators
}

type SellerCommissionSummary {
  sellerId: ID!
  totalCommissions: Money!
  totalPayouts: Money!
  totalOrders: Int!
  dateRange: DateRange!
  commissionsByStatus: JSON!
}
```

## Implementation Plan

1. **Entity Creation**
   - Create CommissionHistory entity
   - Add database indexes
   - Create migration

2. **Service Implementation**
   - CommissionHistoryService with:
     - `createCommissionHistory()` - Record commission event
     - `getCommissionHistory()` - Query with filters
     - `getSellerCommissionSummary()` - Aggregate data

3. **GraphQL Resolver**
   - Query: `commissionHistory`
   - Query: `sellerCommissionSummary`

4. **Integration**
   - Hook into order completion flow
   - Record commission when order is paid
   - Update status when payout is processed

## Testing Strategy

### Unit Tests
- CommissionHistoryService methods
- Commission calculation accuracy
- Query filtering and pagination
- Aggregation calculations

### Integration Tests
- End-to-end commission recording
- GraphQL query execution
- Database persistence
- Status transitions

### Edge Cases
- Multiple orders from same seller
- Commission rate changes mid-period
- Refunded orders
- Zero-commission orders
