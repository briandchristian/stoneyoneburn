/**
 * Order History Page Component Tests
 *
 * Tests for the Order History page component following TDD principles.
 * These tests are written first (red) before implementation.
 */

import '@testing-library/jest-dom';
import { render, screen, waitFor } from '@testing-library/react';
import { MockedProvider } from '@apollo/client/testing';
import OrderHistoryPage from '../page';
import { GET_ORDERS } from '@/graphql/queries';

// Mock Next.js components
jest.mock('next/link', () => {
  return ({ children, href }: { children: React.ReactNode; href: string }) => {
    return <a href={href}>{children}</a>;
  };
});

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
  total: 5000,
  totalWithTax: 6000,
  currencyCode: 'USD',
  lines: [
    {
      __typename: 'OrderLine',
      id: 'line-1',
      quantity: 2,
      productVariant: {
        __typename: 'ProductVariant',
        id: 'variant-1',
        name: 'Test Variant',
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
};

const mockOrder2 = {
  __typename: 'Order',
  id: 'order-2',
  code: 'ORDER002',
  state: 'Fulfilled',
  orderPlacedAt: '2024-01-10T10:00:00Z',
  total: 3000,
  totalWithTax: 3600,
  currencyCode: 'USD',
  lines: [
    {
      __typename: 'OrderLine',
      id: 'line-2',
      quantity: 1,
      productVariant: {
        __typename: 'ProductVariant',
        id: 'variant-2',
        name: 'Another Variant',
        product: {
          __typename: 'Product',
          id: 'product-2',
          name: 'Another Product',
          slug: 'another-product',
          featuredAsset: {
            __typename: 'Asset',
            id: 'asset-2',
            preview: 'https://example.com/image2.jpg',
          },
        },
      },
    },
  ],
};

describe('OrderHistoryPage', () => {
  describe('Loading State', () => {
    it('should show loading message when data is loading', () => {
      const mocks: any[] = [];

      render(
        <MockedProvider mocks={mocks} >
          <OrderHistoryPage />
        </MockedProvider>
      );

      expect(screen.getByText(/loading orders/i)).toBeInTheDocument();
    });
  });

  describe('Empty State', () => {
    it('should display empty state message when no orders exist', async () => {
      const mocks = [
        {
          request: {
            query: GET_ORDERS,
            variables: {
              options: {
                take: 10,
                skip: 0,
              },
            },
          },
          result: {
            data: {
              activeCustomer: {
                __typename: 'Customer',
                orders: {
                  __typename: 'OrderList',
                  items: [],
                  totalItems: 0,
                },
              },
            },
          },
        },
      ];

      render(
        <MockedProvider mocks={mocks} >
          <OrderHistoryPage />
        </MockedProvider>
      );

      await waitFor(() => {
        expect(screen.getByText(/no orders found/i)).toBeInTheDocument();
      });

      expect(screen.getByText(/you haven't placed any orders yet/i)).toBeInTheDocument();
    });
  });

  describe('Order List Display', () => {
    it('should display list of orders when orders exist', async () => {
      const mocks = [
        {
          request: {
            query: GET_ORDERS,
            variables: {
              options: {
                take: 10,
                skip: 0,
              },
            },
          },
          result: {
            data: {
              activeCustomer: {
                __typename: 'Customer',
                orders: {
                  __typename: 'OrderList',
                  items: [mockOrder, mockOrder2],
                  totalItems: 2,
                },
              },
            },
          },
        },
      ];

      render(
        <MockedProvider mocks={mocks} >
          <OrderHistoryPage />
        </MockedProvider>
      );

      await waitFor(() => {
        expect(screen.getByText(/ORDER001/)).toBeInTheDocument();
      });

      expect(screen.getByText(/ORDER002/)).toBeInTheDocument();
    });

    it('should display order code for each order', async () => {
      const mocks = [
        {
          request: {
            query: GET_ORDERS,
            variables: {
              options: {
                take: 10,
                skip: 0,
              },
            },
          },
          result: {
            data: {
              activeCustomer: {
                __typename: 'Customer',
                orders: {
                  __typename: 'OrderList',
                  items: [mockOrder],
                  totalItems: 1,
                },
              },
            },
          },
        },
      ];

      render(
        <MockedProvider mocks={mocks} >
          <OrderHistoryPage />
        </MockedProvider>
      );

      await waitFor(() => {
        expect(screen.getByText(/ORDER001/)).toBeInTheDocument();
      });
    });

    it('should display order date for each order', async () => {
      const mocks = [
        {
          request: {
            query: GET_ORDERS,
            variables: {
              options: {
                take: 10,
                skip: 0,
              },
            },
          },
          result: {
            data: {
              activeCustomer: {
                __typename: 'Customer',
                orders: {
                  __typename: 'OrderList',
                  items: [mockOrder],
                  totalItems: 1,
                },
              },
            },
          },
        },
      ];

      render(
        <MockedProvider mocks={mocks} >
          <OrderHistoryPage />
        </MockedProvider>
      );

      await waitFor(() => {
        // Date should be formatted and displayed
        expect(screen.getByText(/january 15, 2024/i)).toBeInTheDocument();
      });
    });

    it('should display order total for each order', async () => {
      const mocks = [
        {
          request: {
            query: GET_ORDERS,
            variables: {
              options: {
                take: 10,
                skip: 0,
              },
            },
          },
          result: {
            data: {
              activeCustomer: {
                __typename: 'Customer',
                orders: {
                  __typename: 'OrderList',
                  items: [mockOrder],
                  totalItems: 1,
                },
              },
            },
          },
        },
      ];

      render(
        <MockedProvider mocks={mocks} >
          <OrderHistoryPage />
        </MockedProvider>
      );

      await waitFor(() => {
        expect(screen.getByText(/\$60\.00/i)).toBeInTheDocument();
      });
    });

    it('should display order status for each order', async () => {
      const mocks = [
        {
          request: {
            query: GET_ORDERS,
            variables: {
              options: {
                take: 10,
                skip: 0,
              },
            },
          },
          result: {
            data: {
              activeCustomer: {
                __typename: 'Customer',
                orders: {
                  __typename: 'OrderList',
                  items: [mockOrder],
                  totalItems: 1,
                },
              },
            },
          },
        },
      ];

      render(
        <MockedProvider mocks={mocks} >
          <OrderHistoryPage />
        </MockedProvider>
      );

      await waitFor(() => {
        expect(screen.getByText(/payment settled/i)).toBeInTheDocument();
      });
    });

    it('should display link to order detail page for each order', async () => {
      const mocks = [
        {
          request: {
            query: GET_ORDERS,
            variables: {
              options: {
                take: 10,
                skip: 0,
              },
            },
          },
          result: {
            data: {
              activeCustomer: {
                __typename: 'Customer',
                orders: {
                  __typename: 'OrderList',
                  items: [mockOrder],
                  totalItems: 1,
                },
              },
            },
          },
        },
      ];

      render(
        <MockedProvider mocks={mocks} >
          <OrderHistoryPage />
        </MockedProvider>
      );

      await waitFor(() => {
        const link = screen.getByRole('link', { name: /view order/i });
        expect(link).toBeInTheDocument();
        expect(link).toHaveAttribute('href', '/orders/ORDER001');
      });
    });
  });

  describe('Error Handling', () => {
    it('should display error message when query fails', async () => {
      const mocks = [
        {
          request: {
            query: GET_ORDERS,
            variables: {
              options: {
                take: 10,
                skip: 0,
              },
            },
          },
          error: new Error('Failed to fetch orders'),
        },
      ];

      render(
        <MockedProvider mocks={mocks} >
          <OrderHistoryPage />
        </MockedProvider>
      );

      await waitFor(() => {
        expect(screen.getByText(/error loading orders/i)).toBeInTheDocument();
      });
    });
  });

  describe('Pagination', () => {
    it('should display pagination controls when there are multiple pages', async () => {
      const mocks = [
        {
          request: {
            query: GET_ORDERS,
            variables: {
              options: {
                take: 10,
                skip: 0,
              },
            },
          },
          result: {
            data: {
              activeCustomer: {
                __typename: 'Customer',
                orders: {
                  __typename: 'OrderList',
                  items: [mockOrder],
                  totalItems: 25,
                },
              },
            },
          },
        },
      ];

      render(
        <MockedProvider mocks={mocks} >
          <OrderHistoryPage />
        </MockedProvider>
      );

      await waitFor(() => {
        expect(screen.getByText(/showing 1 - 10 of 25 orders/i)).toBeInTheDocument();
      });
    });
  });
});
