/**
 * Commission History Service
 *
 * Service for managing commission history records.
 * Part of Phase 3.1: Commission Configuration
 *
 * Features:
 * - Create commission history records
 * - Query commission history with filtering and pagination
 * - Aggregate commission data for sellers
 * - Support date range filtering
 */

import { Injectable } from '@nestjs/common';
import type { RequestContext, ID } from '@vendure/core';
import { TransactionalConnection } from '@vendure/core';
import { CommissionHistory, CommissionHistoryStatus } from '../entities/commission-history.entity';

/**
 * Commission History Record
 */
export interface CommissionHistoryRecord {
  id: ID;
  orderId: ID;
  sellerId: ID;
  commissionRate: number;
  orderTotal: number; // in cents
  commissionAmount: number; // in cents
  sellerPayout: number; // in cents
  status: CommissionHistoryStatus;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Commission History List Result
 */
export interface CommissionHistoryListResult {
  items: CommissionHistoryRecord[];
  totalItems: number;
}

/**
 * Seller Commission Summary
 */
export interface SellerCommissionSummary {
  sellerId: ID;
  totalCommissions: number;
  totalPayouts: number;
  totalOrders: number;
  commissionsByStatus: {
    [status: string]: number;
  };
}

/**
 * Commission History Service
 *
 * Handles commission history record management and queries
 */
@Injectable()
export class CommissionHistoryService {
  constructor(private connection: TransactionalConnection) {}

  /**
   * Create a commission history record
   */
  async createCommissionHistory(
    ctx: RequestContext,
    input: {
      orderId: ID;
      sellerId: ID;
      commissionRate: number;
      orderTotal: number;
      commissionAmount: number;
      sellerPayout: number;
      status?: CommissionHistoryStatus;
    }
  ): Promise<CommissionHistoryRecord> {
    // Validate data integrity
    if (input.commissionAmount + input.sellerPayout !== input.orderTotal) {
      throw new Error(
        `Commission calculation error: commissionAmount (${input.commissionAmount}) + sellerPayout (${input.sellerPayout}) must equal orderTotal (${input.orderTotal})`
      );
    }

    const repository = this.connection.getRepository(ctx, CommissionHistory);
    const commissionHistory = repository.create({
      orderId: String(input.orderId), // Convert ID to string
      sellerId: input.sellerId,
      commissionRate: input.commissionRate,
      orderTotal: input.orderTotal,
      commissionAmount: input.commissionAmount,
      sellerPayout: input.sellerPayout,
      status: input.status || CommissionHistoryStatus.CALCULATED,
    });

    const saved = await repository.save(commissionHistory);

    return this.toRecord(saved);
  }

  /**
   * Get commission history for a seller
   */
  async getCommissionHistory(
    ctx: RequestContext,
    sellerId: ID,
    options?: {
      skip?: number;
      take?: number;
      orderId?: ID;
      status?: CommissionHistoryStatus;
      startDate?: Date;
      endDate?: Date;
    }
  ): Promise<CommissionHistoryListResult> {
    const repository = this.connection.getRepository(ctx, CommissionHistory);
    const queryBuilder = repository.createQueryBuilder('commissionHistory').where('commissionHistory.sellerId = :sellerId', { sellerId });

    // Apply filters
    if (options?.orderId) {
      queryBuilder.andWhere('commissionHistory.orderId = :orderId', { orderId: options.orderId });
    }

    if (options?.status) {
      queryBuilder.andWhere('commissionHistory.status = :status', { status: options.status });
    }

    if (options?.startDate) {
      queryBuilder.andWhere('commissionHistory.createdAt >= :startDate', { startDate: options.startDate });
    }

    if (options?.endDate) {
      queryBuilder.andWhere('commissionHistory.createdAt <= :endDate', { endDate: options.endDate });
    }

    // Get total count
    const totalItems = await queryBuilder.getCount();

    // Apply pagination
    if (options?.skip !== undefined) {
      queryBuilder.skip(options.skip);
    }

    if (options?.take !== undefined) {
      queryBuilder.take(options.take);
    }

    // Order by creation date (newest first)
    queryBuilder.orderBy('commissionHistory.createdAt', 'DESC');

    const items = await queryBuilder.getMany();

    return {
      items: items.map((item) => this.toRecord(item)),
      totalItems,
    };
  }

  /**
   * Get commission summary for a seller
   */
  async getSellerCommissionSummary(
    ctx: RequestContext,
    sellerId: ID,
    dateRange?: {
      startDate?: Date;
      endDate?: Date;
    }
  ): Promise<SellerCommissionSummary> {
    const repository = this.connection.getRepository(ctx, CommissionHistory);
    const queryBuilder = repository.createQueryBuilder('commissionHistory').where('commissionHistory.sellerId = :sellerId', { sellerId });

    // Apply date range filter
    if (dateRange?.startDate) {
      queryBuilder.andWhere('commissionHistory.createdAt >= :startDate', { startDate: dateRange.startDate });
    }

    if (dateRange?.endDate) {
      queryBuilder.andWhere('commissionHistory.createdAt <= :endDate', { endDate: dateRange.endDate });
    }

    const allRecords = await queryBuilder.getMany();

    // Calculate totals
    const totalCommissions = allRecords.reduce((sum, record) => sum + record.commissionAmount, 0);
    const totalPayouts = allRecords.reduce((sum, record) => sum + record.sellerPayout, 0);
    const uniqueOrderIds = new Set(allRecords.map((record) => record.orderId));
    const totalOrders = uniqueOrderIds.size;

    // Group by status
    const commissionsByStatus: { [status: string]: number } = {
      CALCULATED: 0,
      PAID: 0,
      REFUNDED: 0,
    };

    allRecords.forEach((record) => {
      const status = record.status as string;
      if (commissionsByStatus[status] !== undefined) {
        commissionsByStatus[status] += record.commissionAmount;
      }
    });

    return {
      sellerId,
      totalCommissions,
      totalPayouts,
      totalOrders,
      commissionsByStatus,
    };
  }

  /**
   * Convert entity to record interface
   */
  private toRecord(entity: CommissionHistory): CommissionHistoryRecord {
    return {
      id: entity.id.toString(),
      orderId: String(entity.orderId), // Ensure string type
      sellerId: entity.sellerId.toString(),
      commissionRate: typeof entity.commissionRate === 'string' ? parseFloat(entity.commissionRate) : entity.commissionRate,
      orderTotal: entity.orderTotal,
      commissionAmount: entity.commissionAmount,
      sellerPayout: entity.sellerPayout,
      status: entity.status,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }
}
