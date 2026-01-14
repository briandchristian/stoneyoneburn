/**
 * Seller Dashboard Service
 *
 * Service for aggregating seller dashboard data including:
 * - Order statistics and summaries
 * - Product statistics
 * - Revenue analytics
 * - Performance metrics
 *
 * Part of Phase 2.4: Seller Dashboard Plugin
 */

import { Injectable } from '@nestjs/common';
import type { RequestContext, ID } from '@vendure/core';
import { TransactionalConnection, Order, OrderLine, Product, ProductVariant } from '@vendure/core';
import { MarketplaceSeller } from '../entities/seller.entity';

/**
 * Seller Dashboard Statistics
 */
export interface SellerDashboardStats {
  totalProducts: number;
  activeProducts: number;
  totalOrders: number;
  pendingOrders: number;
  completedOrders: number;
  totalRevenue: number;
  pendingRevenue: number;
  completedRevenue: number;
  averageOrderValue: number;
}

/**
 * Seller Order Summary
 */
export interface SellerOrderSummary {
  sellerId: ID;
  totalOrders: number;
  ordersByStatus: {
    [status: string]: number;
  };
  totalRevenue: number;
  revenueByStatus: {
    [status: string]: number;
  };
  recentOrders: Array<{
    id: ID;
    orderNumber: string;
    total: number;
    status: string;
    createdAt: Date;
  }>;
}

/**
 * Seller Product Summary
 */
export interface SellerProductSummary {
  sellerId: ID;
  totalProducts: number;
  activeProducts: number;
  inactiveProducts: number;
  productsByStatus: {
    [status: string]: number;
  };
  lowStockProducts: number;
}

/**
 * Seller Dashboard Service
 *
 * Aggregates data for seller dashboard display
 */
@Injectable()
export class SellerDashboardService {
  constructor(private connection: TransactionalConnection) {}

  /**
   * Get aggregated statistics for seller dashboard
   */
  async getSellerDashboardStats(
    ctx: RequestContext,
    sellerId: ID
  ): Promise<SellerDashboardStats> {
    // Get product statistics
    const productStats = await this.getProductStats(ctx, sellerId);

    // Get order statistics
    const orderStats = await this.getOrderStats(ctx, sellerId);

    // Calculate average order value
    const averageOrderValue =
      orderStats.totalOrders > 0 ? orderStats.totalRevenue / orderStats.totalOrders : 0;

    return {
      totalProducts: productStats.totalProducts,
      activeProducts: productStats.activeProducts,
      totalOrders: orderStats.totalOrders,
      pendingOrders: orderStats.pendingOrders,
      completedOrders: orderStats.completedOrders,
      totalRevenue: orderStats.totalRevenue,
      pendingRevenue: orderStats.pendingRevenue,
      completedRevenue: orderStats.completedRevenue,
      averageOrderValue: Math.round(averageOrderValue * 100) / 100, // Round to 2 decimal places
    };
  }

  /**
   * Get order summary for a seller
   */
  async getSellerOrderSummary(
    ctx: RequestContext,
    sellerId: ID,
    limit: number = 10
  ): Promise<SellerOrderSummary> {
    // Get orders for this seller
    const orders = await this.getSellerOrders(ctx, sellerId);

    // Group orders by status
    const ordersByStatus: { [status: string]: number } = {};
    const revenueByStatus: { [status: string]: number } = {};

    let totalRevenue = 0;

    for (const order of orders) {
      const status = order.state;
      ordersByStatus[status] = (ordersByStatus[status] || 0) + 1;

      // Calculate revenue for this order (sum of order lines for this seller)
      const orderRevenue = await this.getOrderRevenueForSeller(ctx, order.id, sellerId);
      totalRevenue += orderRevenue;
      revenueByStatus[status] = (revenueByStatus[status] || 0) + orderRevenue;
    }

    // Get recent orders
    const recentOrders = orders
      .sort((a, b) => (b.orderPlacedAt?.getTime() || 0) - (a.orderPlacedAt?.getTime() || 0))
      .slice(0, limit)
      .map((order) => ({
        id: order.id,
        orderNumber: order.code,
        total: order.totalWithTax,
        status: order.state,
        createdAt: order.orderPlacedAt || order.createdAt,
      }));

    return {
      sellerId,
      totalOrders: orders.length,
      ordersByStatus,
      totalRevenue,
      revenueByStatus,
      recentOrders,
    };
  }

  /**
   * Get product summary for a seller
   */
  async getSellerProductSummary(ctx: RequestContext, sellerId: ID): Promise<SellerProductSummary> {
    const stats = await this.getProductStats(ctx, sellerId);

    // Get low stock products (products with variants that have stockOnHand < outOfStockThreshold)
    const lowStockCount = await this.connection
      .getRepository(ctx, ProductVariant)
      .createQueryBuilder('variant')
      .innerJoin('variant.product', 'product')
      .where('product.customFieldsSellerid = :sellerId', {
        sellerId: parseInt(sellerId.toString(), 10),
      })
      .andWhere('variant.stockOnHand < variant.outOfStockThreshold')
      .andWhere('variant.trackInventory = :trackInventory', { trackInventory: 'TRUE' })
      .getCount();

    return {
      sellerId,
      totalProducts: stats.totalProducts,
      activeProducts: stats.activeProducts,
      inactiveProducts: stats.totalProducts - stats.activeProducts,
      productsByStatus: {
        enabled: stats.activeProducts,
        disabled: stats.totalProducts - stats.activeProducts,
      },
      lowStockProducts: lowStockCount,
    };
  }

