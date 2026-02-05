/**
 * Shop Search Page Component Tests
 *
 * Tests for the shop search page at /shops/search, following TDD.
 * Phase 5.1: Shop Search Functionality
 */

import '@testing-library/jest-dom';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MockedProvider } from '@apollo/client/testing';
import ShopSearchPage from '../page';
import { SEARCH_SHOPS } from '@/graphql/queries';

// Mock Next.js components
jest.mock('next/link', () => {
  return ({ children, href }: { children: React.ReactNode; href: string }) => {
    return <a href={href}>{children}</a>;
  };
});

jest.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(''),
  useRouter: () => ({
    push: jest.fn(),
  }),
}));

jest.mock('@/components/Header', () => ({
  Header: () => <header>Header</header>,
}));

// Mock data
const mockShopSearchResult = {
  searchShops: {
    __typename: 'ShopSearchList' as const,
    items: [
      {
        __typename: 'MarketplaceSeller' as const,
        id: '1',
        shopName: 'Test Shop',
        shopSlug: 'test-shop',
        shopDescription: 'A test shop for handmade items',
        rating: {
          __typename: 'SellerRating' as const,
          averageRating: 4.5,
          totalReviews: 12,
        },
      },
      {
        __typename: 'MarketplaceSeller' as const,
        id: '2',
        shopName: 'Another Shop',
        shopSlug: 'another-shop',
        shopDescription: 'Another shop description',
        rating: {
          __typename: 'SellerRating' as const,
          averageRating: 4.8,
          totalReviews: 25,
        },
      },
    ],
    totalItems: 2,
  },
};

