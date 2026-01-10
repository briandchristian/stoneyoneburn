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
import { MarketplaceSeller } from './entities/seller.entity';
import { SellerService } from './services/seller.service';
import { SellerResolver } from './resolvers/seller.resolver';
import {
  SellerRegistrationError,
  SellerUpdateError,
} from './errors/seller-errors';
import {
  RegisterSellerInput,
  UpdateSellerProfileInput,
} from './resolvers/seller.resolver';

/**
 * Multi-Vendor Plugin
 *
 * Registers the Seller entity and provides multi-vendor functionality.
 */
@VendurePlugin({
  imports: [PluginCommonModule],
  entities: [MarketplaceSeller],
  providers: [SellerService],
  shopApiExtensions: {
    resolvers: [SellerResolver],
    // @ts-ignore - Vendure accepts string schemas at runtime, even though TypeScript expects DocumentNode
    schema: `
      extend type Mutation {
        registerAsSeller(input: RegisterSellerInput!): RegisterSellerResult!
        updateSellerProfile(input: UpdateSellerProfileInput!): UpdateSellerProfileResult!
      }

      extend type Query {
        activeSeller: MarketplaceSeller
        sellerBySlug(slug: String!): MarketplaceSeller
      }

      union RegisterSellerResult = MarketplaceSeller | SellerRegistrationError
      union UpdateSellerProfileResult = MarketplaceSeller | SellerUpdateError
    `,
  },
  configuration: (config) => {
    // Add custom field to Customer entity to link to MarketplaceSeller
    // This allows bidirectional navigation: Customer <-> MarketplaceSeller
    config.customFields.Customer = config.customFields.Customer || [];
    config.customFields.Customer.push({
      name: 'marketplaceSeller',
      type: 'relation',
      entity: MarketplaceSeller, // Use entity class for TypeORM relation
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

    return config;
  },
})
export class MultiVendorPlugin {}
