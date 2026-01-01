/**
 * Checkout Page Component Tests
 *
 * Tests for the Checkout page component following TDD principles.
 * These tests should have been written before implementing the component.
 */

import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MockedProvider } from '@apollo/client/testing';
import CheckoutPage from '../page';
import {
  GET_ACTIVE_ORDER,
  GET_ELIGIBLE_SHIPPING_METHODS,
  SET_ORDER_SHIPPING_ADDRESS,
  SET_ORDER_BILLING_ADDRESS,
  SET_ORDER_SHIPPING_METHOD,
  ADD_PAYMENT_TO_ORDER,
  TRANSITION_ORDER_TO_STATE,
} from '@/graphql/queries';

// Helper function to create complete shipping address with all required fields
const createShippingAddress = (overrides = {}) => ({
  __typename: 'Address' as const,
  fullName: 'John Doe',
  streetLine1: '123 Main St',
  streetLine2: null,
  city: 'New York',
  province: 'NY',
  postalCode: '10001',
  countryCode: 'US',
  phoneNumber: null,
  ...overrides,
});

// Helper function to create a complete Order mock with all required fields
// This must include all fields queried in GET_ACTIVE_ORDER to avoid cache errors
const createCompleteOrder = (overrides = {}) => ({
  __typename: 'Order' as const,
  id: 'order-1',
  code: 'ORDER001',
  state: 'AddingItems',
  total: 2400,
  totalWithTax: 2400,
  currencyCode: 'USD',
  lines: [mockOrderLine],
  shippingWithTax: overrides.shippingWithTax !== undefined ? overrides.shippingWithTax : 0,
  shippingAddress: overrides.shippingAddress !== undefined ? overrides.shippingAddress : null,
  shippingLines: overrides.shippingLines !== undefined ? overrides.shippingLines : [],
  billingAddress: overrides.billingAddress !== undefined ? overrides.billingAddress : null,
  ...overrides,
});

// Mock Next.js components
jest.mock('next/link', () => {
  return ({ children, href }: { children: React.ReactNode; href: string }) => {
    return <a href={href}>{children}</a>;
  };
});

jest.mock('next/image', () => {
  return ({ src, alt }: { src: string; alt: string }) => {
    return <img src={src} alt={alt} />;
  };
});

jest.mock('@/components/Header', () => ({
  Header: () => <header>Header</header>,
}));

// Mock AddressForm component
jest.mock('@/components/AddressForm', () => ({
  AddressForm: ({
    title,
    onSubmit,
  }: {
    title: string;
    onSubmit: (address: any) => void;
  }) => {
    return (
      <div>
        <h2>{title}</h2>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit(createShippingAddress());
          }}
        >
          <button type="submit">Continue</button>
        </form>
      </div>
    );
  },
}));

// Mock data
const mockOrderLine = {
  __typename: 'OrderLine' as const,
  id: 'line-1',
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
    },
  },
};

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

const mockShippingMethods = [
  {
    __typename: 'ShippingMethod' as const,
    id: 'shipping-1',
    name: 'Standard Shipping',
    code: 'standard',
    description: '5-7 business days',
    price: 500,
    priceWithTax: 600,
    metadata: {},
  },
  {
    __typename: 'ShippingMethod' as const,
    id: 'shipping-2',
    name: 'Express Shipping',
    code: 'express',
    description: '2-3 business days',
    price: 1000,
    priceWithTax: 1200,
    metadata: {},
  },
];

