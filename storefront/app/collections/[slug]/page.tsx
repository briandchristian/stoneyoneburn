/**
 * Collection Detail Page
 *
 * Displays products in a specific collection
 */

'use client';

import { useQuery } from '@apollo/client';
import { SEARCH_PRODUCTS, GET_COLLECTIONS } from '@/graphql/queries';
import { Header } from '@/components/Header';
import { ProductSort } from '@/components/ProductSort';
import { Pagination } from '@/components/Pagination';
import Link from 'next/link';
import Image from 'next/image';
import { useParams, useSearchParams } from 'next/navigation';
import { useMemo } from 'react';

interface Product {
  id: string;
  name: string;
  slug: string;
  description?: string;
  featuredAsset?: {
    id: string;
    preview: string;
  };
  variants?: Array<{
    id: string;
    name: string;
    currencyCode: string;
    price: number;
    priceWithTax: number;
    sku: string;
    stockLevel: string;
  }>;
}

interface SearchResult {
  productId: string;
  productVariantId: string;
  productName: string;
  slug: string;
  productAsset?: {
    id: string;
    preview: string;
  };
  priceWithTax: {
    value?: number;
    min?: number;
    max?: number;
  };
  currencyCode: string;
  description: string;
  inStock: boolean;
}

interface SearchData {
  search?: {
    items: SearchResult[];
    totalItems: number;
  };
}

interface Collection {
  id: string;
  name: string;
  slug: string;
  description?: string;
}

interface CollectionsData {
  collections?: {
    items: Collection[];
  };
}

const ITEMS_PER_PAGE = 20;

