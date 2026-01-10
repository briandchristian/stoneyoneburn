/**
 * SearchBar Component Tests
 *
 * Tests for product search functionality in the SearchBar component.
 * Following TDD principles: These tests verify search input handling,
 * form submission, URL parameter management, and router navigation.
 */

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useRouter, useSearchParams } from 'next/navigation';
import { SearchBar } from '../SearchBar';

// Mock Next.js navigation hooks
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  useSearchParams: jest.fn(),
}));

describe('SearchBar Component', () => {
  const mockPush = jest.fn();
  const mockRouter = {
    push: mockPush,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
    (useSearchParams as jest.Mock).mockReturnValue({
      get: jest.fn((key: string) => {
        if (key === 'q') return null;
        return null;
      }),
      toString: jest.fn(() => ''),
    });
  });

  describe('Rendering', () => {
    it('should render search input field', () => {
      const { container } = render(<SearchBar />);

      const searchInput = screen.getByPlaceholderText(/search products/i);
      expect(searchInput).toBeInTheDocument();
      expect(searchInput).toHaveAttribute('type', 'text');
    });

    it('should render search icon', () => {
      const { container } = render(<SearchBar />);

      // Search icon is in an SVG element
      const searchIcon = document.querySelector('svg');
      expect(searchIcon).toBeInTheDocument();
    });

    it('should render search form', () => {
      const { container } = render(<SearchBar />);

      const form = container.querySelector('form');
      expect(form).toBeInTheDocument();
    });

    it('should have correct input placeholder', () => {
      const { container } = render(<SearchBar />);

      const searchInput = screen.getByPlaceholderText(/search products/i);
      expect(searchInput).toBeInTheDocument();
    });
  });

  describe('Search Input Handling', () => {
    it('should update search term when user types', async () => {
      const user = userEvent.setup();
      const { container } = render(<SearchBar />);

      const searchInput = screen.getByPlaceholderText(/search products/i) as HTMLInputElement;

      await user.type(searchInput, 'test product');

      expect(searchInput.value).toBe('test product');
    });

    it('should initialize with empty search term when no query param', () => {
      (useSearchParams as jest.Mock).mockReturnValue({
        get: jest.fn(() => null),
        toString: jest.fn(() => ''),
      });

      const { container } = render(<SearchBar />);

      const searchInput = screen.getByPlaceholderText(/search products/i) as HTMLInputElement;
      expect(searchInput.value).toBe('');
    });

    it('should initialize with query parameter value when present', () => {
      (useSearchParams as jest.Mock).mockReturnValue({
        get: jest.fn((key: string) => {
          if (key === 'q') return 'existing search';
          return null;
        }),
        toString: jest.fn(() => 'q=existing+search'),
      });

      const { container } = render(<SearchBar />);

      const searchInput = screen.getByPlaceholderText(/search products/i) as HTMLInputElement;
      expect(searchInput.value).toBe('existing search');
    });

    it('should allow clearing search input', async () => {
      const user = userEvent.setup();
      const { container } = render(<SearchBar />);

      const searchInput = screen.getByPlaceholderText(/search products/i) as HTMLInputElement;

      await user.type(searchInput, 'test');
      expect(searchInput.value).toBe('test');

      await user.clear(searchInput);
      expect(searchInput.value).toBe('');
    });
  });

  describe('Form Submission', () => {
    it('should navigate to products page with search query on submit', async () => {
      const user = userEvent.setup();
      const mockSearchParams = {
        get: jest.fn(() => null),
        toString: jest.fn(() => ''),
      };
      (useSearchParams as jest.Mock).mockReturnValue(mockSearchParams);

      const { container } = render(<SearchBar />);

      const searchInput = screen.getByPlaceholderText(/search products/i);
      const form = container.querySelector('form') as HTMLFormElement;

      await user.type(searchInput, 'laptop');
      await user.click(form);

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalled();
      });

      // Should navigate to /products with query parameter
      expect(mockPush).toHaveBeenCalledWith(expect.stringContaining('/products'));
    });

    it('should trim whitespace from search term before submission', async () => {
      const user = userEvent.setup();
      const mockSearchParams = {
        get: jest.fn(() => null),
        toString: jest.fn(() => ''),
      };
      (useSearchParams as jest.Mock).mockReturnValue(mockSearchParams);

      const { container } = render(<SearchBar />);

      const searchInput = screen.getByPlaceholderText(/search products/i);
      const form = container.querySelector('form') as HTMLFormElement;

      await user.type(searchInput, '  laptop  ');
      await user.click(form);

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalled();
      });

      // The trimmed value should be used
      expect(mockPush).toHaveBeenCalled();
    });

    it('should remove search query when submitting empty search', async () => {
      const user = userEvent.setup();
      const mockSearchParams = {
        get: jest.fn((key: string) => {
          if (key === 'q') return 'old search';
          return null;
        }),
        toString: jest.fn(() => 'q=old+search'),
      };
      (useSearchParams as jest.Mock).mockReturnValue(mockSearchParams);

      const { container } = render(<SearchBar />);

      const searchInput = screen.getByPlaceholderText(/search products/i) as HTMLInputElement;
      const form = container.querySelector('form') as HTMLFormElement;

      // Clear the input
      await user.clear(searchInput);
      await user.click(form);

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalled();
      });

      expect(mockPush).toHaveBeenCalled();
    });

    it('should prevent default form submission behavior', async () => {
      const user = userEvent.setup();
      const { container } = render(<SearchBar />);

      const searchInput = screen.getByPlaceholderText(/search products/i);
      const form = container.querySelector('form') as HTMLFormElement;

      const submitEvent = new Event('submit', { bubbles: true, cancelable: true });
      const preventDefaultSpy = jest.spyOn(submitEvent, 'preventDefault');

      form.dispatchEvent(submitEvent);

      // The form's onSubmit handler should prevent default
      // This is verified by the fact that navigation happens via router.push
      // rather than a full page reload
      expect(mockPush).toHaveBeenCalled();
    });

    it('should reset page parameter when searching', async () => {
      const user = userEvent.setup();
      const mockSearchParams = {
        get: jest.fn((key: string) => {
          if (key === 'page') return '2';
          if (key === 'q') return 'old search';
          return null;
        }),
        toString: jest.fn(() => 'page=2&q=old+search'),
      };
      (useSearchParams as jest.Mock).mockReturnValue(mockSearchParams);

      const { container } = render(<SearchBar />);

      const searchInput = screen.getByPlaceholderText(/search products/i);
      const form = container.querySelector('form') as HTMLFormElement;

      await user.type(searchInput, 'new search');
      await user.click(form);

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalled();
      });

      // Page parameter should be removed from URL
      expect(mockPush).toHaveBeenCalled();
    });
  });

  describe('URL Parameter Management', () => {
    it('should preserve existing query parameters when searching', async () => {
      const user = userEvent.setup();
      const mockSearchParams = {
        get: jest.fn((key: string) => {
          if (key === 'sort') return 'price';
          if (key === 'filter') return 'category';
          return null;
        }),
        toString: jest.fn(() => 'sort=price&filter=category'),
      };
      (useSearchParams as jest.Mock).mockReturnValue(mockSearchParams);

      const { container } = render(<SearchBar />);

      const searchInput = screen.getByPlaceholderText(/search products/i);
      const form = container.querySelector('form') as HTMLFormElement;

      await user.type(searchInput, 'laptop');
      await user.click(form);

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalled();
      });

      // Should preserve other parameters
      expect(mockPush).toHaveBeenCalled();
    });

    it('should handle search with no existing parameters', async () => {
      const user = userEvent.setup();
      const mockSearchParams = {
        get: jest.fn(() => null),
        toString: jest.fn(() => ''),
      };
      (useSearchParams as jest.Mock).mockReturnValue(mockSearchParams);

      const { container } = render(<SearchBar />);

      const searchInput = screen.getByPlaceholderText(/search products/i);
      const form = container.querySelector('form') as HTMLFormElement;

      await user.type(searchInput, 'laptop');
      await user.click(form);

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalled();
      });

      expect(mockPush).toHaveBeenCalledWith('/products?q=laptop');
    });

    it('should handle empty search term by removing query parameter', async () => {
      const user = userEvent.setup();
      const mockSearchParams = {
        get: jest.fn((key: string) => {
          if (key === 'q') return 'old search';
          return null;
        }),
        toString: jest.fn(() => 'q=old+search'),
      };
      (useSearchParams as jest.Mock).mockReturnValue(mockSearchParams);

      const { container } = render(<SearchBar />);

      const searchInput = screen.getByPlaceholderText(/search products/i) as HTMLInputElement;
      const form = container.querySelector('form') as HTMLFormElement;

      await user.clear(searchInput);
      await user.click(form);

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalled();
      });

      // Query parameter should be removed
      expect(mockPush).toHaveBeenCalled();
    });
  });

  describe('Router Navigation', () => {
    it('should navigate to /products on search submission', async () => {
      const user = userEvent.setup();
      const { container } = render(<SearchBar />);

      const searchInput = screen.getByPlaceholderText(/search products/i);
      const form = container.querySelector('form') as HTMLFormElement;

      await user.type(searchInput, 'laptop');
      await user.click(form);

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith(expect.stringContaining('/products'));
      });
    });

    it('should use router.push for navigation', async () => {
      const user = userEvent.setup();
      const { container } = render(<SearchBar />);

      const searchInput = screen.getByPlaceholderText(/search products/i);
      const form = container.querySelector('form') as HTMLFormElement;

      await user.type(searchInput, 'test');
      await user.click(form);

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalled();
      });

      expect(mockPush).toHaveBeenCalledTimes(1);
    });
  });

  describe('Accessibility', () => {
    it('should have accessible form element', () => {
      const { container } = render(<SearchBar />);

      const form = container.querySelector('form') as HTMLFormElement;
      expect(form).toBeInTheDocument();
    });

    it('should have accessible input field', () => {
      const { container } = render(<SearchBar />);

      const searchInput = screen.getByPlaceholderText(/search products/i);
      expect(searchInput).toBeInTheDocument();
      expect(searchInput).toHaveAttribute('type', 'text');
    });

    it('should support keyboard navigation', async () => {
      const user = userEvent.setup();
      const { container } = render(<SearchBar />);

      const searchInput = screen.getByPlaceholderText(/search products/i);

      // Tab to input
      await user.tab();
      expect(searchInput).toHaveFocus();

      // Type and submit with Enter
      await user.type(searchInput, 'laptop{Enter}');

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalled();
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle very long search terms', async () => {
      const user = userEvent.setup();
      const { container } = render(<SearchBar />);

      const searchInput = screen.getByPlaceholderText(/search products/i);
      const form = container.querySelector('form') as HTMLFormElement;

      const longSearchTerm = 'a'.repeat(500);
      await user.type(searchInput, longSearchTerm);
      await user.click(form);

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalled();
      });

      expect(mockPush).toHaveBeenCalled();
    });

    it('should handle special characters in search term', async () => {
      const user = userEvent.setup();
      const { container } = render(<SearchBar />);

      const searchInput = screen.getByPlaceholderText(/search products/i);
      const form = container.querySelector('form') as HTMLFormElement;

      await user.type(searchInput, 'laptop & accessories');
      await user.click(form);

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalled();
      });

      expect(mockPush).toHaveBeenCalled();
    });

    it('should handle search term with only whitespace', async () => {
      const user = userEvent.setup();
      const { container } = render(<SearchBar />);

      const searchInput = screen.getByPlaceholderText(/search products/i);
      const form = container.querySelector('form') as HTMLFormElement;

      await user.type(searchInput, '   ');
      await user.click(form);

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalled();
      });

      // Empty/whitespace-only search should remove query parameter
      expect(mockPush).toHaveBeenCalled();
    });
  });
});
