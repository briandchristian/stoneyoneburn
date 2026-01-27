/**
 * Multi-Vendor Plugin
 *
 * Core plugin for multi-vendor marketplace functionality.
 * This plugin provides:
 * - Seller entity and management
 * - Seller-Customer relationship
 * - Seller verification workflow
 * - Seller registration and onboarding
 *
 * Part of Phase 2: Multi-Vendor Core Plugin
 */

import { PluginCommonModule, VendurePlugin, LanguageCode } from '@vendure/core';
import { parse, DocumentNode } from 'graphql';
import { IndividualSeller } from './entities/individual-seller.entity';
import { CompanySeller } from './entities/company-seller.entity';
import { SellerPayout } from './entities/seller-payout.entity';
import { CommissionHistory } from './entities/commission-history.entity';
import { Review } from './entities/review.entity';
import { MarketplaceSellerSTIBase } from './entities/marketplace-seller-sti-base.entity';
import { MarketplaceSeller } from './entities/seller.entity';
import { SellerService } from './services/seller.service';
import { ProductOwnershipService } from './services/product-ownership.service';
import { SellerDashboardService } from './services/seller-dashboard.service';
import { CommissionService } from './services/commission.service';
import { CommissionHistoryService } from './services/commission-history.service';
import { SplitPaymentService } from './services/split-payment.service';
import { SellerPayoutService } from './services/seller-payout.service';
import { OrderPaymentHandlerService } from './services/order-payment-handler.service';
import { PayoutSchedulerService } from './services/payout-scheduler.service';
import { ReviewService } from './services/review.service';
import { SellerResolver } from './resolvers/seller.resolver';
import { MarketplaceSellerResolver } from './resolvers/marketplace-seller.resolver';
import { SellerProductResolver } from './resolvers/seller-product.resolver';
import { SellerProductManagementResolver } from './resolvers/seller-product-management.resolver';
import { SellerDashboardResolver } from './resolvers/seller-dashboard.resolver';
import { CommissionHistoryResolver } from './resolvers/commission-history.resolver';
import { SellerPayoutResolver } from './resolvers/seller-payout.resolver';
import { SellerPayoutAdminResolver } from './resolvers/seller-payout-admin.resolver';
import { ReviewResolver } from './resolvers/review.resolver';
import { ReviewAdminResolver } from './resolvers/review-admin.resolver';
import { OrderPaymentSubscriber } from './subscribers/order-payment.subscriber';

/**
 * Multi-Vendor Plugin
 *
 * Registers the Seller entity and provides multi-vendor functionality.
 */