export default function CollectionDetailPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  // Handle slug - it might be a string or array from Next.js params
  const slugParam = params?.slug;
  const slug = Array.isArray(slugParam) ? slugParam[0] : (slugParam as string);
  const sortParam = searchParams.get('sort') || 'name_ASC';
  const page = parseInt(searchParams.get('page') || '1', 10);

  const [sortField, sortOrder] = useMemo(() => {
    const parts = sortParam.split('_');
    return [parts[0], parts[1] || 'ASC'];
  }, [sortParam]);

  // Determine search sort field (Vendure search API only supports 'name' and 'price')
  const searchSortField = useMemo(() => {
    if (sortField === 'price') {
      return 'price';
    }
    // Default to 'name' for name, createdAt, and any other fields
    return 'name';
  }, [sortField]);

  // Use search API with collectionSlug to get products in collection
  const searchInput = {
    collectionSlug: slug,
    take: ITEMS_PER_PAGE,
    skip: (page - 1) * ITEMS_PER_PAGE,
    // Vendure SearchInput sort expects a single object, not an array
    sort:
      searchSortField === 'price'
        ? { price: sortOrder.toUpperCase() }
        : { name: sortOrder.toUpperCase() },
  };

  const { data: searchData, loading: searchLoading, error: searchError } = useQuery<SearchData>(
    SEARCH_PRODUCTS,
    {
      variables: {
        input: searchInput,
      },
      fetchPolicy: 'cache-and-network',
      skip: !slug,
    }
  );

  // Get collection info separately
  const { data: collectionsData } = useQuery<CollectionsData>(GET_COLLECTIONS, {
    fetchPolicy: 'cache-first',
  });

  const loading = searchLoading;
  const error = searchError;

  // Find the collection from the collections list
  const collection = useMemo(() => {
    return collectionsData?.collections?.items.find((c) => c.slug === slug);
  }, [collectionsData, slug]);

  // Extract products from search response (same structure as products page)
  const { products, totalItems } = useMemo(() => {
    const searchResults = searchData?.search?.items || [];
    return {
      products: searchResults.map((result) => ({
        id: result.productVariantId, // Use productVariantId for unique key
        name: result.productName,
        slug: result.slug,
        description: result.description,
        featuredAsset: result.productAsset,
        variants: [
          {
            id: result.productVariantId,
            name: result.productName,
            currencyCode: result.currencyCode,
            price: result.priceWithTax.value || result.priceWithTax.min || 0,
            priceWithTax: result.priceWithTax.value || result.priceWithTax.min || 0,
            sku: '',
            stockLevel: result.inStock ? 'IN_STOCK' : 'OUT_OF_STOCK',
          },
        ],
      })) as Product[],
      totalItems: searchData?.search?.totalItems || 0,
    };
  }, [searchData]);

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col bg-white">
        <Header />
        <main className="flex-1">
          <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
            <p className="text-black font-medium">Loading collection...</p>
          </div>
        </main>
      </div>
    );
  }

  if (error) {
    console.error('GraphQL Error:', error);
    console.error('Error details:', JSON.stringify(error, null, 2));
    return (
      <div className="flex min-h-screen flex-col bg-white">
        <Header />
        <main className="flex-1">
          <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
            <div className="text-center">
              <p className="text-red-700 font-semibold">Error loading collection: {error.message}</p>
              {error.networkError && (
                <p className="mt-2 text-sm text-red-600">
                  Network Error: {error.networkError.message}
                </p>
              )}
              {error.graphQLErrors && error.graphQLErrors.length > 0 && (
                <div className="mt-2 text-sm text-red-600">
                  {error.graphQLErrors.map((err, idx) => (
                    <p key={idx}>{err.message}</p>
                  ))}
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    );
  }

  const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);
  const collectionName = collection?.name || slug;
  const collectionDescription = collection?.description;

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <Header />
      <main className="flex-1">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <nav className="mb-4 text-sm">
            <Link href="/collections" className="text-blue-700 hover:text-blue-800">
              Collections
            </Link>
            <span className="mx-2 text-gray-500">/</span>
            <span className="text-black">{collectionName}</span>
          </nav>

          <div className="mb-6">
            <h1 className="text-3xl font-bold tracking-tight text-black">{collectionName}</h1>
            {collectionDescription && (
              <p className="mt-2 text-base text-gray-600">{collectionDescription}</p>
            )}
          </div>

          <div className="flex items-center justify-between mb-6">
            <div className="text-sm text-black">
              {totalItems > 0 ? (
                <>
                  Showing {Math.min((page - 1) * ITEMS_PER_PAGE + 1, totalItems)}-
                  {Math.min(page * ITEMS_PER_PAGE, totalItems)} of {totalItems} products
                </>
              ) : (
                'No products in this collection'
              )}
            </div>
            <ProductSort />
          </div>

          {products.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-black font-medium">No products found in this collection.</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {products.map((product) => {
                  const variant = product.variants?.[0];
                  const price = variant?.priceWithTax || variant?.price || 0;
                  const currencyCode = variant?.currencyCode || 'USD';

                  return (
                    <Link
                      key={product.id}
                      href={`/products/${product.slug}`}
                      className="group rounded-lg border-2 border-blue-200 bg-white p-4 shadow-md transition-all hover:shadow-lg hover:border-blue-400"
                    >
                      {product.featuredAsset?.preview && (
                        <div className="aspect-square w-full overflow-hidden rounded-lg bg-blue-50">
                          <Image
                            src={product.featuredAsset.preview}
                            alt={product.name}
                            width={300}
                            height={300}
                            className="h-full w-full object-cover object-center group-hover:opacity-90 transition-opacity"
                          />
                        </div>
                      )}
                      <div className="mt-4">
                        <h3 className="text-sm font-semibold text-black line-clamp-2">
                          {product.name}
                        </h3>
                        <p className="mt-1 text-base font-bold text-blue-700">
                          {new Intl.NumberFormat('en-US', {
                            style: 'currency',
                            currency: currencyCode,
                          }).format(price / 100)}
                        </p>
                        {variant && variant.stockLevel !== 'IN_STOCK' && (
                          <p className="mt-1 text-xs text-red-700 font-medium">
                            Out of Stock
                          </p>
                        )}
                      </div>
                    </Link>
                  );
                })}
              </div>

              <Pagination
                currentPage={page}
                totalPages={totalPages}
                totalItems={totalItems}
                itemsPerPage={ITEMS_PER_PAGE}
              />
            </>
          )}
        </div>
      </main>
    </div>
  );
}
