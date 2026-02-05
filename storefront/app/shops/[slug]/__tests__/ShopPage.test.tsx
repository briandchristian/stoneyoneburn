/**
 * Shop Page Component Tests
 *
 * Tests for the seller shop page at /shops/[slug], following TDD.
 */

import '@testing-library/jest-dom';
import { render, screen, waitFor } from '@testing-library/react';
import { MockedProvider } from '@apollo/client/testing';
import ShopPage from '../page';
import { GET_SHOP_PAGE } from '@/graphql/queries';

// Mock Next.js components
jest.mock('next/link', () => {
  return ({ children, href }: { children: React.ReactNode; href: string }) => {
    return <a href={href}>{children}</a>;
  };
});

jest.mock('next/image', () => ({
  __esModule: true,
  default: ({ src, alt, ...props }: { src: string; alt: string; [key: string]: any }) => {
    return <img src={src} alt={alt} {...props} />;
  },
}));

jest.mock('next/navigation', () => ({
  useParams: () => ({ slug: 'handmade-shop' }),
  useSearchParams: () => new URLSearchParams(''),
}));

jest.mock('@/components/Header', () => ({
  Header: () => <header>Header</header>,
}));

// Mock data for a seller shop with products
const mockShopPage = {
  shop: {
    __typename: 'MarketplaceSeller' as const,
    id: 'seller-1',
    shopName: 'Handmade by Alice',
    shopSlug: 'handmade-shop',
    shopDescription: 'Beautiful handmade crafts and art pieces.',
    rating: {
      __typename: 'SellerRating' as const,
      averageRating: 4.5,
      totalReviews: 12,
    },
  },
  shopProducts: {
    __typename: 'ShopProductsList' as const,
    items: [
      {
        __typename: 'Product' as const,
        id: 'product-1',
        name: 'Handmade Mug',
        slug: 'handmade-mug',
        description: 'A beautiful ceramic mug.',
        featuredAsset: {
          __typename: 'Asset' as const,
          id: 'asset-1',
          preview: 'https://example.com/mug.jpg',
        },
        variants: [
          {
            __typename: 'ProductVariant' as const,
            id: 'variant-1',
            name: 'Handmade Mug',
            currencyCode: 'USD',
            price: 2500,
            priceWithTax: 2500,
            sku: 'MUG-001',
            stockLevel: 'IN_STOCK',
          },
        ],
      },
    ],
    totalItems: 1,
  },
};

describe('ShopPage', () => {
  describe('Loading State', () => {
    it('should show loading message when data is loading', () => {
      const mocks: any[] = [];

      render(
        <MockedProvider mocks={mocks}>
          <ShopPage />
        </MockedProvider>
      );

      expect(screen.getByText(/loading shop/i)).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('should display error message when GraphQL query fails', async () => {
      const mocks = [
        {
          request: {
            query: GET_SHOP_PAGE,
            variables: {
              slug: 'handmade-shop',
              options: {
                skip: 0,
                take: 20,
              },
            },
          },
          error: new Error('Network error'),
        },
      ];

      render(
        <MockedProvider mocks={mocks}>
          <ShopPage />
        </MockedProvider>
      );

      await waitFor(() => {
        expect(screen.getByText(/error loading shop/i)).toBeInTheDocument();
      });
    });
  });

  describe('Successful Data Display', () => {
    it('should display shop name, description, and rating when data loads successfully', async () => {
      const mocks = [
        {
          request: {
            query: GET_SHOP_PAGE,
            variables: {
              slug: 'handmade-shop',
              options: {
                skip: 0,
                take: 20,
              },
            },
          },
          result: {
            data: mockShopPage,
          },
        },
      ];

      render(
        <MockedProvider mocks={mocks}>
          <ShopPage />
        </MockedProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('Handmade by Alice')).toBeInTheDocument();
        expect(
          screen.getByText('Beautiful handmade crafts and art pieces.')
        ).toBeInTheDocument();
        expect(screen.getByText(/4\.5 out of 5/)).toBeInTheDocument();
        expect(screen.getByText(/\(12 reviews\)/)).toBeInTheDocument();
      });
    });

    it('should display products for the shop', async () => {
      const mocks = [
        {
          request: {
            query: GET_SHOP_PAGE,
            variables: {
              slug: 'handmade-shop',
              options: {
                skip: 0,
                take: 20,
              },
            },
          },
          result: {
            data: mockShopPage,
          },
        },
      ];

      render(
        <MockedProvider mocks={mocks}>
          <ShopPage />
        </MockedProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('Handmade Mug')).toBeInTheDocument();
        const productImage = screen.getByAltText('Handmade Mug');
        expect(productImage).toBeInTheDocument();
        expect(productImage).toHaveAttribute('src', 'https://example.com/mug.jpg');
      });
    });
  });

  describe('Empty State', () => {
    it('should display message when shop has no products', async () => {
      const mocks = [
        {
          request: {
            query: GET_SHOP_PAGE,
            variables: {
              slug: 'handmade-shop',
              options: {
                skip: 0,
                take: 20,
              },
            },
          },
          result: {
            data: {
              shop: mockShopPage.shop,
              shopProducts: {
                __typename: 'ShopProductsList' as const,
                items: [],
                totalItems: 0,
              },
            },
          },
        },
      ];

      render(
        <MockedProvider mocks={mocks}>
          <ShopPage />
        </MockedProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('No products available in this shop.')).toBeInTheDocument();
      });
    });
  });
});