describe('ShopSearchPage', () => {
  describe('Initial State', () => {
    it('should display search form and initial message', () => {
      const mocks: any[] = [];

      render(
        <MockedProvider mocks={mocks}>
          <ShopSearchPage />
        </MockedProvider>
      );

      expect(screen.getByText(/search shops/i)).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/search shops by name/i)).toBeInTheDocument();
      expect(screen.getByText(/enter a search term/i)).toBeInTheDocument();
    });
  });

  describe('Search Functionality', () => {
    it('should display search results when shops are found', async () => {
      const mocks = [
        {
          request: {
            query: SEARCH_SHOPS,
            variables: {
              searchTerm: 'test',
              options: {
                skip: 0,
                take: 20,
                verifiedOnly: false,
              },
            },
          },
          result: {
            data: mockShopSearchResult,
          },
        },
      ];

      render(
        <MockedProvider mocks={mocks}>
          <ShopSearchPage />
        </MockedProvider>
      );

      const searchInput = screen.getByPlaceholderText(/search shops by name/i);
      const searchButton = screen.getByRole('button', { name: /search/i });

      await userEvent.type(searchInput, 'test');
      await userEvent.click(searchButton);

      await waitFor(() => {
        expect(screen.getByText('Test Shop')).toBeInTheDocument();
        expect(screen.getByText('Another Shop')).toBeInTheDocument();
      });
    });

    it('should display "no shops found" message when no results', async () => {
      const mocks = [
        {
          request: {
            query: SEARCH_SHOPS,
            variables: {
              searchTerm: 'nonexistent',
              options: {
                skip: 0,
                take: 20,
                verifiedOnly: false,
              },
            },
          },
          result: {
            data: {
              searchShops: {
                __typename: 'ShopSearchList' as const,
                items: [],
                totalItems: 0,
              },
            },
          },
        },
      ];

      render(
        <MockedProvider mocks={mocks}>
          <ShopSearchPage />
        </MockedProvider>
      );

      const searchInput = screen.getByPlaceholderText(/search shops by name/i);
      const searchButton = screen.getByRole('button', { name: /search/i });

      await userEvent.type(searchInput, 'nonexistent');
      await userEvent.click(searchButton);

      await waitFor(() => {
        expect(screen.getByText(/no shops found/i)).toBeInTheDocument();
      });
    });

    it('should filter by verified only when checkbox is checked', async () => {
      const mocks = [
        {
          request: {
            query: SEARCH_SHOPS,
            variables: {
              searchTerm: 'test',
              options: {
                skip: 0,
                take: 20,
                verifiedOnly: true,
              },
            },
          },
          result: {
            data: mockShopSearchResult,
          },
        },
      ];

      render(
        <MockedProvider mocks={mocks}>
          <ShopSearchPage />
        </MockedProvider>
      );

      const verifiedCheckbox = screen.getByLabelText(/verified only/i);
      await userEvent.click(verifiedCheckbox);

      const searchInput = screen.getByPlaceholderText(/search shops by name/i);
      const searchButton = screen.getByRole('button', { name: /search/i });

      await userEvent.type(searchInput, 'test');
      await userEvent.click(searchButton);

      await waitFor(() => {
        expect(verifiedCheckbox).toBeChecked();
      });
    });

    it('should display shop ratings when available', async () => {
      const mocks = [
        {
          request: {
            query: SEARCH_SHOPS,
            variables: {
              searchTerm: 'test',
              options: {
                skip: 0,
                take: 20,
                verifiedOnly: false,
              },
            },
          },
          result: {
            data: mockShopSearchResult,
          },
        },
      ];

      render(
        <MockedProvider mocks={mocks}>
          <ShopSearchPage />
        </MockedProvider>
      );

      const searchInput = screen.getByPlaceholderText(/search shops by name/i);
      const searchButton = screen.getByRole('button', { name: /search/i });

      await userEvent.type(searchInput, 'test');
      await userEvent.click(searchButton);

      await waitFor(() => {
        expect(screen.getByText(/4\.5 out of 5/)).toBeInTheDocument();
        expect(screen.getByText(/\(12 reviews\)/)).toBeInTheDocument();
      });
    });

    it('should link to shop pages', async () => {
      const mocks = [
        {
          request: {
            query: SEARCH_SHOPS,
            variables: {
              searchTerm: 'test',
              options: {
                skip: 0,
                take: 20,
                verifiedOnly: false,
              },
            },
          },
          result: {
            data: mockShopSearchResult,
          },
        },
      ];

      render(
        <MockedProvider mocks={mocks}>
          <ShopSearchPage />
        </MockedProvider>
      );

      const searchInput = screen.getByPlaceholderText(/search shops by name/i);
      const searchButton = screen.getByRole('button', { name: /search/i });

      await userEvent.type(searchInput, 'test');
      await userEvent.click(searchButton);

      await waitFor(() => {
        const shopLink = screen.getByRole('link', { name: /test shop/i });
        expect(shopLink).toHaveAttribute('href', '/shops/test-shop');
      });
    });
  });

  describe('Pagination', () => {
    it('should display pagination controls when multiple pages', async () => {
      const mocks = [
        {
          request: {
            query: SEARCH_SHOPS,
            variables: {
              searchTerm: 'shop',
              options: {
                skip: 0,
                take: 20,
                verifiedOnly: false,
              },
            },
          },
          result: {
            data: {
              searchShops: {
                __typename: 'ShopSearchList' as const,
                items: Array.from({ length: 20 }, (_, i) => ({
                  __typename: 'MarketplaceSeller' as const,
                  id: `${i + 1}`,
                  shopName: `Shop ${i + 1}`,
                  shopSlug: `shop-${i + 1}`,
                  shopDescription: null,
                  rating: null,
                })),
                totalItems: 45,
              },
            },
          },
        },
      ];

      render(
        <MockedProvider mocks={mocks}>
          <ShopSearchPage />
        </MockedProvider>
      );

      const searchInput = screen.getByPlaceholderText(/search shops by name/i);
      const searchButton = screen.getByRole('button', { name: /search/i });

      await userEvent.type(searchInput, 'shop');
      await userEvent.click(searchButton);

      await waitFor(() => {
        expect(screen.getByText(/page 1 of 3/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /previous/i })).toBeDisabled();
        expect(screen.getByRole('button', { name: /next/i })).not.toBeDisabled();
      });
    });
  });
});
