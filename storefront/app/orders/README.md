# Order Management System

## Overview

The Order Management System allows customers to view their order history and track individual order details. This is a core feature of Phase 1 Single-Vendor MVP.

## Features

### Order History Page (`/orders`)
- Displays a list of all customer orders
- Shows order code, date, status, and total
- Pagination support for large order lists
- Empty state when no orders exist
- Loading states during data fetch

### Order Detail Page (`/orders/[code]`)
- Displays complete order information
- Order summary (code, date, status, totals)
- Order items with product details
- Shipping and billing addresses
- Payment information
- Order status tracking
- Fulfillment information (if available)

## GraphQL Queries

### GET_ORDERS
Fetches a paginated list of orders for the authenticated customer.

### GET_ORDER_BY_CODE
Fetches detailed information for a specific order by its code.

## Components

- `OrderHistoryPage` - Main page component for order list
- `OrderDetailPage` - Page component for individual order details
- `OrderCard` - Reusable component for displaying order summary in list
- `OrderSummary` - Component for displaying order totals and summary

## Testing

All components follow TDD principles:
1. Tests written first (red)
2. Implementation to make tests pass (green)
3. Refactoring while keeping tests passing

Test files:
- `app/orders/__tests__/OrderHistoryPage.test.tsx`
- `app/orders/[code]/__tests__/OrderDetailPage.test.tsx`

## User Flow

1. Customer completes checkout and order is placed
2. Customer navigates to `/orders` to view order history
3. Customer clicks on an order to view details at `/orders/[code]`
4. Customer can track order status and view all order information
