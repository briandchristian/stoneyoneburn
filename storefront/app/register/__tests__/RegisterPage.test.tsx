/**
 * Customer Registration Page Tests
 * 
 * Tests for the customer registration page following TDD principles.
 * These tests should be written BEFORE implementing the component.
 */

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MockedProvider } from '@apollo/client/testing';
import RegisterPage from '../page';
import { REGISTER_CUSTOMER_ACCOUNT } from '@/graphql/queries';

// Mock Next.js components
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
  }),
}));

jest.mock('@/components/Header', () => ({
  Header: () => <header>Header</header>,
}));

describe('RegisterPage', () => {
  describe('Page Rendering', () => {
    it('should render registration form with all required fields', () => {
      const mocks: any[] = [];

      render(
        <MockedProvider mocks={mocks}>
          <RegisterPage />
        </MockedProvider>
      );

      expect(screen.getByLabelText(/first name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/last name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /register|sign up|create account/i })).toBeInTheDocument();
    });

    it('should display link to login page', () => {
      const mocks: any[] = [];

      render(
        <MockedProvider mocks={mocks}>
          <RegisterPage />
        </MockedProvider>
      );

      const loginLink = screen.getByRole('link', { name: /log in|sign in/i });
      expect(loginLink).toBeInTheDocument();
      expect(loginLink).toHaveAttribute('href', '/login');
    });
  });

  describe('Form Validation', () => {
    it('should show error when first name is empty', async () => {
      const user = userEvent.setup();
      const mocks: any[] = [];

      render(
        <MockedProvider mocks={mocks}>
          <RegisterPage />
        </MockedProvider>
      );

      const submitButton = screen.getByRole('button', { name: /register|sign up|create account/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/first name.*required/i)).toBeInTheDocument();
      });
    });

    it('should show error when last name is empty', async () => {
      const user = userEvent.setup();
      const mocks: any[] = [];

      render(
        <MockedProvider mocks={mocks}>
          <RegisterPage />
        </MockedProvider>
      );

      const firstNameInput = screen.getByLabelText(/first name/i);
      await user.type(firstNameInput, 'John');

      const submitButton = screen.getByRole('button', { name: /register|sign up|create account/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/last name.*required/i)).toBeInTheDocument();
      });
    });

    it('should show error when email is invalid', async () => {
      const user = userEvent.setup();
      const mocks: any[] = [];

      render(
        <MockedProvider mocks={mocks}>
          <RegisterPage />
        </MockedProvider>
      );

      // Fill in required fields first
      await user.type(screen.getByLabelText(/first name/i), 'John');
      await user.type(screen.getByLabelText(/last name/i), 'Doe');
      await user.type(screen.getByLabelText(/^password$/i), 'password123');
      
      const emailInput = screen.getByLabelText(/email/i);
      await user.type(emailInput, 'invalid-email');

      const submitButton = screen.getByRole('button', { name: /register|sign up|create account/i });
      await user.click(submitButton);

      await waitFor(() => {
        // Check for email validation error - should show error message
        const errorMessage = screen.queryByText(/valid email|invalid|email address/i, { exact: false });
        expect(errorMessage).toBeInTheDocument();
      }, { timeout: 3000 });
    });

    it('should show error when password is too short', async () => {
      const user = userEvent.setup();
      const mocks: any[] = [];

      render(
        <MockedProvider mocks={mocks}>
          <RegisterPage />
        </MockedProvider>
      );

      const passwordInput = screen.getByLabelText(/^password$/i);
      await user.type(passwordInput, 'short');

      const submitButton = screen.getByRole('button', { name: /register|sign up|create account/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/password.*8|at least.*8/i)).toBeInTheDocument();
      });
    });
  });

  describe('Registration Success', () => {
    it('should call registerCustomerAccount mutation with correct data', async () => {
      const user = userEvent.setup();
      const pushMock = jest.fn();

      jest.spyOn(require('next/navigation'), 'useRouter').mockReturnValue({
        push: pushMock,
      });

      const registerMock = {
        request: {
          query: REGISTER_CUSTOMER_ACCOUNT,
          variables: {
            input: {
              emailAddress: 'test@example.com',
              firstName: 'John',
              lastName: 'Doe',
              password: 'password123',
            },
          },
        },
        result: {
          data: {
            registerCustomerAccount: {
              __typename: 'Success',
              success: true,
            },
          },
        },
      };

      const mocks = [registerMock];

      render(
        <MockedProvider mocks={mocks}>
          <RegisterPage />
        </MockedProvider>
      );

      await user.type(screen.getByLabelText(/first name/i), 'John');
      await user.type(screen.getByLabelText(/last name/i), 'Doe');
      await user.type(screen.getByLabelText(/email/i), 'test@example.com');
      await user.type(screen.getByLabelText(/^password$/i), 'password123');

      const submitButton = screen.getByRole('button', { name: /register|sign up|create account/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(pushMock).toHaveBeenCalledWith('/register/success');
      });
    });

    it('should show success message after successful registration', async () => {
      const user = userEvent.setup();

      const registerMock = {
        request: {
          query: REGISTER_CUSTOMER_ACCOUNT,
          variables: {
            input: {
              emailAddress: 'test@example.com',
              firstName: 'John',
              lastName: 'Doe',
              password: 'password123',
            },
          },
        },
        result: {
          data: {
            registerCustomerAccount: {
              __typename: 'Success',
              success: true,
            },
          },
        },
      };

      const mocks = [registerMock];

      render(
        <MockedProvider mocks={mocks}>
          <RegisterPage />
        </MockedProvider>
      );

      await user.type(screen.getByLabelText(/first name/i), 'John');
      await user.type(screen.getByLabelText(/last name/i), 'Doe');
      await user.type(screen.getByLabelText(/email/i), 'test@example.com');
      await user.type(screen.getByLabelText(/^password$/i), 'password123');

      const submitButton = screen.getByRole('button', { name: /register|sign up|create account/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/check your email|verification.*sent/i)).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('should display error message when email is already registered', async () => {
      const user = userEvent.setup();

      const registerMock = {
        request: {
          query: REGISTER_CUSTOMER_ACCOUNT,
          variables: {
            input: {
              emailAddress: 'existing@example.com',
              firstName: 'John',
              lastName: 'Doe',
              password: 'password123',
            },
          },
        },
        result: {
          data: {
            registerCustomerAccount: {
              __typename: 'EmailAddressConflictError',
              errorCode: 'EMAIL_ADDRESS_CONFLICT_ERROR',
              message: 'An account with this email address already exists',
            },
          },
        },
      };

      const mocks = [registerMock];

      render(
        <MockedProvider mocks={mocks}>
          <RegisterPage />
        </MockedProvider>
      );

      await user.type(screen.getByLabelText(/first name/i), 'John');
      await user.type(screen.getByLabelText(/last name/i), 'Doe');
      await user.type(screen.getByLabelText(/email/i), 'existing@example.com');
      await user.type(screen.getByLabelText(/^password$/i), 'password123');

      const submitButton = screen.getByRole('button', { name: /register|sign up|create account/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/email.*already.*exists|already registered/i)).toBeInTheDocument();
      });
    });

    it('should display error message on network error', async () => {
      const user = userEvent.setup();

      const registerMock = {
        request: {
          query: REGISTER_CUSTOMER_ACCOUNT,
          variables: {
            input: {
              emailAddress: 'test@example.com',
              firstName: 'John',
              lastName: 'Doe',
              password: 'password123',
            },
          },
        },
        error: new Error('Network error'),
      };

      const mocks = [registerMock];

      render(
        <MockedProvider mocks={mocks}>
          <RegisterPage />
        </MockedProvider>
      );

      await user.type(screen.getByLabelText(/first name/i), 'John');
      await user.type(screen.getByLabelText(/last name/i), 'Doe');
      await user.type(screen.getByLabelText(/email/i), 'test@example.com');
      await user.type(screen.getByLabelText(/^password$/i), 'password123');

      const submitButton = screen.getByRole('button', { name: /register|sign up|create account/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/error|something went wrong/i)).toBeInTheDocument();
      });
    });
  });

  describe('Loading State', () => {
    it('should show loading state while submitting registration', async () => {
      const user = userEvent.setup();

      const registerMock = {
        request: {
          query: REGISTER_CUSTOMER_ACCOUNT,
          variables: {
            input: {
              emailAddress: 'test@example.com',
              firstName: 'John',
              lastName: 'Doe',
              password: 'password123',
            },
          },
        },
        result: {
          data: {
            registerCustomerAccount: {
              __typename: 'Success',
              success: true,
            },
          },
        },
        delay: 100,
      };

      const mocks = [registerMock];

      render(
        <MockedProvider mocks={mocks}>
          <RegisterPage />
        </MockedProvider>
      );

      await user.type(screen.getByLabelText(/first name/i), 'John');
      await user.type(screen.getByLabelText(/last name/i), 'Doe');
      await user.type(screen.getByLabelText(/email/i), 'test@example.com');
      await user.type(screen.getByLabelText(/^password$/i), 'password123');

      const submitButton = screen.getByRole('button', { name: /register|sign up|create account/i });
      await user.click(submitButton);

      // Button should show loading state
      expect(screen.getByRole('button', { name: /registering|creating account|loading/i })).toBeInTheDocument();
      expect(submitButton).toBeDisabled();
    });
  });

  describe('Password Visibility Toggle', () => {
    it('should hide password by default', () => {
      const mocks: any[] = [];

      render(
        <MockedProvider mocks={mocks}>
          <RegisterPage />
        </MockedProvider>
      );

      const passwordInput = screen.getByLabelText(/^password$/i);
      expect(passwordInput).toHaveAttribute('type', 'password');
    });

    it('should display password visibility toggle button', () => {
      const mocks: any[] = [];

      render(
        <MockedProvider mocks={mocks}>
          <RegisterPage />
        </MockedProvider>
      );

      const toggleButton = screen.getByRole('button', { name: /show password|hide password|toggle.*password/i });
      expect(toggleButton).toBeInTheDocument();
    });

    it('should show password when toggle button is clicked', async () => {
      const user = userEvent.setup();
      const mocks: any[] = [];

      render(
        <MockedProvider mocks={mocks}>
          <RegisterPage />
        </MockedProvider>
      );

      const passwordInput = screen.getByLabelText(/^password$/i) as HTMLInputElement;
      const toggleButton = screen.getByRole('button', { name: /show password|hide password|toggle.*password/i });

      // Password should be hidden initially
      expect(passwordInput.type).toBe('password');

      // Click toggle button
      await user.click(toggleButton);

      // Password should now be visible
      expect(passwordInput.type).toBe('text');
    });

    it('should hide password when toggle button is clicked twice', async () => {
      const user = userEvent.setup();
      const mocks: any[] = [];

      render(
        <MockedProvider mocks={mocks}>
          <RegisterPage />
        </MockedProvider>
      );

      const passwordInput = screen.getByLabelText(/^password$/i) as HTMLInputElement;
      const toggleButton = screen.getByRole('button', { name: /show password|hide password|toggle.*password/i });

      // Password should be hidden initially
      expect(passwordInput.type).toBe('password');

      // Click toggle button to show password
      await user.click(toggleButton);
      expect(passwordInput.type).toBe('text');

      // Click toggle button again to hide password
      await user.click(toggleButton);
      expect(passwordInput.type).toBe('password');
    });

    it('should maintain password value when toggling visibility', async () => {
      const user = userEvent.setup();
      const mocks: any[] = [];

      render(
        <MockedProvider mocks={mocks}>
          <RegisterPage />
        </MockedProvider>
      );

      const passwordInput = screen.getByLabelText(/^password$/i) as HTMLInputElement;
      const toggleButton = screen.getByRole('button', { name: /show password|hide password|toggle.*password/i });

      // Type password
      await user.type(passwordInput, 'mySecretPassword123');

      // Toggle to show password
      await user.click(toggleButton);
      expect(passwordInput.value).toBe('mySecretPassword123');
      expect(passwordInput.type).toBe('text');

      // Toggle back to hide password
      await user.click(toggleButton);
      expect(passwordInput.value).toBe('mySecretPassword123');
      expect(passwordInput.type).toBe('password');
    });
  });
});
