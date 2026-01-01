/**
 * Collections Page Component Tests
 *
 * Tests for the Collections page component following TDD principles.
 */

import '@testing-library/jest-dom';
import { render, screen, waitFor } from '@testing-library/react';
import { MockedProvider } from '@apollo/client/testing';
import CollectionsPage from '../page';
import { GET_COLLECTIONS } from '@/graphql/queries';

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

jest.mock('@/components/Header', () => ({
  Header: () => <header>Header</header>,
}));

// Mock data
const mockCollections = {
  collections: {
    __typename: 'CollectionList' as const,
    items: [
      {
        __typename: 'Collection' as const,
        id: 'collection-1',
        name: 'Electronics',
        slug: 'electronics',
        description: 'Electronic products',
        featuredAsset: {
          __typename: 'Asset' as const,
          id: 'asset-1',
          preview: 'https://example.com/electronics.jpg',
        },
      },
      {
        __typename: 'Collection' as const,
        id: 'collection-2',
        name: 'Clothing',
        slug: 'clothing',
        description: 'Clothing and apparel',
        featuredAsset: {
          __typename: 'Asset' as const,
          id: 'asset-2',
          preview: 'https://example.com/clothing.jpg',
        },
      },
      {
        __typename: 'Collection' as const,
        id: 'collection-3',
        name: 'Books',
        slug: 'books',
        description: null,
        featuredAsset: null,
      },
    ],
    totalItems: 3,
  },
};

describe('CollectionsPage', () => {
  describe('Loading State', () => {
    it('should show loading message when data is loading', () => {
      const mocks: any[] = [];

      render(
        <MockedProvider mocks={mocks} >
          <CollectionsPage />
        </MockedProvider>
      );

      expect(screen.getByText(/loading collections/i)).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('should display error message when GraphQL query fails', async () => {
      const mocks = [
        {
          request: {
            query: GET_COLLECTIONS,
          },
          error: new Error('Network error'),
        },
      ];

      render(
        <MockedProvider mocks={mocks} >
          <CollectionsPage />
        </MockedProvider>
      );

      await waitFor(() => {
        expect(screen.getByText(/error loading collections/i)).toBeInTheDocument();
      });
    });

    it('should display GraphQL error details when available', async () => {
      const graphQLError = {
        message: 'Cannot query field "productCount" on type "Collection"',
        extensions: {
          code: 'GRAPHQL_VALIDATION_FAILED',
        },
      };

      const mocks = [
        {
          request: {
            query: GET_COLLECTIONS,
          },
          result: {
            errors: [graphQLError],
          },
        },
      ];

      render(
        <MockedProvider mocks={mocks} >
          <CollectionsPage />
        </MockedProvider>
      );

      await waitFor(() => {
        expect(screen.getByText(/error loading collections/i)).toBeInTheDocument();
      });
    });
  });

  describe('Successful Data Display', () => {
    it('should display collections when data loads successfully', async () => {
      const mocks = [
        {
          request: {
            query: GET_COLLECTIONS,
          },
          result: {
            data: mockCollections,
          },
        },
      ];

      render(
        <MockedProvider mocks={mocks} >
          <CollectionsPage />
        </MockedProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('Shop by Category')).toBeInTheDocument();
        expect(screen.getByText('Electronics')).toBeInTheDocument();
        expect(screen.getByText('Clothing')).toBeInTheDocument();
        expect(screen.getByText('Books')).toBeInTheDocument();
      });
    });

    it('should display collection descriptions when available', async () => {
      const mocks = [
        {
          request: {
            query: GET_COLLECTIONS,
          },
          result: {
            data: mockCollections,
          },
        },
      ];

      render(
        <MockedProvider mocks={mocks} >
          <CollectionsPage />
        </MockedProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('Electronic products')).toBeInTheDocument();
        expect(screen.getByText('Clothing and apparel')).toBeInTheDocument();
      });
    });

    it('should display collection images when available', async () => {
      const mocks = [
        {
          request: {
            query: GET_COLLECTIONS,
          },
          result: {
            data: mockCollections,
          },
        },
      ];

      render(
        <MockedProvider mocks={mocks} >
          <CollectionsPage />
        </MockedProvider>
      );

      await waitFor(() => {
        const electronicsImage = screen.getByAltText('Electronics');
        expect(electronicsImage).toBeInTheDocument();
        expect(electronicsImage).toHaveAttribute('src', 'https://example.com/electronics.jpg');
      });
    });

    it('should display "View products" link for each collection', async () => {
      const mocks = [
        {
          request: {
            query: GET_COLLECTIONS,
          },
          result: {
            data: mockCollections,
          },
        },
      ];

      render(
        <MockedProvider mocks={mocks} >
          <CollectionsPage />
        </MockedProvider>
      );

      await waitFor(() => {
        const viewProductsLinks = screen.getAllByText('View products');
        expect(viewProductsLinks).toHaveLength(3);
      });
    });

    it('should link to correct collection detail page', async () => {
      const mocks = [
        {
          request: {
            query: GET_COLLECTIONS,
          },
          result: {
            data: mockCollections,
          },
        },
      ];

      render(
        <MockedProvider mocks={mocks} >
          <CollectionsPage />
        </MockedProvider>
      );

      await waitFor(() => {
        const electronicsLink = screen.getByText('Electronics').closest('a');
        expect(electronicsLink).toHaveAttribute('href', '/collections/electronics');
      });
    });
  });

  describe('Empty State', () => {
    it('should display message when no collections are found', async () => {
      const mocks = [
        {
          request: {
            query: GET_COLLECTIONS,
          },
          result: {
            data: {
              collections: {
                items: [],
                totalItems: 0,
              },
            },
          },
        },
      ];

      render(
        <MockedProvider mocks={mocks} >
          <CollectionsPage />
        </MockedProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('No collections found.')).toBeInTheDocument();
      });
    });
  });

  describe('Collection Without Description or Image', () => {
    it('should handle collections without descriptions', async () => {
      const mocks = [
        {
          request: {
            query: GET_COLLECTIONS,
          },
          result: {
            data: mockCollections,
          },
        },
      ];

      render(
        <MockedProvider mocks={mocks} >
          <CollectionsPage />
        </MockedProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('Books')).toBeInTheDocument();
        // Should not crash when description is null
        expect(screen.queryByText('null')).not.toBeInTheDocument();
      });
    });

    it('should handle collections without featured images', async () => {
      const mocks = [
        {
          request: {
            query: GET_COLLECTIONS,
          },
          result: {
            data: mockCollections,
          },
        },
      ];

      render(
        <MockedProvider mocks={mocks} >
          <CollectionsPage />
        </MockedProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('Books')).toBeInTheDocument();
        // Books collection has no image, so it should not have an img element
        const allImages = screen.getAllByRole('img');
        expect(allImages).toHaveLength(2); // Only Electronics and Clothing have images
      });
    });
  });
});
