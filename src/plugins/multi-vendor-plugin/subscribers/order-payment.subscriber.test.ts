/**
 * Order Payment Event Subscriber Tests
 *
 * Test-Driven Development (TDD) for Phase 3.2: Split Payment Processing Integration
 *
 * These tests define the expected behavior of the order payment event subscriber:
 * - Subscribes to order payment events
 * - Creates seller payouts when orders are paid
 * - Creates commission history records
 *
 * Following TDD workflow:
 * 1. Write tests first (RED) ✅
 * 2. Implement minimal code to pass (GREEN)
 * 3. Refactor while keeping tests passing
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import type { RequestContext, Order, Payment } from '@vendure/core';
import { EventBus, OrderPlacedEvent, PaymentStateTransitionEvent } from '@vendure/core';
import { OrderPaymentHandlerService } from '../services/order-payment-handler.service';
import { CommissionHistoryService } from '../services/commission-history.service';
import { OrderPaymentSubscriber } from './order-payment.subscriber';
import { CommissionHistoryStatus } from '../entities/commission-history.entity';

// Mock services
jest.mock('../services/order-payment-handler.service');
jest.mock('../services/commission-history.service');

describe('OrderPaymentSubscriber - Unit Tests', () => {
  let subscriber: OrderPaymentSubscriber;
  let mockEventBus: jest.Mocked<EventBus>;
  let mockOrderPaymentHandlerService: jest.Mocked<OrderPaymentHandlerService>;
  let mockCommissionHistoryService: jest.Mocked<CommissionHistoryService>;
  let mockCtx: RequestContext;
  let orderPlacedHandler: (event: OrderPlacedEvent) => Promise<void>;
  let paymentSettledHandler: (event: PaymentStateTransitionEvent) => Promise<void>;

  beforeEach(() => {
    // Create mock services
    mockOrderPaymentHandlerService = {
      processOrderPayment: jest.fn(),
    } as any;

    mockCommissionHistoryService = {
      createCommissionHistory: jest.fn(),
    } as any;

    // Create mock observable that supports pipe and subscribe
    const createMockObservable = () => {
      const observable = {
        pipe: jest.fn((...operators: any[]) => {
          // Return a new observable that applies operators
          return {
            subscribe: jest.fn((handler: any) => {
              // Store handler for testing
              return { unsubscribe: jest.fn() };
            }),
          };
        }),
        subscribe: jest.fn((handler: any) => {
          // Store handler for direct subscription (OrderPlacedEvent)
          return { unsubscribe: jest.fn() };
        }),
      };
      return observable;
    };

    // Create mock event bus
    mockEventBus = {
      ofType: jest.fn((eventType: any) => {
        const observable = createMockObservable();
        // Store handlers when subscribe is called
        if (eventType === OrderPlacedEvent) {
          observable.subscribe = jest.fn((handler) => {
            orderPlacedHandler = handler;
            return { unsubscribe: jest.fn() };
          });
        } else if (eventType === PaymentStateTransitionEvent) {
          observable.pipe = jest.fn(() => {
            return {
              subscribe: jest.fn((handler) => {
                paymentSettledHandler = handler;
                return { unsubscribe: jest.fn() };
              }),
            };
          });
        }
        return observable;
      }),
    } as any;

    // Create subscriber instance
    subscriber = new OrderPaymentSubscriber(
      mockEventBus,
      mockOrderPaymentHandlerService,
      mockCommissionHistoryService
    );

    // Create mock request context
    mockCtx = {
      channel: {} as any,
      languageCode: 'en' as const,
    } as RequestContext;
  });

  describe('onVendureBootstrap', () => {
    it('should subscribe to OrderPlacedEvent', () => {
      // Act
      subscriber.onVendureBootstrap();

      // Assert
      expect(mockEventBus.ofType).toHaveBeenCalledWith(OrderPlacedEvent);
      expect(orderPlacedHandler).toBeDefined();
    });

    it('should subscribe to PaymentStateTransitionEvent for settled payments', () => {
      // Act
      subscriber.onVendureBootstrap();

      // Assert: Should subscribe to PaymentStateTransitionEvent
      expect(mockEventBus.ofType).toHaveBeenCalledWith(PaymentStateTransitionEvent);
      expect(paymentSettledHandler).toBeDefined();
    });
  });

  describe('OrderPlacedEvent handling', () => {
    beforeEach(() => {
      subscriber.onVendureBootstrap();
    });

    it('should process order payment when order is placed', async () => {
      // Arrange
      const mockOrder: Partial<Order> = {
        id: '100',
        totalWithTax: 10000,
        lines: [],
      };

      const mockEvent: Partial<OrderPlacedEvent> = {
        entity: mockOrder as Order,
        ctx: mockCtx,
      };

      mockOrderPaymentHandlerService.processOrderPayment.mockResolvedValue(null);

      // Act
      await orderPlacedHandler!(mockEvent as OrderPlacedEvent);

      // Assert
      expect(mockOrderPaymentHandlerService.processOrderPayment).toHaveBeenCalledWith(
        mockCtx,
        mockOrder as Order
      );
    });

    it('should create commission history records when order payment is processed', async () => {
      // Arrange
      const mockOrder: Partial<Order> = {
        id: '100',
        totalWithTax: 10000,
        lines: [],
      };

      const mockEvent: Partial<OrderPlacedEvent> = {
        entity: mockOrder as Order,
        ctx: mockCtx,
      };

      const mockSplitResult = {
        orderId: '100',
        totalAmount: 10000,
        commission: 1500,
        sellerPayout: 8500,
        sellerSplits: [
          {
            sellerId: '5',
            amount: 8500,
            commission: 1500,
            lineTotal: 10000,
          },
        ],
      };

      mockOrderPaymentHandlerService.processOrderPayment.mockResolvedValue(mockSplitResult as any);

      // Act
      await orderPlacedHandler!(mockEvent as OrderPlacedEvent);

      // Assert
      expect(mockCommissionHistoryService.createCommissionHistory).toHaveBeenCalledWith(
        mockCtx,
        expect.objectContaining({
          orderId: '100',
          sellerId: '5',
          commissionRate: 0.15, // 1500 / 10000
          orderTotal: 10000,
          commissionAmount: 1500,
          sellerPayout: 8500,
          status: CommissionHistoryStatus.CALCULATED,
        })
      );
    });

    it('should handle errors gracefully when processing order payment fails', async () => {
      // Arrange
      const mockOrder: Partial<Order> = {
        id: '100',
        totalWithTax: 10000,
        lines: [],
      };

      const mockEvent: Partial<OrderPlacedEvent> = {
        entity: mockOrder as Order,
        ctx: mockCtx,
      };

      const error = new Error('Payment processing failed');
      mockOrderPaymentHandlerService.processOrderPayment.mockRejectedValue(error);

      // Act & Assert: Should not throw, but log error
      await expect(orderPlacedHandler!(mockEvent as OrderPlacedEvent)).resolves.not.toThrow();
    });
  });

  describe('PaymentStateTransitionEvent handling', () => {
    beforeEach(() => {
      subscriber.onVendureBootstrap();
    });

    it('should process order payment when payment transitions to Settled', async () => {
      // Arrange
      const mockOrder: Partial<Order> = {
        id: '100',
        totalWithTax: 10000,
        lines: [],
      };

      const mockPayment: Partial<Payment> = {
        id: '1',
        state: 'Settled',
        order: mockOrder as Order,
      };

      const mockEvent: Partial<PaymentStateTransitionEvent> = {
        entity: mockPayment as Payment,
        ctx: mockCtx,
        toState: 'Settled',
        fromState: 'Authorized',
      };

      mockOrderPaymentHandlerService.processOrderPayment.mockResolvedValue(null);

      // Act: Handler is only called for 'Settled' state due to filter
      await paymentSettledHandler!(mockEvent as PaymentStateTransitionEvent);

      // Assert
      expect(mockOrderPaymentHandlerService.processOrderPayment).toHaveBeenCalledWith(
        mockCtx,
        mockOrder as Order
      );
    });

    it('should create commission history records when payment is settled', async () => {
      // Arrange
      const mockOrder: Partial<Order> = {
        id: '100',
        totalWithTax: 10000,
        lines: [],
      };

      const mockPayment: Partial<Payment> = {
        id: '1',
        state: 'Settled',
        order: mockOrder as Order,
      };

      const mockEvent: Partial<PaymentStateTransitionEvent> = {
        entity: mockPayment as Payment,
        ctx: mockCtx,
        toState: 'Settled',
        fromState: 'Authorized',
      };

      const mockSplitResult = {
        orderId: '100',
        totalAmount: 10000,
        commission: 1500,
        sellerPayout: 8500,
        sellerSplits: [
          {
            sellerId: '5',
            amount: 8500,
            commission: 1500,
            lineTotal: 10000,
            commissionRate: 0.15, // Commission rate added by OrderPaymentHandlerService
          },
        ],
      };

      mockOrderPaymentHandlerService.processOrderPayment.mockResolvedValue(mockSplitResult as any);

      // Act
      await paymentSettledHandler!(mockEvent as PaymentStateTransitionEvent);

      // Assert
      expect(mockCommissionHistoryService.createCommissionHistory).toHaveBeenCalledWith(
        mockCtx,
        expect.objectContaining({
          orderId: '100',
          sellerId: '5',
          commissionRate: 0.15, // Uses commissionRate from split result
          orderTotal: 10000,
          commissionAmount: 1500,
          sellerPayout: 8500,
          status: CommissionHistoryStatus.CALCULATED,
        })
      );
    });

    it('should handle missing order in payment event gracefully', async () => {
      // Arrange
      const mockPayment: Partial<Payment> = {
        id: '1',
        state: 'Settled',
        order: null as any, // No order attached
      };

      const mockEvent: Partial<PaymentStateTransitionEvent> = {
        entity: mockPayment as Payment,
        ctx: mockCtx,
        toState: 'Settled',
        fromState: 'Authorized',
      };

      // Act & Assert: Should not throw
      await expect(paymentSettledHandler!(mockEvent as PaymentStateTransitionEvent)).resolves.not.toThrow();
      expect(mockOrderPaymentHandlerService.processOrderPayment).not.toHaveBeenCalled();
    });

    it('should handle errors gracefully when processing payment settlement fails', async () => {
      // Arrange
      const mockOrder: Partial<Order> = {
        id: '100',
        totalWithTax: 10000,
        lines: [],
      };

      const mockPayment: Partial<Payment> = {
        id: '1',
        state: 'Settled',
        order: mockOrder as Order,
      };

      const mockEvent: Partial<PaymentStateTransitionEvent> = {
        entity: mockPayment as Payment,
        ctx: mockCtx,
        toState: 'Settled',
        fromState: 'Authorized',
      };

      const error = new Error('Payment settlement processing failed');
      mockOrderPaymentHandlerService.processOrderPayment.mockRejectedValue(error);

      // Act & Assert: Should not throw, but log error
      await expect(paymentSettledHandler!(mockEvent as PaymentStateTransitionEvent)).resolves.not.toThrow();
    });
  });
});
