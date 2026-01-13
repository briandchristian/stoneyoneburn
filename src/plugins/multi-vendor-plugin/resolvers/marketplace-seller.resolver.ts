/**
 * MarketplaceSeller Resolver
 *
 * GraphQL resolver for polymorphic marketplace seller types (IndividualSeller & CompanySeller).
 * Uses code-first GraphQL with @InterfaceType() and @ResolveType() for type discrimination.
 *
 * Part of Phase 2.3: Polymorphic Seller Types
 */

import { Resolver, Query, Args, ResolveField, Parent, ID } from '@nestjs/graphql';
import type { RequestContext } from '@vendure/core';
import { Ctx, Allow, Permission } from '@vendure/core';
import { MarketplaceSellerBase, SellerType } from '../entities/marketplace-seller-base.entity';
import { IndividualSeller } from '../entities/individual-seller.entity';
import { CompanySeller } from '../entities/company-seller.entity';
import { SellerService } from '../services/seller.service';

/**
 * MarketplaceSeller Resolver
 *
 * Handles queries for polymorphic seller types and implements type resolution.
 *
 * @example GraphQL Query:
 * ```graphql
 * query {
 *   seller(id: "1") {
 *     id
 *     name
 *     email
 *     isActive
 *     ... on IndividualSeller {
 *       firstName
 *       lastName
 *       birthDate
 *     }
 *     ... on CompanySeller {
 *       companyName
 *       vatNumber
 *       legalForm
 *     }
 *   }
 * }
 * ```
 */
@Resolver(() => MarketplaceSellerBase)
export class MarketplaceSellerResolver {
  constructor(private sellerService: SellerService) {}

  /**
   * Get seller by ID
   *
   * Returns a polymorphic seller type (IndividualSeller or CompanySeller).
   * The @ResolveType() method determines which concrete type is returned.
   *
   * @param ctx - Request context
   * @param id - Seller ID
   * @returns MarketplaceSellerBase (IndividualSeller or CompanySeller)
   */
  @Query(() => MarketplaceSellerBase, {
    nullable: true,
    description: 'Get a marketplace seller by ID (returns IndividualSeller or CompanySeller)',
  })
  @Allow(Permission.Public)
  async seller(
    @Ctx() ctx: RequestContext,
    @Args('id', { type: () => ID }) id: string
  ): Promise<MarketplaceSellerBase | null> {
    const seller = await this.sellerService.findSellerById(ctx, id);
    if (!seller) {
      return null;
    }

    // Ensure the returned instance is a class instance (not a plain object)
    // This is critical for GraphQL's type resolution to work correctly
    if (seller instanceof IndividualSeller || seller instanceof CompanySeller) {
      return seller;
    }

    // If we get a plain object from the database, we need to convert it to a class instance
    // This typically happens with raw queries or when TypeORM returns plain objects
    if (seller.sellerType === SellerType.INDIVIDUAL) {
      return Object.assign(new IndividualSeller(), seller);
    } else if (seller.sellerType === SellerType.COMPANY) {
      return Object.assign(new CompanySeller(), seller);
    }

    return null;
  }

  /**
   * Get all sellers
   *
   * Returns a list of polymorphic seller types.
   *
   * @param ctx - Request context
   * @returns Array of MarketplaceSellerBase
   */
  @Query(() => [MarketplaceSellerBase], {
    description: 'Get all marketplace sellers (returns IndividualSeller and CompanySeller)',
  })
  @Allow(Permission.Authenticated)
  async sellers(@Ctx() ctx: RequestContext): Promise<MarketplaceSellerBase[]> {
    const sellers = await this.sellerService.findAllSellers(ctx);

    // Ensure all instances are class instances for proper type resolution
    return sellers.map((seller) => {
      if (seller instanceof IndividualSeller || seller instanceof CompanySeller) {
        return seller;
      }

      // Convert plain objects to class instances
      if (seller.sellerType === SellerType.INDIVIDUAL) {
        return Object.assign(new IndividualSeller(), seller);
      } else if (seller.sellerType === SellerType.COMPANY) {
        return Object.assign(new CompanySeller(), seller);
      }

      // Fallback - should not happen with proper database structure
      return Object.assign(new IndividualSeller(), seller);
    });
  }

  /**
   * Type Resolution Method
   *
   * NOTE: In NestJS GraphQL (not TypeGraphQL), type resolution for interfaces
   * is handled in the @InterfaceType() decorator's resolveType option, not via @ResolveType().
   * The resolveType function in marketplace-seller-base.entity.ts handles this.
   *
   * Field resolvers are only needed for computed fields or custom logic.
   * The base class fields (id, name, email, etc.) are already mapped via @Field() decorators.
   */
}
