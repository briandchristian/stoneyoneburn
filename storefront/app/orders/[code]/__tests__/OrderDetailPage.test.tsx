/**
 * Order Detail Page Component Tests
 *
 * Tests for the Order Detail page component following TDD principles.
 * These tests are written first (red) before implementation.
 */

import '@testing-library/jest-dom';
import { render, screen, waitFor } from '@testing-library/react';
import { MockedProvider } from '@apollo/client/testing';
import OrderDetailPage from '../page';
import { GET_ORDER_BY_CODE } from '@/graphql/queries';

// Mock Next.js components
jest.mock('next/link', () => {
  return ({ children, href }: { children: React.ReactNode; href: string }) => {
    return <a href={href}>{children}</a>;
  };
});

jest.mock('next/navigation', () => ({
  useParams: () => ({ code: 'ORDER001' }),
}));

jest.mock('@/components/Header', () => ({
  Header: () => <header>Header</header>,
}));

// Mock data
const mockOrder = {
  __typename: 'Order',
  id: 'order-1',
  code: 'ORDER001',
  state: 'PaymentSettled',
  orderPlacedAt: '2024-01-15T10:00:00Z',
  createdAt: '2024-01-15T09:00:00Z',
  updatedAt: '2024-01-15T10:00:00Z',
  total: 5000,
  totalWithTax: 6000,
  subTotal: 4000,
  subTotalWithTax: 4800,
  shipping: 1000,
  shippingWithTax: 1200,
  currencyCode: 'USD',
  customer: {
    __typename: 'Customer',
    id: 'customer-1',
    firstName: 'John',
    lastName: 'Doe',
    emailAddress: 'john@example.com',
  },
  shippingAddress: {
    __typename: 'OrderAddress',
    fullName: 'John Doe',
    company: null,
    streetLine1: '123 Main St',
    streetLine2: 'Apt 4B',
    city: 'New York',
    province: 'NY',
    postalCode: '10001',
    countryCode: 'US',
    phoneNumber: '555-1234',
  },
  billingAddress: {
    __typename: 'OrderAddress',
    fullName: 'John Doe',
    company: null,
    streetLine1: '123 Main St',
    streetLine2: 'Apt 4B',
    city: 'New York',
    province: 'NY',
    postalCode: '10001',
    countryCode: 'US',
    phoneNumber: '555-1234',
  },
  lines: [
    {
      __typename: 'OrderLine',
      id: 'line-1',
      quantity: 2,
      unitPrice: 2000,
      unitPriceWithTax: 2400,
      linePrice: 4000,
      linePriceWithTax: 4800,
      productVariant: {
        __typename: 'ProductVariant',
        id: 'variant-1',
        name: 'Test Variant',
        sku: 'SKU-001',
        product: {
          __typename: 'Product',
          id: 'product-1',
          name: 'Test Product',
          slug: 'test-product',
          featuredAsset: {
            __typename: 'Asset',
            id: 'asset-1',
            preview: 'https://example.com/image.jpg',
          },
        },
      },
    },
  ],
  shippingLines: [
    {
      __typename: 'ShippingLine',
      id: 'shipping-1',
      shippingMethod: {
        __typename: 'ShippingMethod',
        id: 'method-1',
        name: 'Standard Shipping',
        code: 'standard',
        description: 'Standard shipping method',
      },
      price: 1000,
      priceWithTax: 1200,
    },
  ],
  payments: [
    {
      __typename: 'Payment',
      id: 'payment-1',
      state: 'Settled',
      method: 'standard-payment',
      amount: 6000,
      transactionId: 'TXN-123',
      createdAt: '2024-01-15T10:00:00Z',
    },
  ],
  fulfillments: [],
};

