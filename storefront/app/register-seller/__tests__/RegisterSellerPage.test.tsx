/**
 * Register as Seller Page Tests
 *
 * Phase 2.2: Seller Registration & Onboarding
 * TDD tests for the register-seller page.
 */

import '@testing-library/jest-dom';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MockedProvider } from '@apollo/client/testing';
import RegisterSellerPage from '../page';
import { GET_ACTIVE_CUSTOMER, GET_ACTIVE_SELLER, REGISTER_AS_SELLER } from '@/graphql/queries';

function createGraphQLError(code: string, message?: string) {
  return Object.assign(new Error(message ?? code), {
    graphQLErrors: [{ message: message ?? code, extensions: { code } }],
  });
}

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
  }),
}));

jest.mock('@/components/Header', () => ({
  Header: () => <header>Header</header>,
}));

const mockCustomer = {
  __typename: 'Customer' as const,
  id: '1',
  firstName: 'Test',
  lastName: 'User',
  emailAddress: 'test@example.com',
  phoneNumber: null,
  addresses: [],
};

const activeCustomerMock = {
  request: { query: GET_ACTIVE_CUSTOMER },
  result: { data: { activeCustomer: mockCustomer } },
};

const activeCustomerNullMock = {
  request: { query: GET_ACTIVE_CUSTOMER },
  result: { data: { activeCustomer: null } },
};

const activeSellerNullMock = {
  request: { query: GET_ACTIVE_SELLER },
  result: { data: { activeSeller: null } },
};

const mockSeller = {
  __typename: 'MarketplaceSeller' as const,
  id: '1',
  shopName: 'Existing Shop',
  shopSlug: 'existing-shop',
  shopDescription: null,
  shopBannerAssetId: null,
  shopLogoAssetId: null,
};

const activeSellerMock = {
  request: { query: GET_ACTIVE_SELLER },
  result: { data: { activeSeller: mockSeller } },
};