describe('CheckoutPage', () => {
  describe('Loading State', () => {
    it('should show loading message when order data is loading', () => {
      const mocks: any[] = [];

      render(
        <MockedProvider mocks={mocks}>
          <CheckoutPage />
        </MockedProvider>
      );

      expect(screen.getByText(/loading checkout/i)).toBeInTheDocument();
    });
  });

  describe('Empty Cart Handling', () => {
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
          <CheckoutPage />
        </MockedProvider>
      );

      await waitFor(() => {
        expect(screen.getByText(/your cart is empty/i)).toBeInTheDocument();
      });

      expect(screen.getByText(/add items to your cart before checkout/i)).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /continue shopping/i })).toBeInTheDocument();
    });

    it('should display empty cart message when order is null', async () => {
      const mocks = [
        {
          request: {
            query: GET_ACTIVE_ORDER,
          },
          result: {
            data: {
              activeOrder: null,
            },
          },
        },
      ];

      render(
        <MockedProvider mocks={mocks}>
          <CheckoutPage />
        </MockedProvider>
      );

      await waitFor(() => {
        expect(screen.getByText(/your cart is empty/i)).toBeInTheDocument();
      });
    });
  });

  describe('Checkout Flow - Initial State', () => {
    it('should display checkout page with shipping step when order has items', async () => {
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
          <CheckoutPage />
        </MockedProvider>
      );

      await waitFor(() => {
        expect(screen.getByText(/checkout/i)).toBeInTheDocument();
      });

      expect(screen.getByText(/shipping address/i)).toBeInTheDocument();
      expect(screen.getByText(/order summary/i)).toBeInTheDocument();
    });

    it('should display step indicator with shipping step active', async () => {
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
          <CheckoutPage />
        </MockedProvider>
      );

      await waitFor(() => {
        expect(screen.getByText(/checkout/i)).toBeInTheDocument();
      });

      // Check step indicator - there should be "Shipping" step text
      const shippingTexts = screen.queryAllByText(/shipping/i);
      expect(shippingTexts.length).toBeGreaterThan(0);
      
      expect(screen.getByText(/shipping method/i)).toBeInTheDocument();
      expect(screen.getByText(/billing/i)).toBeInTheDocument();
      expect(screen.getByText(/payment/i)).toBeInTheDocument();
    });

    it('should display order summary with correct items and totals', async () => {
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
          <CheckoutPage />
        </MockedProvider>
      );

      await waitFor(() => {
        expect(screen.getByText(/order summary/i)).toBeInTheDocument();
      });

      expect(screen.getByText('Test Product')).toBeInTheDocument();
      
      // Verify subtotal exists and has correct value
      const subtotalLabel = screen.getByText('Subtotal');
      expect(subtotalLabel).toBeInTheDocument();
      const subtotalRow = subtotalLabel.parentElement;
      expect(subtotalRow).toBeInTheDocument();
      const subtotalValue = within(subtotalRow as HTMLElement).getByText(/\$24\.00/);
      expect(subtotalValue).toBeInTheDocument();
      
      // Verify Total specifically - find the "Total" label and verify its value is in the same row
      // This ensures we're checking the Total value, not just any $24.00 on the page
      const totalLabel = screen.getByText('Total');
      expect(totalLabel).toBeInTheDocument();
      const totalRow = totalLabel.parentElement;
      expect(totalRow).toBeInTheDocument();
      // The Total row should contain the Total value
      const totalValue = within(totalRow as HTMLElement).getByText(/\$24\.00/);
      expect(totalValue).toBeInTheDocument();
    });
  });

  describe('Shipping Address Step', () => {
    it('should display shipping address form', async () => {
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
          <CheckoutPage />
        </MockedProvider>
      );

      await waitFor(() => {
        expect(screen.getByText(/shipping address/i)).toBeInTheDocument();
      });
    });

    it('should call setOrderShippingAddress mutation when form is submitted', async () => {
      const user = userEvent.setup();
      const shippingAddressInput = createShippingAddress();

      const setShippingAddressMock = {
        request: {
          query: SET_ORDER_SHIPPING_ADDRESS,
          variables: {
            input: shippingAddressInput,
          },
        },
        result: {
          data: {
            setOrderShippingAddress: createCompleteOrder({
              shippingAddress: shippingAddressInput,
            }),
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
        setShippingAddressMock,
        {
          request: {
            query: GET_ACTIVE_ORDER,
          },
          result: {
            data: {
              activeOrder: {
                ...mockActiveOrder,
                shippingAddress: shippingAddressInput,
              },
            },
          },
        },
      ];

      render(
        <MockedProvider mocks={mocks}>
          <CheckoutPage />
        </MockedProvider>
      );

      await waitFor(() => {
        expect(screen.getByText(/shipping address/i)).toBeInTheDocument();
      });

      const continueButton = screen.getByRole('button', { name: /continue/i });
      await user.click(continueButton);

      await waitFor(() => {
        expect(screen.getByText(/select shipping method/i)).toBeInTheDocument();
      });
    });

    it('should display error message when shipping address mutation fails', async () => {
      const user = userEvent.setup();
      const shippingAddressInput = createShippingAddress();

      const setShippingAddressMock = {
        request: {
          query: SET_ORDER_SHIPPING_ADDRESS,
          variables: {
            input: shippingAddressInput,
          },
        },
        error: new Error('Failed to set shipping address'),
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
        setShippingAddressMock,
      ];

      render(
        <MockedProvider mocks={mocks}>
          <CheckoutPage />
        </MockedProvider>
      );

      await waitFor(() => {
        expect(screen.getByText(/shipping address/i)).toBeInTheDocument();
      });

      const continueButton = screen.getByRole('button', { name: /continue/i });
      await user.click(continueButton);

      await waitFor(() => {
        expect(screen.getByText(/failed to set shipping address/i)).toBeInTheDocument();
      });
    });
  });

  describe('Shipping Method Step', () => {
    it('should display shipping method selection after shipping address is set', async () => {
      const user = userEvent.setup();
      const shippingAddressInput = createShippingAddress();

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
        {
          request: {
            query: SET_ORDER_SHIPPING_ADDRESS,
            variables: {
              input: shippingAddressInput,
            },
          },
          result: {
            data: {
            setOrderShippingAddress: createCompleteOrder({
              shippingAddress: shippingAddressInput,
            }),
            },
          },
        },
        {
          request: {
            query: GET_ACTIVE_ORDER,
          },
          result: {
            data: {
              activeOrder: {
                ...mockActiveOrder,
                shippingAddress: shippingAddressInput,
              },
            },
          },
        },
        {
          request: {
            query: GET_ELIGIBLE_SHIPPING_METHODS,
          },
          result: {
            data: {
              eligibleShippingMethods: mockShippingMethods,
            },
          },
        },
      ];

      render(
        <MockedProvider mocks={mocks}>
          <CheckoutPage />
        </MockedProvider>
      );

      await waitFor(() => {
        expect(screen.getByText(/shipping address/i)).toBeInTheDocument();
      });

      const continueButton = screen.getByRole('button', { name: /continue/i });
      await user.click(continueButton);

      await waitFor(() => {
        expect(screen.getByText(/select shipping method/i)).toBeInTheDocument();
      });
    });

    it('should display available shipping methods', async () => {
      const user = userEvent.setup();
      const shippingAddressInput = createShippingAddress();

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
        {
          request: {
            query: SET_ORDER_SHIPPING_ADDRESS,
            variables: {
              input: shippingAddressInput,
            },
          },
          result: {
            data: {
            setOrderShippingAddress: createCompleteOrder(),
            },
          },
        },
        {
          request: {
            query: GET_ACTIVE_ORDER,
          },
          result: {
            data: {
              activeOrder: {
                ...mockActiveOrder,
                shippingAddress: shippingAddressInput,
              },
            },
          },
        },
        {
          request: {
            query: GET_ELIGIBLE_SHIPPING_METHODS,
          },
          result: {
            data: {
              eligibleShippingMethods: mockShippingMethods,
            },
          },
        },
      ];

      render(
        <MockedProvider mocks={mocks}>
          <CheckoutPage />
        </MockedProvider>
      );

      await waitFor(() => {
        expect(screen.getByText(/shipping address/i)).toBeInTheDocument();
      });

      const continueButton = screen.getByRole('button', { name: /continue/i });
      await user.click(continueButton);

      await waitFor(() => {
        expect(screen.getByText(/standard shipping/i)).toBeInTheDocument();
        expect(screen.getByText(/express shipping/i)).toBeInTheDocument();
      });
    });

    it('should show loading state when fetching shipping methods', async () => {
      const user = userEvent.setup();
      const shippingAddressInput = createShippingAddress();

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
        {
          request: {
            query: SET_ORDER_SHIPPING_ADDRESS,
            variables: {
              input: shippingAddressInput,
            },
          },
          result: {
            data: {
            setOrderShippingAddress: createCompleteOrder(),
            },
          },
        },
        {
          request: {
            query: GET_ACTIVE_ORDER,
          },
          result: {
            data: {
              activeOrder: {
                ...mockActiveOrder,
                shippingAddress: shippingAddressInput,
              },
            },
          },
        },
        {
          request: {
            query: GET_ELIGIBLE_SHIPPING_METHODS,
          },
          result: {
            data: {
              eligibleShippingMethods: mockShippingMethods,
            },
          },
          delay: 100,
        },
      ];

      render(
        <MockedProvider mocks={mocks}>
          <CheckoutPage />
        </MockedProvider>
      );

      await waitFor(() => {
        expect(screen.getByText(/shipping address/i)).toBeInTheDocument();
      });

      const continueButton = screen.getByRole('button', { name: /continue/i });
      await user.click(continueButton);

      await waitFor(() => {
        expect(screen.getByText(/loading shipping methods/i)).toBeInTheDocument();
      });
    });

    it('should call setOrderShippingMethod mutation when method is selected', async () => {
      const user = userEvent.setup();
      const shippingAddressInput = createShippingAddress();

      const setShippingMethodMock = {
        request: {
          query: SET_ORDER_SHIPPING_METHOD,
          variables: {
            shippingMethodId: ['shipping-1'],
          },
        },
        result: {
          data: {
            setOrderShippingMethod: createCompleteOrder({
              shippingWithTax: 600,
              shippingLines: [
                {
                  __typename: 'ShippingLine' as const,
                  shippingMethod: {
                    __typename: 'ShippingMethod' as const,
                    id: 'shipping-1',
                    name: 'Standard Shipping',
                  },
                  priceWithTax: 600,
                },
              ],
            }),
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
        {
          request: {
            query: SET_ORDER_SHIPPING_ADDRESS,
            variables: {
              input: shippingAddressInput,
            },
          },
          result: {
            data: {
            setOrderShippingAddress: createCompleteOrder(),
            },
          },
        },
        {
          request: {
            query: GET_ACTIVE_ORDER,
          },
          result: {
            data: {
              activeOrder: {
                ...mockActiveOrder,
                shippingAddress: shippingAddressInput,
              },
            },
          },
        },
        {
          request: {
            query: GET_ELIGIBLE_SHIPPING_METHODS,
          },
          result: {
            data: {
              eligibleShippingMethods: mockShippingMethods,
            },
          },
        },
        setShippingMethodMock,
        {
          request: {
            query: GET_ACTIVE_ORDER,
          },
          result: {
            data: {
              activeOrder: {
                ...mockActiveOrder,
                shippingAddress: shippingAddressInput,
                shippingWithTax: 600,
              },
            },
          },
        },
      ];

      render(
        <MockedProvider mocks={mocks}>
          <CheckoutPage />
        </MockedProvider>
      );

      await waitFor(() => {
        expect(screen.getByText(/shipping address/i)).toBeInTheDocument();
      });

      const continueButton = screen.getByRole('button', { name: /continue/i });
      await user.click(continueButton);

      await waitFor(() => {
        expect(screen.getByText(/standard shipping/i)).toBeInTheDocument();
      });

      const standardShippingButton = screen.getByText(/standard shipping/i).closest('button');
      if (standardShippingButton) {
        await user.click(standardShippingButton);
      }

      await waitFor(() => {
        expect(screen.getByText(/billing address/i)).toBeInTheDocument();
      });
    });

    it('should display error message when shipping method selection fails', async () => {
      const user = userEvent.setup();
      const shippingAddressInput = createShippingAddress();

      const setShippingMethodMock = {
        request: {
          query: SET_ORDER_SHIPPING_METHOD,
          variables: {
            shippingMethodId: ['shipping-1'],
          },
        },
        error: new Error('Failed to set shipping method'),
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
        {
          request: {
            query: SET_ORDER_SHIPPING_ADDRESS,
            variables: {
              input: shippingAddressInput,
            },
          },
          result: {
            data: {
            setOrderShippingAddress: createCompleteOrder(),
            },
          },
        },
        {
          request: {
            query: GET_ACTIVE_ORDER,
          },
          result: {
            data: {
              activeOrder: {
                ...mockActiveOrder,
                shippingAddress: shippingAddressInput,
              },
            },
          },
        },
        {
          request: {
            query: GET_ELIGIBLE_SHIPPING_METHODS,
          },
          result: {
            data: {
              eligibleShippingMethods: mockShippingMethods,
            },
          },
        },
        setShippingMethodMock,
      ];

      render(
        <MockedProvider mocks={mocks}>
          <CheckoutPage />
        </MockedProvider>
      );

      await waitFor(() => {
        expect(screen.getByText(/shipping address/i)).toBeInTheDocument();
      });

      const continueButton = screen.getByRole('button', { name: /continue/i });
      await user.click(continueButton);

      await waitFor(() => {
        expect(screen.getByText(/standard shipping/i)).toBeInTheDocument();
      });

      const standardShippingButton = screen.getByText(/standard shipping/i).closest('button');
      if (standardShippingButton) {
        await user.click(standardShippingButton);
      }

      await waitFor(() => {
        expect(screen.getByText(/failed to set shipping method/i)).toBeInTheDocument();
      });
    });

    it('should display message when no shipping methods are available', async () => {
      const user = userEvent.setup();
      const shippingAddressInput = createShippingAddress();

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
        {
          request: {
            query: SET_ORDER_SHIPPING_ADDRESS,
            variables: {
              input: shippingAddressInput,
            },
          },
          result: {
            data: {
            setOrderShippingAddress: createCompleteOrder(),
            },
          },
        },
        {
          request: {
            query: GET_ACTIVE_ORDER,
          },
          result: {
            data: {
              activeOrder: {
                ...mockActiveOrder,
                shippingAddress: shippingAddressInput,
              },
            },
          },
        },
        {
          request: {
            query: GET_ELIGIBLE_SHIPPING_METHODS,
          },
          result: {
            data: {
              eligibleShippingMethods: [],
            },
          },
        },
      ];

      render(
        <MockedProvider mocks={mocks}>
          <CheckoutPage />
        </MockedProvider>
      );

      await waitFor(() => {
        expect(screen.getByText(/shipping address/i)).toBeInTheDocument();
      });

      const continueButton = screen.getByRole('button', { name: /continue/i });
      await user.click(continueButton);

      await waitFor(() => {
        expect(screen.getByText(/no shipping methods available/i)).toBeInTheDocument();
      });
    });
  });

  describe('Billing Address Step', () => {
    it('should display billing address step after shipping method is selected', async () => {
      const user = userEvent.setup();
      const shippingAddressInput = createShippingAddress();

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
        {
          request: {
            query: SET_ORDER_SHIPPING_ADDRESS,
            variables: {
              input: shippingAddressInput,
            },
          },
          result: {
            data: {
            setOrderShippingAddress: createCompleteOrder(),
            },
          },
        },
        {
          request: {
            query: GET_ACTIVE_ORDER,
          },
          result: {
            data: {
              activeOrder: {
                ...mockActiveOrder,
                shippingAddress: shippingAddressInput,
              },
            },
          },
        },
        {
          request: {
            query: GET_ELIGIBLE_SHIPPING_METHODS,
          },
          result: {
            data: {
              eligibleShippingMethods: mockShippingMethods,
            },
          },
        },
        {
          request: {
            query: SET_ORDER_SHIPPING_METHOD,
            variables: {
              shippingMethodId: ['shipping-1'],
            },
          },
          result: {
            data: {
            setOrderShippingMethod: createCompleteOrder(),
            },
          },
        },
        {
          request: {
            query: GET_ACTIVE_ORDER,
          },
          result: {
            data: {
              activeOrder: {
                ...mockActiveOrder,
                shippingAddress: shippingAddressInput,
              },
            },
          },
        },
        // Additional refetch after shipping method is set
        {
          request: {
            query: GET_ACTIVE_ORDER,
          },
          result: {
            data: {
              activeOrder: {
                ...mockActiveOrder,
                shippingAddress: shippingAddressInput,
              },
            },
          },
        },
      ];

      render(
        <MockedProvider mocks={mocks}>
          <CheckoutPage />
        </MockedProvider>
      );

      await waitFor(() => {
        expect(screen.getByText(/shipping address/i)).toBeInTheDocument();
      });

      const continueButton = screen.getByRole('button', { name: /continue/i });
      await user.click(continueButton);

      await waitFor(() => {
        expect(screen.getByText(/standard shipping/i)).toBeInTheDocument();
      });

      const standardShippingButton = screen.getByText(/standard shipping/i).closest('button');
      if (standardShippingButton) {
        await user.click(standardShippingButton);
      }

      await waitFor(() => {
        expect(screen.getByText(/billing address/i)).toBeInTheDocument();
      }, { timeout: 3000 });
    });

    it('should display checkbox to use same address for billing', async () => {
      const user = userEvent.setup();
      const shippingAddressInput = createShippingAddress();

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
        {
          request: {
            query: SET_ORDER_SHIPPING_ADDRESS,
            variables: {
              input: shippingAddressInput,
            },
          },
          result: {
            data: {
            setOrderShippingAddress: createCompleteOrder(),
            },
          },
        },
        {
          request: {
            query: GET_ACTIVE_ORDER,
          },
          result: {
            data: {
              activeOrder: {
                ...mockActiveOrder,
                shippingAddress: shippingAddressInput,
              },
            },
          },
        },
        {
          request: {
            query: GET_ELIGIBLE_SHIPPING_METHODS,
          },
          result: {
            data: {
              eligibleShippingMethods: mockShippingMethods,
            },
          },
        },
        {
          request: {
            query: SET_ORDER_SHIPPING_METHOD,
            variables: {
              shippingMethodId: ['shipping-1'],
            },
          },
          result: {
            data: {
            setOrderShippingMethod: createCompleteOrder(),
            },
          },
        },
        {
          request: {
            query: GET_ACTIVE_ORDER,
          },
          result: {
            data: {
              activeOrder: {
                ...mockActiveOrder,
                shippingAddress: shippingAddressInput,
              },
            },
          },
        },
        // Additional refetch after shipping method is set
        {
          request: {
            query: GET_ACTIVE_ORDER,
          },
          result: {
            data: {
              activeOrder: {
                ...mockActiveOrder,
                shippingAddress: shippingAddressInput,
              },
            },
          },
        },
      ];

      render(
        <MockedProvider mocks={mocks}>
          <CheckoutPage />
        </MockedProvider>
      );

      await waitFor(() => {
        expect(screen.getByText(/shipping address/i)).toBeInTheDocument();
      });

      const continueButton = screen.getByRole('button', { name: /continue/i });
      await user.click(continueButton);

      await waitFor(() => {
        expect(screen.getByText(/standard shipping/i)).toBeInTheDocument();
      });

      const standardShippingButton = screen.getByText(/standard shipping/i).closest('button');
      if (standardShippingButton) {
        await user.click(standardShippingButton);
      }

      await waitFor(() => {
        expect(screen.getByText(/use same address for billing/i)).toBeInTheDocument();
      }, { timeout: 3000 });
    });

    it('should use shipping address for billing when checkbox is checked', async () => {
      const user = userEvent.setup();
      const shippingAddressInput = createShippingAddress();

      const setBillingAddressMock = {
        request: {
          query: SET_ORDER_BILLING_ADDRESS,
          variables: {
            input: shippingAddressInput,
          },
        },
        result: {
          data: {
            setOrderBillingAddress: createCompleteOrder({
              billingAddress: shippingAddressInput,
            }),
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
        {
          request: {
            query: SET_ORDER_SHIPPING_ADDRESS,
            variables: {
              input: shippingAddressInput,
            },
          },
          result: {
            data: {
            setOrderShippingAddress: createCompleteOrder(),
            },
          },
        },
        {
          request: {
            query: GET_ACTIVE_ORDER,
          },
          result: {
            data: {
              activeOrder: {
                ...mockActiveOrder,
                shippingAddress: shippingAddressInput,
              },
            },
          },
        },
        {
          request: {
            query: GET_ELIGIBLE_SHIPPING_METHODS,
          },
          result: {
            data: {
              eligibleShippingMethods: mockShippingMethods,
            },
          },
        },
        {
          request: {
            query: SET_ORDER_SHIPPING_METHOD,
            variables: {
              shippingMethodId: ['shipping-1'],
            },
          },
          result: {
            data: {
            setOrderShippingMethod: createCompleteOrder(),
            },
          },
        },
        {
          request: {
            query: GET_ACTIVE_ORDER,
          },
          result: {
            data: {
              activeOrder: {
                ...mockActiveOrder,
                shippingAddress: shippingAddressInput,
              },
            },
          },
        },
        // Additional refetch after shipping method is set
        {
          request: {
            query: GET_ACTIVE_ORDER,
          },
          result: {
            data: {
              activeOrder: {
                ...mockActiveOrder,
                shippingAddress: shippingAddressInput,
              },
            },
          },
        },
        setBillingAddressMock,
        {
          request: {
            query: GET_ACTIVE_ORDER,
          },
          result: {
            data: {
              activeOrder: {
                ...mockActiveOrder,
                shippingAddress: shippingAddressInput,
                billingAddress: shippingAddressInput,
              },
            },
          },
        },
        // Additional refetch after billing address is set
        {
          request: {
            query: GET_ACTIVE_ORDER,
          },
          result: {
            data: {
              activeOrder: {
                ...mockActiveOrder,
                shippingAddress: shippingAddressInput,
                billingAddress: shippingAddressInput,
              },
            },
          },
        },
      ];

      render(
        <MockedProvider mocks={mocks}>
          <CheckoutPage />
        </MockedProvider>
      );

      await waitFor(() => {
        expect(screen.getByText(/shipping address/i)).toBeInTheDocument();
      });

      const continueButton = screen.getByRole('button', { name: /continue/i });
      await user.click(continueButton);

      await waitFor(() => {
        expect(screen.getByText(/standard shipping/i)).toBeInTheDocument();
      });

      const standardShippingButton = screen.getByText(/standard shipping/i).closest('button');
      if (standardShippingButton) {
        await user.click(standardShippingButton);
      }

      await waitFor(() => {
        expect(screen.getByText(/using same address as shipping address/i)).toBeInTheDocument();
      }, { timeout: 3000 });

      const continueBillingButton = screen.getByRole('button', { name: /continue/i });
      await user.click(continueBillingButton);

      await waitFor(() => {
        expect(screen.getByText(/payment/i)).toBeInTheDocument();
      }, { timeout: 3000 });
    });

    it('should display billing address form when checkbox is unchecked', async () => {
      const user = userEvent.setup();
      const shippingAddressInput = createShippingAddress();

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
        {
          request: {
            query: SET_ORDER_SHIPPING_ADDRESS,
            variables: {
              input: shippingAddressInput,
            },
          },
          result: {
            data: {
            setOrderShippingAddress: createCompleteOrder(),
            },
          },
        },
        {
          request: {
            query: GET_ACTIVE_ORDER,
          },
          result: {
            data: {
              activeOrder: {
                ...mockActiveOrder,
                shippingAddress: shippingAddressInput,
              },
            },
          },
        },
        {
          request: {
            query: GET_ELIGIBLE_SHIPPING_METHODS,
          },
          result: {
            data: {
              eligibleShippingMethods: mockShippingMethods,
            },
          },
        },
        {
          request: {
            query: SET_ORDER_SHIPPING_METHOD,
            variables: {
              shippingMethodId: ['shipping-1'],
            },
          },
          result: {
            data: {
            setOrderShippingMethod: createCompleteOrder(),
            },
          },
        },
        {
          request: {
            query: GET_ACTIVE_ORDER,
          },
          result: {
            data: {
              activeOrder: {
                ...mockActiveOrder,
                shippingAddress: shippingAddressInput,
              },
            },
          },
        },
        // Additional refetch after shipping method is set
        {
          request: {
            query: GET_ACTIVE_ORDER,
          },
          result: {
            data: {
              activeOrder: {
                ...mockActiveOrder,
                shippingAddress: shippingAddressInput,
              },
            },
          },
        },
      ];

      render(
        <MockedProvider mocks={mocks}>
          <CheckoutPage />
        </MockedProvider>
      );

      await waitFor(() => {
        expect(screen.getByText(/shipping address/i)).toBeInTheDocument();
      });

      const continueButton = screen.getByRole('button', { name: /continue/i });
      await user.click(continueButton);

      await waitFor(() => {
        expect(screen.getByText(/standard shipping/i)).toBeInTheDocument();
      });

      const standardShippingButton = screen.getByText(/standard shipping/i).closest('button');
      if (standardShippingButton) {
        await user.click(standardShippingButton);
      }

      await waitFor(() => {
        expect(screen.getByText(/use same address for billing/i)).toBeInTheDocument();
      }, { timeout: 3000 });

      const checkbox = screen.getByRole('checkbox');
      await user.click(checkbox);

      await waitFor(() => {
        expect(screen.getByText(/billing address/i)).toBeInTheDocument();
      }, { timeout: 3000 });
    });

    it('should display error message when billing address mutation fails', async () => {
      const user = userEvent.setup();
      const shippingAddressInput = createShippingAddress();

      const setBillingAddressMock = {
        request: {
          query: SET_ORDER_BILLING_ADDRESS,
          variables: {
            input: shippingAddressInput,
          },
        },
        error: new Error('Failed to set billing address'),
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
        {
          request: {
            query: SET_ORDER_SHIPPING_ADDRESS,
            variables: {
              input: shippingAddressInput,
            },
          },
          result: {
            data: {
            setOrderShippingAddress: createCompleteOrder(),
            },
          },
        },
        {
          request: {
            query: GET_ACTIVE_ORDER,
          },
          result: {
            data: {
              activeOrder: {
                ...mockActiveOrder,
                shippingAddress: shippingAddressInput,
              },
            },
          },
        },
        {
          request: {
            query: GET_ELIGIBLE_SHIPPING_METHODS,
          },
          result: {
            data: {
              eligibleShippingMethods: mockShippingMethods,
            },
          },
        },
        {
          request: {
            query: SET_ORDER_SHIPPING_METHOD,
            variables: {
              shippingMethodId: ['shipping-1'],
            },
          },
          result: {
            data: {
            setOrderShippingMethod: createCompleteOrder(),
            },
          },
        },
        {
          request: {
            query: GET_ACTIVE_ORDER,
          },
          result: {
            data: {
              activeOrder: {
                ...mockActiveOrder,
                shippingAddress: shippingAddressInput,
              },
            },
          },
        },
        // Additional refetch after shipping method is set
        {
          request: {
            query: GET_ACTIVE_ORDER,
          },
          result: {
            data: {
              activeOrder: {
                ...mockActiveOrder,
                shippingAddress: shippingAddressInput,
              },
            },
          },
        },
        setBillingAddressMock,
      ];

      render(
        <MockedProvider mocks={mocks}>
          <CheckoutPage />
        </MockedProvider>
      );

      await waitFor(() => {
        expect(screen.getByText(/shipping address/i)).toBeInTheDocument();
      });

      const continueButton = screen.getByRole('button', { name: /continue/i });
      await user.click(continueButton);

      await waitFor(() => {
        expect(screen.getByText(/standard shipping/i)).toBeInTheDocument();
      });

      const standardShippingButton = screen.getByText(/standard shipping/i).closest('button');
      if (standardShippingButton) {
        await user.click(standardShippingButton);
      }

      await waitFor(() => {
        expect(screen.getByText(/using same address as shipping address/i)).toBeInTheDocument();
      }, { timeout: 3000 });

      const continueBillingButton = screen.getByRole('button', { name: /continue/i });
      await user.click(continueBillingButton);

      await waitFor(() => {
        expect(screen.getByText(/failed to set billing address/i)).toBeInTheDocument();
      }, { timeout: 3000 });
    });
  });

  describe('Payment Step', () => {
    it('should display payment step after billing address is set', async () => {
      const user = userEvent.setup();
      const shippingAddressInput = createShippingAddress();

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
        {
          request: {
            query: SET_ORDER_SHIPPING_ADDRESS,
            variables: {
              input: shippingAddressInput,
            },
          },
          result: {
            data: {
            setOrderShippingAddress: createCompleteOrder(),
            },
          },
        },
        {
          request: {
            query: GET_ACTIVE_ORDER,
          },
          result: {
            data: {
              activeOrder: {
                ...mockActiveOrder,
                shippingAddress: shippingAddressInput,
              },
            },
          },
        },
        {
          request: {
            query: GET_ELIGIBLE_SHIPPING_METHODS,
          },
          result: {
            data: {
              eligibleShippingMethods: mockShippingMethods,
            },
          },
        },
        {
          request: {
            query: SET_ORDER_SHIPPING_METHOD,
            variables: {
              shippingMethodId: ['shipping-1'],
            },
          },
          result: {
            data: {
            setOrderShippingMethod: createCompleteOrder(),
            },
          },
        },
        {
          request: {
            query: GET_ACTIVE_ORDER,
          },
          result: {
            data: {
              activeOrder: {
                ...mockActiveOrder,
                shippingAddress: shippingAddressInput,
              },
            },
          },
        },
        // Additional refetch after shipping method is set
        {
          request: {
            query: GET_ACTIVE_ORDER,
          },
          result: {
            data: {
              activeOrder: {
                ...mockActiveOrder,
                shippingAddress: shippingAddressInput,
              },
            },
          },
        },
        {
          request: {
            query: SET_ORDER_BILLING_ADDRESS,
            variables: {
              input: shippingAddressInput,
            },
          },
          result: {
            data: {
            setOrderBillingAddress: createCompleteOrder(),
            },
          },
        },
        {
          request: {
            query: GET_ACTIVE_ORDER,
          },
          result: {
            data: {
              activeOrder: {
                ...mockActiveOrder,
                shippingAddress: shippingAddressInput,
                billingAddress: shippingAddressInput,
              },
            },
          },
        },
        // Additional refetch after billing address is set
        {
          request: {
            query: GET_ACTIVE_ORDER,
          },
          result: {
            data: {
              activeOrder: {
                ...mockActiveOrder,
                shippingAddress: shippingAddressInput,
                billingAddress: shippingAddressInput,
              },
            },
          },
        },
      ];

      render(
        <MockedProvider mocks={mocks}>
          <CheckoutPage />
        </MockedProvider>
      );

      await waitFor(() => {
        expect(screen.getByText(/shipping address/i)).toBeInTheDocument();
      });

      const continueButton = screen.getByRole('button', { name: /continue/i });
      await user.click(continueButton);

      await waitFor(() => {
        expect(screen.getByText(/standard shipping/i)).toBeInTheDocument();
      });

      const standardShippingButton = screen.getByText(/standard shipping/i).closest('button');
      if (standardShippingButton) {
        await user.click(standardShippingButton);
      }

      await waitFor(() => {
        expect(screen.getByText(/using same address as shipping address/i)).toBeInTheDocument();
      }, { timeout: 3000 });

      const continueBillingButton = screen.getByRole('button', { name: /continue/i });
      await user.click(continueBillingButton);

      await waitFor(() => {
        expect(screen.getByText(/payment/i)).toBeInTheDocument();
      }, { timeout: 3000 });
    });

    it('should call addPaymentToOrder and transitionOrderToState when payment is submitted', async () => {
      const user = userEvent.setup();
      const shippingAddressInput = createShippingAddress();

      const addPaymentMock = {
        request: {
          query: ADD_PAYMENT_TO_ORDER,
          variables: {
            input: {
              method: 'standard-payment',
              metadata: {},
            },
          },
        },
        result: {
          data: {
            addPaymentToOrder: {
              __typename: 'Order',
              id: 'order-1',
              state: 'ArrangingPayment',
              active: true,
            },
          },
        },
      };

      const transitionOrderMock = {
        request: {
          query: TRANSITION_ORDER_TO_STATE,
          variables: {
            state: 'ArrangingPayment',
          },
        },
        result: {
          data: {
            transitionOrderToState: {
              __typename: 'Order',
              id: 'order-1',
              state: 'ArrangingPayment',
              active: false,
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
        {
          request: {
            query: SET_ORDER_SHIPPING_ADDRESS,
            variables: {
              input: shippingAddressInput,
            },
          },
          result: {
            data: {
            setOrderShippingAddress: createCompleteOrder(),
            },
          },
        },
        {
          request: {
            query: GET_ACTIVE_ORDER,
          },
          result: {
            data: {
              activeOrder: {
                ...mockActiveOrder,
                shippingAddress: shippingAddressInput,
              },
            },
          },
        },
        {
          request: {
            query: GET_ELIGIBLE_SHIPPING_METHODS,
          },
          result: {
            data: {
              eligibleShippingMethods: mockShippingMethods,
            },
          },
        },
        {
          request: {
            query: SET_ORDER_SHIPPING_METHOD,
            variables: {
              shippingMethodId: ['shipping-1'],
            },
          },
          result: {
            data: {
            setOrderShippingMethod: createCompleteOrder(),
            },
          },
        },
        {
          request: {
            query: GET_ACTIVE_ORDER,
          },
          result: {
            data: {
              activeOrder: {
                ...mockActiveOrder,
                shippingAddress: shippingAddressInput,
              },
            },
          },
        },
        {
          request: {
            query: SET_ORDER_BILLING_ADDRESS,
            variables: {
              input: shippingAddressInput,
            },
          },
          result: {
            data: {
            setOrderBillingAddress: createCompleteOrder(),
            },
          },
        },
        {
          request: {
            query: GET_ACTIVE_ORDER,
          },
          result: {
            data: {
              activeOrder: {
                ...mockActiveOrder,
                shippingAddress: shippingAddressInput,
                billingAddress: shippingAddressInput,
              },
            },
          },
        },
        addPaymentMock,
        transitionOrderMock,
      ];

      render(
        <MockedProvider mocks={mocks}>
          <CheckoutPage />
        </MockedProvider>
      );

      await waitFor(() => {
        expect(screen.getByText(/shipping address/i)).toBeInTheDocument();
      });

      const continueButton = screen.getByRole('button', { name: /continue/i });
      await user.click(continueButton);

      await waitFor(() => {
        expect(screen.getByText(/standard shipping/i)).toBeInTheDocument();
      });

      const standardShippingButton = screen.getByText(/standard shipping/i).closest('button');
      if (standardShippingButton) {
        await user.click(standardShippingButton);
      }

      await waitFor(() => {
        expect(screen.getByText(/using same address as shipping address/i)).toBeInTheDocument();
      });

      const continueBillingButton = screen.getByRole('button', { name: /continue/i });
      await user.click(continueBillingButton);

      await waitFor(() => {
        expect(screen.getByText(/complete order/i)).toBeInTheDocument();
      });

      const completeOrderButton = screen.getByRole('button', { name: /complete order/i });
      await user.click(completeOrderButton);

      await waitFor(() => {
        expect(screen.getByText(/order placed successfully/i)).toBeInTheDocument();
      });
    });

    it('should display error message when payment fails', async () => {
      const user = userEvent.setup();
      const shippingAddressInput = createShippingAddress();

      const addPaymentMock = {
        request: {
          query: ADD_PAYMENT_TO_ORDER,
          variables: {
            input: {
              method: 'standard-payment',
              metadata: {},
            },
          },
        },
        error: new Error('Payment failed'),
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
        {
          request: {
            query: SET_ORDER_SHIPPING_ADDRESS,
            variables: {
              input: shippingAddressInput,
            },
          },
          result: {
            data: {
            setOrderShippingAddress: createCompleteOrder(),
            },
          },
        },
        {
          request: {
            query: GET_ACTIVE_ORDER,
          },
          result: {
            data: {
              activeOrder: {
                ...mockActiveOrder,
                shippingAddress: shippingAddressInput,
              },
            },
          },
        },
        {
          request: {
            query: GET_ELIGIBLE_SHIPPING_METHODS,
          },
          result: {
            data: {
              eligibleShippingMethods: mockShippingMethods,
            },
          },
        },
        {
          request: {
            query: SET_ORDER_SHIPPING_METHOD,
            variables: {
              shippingMethodId: ['shipping-1'],
            },
          },
          result: {
            data: {
            setOrderShippingMethod: createCompleteOrder(),
            },
          },
        },
        {
          request: {
            query: GET_ACTIVE_ORDER,
          },
          result: {
            data: {
              activeOrder: {
                ...mockActiveOrder,
                shippingAddress: shippingAddressInput,
              },
            },
          },
        },
        // Additional refetch after shipping method is set
        {
          request: {
            query: GET_ACTIVE_ORDER,
          },
          result: {
            data: {
              activeOrder: {
                ...mockActiveOrder,
                shippingAddress: shippingAddressInput,
              },
            },
          },
        },
        {
          request: {
            query: SET_ORDER_BILLING_ADDRESS,
            variables: {
              input: shippingAddressInput,
            },
          },
          result: {
            data: {
            setOrderBillingAddress: createCompleteOrder(),
            },
          },
        },
        {
          request: {
            query: GET_ACTIVE_ORDER,
          },
          result: {
            data: {
              activeOrder: {
                ...mockActiveOrder,
                shippingAddress: shippingAddressInput,
                billingAddress: shippingAddressInput,
              },
            },
          },
        },
        // Additional refetch after billing address is set
        {
          request: {
            query: GET_ACTIVE_ORDER,
          },
          result: {
            data: {
              activeOrder: {
                ...mockActiveOrder,
                shippingAddress: shippingAddressInput,
                billingAddress: shippingAddressInput,
              },
            },
          },
        },
        addPaymentMock,
      ];

      render(
        <MockedProvider mocks={mocks}>
          <CheckoutPage />
        </MockedProvider>
      );

      await waitFor(() => {
        expect(screen.getByText(/shipping address/i)).toBeInTheDocument();
      });

      const continueButton = screen.getByRole('button', { name: /continue/i });
      await user.click(continueButton);

      await waitFor(() => {
        expect(screen.getByText(/standard shipping/i)).toBeInTheDocument();
      });

      const standardShippingButton = screen.getByText(/standard shipping/i).closest('button');
      if (standardShippingButton) {
        await user.click(standardShippingButton);
      }

      await waitFor(() => {
        expect(screen.getByText(/using same address as shipping address/i)).toBeInTheDocument();
      });

      const continueBillingButton = screen.getByRole('button', { name: /continue/i });
      await user.click(continueBillingButton);

      await waitFor(() => {
        expect(screen.getByText(/complete order/i)).toBeInTheDocument();
      });

      const completeOrderButton = screen.getByRole('button', { name: /complete order/i });
      await user.click(completeOrderButton);

      await waitFor(() => {
        expect(screen.getByText(/payment failed/i)).toBeInTheDocument();
      });
    });
  });

  describe('Complete Step', () => {
    it('should display order completion message with order code', async () => {
      const user = userEvent.setup();
      const shippingAddressInput = createShippingAddress();

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
        {
          request: {
            query: SET_ORDER_SHIPPING_ADDRESS,
            variables: {
              input: shippingAddressInput,
            },
          },
          result: {
            data: {
            setOrderShippingAddress: createCompleteOrder(),
            },
          },
        },
        {
          request: {
            query: GET_ACTIVE_ORDER,
          },
          result: {
            data: {
              activeOrder: {
                ...mockActiveOrder,
                shippingAddress: shippingAddressInput,
              },
            },
          },
        },
        {
          request: {
            query: GET_ELIGIBLE_SHIPPING_METHODS,
          },
          result: {
            data: {
              eligibleShippingMethods: mockShippingMethods,
            },
          },
        },
        {
          request: {
            query: SET_ORDER_SHIPPING_METHOD,
            variables: {
              shippingMethodId: ['shipping-1'],
            },
          },
          result: {
            data: {
            setOrderShippingMethod: createCompleteOrder(),
            },
          },
        },
        {
          request: {
            query: GET_ACTIVE_ORDER,
          },
          result: {
            data: {
              activeOrder: {
                ...mockActiveOrder,
                shippingAddress: shippingAddressInput,
              },
            },
          },
        },
        // Additional refetch after shipping method is set
        {
          request: {
            query: GET_ACTIVE_ORDER,
          },
          result: {
            data: {
              activeOrder: {
                ...mockActiveOrder,
                shippingAddress: shippingAddressInput,
              },
            },
          },
        },
        {
          request: {
            query: SET_ORDER_BILLING_ADDRESS,
            variables: {
              input: shippingAddressInput,
            },
          },
          result: {
            data: {
            setOrderBillingAddress: createCompleteOrder(),
            },
          },
        },
        {
          request: {
            query: GET_ACTIVE_ORDER,
          },
          result: {
            data: {
              activeOrder: {
                ...mockActiveOrder,
                shippingAddress: shippingAddressInput,
                billingAddress: shippingAddressInput,
              },
            },
          },
        },
        // Additional refetch after billing address is set
        {
          request: {
            query: GET_ACTIVE_ORDER,
          },
          result: {
            data: {
              activeOrder: {
                ...mockActiveOrder,
                shippingAddress: shippingAddressInput,
                billingAddress: shippingAddressInput,
              },
            },
          },
        },
        {
          request: {
            query: ADD_PAYMENT_TO_ORDER,
            variables: {
              input: {
                method: 'standard-payment',
                metadata: {},
              },
            },
          },
          result: {
            data: {
              addPaymentToOrder: {
                __typename: 'Order',
                id: 'order-1',
                state: 'ArrangingPayment',
                active: true,
              },
            },
          },
        },
        {
          request: {
            query: TRANSITION_ORDER_TO_STATE,
            variables: {
              state: 'ArrangingPayment',
            },
          },
          result: {
            data: {
              transitionOrderToState: {
                __typename: 'Order',
                id: 'order-1',
                state: 'ArrangingPayment',
                active: false,
              },
            },
          },
        },
      ];

      render(
        <MockedProvider mocks={mocks}>
          <CheckoutPage />
        </MockedProvider>
      );

      await waitFor(() => {
        expect(screen.getByText(/shipping address/i)).toBeInTheDocument();
      });

      const continueButton = screen.getByRole('button', { name: /continue/i });
      await user.click(continueButton);

      await waitFor(() => {
        expect(screen.getByText(/standard shipping/i)).toBeInTheDocument();
      });

      const standardShippingButton = screen.getByText(/standard shipping/i).closest('button');
      if (standardShippingButton) {
        await user.click(standardShippingButton);
      }

      await waitFor(() => {
        expect(screen.getByText(/using same address as shipping address/i)).toBeInTheDocument();
      }, { timeout: 3000 });

      const continueBillingButton = screen.getByRole('button', { name: /continue/i });
      await user.click(continueBillingButton);

      await waitFor(() => {
        expect(screen.getByText(/complete order/i)).toBeInTheDocument();
      }, { timeout: 3000 });

      const completeOrderButton = screen.getByRole('button', { name: /complete order/i });
      await user.click(completeOrderButton);

      await waitFor(() => {
        expect(screen.getByText(/order placed successfully/i)).toBeInTheDocument();
        expect(screen.getByText(/order code: order001/i)).toBeInTheDocument();
        expect(screen.getByText(/thank you for your order/i)).toBeInTheDocument();
      }, { timeout: 3000 });
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
          <CheckoutPage />
        </MockedProvider>
      );

      // The component doesn't currently handle query errors explicitly
      // When there's an error, it will show loading, then likely show empty cart
      // This test verifies it doesn't crash and shows appropriate UI
      await waitFor(() => {
        // Component should show empty cart message when order is null/undefined
        expect(screen.getByText(/your cart is empty/i)).toBeInTheDocument();
      }, { timeout: 3000 });
    });
  });
});
