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
import { SellerResolver } from './resolvers/seller.resolver';
import { MarketplaceSellerResolver } from './resolvers/marketplace-seller.resolver';
import { SellerProductResolver } from './resolvers/seller-product.resolver';

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
  providers: [SellerService, ProductOwnershipService],
  shopApiExtensions: {
    // Register both resolvers: legacy SellerResolver and new polymorphic MarketplaceSellerResolver
    resolvers: [SellerResolver, MarketplaceSellerResolver, SellerProductResolver],
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

        extend type Mutation {
          registerAsSeller(input: RegisterSellerInput!): MarketplaceSeller!
          updateSellerProfile(input: UpdateSellerProfileInput!): MarketplaceSeller!
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
      public: true, // Visible in Shop API for product pages
      internal: false, // Not admin-only, customers can see who sells products
    });

    return config;
  },
})
export class MultiVendorPlugin {}
