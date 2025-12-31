/**
 * Products Page
 *
 * Enhanced product catalog with search, filtering, sorting, and pagination
 */

'use client';

import { useQuery } from '@apollo/client';
import { GET_PRODUCTS, SEARCH_PRODUCTS } from '@/graphql/queries';
import { Header } from '@/components/Header';
import { ProductFilters } from '@/components/ProductFilters';
import { ProductSort } from '@/components/ProductSort';
import { Pagination } from '@/components/Pagination';
import Link from 'next/link';
import Image from 'next/image';
import { useSearchParams } from 'next/navigation';
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
  facetValues?: Array<{
    id: string;
    name: string;
    facet: {
      id: string;
      name: string;
    };
  }>;
}

interface SearchResult {
  productId: string;
  productName: string;
  productSlug: string;
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
    facetValues: Array<{
      facetValue: {
        id: string;
        name: string;
        facet: {
          id: string;
          name: string;
        };
      };
      count: number;
    }>;
  };
}

const ITEMS_PER_PAGE = 20;

export default function ProductsPage() {
  const searchParams = useSearchParams();
  const searchTerm = searchParams.get('q') || '';
  const sortParam = searchParams.get('sort') || 'name_ASC';
  const page = parseInt(searchParams.get('page') || '1', 10);
  const selectedFacets = searchParams.getAll('facet');

  // Parse sort parameter (format: "field_ORDER")
  const [sortField, sortOrder] = useMemo(() => {
    const parts = sortParam.split('_');
    return [parts[0], parts[1] || 'ASC'];
  }, [sortParam]);

  // Determine search sort field (Vendure search API only supports 'name' and 'price')
  // For 'createdAt' and other unsupported fields, fall back to 'name'
  const searchSortField = useMemo(() => {
    if (sortField === 'price') {
      return 'price';
    }
    // Default to 'name' for name, createdAt, and any other fields
    return 'name';
  }, [sortField]);

  // Always use search query to get facet values aggregated across all results
  // Search API provides facet values for all matching products, not just current page
  // This ensures filter options remain consistent across pagination
  const { data, loading, error } = useQuery<SearchData>(
    SEARCH_PRODUCTS,
    {
      variables: {
        input: {
          term: searchTerm || undefined, // Empty string becomes undefined for "all products"
          facetValueIds: selectedFacets.length > 0 ? selectedFacets : undefined,
          take: ITEMS_PER_PAGE,
          skip: (page - 1) * ITEMS_PER_PAGE,
          // Vendure search API only supports 'name' and 'price' sorting
          // For 'createdAt' and other unsupported fields, fall back to 'name'
          sort:
            searchSortField === 'price'
              ? { price: sortOrder }
              : { name: sortOrder },
        },
      },
      fetchPolicy: 'cache-and-network',
    }
  );

  // Extract products and facet values from search response
  // Search API provides facet values aggregated across all matching results
  const { products, facetValues, totalItems } = useMemo(() => {
    const searchData = data as SearchData;
    const searchResults = searchData?.search?.items || [];
    return {
      products: searchResults.map((result) => ({
        id: result.productId,
        name: result.productName,
        slug: result.productSlug,
        description: result.description,
        featuredAsset: result.productAsset,
        variants: [
          {
            id: result.productId,
            name: result.productName,
            currencyCode: result.currencyCode,
            price: result.priceWithTax.value || result.priceWithTax.min || 0,
            priceWithTax: result.priceWithTax.value || result.priceWithTax.min || 0,
            sku: '',
            stockLevel: result.inStock ? 'IN_STOCK' : 'OUT_OF_STOCK',
          },
        ],
      })) as Product[],
      facetValues:
        searchData?.search?.facetValues.map((fv) => ({
          id: fv.facetValue.id,
          name: fv.facetValue.name,
          facet: fv.facetValue.facet,
          count: fv.count,
        })) || [],
      totalItems: searchData?.search?.totalItems || 0,
    };
  }, [data]);

  const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col bg-white">
        <Header />
        <main className="flex-1">
          <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
            <div className="text-center">
              <p className="text-black font-medium">Loading products...</p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen flex-col bg-white">
        <Header />
        <main className="flex-1">
          <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
            <div className="text-center">
              <p className="text-red-700 font-semibold">Error loading products: {error.message}</p>
              <p className="mt-2 text-sm text-black">
                Make sure the Vendure server is running at{' '}
                {process.env.NEXT_PUBLIC_VENDURE_SHOP_API_URL || 'http://localhost:3000/shop-api'}
              </p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <Header />
      <main className="flex-1">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="mb-6">
            <h1 className="text-3xl font-bold tracking-tight text-black">Products</h1>
            {searchTerm && (
              <p className="mt-2 text-sm text-gray-600">
                Search results for &quot;{searchTerm}&quot; ({totalItems} found)
              </p>
            )}
          </div>

          <div className="flex flex-col md:flex-row gap-6">
            {/* Filters Sidebar */}
            <aside className="md:w-64 flex-shrink-0">
              <ProductFilters facetValues={facetValues} />
            </aside>

            {/* Main Content */}
            <div className="flex-1">
              {/* Sort and Results Count */}
              <div className="flex items-center justify-between mb-6">
                <div className="text-sm text-black">
                  {totalItems > 0 ? (
                    <>
                      Showing {Math.min((page - 1) * ITEMS_PER_PAGE + 1, totalItems)}-
                      {Math.min(page * ITEMS_PER_PAGE, totalItems)} of {totalItems} products
                    </>
                  ) : (
                    'No products found'
                  )}
                </div>
                <ProductSort />
              </div>

              {/* Product Grid */}
              {products.length === 0 ? (
                <div className="mt-8 text-center py-12">
                  <p className="text-black font-medium text-lg">No products found.</p>
                  {searchTerm && (
                    <p className="mt-2 text-sm text-gray-600">
                      Try adjusting your search or filters.
                    </p>
                  )}
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

                  {/* Pagination */}
                  <Pagination
                    currentPage={page}
                    totalPages={totalPages}
                    totalItems={totalItems}
                    itemsPerPage={ITEMS_PER_PAGE}
                  />
                </>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
