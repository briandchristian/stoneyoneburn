/**
 * Multi-Vendor Plugin
 *
 * Exports for the multi-vendor plugin
 */

export { MultiVendorPlugin } from './multi-vendor.plugin';

// Legacy MarketplaceSeller (for backward compatibility during migration)
export { MarketplaceSeller, SellerVerificationStatus } from './entities/seller.entity';

// Polymorphic MarketplaceSeller types (new code-first implementation)
export {
  MarketplaceSellerBase,
  SellerType,
  SellerVerificationStatus as MarketplaceSellerVerificationStatus,
} from './entities/marketplace-seller-base.entity';
export { IndividualSeller } from './entities/individual-seller.entity';
export { CompanySeller, CompanyLegalForm } from './entities/company-seller.entity';

// Services
export { SellerService } from './services/seller.service';

// Resolvers
export {
  SellerResolver,
  RegisterSellerInput,
  UpdateSellerProfileInput,
} from './resolvers/seller.resolver';
export { MarketplaceSellerResolver } from './resolvers/marketplace-seller.resolver';

// Errors
export {
  SellerRegistrationError,
  SellerUpdateError,
  SellerErrorCode,
} from './errors/seller-errors';
