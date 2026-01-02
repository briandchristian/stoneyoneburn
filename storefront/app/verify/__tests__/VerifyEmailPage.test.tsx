/**
 * Email Verification Page Tests
 * 
 * Tests for the email verification page following TDD principles.
 * These tests should be written BEFORE implementing the component.
 */

import { render, screen, waitFor } from '@testing-library/react';
import { MockedProvider } from '@apollo/client/testing';
import VerifyEmailPage from '../page';
import { VERIFY_CUSTOMER_ACCOUNT } from '@/graphql/queries';
import { useRouter, useSearchParams } from 'next/navigation';

// Mock Next.js components
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  useSearchParams: jest.fn(),
}));

jest.mock('@/components/Header', () => ({
  Header: () => <header>Header</header>,
}));

describe('VerifyEmailPage', () => {
  const mockPush = jest.fn();
  const mockSearchParams = new URLSearchParams();

  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue({
      push: mockPush,
    });
    (useSearchParams as jest.Mock).mockReturnValue(mockSearchParams);
  });

  describe('Page Rendering', () => {
    it('should render verification in progress message when token is present', () => {
      mockSearchParams.set('token', 'test-token-123');

      render(
        <MockedProvider mocks={[]}>
          <VerifyEmailPage />
        </MockedProvider>
      );

      expect(screen.getByText(/Verifying Your Email/i)).toBeInTheDocument();
      expect(screen.getByText(/Please wait while we verify your email address/i)).toBeInTheDocument();
    });

    it('should render error message when token is missing', () => {
      mockSearchParams.delete('token');

      render(
        <MockedProvider mocks={[]}>
          <VerifyEmailPage />
        </MockedProvider>
      );

      expect(screen.getByText(/invalid|missing|no token/i)).toBeInTheDocument();
    });
  });

  describe('Email Verification Success', () => {
    it('should call verifyCustomerAccount mutation with token', async () => {
      const token = 'valid-verification-token';
      mockSearchParams.set('token', token);

      const verifyMock = {
        request: {
          query: VERIFY_CUSTOMER_ACCOUNT,
          variables: {
            token,
          },
        },
        result: {
          data: {
            verifyCustomerAccount: {
              __typename: 'CurrentUser',
              id: 'user-1',
              identifier: 'test@example.com',
            },
          },
        },
      };

      render(
        <MockedProvider mocks={[verifyMock]}>
          <VerifyEmailPage />
        </MockedProvider>
      );

      await waitFor(() => {
        expect(screen.getByText(/Email Verified!/i)).toBeInTheDocument();
      });
    });

    it('should redirect to login page after successful verification', async () => {
      const token = 'valid-verification-token';
      mockSearchParams.set('token', token);

      const verifyMock = {
        request: {
          query: VERIFY_CUSTOMER_ACCOUNT,
          variables: {
            token,
          },
        },
        result: {
          data: {
            verifyCustomerAccount: {
              __typename: 'CurrentUser',
              id: 'user-1',
              identifier: 'test@example.com',
            },
          },
        },
        delay: 100,
      };

      render(
        <MockedProvider mocks={[verifyMock]}>
          <VerifyEmailPage />
        </MockedProvider>
      );

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/login');
      }, { timeout: 3000 });
    });
  });

  describe('Email Verification Error Handling', () => {
    it('should display error message for invalid token', async () => {
      const token = 'invalid-token';
      mockSearchParams.set('token', token);

      const verifyMock = {
        request: {
          query: VERIFY_CUSTOMER_ACCOUNT,
          variables: {
            token,
          },
        },
        result: {
          data: {
            verifyCustomerAccount: {
              __typename: 'VerificationTokenInvalidError',
              errorCode: 'VERIFICATION_TOKEN_INVALID_ERROR',
              message: 'Verification token is invalid or expired',
            },
          },
        },
      };

      render(
        <MockedProvider mocks={[verifyMock]}>
          <VerifyEmailPage />
        </MockedProvider>
      );

      await waitFor(() => {
        expect(screen.getByText(/invalid|expired|error/i)).toBeInTheDocument();
      });
    });

    it('should display error message on network error', async () => {
      const token = 'test-token';
      mockSearchParams.set('token', token);

      const verifyMock = {
        request: {
          query: VERIFY_CUSTOMER_ACCOUNT,
          variables: {
            token,
          },
        },
        error: new Error('Network error'),
      };

      render(
        <MockedProvider mocks={[verifyMock]}>
          <VerifyEmailPage />
        </MockedProvider>
      );

      await waitFor(() => {
        expect(screen.getByText(/error|something went wrong/i)).toBeInTheDocument();
      });
    });
  });

  describe('Page Structure', () => {
    it('should render Header component', () => {
      mockSearchParams.set('token', 'test-token');

      render(
        <MockedProvider mocks={[]}>
          <VerifyEmailPage />
        </MockedProvider>
      );

      expect(screen.getByText('Header')).toBeInTheDocument();
    });
  });
});
