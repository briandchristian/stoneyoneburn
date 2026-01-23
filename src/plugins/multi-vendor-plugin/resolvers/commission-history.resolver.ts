/**
 * Commission History Resolver
 *
 * GraphQL resolver for commission history queries (Admin API).
 * Part of Phase 3.1: Commission Configuration
 *
 * This resolver provides queries for commission history:
 * - commissionHistory: Paginated commission history with filtering
 * - sellerCommissionSummary: Aggregated commission data for a seller
 */

import { Resolver, Query, Args, ID, ObjectType, Field, Int, InputType } from '@nestjs/graphql';
import type { RequestContext } from '@vendure/core';
import { Ctx, Allow, Permission } from '@vendure/core';
import {
  CommissionHistoryService,
  type CommissionHistoryRecord,
  type SellerCommissionSummary,
} from '../services/commission-history.service';
import { CommissionHistory, CommissionHistoryStatus } from '../entities/commission-history.entity';

/**
 * GraphQL Types for Commission History
 */
@ObjectType()
export class CommissionHistoryType {
  @Field(() => ID)
  id!: string;

  @Field(() => Date)
  createdAt!: Date;

  @Field(() => Date)
  updatedAt!: Date;

  @Field(() => ID)
  orderId!: string;

  @Field(() => ID)
  sellerId!: string;

  @Field(() => Number)
  commissionRate!: number;

  @Field(() => Int)
  orderTotal!: number;

  @Field(() => Int)
  commissionAmount!: number;

  @Field(() => Int)
  sellerPayout!: number;

  @Field(() => CommissionHistoryStatus)
  status!: CommissionHistoryStatus;
}

@ObjectType()
export class CommissionHistoryListType {
  @Field(() => [CommissionHistoryType])
  items!: CommissionHistoryType[];

  @Field(() => Int)
  totalItems!: number;
}

@ObjectType()
export class SellerCommissionSummaryType {
  @Field(() => ID)
  sellerId!: string;

  @Field(() => Int)
  totalCommissions!: number;

  @Field(() => Int)
  totalPayouts!: number;

  @Field(() => Int)
  totalOrders!: number;

  @Field(() => String)
  commissionsByStatus!: string; // JSON string representation
}

/**
 * Input types for filtering
 */
@InputType()
export class CommissionHistoryFilterInput {
  @Field(() => ID, { nullable: true })
  orderId?: string;

  @Field(() => CommissionHistoryStatus, { nullable: true })
  status?: CommissionHistoryStatus;

  @Field(() => Date, { nullable: true })
  startDate?: Date;

  @Field(() => Date, { nullable: true })
  endDate?: Date;
}

@InputType()
export class CommissionHistoryListOptionsInput {
  @Field(() => Int, { nullable: true })
  skip?: number;

  @Field(() => Int, { nullable: true })
  take?: number;

  @Field(() => CommissionHistoryFilterInput, { nullable: true })
  filter?: CommissionHistoryFilterInput;
}

@InputType()
export class DateRangeInput {
  @Field(() => Date, { nullable: true })
  startDate?: Date;

  @Field(() => Date, { nullable: true })
  endDate?: Date;
}

/**
 * Commission History Resolver
 *
 * Handles Admin API queries for commission history
 */
@Resolver()
export class CommissionHistoryResolver {
  constructor(private commissionHistoryService: CommissionHistoryService) {}

  /**
   * Get commission history for a seller with filtering and pagination
   */
  @Query(() => CommissionHistoryListType, {
    description: 'Get paginated commission history for a seller',
  })
  @Allow(Permission.ReadOrder, Permission.ReadCatalog) // Admins can view commission history
  async commissionHistory(
    @Ctx() ctx: RequestContext,
    @Args('sellerId', { type: () => ID }) sellerId: string,
    @Args('options', { type: () => CommissionHistoryListOptionsInput, nullable: true })
    options?: CommissionHistoryListOptionsInput
  ): Promise<CommissionHistoryListType> {
    const result = await this.commissionHistoryService.getCommissionHistory(ctx, sellerId, {
      skip: options?.skip,
      take: options?.take,
      orderId: options?.filter?.orderId,
      status: options?.filter?.status,
      startDate: options?.filter?.startDate,
      endDate: options?.filter?.endDate,
    });

    return {
      items: result.items.map((item) => this.toGraphQLType(item)),
      totalItems: result.totalItems,
    };
  }

  /**
   * Get commission summary for a seller
   */
  @Query(() => SellerCommissionSummaryType, {
    description: 'Get aggregated commission summary for a seller',
  })
  @Allow(Permission.ReadOrder)
  async sellerCommissionSummary(
    @Ctx() ctx: RequestContext,
    @Args('sellerId', { type: () => ID }) sellerId: string,
    @Args('dateRange', { type: () => DateRangeInput, nullable: true }) dateRange?: DateRangeInput
  ): Promise<SellerCommissionSummaryType> {
    const summary = await this.commissionHistoryService.getSellerCommissionSummary(ctx, sellerId, {
      startDate: dateRange?.startDate,
      endDate: dateRange?.endDate,
    });

    // Convert commissionsByStatus object to JSON string for GraphQL
    return {
      sellerId: String(summary.sellerId),
      totalCommissions: summary.totalCommissions,
      totalPayouts: summary.totalPayouts,
      totalOrders: summary.totalOrders,
      commissionsByStatus: JSON.stringify(summary.commissionsByStatus),
    };
  }

  /**
   * Convert service record to GraphQL type
   */
  private toGraphQLType(record: CommissionHistoryRecord): CommissionHistoryType {
    return {
      id: String(record.id),
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      orderId: String(record.orderId),
      sellerId: String(record.sellerId),
      commissionRate: record.commissionRate,
      orderTotal: record.orderTotal,
      commissionAmount: record.commissionAmount,
      sellerPayout: record.sellerPayout,
      status: record.status,
    };
  }
}
