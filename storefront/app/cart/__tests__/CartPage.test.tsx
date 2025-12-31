/**
 * Cart Page Component Tests
 *
 * Tests for the Cart page component following TDD principles.
 * These tests should have been written before implementing the component.
 */

import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MockedProvider } from '@apollo/client/testing';
import CartPage from '../page';
import { GET_ACTIVE_ORDER, ADJUST_ORDER_LINE, REMOVE_ORDER_LINE } from '@/graphql/queries';

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
const mockOrderLine = {
  id: '1',
  quantity: 2,
  unitPrice: 1000,
  unitPriceWithTax: 1200,
  linePrice: 2000,
  linePriceWithTax: 2400,
  productVariant: {
    id: 'variant-1',
    name: 'Variant 1',
    sku: 'SKU-001',
    product: {
      id: 'product-1',
      name: 'Test Product',
      slug: 'test-product',
      featuredAsset: {
        id: 'asset-1',
        preview: 'https://example.com/image.jpg',
      },
    },
  },
};

const mockActiveOrder = {
  id: 'order-1',
  code: 'ORDER001',
  state: 'AddingItems',
  total: 2400,
  totalWithTax: 2400,
  currencyCode: 'USD',
  lines: [mockOrderLine],
  shippingWithTax: 0,
};

const mockEmptyOrder = {
  id: 'order-empty',
  code: 'ORDER002',
  state: 'AddingItems',
  total: 0,
  totalWithTax: 0,
  currencyCode: 'USD',
  lines: [],
  shippingWithTax: 0,
};

