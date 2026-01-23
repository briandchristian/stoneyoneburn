/**
 * Order Payment Handler Service Unit Tests
 *
 * Test-Driven Development (TDD) for Phase 3.2: Split Payment Processing
 *
 * These are actual unit tests with mocks that test the resolver implementation.
 * Following TDD workflow:
 * 1. Write tests first (RED) ✅
 * 2. Implement minimal code to pass (GREEN)
 * 3. Refactor while keeping tests passing
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import type { RequestContext, ID, Order, OrderLine } from '@vendure/core';
import { TransactionalConnection, ProductVariant, Product } from '@vendure/core';
import { OrderPaymentHandlerService } from './order-payment-handler.service';
import { SplitPaymentService } from './split-payment.service';
import { SellerPayoutService, PayoutStatus } from './seller-payout.service';
import { CommissionService } from './commission.service';
import { MarketplaceSeller } from '../entities/seller.entity';

// Mock dependencies
jest.mock('./split-payment.service');
jest.mock('./seller-payout.service');
jest.mock('./commission.service');
jest.mock('@vendure/core', () => {
  const actual = jest.requireActual('@vendure/core') as any;
  return {
    ...actual,
    TransactionalConnection: jest.fn(),
  };
});

describe('OrderPaymentHandlerService - Unit Tests', () => {
  let service: OrderPaymentHandlerService;
  let mockConnection: jest.Mocked<TransactionalConnection>;
  let mockSplitPaymentService: jest.Mocked<SplitPaymentService>;
  let mockSellerPayoutService: jest.Mocked<SellerPayoutService>;
  let mockCommissionService: jest.Mocked<CommissionService>;
  let mockCtx: RequestContext;
  let mockProductVariantRepository: any;
  let mockProductRepository: any;
  let mockSellerRepository: any;

  beforeEach(() => {
    // Create mock repositories
    mockProductVariantRepository = {
      findOne: jest.fn(),
    };

    mockProductRepository = {
      createQueryBuilder: jest.fn(),
    };

    mockSellerRepository = {
      findOne: jest.fn(),
    };

    // Create mock query builder for product repository
    const mockQueryBuilder = {
      select: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      getRawOne: jest.fn(),
    };

    mockProductRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

    // Create mock connection
    mockConnection = {
      getRepository: jest.fn((ctx, entity) => {
        if (entity === ProductVariant) {
          return mockProductVariantRepository;
        }
        if (entity === Product) {
          return mockProductRepository;
        }
        if (entity === MarketplaceSeller) {
          return mockSellerRepository;
        }
        return {};
      }),
    } as any;

    // Create mock services
    mockSplitPaymentService = {
      calculateSplitPaymentForOrderWithRates: jest.fn(),
    } as any;

    mockSellerPayoutService = {
      createPayout: jest.fn(),
    } as any;

    mockCommissionService = {} as any;

    // Create service instance
    service = new OrderPaymentHandlerService(
      mockConnection,
      mockSplitPaymentService,
      mockSellerPayoutService,
      mockCommissionService
    );

    // Create mock request context
    mockCtx = {
      channel: {} as any,
      languageCode: 'en' as const,
    } as RequestContext;
  });

  describe('processOrderPayment', () => {
    it('should process order payment and create payouts for single seller', async () => {
      // Arrange
      const orderId = '100';
      const sellerId = '5';
      const productId = '10';
      const variantId = '20';

      const mockOrderLine: Partial<OrderLine> = {
        id: '1',
        productVariantId: variantId,
        proratedLinePriceWithTax: 10000, // $100.00
      };

      const mockOrder: Partial<Order> = {
        id: orderId,
        totalWithTax: 10000,
        lines: [mockOrderLine as OrderLine],
      };

      const mockProductVariant: Partial<ProductVariant> = {
        id: variantId,
        product: { id: productId } as Product,
      };

      const mockSeller: Partial<MarketplaceSeller> = {
        id: sellerId,
        commissionRate: 0.15,
      };

      mockProductVariantRepository.findOne.mockResolvedValue(mockProductVariant);
      mockProductRepository.createQueryBuilder().getRawOne.mockResolvedValue({
        sellerId: sellerId,
      });
      mockSellerRepository.findOne.mockResolvedValue(mockSeller);

      mockSplitPaymentService.calculateSplitPaymentForOrderWithRates.mockReturnValue({
        orderId,
        totalAmount: 10000,
        commission: 1500,
        sellerPayout: 8500,
        sellerSplits: [
          {
            sellerId,
            amount: 8500,
            commission: 1500,
            lineTotal: 10000,
          },
        ],
      });

      mockSellerPayoutService.createPayout.mockResolvedValue({} as any);

      // Act
      const result = await service.processOrderPayment(mockCtx, mockOrder as Order);

      // Assert
      expect(mockProductVariantRepository.findOne).toHaveBeenCalled();
      expect(mockSellerPayoutService.createPayout).toHaveBeenCalledWith(
        mockCtx,
        sellerId,
        orderId,
        8500,
        1500,
        PayoutStatus.HOLD
      );
      expect(result).toBeDefined();
      expect(result?.orderId).toBe(orderId);
      expect(result?.sellerSplits).toHaveLength(1);
    });

    it('should handle order with multiple sellers', async () => {
      // Arrange
      const orderId = '100';
      const seller1Id = '5';
      const seller2Id = '6';
      const product1Id = '10';
      const product2Id = '11';
      const variant1Id = '20';
      const variant2Id = '21';

      const mockOrderLines: Partial<OrderLine>[] = [
        {
          id: '1',
          productVariantId: variant1Id,
          proratedLinePriceWithTax: 10000, // $100.00 from seller 1
        },
        {
          id: '2',
          productVariantId: variant2Id,
          proratedLinePriceWithTax: 10000, // $100.00 from seller 2
        },
      ];

      const mockOrder: Partial<Order> = {
        id: orderId,
        totalWithTax: 20000,
        lines: mockOrderLines as OrderLine[],
      };

      mockProductVariantRepository.findOne
        .mockResolvedValueOnce({
          id: variant1Id,
          product: { id: product1Id } as Product,
        })
        .mockResolvedValueOnce({
          id: variant2Id,
          product: { id: product2Id } as Product,
        });

      const mockQueryBuilder = mockProductRepository.createQueryBuilder();
      mockQueryBuilder.getRawOne
        .mockResolvedValueOnce({ sellerId: seller1Id })
        .mockResolvedValueOnce({ sellerId: seller2Id });

      mockSellerRepository.findOne
        .mockResolvedValueOnce({ id: seller1Id, commissionRate: 0.15 })
        .mockResolvedValueOnce({ id: seller2Id, commissionRate: 0.15 });

      mockSplitPaymentService.calculateSplitPaymentForOrderWithRates.mockReturnValue({
        orderId,
        totalAmount: 20000,
        commission: 3000,
        sellerPayout: 17000,
        sellerSplits: [
          {
            sellerId: seller1Id,
            amount: 8500,
            commission: 1500,
            lineTotal: 10000,
          },
          {
            sellerId: seller2Id,
            amount: 8500,
            commission: 1500,
            lineTotal: 10000,
          },
        ],
      });

      mockSellerPayoutService.createPayout.mockResolvedValue({} as any);

      // Act
      const result = await service.processOrderPayment(mockCtx, mockOrder as Order);

      // Assert
      expect(mockSellerPayoutService.createPayout).toHaveBeenCalledTimes(2);
      expect(mockSellerPayoutService.createPayout).toHaveBeenCalledWith(
        mockCtx,
        seller1Id,
        orderId,
        8500,
        1500,
        PayoutStatus.HOLD
      );
      expect(mockSellerPayoutService.createPayout).toHaveBeenCalledWith(
        mockCtx,
        seller2Id,
        orderId,
        8500,
        1500,
        PayoutStatus.HOLD
      );
      expect(result).toBeDefined();
      expect(result?.sellerSplits).toHaveLength(2);
    });

    it('should skip lines without products', async () => {
      // Arrange
      const orderId = '100';
      const mockOrderLine: Partial<OrderLine> = {
        id: '1',
        productVariantId: '20',
        proratedLinePriceWithTax: 10000,
      };

      const mockOrder: Partial<Order> = {
        id: orderId,
        totalWithTax: 10000,
        lines: [mockOrderLine as OrderLine],
      };

      mockProductVariantRepository.findOne.mockResolvedValue(null);

      // Act
      await service.processOrderPayment(mockCtx, mockOrder as Order);

      // Assert
      expect(mockSellerPayoutService.createPayout).not.toHaveBeenCalled();
    });

    it('should skip lines without seller ID', async () => {
      // Arrange
      const orderId = '100';
      const variantId = '20';
      const productId = '10';

      const mockOrderLine: Partial<OrderLine> = {
        id: '1',
        productVariantId: variantId,
        proratedLinePriceWithTax: 10000,
      };

      const mockOrder: Partial<Order> = {
        id: orderId,
        totalWithTax: 10000,
        lines: [mockOrderLine as OrderLine],
      };

      mockProductVariantRepository.findOne.mockResolvedValue({
        id: variantId,
        product: { id: productId } as Product,
      });

      mockProductRepository.createQueryBuilder().getRawOne.mockResolvedValue(null);

      // Act
      await service.processOrderPayment(mockCtx, mockOrder as Order);

      // Assert
      expect(mockSellerPayoutService.createPayout).not.toHaveBeenCalled();
    });

    it('should return early if no seller products in order', async () => {
      // Arrange
      const orderId = '100';
      const mockOrder: Partial<Order> = {
        id: orderId,
        totalWithTax: 0,
        lines: [],
      };

      // Act
      const result = await service.processOrderPayment(mockCtx, mockOrder as Order);

      // Assert
      expect(mockProductVariantRepository.findOne).not.toHaveBeenCalled();
      expect(mockSellerPayoutService.createPayout).not.toHaveBeenCalled();
      expect(result).toBeNull();
    });

    it('should use default commission rate when seller has no custom rate', async () => {
      // Arrange
      const orderId = '100';
      const sellerId = '5';
      const productId = '10';
      const variantId = '20';

      const mockOrderLine: Partial<OrderLine> = {
        id: '1',
        productVariantId: variantId,
        proratedLinePriceWithTax: 10000,
      };

      const mockOrder: Partial<Order> = {
        id: orderId,
        totalWithTax: 10000,
        lines: [mockOrderLine as OrderLine],
      };

      mockProductVariantRepository.findOne.mockResolvedValue({
        id: variantId,
        product: { id: productId } as Product,
      });

      mockProductRepository.createQueryBuilder().getRawOne.mockResolvedValue({
        sellerId: sellerId,
      });

      // Seller exists but has no custom commission rate
      mockSellerRepository.findOne.mockResolvedValue({
        id: sellerId,
        commissionRate: null,
      });

      mockSplitPaymentService.calculateSplitPaymentForOrderWithRates.mockReturnValue({
        orderId,
        totalAmount: 10000,
        commission: 1500,
        sellerPayout: 8500,
        sellerSplits: [
          {
            sellerId,
            amount: 8500,
            commission: 1500,
            lineTotal: 10000,
          },
        ],
      });

      mockSellerPayoutService.createPayout.mockResolvedValue({} as any);

      // Act
      await service.processOrderPayment(mockCtx, mockOrder as Order);

      // Assert: Should use default commission rate (0.15)
      expect(mockSplitPaymentService.calculateSplitPaymentForOrderWithRates).toHaveBeenCalledWith(
        expect.any(Object),
        expect.any(Map),
        0.15 // DEFAULT_COMMISSION_RATE
      );
    });
  });
});
