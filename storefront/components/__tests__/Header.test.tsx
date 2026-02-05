/**
 * Header Component Tests
 * 
 * Tests for account management UI indicators in the Header component.
 * Following TDD principles - these tests define what account management
 * indicators should be visible to customers.
 */

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MockedProvider } from '@apollo/client/testing';
import { Header } from '../Header';
import { GET_ACTIVE_ORDER, GET_ACTIVE_CUSTOMER } from '@/graphql/queries';

const mockCustomer = {
  id: 'customer-1',
  firstName: 'John',
  lastName: 'Doe',
  emailAddress: 'john.doe@example.com',
};

const mockOrder = {
  id: 'order-1',
  lines: [
    { quantity: 2 },
    { quantity: 1 },
  ],
};

describe('Header - Account Management Indicators', () => {
  describe('When customer is NOT logged in', () => {
    it('should display login and sign up links', async () => {
      const mocks = [
        {
          request: {
            query: GET_ACTIVE_CUSTOMER,
          },
          result: {
            data: {
              activeCustomer: null,
            },
          },
        },
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
          <Header />
        </MockedProvider>
      );

      await waitFor(() => {
        expect(screen.getByRole('link', { name: /log in/i })).toBeInTheDocument();
        expect(screen.getByRole('link', { name: /sign up/i })).toBeInTheDocument();
      });
    });

    it('should NOT display account or logout links', async () => {
      const mocks = [
        {
          request: {
            query: GET_ACTIVE_CUSTOMER,
          },
          result: {
            data: {
              activeCustomer: null,
            },
          },
        },
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
          <Header />
        </MockedProvider>
      );

      await waitFor(() => {
        expect(screen.queryByRole('link', { name: /account/i })).not.toBeInTheDocument();
        expect(screen.queryByRole('link', { name: /logout/i })).not.toBeInTheDocument();
      });
    });
  });

  describe('When customer IS logged in', () => {
    it('should display account link in account menu', async () => {
      const user = userEvent.setup();
      const mocks = [
        {
          request: {
            query: GET_ACTIVE_CUSTOMER,
          },
          result: {
            data: {
              activeCustomer: mockCustomer,
            },
          },
        },
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
          <Header />
        </MockedProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('account-indicator')).toBeInTheDocument();
      });

      // Open the account menu
      const accountButton = screen.getByTestId('account-indicator');
      await user.click(accountButton);

      await waitFor(() => {
        const accountLink = screen.getByRole('link', { name: /my account/i });
        expect(accountLink).toBeInTheDocument();
        expect(accountLink).toHaveAttribute('href', '/account');
      });
    });

    it('should display logout link in account menu', async () => {
      const user = userEvent.setup();
      const mocks = [
        {
          request: {
            query: GET_ACTIVE_CUSTOMER,
          },
          result: {
            data: {
              activeCustomer: mockCustomer,
            },
          },
        },
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
          <Header />
        </MockedProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('account-indicator')).toBeInTheDocument();
      });

      // Open the account menu
      const accountButton = screen.getByTestId('account-indicator');
      await user.click(accountButton);

      await waitFor(() => {
        const logoutLink = screen.getByRole('link', { name: /sign out/i });
        expect(logoutLink).toBeInTheDocument();
        expect(logoutLink).toHaveAttribute('href', '/logout');
      });
    });

    it('should display Sell on Marketplace link in account menu (Phase 2.2)', async () => {
      const user = userEvent.setup();
      const mocks = [
        {
          request: {
            query: GET_ACTIVE_CUSTOMER,
          },
          result: {
            data: {
              activeCustomer: mockCustomer,
            },
          },
        },
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
          <Header />
        </MockedProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('account-indicator')).toBeInTheDocument();
      });

      const accountButton = screen.getByTestId('account-indicator');
      await user.click(accountButton);

      await waitFor(() => {
        const sellLink = screen.getByRole('link', { name: /sell on marketplace/i });
        expect(sellLink).toBeInTheDocument();
        expect(sellLink).toHaveAttribute('href', '/seller/shop-settings');
      });
    });

    it('should display customer name or email in header', async () => {
      const mocks = [
        {
          request: {
            query: GET_ACTIVE_CUSTOMER,
          },
          result: {
            data: {
              activeCustomer: mockCustomer,
            },
          },
        },
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
          <Header />
        </MockedProvider>
      );

      await waitFor(() => {
        // Should show customer name or email address for visual indication
        const customerInfo = screen.getByText(/John Doe/i);
        expect(customerInfo).toBeInTheDocument();
      });
    });

    it('should NOT display login or sign up links when logged in', async () => {
      const mocks = [
        {
          request: {
            query: GET_ACTIVE_CUSTOMER,
          },
          result: {
            data: {
              activeCustomer: mockCustomer,
            },
          },
        },
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
          <Header />
        </MockedProvider>
      );

      await waitFor(() => {
        expect(screen.queryByRole('link', { name: /log in/i })).not.toBeInTheDocument();
        expect(screen.queryByRole('link', { name: /sign up/i })).not.toBeInTheDocument();
      });
    });
  });

  describe('Account Menu/Dropdown (Enhanced UX)', () => {
    it('should provide a dropdown menu with account options when customer name is clicked', async () => {
      const user = userEvent.setup();
      const mocks = [
        {
          request: {
            query: GET_ACTIVE_CUSTOMER,
          },
          result: {
            data: {
              activeCustomer: mockCustomer,
            },
          },
        },
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
          <Header />
        </MockedProvider>
      );

      await waitFor(() => {
        expect(screen.getByText(/John Doe|john.doe@example.com/i)).toBeInTheDocument();
      });

      // Click on account menu button to open dropdown
      const accountButton = screen.getByTestId('account-indicator');
      await user.click(accountButton);

      // Should show account menu options
      await waitFor(() => {
        expect(screen.getByRole('link', { name: /my account/i })).toBeInTheDocument();
        expect(screen.getByRole('link', { name: /order history/i })).toBeInTheDocument();
        expect(screen.getByRole('link', { name: /sign out/i })).toBeInTheDocument();
      });
    });
  });

  describe('Visual Account Indicator', () => {
    it('should have a visual indicator (icon or badge) showing logged-in state', async () => {
      const mocks = [
        {
          request: {
            query: GET_ACTIVE_CUSTOMER,
          },
          result: {
            data: {
              activeCustomer: mockCustomer,
            },
          },
        },
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
          <Header />
        </MockedProvider>
      );

      await waitFor(() => {
        // Should have some visual indicator like an icon or user avatar
        const accountIndicator = screen.getByTestId('account-indicator');
        expect(accountIndicator).toBeInTheDocument();
      });
    });
  });
});
