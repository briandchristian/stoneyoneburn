/**
 * Shop Search Page
 *
 * Allows users to search for shops (sellers) by name or description.
 * Phase 5.1: Shop Search Functionality
 */

'use client';

import { useState } from 'react';
import { useQuery } from '@apollo/client';
import { SEARCH_SHOPS } from '@/graphql/queries';
import { Header } from '@/components/Header';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';

interface Shop {
  id: string;
  shopName: string;
  shopSlug: string;
  shopDescription?: string | null;
  rating?: {
    averageRating: number;
    totalReviews: number;
  } | null;
}

interface ShopSearchResult {
  searchShops: {
    items: Shop[];
    totalItems: number;
  };
}

const ITEMS_PER_PAGE = 20;

export default function ShopSearchPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialSearchTerm = searchParams?.get('q') || '';
  const [searchTerm, setSearchTerm] = useState(initialSearchTerm);
  const [currentPage, setCurrentPage] = useState(0);
  const [verifiedOnly, setVerifiedOnly] = useState(false);

  const { data, loading, error } = useQuery<ShopSearchResult>(SEARCH_SHOPS, {
    variables: {
      searchTerm: searchTerm || '',
      options: {
        skip: currentPage * ITEMS_PER_PAGE,
        take: ITEMS_PER_PAGE,
        verifiedOnly,
      },
    },
    fetchPolicy: 'cache-and-network',
    skip: !searchTerm || searchTerm.length < 2,
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchTerm.trim().length >= 2) {
      setCurrentPage(0);
      router.push(`/shops/search?q=${encodeURIComponent(searchTerm.trim())}`);
    }
  };

  const shops = data?.searchShops?.items ?? [];
  const totalItems = data?.searchShops?.totalItems ?? 0;
  const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <Header />
      <main className="flex-1">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold text-black mb-6">Search Shops</h1>

          {/* Search Form */}
          <form onSubmit={handleSearch} className="mb-8">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search shops by name or description..."
                  className="w-full rounded-md border-2 border-gray-300 px-4 py-2 text-black focus:border-blue-700 focus:outline-none focus:ring-0"
                  minLength={2}
                />
              </div>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 text-black">
                  <input
                    type="checkbox"
                    checked={verifiedOnly}
                    onChange={(e) => setVerifiedOnly(e.target.checked)}
                    className="rounded border-gray-300"
                  />
                  <span className="text-sm">Verified only</span>
                </label>
                <button
                  type="submit"
                  disabled={!searchTerm || searchTerm.length < 2}
                  className="rounded-md bg-blue-700 px-6 py-2 text-base font-semibold text-white shadow-lg hover:bg-blue-800 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                >
                  Search
                </button>
              </div>
            </div>
          </form>

          {/* Loading State */}
          {loading && (
            <div className="text-center py-12">
              <p className="text-black font-medium">Searching shops...</p>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="text-center py-12">
              <p className="text-red-700 font-semibold">Error searching shops: {error.message}</p>
            </div>
          )}

          {/* Results */}
          {!loading && !error && searchTerm && searchTerm.length >= 2 && (
            <>
              {shops.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-black font-medium text-lg">
                    No shops found matching &quot;{searchTerm}&quot;
                  </p>
                  <p className="text-gray-600 mt-2">Try a different search term</p>
                </div>
              ) : (
                <>
                  <div className="mb-4 text-sm text-black">
                    Found {totalItems} {totalItems === 1 ? 'shop' : 'shops'} matching &quot;
                    {searchTerm}&quot;
                  </div>

                  <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                    {shops.map((shop) => (
                      <Link
                        key={shop.id}
                        href={`/shops/${shop.shopSlug}`}
                        className="group rounded-lg border-2 border-blue-200 bg-white p-6 shadow-md transition-all hover:shadow-lg hover:border-blue-400"
                      >
                        <h2 className="text-xl font-bold text-black mb-2 group-hover:text-blue-700">
                          {shop.shopName}
                        </h2>
                        {shop.shopDescription && (
                          <p className="text-sm text-gray-700 mb-3 line-clamp-2">
                            {shop.shopDescription}
                          </p>
                        )}
                        {shop.rating && (
                          <p className="text-sm text-yellow-700 font-medium">
                            {shop.rating.averageRating.toFixed(1)} out of 5 (
                            {shop.rating.totalReviews} {shop.rating.totalReviews === 1 ? 'review' : 'reviews'})
                          </p>
                        )}
                        <p className="text-sm text-blue-700 font-medium mt-3 group-hover:text-blue-800">
                          Visit shop →
                        </p>
                      </Link>
                    ))}
                  </div>

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="mt-8 flex justify-center gap-2">
                      <button
                        onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
                        disabled={currentPage === 0}
                        className="rounded-md border-2 border-gray-300 px-4 py-2 text-black disabled:opacity-50 disabled:cursor-not-allowed hover:border-blue-700 transition-colors"
                      >
                        Previous
                      </button>
                      <span className="px-4 py-2 text-black">
                        Page {currentPage + 1} of {totalPages}
                      </span>
                      <button
                        onClick={() => setCurrentPage(Math.min(totalPages - 1, currentPage + 1))}
                        disabled={currentPage >= totalPages - 1}
                        className="rounded-md border-2 border-gray-300 px-4 py-2 text-black disabled:opacity-50 disabled:cursor-not-allowed hover:border-blue-700 transition-colors"
                      >
                        Next
                      </button>
                    </div>
                  )}
                </>
              )}
            </>
          )}

          {/* Initial State */}
          {!loading && !error && (!searchTerm || searchTerm.length < 2) && (
            <div className="text-center py-12">
              <p className="text-black font-medium text-lg">
                Enter a search term to find shops
              </p>
              <p className="text-gray-600 mt-2">Search by shop name or description</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