describe('RegisterSellerPage', () => {
  describe('Authentication', () => {
    it('should redirect to login when user is not authenticated', async () => {
      const pushMock = jest.fn();
      jest.spyOn(require('next/navigation'), 'useRouter').mockReturnValue({ push: pushMock });

      const mocks = [activeCustomerNullMock];

      render(
        <MockedProvider mocks={mocks}>
          <RegisterSellerPage />
        </MockedProvider>
      );

      await waitFor(() => {
        expect(pushMock).toHaveBeenCalledWith('/login');
      });
    });
  });

  describe('Already a Seller', () => {
    it('should redirect to shop-settings when user is already a seller', async () => {
      const pushMock = jest.fn();
      jest.spyOn(require('next/navigation'), 'useRouter').mockReturnValue({ push: pushMock });

      const mocks = [activeCustomerMock, activeSellerMock];

      render(
        <MockedProvider mocks={mocks}>
          <RegisterSellerPage />
        </MockedProvider>
      );

      await waitFor(() => {
        expect(pushMock).toHaveBeenCalledWith('/seller/shop-settings');
      });
    });
  });

  describe('Registration Form', () => {
    it('should display registration form when authenticated and not a seller', async () => {
      const mocks = [activeCustomerMock, activeSellerNullMock];

      render(
        <MockedProvider mocks={mocks}>
          <RegisterSellerPage />
        </MockedProvider>
      );

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /register as seller/i })).toBeInTheDocument();
      });

      expect(screen.getByLabelText(/shop name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/shop description/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/business name/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /register as seller/i })).toBeInTheDocument();
    });

    it('should validate shop name is required', async () => {
      const user = userEvent.setup();
      const mocks = [activeCustomerMock, activeSellerNullMock];

      render(
        <MockedProvider mocks={mocks}>
          <RegisterSellerPage />
        </MockedProvider>
      );

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /register as seller/i })).toBeInTheDocument();
      });

      const submitButton = screen.getByRole('button', { name: /register as seller/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/shop name is required/i)).toBeInTheDocument();
      });
    });

    it('should validate shop name minimum length', async () => {
      const user = userEvent.setup();
      const mocks = [activeCustomerMock, activeSellerNullMock];

      render(
        <MockedProvider mocks={mocks}>
          <RegisterSellerPage />
        </MockedProvider>
      );

      await waitFor(() => {
        expect(screen.getByLabelText(/shop name/i)).toBeInTheDocument();
      });

      const shopNameInput = screen.getByLabelText(/shop name/i);
      await user.type(shopNameInput, 'ab'); // Only 2 chars

      const submitButton = screen.getByRole('button', { name: /register as seller/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/at least 3 characters/i)).toBeInTheDocument();
      });
    });

    it('should submit registration and redirect on success', async () => {
      const user = userEvent.setup();
      const pushMock = jest.fn();
      jest.spyOn(require('next/navigation'), 'useRouter').mockReturnValue({ push: pushMock });

      const registerMutationMock = {
        request: {
          query: REGISTER_AS_SELLER,
          variables: {
            input: {
              shopName: 'My Awesome Shop',
              shopDescription: 'A test shop',
              businessName: null,
            },
          },
        },
        result: {
          data: {
            registerAsSeller: {
              __typename: 'MarketplaceSeller',
              id: '1',
              shopName: 'My Awesome Shop',
              shopSlug: 'my-awesome-shop',
              shopDescription: 'A test shop',
              verificationStatus: 'PENDING',
              isActive: true,
            },
          },
        },
      };

      const mocks = [
        activeCustomerMock,
        activeSellerNullMock,
        registerMutationMock,
        { request: { query: GET_ACTIVE_SELLER }, result: { data: { activeSeller: mockSeller } } },
      ];

      render(
        <MockedProvider mocks={mocks}>
          <RegisterSellerPage />
        </MockedProvider>
      );

      await waitFor(() => {
        expect(screen.getByLabelText(/shop name/i)).toBeInTheDocument();
      });

      const shopNameInput = screen.getByLabelText(/shop name/i);
      await user.type(shopNameInput, 'My Awesome Shop');

      const shopDescriptionInput = screen.getByLabelText(/shop description/i);
      await user.type(shopDescriptionInput, 'A test shop');

      const submitButton = screen.getByRole('button', { name: /register as seller/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(pushMock).toHaveBeenCalledWith('/seller/shop-settings');
      });
    });

    it('should display error message when registration fails', async () => {
      const user = userEvent.setup();

      const registerMutationMock = {
        request: {
          query: REGISTER_AS_SELLER,
          variables: {
            input: {
              shopName: 'My Shop',
              shopDescription: null,
              businessName: null,
            },
          },
        },
        error: new Error('Email not verified'),
      };

      const mocks = [activeCustomerMock, activeSellerNullMock, registerMutationMock];

      render(
        <MockedProvider mocks={mocks}>
          <RegisterSellerPage />
        </MockedProvider>
      );

      await waitFor(() => {
        expect(screen.getByLabelText(/shop name/i)).toBeInTheDocument();
      });

      const shopNameInput = screen.getByLabelText(/shop name/i);
      await user.type(shopNameInput, 'My Shop');

      const submitButton = screen.getByRole('button', { name: /register as seller/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/email not verified/i)).toBeInTheDocument();
      });
    });

    it('should display error before redirect when SELLER_ALREADY_EXISTS', async () => {
      const user = userEvent.setup();
      const pushMock = jest.fn();
      jest.spyOn(require('next/navigation'), 'useRouter').mockReturnValue({ push: pushMock });

      const registerMutationMock = {
        request: {
          query: REGISTER_AS_SELLER,
          variables: {
            input: {
              shopName: 'My Shop',
              shopDescription: null,
              businessName: null,
            },
          },
        },
        error: createGraphQLError('SELLER_ALREADY_EXISTS', 'You already have a seller account.'),
      };

      const mocks = [activeCustomerMock, activeSellerNullMock, registerMutationMock];

      render(
        <MockedProvider mocks={mocks}>
          <RegisterSellerPage />
        </MockedProvider>
      );

      await waitFor(() => {
        expect(screen.getByLabelText(/shop name/i)).toBeInTheDocument();
      });

      const shopNameInput = screen.getByLabelText(/shop name/i);
      await user.type(shopNameInput, 'My Shop');

      const submitButton = screen.getByRole('button', { name: /register as seller/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/you already have a seller account/i)).toBeInTheDocument();
      });

      expect(pushMock).not.toHaveBeenCalled();
    }, 10000);

    it('should display error before redirect when CUSTOMER_NOT_AUTHENTICATED', async () => {
      const user = userEvent.setup();
      const pushMock = jest.fn();
      jest.spyOn(require('next/navigation'), 'useRouter').mockReturnValue({ push: pushMock });

      const registerMutationMock = {
        request: {
          query: REGISTER_AS_SELLER,
          variables: {
            input: {
              shopName: 'My Shop',
              shopDescription: null,
              businessName: null,
            },
          },
        },
        error: createGraphQLError('CUSTOMER_NOT_AUTHENTICATED', 'Please log in to register as a seller.'),
      };

      const mocks = [activeCustomerMock, activeSellerNullMock, registerMutationMock];

      render(
        <MockedProvider mocks={mocks}>
          <RegisterSellerPage />
        </MockedProvider>
      );

      await waitFor(() => {
        expect(screen.getByLabelText(/shop name/i)).toBeInTheDocument();
      });

      const shopNameInput = screen.getByLabelText(/shop name/i);
      await user.type(shopNameInput, 'My Shop');

      const submitButton = screen.getByRole('button', { name: /register as seller/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/please log in to register as a seller/i)).toBeInTheDocument();
      });

      expect(pushMock).not.toHaveBeenCalled();
    }, 10000);
  });
});
