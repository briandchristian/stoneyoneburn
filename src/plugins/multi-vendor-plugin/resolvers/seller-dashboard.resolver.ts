/**
 * Seller Dashboard Resolver
 *
 * GraphQL resolver for seller dashboard data (Admin API).
 * Part of Phase 2.4: Seller Dashboard Plugin
 *
 * This resolver provides queries for seller dashboard statistics:
 * - sellerDashboardStats: Aggregated statistics
 * - sellerOrderSummary: Order summary with recent orders
 * - sellerProductSummary: Product statistics
 */

import {
  Resolver,
  Query,
  Mutation,
  Args,
  ID,
  ObjectType,
  Field,
  Int,
  Float,
  InputType,
} from '@nestjs/graphql';
import type { RequestContext } from '@vendure/core';
import { Ctx, Allow, ForbiddenError, Permission, RoleService } from '@vendure/core';
import { SellerDashboardService } from '../services/seller-dashboard.service';
import type { SellerDashboardStats } from '../services/seller-dashboard.service';
import { SellerService } from '../services/seller.service';
import { MarketplaceSeller } from '../entities/seller.entity';
import { SellerVerificationStatus } from '../entities/seller.entity';

/**
 * GraphQL Types for Seller Dashboard
 */
@ObjectType()
export class SellerDashboardStatsType implements SellerDashboardStats {
  @Field(() => Int)
  totalProducts!: number;

  @Field(() => Int)
  activeProducts!: number;

  @Field(() => Int)
  totalOrders!: number;

  @Field(() => Int)
  pendingOrders!: number;

  @Field(() => Int)
  completedOrders!: number;

  @Field(() => Int)
  totalRevenue!: number;

  @Field(() => Int)
  pendingRevenue!: number;

  @Field(() => Int)
  completedRevenue!: number;

  @Field(() => Float)
  averageOrderValue!: number;
}

@ObjectType()
export class RecentOrderType {
  @Field(() => ID)
  id!: string;

  @Field()
  orderNumber!: string;

  @Field(() => Int)
  total!: number;

  @Field()
  status!: string;

  @Field()
  createdAt!: Date;
}

@ObjectType()
export class SellerOrderSummaryType {
  @Field(() => ID)
  sellerId!: string;

  @Field(() => Int)
  totalOrders!: number;

  @Field(() => String)
  ordersByStatus!: string; // JSON string representation

  @Field(() => Int)
  totalRevenue!: number;

  @Field(() => String)
  revenueByStatus!: string; // JSON string representation

  @Field(() => [RecentOrderType])
  recentOrders!: RecentOrderType[];
}

@ObjectType()
export class SellerProductSummaryType {
  @Field(() => ID)
  sellerId!: string;

  @Field(() => Int)
  totalProducts!: number;

  @Field(() => Int)
  activeProducts!: number;

  @Field(() => Int)
  inactiveProducts!: number;

  @Field(() => String)
  productsByStatus!: string; // JSON string representation

  @Field(() => Int)
  lowStockProducts!: number;
}

/**
 * Paginated list of marketplace sellers (Admin API).
 * Used by seller dashboard UI to list sellers.
 */
@ObjectType('MarketplaceSellerList')
export class MarketplaceSellerListType {
  @Field(() => [MarketplaceSeller])
  items!: MarketplaceSeller[];

  @Field(() => Int)
  totalItems!: number;
}

/**
 * Input type for updating seller verification status
 */
@InputType()
export class UpdateSellerVerificationStatusInput {
  @Field(() => ID)
  sellerId!: string;

  @Field(() => String)
  status!: SellerVerificationStatus;
}

/**
 * Seller Dashboard Resolver
 *
 * Handles Admin API queries and mutations for seller dashboard data
 */
@Resolver()
export class SellerDashboardResolver {
  constructor(
    private sellerDashboardService: SellerDashboardService,
    private sellerService: SellerService,
    private roleService: RoleService
  ) {}

  /**
   * List marketplace sellers (Admin API).
   * Used by seller dashboard UI to list and select sellers.
   * Access: SuperAdmin OR (ReadCatalog AND ReadOrder). Users with only one of ReadCatalog/ReadOrder are denied.
   */
  @Query(() => MarketplaceSellerListType, {
    description: 'List marketplace sellers with pagination',
  })
  @Allow(Permission.SuperAdmin, Permission.ReadCatalog, Permission.ReadOrder)
  async marketplaceSellers(
    @Ctx() ctx: RequestContext,
    @Args('skip', { type: () => Int, nullable: true, defaultValue: 0 }) skip?: number,
    @Args('take', { type: () => Int, nullable: true, defaultValue: 25 }) take?: number
  ): Promise<MarketplaceSellerListType> {
    const channelId = ctx.channelId;
    const isSuperAdmin = await this.roleService.userHasAnyPermissionsOnChannel(ctx, channelId, [
      Permission.SuperAdmin,
    ]);
    const hasBothCatalogAndOrder = await this.roleService.userHasAllPermissionsOnChannel(
      ctx,
      channelId,
      [Permission.ReadCatalog, Permission.ReadOrder]
    );
    if (!isSuperAdmin && !hasBothCatalogAndOrder) {
      throw new ForbiddenError();
    }
    return await this.sellerService.findAllMarketplaceSellers(ctx, { skip, take });
  }

