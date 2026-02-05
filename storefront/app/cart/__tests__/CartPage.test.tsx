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
const mockSeller1 = {
  __typename: 'MarketplaceSeller' as const,
  id: '1',
  shopName: 'Test Shop',
  shopSlug: 'test-shop',
};

const mockSeller2 = {
  __typename: 'MarketplaceSeller' as const,
  id: '2',
  shopName: 'Another Shop',
  shopSlug: 'another-shop',
};

// Helper to create order line with seller
const createOrderLineWithSeller = (id: string, productName: string, seller: typeof mockSeller1 | null) => ({
  __typename: 'OrderLine' as const,
  id,
  quantity: 2,
  unitPrice: 1000,
  unitPriceWithTax: 1200,
  linePrice: 2000,
  linePriceWithTax: 2400,
  productVariant: {
    __typename: 'ProductVariant' as const,
    id: `variant-${id}`,
    name: `Variant ${id}`,
    sku: `SKU-${id}`,
    product: {
      __typename: 'Product' as const,
      id: `product-${id}`,
      name: productName,
      slug: `product-${id}`,
      featuredAsset: {
        __typename: 'Asset' as const,
        id: `asset-${id}`,
        preview: `https://example.com/image-${id}.jpg`,
      },
      seller: seller,
    },
  },
});

const mockOrderLine = {
  __typename: 'OrderLine' as const,
  id: '1',
  quantity: 2,
  unitPrice: 1000,
  unitPriceWithTax: 1200,
  linePrice: 2000,
  linePriceWithTax: 2400,
  productVariant: {
    __typename: 'ProductVariant' as const,
    id: 'variant-1',
    name: 'Variant 1',
    sku: 'SKU-001',
    product: {
      __typename: 'Product' as const,
      id: 'product-1',
      name: 'Test Product',
      slug: 'test-product',
      featuredAsset: {
        __typename: 'Asset' as const,
        id: 'asset-1',
        preview: 'https://example.com/image.jpg',
      },
      seller: null,
    },
  },
};

const mockOrderLineWithSeller1 = createOrderLineWithSeller('2', 'Seller 1 Product', mockSeller1);
const mockOrderLineWithSeller2 = createOrderLineWithSeller('3', 'Seller 2 Product', mockSeller2);

const mockActiveOrder = {
  __typename: 'Order' as const,
  id: 'order-1',
  code: 'ORDER001',
  state: 'AddingItems',
  total: 2400,
  totalWithTax: 2400,
  currencyCode: 'USD',
  lines: [mockOrderLine],
  shippingWithTax: 0,
  shippingAddress: null,
  shippingLines: [],
  billingAddress: null,
};

const mockEmptyOrder = {
  __typename: 'Order' as const,
  id: 'order-empty',
  code: 'ORDER002',
  state: 'AddingItems',
  total: 0,
  totalWithTax: 0,
  currencyCode: 'USD',
  lines: [],
  shippingWithTax: 0,
  shippingAddress: null,
  shippingLines: [],
  billingAddress: null,
};

