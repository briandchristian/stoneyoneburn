/**
 * Shop Page
 *
 * Displays a seller's shop page at /shops/[slug], including:
 * - Shop name, description, and rating
 * - List of products for the seller
 *
 * Uses the multi-vendor plugin Shop API extensions:
 * - shop(slug: String!): MarketplaceSeller
 * - shopProducts(slug: String!, options: ShopProductsOptionsInput): ShopProductsList!
 */

'use client';

import { useQuery } from '@apollo/client';
import { GET_SHOP_PAGE } from '@/graphql/queries';
import { Header } from '@/components/Header';
import Link from 'next/link';
import Image from 'next/image';
import { useParams } from 'next/navigation';

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

interface ShopProduct {
  id: string;
  name: string;
  slug: string;
  description?: string;
  featuredAsset?: {
    id: string;
    preview: string;
  } | null;
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

interface ShopPageData {
  shop?: Shop | null;
  shopProducts?: {
    items: ShopProduct[];
    totalItems: number;
  } | null;
}

const ITEMS_PER_PAGE = 20;

export default function ShopPage() {
  const params = useParams();
  const slugParam = params?.slug;
  const slug = Array.isArray(slugParam) ? slugParam[0] : (slugParam as string);

  const { data, loading, error } = useQuery<ShopPageData>(GET_SHOP_PAGE, {
    variables: {
      slug,
      options: {
        skip: 0,
        take: ITEMS_PER_PAGE,
      },
    },
    fetchPolicy: 'cache-and-network',
    skip: !slug,
  });

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col bg-white">
        <Header />
        <main className="flex-1">
          <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
            <p className="text-black font-medium">Loading shop...</p>
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
              <p className="text-red-700 font-semibold">Error loading shop: {error.message}</p>
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

  const shop = data?.shop;
  const products = data?.shopProducts?.items ?? [];
  const totalItems = data?.shopProducts?.totalItems ?? 0;

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <Header />
      <main className="flex-1">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          {/* Shop Header */}
          <section className="mb-8 border-b border-gray-200 pb-6">
            <h1 className="text-3xl font-bold tracking-tight text-black">
              {shop?.shopName || slug}
            </h1>
            {shop?.shopDescription && (
              <p className="mt-2 text-base text-gray-700">{shop.shopDescription}</p>
            )}
            {shop?.rating && (
              <p className="mt-2 text-sm text-yellow-700 font-medium">
                {shop.rating.averageRating.toFixed(1)} out of 5 ({shop.rating.totalReviews} reviews)
              </p>
            )}
          </section>

          {/* Products */}
          <section>
            {products.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-black font-medium text-lg">
                  No products available in this shop.
                </p>
              </div>
            ) : (
              <>
                <div className="mb-4 text-sm text-black">
                  {totalItems > 0
                    ? `Showing ${Math.min(1, totalItems)}-${Math.min(
                        ITEMS_PER_PAGE,
                        totalItems
                      )} of ${totalItems} products`
                    : 'No products found'}
                </div>
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
                            <p className="mt-1 text-xs text-red-700 font-medium">Out of Stock</p>
                          )}
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}

