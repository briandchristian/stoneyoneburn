/**
 * Products Page
 *
 * Displays a list of all available products
 */

'use client';

import { useQuery } from '@apollo/client';
import { GET_PRODUCTS } from '@/graphql/queries';
import { Header } from '@/components/Header';
import Link from 'next/link';
import Image from 'next/image';

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
  }>;
}

interface ProductsData {
  products?: {
    items: Product[];
    totalItems: number;
  };
}

export default function ProductsPage() {
  const { data, loading, error } = useQuery<ProductsData>(GET_PRODUCTS, {
    variables: {
      options: {
        take: 20,
      },
    },
  });

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

  const products: Product[] = data?.products?.items || [];

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <Header />
      <main className="flex-1">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold tracking-tight text-black">Products</h1>
          {products.length === 0 ? (
            <div className="mt-8 text-center">
              <p className="text-black font-medium">No products found.</p>
            </div>
          ) : (
            <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
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
                      <h3 className="text-sm font-semibold text-black">{product.name}</h3>
                      <p className="mt-1 text-base font-bold text-blue-700">
                        {new Intl.NumberFormat('en-US', {
                          style: 'currency',
                          currency: currencyCode,
                        }).format(price / 100)}
                      </p>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