  /**
   * Get a single marketplace seller by ID (Admin API).
   * Used by the seller dashboard detail view.
   * Access: SuperAdmin OR (ReadCatalog AND ReadOrder).
   */
  @Query(() => MarketplaceSeller, {
    nullable: true,
    description: 'Get a marketplace seller by ID',
  })
  @Allow(Permission.SuperAdmin, Permission.ReadCatalog, Permission.ReadOrder)
  async marketplaceSeller(
    @Ctx() ctx: RequestContext,
    @Args('id', { type: () => ID }) id: string
  ): Promise<MarketplaceSeller | null> {
    const channelId = ctx.channelId;
    const isSuperAdmin = await this.roleService.userHasAnyPermissionsOnChannel(ctx, channelId, [
      Permission.SuperAdmin,
    ]);
    const hasBothCatalogAndOrder = await this.roleService.userHasAllPermissionsOnChannel(
      ctx,
      channelId,
      [Permission.ReadCatalog, Permission.ReadOrder]
    );
    if (!isSuperAdmin && !hasBothCatalogAndOrder) {
      throw new ForbiddenError();
    }
    return await this.sellerService.findMarketplaceSellerById(ctx, id);
  }

  /**
   * Get aggregated statistics for seller dashboard
   */
  @Query(() => SellerDashboardStatsType, {
    description: 'Get aggregated statistics for seller dashboard',
  })
  @Allow(Permission.ReadCatalog, Permission.ReadOrder) // Admins can view seller stats
  async sellerDashboardStats(
    @Ctx() ctx: RequestContext,
    @Args('sellerId', { type: () => ID }) sellerId: string
  ): Promise<SellerDashboardStatsType> {
    const stats = await this.sellerDashboardService.getSellerDashboardStats(ctx, sellerId);
    return stats as SellerDashboardStatsType;
  }

  /**
   * Get order summary for a seller
   */
  @Query(() => SellerOrderSummaryType, {
    description: 'Get order summary for a seller with recent orders',
  })
  @Allow(Permission.ReadOrder)
  async sellerOrderSummary(
    @Ctx() ctx: RequestContext,
    @Args('sellerId', { type: () => ID }) sellerId: string,
    @Args('limit', { type: () => Int, nullable: true, defaultValue: 10 }) limit?: number
  ): Promise<SellerOrderSummaryType> {
    const summary = await this.sellerDashboardService.getSellerOrderSummary(ctx, sellerId, limit);

    // Convert objects to JSON strings for GraphQL
    return {
      ...summary,
      ordersByStatus: JSON.stringify(summary.ordersByStatus),
      revenueByStatus: JSON.stringify(summary.revenueByStatus),
    } as SellerOrderSummaryType;
  }

  /**
   * Get product summary for a seller
   */
  @Query(() => SellerProductSummaryType, {
    description: 'Get product statistics for a seller',
  })
  @Allow(Permission.ReadCatalog)
  async sellerProductSummary(
    @Ctx() ctx: RequestContext,
    @Args('sellerId', { type: () => ID }) sellerId: string
  ): Promise<SellerProductSummaryType> {
    const summary = await this.sellerDashboardService.getSellerProductSummary(ctx, sellerId);

    // Convert objects to JSON strings for GraphQL
    return {
      ...summary,
      productsByStatus: JSON.stringify(summary.productsByStatus),
    } as SellerProductSummaryType;
  }

  /**
   * Update seller verification status
   *
   * Admin-only mutation to verify, reject, or suspend sellers.
   * This is used for seller onboarding and account management.
   */
  @Mutation(() => MarketplaceSeller, {
    description: 'Update the verification status of a seller (admin only)',
  })
  @Allow(Permission.UpdateAdministrator) // Admin-only operation
  async updateSellerVerificationStatus(
    @Ctx() ctx: RequestContext,
    @Args('sellerId', { type: () => ID }) sellerId: string,
    @Args('status', { type: () => String }) status: SellerVerificationStatus
  ): Promise<MarketplaceSeller> {
    return await this.sellerService.updateVerificationStatus(ctx, sellerId, status);
  }
}