@VendurePlugin({
  imports: [PluginCommonModule],
  dashboard: './dashboard/index.tsx',
  // Register entities for TypeORM
  // NOTE: MarketplaceSeller (non-STI) is used by most resolvers and custom fields
  // STI entities (MarketplaceSellerSTIBase, IndividualSeller, CompanySeller) are kept
  // for future polymorphic support but use a different table to avoid conflicts
  // For now, we register MarketplaceSeller as the primary entity
  entities: [MarketplaceSeller, SellerPayout, CommissionHistory, Review as any],
  // STI entities commented out to avoid table name conflict with MarketplaceSeller
  // Both use 'marketplace_seller' table which causes TypeORM metadata issues
  // TODO: Migrate to STI by updating all resolvers to use IndividualSeller/CompanySeller
  // or use different table names for STI entities
  // entities: [MarketplaceSellerSTIBase, IndividualSeller, CompanySeller, SellerPayout],
  providers: [
    SellerService,
    ProductOwnershipService,
    SellerDashboardService,
    CommissionService,
    CommissionHistoryService,
    SplitPaymentService,
    SellerPayoutService,
    OrderPaymentHandlerService,
    OrderPaymentSubscriber,
    PayoutSchedulerService,
    ReviewService,
  ],
  shopApiExtensions: {
    // Register both resolvers: legacy SellerResolver and new polymorphic MarketplaceSellerResolver
    resolvers: [
      SellerResolver,
      MarketplaceSellerResolver,
      SellerProductResolver,
      SellerProductManagementResolver,
      SellerPayoutResolver,
      ReviewResolver,
    ],
    // Hybrid schema-first + code-first: Define types and queries in schema string (required by Vendure)
    // This is necessary because Vendure parses schema extensions before NestJS GraphQL decorators register types
    // The schema string defines the GraphQL types, while decorators provide the TypeScript types and resolvers
    // Note: Types are defined here in schema-first style to avoid "Unknown type" errors during schema parsing
    schema: (): DocumentNode => {
      return parse(`
        # Legacy MarketplaceSeller type (backward compatibility).
        # Must match Admin API definition: implements Node, includes customer.
        type MarketplaceSeller implements Node {
          id: ID!
          shopName: String!
          shopDescription: String
          shopSlug: String!
          shopBannerAssetId: Int
          shopLogoAssetId: Int
          businessName: String
          taxId: String
          verificationStatus: SellerVerificationStatus!
          isActive: Boolean!
          createdAt: DateTime!
          updatedAt: DateTime!
          customer: Customer!
          customerId: ID!
        }

        # Polymorphic MarketplaceSellerBase interface (code-first types)
        interface MarketplaceSellerBase {
          id: ID!
          name: String!
          email: String!
          isActive: Boolean!
          verificationStatus: SellerVerificationStatus!
          createdAt: DateTime!
          updatedAt: DateTime!
          sellerType: SellerType!
          customerId: ID!
          commissionRate: Float
        }

        type IndividualSeller implements MarketplaceSellerBase {
          id: ID!
          name: String!
          email: String!
          isActive: Boolean!
          verificationStatus: SellerVerificationStatus!
          createdAt: DateTime!
          updatedAt: DateTime!
          sellerType: SellerType!
          customerId: ID!
          firstName: String!
          lastName: String!
          birthDate: DateTime
          commissionRate: Float
        }

        type CompanySeller implements MarketplaceSellerBase {
          id: ID!
          name: String!
          email: String!
          isActive: Boolean!
          verificationStatus: SellerVerificationStatus!
          createdAt: DateTime!
          updatedAt: DateTime!
          sellerType: SellerType!
          customerId: ID!
          companyName: String!
          vatNumber: String!
          legalForm: String
          commissionRate: Float
        }

        enum SellerType {
          INDIVIDUAL
          COMPANY
        }

        enum SellerVerificationStatus {
          PENDING
          VERIFIED
          REJECTED
          SUSPENDED
        }

        # Input types for mutations
        input RegisterSellerInput {
          shopName: String!
          shopDescription: String
          businessName: String
        }

        input UpdateSellerProfileInput {
          sellerId: ID!
          shopName: String
          shopDescription: String
          shopBannerAssetId: Int
          shopLogoAssetId: Int
          businessName: String
          taxId: String
        }

        input CreateSellerProductInput {
          translations: [ProductTranslationInput!]!
          enabled: Boolean
          featuredAssetId: ID
          assetIds: [ID!]
          facetValueIds: [ID!]
        }

        input UpdateSellerProductInput {
          productId: ID!
          translations: [ProductTranslationInput!]
          enabled: Boolean
          featuredAssetId: ID
          assetIds: [ID!]
          facetValueIds: [ID!]
        }

        input ProductTranslationInput {
          languageCode: String!
          name: String!
          slug: String!
          description: String
        }

        type SellerProductDeletionResponse {
          result: String!
          message: String
        }

        # Seller Payout Types (Phase 3.3)
        type PayoutRequestResult {
          id: ID!
          sellerId: ID!
          amount: Int!
          status: String!
        }

        type SellerPayout {
          id: ID!
          createdAt: DateTime!
          updatedAt: DateTime!
          sellerId: ID!
          orderId: ID!
          amount: Int!
          commission: Int!
          status: String!
          releasedAt: DateTime
          completedAt: DateTime
          failureReason: String
        }

        # Review Types (Phase 4)
        enum ReviewStatus {
          PENDING
          APPROVED
          REJECTED
        }

        type Review {
          id: ID!
          createdAt: DateTime!
          updatedAt: DateTime!
          productId: ID!
          customerId: ID!
          sellerId: Int!
          rating: Int!
          title: String!
          body: String!
          status: ReviewStatus!
          verified: Boolean!
          helpfulCount: Int!
          rejectionReason: String
        }

        input SubmitReviewInput {
          productId: ID!
          rating: Int!
          title: String!
          body: String!
        }

        input ReviewListOptionsInput {
          productId: ID
          sellerId: Int
          customerId: ID
          status: ReviewStatus
          skip: Int
          take: Int
        }

        type ReviewList {
          items: [Review!]!
          totalItems: Int!
        }

        extend type Mutation {
          registerAsSeller(input: RegisterSellerInput!): MarketplaceSeller!
          updateSellerProfile(input: UpdateSellerProfileInput!): MarketplaceSeller!
          createSellerProduct(input: CreateSellerProductInput!): Product!
          updateSellerProduct(input: UpdateSellerProductInput!): Product!
          deleteSellerProduct(productId: ID!): SellerProductDeletionResponse!
          requestPayout(sellerId: ID!, minimumThreshold: Int): PayoutRequestResult!
          submitReview(input: SubmitReviewInput!): Review!
        }

        extend type Query {
          activeSeller: MarketplaceSeller
          sellerBySlug(slug: String!): MarketplaceSeller
          seller(id: ID!): MarketplaceSellerBase
          sellers: [MarketplaceSellerBase!]!
          sellerProducts(sellerId: ID!, options: ProductListOptions): ProductList!
          payoutHistory(sellerId: ID!): [SellerPayout!]!
          pendingPayoutTotal(sellerId: ID!): Int!
          getReviews(options: ReviewListOptionsInput!): ReviewList!
        }
      `);
    },
  },
  adminApiExtensions: {
    resolvers: [
      SellerDashboardResolver,
      CommissionHistoryResolver,
      SellerPayoutAdminResolver,
      ReviewAdminResolver,
    ],
    schema: (): DocumentNode => {
      return parse(`
        # Seller Dashboard Types (Phase 2.4)
        type SellerDashboardStats {
          totalProducts: Int!
          activeProducts: Int!
          totalOrders: Int!
          pendingOrders: Int!
          completedOrders: Int!
          totalRevenue: Int!
          pendingRevenue: Int!
          completedRevenue: Int!
          averageOrderValue: Float!
        }

        type RecentOrder {
          id: ID!
          orderNumber: String!
          total: Int!
          status: String!
          createdAt: DateTime!
        }

        type SellerOrderSummary {
          sellerId: ID!
          totalOrders: Int!
          ordersByStatus: String!
          totalRevenue: Int!
          revenueByStatus: String!
          recentOrders: [RecentOrder!]!
        }

        type SellerProductSummary {
          sellerId: ID!
          totalProducts: Int!
          activeProducts: Int!
          inactiveProducts: Int!
          productsByStatus: String!
          lowStockProducts: Int!
        }

        # Commission History Types (Phase 3.1)
        type CommissionHistory implements Node {
          id: ID!
          createdAt: DateTime!
          updatedAt: DateTime!
          orderId: ID!
          sellerId: ID!
          commissionRate: Float!
          orderTotal: Int!
          commissionAmount: Int!
          sellerPayout: Int!
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

        input CommissionHistoryFilterInput {
          orderId: ID
          status: CommissionHistoryStatus
          startDate: DateTime
          endDate: DateTime
        }

        input CommissionHistoryListOptions {
          skip: Int
          take: Int
          filter: CommissionHistoryFilterInput
        }

        type SellerCommissionSummary {
          sellerId: ID!
          totalCommissions: Int!
          totalPayouts: Int!
          totalOrders: Int!
          commissionsByStatus: String!
        }

        input DateRangeInput {
          startDate: DateTime
          endDate: DateTime
        }

        # Seller Payout Admin Types (Phase 3.3)
        type PayoutApprovalResult {
          id: ID!
          sellerId: ID!
          orderId: ID!
          amount: Int!
          status: String!
          failureReason: String
        }

        type SellerPayout {
          id: ID!
          createdAt: DateTime!
          updatedAt: DateTime!
          sellerId: ID!
          orderId: ID!
          amount: Int!
          commission: Int!
          status: String!
          releasedAt: DateTime
          completedAt: DateTime
          failureReason: String
        }

        extend type Mutation {
          approvePayout(payoutId: ID!): PayoutApprovalResult!
          rejectPayout(payoutId: ID!, reason: String!): PayoutApprovalResult!
        }

        type MarketplaceSellerList implements PaginatedList {
          items: [MarketplaceSeller!]!
          totalItems: Int!
        }

        # Review Admin Types (Phase 4)
        enum ReviewStatus {
          PENDING
          APPROVED
          REJECTED
        }

        type Review {
          id: ID!
          createdAt: DateTime!
          updatedAt: DateTime!
          productId: ID!
          customerId: ID!
          sellerId: Int!
          rating: Int!
          title: String!
          body: String!
          status: ReviewStatus!
          verified: Boolean!
          helpfulCount: Int!
          rejectionReason: String
        }

        type ReviewList {
          items: [Review!]!
          totalItems: Int!
        }

        extend type Query {
          marketplaceSellers(skip: Int, take: Int): MarketplaceSellerList!
          marketplaceSeller(id: ID!): MarketplaceSeller
          sellerDashboardStats(sellerId: ID!): SellerDashboardStats!
          sellerOrderSummary(sellerId: ID!, limit: Int): SellerOrderSummary!
          sellerProductSummary(sellerId: ID!): SellerProductSummary!
          commissionHistory(sellerId: ID!, options: CommissionHistoryListOptions): CommissionHistoryList!
          sellerCommissionSummary(sellerId: ID!, dateRange: DateRangeInput): SellerCommissionSummary!
          pendingPayouts: [SellerPayout!]!
          pendingReviews: ReviewList!
        }

        extend type Mutation {
          updateSellerVerificationStatus(sellerId: ID!, status: SellerVerificationStatus!): MarketplaceSeller!
          approveReview(reviewId: ID!): Review!
          rejectReview(reviewId: ID!, rejectionReason: String!): Review!
        }

        # Seller types for Admin API schema validation.
        # Must match Shop API definition: implements Node, includes customer.
        # Required for custom field relations and PaginatedList (marketplaceSellers query).
        type MarketplaceSeller implements Node {
          id: ID!
          shopName: String!
          shopDescription: String
          shopSlug: String!
          shopBannerAssetId: Int
          shopLogoAssetId: Int
          businessName: String
          taxId: String
          verificationStatus: SellerVerificationStatus!
          isActive: Boolean!
          createdAt: DateTime!
          updatedAt: DateTime!
          customer: Customer!
          customerId: ID!
        }
        
        interface MarketplaceSellerBase {
          id: ID!
          name: String!
          email: String!
          isActive: Boolean!
          verificationStatus: SellerVerificationStatus!
          createdAt: DateTime!
          updatedAt: DateTime!
          sellerType: SellerType!
          customerId: ID!
        }

        type IndividualSeller implements MarketplaceSellerBase {
          id: ID!
          name: String!
          email: String!
          isActive: Boolean!
          verificationStatus: SellerVerificationStatus!
          createdAt: DateTime!
          updatedAt: DateTime!
          sellerType: SellerType!
          customerId: ID!
          firstName: String!
          lastName: String!
          birthDate: DateTime
        }

        type CompanySeller implements MarketplaceSellerBase {
          id: ID!
          name: String!
          email: String!
          isActive: Boolean!
          verificationStatus: SellerVerificationStatus!
          createdAt: DateTime!
          updatedAt: DateTime!
          sellerType: SellerType!
          customerId: ID!
          companyName: String!
          vatNumber: String!
          legalForm: String
        }

        enum SellerType {
          INDIVIDUAL
          COMPANY
        }

        enum SellerVerificationStatus {
          PENDING
          VERIFIED
          REJECTED
          SUSPENDED
        }
      `);
    },
  },
  configuration: (config) => {
    // Add custom field to Customer entity to link to MarketplaceSeller
    // This allows bidirectional navigation: Customer <-> MarketplaceSeller
    config.customFields.Customer = config.customFields.Customer || [];
    // Use MarketplaceSeller entity (non-STI) to match resolver implementations
    config.customFields.Customer.push({
      name: 'marketplaceSeller',
      type: 'relation',
      entity: MarketplaceSeller, // Use MarketplaceSeller to match resolver implementations
      nullable: true,
      label: [{ languageCode: LanguageCode.en, value: 'Marketplace Seller Account' }],
      description: [
        {
          languageCode: LanguageCode.en,
          value: 'The marketplace seller account associated with this customer',
        },
      ],
      public: false,
      internal: true,
    });

    // Add custom field to Product entity to link to MarketplaceSeller
    // Phase 2.3: Seller-Product Association
    // This enables products to be owned by sellers in the marketplace
    config.customFields.Product = config.customFields.Product || [];
    // Use MarketplaceSeller entity (non-STI) to match resolver implementations
    // Note: This field is internal (admin-only). For Shop API access, seller info
    // can be exposed through Product resolvers or separate queries.
    config.customFields.Product.push({
      name: 'seller',
      type: 'relation',
      entity: MarketplaceSeller, // Use MarketplaceSeller to match resolver implementations
      nullable: true, // Initially nullable to allow existing products; can be made required later
      label: [{ languageCode: LanguageCode.en, value: 'Seller' }],
      description: [
        {
          languageCode: LanguageCode.en,
          value: 'The marketplace seller who owns this product',
        },
      ],
      public: false, // Not exposed in Shop API
      internal: true, // Admin-only for now; Shop API can access via resolvers/queries
    });

    // Add custom field to GlobalSettings for default commission rate
    // Phase 3.4: Configurable Default Commission Rate
    // Allows admins to configure the default commission rate via GlobalSettings UI
    config.customFields.GlobalSettings = config.customFields.GlobalSettings || [];
    config.customFields.GlobalSettings.push({
      name: 'defaultCommissionRate',
      type: 'float',
      nullable: true, // Nullable to allow migration from hardcoded value
      defaultValue: 0.15, // Default 15% (matches DEFAULT_COMMISSION_RATE constant)
      label: [{ languageCode: LanguageCode.en, value: 'Default Commission Rate' }],
      description: [
        {
          languageCode: LanguageCode.en,
          value:
            'Default commission rate for marketplace sellers (0.0 to 1.0, e.g., 0.15 = 15%). Can be overridden per-seller.',
        },
      ],
      min: 0,
      max: 1,
      step: 0.01,
      ui: {
        component: 'number-form-input',
      },
      requiresPermission: ['UpdateGlobalSettings'],
    });

    // Add custom field to GlobalSettings for payout schedule frequency
    // Phase 3.6: Configurable Payout Schedule Frequency
    // Allows admins to configure how often payouts are automatically released (weekly/monthly)
    config.customFields.GlobalSettings.push({
      name: 'payoutScheduleFrequency',
      type: 'string',
      nullable: true, // Nullable to allow migration from hardcoded value
      defaultValue: 'weekly', // Default weekly (matches current behavior)
      label: [{ languageCode: LanguageCode.en, value: 'Payout Schedule Frequency' }],
      description: [
        {
          languageCode: LanguageCode.en,
          value:
            'How often payouts are automatically released from HOLD to PENDING status (weekly or monthly)',
        },
      ],
      options: [
        {
          value: 'weekly',
          label: [{ languageCode: LanguageCode.en, value: 'Weekly' }],
        },
        {
          value: 'monthly',
          label: [{ languageCode: LanguageCode.en, value: 'Monthly' }],
        },
      ],
      ui: {
        component: 'select-form-input',
      },
      requiresPermission: ['UpdateGlobalSettings'],
    });

    return config;
  },
})
export class MultiVendorPlugin {}
