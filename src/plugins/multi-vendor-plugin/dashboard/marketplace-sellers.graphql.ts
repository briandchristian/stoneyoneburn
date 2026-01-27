/**
 * GraphQL operations for the Multi-Vendor Dashboard extension.
 * Uses marketplace sellers and seller dashboard Admin API queries.
 *
 * marketplaceSellersListDocument uses parse() because the introspected schema
 * may not include marketplaceSellers until the dashboard is built against
 * a running server with the multi-vendor plugin.
 */

import { parse } from 'graphql';
import { graphql } from '@/gql';

const marketplaceSellersListString = `
  query MarketplaceSellersList($skip: Int, $take: Int) {
    marketplaceSellers(skip: $skip, take: $take) {
      items {
        id
        shopName
        shopSlug
        shopDescription
        businessName
        verificationStatus
        isActive
        createdAt
        updatedAt
        customerId
      }
      totalItems
    }
  }
`;

export const marketplaceSellersListDocument = parse(marketplaceSellersListString);

export const sellerDashboardStatsDocument = graphql(`
  query SellerDashboardStats($sellerId: ID!) {
    sellerDashboardStats(sellerId: $sellerId) {
      totalProducts
      activeProducts
      totalOrders
      pendingOrders
      completedOrders
      totalRevenue
      pendingRevenue
      completedRevenue
      averageOrderValue
    }
  }
`);

export const sellerOrderSummaryDocument = graphql(`
  query SellerOrderSummary($sellerId: ID!, $limit: Int) {
    sellerOrderSummary(sellerId: $sellerId, limit: $limit) {
      sellerId
      totalOrders
      ordersByStatus
      totalRevenue
      revenueByStatus
      recentOrders {
        id
        orderNumber
        total
        status
        createdAt
      }
    }
  }
`);

export const sellerProductSummaryDocument = graphql(`
  query SellerProductSummary($sellerId: ID!) {
    sellerProductSummary(sellerId: $sellerId) {
      sellerId
      totalProducts
      activeProducts
      inactiveProducts
      productsByStatus
      lowStockProducts
    }
  }
`);

const marketplaceSellerDetailString = `
  query MarketplaceSellerDetail($id: ID!) {
    marketplaceSeller(id: $id) {
      id
      shopName
      shopSlug
      verificationStatus
      isActive
    }
  }
`;
export const marketplaceSellerDetailDocument = parse(marketplaceSellerDetailString);

const updateSellerVerificationStatusMutationString = `
  mutation UpdateSellerVerificationStatus($sellerId: ID!, $status: SellerVerificationStatus!) {
    updateSellerVerificationStatus(sellerId: $sellerId, status: $status) {
      id
      verificationStatus
    }
  }
`;
export const updateSellerVerificationStatusMutationDocument = parse(
  updateSellerVerificationStatusMutationString
);

/* Phase 3.3: Pending Payouts (Admin) */
const pendingPayoutsQueryString = `
  query PendingPayouts {
    pendingPayouts {
      id
      sellerId
      orderId
      amount
      commission
      status
      createdAt
      releasedAt
      failureReason
    }
  }
`;
export const pendingPayoutsDocument = parse(pendingPayoutsQueryString);

const approvePayoutMutationString = `
  mutation ApprovePayout($payoutId: ID!) {
    approvePayout(payoutId: $payoutId) {
      id
      sellerId
      orderId
      amount
      status
    }
  }
`;
export const approvePayoutMutationDocument = parse(approvePayoutMutationString);

const rejectPayoutMutationString = `
  mutation RejectPayout($payoutId: ID!, $reason: String!) {
    rejectPayout(payoutId: $payoutId, reason: $reason) {
      id
      sellerId
      orderId
      amount
      status
      failureReason
    }
  }
`;
export const rejectPayoutMutationDocument = parse(rejectPayoutMutationString);

/* Phase 3.1: Commission summary + history (seller detail) */
const sellerCommissionSummaryQueryString = `
  query SellerCommissionSummary($sellerId: ID!, $dateRange: DateRangeInput) {
    sellerCommissionSummary(sellerId: $sellerId, dateRange: $dateRange) {
      sellerId
      totalCommissions
      totalPayouts
      totalOrders
      commissionsByStatus
    }
  }
`;
export const sellerCommissionSummaryDocument = parse(sellerCommissionSummaryQueryString);

const commissionHistoryQueryString = `
  query CommissionHistory($sellerId: ID!, $options: CommissionHistoryListOptions) {
    commissionHistory(sellerId: $sellerId, options: $options) {
      items {
        id
        orderId
        commissionRate
        orderTotal
        commissionAmount
        sellerPayout
        status
        createdAt
      }
      totalItems
    }
  }
`;
export const commissionHistoryDocument = parse(commissionHistoryQueryString);
