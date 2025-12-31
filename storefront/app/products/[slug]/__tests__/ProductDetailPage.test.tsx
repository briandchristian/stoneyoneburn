/**
 * Product Detail Page Tests
 *
 * Tests for the add to cart functionality on the product detail page.
 * These tests should have been written before implementing the component.
 */

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MockedProvider } from '@apollo/client/testing';
import ProductDetailPage from '../page';
import { GET_PRODUCT_BY_SLUG, ADD_ITEM_TO_ORDER, GET_ACTIVE_ORDER } from '@/graphql/queries';

// Mock Next.js components
jest.mock('next/navigation', () => ({
  useParams: () => ({ slug: 'test-product' }),
  useRouter: () => ({
    push: jest.fn(),
  }),
}));

jest.mock('@/components/Header', () => ({
  Header: () => <header>Header</header>,
}));

const mockProduct = {
  id: 'product-1',
  name: 'Test Product',
  slug: 'test-product',
  description: 'A test product description',
  featuredAsset: {
    id: 'asset-1',
    preview: 'https://example.com/image.jpg',
  },
  variants: [
    {
      id: 'variant-1',
      name: 'Default Variant',
      currencyCode: 'USD',
      price: 1000,
      priceWithTax: 1200,
      sku: 'SKU-001',
      stockLevel: 'IN_STOCK',
      options: [],
    },
  ],
  facetValues: [],
};