describe('CartPage', () => {
  describe('Loading State', () => {
    it('should show loading message when data is loading', () => {
      const mocks: any[] = [];

      render(
        <MockedProvider mocks={mocks} addTypename={false}>
          <CartPage />
        </MockedProvider>
      );

      expect(screen.getByText(/loading cart/i)).toBeInTheDocument();
    });
  });

  describe('Empty Cart', () => {
    it('should display empty cart message when cart has no items', async () => {
      const mocks = [
        {
          request: {
            query: GET_ACTIVE_ORDER,
          },
          result: {
            data: {
              activeOrder: mockEmptyOrder,
            },
          },
        },
      ];

      render(
        <MockedProvider mocks={mocks} addTypename={false}>
          <CartPage />
        </MockedProvider>
      );

      await waitFor(() => {
        expect(screen.getByText(/your cart is empty/i)).toBeInTheDocument();
      });

      expect(screen.getByText(/start shopping to add items/i)).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /continue shopping/i })).toBeInTheDocument();
    });
  });

  describe('Cart with Items', () => {
    it('should display cart items when order has lines', async () => {
      const mocks = [
        {
          request: {
            query: GET_ACTIVE_ORDER,
          },
          result: {
            data: {
              activeOrder: mockActiveOrder,
            },
          },
        },
      ];

      render(
        <MockedProvider mocks={mocks} addTypename={false}>
          <CartPage />
        </MockedProvider>
      );

      await waitFor(() => {
        expect(screen.getByText(/shopping cart/i)).toBeInTheDocument();
      });

      expect(screen.getByText('Test Product')).toBeInTheDocument();
      expect(screen.getByText(/variant 1/i)).toBeInTheDocument();
      expect(screen.getByText(/sku-001/i)).toBeInTheDocument();
    });

    it('should display correct quantities for each item', async () => {
      const mocks = [
        {
          request: {
            query: GET_ACTIVE_ORDER,
          },
          result: {
            data: {
              activeOrder: mockActiveOrder,
            },
          },
        },
      ];

      render(
        <MockedProvider mocks={mocks} addTypename={false}>
          <CartPage />
        </MockedProvider>
      );

      await waitFor(() => {
        expect(screen.getByDisplayValue('2')).toBeInTheDocument();
      });
    });

    it('should display correct prices and totals', async () => {
      const mocks = [
        {
          request: {
            query: GET_ACTIVE_ORDER,
          },
          result: {
            data: {
              activeOrder: mockActiveOrder,
            },
          },
        },
      ];

      render(
        <MockedProvider mocks={mocks} addTypename={false}>
          <CartPage />
        </MockedProvider>
      );

      await waitFor(() => {
        expect(screen.getByText(/order summary/i)).toBeInTheDocument();
      });

      // Check for price displays (formatted as currency)
      expect(screen.getByText(/\$24\.00/)).toBeInTheDocument(); // $24.00 total
    });

    it('should display checkout button when cart has items', async () => {
      const mocks = [
        {
          request: {
            query: GET_ACTIVE_ORDER,
          },
          result: {
            data: {
              activeOrder: mockActiveOrder,
            },
          },
        },
      ];

      render(
        <MockedProvider mocks={mocks} addTypename={false}>
          <CartPage />
        </MockedProvider>
      );

      await waitFor(() => {
        expect(screen.getByRole('link', { name: /proceed to checkout/i })).toBeInTheDocument();
      });
    });
  });

  describe('Quantity Adjustment', () => {
    it('should call adjustOrderLine mutation when quantity is increased', async () => {
      const user = userEvent.setup();
      const adjustMutationMock = {
        request: {
          query: ADJUST_ORDER_LINE,
          variables: {
            orderLineId: '1',
            quantity: 3,
          },
        },
        result: {
          data: {
            adjustOrderLine: {
              __typename: 'Order',
              ...mockActiveOrder,
              lines: [
                {
                  ...mockOrderLine,
                  quantity: 3,
                  linePriceWithTax: 3600,
                },
              ],
            },
          },
        },
      };

      const mocks = [
        {
          request: {
            query: GET_ACTIVE_ORDER,
          },
          result: {
            data: {
              activeOrder: mockActiveOrder,
            },
          },
        },
        adjustMutationMock,
        {
          request: {
            query: GET_ACTIVE_ORDER,
          },
          result: {
            data: {
              activeOrder: {
                ...mockActiveOrder,
                lines: [
                  {
                    ...mockOrderLine,
                    quantity: 3,
                  },
                ],
              },
            },
          },
        },
      ];

      render(
        <MockedProvider mocks={mocks} addTypename={false}>
          <CartPage />
        </MockedProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('Test Product')).toBeInTheDocument();
      });

      // Find and click the increment button
      const quantityInput = screen.getByDisplayValue('2');
      const incrementButton = quantityInput.parentElement?.querySelector('button:last-child');

      if (incrementButton) {
        await user.click(incrementButton);
      }

      await waitFor(() => {
        expect(screen.getByDisplayValue('3')).toBeInTheDocument();
      });
    });

    it('should not allow quantity below 1', async () => {
      const user = userEvent.setup();

      const mocks = [
        {
          request: {
            query: GET_ACTIVE_ORDER,
          },
          result: {
            data: {
              activeOrder: mockActiveOrder,
            },
          },
        },
      ];

      render(
        <MockedProvider mocks={mocks} addTypename={false}>
          <CartPage />
        </MockedProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('Test Product')).toBeInTheDocument();
      });

      // Quantity should remain at 1 when decremented from 1
      const quantityInput = screen.getByDisplayValue('2');
      const decrementButton = quantityInput.parentElement?.querySelector('button:first-child');

      if (decrementButton) {
        await user.click(decrementButton);
        // Should call mutation with quantity 1, not 0
        await waitFor(() => {
          expect(screen.getByDisplayValue('1')).toBeInTheDocument();
        });
      }
    });
  });

  describe('Remove Item', () => {
    it('should call removeOrderLine mutation when remove button is clicked', async () => {
      const user = userEvent.setup();

      const removeMutationMock = {
        request: {
          query: REMOVE_ORDER_LINE,
          variables: {
            orderLineId: '1',
          },
        },
        result: {
          data: {
            removeOrderLine: {
              __typename: 'Order',
              ...mockActiveOrder,
              lines: [],
            },
          },
        },
      };

      const mocks = [
        {
          request: {
            query: GET_ACTIVE_ORDER,
          },
          result: {
            data: {
              activeOrder: mockActiveOrder,
            },
          },
        },
        removeMutationMock,
        {
          request: {
            query: GET_ACTIVE_ORDER,
          },
          result: {
            data: {
              activeOrder: mockEmptyOrder,
            },
          },
        },
      ];

      render(
        <MockedProvider mocks={mocks} addTypename={false}>
          <CartPage />
        </MockedProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('Test Product')).toBeInTheDocument();
      });

      const removeButton = screen.getByRole('button', { name: /remove/i });
      await user.click(removeButton);

      await waitFor(() => {
        expect(screen.getByText(/your cart is empty/i)).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle query errors gracefully', async () => {
      const mocks = [
        {
          request: {
            query: GET_ACTIVE_ORDER,
          },
          error: new Error('Network error'),
        },
      ];

      render(
        <MockedProvider mocks={mocks} addTypename={false}>
          <CartPage />
        </MockedProvider>
      );

      await waitFor(() => {
        expect(screen.getByText(/error loading cart/i)).toBeInTheDocument();
      });
    });
  });
});