describe('OrderDetailPage', () => {
  describe('Loading State', () => {
    it('should show loading message when data is loading', () => {
      const mocks: any[] = [];

      render(
        <MockedProvider mocks={mocks} addTypename={false}>
          <OrderDetailPage />
        </MockedProvider>
      );

      expect(screen.getByText(/loading order/i)).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('should display error message when order is not found', async () => {
      const mocks = [
        {
          request: {
            query: GET_ORDER_BY_CODE,
            variables: {
              code: 'ORDER001',
            },
          },
          result: {
            data: {
              orderByCode: null,
            },
          },
        },
      ];

      render(
        <MockedProvider mocks={mocks} addTypename={false}>
          <OrderDetailPage />
        </MockedProvider>
      );

      await waitFor(() => {
        expect(screen.getByText(/order not found/i)).toBeInTheDocument();
      });
    });

    it('should display error message when query fails', async () => {
      const mocks = [
        {
          request: {
            query: GET_ORDER_BY_CODE,
            variables: {
              code: 'ORDER001',
            },
          },
          error: new Error('Failed to fetch order'),
        },
      ];

      render(
        <MockedProvider mocks={mocks} addTypename={false}>
          <OrderDetailPage />
        </MockedProvider>
      );

      await waitFor(() => {
        expect(screen.getByText(/error loading order/i)).toBeInTheDocument();
      });
    });
  });

  describe('Order Information Display', () => {
    it('should display order code', async () => {
      const mocks = [
        {
          request: {
            query: GET_ORDER_BY_CODE,
            variables: {
              code: 'ORDER001',
            },
          },
          result: {
            data: {
              orderByCode: mockOrder,
            },
          },
        },
      ];

      render(
        <MockedProvider mocks={mocks} addTypename={false}>
          <OrderDetailPage />
        </MockedProvider>
      );

      await waitFor(() => {
        expect(screen.getByText(/ORDER001/)).toBeInTheDocument();
      });
    });

    it('should display order date', async () => {
      const mocks = [
        {
          request: {
            query: GET_ORDER_BY_CODE,
            variables: {
              code: 'ORDER001',
            },
          },
          result: {
            data: {
              orderByCode: mockOrder,
            },
          },
        },
      ];

      render(
        <MockedProvider mocks={mocks} addTypename={false}>
          <OrderDetailPage />
        </MockedProvider>
      );

      await waitFor(() => {
        expect(screen.getByText(/january 15, 2024/i)).toBeInTheDocument();
      });
    });

    it('should display order status', async () => {
      const mocks = [
        {
          request: {
            query: GET_ORDER_BY_CODE,
            variables: {
              code: 'ORDER001',
            },
          },
          result: {
            data: {
              orderByCode: mockOrder,
            },
          },
        },
      ];

      render(
        <MockedProvider mocks={mocks} addTypename={false}>
          <OrderDetailPage />
        </MockedProvider>
      );

      await waitFor(() => {
        expect(screen.getByText(/payment settled/i)).toBeInTheDocument();
      });
    });
  });

  describe('Order Items Display', () => {
    it('should display all order items', async () => {
      const mocks = [
        {
          request: {
            query: GET_ORDER_BY_CODE,
            variables: {
              code: 'ORDER001',
            },
          },
          result: {
            data: {
              orderByCode: mockOrder,
            },
          },
        },
      ];

      render(
        <MockedProvider mocks={mocks} addTypename={false}>
          <OrderDetailPage />
        </MockedProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('Test Product')).toBeInTheDocument();
      });

      expect(screen.getByText(/quantity: 2/i)).toBeInTheDocument();
    });

    it('should display product image for each item', async () => {
      const mocks = [
        {
          request: {
            query: GET_ORDER_BY_CODE,
            variables: {
              code: 'ORDER001',
            },
          },
          result: {
            data: {
              orderByCode: mockOrder,
            },
          },
        },
      ];

      render(
        <MockedProvider mocks={mocks} addTypename={false}>
          <OrderDetailPage />
        </MockedProvider>
      );

      await waitFor(() => {
        const image = screen.getByAltText('Test Product');
        expect(image).toBeInTheDocument();
        expect(image).toHaveAttribute('src', 'https://example.com/image.jpg');
      });
    });

    it('should display line price for each item', async () => {
      const mocks = [
        {
          request: {
            query: GET_ORDER_BY_CODE,
            variables: {
              code: 'ORDER001',
            },
          },
          result: {
            data: {
              orderByCode: mockOrder,
            },
          },
        },
      ];

      render(
        <MockedProvider mocks={mocks} addTypename={false}>
          <OrderDetailPage />
        </MockedProvider>
      );

      await waitFor(() => {
        expect(screen.getByText(/\$48\.00/i)).toBeInTheDocument();
      });
    });
  });

  describe('Order Summary Display', () => {
    it('should display subtotal', async () => {
      const mocks = [
        {
          request: {
            query: GET_ORDER_BY_CODE,
            variables: {
              code: 'ORDER001',
            },
          },
          result: {
            data: {
              orderByCode: mockOrder,
            },
          },
        },
      ];

      render(
        <MockedProvider mocks={mocks} addTypename={false}>
          <OrderDetailPage />
        </MockedProvider>
      );

      await waitFor(() => {
        expect(screen.getByText(/subtotal/i)).toBeInTheDocument();
        expect(screen.getByText(/\$48\.00/i)).toBeInTheDocument();
      });
    });

    it('should display shipping cost', async () => {
      const mocks = [
        {
          request: {
            query: GET_ORDER_BY_CODE,
            variables: {
              code: 'ORDER001',
            },
          },
          result: {
            data: {
              orderByCode: mockOrder,
            },
          },
        },
      ];

      render(
        <MockedProvider mocks={mocks} addTypename={false}>
          <OrderDetailPage />
        </MockedProvider>
      );

      await waitFor(() => {
        expect(screen.getByText(/shipping/i)).toBeInTheDocument();
        expect(screen.getByText(/\$12\.00/i)).toBeInTheDocument();
      });
    });

    it('should display total', async () => {
      const mocks = [
        {
          request: {
            query: GET_ORDER_BY_CODE,
            variables: {
              code: 'ORDER001',
            },
          },
          result: {
            data: {
              orderByCode: mockOrder,
            },
          },
        },
      ];

      render(
        <MockedProvider mocks={mocks} addTypename={false}>
          <OrderDetailPage />
        </MockedProvider>
      );

      await waitFor(() => {
        expect(screen.getByText(/total/i)).toBeInTheDocument();
        expect(screen.getByText(/\$60\.00/i)).toBeInTheDocument();
      });
    });
  });

  describe('Address Display', () => {
    it('should display shipping address', async () => {
      const mocks = [
        {
          request: {
            query: GET_ORDER_BY_CODE,
            variables: {
              code: 'ORDER001',
            },
          },
          result: {
            data: {
              orderByCode: mockOrder,
            },
          },
        },
      ];

      render(
        <MockedProvider mocks={mocks} addTypename={false}>
          <OrderDetailPage />
        </MockedProvider>
      );

      await waitFor(() => {
        expect(screen.getByText(/shipping address/i)).toBeInTheDocument();
        expect(screen.getByText('123 Main St')).toBeInTheDocument();
        expect(screen.getByText('New York, NY 10001')).toBeInTheDocument();
      });
    });

    it('should display billing address', async () => {
      const mocks = [
        {
          request: {
            query: GET_ORDER_BY_CODE,
            variables: {
              code: 'ORDER001',
            },
          },
          result: {
            data: {
              orderByCode: mockOrder,
            },
          },
        },
      ];

      render(
        <MockedProvider mocks={mocks} addTypename={false}>
          <OrderDetailPage />
        </MockedProvider>
      );

      await waitFor(() => {
        expect(screen.getByText(/billing address/i)).toBeInTheDocument();
        expect(screen.getByText('123 Main St')).toBeInTheDocument();
      });
    });
  });

  describe('Payment Information Display', () => {
    it('should display payment status', async () => {
      const mocks = [
        {
          request: {
            query: GET_ORDER_BY_CODE,
            variables: {
              code: 'ORDER001',
            },
          },
          result: {
            data: {
              orderByCode: mockOrder,
            },
          },
        },
      ];

      render(
        <MockedProvider mocks={mocks} addTypename={false}>
          <OrderDetailPage />
        </MockedProvider>
      );

      await waitFor(() => {
        expect(screen.getByText(/payment/i)).toBeInTheDocument();
        expect(screen.getByText(/settled/i)).toBeInTheDocument();
      });
    });

    it('should display payment amount', async () => {
      const mocks = [
        {
          request: {
            query: GET_ORDER_BY_CODE,
            variables: {
              code: 'ORDER001',
            },
          },
          result: {
            data: {
              orderByCode: mockOrder,
            },
          },
        },
      ];

      render(
        <MockedProvider mocks={mocks} addTypename={false}>
          <OrderDetailPage />
        </MockedProvider>
      );

      await waitFor(() => {
        expect(screen.getByText(/\$60\.00/i)).toBeInTheDocument();
      });
    });
  });

  describe('Navigation', () => {
    it('should display link back to order history', async () => {
      const mocks = [
        {
          request: {
            query: GET_ORDER_BY_CODE,
            variables: {
              code: 'ORDER001',
            },
          },
          result: {
            data: {
              orderByCode: mockOrder,
            },
          },
        },
      ];

      render(
        <MockedProvider mocks={mocks} addTypename={false}>
          <OrderDetailPage />
        </MockedProvider>
      );

      await waitFor(() => {
        const link = screen.getByRole('link', { name: /back to orders/i });
        expect(link).toBeInTheDocument();
        expect(link).toHaveAttribute('href', '/orders');
      });
    });
  });
});