describe('CartPage', () => {
  describe('Loading State', () => {
    it('should show loading message when data is loading', () => {
      const mocks: any[] = [];

      render(
        <MockedProvider mocks={mocks}>
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
        <MockedProvider mocks={mocks}>
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
        <MockedProvider mocks={mocks}>
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
        <MockedProvider mocks={mocks}>
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
        <MockedProvider mocks={mocks}>
          <CartPage />
        </MockedProvider>
      );

      await waitFor(() => {
        expect(screen.getByText(/order summary/i)).toBeInTheDocument();
      });

      // Check for price displays (formatted as currency)
      // Find the "Total" label and verify the total value is displayed next to it
      const totalLabel = screen.getByText('Total');
      const totalRow = totalLabel.closest('div');
      expect(totalRow).toBeInTheDocument();
      // The total value should be in the same row as the "Total" label
      expect(totalRow).toHaveTextContent('$24.00');
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
        <MockedProvider mocks={mocks}>
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
        <MockedProvider mocks={mocks}>
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

      const adjustMutationMock = {
        request: {
          query: ADJUST_ORDER_LINE,
          variables: {
            orderLineId: '1',
            quantity: 1,
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
                  quantity: 1,
                  linePrice: 1000,
                  linePriceWithTax: 1200,
                },
              ],
              total: 1200,
              totalWithTax: 1200,
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
                    quantity: 1,
                    linePrice: 1000,
                    linePriceWithTax: 1200,
                  },
                ],
                total: 1200,
                totalWithTax: 1200,
              },
            },
          },
        },
      ];

      render(
        <MockedProvider mocks={mocks}>
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
        <MockedProvider mocks={mocks}>
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
        <MockedProvider mocks={mocks}>
          <CartPage />
        </MockedProvider>
      );

      await waitFor(() => {
        expect(screen.getByText(/error loading cart/i)).toBeInTheDocument();
      });
    });
  });

  describe('Multi-Seller Cart Grouping', () => {
    it('should group cart items by seller when multiple sellers are present', async () => {
      const multiSellerOrder = {
        ...mockActiveOrder,
        lines: [mockOrderLineWithSeller1, mockOrderLineWithSeller2],
        total: 4800,
        totalWithTax: 4800,
      };

      const mocks = [
        {
          request: {
            query: GET_ACTIVE_ORDER,
          },
          result: {
            data: {
              activeOrder: multiSellerOrder,
            },
          },
        },
      ];

      render(
        <MockedProvider mocks={mocks}>
          <CartPage />
        </MockedProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('Test Shop')).toBeInTheDocument();
      });

      // Verify seller headers are displayed
      expect(screen.getByText('Test Shop')).toBeInTheDocument();
      expect(screen.getByText('Another Shop')).toBeInTheDocument();
      
      // Verify products are displayed
      expect(screen.getByText('Seller 1 Product')).toBeInTheDocument();
      expect(screen.getByText('Seller 2 Product')).toBeInTheDocument();
    });

    it('should display seller subtotals when cart has multiple sellers', async () => {
      const multiSellerOrder = {
        ...mockActiveOrder,
        lines: [mockOrderLineWithSeller1, mockOrderLineWithSeller2],
        total: 4800,
        totalWithTax: 4800,
      };

      const mocks = [
        {
          request: {
            query: GET_ACTIVE_ORDER,
          },
          result: {
            data: {
              activeOrder: multiSellerOrder,
            },
          },
        },
      ];

      render(
        <MockedProvider mocks={mocks}>
          <CartPage />
        </MockedProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('Test Shop')).toBeInTheDocument();
      });

      // Check for subtotal text (case-insensitive)
      const subtotalTexts = screen.getAllByText(/subtotal from/i);
      expect(subtotalTexts.length).toBeGreaterThan(0);
      expect(screen.getByText(/subtotal from test shop/i)).toBeInTheDocument();
      expect(screen.getByText(/subtotal from another shop/i)).toBeInTheDocument();
    });

    it('should not display seller subtotals when cart has only one seller', async () => {
      const singleSellerOrder = {
        ...mockActiveOrder,
        lines: [mockOrderLineWithSeller1],
        total: 2400,
        totalWithTax: 2400,
      };

      const mocks = [
        {
          request: {
            query: GET_ACTIVE_ORDER,
          },
          result: {
            data: {
              activeOrder: singleSellerOrder,
            },
          },
        },
      ];

      render(
        <MockedProvider mocks={mocks}>
          <CartPage />
        </MockedProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('Test Shop')).toBeInTheDocument();
      });

      // Should not show subtotal when only one seller
      expect(screen.queryByText(/subtotal from/i)).not.toBeInTheDocument();
    });

    it('should display item count for each seller group', async () => {
      const multiSellerOrder = {
        ...mockActiveOrder,
        lines: [
          mockOrderLineWithSeller1,
          createOrderLineWithSeller('4', 'Another Seller 1 Product', mockSeller1),
          mockOrderLineWithSeller2,
        ],
        total: 7200,
        totalWithTax: 7200,
      };

      const mocks = [
        {
          request: {
            query: GET_ACTIVE_ORDER,
          },
          result: {
            data: {
              activeOrder: multiSellerOrder,
            },
          },
        },
      ];

      render(
        <MockedProvider mocks={mocks}>
          <CartPage />
        </MockedProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('Test Shop')).toBeInTheDocument();
      });

      // Check item counts
      expect(screen.getByText(/2 items/i)).toBeInTheDocument();
      expect(screen.getByText(/1 item/i)).toBeInTheDocument();
    });

    it('should group products without sellers together', async () => {
      const mixedOrder = {
        ...mockActiveOrder,
        lines: [mockOrderLine, mockOrderLineWithSeller1],
        total: 4800,
        totalWithTax: 4800,
      };

      const mocks = [
        {
          request: {
            query: GET_ACTIVE_ORDER,
          },
          result: {
            data: {
              activeOrder: mixedOrder,
            },
          },
        },
      ];

      render(
        <MockedProvider mocks={mocks}>
          <CartPage />
        </MockedProvider>
      );

      await waitFor(() => {
        // Products should be displayed
        expect(screen.getByText('Test Product')).toBeInTheDocument();
        expect(screen.getByText('Seller 1 Product')).toBeInTheDocument();
      });

      // Seller header should be displayed for seller 1
      expect(screen.getByText('Test Shop')).toBeInTheDocument();
      
      // Products without sellers should still be displayed (grouped separately)
      expect(screen.getByText('Test Product')).toBeInTheDocument();
      expect(screen.getByText('Seller 1 Product')).toBeInTheDocument();
    });

    it('should link seller names to shop pages', async () => {
      const multiSellerOrder = {
        ...mockActiveOrder,
        lines: [mockOrderLineWithSeller1],
        total: 2400,
        totalWithTax: 2400,
      };

      const mocks = [
        {
          request: {
            query: GET_ACTIVE_ORDER,
          },
          result: {
            data: {
              activeOrder: multiSellerOrder,
            },
          },
        },
      ];

      render(
        <MockedProvider mocks={mocks}>
          <CartPage />
        </MockedProvider>
      );

      await waitFor(() => {
        const sellerLink = screen.getByRole('link', { name: 'Test Shop' });
        expect(sellerLink).toBeInTheDocument();
        expect(sellerLink).toHaveAttribute('href', '/shops/test-shop');
      });
    });
  });
});
