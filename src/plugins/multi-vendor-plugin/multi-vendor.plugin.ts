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
import { MarketplaceSellerSTIBase } from './entities/marketplace-seller-sti-base.entity';
import { SellerService } from './services/seller.service';
import { ProductOwnershipService } from './services/product-ownership.service';
import { SellerDashboardService } from './services/seller-dashboard.service';
import { SellerResolver } from './resolvers/seller.resolver';
import { MarketplaceSellerResolver } from './resolvers/marketplace-seller.resolver';
import { SellerProductResolver } from './resolvers/seller-product.resolver';
import { SellerProductManagementResolver } from './resolvers/seller-product-management.resolver';
import { SellerDashboardResolver } from './resolvers/seller-dashboard.resolver';

/**
 * Multi-Vendor Plugin
 *
 * Registers the Seller entity and provides multi-vendor functionality.
 */
@VendurePlugin({
  imports: [PluginCommonModule],
  // Register base STI entity FIRST, then child entities for TypeORM Single Table Inheritance
  // CRITICAL: Base class MUST be registered for TypeORM metadata reflection during migrations
  // Order matters: base class must be processed before children to build complete metadata
  entities: [MarketplaceSellerSTIBase, IndividualSeller, CompanySeller],
  providers: [SellerService, ProductOwnershipService, SellerDashboardService],
  shopApiExtensions: {
    // Register both resolvers: legacy SellerResolver and new polymorphic MarketplaceSellerResolver
    resolvers: [
      SellerResolver,
      MarketplaceSellerResolver,
      SellerProductResolver,
      SellerProductManagementResolver,
    ],
    // Hybrid schema-first + code-first: Define types and queries in schema string (required by Vendure)
    // This is necessary because Vendure parses schema extensions before NestJS GraphQL decorators register types
    // The schema string defines the GraphQL types, while decorators provide the TypeScript types and resolvers
    // Note: Types are defined here in schema-first style to avoid "Unknown type" errors during schema parsing
    schema: (): DocumentNode => {
      return parse(`
        # Legacy MarketplaceSeller type (backward compatibility)
        type MarketplaceSeller {
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

        extend type Mutation {
          registerAsSeller(input: RegisterSellerInput!): MarketplaceSeller!
          updateSellerProfile(input: UpdateSellerProfileInput!): MarketplaceSeller!
          createSellerProduct(input: CreateSellerProductInput!): Product!
          updateSellerProduct(input: UpdateSellerProductInput!): Product!
          deleteSellerProduct(productId: ID!): DeletionResponse!
        }

        extend type Query {
          activeSeller: MarketplaceSeller
          sellerBySlug(slug: String!): MarketplaceSeller
          seller(id: ID!): MarketplaceSellerBase
          sellers: [MarketplaceSellerBase!]!
          sellerProducts(sellerId: ID!): [Product!]!
        }
      `);
    },
  },
  adminApiExtensions: {
    resolvers: [SellerDashboardResolver],
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
          averageOrderValue: Int!
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

        extend type Query {
          sellerDashboardStats(sellerId: ID!): SellerDashboardStats!
          sellerOrderSummary(sellerId: ID!, limit: Int): SellerOrderSummary!
          sellerProductSummary(sellerId: ID!): SellerProductSummary!
        }

        # Seller types for Admin API schema validation
        # These types are required for custom field relations even if not exposed via queries/mutations
        
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
    // For polymorphic relations, we use IndividualSeller as the base entity type
    // TypeORM STI will handle the discriminator automatically
    config.customFields.Customer.push({
      name: 'marketplaceSeller',
      type: 'relation',
      entity: IndividualSeller, // Use one of the concrete implementations for TypeORM
      nullable: true,
      label: [{ languageCode: LanguageCode.en, value: 'Marketplace Seller Account' }],
      description: [
        {
          languageCode: LanguageCode.en,
          value:
            'The marketplace seller account (IndividualSeller or CompanySeller) associated with this customer',
        },
      ],
      public: false,
      internal: true,
    });

    // Add custom field to Product entity to link to MarketplaceSeller
    // Phase 2.3: Seller-Product Association
    // This enables products to be owned by sellers in the marketplace
    config.customFields.Product = config.customFields.Product || [];
    // For polymorphic relations, we use IndividualSeller as the base entity type
    // TypeORM STI will handle the discriminator automatically
    // Note: This field is internal (admin-only) because IndividualSeller type
    // is only defined in Shop API schema. For Shop API access, seller info
    // can be exposed through Product resolvers or separate queries.
    config.customFields.Product.push({
      name: 'seller',
      type: 'relation',
      entity: IndividualSeller, // Use one of the concrete implementations for TypeORM
      nullable: true, // Initially nullable to allow existing products; can be made required later
      label: [{ languageCode: LanguageCode.en, value: 'Seller' }],
      description: [
        {
          languageCode: LanguageCode.en,
          value: 'The marketplace seller who owns this product',
        },
      ],
      public: false, // Not exposed in Shop API (IndividualSeller type not in Admin API schema)
      internal: true, // Admin-only for now; Shop API can access via resolvers/queries
    });

    return config;
  },
})
export class MultiVendorPlugin {}