  /**
   * Get product statistics for a seller
   */
  private async getProductStats(
    ctx: RequestContext,
    sellerId: ID
  ): Promise<{ totalProducts: number; activeProducts: number }> {
    const totalProducts = await this.connection
      .getRepository(ctx, Product)
      .createQueryBuilder('product')
      .where('product.customFieldsSellerid = :sellerId', {
        sellerId: parseInt(sellerId.toString(), 10),
      })
      .getCount();

    const activeProducts = await this.connection
      .getRepository(ctx, Product)
      .createQueryBuilder('product')
      .where('product.customFieldsSellerid = :sellerId', {
        sellerId: parseInt(sellerId.toString(), 10),
      })
      .andWhere('product.enabled = :enabled', { enabled: true })
      .getCount();

    return { totalProducts, activeProducts };
  }

  /**
   * Get order statistics for a seller
   */
  private async getOrderStats(
    ctx: RequestContext,
    sellerId: ID
  ): Promise<{
    totalOrders: number;
    pendingOrders: number;
    completedOrders: number;
    totalRevenue: number;
    pendingRevenue: number;
    completedRevenue: number;
  }> {
    // Get unique orders that contain products from this seller
    const orders = await this.getSellerOrders(ctx, sellerId);

    let totalRevenue = 0;
    let pendingRevenue = 0;
    let completedRevenue = 0;
    let pendingOrders = 0;
    let completedOrders = 0;

    for (const order of orders) {
      const orderRevenue = await this.getOrderRevenueForSeller(ctx, order.id, sellerId);
      totalRevenue += orderRevenue;

      // Categorize by order state
      if (order.state === 'Fulfilled' || order.state === 'PaymentSettled') {
        completedOrders++;
        completedRevenue += orderRevenue;
      } else if (order.state === 'PaymentAuthorized' || order.state === 'ArrangingPayment') {
        pendingOrders++;
        pendingRevenue += orderRevenue;
      }
    }

    return {
      totalOrders: orders.length,
      pendingOrders,
      completedOrders,
      totalRevenue,
      pendingRevenue,
      completedRevenue,
    };
  }

  /**
   * Get all orders that contain products from a specific seller
   */
  private async getSellerOrders(ctx: RequestContext, sellerId: ID): Promise<Order[]> {
    // Query orders that have order lines with products from this seller
    // This requires joining Order -> OrderLine -> ProductVariant -> Product
    const orders = await this.connection
      .getRepository(ctx, Order)
      .createQueryBuilder('order')
      .innerJoin('order.lines', 'orderLine')
      .innerJoin('orderLine.productVariant', 'variant')
      .innerJoin('variant.product', 'product')
      .where('product.customFieldsSellerid = :sellerId', {
        sellerId: parseInt(sellerId.toString(), 10),
      })
      .andWhere('order.active = :active', { active: false }) // Only completed orders
      .getMany();

    // Remove duplicates (an order can have multiple lines from the same seller)
    const uniqueOrders = Array.from(new Map(orders.map((o) => [o.id, o])).values());

    return uniqueOrders;
  }

  /**
   * Get revenue for a specific order that belongs to a seller
   * This calculates the sum of order lines that contain products from the seller
   */
  private async getOrderRevenueForSeller(
    ctx: RequestContext,
    orderId: ID,
    sellerId: ID
  ): Promise<number> {
    // Get order lines for this order that contain products from this seller
    const orderLines = await this.connection
      .getRepository(ctx, OrderLine)
      .createQueryBuilder('orderLine')
      .innerJoin('orderLine.productVariant', 'variant')
      .innerJoin('variant.product', 'product')
      .where('orderLine.orderId = :orderId', { orderId: parseInt(orderId.toString(), 10) })
      .andWhere('product.customFieldsSellerid = :sellerId', {
        sellerId: parseInt(sellerId.toString(), 10),
      })
      .getMany();

    // Sum the line prices (with tax) for this seller's products
    // Use proratedUnitPriceWithTax which accounts for all discounts
    let revenue = 0;
    for (const line of orderLines) {
      // proratedUnitPriceWithTax is a Money object, extract the value
      // Multiply by quantity to get total for this line
      const unitPrice = typeof line.proratedUnitPriceWithTax === 'number'
        ? line.proratedUnitPriceWithTax
        : (line.proratedUnitPriceWithTax as any)?.value || 0;
      const lineTotal = unitPrice * line.quantity;
      revenue += lineTotal;
    }

    return Math.round(revenue); // Round to nearest integer (cents)
  }
}
