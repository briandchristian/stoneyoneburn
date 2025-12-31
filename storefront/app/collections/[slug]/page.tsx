/**
 * Collection Detail Page
 *
 * Displays products in a specific collection
 */

'use client';

import { useQuery } from '@apollo/client';
import { GET_PRODUCTS_BY_COLLECTION } from '@/graphql/queries';
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

interface CollectionData {
  collection?: {
    id: string;
    name: string;
    slug: string;
    description?: string;
    products: {
      items: Product[];
      totalItems: number;
    };
  };
}

const ITEMS_PER_PAGE = 20;

export default function CollectionDetailPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const slug = params.slug as string;
  const sortParam = searchParams.get('sort') || 'name_ASC';
  const page = parseInt(searchParams.get('page') || '1', 10);

  const [sortField, sortOrder] = useMemo(() => {
    const parts = sortParam.split('_');
    return [parts[0], parts[1] || 'ASC'];
  }, [sortParam]);

  const { data, loading, error } = useQuery<CollectionData>(GET_PRODUCTS_BY_COLLECTION, {
    variables: {
      slug,
      options: {
        take: ITEMS_PER_PAGE,
        skip: (page - 1) * ITEMS_PER_PAGE,
        sort: {
          [sortField]: sortOrder,
        },
      },
    },
    fetchPolicy: 'cache-and-network',
  });

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

  if (error || !data?.collection) {
    return (
      <div className="flex min-h-screen flex-col bg-white">
        <Header />
        <main className="flex-1">
          <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
            <p className="text-red-700 font-semibold">
              {error ? `Error: ${error.message}` : 'Collection not found'}
            </p>
          </div>
        </main>
      </div>
    );
  }

  const collection = data.collection;
  const products = collection.products.items;
  const totalItems = collection.products.totalItems;
  const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);

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
            <span className="text-black">{collection.name}</span>
          </nav>

          <div className="mb-6">
            <h1 className="text-3xl font-bold tracking-tight text-black">{collection.name}</h1>
            {collection.description && (
              <p className="mt-2 text-base text-gray-600">{collection.description}</p>
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
