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

import { Resolver, Query, Args, ID, ObjectType, Field, Int, Float } from '@nestjs/graphql';
import type { RequestContext } from '@vendure/core';
import { Ctx, Allow, Permission } from '@vendure/core';
import { SellerDashboardService } from '../services/seller-dashboard.service';
import type { SellerDashboardStats } from '../services/seller-dashboard.service';

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
 * Seller Dashboard Resolver
 *
 * Handles Admin API queries for seller dashboard data
 */
@Resolver()
export class SellerDashboardResolver {
  constructor(private sellerDashboardService: SellerDashboardService) {}

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
}
