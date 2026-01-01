/**
 * Product Detail Page
 *
 * Displays detailed information about a single product with add to cart functionality.
 * Features:
 * - Product details, images, pricing
 * - Add to cart with quantity selection
 * - Stock level display
 * - User feedback on add to cart actions
 */

'use client';

import { useQuery, useMutation } from '@apollo/client';
import { GET_PRODUCT_BY_SLUG, ADD_ITEM_TO_ORDER, GET_ACTIVE_ORDER } from '@/graphql/queries';
import { Header } from '@/components/Header';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { useState } from 'react';

interface ProductVariant {
  id: string;
  name: string;
  currencyCode: string;
  price: number;
  priceWithTax: number;
  sku: string;
  stockLevel: string;
  options: Array<{
    id: string;
    code: string;
    name: string;
  }>;
}

interface ProductData {
  product?: {
    id: string;
    name: string;
    slug: string;
    description?: string;
    featuredAsset?: {
      id: string;
      preview: string;
    };
    assets?: Array<{
      id: string;
      preview: string;
      name: string;
    }>;
    variants: ProductVariant[];
    facetValues: Array<{
      id: string;
      name: string;
      facet: {
        id: string;
        name: string;
      };
    }>;
  };
}

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;
  const [quantity, setQuantity] = useState(1);
  const [isAddingToCart, setIsAddingToCart] = useState(false);
  const [addToCartError, setAddToCartError] = useState<string | null>(null);

  const { data, loading, error } = useQuery<ProductData>(GET_PRODUCT_BY_SLUG, {
    variables: { slug },
  });

  const [addItemToOrder] = useMutation(ADD_ITEM_TO_ORDER, {
    refetchQueries: [{ query: GET_ACTIVE_ORDER }],
    awaitRefetchQueries: true,
  });

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col bg-white">
        <Header />
        <main className="flex-1">
          <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
            <p className="text-black font-medium">Loading product...</p>
          </div>
        </main>
      </div>
    );
  }

  if (error || !data?.product) {
    return (
      <div className="flex min-h-screen flex-col bg-white">
        <Header />
        <main className="flex-1">
          <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
            <p className="text-red-700 font-semibold">
              {error ? `Error: ${error.message}` : 'Product not found'}
            </p>
          </div>
        </main>
      </div>
    );
  }

  const product = data.product;
  const variant = product.variants?.[0];
  const price = variant?.priceWithTax || variant?.price || 0;
  const currencyCode = variant?.currencyCode || 'USD';

  const handleAddToCart = async () => {
    if (!variant || variant.stockLevel !== 'IN_STOCK') {
      return;
    }

    setIsAddingToCart(true);
    setAddToCartError(null);

    try {
      const result = await addItemToOrder({
        variables: {
          productVariantId: variant.id,
          quantity: quantity,
        },
      });

      const addItemResult = result.data?.addItemToOrder;
      
      // Check if result is an Order (success case)
      if (addItemResult?.__typename === 'Order') {
        // Success - optionally redirect to cart or show success message
        router.push('/cart');
        return;
      }
      
      // Handle error cases
      if (addItemResult && 'errorCode' in addItemResult) {
        // Error result with errorCode property
        const errorResult = addItemResult as { errorCode: string; message: string };
        setAddToCartError(errorResult.message || 'Failed to add item to cart');
      } else if (addItemResult && addItemResult.__typename && addItemResult.__typename !== 'Order') {
        // Error result with non-Order typename
        const errorResult = addItemResult as { message?: string; __typename: string };
        setAddToCartError(errorResult.message || 'Failed to add item to cart');
      } else {
        // No result or unexpected format
        setAddToCartError('Failed to add item to cart');
      }
    } catch (err: any) {
      // Handle GraphQL errors or network errors
      const errorMessage = err?.message || err?.graphQLErrors?.[0]?.message || 'Failed to add item to cart';
      setAddToCartError(errorMessage);
    } finally {
      setIsAddingToCart(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <Header />
      <main className="flex-1">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="lg:grid lg:grid-cols-2 lg:gap-x-8">
            {/* Product Images */}
            <div className="mt-10 lg:mt-0">
              {product.featuredAsset?.preview && (
                <div className="aspect-square w-full overflow-hidden rounded-lg bg-blue-50 border-2 border-blue-200">
                  <Image
                    src={product.featuredAsset.preview}
                    alt={product.name}
                    width={600}
                    height={600}
                    className="h-full w-full object-cover object-center"
                  />
                </div>
              )}
              {product.assets && product.assets.length > 1 && (
                <div className="mt-4 grid grid-cols-4 gap-4">
                  {product.assets.slice(1, 5).map((asset) => (
                    <div
                      key={asset.id}
                      className="aspect-square w-full overflow-hidden rounded-lg bg-blue-50 border-2 border-blue-200"
                    >
                      <Image
                        src={asset.preview}
                        alt={asset.name}
                        width={150}
                        height={150}
                        className="h-full w-full object-cover object-center"
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Product Info */}
            <div className="mt-10 lg:mt-0">
              <h1 className="text-3xl font-bold tracking-tight text-black">
                {product.name}
              </h1>

              {product.description && (
                <div className="mt-4">
                  <p className="text-base text-black leading-relaxed">{product.description}</p>
                </div>
              )}

              <div className="mt-6">
                <p className="text-3xl font-bold text-blue-700">
                  {new Intl.NumberFormat('en-US', {
                    style: 'currency',
                    currency: currencyCode,
                  }).format(price / 100)}
                </p>
              </div>

              {variant && (
                <div className="mt-6">
                  <p className="text-sm font-medium text-black">SKU: <span className="font-normal">{variant.sku}</span></p>
                  <p className="text-sm font-medium text-black">
                    Stock: <span className={variant.stockLevel === 'IN_STOCK' ? 'text-green-700 font-semibold' : 'text-red-700 font-semibold'}>
                      {variant.stockLevel === 'IN_STOCK' ? 'In Stock' : 'Out of Stock'}
                    </span>
                  </p>
                </div>
              )}

              {variant && variant.stockLevel === 'IN_STOCK' && (
                <div className="mt-6">
                  <label htmlFor="quantity" className="block text-sm font-medium text-black mb-2">
                    Quantity
                  </label>
                  <div className="flex items-center border border-gray-300 rounded-md w-32">
                    <button
                      type="button"
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      className="px-3 py-2 text-gray-700 hover:bg-gray-100 transition-colors"
                    >
                      −
                    </button>
                    <input
                      type="number"
                      id="quantity"
                      min="1"
                      value={quantity}
                      onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                      className="flex-1 px-4 py-2 text-center text-black border-0 focus:ring-0 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setQuantity(quantity + 1)}
                      className="px-3 py-2 text-gray-700 hover:bg-gray-100 transition-colors"
                    >
                      +
                    </button>
                  </div>
                </div>
              )}

              <div className="mt-10">
                <button
                  type="button"
                  onClick={handleAddToCart}
                  className="w-full rounded-md bg-blue-700 px-4 py-3 text-base font-semibold text-white shadow-lg hover:bg-blue-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                  disabled={!variant || variant.stockLevel !== 'IN_STOCK' || isAddingToCart}
                >
                  {isAddingToCart
                    ? 'Adding to Cart...'
                    : variant && variant.stockLevel === 'IN_STOCK'
                    ? 'Add to Cart'
                    : 'Out of Stock'}
                </button>
                {addToCartError && (
                  <p className="mt-2 text-sm text-red-700">{addToCartError}</p>
                )}
              </div>

              {product.facetValues && product.facetValues.length > 0 && (
                <div className="mt-10">
                  <h2 className="text-lg font-bold text-black">Details</h2>
                  <dl className="mt-4 space-y-2">
                    {product.facetValues.map((facetValue) => (
                      <div key={facetValue.id} className="flex">
                        <dt className="text-sm font-semibold text-black">
                          {facetValue.facet.name}:
                        </dt>
                        <dd className="ml-2 text-sm text-black">{facetValue.name}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

