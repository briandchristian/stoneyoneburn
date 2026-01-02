/**
 * Registration Success Page Tests
 * 
 * Tests for the registration success page following TDD principles.
 * These tests should be written BEFORE implementing the component.
 */

import { render, screen } from '@testing-library/react';
import RegisterSuccessPage from '../page';

// Mock Next.js components
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
  }),
}));

jest.mock('@/components/Header', () => ({
  Header: () => <header>Header</header>,
}));

describe('RegisterSuccessPage', () => {
  describe('Page Rendering', () => {
    it('should render success message', () => {
      render(<RegisterSuccessPage />);

      expect(screen.getByText(/registration successful|account created/i)).toBeInTheDocument();
    });

    it('should display email verification instructions', () => {
      render(<RegisterSuccessPage />);

      expect(screen.getByText(/check your email|verification link|verify your account/i)).toBeInTheDocument();
    });

    it('should display link to login page', () => {
      render(<RegisterSuccessPage />);

      const loginLink = screen.getByRole('link', { name: /log in|go to login/i });
      expect(loginLink).toBeInTheDocument();
      expect(loginLink).toHaveAttribute('href', '/login');
    });

    it('should display link to home page', () => {
      render(<RegisterSuccessPage />);

      const homeLink = screen.getByRole('link', { name: /home|continue shopping|back to home/i });
      expect(homeLink).toBeInTheDocument();
      expect(homeLink).toHaveAttribute('href', '/');
    });
  });

  describe('Page Structure', () => {
    it('should render Header component', () => {
      render(<RegisterSuccessPage />);

      expect(screen.getByText('Header')).toBeInTheDocument();
    });

    it('should have proper page layout', () => {
      const { container } = render(<RegisterSuccessPage />);

      // Check for main element
      const main = container.querySelector('main');
      expect(main).toBeInTheDocument();
    });
  });
});
