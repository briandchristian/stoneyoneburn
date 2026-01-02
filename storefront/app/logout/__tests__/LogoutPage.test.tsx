/**
 * Logout Page Tests
 * 
 * Tests for the customer logout page following TDD principles.
 * These tests should be written BEFORE implementing the component.
 */

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MockedProvider } from '@apollo/client/testing';
import LogoutPage from '../page';
import { LOGOUT, GET_ACTIVE_CUSTOMER } from '@/graphql/queries';

// Mock Next.js components
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
  }),
}));

jest.mock('@/components/Header', () => ({
  Header: () => <header>Header</header>,
}));

// Mock localStorage
const mockRemoveItem = jest.fn();
const mockGetItem = jest.fn();
Object.defineProperty(window, 'localStorage', {
  value: {
    removeItem: mockRemoveItem,
    getItem: mockGetItem,
    setItem: jest.fn(),
  },
  writable: true,
});

describe('LogoutPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRemoveItem.mockClear();
  });

  describe('Page Rendering', () => {
    it('should render logout page with logging out message', () => {
      const mocks: any[] = [];

      render(
        <MockedProvider mocks={mocks}>
          <LogoutPage />
        </MockedProvider>
      );

      expect(screen.getByText(/Logging Out/i)).toBeInTheDocument();
      expect(screen.getByText(/Please wait while we sign you out/i)).toBeInTheDocument();
    });

    it('should render Header component', () => {
      const mocks: any[] = [];

      render(
        <MockedProvider mocks={mocks}>
          <LogoutPage />
        </MockedProvider>
      );

      expect(screen.getByText('Header')).toBeInTheDocument();
    });
  });

  describe('Logout Functionality', () => {
    it('should call logout mutation on mount and redirect to home', async () => {
      const pushMock = jest.fn();
      jest.spyOn(require('next/navigation'), 'useRouter').mockReturnValue({
        push: pushMock,
      });

      const logoutMock = {
        request: {
          query: LOGOUT,
        },
        result: {
          data: {
            logout: {
              success: true,
            },
          },
        },
      };

      const getActiveCustomerMock = {
        request: {
          query: GET_ACTIVE_CUSTOMER,
        },
        result: {
          data: {
            activeCustomer: null,
          },
        },
      };

      const mocks = [logoutMock, getActiveCustomerMock];

      render(
        <MockedProvider mocks={mocks}>
          <LogoutPage />
        </MockedProvider>
      );

      await waitFor(() => {
        expect(mockRemoveItem).toHaveBeenCalledWith('vendure_token');
        expect(pushMock).toHaveBeenCalledWith('/');
      }, { timeout: 3000 });
    });

    it('should clear localStorage token on logout', async () => {
      mockGetItem.mockReturnValue('test-token');

      const logoutMock = {
        request: {
          query: LOGOUT,
        },
        result: {
          data: {
            logout: {
              success: true,
            },
          },
        },
      };

      const mocks = [logoutMock];

      render(
        <MockedProvider mocks={mocks}>
          <LogoutPage />
        </MockedProvider>
      );

      await waitFor(() => {
        expect(mockRemoveItem).toHaveBeenCalledWith('vendure_token');
      }, { timeout: 3000 });
    });

    it('should redirect to home page after successful logout', async () => {
      const pushMock = jest.fn();
      jest.spyOn(require('next/navigation'), 'useRouter').mockReturnValue({
        push: pushMock,
      });

      const logoutMock = {
        request: {
          query: LOGOUT,
        },
        result: {
          data: {
            logout: {
              success: true,
            },
          },
        },
        delay: 100,
      };

      const mocks = [logoutMock];

      render(
        <MockedProvider mocks={mocks}>
          <LogoutPage />
        </MockedProvider>
      );

      await waitFor(() => {
        expect(pushMock).toHaveBeenCalledWith('/');
      }, { timeout: 3000 });
    });
  });

  describe('Error Handling', () => {
    it('should still redirect even if logout fails', async () => {
      const pushMock = jest.fn();
      jest.spyOn(require('next/navigation'), 'useRouter').mockReturnValue({
        push: pushMock,
      });

      const logoutMock = {
        request: {
          query: LOGOUT,
        },
        error: new Error('Network error'),
      };

      const mocks = [logoutMock];

      render(
        <MockedProvider mocks={mocks}>
          <LogoutPage />
        </MockedProvider>
      );

      // Should still clear token and redirect even on error
      await waitFor(() => {
        expect(mockRemoveItem).toHaveBeenCalledWith('vendure_token');
        expect(pushMock).toHaveBeenCalledWith('/');
      }, { timeout: 3000 });
    });
  });
});