describe('ProductDetailPage - Add to Cart', () => {
  describe('Product Display', () => {
    it('should display product information', async () => {
      const mocks = [
        {
          request: {
            query: GET_PRODUCT_BY_SLUG,
            variables: { slug: 'test-product' },
          },
          result: {
            data: {
              product: mockProduct,
            },
          },
        },
      ];

      render(
        <MockedProvider mocks={mocks} addTypename={false}>
          <ProductDetailPage />
        </MockedProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('Test Product')).toBeInTheDocument();
      });

      expect(screen.getByText(/a test product description/i)).toBeInTheDocument();
      expect(screen.getByText(/\$12\.00/)).toBeInTheDocument(); // Price with tax
    });

    it('should display stock status', async () => {
      const mocks = [
        {
          request: {
            query: GET_PRODUCT_BY_SLUG,
            variables: { slug: 'test-product' },
          },
          result: {
            data: {
              product: mockProduct,
            },
          },
        },
      ];

      render(
        <MockedProvider mocks={mocks} addTypename={false}>
          <ProductDetailPage />
        </MockedProvider>
      );

      await waitFor(() => {
        expect(screen.getByText(/in stock/i)).toBeInTheDocument();
      });
    });

    it('should disable add to cart button when product is out of stock', async () => {
      const outOfStockProduct = {
        ...mockProduct,
        variants: [
          {
            ...mockProduct.variants[0],
            stockLevel: 'OUT_OF_STOCK',
          },
        ],
      };

      const mocks = [
        {
          request: {
            query: GET_PRODUCT_BY_SLUG,
            variables: { slug: 'test-product' },
          },
          result: {
            data: {
              product: outOfStockProduct,
            },
          },
        },
      ];

      render(
        <MockedProvider mocks={mocks} addTypename={false}>
          <ProductDetailPage />
        </MockedProvider>
      );

      await waitFor(() => {
        const button = screen.getByRole('button', { name: /out of stock/i });
        expect(button).toBeDisabled();
      });
    });
  });

  describe('Quantity Selection', () => {
    it('should display quantity selector for in-stock products', async () => {
      const mocks = [
        {
          request: {
            query: GET_PRODUCT_BY_SLUG,
            variables: { slug: 'test-product' },
          },
          result: {
            data: {
              product: mockProduct,
            },
          },
        },
      ];

      render(
        <MockedProvider mocks={mocks} addTypename={false}>
          <ProductDetailPage />
        </MockedProvider>
      );

      await waitFor(() => {
        expect(screen.getByLabelText(/quantity/i)).toBeInTheDocument();
      });

      const quantityInput = screen.getByLabelText(/quantity/i);
      expect(quantityInput).toHaveValue(1);
    });

    it('should allow increasing quantity', async () => {
      const user = userEvent.setup();
      const mocks = [
        {
          request: {
            query: GET_PRODUCT_BY_SLUG,
            variables: { slug: 'test-product' },
          },
          result: {
            data: {
              product: mockProduct,
            },
          },
        },
      ];

      render(
        <MockedProvider mocks={mocks} addTypename={false}>
          <ProductDetailPage />
        </MockedProvider>
      );

      await waitFor(() => {
        expect(screen.getByLabelText(/quantity/i)).toBeInTheDocument();
      });

      const quantityInput = screen.getByLabelText(/quantity/i);
      const incrementButton = quantityInput.parentElement?.querySelector('button:last-child');

      if (incrementButton) {
        await user.click(incrementButton);
        expect(quantityInput).toHaveValue(2);
      }
    });

    it('should not allow quantity below 1', async () => {
      const user = userEvent.setup();
      const mocks = [
        {
          request: {
            query: GET_PRODUCT_BY_SLUG,
            variables: { slug: 'test-product' },
          },
          result: {
            data: {
              product: mockProduct,
            },
          },
        },
      ];

      render(
        <MockedProvider mocks={mocks} addTypename={false}>
          <ProductDetailPage />
        </MockedProvider>
      );

      await waitFor(() => {
        expect(screen.getByLabelText(/quantity/i)).toBeInTheDocument();
      });

      const quantityInput = screen.getByLabelText(/quantity/i) as HTMLInputElement;
      const decrementButton = quantityInput.parentElement?.querySelector('button:first-child');

      if (decrementButton) {
        await user.click(decrementButton);
        // Should remain at 1, not go to 0
        expect(quantityInput.value).toBe('1');
      }
    });
  });

  describe('Add to Cart Functionality', () => {
    it('should call addItemToOrder mutation when add to cart is clicked', async () => {
      const user = userEvent.setup();
      const pushMock = jest.fn();

      jest.spyOn(require('next/navigation'), 'useRouter').mockReturnValue({
        push: pushMock,
      });

      const addItemMock = {
        request: {
          query: ADD_ITEM_TO_ORDER,
          variables: {
            productVariantId: 'variant-1',
            quantity: 1,
          },
        },
        result: {
          data: {
            addItemToOrder: {
              __typename: 'Order',
              id: 'order-1',
              code: 'ORDER001',
            },
          },
        },
      };

      const mocks = [
        {
          request: {
            query: GET_PRODUCT_BY_SLUG,
            variables: { slug: 'test-product' },
          },
          result: {
            data: {
              product: mockProduct,
            },
          },
        },
        addItemMock,
        {
          request: {
            query: GET_ACTIVE_ORDER,
          },
          result: {
            data: {
              activeOrder: {
                id: 'order-1',
                lines: [],
              },
            },
          },
        },
      ];

      render(
        <MockedProvider mocks={mocks} addTypename={false}>
          <ProductDetailPage />
        </MockedProvider>
      );

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /add to cart/i })).toBeInTheDocument();
      });

      const addToCartButton = screen.getByRole('button', { name: /add to cart/i });
      await user.click(addToCartButton);

      await waitFor(() => {
        expect(pushMock).toHaveBeenCalledWith('/cart');
      });
    });

    it('should use selected quantity when adding to cart', async () => {
      const user = userEvent.setup();
      const pushMock = jest.fn();

      jest.spyOn(require('next/navigation'), 'useRouter').mockReturnValue({
        push: pushMock,
      });

      const addItemMock = {
        request: {
          query: ADD_ITEM_TO_ORDER,
          variables: {
            productVariantId: 'variant-1',
            quantity: 3,
          },
        },
        result: {
          data: {
            addItemToOrder: {
              __typename: 'Order',
              id: 'order-1',
              code: 'ORDER001',
            },
          },
        },
      };

      const mocks = [
        {
          request: {
            query: GET_PRODUCT_BY_SLUG,
            variables: { slug: 'test-product' },
          },
          result: {
            data: {
              product: mockProduct,
            },
          },
        },
        addItemMock,
        {
          request: {
            query: GET_ACTIVE_ORDER,
          },
          result: {
            data: {
              activeOrder: {
                id: 'order-1',
                lines: [],
              },
            },
          },
        },
      ];

      render(
        <MockedProvider mocks={mocks} addTypename={false}>
          <ProductDetailPage />
        </MockedProvider>
      );

      await waitFor(() => {
        expect(screen.getByLabelText(/quantity/i)).toBeInTheDocument();
      });

      // Set quantity to 3
      const quantityInput = screen.getByLabelText(/quantity/i);
      const incrementButton = quantityInput.parentElement?.querySelector('button:last-child');

      if (incrementButton) {
        await user.click(incrementButton);
        await user.click(incrementButton);
        expect(quantityInput).toHaveValue(3);
      }

      const addToCartButton = screen.getByRole('button', { name: /add to cart/i });
      await user.click(addToCartButton);

      await waitFor(() => {
        expect(pushMock).toHaveBeenCalledWith('/cart');
      });
    });

    it('should show loading state while adding to cart', async () => {
      const user = userEvent.setup();

      const addItemMock = {
        request: {
          query: ADD_ITEM_TO_ORDER,
          variables: {
            productVariantId: 'variant-1',
            quantity: 1,
          },
        },
        result: {
          data: {
            addItemToOrder: {
              __typename: 'Order',
              id: 'order-1',
              code: 'ORDER001',
            },
          },
        },
        delay: 100,
      };

      const mocks = [
        {
          request: {
            query: GET_PRODUCT_BY_SLUG,
            variables: { slug: 'test-product' },
          },
          result: {
            data: {
              product: mockProduct,
            },
          },
        },
        addItemMock,
        {
          request: {
            query: GET_ACTIVE_ORDER,
          },
          result: {
            data: {
              activeOrder: {
                id: 'order-1',
                lines: [],
              },
            },
          },
        },
      ];

      render(
        <MockedProvider mocks={mocks} addTypename={false}>
          <ProductDetailPage />
        </MockedProvider>
      );

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /add to cart/i })).toBeInTheDocument();
      });

      const addToCartButton = screen.getByRole('button', { name: /add to cart/i });
      await user.click(addToCartButton);

      // Button should show loading state
      expect(screen.getByRole('button', { name: /adding to cart/i })).toBeInTheDocument();
    });

    it('should display error message when add to cart fails', async () => {
      const user = userEvent.setup();

      const addItemMock = {
        request: {
          query: ADD_ITEM_TO_ORDER,
          variables: {
            productVariantId: 'variant-1',
            quantity: 1,
          },
        },
        result: {
          data: {
            addItemToOrder: {
              __typename: 'InsufficientStockError',
              errorCode: 'INSUFFICIENT_STOCK_ERROR',
              message: 'Not enough stock available',
            },
          },
        },
      };

      const mocks = [
        {
          request: {
            query: GET_PRODUCT_BY_SLUG,
            variables: { slug: 'test-product' },
          },
          result: {
            data: {
              product: mockProduct,
            },
          },
        },
        addItemMock,
      ];

      render(
        <MockedProvider mocks={mocks} addTypename={false}>
          <ProductDetailPage />
        </MockedProvider>
      );

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /add to cart/i })).toBeInTheDocument();
      });

      const addToCartButton = screen.getByRole('button', { name: /add to cart/i });
      await user.click(addToCartButton);

      await waitFor(() => {
        expect(screen.getByText(/not enough stock available/i)).toBeInTheDocument();
      });
    });
  });
});
